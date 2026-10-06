import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LeadSource, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsService } from "../clients/clients.service";
import { ProjectsService } from "../projects/projects.service";
import { QuotationsService } from "../quotations/quotations.service";
import { CrmFlowService } from "./crm-flow.service";
import { CrmOutboxService } from "./crm-outbox.service";
import { CrmSettingsService } from "./crm-settings.service";
import {
  ConvertLeadDto,
  CreateLeadDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
} from "./dto/crm.dto";
import {
  endOfTodayWib,
  escapeActivityText,
  minutesBetween,
  normalizePhone,
  parseQuickAdd,
  startOfTodayWib,
  waIdFromPhone,
} from "./crm.utils";

const LEAD_INCLUDE = {
  stage: true,
  campaign: { select: { id: true, name: true, code: true } },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.LeadInclude;

const WHATSAPP_SOURCES: LeadSource[] = ["WHATSAPP_CTWA", "WHATSAPP_ORGANIC"];

@Injectable()
export class CrmLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flow: CrmFlowService,
    private readonly outbox: CrmOutboxService,
    private readonly settings: CrmSettingsService,
    private readonly clients: ClientsService,
    private readonly projects: ProjectsService,
    private readonly quotations: QuotationsService,
  ) {}

  // -------------------------------------------------------------------
  // helpers
  // -------------------------------------------------------------------

  private decorate<T extends { firstResponseAt: Date | null; firstContactAt: Date; stage: { type: string } }>(
    lead: T,
    thresholdMinutes: number,
    now = new Date(),
  ) {
    const open = lead.stage.type === "OPEN";
    const waitingMinutes =
      !lead.firstResponseAt && open ? Math.round(minutesBetween(lead.firstContactAt, now)) : null;
    return {
      ...lead,
      waitingMinutes,
      isUncontacted: waitingMinutes !== null && waitingMinutes > thresholdMinutes,
      firstResponseMinutes: lead.firstResponseAt
        ? Math.round(minutesBetween(lead.firstContactAt, lead.firstResponseAt))
        : null,
    };
  }

  async findDuplicate(phone: string, excludeId?: string) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    return this.prisma.lead.findFirst({
      where: { phone: normalized, ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        stage: { select: { id: true, key: true, name: true, type: true } },
      },
    });
  }

  async parseQuickAdd(text: string) {
    const campaigns = await this.prisma.campaign.findMany({
      select: { id: true, name: true, code: true },
    });
    const parsed = parseQuickAdd(text, campaigns.map((c) => c.code));
    const campaign = parsed.campaignCode
      ? (campaigns.find((c) => c.code.toUpperCase() === parsed.campaignCode) ?? null)
      : null;
    const duplicate = parsed.phone ? await this.findDuplicate(parsed.phone) : null;
    return { ...parsed, campaign, duplicate };
  }

  // -------------------------------------------------------------------
  // queries
  // -------------------------------------------------------------------

  private buildWhere(q: ListLeadsQueryDto, actorId: string | null, threshold: number): Prisma.LeadWhereInput {
    const and: Prisma.LeadWhereInput[] = [];
    if (q.stageId) and.push({ stageId: q.stageId });
    if (q.assignee) {
      if (q.assignee === "unassigned") and.push({ assignedToId: null });
      else and.push({ assignedToId: q.assignee === "me" ? (actorId ?? "__none__") : q.assignee });
    }
    if (q.campaignId) and.push({ campaignId: q.campaignId });
    if (q.source) and.push({ source: q.source });
    const now = new Date();
    if (q.followUp) {
      const end = endOfTodayWib(now);
      const start = startOfTodayWib(now);
      const range: Prisma.DateTimeNullableFilter =
        q.followUp === "overdue"
          ? { lt: now }
          : q.followUp === "today"
            ? { gte: start, lte: end }
            : { lte: end };
      and.push({ followUpAt: range, stage: { type: "OPEN" } });
    }
    if (q.uncontacted) {
      and.push({
        firstResponseAt: null,
        firstContactAt: { lt: new Date(now.getTime() - threshold * 60000) },
        stage: { type: "OPEN" },
      });
    }
    if (q.q) {
      const term = q.q.trim();
      const digits = term.replace(/\D/g, "");
      const or: Prisma.LeadWhereInput[] = [
        { name: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { campaignCode: { contains: term, mode: "insensitive" } },
      ];
      if (digits.length >= 3) {
        const norm = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
        or.push({ phone: { contains: norm } });
      }
      and.push({ OR: or });
    }
    return and.length ? { AND: and } : {};
  }

  async list(q: ListLeadsQueryDto, actorId: string | null) {
    const threshold = await this.settings.getThresholdMinutes();
    const where = this.buildWhere(q, actorId, threshold);
    const page = q.page ?? 1;
    const limit = q.limit ?? 200;
    const [total, items] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: LEAD_INCLUDE,
        orderBy: [{ lastContactAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const now = new Date();
    return {
      items: items.map((l) => this.decorate(l, threshold, now)),
      total,
      page,
      limit,
      thresholdMinutes: threshold,
    };
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        ...LEAD_INCLUDE,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, number: true, description: true } },
        quotation: { select: { id: true, quotationNumber: true, status: true, totalAmount: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { id: true, name: true } },
            fromStage: { select: { id: true, key: true, name: true } },
            toStage: { select: { id: true, key: true, name: true } },
          },
        },
        metaEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    const threshold = await this.settings.getThresholdMinutes();
    return { ...this.decorate(lead, threshold), thresholdMinutes: threshold };
  }

  async assignees() {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  async badges() {
    const threshold = await this.settings.getThresholdMinutes();
    const now = new Date();
    const [uncontacted, followUpsDue] = await Promise.all([
      this.prisma.lead.count({
        where: {
          firstResponseAt: null,
          firstContactAt: { lt: new Date(now.getTime() - threshold * 60000) },
          stage: { type: "OPEN" },
        },
      }),
      this.prisma.lead.count({
        where: { followUpAt: { lte: endOfTodayWib(now) }, stage: { type: "OPEN" } },
      }),
    ]);
    return { uncontacted, followUpsDue, total: uncontacted + followUpsDue, thresholdMinutes: threshold };
  }

  // -------------------------------------------------------------------
  // writes
  // -------------------------------------------------------------------

  private async resolveCampaign(campaignId?: string | null, code?: string | null) {
    if (campaignId) {
      const c = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!c) throw new BadRequestException("Kampanye tidak ditemukan");
      return c;
    }
    if (code) {
      return this.prisma.campaign.findFirst({
        where: { code: { equals: code.trim(), mode: "insensitive" } },
      });
    }
    return null;
  }

  async create(dto: CreateLeadDto, actorId: string | null) {
    const phone = dto.phone ? normalizePhone(dto.phone) : null;
    if (dto.phone && !phone) {
      throw new BadRequestException("Nomor WhatsApp tidak valid");
    }
    if (!dto.name?.trim() && !phone) {
      throw new BadRequestException("Isi nama atau nomor WhatsApp");
    }
    if (phone && !dto.allowDuplicate) {
      const existing = await this.findDuplicate(phone);
      if (existing) {
        throw new ConflictException({
          statusCode: 409,
          code: "DUPLICATE_LEAD",
          message: "Nomor ini sudah terdaftar sebagai lead.",
          existing,
        });
      }
    }

    const campaign = await this.resolveCampaign(dto.campaignId, dto.campaignCode);
    const stage = dto.stageId
      ? await this.prisma.leadStage.findUnique({ where: { id: dto.stageId } })
      : await this.prisma.leadStage.findFirst({
          where: { type: "OPEN", isActive: true },
          orderBy: { order: "asc" },
        });
    if (!stage || !stage.isActive) throw new BadRequestException("Tahap tidak valid");

    const source: LeadSource =
      dto.source ?? (campaign ? "WHATSAPP_CTWA" : phone ? "WHATSAPP_ORGANIC" : "OTHER");
    const now = new Date();
    const firstContactAt = dto.firstContactAt ? new Date(dto.firstContactAt) : now;
    const name = dto.name?.trim() || (phone as string);

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          name,
          phone,
          waId: waIdFromPhone(phone),
          email: dto.email ?? null,
          company: dto.company ?? null,
          source,
          campaignId: campaign?.id ?? null,
          campaignCode: campaign?.code ?? dto.campaignCode?.trim().toUpperCase() ?? null,
          adId: dto.adId ?? null,
          ctwaClid: dto.ctwaClid ?? null,
          firstMessage: dto.firstMessage ?? null,
          stageId: stage.id,
          estimatedValue: new Prisma.Decimal(dto.estimatedValue ?? 0),
          assignedToId: dto.assignedToId ?? actorId,
          followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null,
          followUpNote: dto.followUpNote ?? null,
          firstContactAt,
          lastContactAt: now,
          createdById: actorId,
        },
      });
      let metaEvent: string | null = null;
      if (WHATSAPP_SOURCES.includes(source)) {
        if (await this.outbox.queueEvent(tx, created, "LeadSubmitted", { eventTime: firstContactAt })) {
          metaEvent = "LeadSubmitted";
        }
      }
      if (stage.metaEvent === "QualifiedLead") {
        await this.outbox.queueEvent(tx, created, "QualifiedLead", { eventTime: now });
      }
      await tx.leadActivity.create({
        data: {
          leadId: created.id,
          type: "STAGE_CHANGE",
          body: escapeActivityText(dto.firstMessage) ?? null,
          fromStageId: null,
          toStageId: stage.id,
          metaEvent,
          actorId,
        },
      });
      if (created.followUpAt) {
        await tx.leadActivity.create({
          data: { leadId: created.id, type: "FOLLOW_UP_SET", body: created.followUpNote, actorId },
        });
      }
      return created;
    });
    return this.get(lead.id);
  }

  /**
   * Phase B: lead auto-created from the first WhatsApp message of a number
   * that has no lead yet (the caller checked waId + phone). System action:
   * no actor, unassigned. Goes through create() so the stage history and the
   * LeadSubmitted outbox row are recorded exactly like a manual lead.
   */
  async createFromWhatsApp(input: {
    waId: string;
    name: string | null;
    firstMessage: string | null;
    firstContactAt: Date;
    source: "WHATSAPP_CTWA" | "WHATSAPP_ORGANIC";
    campaignId: string | null;
    campaignCode: string | null;
    adId: string | null;
    ctwaClid: string | null;
    referral: Prisma.InputJsonValue | null;
  }): Promise<string> {
    const phone = normalizePhone(`+${input.waId}`);
    const lead = await this.create(
      {
        name: (input.name?.trim() || (phone ? undefined : `+${input.waId}`))?.slice(0, 120),
        phone: phone ?? undefined,
        source: input.source,
        campaignId: input.campaignId ?? undefined,
        campaignCode: input.campaignId ? undefined : (input.campaignCode ?? undefined),
        adId: input.adId ?? undefined,
        ctwaClid: input.ctwaClid ?? undefined,
        firstMessage: input.firstMessage?.slice(0, 2000) ?? undefined,
        firstContactAt: input.firstContactAt.toISOString(),
        allowDuplicate: true,
      } as CreateLeadDto,
      null,
    );
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        waId: input.waId,
        lastContactAt: input.firstContactAt,
        ...(input.referral ? { referral: input.referral } : {}),
      },
    });
    return lead.id;
  }

  async update(id: string, dto: UpdateLeadDto, actorId: string | null) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    const data: Prisma.LeadUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) {
      const phone = dto.phone ? normalizePhone(dto.phone) : null;
      if (dto.phone && !phone) throw new BadRequestException("Nomor WhatsApp tidak valid");
      if (phone && phone !== lead.phone) {
        const dup = await this.findDuplicate(phone, id);
        if (dup) {
          throw new ConflictException({
            statusCode: 409,
            code: "DUPLICATE_LEAD",
            message: "Nomor ini sudah terdaftar sebagai lead.",
            existing: dup,
          });
        }
      }
      data.phone = phone;
      data.waId = waIdFromPhone(phone);
    }
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.campaignId !== undefined) {
      const c = await this.resolveCampaign(dto.campaignId, null);
      data.campaignId = c?.id ?? null;
      data.campaignCode = c?.code ?? null;
    }
    if (dto.estimatedValue !== undefined) data.estimatedValue = new Prisma.Decimal(dto.estimatedValue);
    await this.prisma.lead.update({ where: { id }, data });
    void actorId;
    return this.get(id);
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    await this.prisma.lead.delete({ where: { id } });
    return { success: true };
  }

  async moveStage(id: string, stageId: string, actorId: string | null, note?: string, lostReason?: string) {
    await this.flow.changeStage(id, stageId, actorId, { note: escapeActivityText(note), lostReason: escapeActivityText(lostReason) });
    return this.get(id);
  }

  async markLost(id: string, reason: string, stageId: string | undefined, actorId: string | null) {
    const target = stageId
      ? await this.prisma.leadStage.findUnique({ where: { id: stageId } })
      : await this.flow.firstActiveStageOfType("LOST");
    if (!target || target.type !== "LOST") {
      throw new BadRequestException("Tahap 'Kalah' tidak ditemukan");
    }
    await this.flow.changeStage(id, target.id, actorId, { lostReason: escapeActivityText(reason), note: escapeActivityText(reason) });
    // lead may already have been in the lost stage: still store the reason.
    await this.prisma.lead.update({ where: { id }, data: { lostReason: reason } });
    return this.get(id);
  }

  async assign(id: string, assignedToId: string | null, actorId: string | null) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { assignedTo: true } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    let assigneeName: string | null = null;
    if (assignedToId) {
      const user = await this.prisma.user.findUnique({ where: { id: assignedToId }, select: { name: true, isActive: true } });
      if (!user || !user.isActive) throw new BadRequestException("Pengguna tidak ditemukan");
      assigneeName = user.name;
    }
    if (lead.assignedToId === assignedToId) return this.get(id);
    await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: { assignedToId } }),
      this.prisma.leadActivity.create({
        data: { leadId: id, type: "ASSIGNED", body: assigneeName, actorId },
      }),
    ]);
    return this.get(id);
  }

  async addActivity(
    id: string,
    type: "NOTE" | "CALL" | "WHATSAPP" | "MEETING",
    body: string | undefined,
    actorId: string | null,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    const now = new Date();
    const isReply = type !== "NOTE";
    await this.prisma.$transaction([
      this.prisma.leadActivity.create({ data: { leadId: id, type, body: escapeActivityText(body) ?? null, actorId } }),
      this.prisma.lead.update({
        where: { id },
        data: {
          lastContactAt: now,
          ...(isReply && !lead.firstResponseAt ? { firstResponseAt: now } : {}),
        },
      }),
    ]);
    return this.get(id);
  }

  async setFollowUp(id: string, at: string, note: string | undefined, actorId: string | null) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id },
        data: { followUpAt: new Date(at), followUpNote: note ?? null },
      }),
      this.prisma.leadActivity.create({
        data: { leadId: id, type: "FOLLOW_UP_SET", body: note ?? null, actorId },
      }),
    ]);
    return this.get(id);
  }

  async completeFollowUp(id: string, actorId: string | null) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    if (!lead.followUpAt) return this.get(id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id },
        data: {
          followUpAt: null,
          followUpNote: null,
          lastContactAt: now,
          ...(!lead.firstResponseAt ? { firstResponseAt: now } : {}),
        },
      }),
      this.prisma.leadActivity.create({
        data: { leadId: id, type: "FOLLOW_UP_DONE", body: lead.followUpNote, actorId },
      }),
    ]);
    return this.get(id);
  }

  async bulk(
    ids: string[],
    action: { assignedToId?: string | null; stageId?: string },
    actorId: string | null,
  ) {
    if (action.assignedToId === undefined && !action.stageId) {
      throw new BadRequestException("Pilih penanggung jawab atau tahap");
    }
    const failed: Array<{ id: string; message: string }> = [];
    let updated = 0;
    for (const id of ids) {
      try {
        if (action.assignedToId !== undefined) await this.assign(id, action.assignedToId, actorId);
        if (action.stageId) await this.flow.changeStage(id, action.stageId, actorId);
        updated += 1;
      } catch (error) {
        failed.push({ id, message: (error as Error).message });
      }
    }
    return { updated, failed };
  }

  async link(
    id: string,
    dto: { clientId?: string | null; projectId?: string | null; quotationId?: string | null },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
        ...(dto.quotationId !== undefined ? { quotationId: dto.quotationId } : {}),
      },
    });
    return this.get(id);
  }

  // -------------------------------------------------------------------
  // convert: lead -> client (+ project + draft quotation)
  // -------------------------------------------------------------------

  private async matchClient(lead: { phone: string | null; email: string | null }) {
    if (lead.phone) {
      const tail = lead.phone.replace(/\D/g, "").slice(-8);
      const candidates = await this.prisma.client.findMany({
        where: { isInternal: false, phone: { contains: tail } },
        select: { id: true, name: true, phone: true },
        take: 20,
      });
      const hit = candidates.find((c) => normalizePhone(c.phone) === lead.phone);
      if (hit) return hit;
    }
    if (lead.email) {
      const byEmail = await this.prisma.client.findFirst({
        where: { isInternal: false, email: { equals: lead.email, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (byEmail) return byEmail;
    }
    return null;
  }

  async convert(id: string, dto: ConvertLeadDto, actorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { campaign: true, stage: true } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    const wantsQuotation = dto.createQuotation ?? true;
    const wantsProject = dto.createProject ?? wantsQuotation;
    if (wantsQuotation && lead.quotationId) {
      throw new ConflictException("Lead ini sudah punya penawaran.");
    }

    // 1) client: explicit > already linked > phone/email match > new
    let clientId = dto.clientId ?? lead.clientId ?? null;
    let clientCreated = false;
    if (clientId) {
      const c = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true, isInternal: true } });
      if (!c) throw new NotFoundException("Klien tidak ditemukan");
      if (c.isInternal) throw new BadRequestException("Klien internal tidak dapat dipakai untuk lead");
    } else {
      const match = await this.matchClient(lead);
      if (match) {
        clientId = match.id;
      } else {
        const created = await this.clients.create({
          name: lead.company || lead.name,
          contactPerson: lead.company ? lead.name : undefined,
          phone: lead.phone ?? undefined,
          email: lead.email ?? undefined,
          company: lead.company ?? undefined,
          notes: lead.campaign ? `Dari lead WhatsApp (${lead.campaign.code})` : "Dari lead CRM",
        } as any);
        clientId = created.id;
        clientCreated = true;
      }
    }

    // 2) project
    let projectId = lead.projectId;
    if (wantsProject && !projectId) {
      const type = await this.prisma.projectTypeConfig.findFirst({
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
      });
      if (!type) throw new BadRequestException("Belum ada tipe proyek aktif");
      const estimate = dto.amount ?? Number(lead.estimatedValue);
      const project = await this.projects.create({
        description: dto.projectName?.trim() || `${lead.company || lead.name}${lead.campaign ? ` - ${lead.campaign.name}` : ""}`,
        projectTypeId: dto.projectTypeId ?? type.id,
        clientId,
        ...(estimate > 0 ? { estimatedBudget: estimate } : {}),
      } as any);
      projectId = project.id;
    }

    // 3) draft quotation
    let quotationId = lead.quotationId;
    if (wantsQuotation) {
      const amount = dto.amount ?? Number(lead.estimatedValue);
      if (!(amount > 0)) {
        throw new BadRequestException("Isi estimasi nilai (lebih dari 0) untuk membuat penawaran.");
      }
      const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      const quotation = await this.quotations.create(
        {
          clientId,
          projectId: projectId as string,
          amountPerProject: amount,
          totalAmount: amount,
          validUntil,
        } as any,
        actorId,
      );
      quotationId = quotation.id;
    }

    await this.prisma.lead.update({
      where: { id },
      data: {
        clientId,
        projectId,
        quotationId,
        ...(dto.amount !== undefined ? { estimatedValue: new Prisma.Decimal(dto.amount) } : {}),
      },
    });
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        type: "CONVERTED",
        // Stable key + parts; the frontend translates (crm.history.converted*).
        body: `@lead.converted: ${[clientCreated ? "clientNew" : "clientLinked", projectId ? "project" : null, quotationId ? "quotation" : null]
          .filter(Boolean)
          .join(",")}`,
        actorId,
      },
    });

    // A quote on the table means the deal is at least at "Proposal".
    if (quotationId && lead.stage.type === "OPEN") {
      const proposal = await this.prisma.leadStage.findFirst({ where: { key: "PROPOSAL", isActive: true } });
      if (proposal && proposal.order > lead.stage.order) {
        await this.flow.changeStage(id, proposal.id, actorId, { note: "@lead.quotationCreated" });
      }
    }
    return { leadId: id, clientId, projectId, quotationId, clientCreated };
  }
}
