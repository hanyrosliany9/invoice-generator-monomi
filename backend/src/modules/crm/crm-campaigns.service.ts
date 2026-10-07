import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCampaignDto,
  CreateSpendDto,
  UpdateCampaignDto,
  UpdateSpendDto,
} from "./dto/crm.dto";
import { campaignCostMetrics, maxReachedOrder } from "./crm.utils";
import { loadMetaSpend } from "./meta-ads/meta-ads-spend";

@Injectable()
export class CrmCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateOnly(v: string): Date {
    // "2026-10-01" or full ISO -> a pure date (UTC midnight) for @db.Date columns
    return new Date(v.slice(0, 10) + "T00:00:00.000Z");
  }

  async list() {
    const [campaigns, leadRows, qualifiedStage, spends, meta] = await Promise.all([
      this.prisma.campaign.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
      this.prisma.lead.findMany({
        where: { campaignId: { not: null } },
        select: {
          campaignId: true,
          stage: { select: { type: true, order: true } },
          activities: {
            where: { type: "STAGE_CHANGE", toStageId: { not: null } },
            select: { toStage: { select: { order: true, type: true } } },
          },
        },
      }),
      this.prisma.leadStage.findFirst({ where: { key: "QUALIFIED", isActive: true }, select: { order: true } }),
      this.prisma.campaignSpend.groupBy({ by: ["campaignId"], _sum: { amount: true } }),
      loadMetaSpend(this.prisma),
    ]);
    const counts = new Map<string, { leads: number; qualified: number; won: number }>();
    for (const l of leadRows) {
      const e = counts.get(l.campaignId as string) ?? { leads: 0, qualified: 0, won: 0 };
      e.leads += 1;
      if (l.stage.type === "WON") e.won += 1;
      const m = maxReachedOrder(l);
      if (qualifiedStage && m !== null && m >= qualifiedStage.order) e.qualified += 1;
      counts.set(l.campaignId as string, e);
    }
    const sc = new Map(spends.map((r) => [r.campaignId, Number(r._sum.amount ?? 0)]));
    return campaigns.map((c) => {
      const n = counts.get(c.id) ?? { leads: 0, qualified: 0, won: 0 };
      const manualSpend = sc.get(c.id) ?? 0;
      const m = meta.byCampaign.get(c.id);
      const cm = campaignCostMetrics(manualSpend, m?.amount ?? 0, n);
      return {
        ...c,
        budget: c.budget === null ? null : Number(c.budget),
        leads: n.leads,
        qualified: n.qualified,
        won: n.won,
        spend: cm.spend,
        manualSpend,
        metaSpend: m?.amount ?? 0,
        impressions: m?.impressions ?? 0,
        clicks: m?.clicks ?? 0,
        spendCurrency: meta.currency,
        costPerLead: cm.costPerLead,
        costPerQualified: cm.costPerQualified,
        costPerClient: cm.costPerClient,
      };
    });
  }

  async get(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("Kampanye tidak ditemukan");
    return c;
  }

  async create(dto: CreateCampaignDto) {
    try {
      return await this.prisma.campaign.create({
        data: {
          name: dto.name.trim(),
          code: dto.code,
          platform: dto.platform ?? "FACEBOOK",
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          budget: dto.budget !== undefined ? new Prisma.Decimal(dto.budget) : null,
          status: dto.status ?? "ACTIVE",
          prefillMessage: dto.prefillMessage ?? null,
          metaAdIds: Array.from(new Set(dto.metaAdIds ?? [])),
        },
      });
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.get(id);
    try {
      return await this.prisma.campaign.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
          ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
          ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
          ...(dto.budget !== undefined ? { budget: new Prisma.Decimal(dto.budget) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.prefillMessage !== undefined ? { prefillMessage: dto.prefillMessage } : {}),
          ...(dto.metaAdIds !== undefined ? { metaAdIds: Array.from(new Set(dto.metaAdIds)) } : {}),
        },
      });
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async remove(id: string) {
    await this.get(id);
    // Leads keep their campaignCode text; the FK is SET NULL, spend cascades.
    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  private rethrowUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Kode kampanye sudah dipakai.");
    }
    throw error;
  }

  // ---- spend ------------------------------------------------------------

  /**
   * Daily spend list: manual entries (editable) plus synced Meta days
   * (read-only, source META, id "meta:<date>").
   */
  async listSpend(campaignId: string) {
    const campaign = await this.get(campaignId);
    const rows = await this.prisma.campaignSpend.findMany({
      where: { campaignId },
      orderBy: { dateFrom: "desc" },
    });
    const manual = rows.map((r) => ({ ...r, amount: Number(r.amount) }));
    if (!campaign.metaCampaignId) return manual;
    const daily = await this.prisma.metaAdsInsightDaily.findMany({
      where: { metaCampaignId: campaign.metaCampaignId },
      orderBy: { date: "desc" },
    });
    const synced = daily.map((d) => ({
      id: `meta:${d.date.toISOString().slice(0, 10)}`,
      campaignId,
      dateFrom: d.date,
      dateTo: d.date,
      amount: Number(d.amount),
      currency: d.currency,
      impressions: d.impressions,
      clicks: d.clicks,
      note: null,
      source: "META" as const,
      createdById: null,
      createdAt: d.updatedAt,
      readOnly: true,
    }));
    return [...manual, ...synced].sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
  }

  async addSpend(campaignId: string, dto: CreateSpendDto, actorId: string | null) {
    await this.get(campaignId);
    const dateFrom = this.dateOnly(dto.dateFrom);
    const dateTo = dto.dateTo ? this.dateOnly(dto.dateTo) : dateFrom;
    if (dateTo < dateFrom) throw new ConflictException("Tanggal akhir sebelum tanggal awal.");
    const row = await this.prisma.campaignSpend.create({
      data: {
        campaignId,
        dateFrom,
        dateTo,
        amount: new Prisma.Decimal(dto.amount),
        note: dto.note ?? null,
        source: "MANUAL", // synced Meta days live in their own table
        createdById: actorId,
      },
    });
    return { ...row, amount: Number(row.amount) };
  }

  async updateSpend(id: string, dto: UpdateSpendDto) {
    const existing = await this.prisma.campaignSpend.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Data biaya iklan tidak ditemukan");
    const row = await this.prisma.campaignSpend.update({
      where: { id },
      data: {
        ...(dto.dateFrom ? { dateFrom: this.dateOnly(dto.dateFrom) } : {}),
        ...(dto.dateTo ? { dateTo: this.dateOnly(dto.dateTo) } : {}),
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
    });
    return { ...row, amount: Number(row.amount) };
  }

  async removeSpend(id: string) {
    const existing = await this.prisma.campaignSpend.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Data biaya iklan tidak ditemukan");
    await this.prisma.campaignSpend.delete({ where: { id } });
    return { success: true };
  }
}
