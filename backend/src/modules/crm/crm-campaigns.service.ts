import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCampaignDto,
  CreateSpendDto,
  UpdateCampaignDto,
  UpdateSpendDto,
} from "./dto/crm.dto";
import { safeDivide } from "./crm.utils";

@Injectable()
export class CrmCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateOnly(v: string): Date {
    // "2026-10-01" or full ISO -> a pure date (UTC midnight) for @db.Date columns
    return new Date(v.slice(0, 10) + "T00:00:00.000Z");
  }

  async list() {
    const [campaigns, leadCounts, wonCounts, spends] = await Promise.all([
      this.prisma.campaign.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
      this.prisma.lead.groupBy({ by: ["campaignId"], where: { campaignId: { not: null } }, _count: { _all: true } }),
      this.prisma.lead.groupBy({
        by: ["campaignId"],
        where: { campaignId: { not: null }, stage: { type: "WON" } },
        _count: { _all: true },
      }),
      this.prisma.campaignSpend.groupBy({ by: ["campaignId"], _sum: { amount: true } }),
    ]);
    const lc = new Map(leadCounts.map((r) => [r.campaignId, r._count._all]));
    const wc = new Map(wonCounts.map((r) => [r.campaignId, r._count._all]));
    const sc = new Map(spends.map((r) => [r.campaignId, Number(r._sum.amount ?? 0)]));
    return campaigns.map((c) => {
      const leads = lc.get(c.id) ?? 0;
      const won = wc.get(c.id) ?? 0;
      const spend = sc.get(c.id) ?? 0;
      return {
        ...c,
        budget: c.budget === null ? null : Number(c.budget),
        leads,
        won,
        spend,
        costPerLead: safeDivide(spend, leads),
        costPerClient: safeDivide(spend, won),
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

  async listSpend(campaignId: string) {
    await this.get(campaignId);
    const rows = await this.prisma.campaignSpend.findMany({
      where: { campaignId },
      orderBy: { dateFrom: "desc" },
    });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
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
        source: dto.source ?? "MANUAL",
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
