import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { LeadStageType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStageDto, UpdateStageDto } from "./dto/crm.dto";

export const DEFAULT_RESPONSE_THRESHOLD_MINUTES = 15;

export const DEFAULT_STAGES: Array<{
  key: string;
  name: string;
  color: string;
  type: LeadStageType;
  metaEvent: string | null;
}> = [
  { key: "NEW", name: "New", color: "#7aa2ff", type: "OPEN", metaEvent: null },
  { key: "QUALIFIED", name: "Qualified", color: "#6fdc9f", type: "OPEN", metaEvent: "QualifiedLead" },
  { key: "MEETING", name: "Meeting", color: "#f0a84b", type: "OPEN", metaEvent: null },
  { key: "PROPOSAL", name: "Proposal", color: "#c79bff", type: "OPEN", metaEvent: null },
  { key: "WON", name: "Won", color: "#4ade80", type: "WON", metaEvent: "Purchase" },
  { key: "LOST", name: "Lost", color: "#f87171", type: "LOST", metaEvent: null },
];

@Injectable()
export class CrmSettingsService implements OnModuleInit {
  private readonly logger = new Logger(CrmSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaults();
    } catch (error) {
      // e.g. migration not applied yet — never block boot.
      this.logger.warn(`CRM defaults not seeded: ${(error as Error).message}`);
    }
  }

  /** Idempotent: creates only the stages/settings that are missing. */
  async ensureDefaults(): Promise<void> {
    const existing = await this.prisma.leadStage.findMany({ select: { key: true, order: true } });
    const have = new Set(existing.map((s) => s.key));
    let order = existing.reduce((m, s) => Math.max(m, s.order), 0);
    // Seed in default order; on a fresh DB orders are 1..6.
    for (const def of DEFAULT_STAGES) {
      if (have.has(def.key)) continue;
      order += 1;
      await this.prisma.leadStage.create({ data: { ...def, order } });
    }
    await this.prisma.crmSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", responseThresholdMinutes: DEFAULT_RESPONSE_THRESHOLD_MINUTES },
    });
  }

  async getThresholdMinutes(): Promise<number> {
    const s = await this.prisma.crmSettings.findUnique({ where: { id: "default" } });
    return s?.responseThresholdMinutes ?? DEFAULT_RESPONSE_THRESHOLD_MINUTES;
  }

  async getSettings() {
    const [responseThresholdMinutes, stages] = await Promise.all([
      this.getThresholdMinutes(),
      this.listStages(true),
    ]);
    return { responseThresholdMinutes, stages };
  }

  async updateSettings(data: { responseThresholdMinutes?: number }) {
    if (data.responseThresholdMinutes !== undefined) {
      await this.prisma.crmSettings.upsert({
        where: { id: "default" },
        update: { responseThresholdMinutes: data.responseThresholdMinutes },
        create: { id: "default", responseThresholdMinutes: data.responseThresholdMinutes },
      });
    }
    return this.getSettings();
  }

  // ---- stages ----------------------------------------------------------

  listStages(includeInactive = false) {
    return this.prisma.leadStage.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { order: "asc" },
    });
  }

  async createStage(dto: CreateStageDto) {
    const last = await this.prisma.leadStage.findFirst({ orderBy: { order: "desc" } });
    const type = dto.type ?? "OPEN";
    // Keep WON/LOST stages at the end of the board: insert OPEN stages before the first closed one.
    const stages = await this.listStages(true);
    if (type === "OPEN") {
      const firstClosed = stages.find((s) => s.type !== "OPEN");
      if (firstClosed) {
        const order = firstClosed.order;
        await this.prisma.leadStage.updateMany({
          where: { order: { gte: order } },
          data: { order: { increment: 1 } },
        });
        return this.prisma.leadStage.create({
          data: { name: dto.name, color: dto.color ?? "#8d8b93", type, metaEvent: dto.metaEvent ?? null, order },
        });
      }
    }
    return this.prisma.leadStage.create({
      data: {
        name: dto.name,
        color: dto.color ?? "#8d8b93",
        type,
        metaEvent: dto.metaEvent ?? null,
        order: (last?.order ?? 0) + 1,
      },
    });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.leadStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException("Tahap tidak ditemukan");
    const nextType = dto.type ?? stage.type;
    const nextActive = dto.isActive ?? stage.isActive;
    if (nextType !== stage.type || nextActive !== stage.isActive) {
      await this.assertTypeCoverage(id, nextType, nextActive);
      if (!nextActive) {
        const inUse = await this.prisma.lead.count({ where: { stageId: id } });
        if (inUse > 0) {
          throw new ConflictException("Pindahkan lead di tahap ini terlebih dahulu sebelum menonaktifkan.");
        }
      }
    }
    return this.prisma.leadStage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.metaEvent !== undefined ? { metaEvent: dto.metaEvent === "" ? null : dto.metaEvent } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async reorderStages(ids: string[]) {
    const all = await this.listStages(true);
    if (new Set(ids).size !== ids.length || ids.some((i) => !all.some((s) => s.id === i))) {
      throw new BadRequestException("Daftar tahap tidak valid");
    }
    const rest = all.filter((s) => !ids.includes(s.id)).map((s) => s.id);
    const finalOrder = [...ids, ...rest];
    await this.prisma.$transaction(
      finalOrder.map((id, idx) => this.prisma.leadStage.update({ where: { id }, data: { order: idx + 1 } })),
    );
    return this.listStages(true);
  }

  async deleteStage(id: string) {
    const stage = await this.prisma.leadStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException("Tahap tidak ditemukan");
    if (stage.key) {
      throw new ConflictException("Tahap bawaan tidak dapat dihapus (nonaktifkan saja).");
    }
    const inUse = await this.prisma.lead.count({ where: { stageId: id } });
    if (inUse > 0) {
      throw new ConflictException("Masih ada lead di tahap ini.");
    }
    await this.assertTypeCoverage(id, stage.type, false);
    const history = await this.prisma.leadActivity.count({
      where: { OR: [{ fromStageId: id }, { toStageId: id }] },
    });
    if (history > 0) {
      // History is append-only: keep the row, just retire it.
      return this.prisma.leadStage.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.leadStage.delete({ where: { id } });
  }

  /** The pipeline needs at least one active OPEN, WON and LOST stage. */
  private async assertTypeCoverage(id: string, nextType: LeadStageType, nextActive: boolean) {
    const others = await this.prisma.leadStage.findMany({
      where: { isActive: true, id: { not: id } },
      select: { type: true },
    });
    const types = new Set(others.map((s) => s.type));
    if (nextActive) types.add(nextType);
    for (const t of ["OPEN", "WON", "LOST"] as LeadStageType[]) {
      if (!types.has(t)) {
        throw new BadRequestException(`Pipeline harus punya minimal satu tahap bertipe ${t}.`);
      }
    }
  }
}
