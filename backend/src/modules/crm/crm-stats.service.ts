import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CrmSettingsService } from "./crm-settings.service";
import {
  WIB_OFFSET_MS,
  average,
  buildFunnel,
  findDropOff,
  median,
  minutesBetween,
  prorateSpend,
  safeDivide,
} from "./crm.utils";

const DAY_MS = 86400000;

export interface StatsRange {
  from: Date;
  to: Date;
}

/** "YYYY-MM-DD" means a whole WIB day; anything else is parsed as an instant. */
export function parseRange(from?: string, to?: string, now: Date = new Date()): StatsRange {
  const wibStart = (s: string) => new Date(Date.parse(s + "T00:00:00.000Z") - WIB_OFFSET_MS);
  const wibEnd = (s: string) => new Date(Date.parse(s + "T00:00:00.000Z") - WIB_OFFSET_MS + DAY_MS - 1);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const end = to ? (dateOnly.test(to) ? wibEnd(to) : new Date(to)) : now;
  const start = from
    ? dateOnly.test(from)
      ? wibStart(from)
      : new Date(from)
    : new Date(end.getTime() - 30 * DAY_MS);
  return { from: start, to: end };
}

interface LeadRow {
  id: string;
  createdAt: Date;
  firstContactAt: Date;
  firstResponseAt: Date | null;
  /** Landing-page lead still waiting for its chat: left out of response metrics. */
  awaitingWhatsapp?: boolean;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  source: string;
  campaignId: string | null;
  stage: { id: string; type: "OPEN" | "WON" | "LOST"; order: number };
  activities: Array<{ toStage: { order: number; type: string } | null }>;
  quotation: {
    status: string;
    totalAmount: unknown;
    invoices: Array<{ status: string; totalAmount: unknown }>;
  } | null;
}

/** Revenue of one lead: approved quotation total (never less than paid), else paid invoices. */
export function leadRevenue(l: Pick<LeadRow, "quotation">): { revenue: number; paid: number } {
  const q = l.quotation;
  if (!q) return { revenue: 0, paid: 0 };
  const paid = q.invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const approved = q.status === "APPROVED";
  return { revenue: approved ? Math.max(Number(q.totalAmount), paid) : paid, paid };
}

@Injectable()
export class CrmStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: CrmSettingsService,
  ) {}

  private async cohort(range: StatsRange, campaignId?: string): Promise<LeadRow[]> {
    return (await this.prisma.lead.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        ...(campaignId ? { campaignId } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        firstContactAt: true,
        firstResponseAt: true,
        awaitingWhatsapp: true,
        assignedToId: true,
        assignedTo: { select: { id: true, name: true } },
        source: true,
        campaignId: true,
        stage: { select: { id: true, type: true, order: true } },
        activities: {
          where: { type: "STAGE_CHANGE", toStageId: { not: null } },
          select: { toStage: { select: { order: true, type: true } } },
        },
        quotation: {
          select: {
            status: true,
            totalAmount: true,
            invoices: { select: { status: true, totalAmount: true } },
          },
        },
      },
    })) as unknown as LeadRow[];
  }

  private maxReachedOrder(l: LeadRow): number | null {
    const orders: number[] = [];
    if (l.stage.type !== "LOST") orders.push(l.stage.order);
    for (const a of l.activities) {
      if (a.toStage && a.toStage.type !== "LOST") orders.push(a.toStage.order);
    }
    return orders.length ? Math.max(...orders) : null;
  }

  async stats(params: { from?: string; to?: string; campaignId?: string }) {
    const range = parseRange(params.from, params.to);
    const span = range.to.getTime() - range.from.getTime();
    const prevRange = { from: new Date(range.from.getTime() - span - 1), to: new Date(range.from.getTime() - 1) };
    const threshold = await this.settings.getThresholdMinutes();

    const [stages, leads, prevLeads, spendRows, campaigns, uncontactedNow] = await Promise.all([
      this.prisma.leadStage.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      this.cohort(range, params.campaignId),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: prevRange.from, lte: prevRange.to },
          ...(params.campaignId ? { campaignId: params.campaignId } : {}),
        },
      }),
      this.prisma.campaignSpend.findMany({
        where: {
          dateFrom: { lte: range.to },
          dateTo: { gte: range.from },
          ...(params.campaignId ? { campaignId: params.campaignId } : {}),
        },
      }),
      this.prisma.campaign.findMany({ select: { id: true, name: true, code: true } }),
      this.prisma.lead.count({
        where: {
          firstResponseAt: null,
          awaitingWhatsapp: false,
          firstContactAt: { lt: new Date(Date.now() - threshold * 60000) },
          stage: { type: "OPEN" },
        },
      }),
    ]);

    const keyStage = (key: string) => stages.find((s) => s.key === key);
    const funnelLeads = leads.map((l) => ({
      maxReachedOrder: this.maxReachedOrder(l),
      currentStageType: l.stage.type,
    }));
    const funnel = buildFunnel(stages as any, funnelLeads);
    const reached = (key: string) => {
      const s = keyStage(key);
      return s ? funnelLeads.filter((l) => l.maxReachedOrder !== null && l.maxReachedOrder >= s.order).length : 0;
    };

    const won = leads.filter((l) => l.stage.type === "WON");
    const lost = leads.filter((l) => l.stage.type === "LOST");
    const revenues = leads.map((l) => ({ l, ...leadRevenue(l) }));
    const revenue = revenues.reduce((s, r) => s + r.revenue, 0);
    const revenuePaid = revenues.reduce((s, r) => s + r.paid, 0);
    const payingClients = revenues.filter((r) => r.paid > 0).length;

    const spendByCampaign = new Map<string, number>();
    let spend = 0;
    for (const s of spendRows) {
      const part = prorateSpend(Number(s.amount), s.dateFrom, s.dateTo, range.from, range.to);
      spend += part;
      spendByCampaign.set(s.campaignId, (spendByCampaign.get(s.campaignId) ?? 0) + part);
    }

    // waiting leads (no chat yet) have nothing to answer
    const responseMinutes = leads
      .filter((l) => l.firstResponseAt && !l.awaitingWhatsapp)
      .map((l) => minutesBetween(l.firstContactAt, l.firstResponseAt as Date));

    // by owner
    const ownerMap = new Map<string, { ownerId: string | null; name: string | null; rows: typeof revenues }>();
    for (const r of revenues) {
      const key = r.l.assignedToId ?? "__none__";
      if (!ownerMap.has(key)) {
        ownerMap.set(key, { ownerId: r.l.assignedToId, name: r.l.assignedTo?.name ?? null, rows: [] });
      }
      ownerMap.get(key)!.rows.push(r);
    }
    const byOwner = [...ownerMap.values()]
      .map((o) => {
        const resp = o.rows
          .filter((r) => r.l.firstResponseAt && !r.l.awaitingWhatsapp)
          .map((r) => minutesBetween(r.l.firstContactAt, r.l.firstResponseAt as Date));
        return {
          ownerId: o.ownerId,
          name: o.name,
          leads: o.rows.length,
          won: o.rows.filter((r) => r.l.stage.type === "WON").length,
          revenue: o.rows.reduce((s, r) => s + r.revenue, 0),
          avgResponseMinutes: average(resp),
        };
      })
      .sort((a, b) => b.leads - a.leads);

    // by source
    const sourceMap = new Map<string, { source: string; leads: number; won: number }>();
    for (const l of leads) {
      const e = sourceMap.get(l.source) ?? { source: l.source, leads: 0, won: 0 };
      e.leads += 1;
      if (l.stage.type === "WON") e.won += 1;
      sourceMap.set(l.source, e);
    }

    // by campaign (cohort leads + campaigns that only had spend)
    const qualifiedStage = keyStage("QUALIFIED");
    const campIds = new Set<string>([...leads.map((l) => l.campaignId).filter((x): x is string => !!x), ...spendByCampaign.keys()]);
    const byCampaign = [...campIds].map((id) => {
      const c = campaigns.find((x) => x.id === id);
      const cl = revenues.filter((r) => r.l.campaignId === id);
      const sp = spendByCampaign.get(id) ?? 0;
      const wonN = cl.filter((r) => r.l.stage.type === "WON").length;
      return {
        campaignId: id,
        name: c?.name ?? "-",
        code: c?.code ?? "-",
        leads: cl.length,
        qualified: qualifiedStage
          ? cl.filter((r) => {
              const m = this.maxReachedOrder(r.l);
              return m !== null && m >= qualifiedStage.order;
            }).length
          : 0,
        won: wonN,
        revenue: cl.reduce((s, r) => s + r.revenue, 0),
        spend: sp,
        costPerLead: safeDivide(sp, cl.length),
        costPerClient: safeDivide(sp, wonN),
      };
    }).sort((a, b) => b.leads - a.leads);

    const noCampaign = revenues.filter((r) => !r.l.campaignId);
    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      previous: { from: prevRange.from.toISOString(), to: prevRange.to.toISOString(), leads: prevLeads },
      thresholdMinutes: threshold,
      leads: leads.length,
      qualified: reached("QUALIFIED"),
      meeting: reached("MEETING"),
      proposal: reached("PROPOSAL"),
      won: won.length,
      lost: lost.length,
      conversionPct: leads.length ? Math.round((won.length / leads.length) * 1000) / 10 : 0,
      revenue,
      revenuePaid,
      revenuePending: revenue - revenuePaid,
      spend,
      costPerLead: safeDivide(spend, leads.length),
      costPerClient: safeDivide(spend, won.length),
      costPerPayingClient: safeDivide(spend, payingClients),
      payingClients,
      response: {
        avgMinutes: average(responseMinutes),
        medianMinutes: median(responseMinutes),
        answered: responseMinutes.length,
        uncontactedNow,
      },
      byOwner,
      bySource: [...sourceMap.values()].sort((a, b) => b.leads - a.leads),
      byCampaign,
      noCampaign: { leads: noCampaign.length, won: noCampaign.filter((r) => r.l.stage.type === "WON").length },
      funnel,
      dropOff: findDropOff(funnel),
    };
  }
}
