import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { LeadStageType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CrmOutboxService, MetaEventName, META_EVENTS } from "./crm-outbox.service";

export interface ChangeStageOptions {
  note?: string | null;
  lostReason?: string | null;
}

/**
 * The write path every stage change goes through (UI moves, bulk moves,
 * mark-lost, and the quotation / invoice hooks). Keeps stage history
 * append-only and the Meta event outbox consistent.
 *
 * Lives in the global CrmCoreModule so Quotations / Invoices / Payments can
 * inject it (optionally) without importing the whole CRM module.
 */
@Injectable()
export class CrmFlowService {
  private readonly logger = new Logger(CrmFlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: CrmOutboxService,
  ) {}

  private isMetaEvent(v: string | null | undefined): v is MetaEventName {
    return !!v && (META_EVENTS as readonly string[]).includes(v);
  }

  async firstActiveStageOfType(type: LeadStageType) {
    return this.prisma.leadStage.findFirst({
      where: { type, isActive: true },
      orderBy: { order: "asc" },
    });
  }

  /** Value attached to a Purchase event: the linked quotation total, else the lead estimate. */
  private async purchaseValue(lead: { quotationId: string | null; estimatedValue: Prisma.Decimal | number }): Promise<number> {
    if (lead.quotationId) {
      const q = await this.prisma.quotation.findUnique({
        where: { id: lead.quotationId },
        select: { totalAmount: true },
      });
      if (q) return Number(q.totalAmount);
    }
    return Number(lead.estimatedValue ?? 0);
  }

  /**
   * Move a lead to another stage. Appends a STAGE_CHANGE activity and queues
   * the stage's Meta event (if any). A human (actorId set) acting on a lead
   * that has never been answered also counts as the first response, except
   * on a waiting lead (landing-page form, no chat yet: nothing to answer).
   * Closing a waiting lead (Won / Lost) ends its waiting state.
   */
  async changeStage(
    leadId: string,
    toStageId: string,
    actorId: string | null,
    opts: ChangeStageOptions = {},
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    const toStage = await this.prisma.leadStage.findUnique({ where: { id: toStageId } });
    if (!toStage || !toStage.isActive) {
      throw new BadRequestException("Tahap tidak valid");
    }
    if (lead.stageId === toStageId) return lead;

    const value =
      toStage.metaEvent === "Purchase" ? await this.purchaseValue(lead) : null;

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: {
          stageId: toStageId,
          lostReason:
            toStage.type === "LOST" ? (opts.lostReason ?? lead.lostReason ?? null) : null,
          ...(actorId && !lead.firstResponseAt && !lead.awaitingWhatsapp ? { firstResponseAt: now } : {}),
          ...(toStage.type !== "OPEN" && lead.awaitingWhatsapp ? { awaitingWhatsapp: false } : {}),
        },
      });
      let metaEvent: string | null = null;
      if (this.isMetaEvent(toStage.metaEvent)) {
        const created = await this.outbox.queueEvent(tx, updated, toStage.metaEvent, {
          value,
          eventTime: now,
        });
        if (created) metaEvent = toStage.metaEvent;
      }
      await tx.leadActivity.create({
        data: {
          leadId,
          type: "STAGE_CHANGE",
          body: opts.note ?? opts.lostReason ?? null,
          fromStageId: lead.stageId,
          toStageId,
          metaEvent,
          actorId,
        },
      });
      return updated;
    });
  }

  // ---------------------------------------------------------------------
  // Hooks called from the quotation / invoice flows. Best-effort: a CRM
  // failure must never break an approval or a payment.
  // ---------------------------------------------------------------------

  async onQuotationApproved(quotationId: string): Promise<void> {
    try {
      const leads = await this.prisma.lead.findMany({
        where: { quotationId },
        include: { stage: true },
      });
      for (const lead of leads) {
        await this.recordPurchase(lead, quotationId, "Penawaran disetujui");
      }
    } catch (error) {
      this.logger.error(`CRM hook (quotation approved ${quotationId}) failed`, error as Error);
    }
  }

  async onInvoicePaid(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { quotationId: true },
      });
      if (!invoice?.quotationId) return;
      const leads = await this.prisma.lead.findMany({
        where: { quotationId: invoice.quotationId },
        include: { stage: true },
      });
      for (const lead of leads) {
        await this.recordPurchase(lead, invoice.quotationId, "Invoice dibayar");
      }
    } catch (error) {
      this.logger.error(`CRM hook (invoice paid ${invoiceId}) failed`, error as Error);
    }
  }

  private async recordPurchase(
    lead: { id: string; stage: { type: LeadStageType }; quotationId: string | null; estimatedValue: Prisma.Decimal } & Record<string, any>,
    quotationId: string,
    note: string,
  ): Promise<void> {
    if (lead.stage.type === "OPEN") {
      const won = await this.firstActiveStageOfType("WON");
      if (won) await this.changeStage(lead.id, won.id, null, { note });
    }
    const value = await this.purchaseValue({ ...lead, quotationId });
    await this.outbox.queueEvent(this.prisma, lead as any, "Purchase", { value });
  }
}
