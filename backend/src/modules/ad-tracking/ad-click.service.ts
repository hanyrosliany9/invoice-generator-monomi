import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ParsedTrackEvent } from "./track-event.payload";
import { WebClick } from "./web-capi.payload";
import { extractRefCode, normalizeRefCode } from "./ref-code";

export const AD_CLICK_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;
/** Outbox events that exist for the website route when a lead is linked later. */
const RELINKABLE_EVENTS = ["QualifiedLead", "Purchase"];

type Tx = Prisma.TransactionClient;

export type RecordOutcome = "ok" | "duplicate" | "conflict";

export interface ClickContext {
  ip: string | null;
  userAgent: string | null;
}

/** A first-of-its-kind visit event to send (batched) to Meta. */
export interface VisitEventToSend {
  name: "PageView" | "ViewContent" | "EngagedVisit";
  eventId: string;
  eventTime: Date;
  click: WebClick;
}

export interface RecordResult {
  outcome: RecordOutcome;
  visitEvent?: VisitEventToSend;
}

export interface AdClickPreview {
  ref: string;
  createdAt: Date;
  pageUrl: string | null;
  campaignCode: string | null;
  campaign: { id: string; name: string; code: string } | null;
  instagramHandle: string | null;
  /** True when no lead holds this click yet (so it can still be linked). */
  available: boolean;
}

const VISIT_FLAG = {
  PageView: "pageViewAt",
  ViewContent: "viewContentAt",
  EngagedVisit: "engagedAt",
} as const;

/**
 * Landing-page visits and WhatsApp taps: storage, the tap's website Lead
 * event, and linking a tap to the CRM lead created from the matching chat.
 */
@Injectable()
export class AdClickService {
  private readonly logger = new Logger(AdClickService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // public event endpoint
  // ---------------------------------------------------------------------

  private async resolveCampaignCode(utmCampaign: string | null): Promise<string | null> {
    if (!utmCampaign) return null;
    const c = await this.prisma.campaign.findFirst({
      where: { code: { equals: utmCampaign, mode: "insensitive" } },
      select: { code: true },
    });
    return c?.code ?? null;
  }

  /**
   * Records one landing-page event.
   *  - PageView / ViewContent / EngagedVisit: the visit row is created by the
   *    visit's first event; each of these is accepted ONCE per visit (the
   *    result carries `visitEvent` only for the first), the rest are duplicates.
   *  - Lead (WhatsApp tap): fills ref/eventId (+ Instagram/brand/category) on
   *    the visit row, or on a new row for a second tap in the same visit, and
   *    queues the website Lead event. Idempotent on eventId; a different
   *    eventId for an existing ref (or the reverse) is a conflict.
   */
  async recordEvent(ev: ParsedTrackEvent, ctx: ClickContext): Promise<RecordResult> {
    const now = new Date();
    const campaignCode = await this.resolveCampaignCode(ev.utmCampaign);
    // The browser normally sends _fbc; rebuild it from fbclid when only the
    // raw click id reached us (format: fb.<subdomain index>.<ms>.<fbclid>).
    const fbc = ev.fbc ?? (ev.fbclid ? `fb.1.${now.getTime()}.${ev.fbclid}` : null);
    const fields = {
      pageUrl: ev.pageUrl,
      referrer: ev.referrer,
      utmSource: ev.utmSource,
      utmMedium: ev.utmMedium,
      utmCampaign: ev.utmCampaign,
      utmContent: ev.utmContent,
      utmTerm: ev.utmTerm,
      fbclid: ev.fbclid,
      fbc,
      fbp: ev.fbp,
      clientIp: ctx.ip,
      userAgent: ctx.userAgent,
      campaignCode,
    };

    if (ev.name !== "Lead") {
      let row = await this.prisma.adClick.findFirst({
        where: { visitId: ev.visitId },
        orderBy: { createdAt: "asc" },
      });
      if (!row) {
        row = await this.prisma.adClick.create({ data: { visitId: ev.visitId, ...fields } });
      } else {
        // later events may carry identifiers the first one lacked
        const fill: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v !== null && (row as Record<string, unknown>)[k] == null) fill[k] = v;
        }
        if (Object.keys(fill).length) {
          row = await this.prisma.adClick.update({ where: { id: row.id }, data: fill });
        }
      }
      const flag = VISIT_FLAG[ev.name];
      const claimed = await this.prisma.adClick.updateMany({
        where: { id: row.id, [flag]: null },
        data: { [flag]: now },
      });
      if (claimed.count === 0) return { outcome: "duplicate" };
      return {
        outcome: "ok",
        visitEvent: {
          name: ev.name,
          eventId: ev.eventId,
          eventTime: now,
          click: {
            visitId: ev.visitId,
            pageUrl: ev.pageUrl ?? row.pageUrl,
            fbc: fbc ?? row.fbc,
            fbp: ev.fbp ?? row.fbp,
            clientIp: ctx.ip ?? row.clientIp,
            userAgent: ctx.userAgent ?? row.userAgent,
            campaignCode: row.campaignCode ?? campaignCode,
          },
        },
      };
    }

    // ---- Lead (WhatsApp tap) ----
    const existing = await this.prisma.adClick.findFirst({
      where: { OR: [{ ref: ev.ref as string }, { eventId: ev.eventId }] },
      select: { ref: true, eventId: true },
    });
    if (existing) {
      return {
        outcome: existing.ref === ev.ref && existing.eventId === ev.eventId ? "duplicate" : "conflict",
      };
    }
    const tap = {
      ref: ev.ref,
      eventId: ev.eventId,
      instagramHandle: ev.instagramHandle,
      brandName: ev.brandName,
      category: ev.category,
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        const visitRow = await tx.adClick.findFirst({
          where: { visitId: ev.visitId, ref: null },
          orderBy: { createdAt: "asc" },
        });
        let click;
        if (visitRow) {
          const fill: Record<string, unknown> = { ...tap };
          for (const [k, v] of Object.entries(fields)) {
            if (v !== null && (visitRow as Record<string, unknown>)[k] == null) fill[k] = v;
          }
          click = await tx.adClick.update({ where: { id: visitRow.id }, data: fill });
        } else {
          click = await tx.adClick.create({
            data: { visitId: ev.visitId, createdAt: now, ...fields, ...tap },
          });
        }
        await tx.metaEventOutbox.create({
          data: {
            leadId: null,
            adClickId: click.id,
            route: "WEBSITE",
            eventName: "Lead",
            eventTime: now,
            status: "PENDING_CONFIG",
            payload: { event_name: "Lead" },
            dedupeKey: `click:${ev.eventId}`,
          },
        });
      });
      return { outcome: "ok" };
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        const again = await this.prisma.adClick.findFirst({
          where: { OR: [{ ref: ev.ref as string }, { eventId: ev.eventId }] },
          select: { ref: true, eventId: true },
        });
        return {
          outcome: again?.ref === ev.ref && again?.eventId === ev.eventId ? "duplicate" : "conflict",
        };
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------
  // linking
  // ---------------------------------------------------------------------

  /** Click preview for a code found in pasted text (quick-add chip). */
  async previewForText(text: string | null | undefined): Promise<AdClickPreview | null> {
    const ref = extractRefCode(text);
    return ref ? this.preview(ref) : null;
  }

  async preview(ref: string): Promise<AdClickPreview | null> {
    const code = normalizeRefCode(ref);
    if (!code) return null;
    const click = await this.prisma.adClick.findUnique({
      where: { ref: code },
      select: { ref: true, createdAt: true, pageUrl: true, campaignCode: true, leadId: true, instagramHandle: true },
    });
    if (!click) return null;
    const campaign = click.campaignCode
      ? await this.prisma.campaign.findFirst({
          where: { code: { equals: click.campaignCode, mode: "insensitive" } },
          select: { id: true, name: true, code: true },
        })
      : null;
    return {
      ref: code,
      createdAt: click.createdAt,
      pageUrl: click.pageUrl,
      campaignCode: click.campaignCode,
      campaign,
      instagramHandle: click.instagramHandle,
      available: !click.leadId,
    };
  }

  /**
   * Atomically attaches a click to a lead. Returns the click, or null when
   * the code is unknown, already linked to another lead, or the lead already
   * has a click. Website events the lead had already earned while it was
   * unlinked (skipped as "no click") are re-routed to the website route.
   */
  async linkInTx(tx: Tx, rawRef: string, leadId: string) {
    const ref = normalizeRefCode(rawRef);
    if (!ref) return null;
    const click = await tx.adClick.findUnique({ where: { ref } });
    if (!click || (click.leadId && click.leadId !== leadId)) return null;
    if (click.leadId === leadId) return click;
    const hasOther = await tx.adClick.findUnique({
      where: { leadId },
      select: { id: true },
    });
    if (hasOther) return null;
    const claimed = await tx.adClick.updateMany({
      where: { id: click.id, leadId: null },
      data: { leadId, linkedAt: new Date() },
    });
    if (claimed.count === 0) return null;

    if (click.instagramHandle) {
      await tx.lead.updateMany({
        where: { id: leadId, instagramHandle: null },
        data: { instagramHandle: click.instagramHandle },
      });
    }
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: { ctwaClid: true },
    });
    if (lead && !lead.ctwaClid) {
      await tx.metaEventOutbox.updateMany({
        where: {
          leadId,
          route: "BUSINESS_MESSAGING",
          eventName: { in: RELINKABLE_EVENTS },
          status: { in: ["PENDING_CONFIG", "SKIPPED"] },
        },
        data: {
          route: "WEBSITE",
          adClickId: click.id,
          status: "PENDING_CONFIG",
          lastError: null,
          nextTryAt: null,
        },
      });
    }
    return { ...click, leadId };
  }

  /**
   * Manual / ingest link of a code to an existing lead: links the click, marks
   * the lead as a website lead (unless it is a CTWA lead), fills in the
   * campaign when the lead has none, and writes a timeline row.
   * Returns "linked" | "not_found" | "taken".
   */
  async linkLead(
    leadId: string,
    rawRef: string,
    actorId: string | null,
  ): Promise<"linked" | "not_found" | "taken"> {
    const ref = normalizeRefCode(rawRef);
    if (!ref) return "not_found";
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.adClick.findUnique({
        where: { ref },
        select: { leadId: true },
      });
      if (!before) return "not_found" as const;
      if (before.leadId === leadId) return "linked" as const;
      if (before.leadId) return "taken" as const;
      const click = await this.linkInTx(tx, ref, leadId);
      if (!click) return "taken" as const;
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        select: { ctwaClid: true, source: true, campaignId: true, campaignCode: true },
      });
      const data: Prisma.LeadUncheckedUpdateInput = {};
      if (lead && !lead.ctwaClid && lead.source !== "WHATSAPP_CTWA") data.source = "WEBSITE";
      if (lead && !lead.campaignId && click.campaignCode) {
        const campaign = await tx.campaign.findFirst({
          where: { code: { equals: click.campaignCode, mode: "insensitive" } },
          select: { id: true, code: true },
        });
        if (campaign) {
          data.campaignId = campaign.id;
          data.campaignCode = campaign.code;
        }
      }
      if (Object.keys(data).length) await tx.lead.update({ where: { id: leadId }, data });
      await tx.leadActivity.create({
        data: { leadId, type: "NOTE", body: `@lead.adClickLinked: ${ref}`, actorId },
      });
      return "linked" as const;
    });
  }

  // ---------------------------------------------------------------------
  // retention + stats
  // ---------------------------------------------------------------------

  /** Unlinked clicks are only useful for linking; drop them after 30 days. */
  @Cron("20 3 * * *", { name: "ad-click-retention" })
  async purgeCron(): Promise<void> {
    try {
      const n = await this.purgeUnlinked();
      if (n) this.logger.log(`Purged ${n} unlinked ad click(s) older than ${AD_CLICK_RETENTION_DAYS} days`);
    } catch (error) {
      this.logger.warn(`Ad click purge failed: ${(error as Error).message}`);
    }
  }

  async purgeUnlinked(now: Date = new Date()): Promise<number> {
    const res = await this.prisma.adClick.deleteMany({
      where: {
        leadId: null,
        createdAt: { lt: new Date(now.getTime() - AD_CLICK_RETENTION_DAYS * DAY_MS) },
      },
    });
    return res.count;
  }

  async stats(now: Date = new Date()) {
    const since = new Date(now.getTime() - 7 * DAY_MS);
    const [pageViews7d, clicks7d, linked7d, linkedTotal, qualifiedSent, groups] = await Promise.all([
      this.prisma.adClick.count({ where: { pageViewAt: { gte: since } } }),
      this.prisma.adClick.count({ where: { createdAt: { gte: since }, ref: { not: null } } }),
      this.prisma.adClick.count({ where: { createdAt: { gte: since }, leadId: { not: null } } }),
      this.prisma.adClick.count({ where: { leadId: { not: null } } }),
      this.prisma.metaEventOutbox.count({
        where: { route: "WEBSITE", eventName: "QualifiedLead", status: "SENT" },
      }),
      this.prisma.metaEventOutbox.groupBy({
        by: ["status"],
        where: { route: "WEBSITE" },
        _count: { _all: true },
      }),
    ]);
    const events: Record<string, number> = {
      PENDING_CONFIG: 0,
      QUEUED: 0,
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
    };
    for (const g of groups) events[g.status] = g._count._all;
    const lastSent = await this.prisma.metaEventOutbox.findFirst({
      where: { route: "WEBSITE", status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true, eventName: true },
    });
    const lastFailed = await this.prisma.metaEventOutbox.findFirst({
      where: { route: "WEBSITE", status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true, eventName: true, lastError: true },
    });
    return {
      pageViews7d,
      clicks7d,
      qualifiedSent,
      linked7d,
      linkedTotal,
      events,
      lastSentAt: lastSent?.sentAt ?? null,
      lastFailed: lastFailed
        ? { at: lastFailed.updatedAt, eventName: lastFailed.eventName, error: lastFailed.lastError }
        : null,
    };
  }
}
