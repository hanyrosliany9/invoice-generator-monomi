import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { QuotationsService } from "../quotations/quotations.service";
import { NotificationsService } from "../notifications/notifications.service";
import { JournalService } from "../accounting/services/journal.service";
import { accountForSource } from "../accounting/cash-accounts.util";
import { RevenueRecognitionService } from "../accounting/services/revenue-recognition.service";
import { InvoiceCounterService } from "./services/invoice-counter.service";
import { DocumentsService } from "../documents/documents.service";
import { ProfitCalculationService } from "../projects/profit-calculation.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import {
  InvoiceStatus,
  QuotationStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  BusinessJourneyEventType,
} from "@prisma/client";
import { PaginatedResponse } from "../../common/dto/api-response.dto";
import { handleServiceError } from "../../common/utils/error-handling.util";
import {
  sanitizeText,
  sanitizeRichText,
  sanitizeJsonObject,
} from "../../common/utils/sanitization.util";
import { wibStartOfDay } from "../../common/utils/wib-date.util";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => QuotationsService))
    private quotationsService: QuotationsService,
    private notificationsService: NotificationsService,
    private journalService: JournalService,
    private revenueRecognitionService: RevenueRecognitionService,
    private invoiceCounterService: InvoiceCounterService,
    private documentsService: DocumentsService,
    private profitCalculationService: ProfitCalculationService,
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    userId: string,
  ): Promise<any> {
    // Validate client exists and is active
    const client = await this.prisma.client.findUnique({
      where: { id: createInvoiceDto.clientId },
    });
    if (!client) {
      throw new NotFoundException(
        `Client dengan ID ${createInvoiceDto.clientId} tidak ditemukan`,
      );
    }
    if (client.status !== "active") {
      throw new BadRequestException(
        "Cannot create document for an inactive client",
      );
    }

    // Validate project exists and get scopeOfWork & priceBreakdown
    const project = await this.prisma.project.findUnique({
      where: { id: createInvoiceDto.projectId },
      select: { id: true, priceBreakdown: true, scopeOfWork: true },
    });
    if (!project) {
      throw new NotFoundException(
        `Project dengan ID ${createInvoiceDto.projectId} tidak ditemukan`,
      );
    }

    // Get quotation scopeOfWork & priceBreakdown if quotationId is provided
    let quotation = null;
    if (createInvoiceDto.quotationId) {
      quotation = await this.prisma.quotation.findUnique({
        where: { id: createInvoiceDto.quotationId },
        select: { priceBreakdown: true, scopeOfWork: true },
      });
    }

    // If paymentMilestoneId provided, validate and inherit data
    let paymentMilestone = null;
    if (createInvoiceDto.paymentMilestoneId) {
      paymentMilestone = await this.prisma.paymentMilestone.findUnique({
        where: { id: createInvoiceDto.paymentMilestoneId },
        include: {
          quotation: true,
          invoices: true, // Check for existing invoices
        },
      });

      if (!paymentMilestone) {
        throw new NotFoundException("Payment milestone tidak ditemukan");
      }

      // CRITICAL: Prevent duplicate milestone invoices
      if (paymentMilestone.isInvoiced) {
        const existingInvoice = paymentMilestone.invoices[0];
        throw new ConflictException({
          message: "Milestone ini sudah memiliki invoice",
          existingInvoiceId: existingInvoice?.id,
          existingInvoiceNumber: existingInvoice?.invoiceNumber,
          createdAt: existingInvoice?.creationDate,
        });
      }

      // Validate milestone belongs to quotation (if quotationId provided)
      if (
        createInvoiceDto.quotationId &&
        paymentMilestone.quotationId !== createInvoiceDto.quotationId
      ) {
        throw new BadRequestException(
          "Payment milestone tidak sesuai dengan quotation",
        );
      }

      // Override amounts with milestone data (prevent manual tampering)
      createInvoiceDto.totalAmount = Number(paymentMilestone.paymentAmount);
      createInvoiceDto.amountPerProject = Number(
        paymentMilestone.paymentAmount,
      );
      createInvoiceDto.quotationId = paymentMilestone.quotationId;
    }

    // Server-side tax/discount recompute — do NOT trust client-sent totals.
    // Only run when priceBreakdown.products is present; skip for milestone-
    // amount overrides (handled above) and plain lump-sum invoices.
    if (!createInvoiceDto.paymentMilestoneId) {
      const recomputed = this.recomputeTotals(createInvoiceDto);
      if (recomputed !== null) {
        createInvoiceDto.totalAmount = recomputed.totalAmount;
        createInvoiceDto.amountPerProject = recomputed.subtotal;
        if (createInvoiceDto.subtotalAmount !== undefined) {
          createInvoiceDto.subtotalAmount = recomputed.subtotal;
        }
        if (createInvoiceDto.taxAmount !== undefined) {
          createInvoiceDto.taxAmount = recomputed.taxAmount;
        }
      }
    }

    // Validate business rules
    await this.validateBusinessRules(createInvoiceDto);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Auto-calculate materai
    const materaiRequired = createInvoiceDto.totalAmount >= 5000000;

    // Cascade scopeOfWork: DTO > Quotation > Project
    const scopeOfWork =
      createInvoiceDto.scopeOfWork ||
      quotation?.scopeOfWork ||
      project.scopeOfWork ||
      null;

    // Cascade priceBreakdown: DTO > Quotation > Project
    const priceBreakdown =
      createInvoiceDto.priceBreakdown ||
      quotation?.priceBreakdown ||
      project.priceBreakdown ||
      undefined;

    // Sanitize input data with comprehensive sanitization
    const sanitizedData = {
      ...createInvoiceDto,
      paymentInfo: sanitizeText(createInvoiceDto.paymentInfo),
      terms: createInvoiceDto.terms
        ? sanitizeRichText(createInvoiceDto.terms)
        : null,
      // Sanitize JSON fields
      priceBreakdown: createInvoiceDto.priceBreakdown
        ? sanitizeJsonObject(createInvoiceDto.priceBreakdown)
        : null,
    };

    try {
      return await this.prisma.$transaction(async (prisma) => {
        const invoice = await prisma.invoice.create({
          data: {
            ...sanitizedData,
            invoiceNumber,
            materaiRequired,
            materaiApplied: createInvoiceDto.materaiApplied || false,
            priceBreakdown: priceBreakdown,
            paymentMilestoneId: createInvoiceDto.paymentMilestoneId,
            createdBy: userId,
          },
          include: {
            client: true,
            project: true,
            paymentMilestone: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // CRITICAL: Mark milestone as invoiced (INSIDE transaction for atomicity)
        if (paymentMilestone) {
          await prisma.paymentMilestone.update({
            where: { id: paymentMilestone.id },
            data: { isInvoiced: true },
          });
        }

        // Create audit log — ALWAYS write only the explicit whitelist, never the
        // full Prisma response (which includes nested client/project/user PII).
        const auditPayload = {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          clientId: invoice.clientId,
        };
        await prisma.auditLog
          .create({
            data: {
              action: "CREATE",
              entityType: "invoice",
              entityId: invoice.id,
              newValues: auditPayload as any,
              userId: userId,
            },
          })
          .catch((err) => this.logger.error('Audit log write failed', err));

        return invoice;
      });
    } catch (error: any) {
      // Handle concurrent invoice creation (Prisma unique constraint violation)
      if (
        error.code === "P2002" &&
        error.meta?.target?.includes("paymentMilestoneId")
      ) {
        throw new ConflictException(
          "Invoice untuk milestone ini sedang dibuat oleh user lain. Silakan refresh halaman.",
        );
      }
      throw error;
    }
  }

  async createFromQuotation(quotationId: string, userId: string): Promise<any> {
    try {
      // Get the quotation with full details
      const quotation = await this.quotationsService.findOne(quotationId);

      if (quotation.status !== QuotationStatus.APPROVED) {
        throw new BadRequestException(
          "Hanya quotation yang disetujui yang dapat dibuat menjadi invoice",
        );
      }

      // BLOCK: Check if quotation is milestone-based
      if (quotation.paymentType === "MILESTONE_BASED") {
        const milestones = await this.prisma.paymentMilestone.findMany({
          where: { quotationId },
          orderBy: { milestoneNumber: "asc" },
        });

        if (milestones.length > 0) {
          throw new BadRequestException({
            message:
              "Quotation ini menggunakan termin pembayaran. " +
              "Silakan buat invoice untuk setiap milestone secara terpisah.",
            code: "MILESTONE_BASED_QUOTATION",
            quotationId,
            milestones: milestones.map((m) => ({
              id: m.id,
              number: m.milestoneNumber,
              name: m.nameId || m.name,
              amount: m.paymentAmount,
              isInvoiced: m.isInvoiced,
            })),
          });
        }
      }

      // Check if a LIVE invoice already exists for this quotation. A CANCELLED
      // invoice must not block re-creation — exclude it so the quotation can be
      // re-invoiced after a cancel.
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { quotationId, status: { not: "CANCELLED" } },
        include: {
          client: true,
          project: true,
          quotation: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: true,
        },
      });

      if (existingInvoice) {
        // Return existing invoice instead of throwing error
        return existingInvoice;
      }

      // Get company settings for payment info
      const companySettings = await this.getCompanySettings();

      // Calculate smart due date based on client payment terms
      const dueDate = await this.calculateSmartDueDate(quotation.client);

      // Generate smart payment info
      const paymentInfo = this.generateSmartPaymentInfo(companySettings);

      // Calculate total amount with proper conversion
      const totalAmount = parseFloat(quotation.totalAmount.toString());

      // Auto-calculate materai requirement (Indonesian compliance)
      const materaiRequired = this.calculateMateraiRequirement(totalAmount);
      const materaiAmount = materaiRequired ? 10000 : 0; // Current materai rate in Indonesia

      // Create invoice from quotation data with enhanced automation
      const invoiceData: CreateInvoiceDto = {
        quotationId,
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        amountPerProject: parseFloat(quotation.amountPerProject.toString()),
        totalAmount,
        dueDate: dueDate.toISOString(),
        paymentInfo,
        // Inherit terms directly from quotation (no enhancement/modification)
        terms: quotation.terms,
        // Inherit scopeOfWork from quotation (cascade: quotation > project)
        scopeOfWork: quotation.scopeOfWork || quotation.project?.scopeOfWork,
        // Inherit priceBreakdown from quotation (for line items)
        priceBreakdown: quotation.priceBreakdown || quotation.project?.priceBreakdown,
      };

      // Create invoice with full automation
      const invoice = await this.create(invoiceData, userId);

      // Update materai information if required
      if (materaiRequired) {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            materaiRequired: true,
            materaiAmount: materaiAmount,
          },
        });
      }

      // Track business journey event
      await this.trackBusinessJourneyEvent(
        "INVOICE_GENERATED",
        {
          quotationId,
          invoiceId: invoice.id,
          clientId: quotation.clientId,
          projectId: quotation.projectId,
          totalAmount,
          materaiRequired,
          automatedConversion: true,
        },
        userId,
      );

      // Send automated notification about invoice generation
      try {
        await this.notificationsService.sendInvoiceGenerated(
          invoice.id,
          quotationId,
        );
      } catch (error) {
        // Log error but don't fail the invoice creation
        this.logger.error(
          "Failed to send invoice generation notification:",
          error,
        );
      }

      return {
        ...invoice,
        materaiRequired,
        materaiAmount,
        automationApplied: true,
        smartDueDateCalculated: true,
        enhancedTermsApplied: true,
      };
    } catch (error) {
      handleServiceError(error, "create invoice from quotation", "invoice");
    }
  }

  /** Allowlist of columns that may be used for sorting. */
  private static readonly SORT_COLUMNS: Record<string, string> = {
    creationDate: "creationDate",
    dueDate: "dueDate",
    totalAmount: "totalAmount",
    invoiceNumber: "invoiceNumber",
    status: "status",
    createdAt: "createdAt",
  };

  async findAll(
    page = 1,
    limit = 10,
    status?: InvoiceStatus,
    search?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc",
  ): Promise<PaginatedResponse<any[]>> {
    // Clamp limit: must be at least 1 and at most 200
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    // Validate status against the enum to prevent Prisma 500s
    if (status !== undefined) {
      const validStatuses = Object.values(InvoiceStatus) as string[];
      if (!validStatuses.includes(status as string)) {
        throw new BadRequestException(
          `Status tidak valid. Nilai yang diperbolehkan: ${validStatuses.join(", ")}`,
        );
      }
    }

    // Build where clause with optional search filter
    const searchFilter = search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" as const } },
            { client: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const where = {
      ...(status ? { status } : {}),
      ...searchFilter,
    };

    // Resolve orderBy: validate column against allowlist, default to createdAt desc
    const resolvedSortColumn =
      sortBy && InvoicesService.SORT_COLUMNS[sortBy]
        ? InvoicesService.SORT_COLUMNS[sortBy]
        : "createdAt";
    const resolvedSortOrder: "asc" | "desc" =
      sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [resolvedSortColumn]: resolvedSortOrder };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          client: true,
          project: true,
          quotation: true,
          paymentMilestone: true,
          payments: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    // Attach a payment summary per invoice (CONFIRMED payments only — mirrors
    // findOne) so consumers (dashboard "outstanding", AR views) can use the
    // REMAINING balance instead of the full total on partially-paid invoices.
    const invoicesWithSummary = invoices.map((inv: any) => {
      const list: any[] = inv.payments || [];
      const totalPaid = list.reduce(
        (sum: number, p: any) =>
          p.status === "CONFIRMED" ? sum + Number(p.amount) : sum,
        0,
      );
      const totalAmount = Number(inv.totalAmount);
      const remainingAmount = totalAmount - totalPaid;
      return {
        ...inv,
        paymentSummary: {
          totalPaid,
          remainingAmount,
          isPaid: remainingAmount <= 0,
          paymentCount: list.length,
        },
      };
    });

    return new PaginatedResponse(
      invoicesWithSummary,
      {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
      "Invoices retrieved successfully",
    );
  }

  async findOne(id: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        project: {
          include: {
            projectType: true, // Include project type for PDF filename
          },
        },
        quotation: {
          include: {
            paymentMilestones: true,
            invoices: {
              where: {
                status: "PAID",
              },
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                status: true,
                paymentMilestone: {
                  select: {
                    milestoneNumber: true,
                    name: true,
                    nameId: true,
                  },
                },
              },
            },
          },
        },
        paymentMilestone: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice tidak ditemukan");
    }

    // Compute payment summary from the payments array — CONFIRMED only
    // (matches payments.service.ts updateInvoiceStatus filter so PENDING/FAILED
    // payments do not inflate totalPaid / understate remainingAmount)
    const payments: any[] = invoice.payments || [];
    const totalPaid = payments.reduce(
      (sum: number, p: any) =>
        p.status === 'CONFIRMED' ? sum + Number(p.amount) : sum,
      0,
    );
    const totalAmount = Number(invoice.totalAmount);
    const remainingAmount = totalAmount - totalPaid;
    const paymentSummary = {
      totalPaid,
      remainingAmount,
      isPaid: remainingAmount <= 0,
      paymentCount: payments.length,
    };

    return { ...invoice, paymentSummary };
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, userId?: string): Promise<any> {
    const invoice = await this.findOne(id);

    // FIX 3 (HIGH): Block amount edits on PAID invoices.
    // Changing totalAmount (or amountPerProject) re-issues the SENT journal but
    // never adjusts the payment journal → permanent GL mismatch.  Non-amount
    // edits (notes, terms, etc.) are still allowed.
    if (invoice.status === 'PAID') {
      const wouldChangeAmount =
        (updateInvoiceDto.totalAmount !== undefined &&
          Number(updateInvoiceDto.totalAmount) !== Number(invoice.totalAmount)) ||
        (updateInvoiceDto.amountPerProject !== undefined &&
          Number(updateInvoiceDto.amountPerProject) !== Number(invoice.amountPerProject));

      if (wouldChangeAmount) {
        throw new BadRequestException(
          'Cannot edit the amount of a paid invoice. Reverse the payment first.',
        );
      }
    }

    // Recalculate materai requirement if total amount changed
    const data = { ...updateInvoiceDto };
    if (data.totalAmount) {
      data.materaiRequired = data.totalAmount >= 5000000;
    }

    // FIX 5 (CRITICAL): Keep the GL balanced when totalAmount changes on a SENT
    // invoice that already has a posted journal.  Without this, AR stays at the
    // old amount permanently.
    const amountIsChanging =
      data.totalAmount !== undefined &&
      Number(data.totalAmount) !== Number(invoice.totalAmount);

    if (amountIsChanging && invoice.journalEntryId) {
      const reversalUserId = userId || 'system';
      try {
        const existingJournal = await this.prisma.journalEntry.findUnique({
          where: { id: invoice.journalEntryId },
          select: { id: true, isPosted: true, entryNumber: true },
        });

        if (existingJournal?.isPosted) {
          // Check it hasn't already been reversed
          const alreadyReversed = await this.prisma.journalEntry.findFirst({
            where: { reversedEntryId: invoice.journalEntryId },
            select: { id: true },
          });

          if (!alreadyReversed) {
            await this.journalService.reverseJournalEntry(
              invoice.journalEntryId,
              reversalUserId,
            );
            this.logger.log(
              `✅ Reversed SENT journal ${existingJournal.entryNumber} for invoice ${invoice.invoiceNumber} (amount edit)`,
            );
          }

          // Create a new SENT journal at the new amount and post it
          const newJournal = await this.journalService.createInvoiceJournalEntry(
            invoice.id,
            invoice.invoiceNumber,
            invoice.clientId,
            Number(data.totalAmount),
            'SENT',
            reversalUserId,
          );
          await this.journalService.postJournalEntry(newJournal.id, reversalUserId);

          // Record the new journal entry ID in data so it's persisted below
          (data as any).journalEntryId = newJournal.id;

          this.logger.log(
            `✅ Created and posted new SENT journal for invoice ${invoice.invoiceNumber} at new amount ${data.totalAmount}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to re-journal invoice ${id} on amount change:`,
          error,
        );
        throw new BadRequestException(
          'Gagal menyesuaikan jurnal GL untuk perubahan jumlah invoice.',
        );
      }
    }

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: {
        client: true,
        project: true,
        quotation: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    userId?: string,
  ): Promise<any> {
    const invoice = await this.findOne(id);

    // ✅ FIX: Block PAID status changes - must use markAsPaid endpoint
    if (status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        "Tidak dapat mengubah status ke PAID melalui endpoint ini. Gunakan endpoint /mark-paid untuk menandai invoice sebagai lunas agar jurnal pembayaran dibuat dengan benar.",
      );
    }

    // Validate status transition
    this.validateStatusTransition(invoice.status, status);

    // ACCRUAL: posting a SENT invoice books DR Accounts Receivable / CR Revenue
    // — but ONLY for the services portion. Reimbursable "[Reimburse]" lines are
    // cost recovery, already sitting in Piutang Lain-lain (1-2040); they are NOT
    // revenue and must not be re-posted to AR/Revenue (that double-counted them).
    // They stay in 1-2040 and are cleared when the invoice is paid.
    if (
      status === InvoiceStatus.SENT &&
      invoice.status !== InvoiceStatus.SENT
    ) {
      try {
        const servicesAmount =
          Number(invoice.totalAmount) - this.reimbursablePortionOf(invoice);

        let journalEntryId: string | undefined;
        if (servicesAmount > 0) {
          const journalEntry =
            await this.journalService.createInvoiceJournalEntry(
              invoice.id,
              invoice.invoiceNumber,
              invoice.clientId,
              servicesAmount,
              "SENT",
              userId || "system",
            );
          await this.journalService.postJournalEntry(
            journalEntry.id,
            userId || "system",
          );
          journalEntryId = journalEntry.id;
        }
        // (servicesAmount === 0 → a reimbursables-only invoice: no revenue/AR
        //  journal; only the reimburse leg below is posted.)

        // DEFERRED REIMBURSE POSTING: book DR 1-2040 / CR Kas for the reimbursable
        // portion now (it was intentionally NOT posted at expense-record time).
        await this.postReimburseLegOnSent(invoice, userId || "system");

        const updated = await this.prisma.invoice.update({
          where: { id },
          data: { status, ...(journalEntryId ? { journalEntryId } : {}) },
          include: { client: true, project: true },
        });
        this.logger.log(
          `✅ SENT invoice ${invoice.invoiceNumber}: posted services revenue ${servicesAmount} (reimbursable kept in 1-2040)`,
        );
        return updated;
      } catch (error) {
        this.logger.error("Failed to create journal entry for invoice:", error);
        throw new BadRequestException(
          "Gagal membuat jurnal entry untuk invoice. Status tidak dapat diubah.",
        );
      }
    }

    // CANCELLED: auto-correct the General Ledger. A cancelled invoice must not
    // leave its SENT revenue/AR, its deferred reimburse leg (1-2040), or any
    // payment on the books. Reverse them all and return the project's reimbursable
    // expenses to the unbilled pool so they can be re-billed on a new invoice.
    if (
      status === InvoiceStatus.CANCELLED &&
      invoice.status !== InvoiceStatus.CANCELLED
    ) {
      await this.reverseInvoiceJournalsAndReimbursables(invoice, userId || "system");
      return this.prisma.invoice.update({
        where: { id },
        data: { status },
        include: { client: true, project: true },
      });
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        project: true,
      },
    });
  }

  /**
   * The reimbursable portion of an invoice = sum of its "[Reimburse] …" line
   * items (auto-generated when reimbursables are pulled onto an invoice). These
   * are NOT revenue — they recover money already advanced for the client, which
   * is sitting in Piutang Lain-lain (1-2040). So the services subtotal
   * (total − reimbursable) is what drives Revenue/Trade-AR; the reimbursable
   * stays in 1-2040 and is cleared on payment. This is what keeps reimbursables
   * from being double-counted (once in 1-2040, once in revenue/AR).
   */
  reimbursablePortionOf(invoice: { priceBreakdown?: any }): number {
    const products = invoice?.priceBreakdown?.products;
    if (!Array.isArray(products)) return 0;
    return products
      .filter(
        (p: any) =>
          typeof p?.name === "string" && p.name.startsWith("[Reimburse]"),
      )
      .reduce(
        (s: number, p: any) =>
          s +
          (Number(p?.subtotal) ||
            Number(p?.price) * (Number(p?.quantity) || 1) ||
            0),
        0,
      );
  }

  /**
   * Mark a project's outstanding reimbursables (isBillable, not yet reimbursed)
   * as reimbursed, oldest first, up to `amount` — called when an invoice that
   * billed them is PAID, so the Piutang Lain-lain receivable is settled in
   * lockstep with the cash that cleared it.
   */
  private async markProjectReimbursablesPaid(
    projectId: string | null | undefined,
    amount: number,
    reimbursementJournalId: string,
  ): Promise<void> {
    if (!projectId || amount <= 0) return;
    const outstanding = await this.prisma.expense.findMany({
      where: { projectId, isBillable: true, reimbursedAt: null },
      orderBy: { expenseDate: "asc" },
      select: { id: true, totalAmount: true, billableAmount: true },
    });
    let remaining = amount + 0.01; // tolerance
    const toMark: string[] = [];
    for (const e of outstanding) {
      const amt = Number(e.billableAmount ?? e.totalAmount);
      if (amt <= remaining) {
        toMark.push(e.id);
        remaining -= amt;
      }
    }
    if (toMark.length > 0) {
      await this.prisma.expense.updateMany({
        where: { id: { in: toMark } },
        data: { reimbursedAt: new Date(), reimbursementJournalId },
      });
    }
  }

  /**
   * DEFERRED REIMBURSE POSTING — the reimburse leg is NOT booked when the expense
   * is recorded on the project (expenses.service create() skips the journal for
   * billable expenses). It is booked HERE, when the invoice that bills it is SENT:
   *   DR 1-2040 Piutang Lain-lain  (reimburse) / CR 1-1010 Kas
   * i.e. the company is recognised as having advanced cash on the client's behalf
   * at the moment it bills the client for it. The matched project reimbursable
   * expenses get `paymentJournalId` stamped (= "posted, awaiting client payment");
   * `reimbursedAt` stays null until the invoice is PAID (markProjectReimbursablesPaid).
   *
   * GUARANTEE: whenever an invoice carries a reimburse portion, that FULL portion
   * is posted to 1-2040 here — the reimburse never silently disappears from the GL.
   * The amount is driven by the invoice's [Reimburse] lines (reimbursablePortionOf),
   * NOT by how many project expenses happen to match. Matching is only used to
   * stamp/link the underlying expenses (so the project's "unbilled" view updates);
   * if fewer expenses match than the billed amount, the leg still posts the full
   * billed amount.
   *
   * Idempotent at the INVOICE level: if a posted EXPENSE_REIMBURSEMENT journal
   * already exists for this invoice (transactionId = invoiceNumber), it is skipped,
   * so re-SENT / markAsPaid-backfill never double-post.
   */
  private async postReimburseLegOnSent(
    invoice: { id: string; invoiceNumber: string; clientId: string; projectId?: string | null; priceBreakdown?: any },
    userId: string,
  ): Promise<void> {
    const reimbursePortion = this.reimbursablePortionOf(invoice);
    if (reimbursePortion <= 0) return;

    // INVOICE-LEVEL idempotency: already posted for this invoice → nothing to do.
    const existingLeg = await this.prisma.journalEntry.findFirst({
      where: {
        transactionId: invoice.invoiceNumber,
        transactionType: "EXPENSE_REIMBURSEMENT",
        isPosted: true,
      },
      select: { id: true },
    });
    if (existingLeg) return;

    // Best-effort: find the project's not-yet-posted reimbursables to stamp/link
    // (so they leave the "unbilled" pool). This does NOT cap the posted amount.
    const toPost: string[] = [];
    if (invoice.projectId) {
      const outstanding = await this.prisma.expense.findMany({
        where: { projectId: invoice.projectId, isBillable: true, paymentJournalId: null },
        orderBy: { expenseDate: "asc" },
        select: { id: true, totalAmount: true, billableAmount: true },
      });
      let remaining = reimbursePortion + 0.01; // tolerance
      for (const e of outstanding) {
        const amt = Number(e.billableAmount ?? e.totalAmount);
        if (amt <= remaining) {
          toPost.push(e.id);
          remaining -= amt;
        }
      }
    }

    // Always post the FULL billed reimburse portion to 1-2040.
    const journal = await this.journalService.createJournalEntry({
      description: `Reimburse advanced (billed on Invoice ${invoice.invoiceNumber})`,
      entryDate: new Date(),
      transactionId: invoice.invoiceNumber,
      transactionType: "EXPENSE_REIMBURSEMENT",
      createdBy: userId,
      autoPost: true,
      lineItems: [
        {
          accountCode: "1-2040", // DR Piutang Lain-lain (advance becomes a receivable)
          debit: reimbursePortion,
          credit: 0,
          description: `Reimburse advanced - Invoice ${invoice.invoiceNumber}`,
          projectId: invoice.projectId ?? undefined,
          clientId: invoice.clientId,
        },
        {
          accountCode: "1-1010", // CR Kas (cash advanced on client's behalf)
          debit: 0,
          credit: reimbursePortion,
          description: `Cash advanced for reimbursables - Invoice ${invoice.invoiceNumber}`,
          projectId: invoice.projectId ?? undefined,
          clientId: invoice.clientId,
        },
      ],
    });

    if (toPost.length > 0) {
      await this.prisma.expense.updateMany({
        where: { id: { in: toPost } },
        data: { paymentJournalId: journal.id },
      });
    }

    this.logger.log(
      `✅ Posted reimburse leg for invoice ${invoice.invoiceNumber}: ` +
        `DR 1-2040 / CR 1-1010 ${reimbursePortion} (${toPost.length} expense(s) linked)`,
    );
  }

  /**
   * Reverse EVERY posted journal an invoice produced, and unwind its reimbursables.
   * Used on CANCEL (and reusable on delete). Covers:
   *   1. the SENT services journal (invoice.journalEntryId — DR AR / CR Revenue)
   *   2. any payment journal (invoice.paymentJournalId — DR Cash / CR AR/1-2040)
   *   3. the deferred reimburse leg(s) (transactionId = invoiceNumber, type
   *      EXPENSE_REIMBURSEMENT — DR 1-2040 / CR Kas)
   * Reversal is idempotent (skips unposted / already-reversed entries). The
   * project's reimbursable expenses that were billed on this invoice are reset to
   * the UNBILLED pool (paymentJournalId / reimbursedAt cleared) so they can be
   * billed again on a replacement invoice.
   */
  private async reverseInvoiceJournalsAndReimbursables(
    invoice: { id: string; invoiceNumber: string; journalEntryId?: string | null; paymentJournalId?: string | null; projectId?: string | null; paymentMilestoneId?: string | null },
    userId: string,
  ): Promise<void> {
    // Collect the reimburse-leg journals for this invoice (linked by transactionId,
    // not by an FK on the invoice) so we can both reverse them AND find which
    // expenses to release.
    const reimburseLegs = await this.prisma.journalEntry.findMany({
      where: {
        transactionId: invoice.invoiceNumber,
        transactionType: "EXPENSE_REIMBURSEMENT",
      },
      select: { id: true },
    });
    const reimburseLegIds = reimburseLegs.map((j) => j.id);

    const journalIds = [
      invoice.journalEntryId,
      invoice.paymentJournalId,
      ...reimburseLegIds,
    ].filter((x): x is string => !!x);

    for (const journalId of journalIds) {
      try {
        const je = await this.prisma.journalEntry.findUnique({
          where: { id: journalId },
          select: { id: true, isPosted: true, entryNumber: true },
        });
        if (!je || !je.isPosted) continue;
        const alreadyReversed = await this.prisma.journalEntry.findFirst({
          where: { reversedEntryId: journalId },
          select: { id: true },
        });
        if (alreadyReversed) continue;
        await this.journalService.reverseJournalEntry(journalId, userId);
        this.logger.log(
          `✅ CANCEL: reversed journal ${je.entryNumber} for invoice ${invoice.invoiceNumber}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to reverse journal ${journalId} on cancel of invoice ${invoice.invoiceNumber}:`,
          error,
        );
      }
    }

    // Release the reimbursable expenses billed on this invoice back to "unbilled"
    // so they no longer sit in 1-2040 (now reversed) and can be re-billed.
    if (reimburseLegIds.length > 0) {
      await this.prisma.expense.updateMany({
        where: { paymentJournalId: { in: reimburseLegIds } },
        data: { paymentJournalId: null, reimbursedAt: null, reimbursementJournalId: null },
      });
    }
    // Also release any reimbursables this invoice settled at PAID (matched by the
    // payment journal), in case the invoice was paid then cancelled.
    if (invoice.paymentJournalId) {
      await this.prisma.expense.updateMany({
        where: { reimbursementJournalId: invoice.paymentJournalId },
        data: { reimbursedAt: null, reimbursementJournalId: null },
      });
    }

    // Release the payment milestone so a replacement invoice can be issued from
    // the same quotation. Without this, the milestone stays isInvoiced=true and
    // "Semua milestone sudah diinvoice" blocks re-invoicing after a cancel.
    if (invoice.paymentMilestoneId) {
      await this.prisma.paymentMilestone.update({
        where: { id: invoice.paymentMilestoneId },
        data: { isInvoiced: false },
      });
      this.logger.log(
        `✅ CANCEL: released milestone ${invoice.paymentMilestoneId} (isInvoiced=false) for invoice ${invoice.invoiceNumber}`,
      );
    }
  }

  async markAsPaid(
    id: string,
    paymentData?: {
      paymentMethod?: string;
      paymentDate?: string;
      notes?: string;
    },
    userId?: string,
  ): Promise<any> {
    // FIX 3 (HIGH) — concurrent double-payment guard:
    // Atomically claim the invoice by flipping status only when it is still
    // SENT/OVERDUE AND paymentJournalId is null.  If count===0 the invoice was
    // already claimed by another concurrent call → return it without creating
    // a second payment journal.
    const claimed = await this.prisma.invoice.updateMany({
      where: {
        id,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
        paymentJournalId: null,
      },
      data: {
        status: InvoiceStatus.PAID,
        markedPaidAt: new Date(),
        markedPaidBy: userId || 'system',
      },
    });

    if (claimed.count === 0) {
      // Either already paid/claimed or wrong status — return the invoice as-is.
      const existing = await this.findOne(id);
      if (
        existing.status !== InvoiceStatus.SENT &&
        existing.status !== InvoiceStatus.OVERDUE &&
        existing.status !== InvoiceStatus.PAID
      ) {
        throw new BadRequestException(
          "Hanya invoice dengan status SENT atau OVERDUE yang dapat ditandai sebagai lunas",
        );
      }
      this.logger.warn(
        `markAsPaid: invoice ${existing.invoiceNumber} already paid or concurrently claimed — returning existing`,
      );
      return existing;
    }

    // We won the claim — re-read with full includes for downstream logic.
    const invoice = await this.findOne(id);

    // Reimbursable portion (cost recovery, lives in 1-2040) vs services portion
    // (revenue/AR). Only the services portion is ever booked to AR/Revenue.
    const reimbursePortion = this.reimbursablePortionOf(invoice);
    const servicesAmount = Number(invoice.totalAmount) - reimbursePortion;

    // Ensure the SENT journal exists for the SERVICES portion (AR debit /
    // Revenue credit) before recording payment. Skip when services === 0
    // (reimbursables-only invoice — nothing to book to AR/Revenue).
    if (!invoice.journalEntryId && servicesAmount > 0) {
      try {
        const sentJournalEntry =
          await this.journalService.createInvoiceJournalEntry(
            invoice.id,
            invoice.invoiceNumber,
            invoice.clientId,
            servicesAmount,
            "SENT",
            userId || "system",
          );
        await this.journalService.postJournalEntry(
          sentJournalEntry.id,
          userId || "system",
        );
        await this.prisma.invoice.update({
          where: { id },
          data: { journalEntryId: sentJournalEntry.id },
        });
        this.logger.log(
          `✅ Backfilled SENT (services) journal for invoice ${invoice.invoiceNumber}`,
        );
      } catch (error) {
        this.logger.error(
          "Failed to create SENT journal entry during markAsPaid:",
          error,
        );
        throw new BadRequestException(
          "Gagal membuat jurnal entry untuk invoice SENT. Tidak dapat menandai sebagai lunas.",
        );
      }
    } else if (invoice.journalEntryId) {
      const sentJournal = await this.prisma.journalEntry.findUnique({
        where: { id: invoice.journalEntryId },
        select: { isPosted: true, entryNumber: true },
      });
      if (!sentJournal?.isPosted) {
        await this.journalService.postJournalEntry(
          invoice.journalEntryId,
          userId || "system",
        );
      }
    }

    // DEFERRED REIMBURSE POSTING backfill: if the invoice is being paid without
    // having gone through SENT (or SENT predates this logic), post the reimburse
    // leg DR 1-2040 / CR Kas now. Idempotent — skips reimbursables already posted.
    try {
      await this.postReimburseLegOnSent(invoice, userId || "system");
    } catch (error) {
      this.logger.error(
        "Failed to post deferred reimburse leg during markAsPaid:",
        error,
      );
      throw new BadRequestException(
        "Gagal membuat jurnal reimburse untuk invoice. Tidak dapat menandai sebagai lunas.",
      );
    }

    // FIX 1 (CRITICAL): Compute how much has already been paid via CONFIRMED
    // payments recorded through POST /payments, so we only post the remainder.
    // Without this, markAsPaid double-credits AR / over-records cash when a
    // partial payment already exists.
    const existingConfirmedPayments = await this.prisma.payment.findMany({
      where: { invoiceId: id, status: PaymentStatus.CONFIRMED },
      select: { amount: true },
    });
    const alreadyPaid = existingConfirmedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const amountToPay = Number(invoice.totalAmount) - alreadyPaid;

    if (amountToPay > 0) {
      // Payment journal — split the cash receipt so the reimburse is a CLOSED LOOP
      // on Cash (1-1010): it was advanced via CR Cash at invoice SENT, so the client's
      // repayment returns to Cash via DR Cash here (Cash nets back to where it started,
      // staying consistent with Piutang Lain-lain 1-2040 which also nets to zero).
      //   • services portion → DR Cash/Bank (by actual paymentMethod) / CR Trade AR 1-2010
      //   • reimburse portion → DR Cash 1-1010 / CR Piutang Lain-lain 1-2040
      try {
        const reimbPaid = Math.min(reimbursePortion, amountToPay);
        const servicesPaid = amountToPay - reimbPaid;
        const servicesAccountCode = accountForSource(
          paymentData?.paymentMethod === "CASH" ? "CASH" : "BANK",
        );
        const lineItems: any[] = [];
        if (servicesPaid > 0) {
          lineItems.push({
            accountCode: servicesAccountCode, // DR Cash/Bank (services receipt, by actual payment method)
            debit: servicesPaid,
            credit: 0,
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            clientId: invoice.clientId,
          });
          lineItems.push({
            accountCode: "1-2010", // CR Trade AR (services)
            debit: 0,
            credit: servicesPaid,
            description: `Settle AR - Invoice ${invoice.invoiceNumber}`,
            clientId: invoice.clientId,
          });
        }
        if (reimbPaid > 0) {
          lineItems.push({
            accountCode: "1-1010", // DR Cash (reimburse advance returned)
            debit: reimbPaid,
            credit: 0,
            description: `Reimburse repaid - Invoice ${invoice.invoiceNumber}`,
            clientId: invoice.clientId,
          });
          lineItems.push({
            accountCode: "1-2040", // CR Piutang Lain-lain (reimburse)
            debit: 0,
            credit: reimbPaid,
            description: `Settle reimbursable - Invoice ${invoice.invoiceNumber}`,
            clientId: invoice.clientId,
          });
        }
        const journalEntry = await this.journalService.createJournalEntry({
          description: `Payment received - Invoice ${invoice.invoiceNumber}`,
          entryDate: paymentData?.paymentDate
            ? new Date(paymentData.paymentDate)
            : new Date(),
          transactionId: invoice.invoiceNumber,
          transactionType: "PAYMENT_RECEIVED",
          createdBy: userId || "system",
          autoPost: true,
          lineItems,
        });

        // Update invoice with payment journal entry ID
        await this.prisma.invoice.update({
          where: { id },
          data: { paymentJournalId: journalEntry.id },
        });

        // Settle the project's reimbursables that this payment cleared.
        await this.markProjectReimbursablesPaid(
          invoice.projectId,
          reimbPaid,
          journalEntry.id,
        );

        this.logger.log(
          `✅ markAsPaid: ${invoice.invoiceNumber} paid ${amountToPay} ` +
          `(services ${servicesPaid} → AR, reimburse ${reimbPaid} → clear 1-2040)`,
        );
      } catch (error) {
        this.logger.error(
          "Failed to create payment journal entry for invoice:",
          error,
        );
        throw new BadRequestException(
          "Gagal membuat jurnal entry untuk pembayaran.",
        );
      }
    } else {
      // Invoice was already fully covered by confirmed payments — no additional
      // journal or Payment record needed.  Just ensure the status is PAID
      // (already set by the atomic claim above) and log for auditability.
      this.logger.log(
        `✅ markAsPaid: invoice ${invoice.invoiceNumber} already fully covered ` +
        `by existing CONFIRMED payments (alreadyPaid=${alreadyPaid}, totalAmount=${Number(invoice.totalAmount)}) — skipping duplicate journal/payment`,
      );
    }

    // Reverse ECL provision if exists (PSAK 71)
    try {
      const activeProvisions =
        await this.prisma.allowanceForDoubtfulAccounts.findMany({
          where: {
            invoiceId: id,
            provisionStatus: "ACTIVE",
          },
        });

      for (const provision of activeProvisions) {
        // Update provision status to REVERSED
        await this.prisma.allowanceForDoubtfulAccounts.update({
          where: { id: provision.id },
          data: {
            provisionStatus: "REVERSED",
          },
        });

        // Create and post ECL reversal journal entry
        const reversalEntry = await this.journalService.createECLReversalEntry(
          provision.id,
          invoice.invoiceNumber,
          invoice.clientId,
          Number(provision.eclAmount),
          userId || "system",
        );

        await this.journalService.postJournalEntry(
          reversalEntry.id,
          userId || "system",
        );

        this.logger.log(
          `ECL provision reversed for invoice ${invoice.invoiceNumber}: ${Number(provision.eclAmount)} IDR`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to reverse ECL provision for invoice:", error);
      // Continue even if ECL reversal fails
    }

    // Re-read final state (status already set by the atomic claim above)
    const updatedInvoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
      },
    });

    // Create payment record if payment data is provided AND there is a remaining
    // amount to record (FIX 1: don't create a duplicate Payment when the invoice
    // was already fully covered by prior CONFIRMED payments).
    if (paymentData && amountToPay > 0) {
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: id,
          amount: amountToPay,
          paymentMethod:
            (paymentData.paymentMethod as PaymentMethod) ||
            PaymentMethod.BANK_TRANSFER,
          paymentDate: paymentData.paymentDate
            ? new Date(paymentData.paymentDate)
            : new Date(),
          bankDetails: paymentData.notes, // Use bankDetails field for notes
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // Detect and handle advance payment (PSAK 72)
      await this.handleAdvancePaymentDetection(
        id,
        payment.paymentDate,
        Number(payment.amount),
        userId || "system",
      );
    }

    // ✅ FIX: Recalculate project's totalPaidAmount after marking invoice as paid
    // This ensures the project's "Dibayar" (paid amount) is updated in real-time
    if (invoice.projectId) {
      try {
        await this.profitCalculationService.calculateProjectProfitMargin(
          invoice.projectId,
          userId || "system",
        );
        this.logger.log(
          `✅ Recalculated profit metrics for project ${invoice.projectId} after invoice payment`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to recalculate project profit metrics: ${error}`,
        );
        // Don't fail the payment - just log the error
      }
    }

    return updatedInvoice;
  }

  /**
   * Process advance payment detection for external payment confirmation
   * Public method that can be called from PaymentsService
   */
  async processAdvancePaymentForInvoice(
    invoiceId: string,
    paymentDate: Date,
    paymentAmount: number,
    userId: string,
  ): Promise<void> {
    await this.handleAdvancePaymentDetection(
      invoiceId,
      paymentDate,
      paymentAmount,
      userId,
    );
  }

  /**
   * Detect advance payment and create deferred revenue entry (PSAK 72)
   */
  private async handleAdvancePaymentDetection(
    invoiceId: string,
    paymentDate: Date,
    paymentAmount: number,
    userId: string,
  ): Promise<void> {
    try {
      // Check if this is an advance payment
      const isAdvancePayment =
        await this.revenueRecognitionService.detectAdvancePayment(invoiceId);

      if (!isAdvancePayment) {
        this.logger.log(
          `Invoice ${invoiceId}: Not an advance payment - project completed or in final stages`,
        );
        return;
      }

      // Check if deferred revenue already exists for this invoice
      const existingDeferred = await this.prisma.deferredRevenue.findFirst({
        where: {
          invoiceId,
          status: { in: ["DEFERRED", "PARTIALLY_RECOGNIZED"] },
        },
      });

      if (existingDeferred) {
        this.logger.log(
          `Invoice ${invoiceId}: Deferred revenue already exists`,
        );
        return;
      }

      // Get invoice and project details for recognition date calculation
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          project: true,
          client: true,
        },
      });

      if (!invoice) {
        return;
      }

      // Calculate revenue recognition date based on project end date or 30 days from payment
      let recognitionDate = new Date(paymentDate);
      if (invoice.project.endDate) {
        recognitionDate = new Date(invoice.project.endDate);
      } else {
        // Default to 30 days from payment if no project end date
        recognitionDate.setDate(recognitionDate.getDate() + 30);
      }

      // Create deferred revenue entry with automatic journal entries
      const deferredRevenue =
        await this.revenueRecognitionService.createDeferredRevenue({
          invoiceId,
          paymentDate,
          totalAmount: paymentAmount,
          recognitionDate,
          performanceObligation:
            invoice.scopeOfWork ||
            `Service delivery for ${invoice.project.description}`,
          userId,
        });

      this.logger.log(
        `✅ PSAK 72: Deferred revenue created for Invoice ${invoice.invoiceNumber}`,
        `\n   Amount: Rp ${paymentAmount.toLocaleString("id-ID")}`,
        `\n   Recognition Date: ${recognitionDate.toISOString().split("T")[0]}`,
        `\n   Performance Obligation: ${deferredRevenue.performanceObligation}`,
      );

      // Track business journey event
      await this.trackBusinessJourneyEvent(
        "PAYMENT_RECEIVED",
        {
          invoiceId,
          paymentAmount,
          deferredRevenue: true,
          recognitionDate,
          performanceObligation: deferredRevenue.performanceObligation,
        },
        userId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle advance payment detection for invoice ${invoiceId}:`,
        error,
      );
      // Don't fail the payment process if advance payment detection fails
    }
  }

  async bulkUpdateStatus(ids: string[], status: InvoiceStatus): Promise<any> {
    // Validate all invoices first
    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    if (invoices.length !== ids.length) {
      throw new BadRequestException("Beberapa invoice tidak ditemukan");
    }

    // Validate all status transitions
    for (const invoice of invoices) {
      this.validateStatusTransition(invoice.status, status);
    }

    // Update all invoices
    return this.prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  private validateStatusTransition(
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
  ) {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
      [InvoiceStatus.SENT]: [
        InvoiceStatus.PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      [InvoiceStatus.PAID]: [], // Paid invoices cannot be changed
      [InvoiceStatus.CANCELLED]: [], // Cancelled invoices cannot be changed
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}. Transisi yang diizinkan: ${allowedTransitions.join(", ")}`,
      );
    }
  }

  async updateMateraiStatus(id: string, materaiApplied: boolean): Promise<any> {
    const invoice = await this.findOne(id);

    if (!invoice.materaiRequired) {
      throw new BadRequestException("Invoice ini tidak memerlukan materai");
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { materaiApplied },
      include: {
        client: true,
        project: true,
      },
    });
  }

  async remove(id: string, userId?: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { paymentMilestone: true },
      // Also select journal entry fields for GL reversal
    });

    if (!invoice) {
      throw new NotFoundException("Invoice tidak ditemukan");
    }

    // FIX: Reverse posted journal entries BEFORE deleting the invoice so the
    // General Ledger does not stay permanently overstated (AR / Revenue).
    const reversalUserId = userId || 'system';
    const journalIdsToReverse: string[] = [];
    if (invoice.journalEntryId) {
      journalIdsToReverse.push(invoice.journalEntryId);
    }
    if (invoice.paymentJournalId) {
      journalIdsToReverse.push(invoice.paymentJournalId);
    }

    for (const journalId of journalIdsToReverse) {
      try {
        const journalEntry = await this.prisma.journalEntry.findUnique({
          where: { id: journalId },
          select: { id: true, isPosted: true, isReversing: true, entryNumber: true },
        });

        if (!journalEntry) {
          this.logger.warn(
            `Journal entry ${journalId} not found during invoice ${id} deletion — skipping reversal`,
          );
          continue;
        }

        if (!journalEntry.isPosted) {
          this.logger.warn(
            `Journal entry ${journalEntry.entryNumber} is not posted — skipping reversal`,
          );
          continue;
        }

        // Check if already reversed
        const existingReversal = await this.prisma.journalEntry.findFirst({
          where: { reversedEntryId: journalId },
          select: { id: true },
        });

        if (existingReversal) {
          this.logger.warn(
            `Journal entry ${journalEntry.entryNumber} already reversed — skipping`,
          );
          continue;
        }

        await this.journalService.reverseJournalEntry(journalId, reversalUserId);
        this.logger.log(
          `✅ Reversed journal entry ${journalEntry.entryNumber} for deleted invoice ${invoice.invoiceNumber}`,
        );
      } catch (error) {
        // Log but do not block deletion — reversal failure should be visible in logs
        this.logger.error(
          `Failed to reverse journal entry ${journalId} for invoice ${id}:`,
          error,
        );
      }
    }

    // CRITICAL: Delete document files from filesystem BEFORE database deletion
    await this.documentsService.deleteDocumentsByInvoice(id);

    // Business Rule #3: Reset milestone status when invoice is deleted
    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (prisma) => {
      // Cascade delete: Delete all related payments first
      await prisma.payment.deleteMany({
        where: { invoiceId: id },
      });

      // Delete the invoice (CASCADE will delete Document DB records)
      const deletedInvoice = await prisma.invoice.delete({
        where: { id },
      });

      // If invoice was linked to milestone, reset milestone status
      if (invoice.paymentMilestoneId) {
        await prisma.paymentMilestone.update({
          where: { id: invoice.paymentMilestoneId },
          data: { isInvoiced: false },
        });

        this.logger.log(
          `✅ Milestone ${invoice.paymentMilestone?.milestoneNumber} reset to un-invoiced after deleting invoice ${invoice.invoiceNumber}`,
        );
      }

      return deletedInvoice;
    });
  }

  async generateInvoiceNumber(): Promise<string> {
    // Use thread-safe atomic counter service
    return await this.invoiceCounterService.getNextInvoiceNumber();
  }

  async getRecentInvoices(limit = 5): Promise<any[]> {
    return this.prisma.invoice.findMany({
      take: limit,
      include: {
        client: true,
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getInvoiceStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalRevenue: number;
    overdueCount: number;
  }> {
    const [total, byStatus, totalRevenue, overdueCount] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: InvoiceStatus.PAID,
        },
        _sum: {
          totalAmount: true,
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: InvoiceStatus.OVERDUE,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byStatus: statusCounts,
      totalRevenue: totalRevenue._sum.totalAmount
        ? Number(totalRevenue._sum.totalAmount)
        : 0,
      overdueCount,
    };
  }

  async getOverdueInvoices(): Promise<any[]> {
    return this.prisma.invoice.findMany({
      where: {
        OR: [
          {
            status: InvoiceStatus.OVERDUE,
          },
          {
            AND: [
              { status: InvoiceStatus.SENT },
              { dueDate: { lt: new Date() } },
            ],
          },
        ],
      },
      include: {
        client: true,
        project: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });
  }

  async inheritPriceFromQuotation(
    quotationId: string,
    customPrice?: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      select: {
        totalAmount: true,
        amountPerProject: true,
        id: true,
        project: {
          select: {
            basePrice: true,
            estimatedBudget: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException("Quotation tidak ditemukan");
    }

    // If custom price is provided, use it
    if (customPrice !== undefined && customPrice !== null) {
      return customPrice;
    }

    // If quotation has total amount, use it
    if (quotation.totalAmount !== null) {
      return quotation.totalAmount;
    }

    // Fallback to quotation amount per project
    if (quotation.amountPerProject !== null) {
      return quotation.amountPerProject;
    }

    // Fallback to project base price
    if (quotation.project?.basePrice !== null) {
      return quotation.project.basePrice;
    }

    // Final fallback to project estimated budget
    if (quotation.project?.estimatedBudget !== null) {
      return quotation.project.estimatedBudget;
    }

    // If no price information available, return 0
    return new Prisma.Decimal(0);
  }

  // Removed old sanitizeInput method - now using comprehensive sanitization utility

  /**
   * Server-side tax/discount recompute from priceBreakdown.products.
   *
   * Expected product line shape:
   *   { name, quantity, price, isTaxable?: boolean }
   *
   * Tax logic:
   *   - If a line has `isTaxable` field, we respect it (per-line taxability).
   *   - If no line has `isTaxable`, we fall back to the top-level `includeTax`
   *     flag on the DTO: when true, PPN 11% is applied to the entire subtotal.
   *
   * Returns null when priceBreakdown is absent or has no valid product lines
   * (caller skips recompute in that case).
   *
   * Limitation: when `isTaxable` is absent from all lines and `includeTax` is
   * true, PPN is applied to the full subtotal (no per-line granularity).
   */
  private recomputeTotals(
    dto: CreateInvoiceDto,
  ): { subtotal: number; taxAmount: number; totalAmount: number } | null {
    const pb = dto.priceBreakdown as any;
    if (!pb || !Array.isArray(pb.products) || pb.products.length === 0) {
      return null;
    }

    const taxRate = typeof dto.taxRate === "number" ? dto.taxRate : 11; // PPN default 11%
    const taxMultiplier = taxRate / 100;

    let subtotal = 0;
    let taxableSubtotal = 0;
    let hasPerLineTaxFlag = false;

    for (const line of pb.products) {
      const qty = Number(line.quantity ?? 1);
      const price = Number(line.price ?? 0);
      if (!isFinite(qty) || !isFinite(price)) continue;

      const lineTotal = Math.round(qty * price);
      subtotal += lineTotal;

      if (typeof line.isTaxable === "boolean") {
        hasPerLineTaxFlag = true;
        if (line.isTaxable) {
          taxableSubtotal += lineTotal;
        }
      }
    }

    if (subtotal === 0) return null;

    // If no line carried isTaxable, fall back to top-level includeTax flag.
    if (!hasPerLineTaxFlag) {
      taxableSubtotal = dto.includeTax ? subtotal : 0;
    }

    const taxAmount = Math.round(taxableSubtotal * taxMultiplier);

    // Apply discount if present in priceBreakdown.discountAmount or top-level DTO.
    const discountAmount =
      Math.round(Number(pb.discountAmount ?? 0)) ||
      Math.round(Number((dto as any).discountAmount ?? 0));

    // Materai: do NOT add to server total — it is tracked separately.
    const totalAmount = subtotal + taxAmount - discountAmount;

    if (totalAmount <= 0) return null;

    // Assert: if the client sent a totalAmount that differs by more than 1 IDR,
    // log a warning (we overwrite with the server value rather than rejecting,
    // so existing integrations that round differently still work).
    const clientTotal = Number(dto.totalAmount ?? 0);
    if (Math.abs(clientTotal - totalAmount) > 1) {
      this.logger.warn(
        `recomputeTotals: client total ${clientTotal} differs from server-computed ${totalAmount} ` +
          `(subtotal=${subtotal}, tax=${taxAmount}, discount=${discountAmount}) — overwriting with server value`,
      );
    }

    return { subtotal, taxAmount, totalAmount };
  }

  private async validateBusinessRules(dto: CreateInvoiceDto) {
    // Check due date is in future (use WIB day boundary, not UTC midnight)
    const dueDate = new Date(dto.dueDate);
    const today = wibStartOfDay(new Date());

    if (dueDate <= today) {
      throw new BadRequestException("Tanggal jatuh tempo harus di masa depan");
    }

    // Check amount is reasonable
    if (dto.totalAmount < 1000) {
      throw new BadRequestException("Jumlah invoice minimal Rp 1.000");
    }

    if (dto.totalAmount > 1000000000) {
      throw new BadRequestException("Jumlah invoice melebihi batas maksimal");
    }

    // Business Rule #1: Milestone Invoice Sequence Warning
    if (dto.paymentMilestoneId) {
      await this.checkMilestoneSequence(dto.paymentMilestoneId);
    }
  }

  /**
   * Business Rule #1: Milestone Invoice Sequence Warning
   * Warns (but doesn't block) when invoicing out of sequence
   */
  private async checkMilestoneSequence(milestoneId: string): Promise<void> {
    const milestone = await this.prisma.paymentMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        quotation: {
          include: {
            paymentMilestones: {
              orderBy: { milestoneNumber: "asc" },
            },
          },
        },
      },
    });

    if (!milestone) {
      return; // Already validated earlier
    }

    const prevMilestones = milestone.quotation.paymentMilestones.filter(
      (m) => m.milestoneNumber < milestone.milestoneNumber,
    );

    const unInvoicedPrev = prevMilestones.filter((m) => !m.isInvoiced);

    if (unInvoicedPrev.length > 0) {
      // Log warning but don't block
      this.logger.warn(
        `⚠️ Milestone ${milestone.milestoneNumber} invoiced out of sequence. ` +
          `Previous milestone(s) ${unInvoicedPrev.map((m) => m.milestoneNumber).join(", ")} not invoiced.`,
        { quotationId: milestone.quotationId, milestoneId },
      );

      // Track business journey event for analytics
      try {
        await this.trackBusinessJourneyEvent(
          "MILESTONE_OUT_OF_SEQUENCE" as BusinessJourneyEventType,
          {
            milestoneId,
            milestoneNumber: milestone.milestoneNumber,
            unInvoicedPrev: unInvoicedPrev.map((m) => m.milestoneNumber),
            quotationId: milestone.quotationId,
          },
          "system",
        );
      } catch (error) {
        // Don't fail if event tracking fails
        this.logger.error("Failed to track out-of-sequence event:", error);
      }
    }
  }

  // Enhanced automation methods for workflow efficiency

  private async getCompanySettings(): Promise<any> {
    try {
      const settings = await this.prisma.companySettings.findFirst({
        where: { id: "default" },
      });

      return (
        settings || {
          bank1Name: null,
          bank1Number: null,
          bank2Name: null,
          bank2Number: null,
          bank3Name: null,
          bank3Number: null,
          bankAccountName: null,
          companyName: "PT Teknologi Indonesia",
        }
      );
    } catch (error) {
      // Return default settings if not found
      return {
        bank1Name: null,
        bank1Number: null,
        bank2Name: null,
        bank2Number: null,
        bank3Name: null,
        bank3Number: null,
        bankAccountName: null,
        companyName: "PT Teknologi Indonesia",
      };
    }
  }

  private async calculateSmartDueDate(client: any): Promise<Date> {
    // Get client's payment terms if available
    const paymentTerms = client?.paymentTerms || "NET 30";

    let daysToAdd = 30; // Default

    // Parse payment terms (e.g., "NET 15", "NET 30", "COD")
    if (paymentTerms.includes("NET")) {
      const match = paymentTerms.match(/NET\s*(\d+)/i);
      if (match) {
        daysToAdd = parseInt(match[1]);
      }
    } else if (paymentTerms.includes("COD") || paymentTerms.includes("CASH")) {
      daysToAdd = 1; // Cash on delivery
    }

    // Add business days only (Indonesian business practice).
    // Anchor to WIB start-of-day so the calculation is timezone-stable.
    const dueDate = wibStartOfDay(new Date());
    let addedDays = 0;

    while (addedDays < daysToAdd) {
      dueDate.setDate(dueDate.getDate() + 1);

      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = dueDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }

    return dueDate;
  }

  private generateSmartPaymentInfo(companySettings: any): string {
    const paymentMethods = [];
    const accountName =
      companySettings.bankAccountName || companySettings.companyName;

    // Use real bank1/bank2/bank3 fields from CompanySettings schema
    for (const n of [1, 2, 3] as const) {
      const name: string | null = companySettings[`bank${n}Name`];
      const number: string | null = companySettings[`bank${n}Number`];
      if (name && number) {
        paymentMethods.push(`${name}: ${number} a.n. ${accountName}`);
      }
    }

    paymentMethods.push("");
    paymentMethods.push(
      "Pembayaran dapat dilakukan melalui transfer bank atau tunai.",
    );
    paymentMethods.push(
      "Konfirmasi pembayaran dapat dikirim melalui WhatsApp atau email.",
    );

    return paymentMethods.join("\n");
  }

  private enhanceTermsForInvoice(originalTerms: string, client: any): string {
    let terms = originalTerms || "";

    // Add standard Indonesian invoice terms if not present
    const standardTerms = [
      "Pembayaran paling lambat pada tanggal jatuh tempo.",
      "Keterlambatan pembayaran dikenakan denda 2% per bulan.",
      "Barang yang telah dibeli tidak dapat dikembalikan.",
      "Harga sudah termasuk PPN 11%.",
    ];

    // Add terms that aren't already included
    standardTerms.forEach((term) => {
      if (!terms.includes(term)) {
        terms += terms ? "\n" + term : term;
      }
    });

    // Add client-specific terms if available
    if (client?.paymentTerms && !terms.includes(client.paymentTerms)) {
      terms += `\nSyarat Pembayaran: ${client.paymentTerms}`;
    }

    return terms;
  }

  private calculateMateraiRequirement(totalAmount: number): boolean {
    // Indonesian law: Materai required for documents >= 5 million IDR (UU No. 10 Tahun 2020)
    return totalAmount >= 5000000;
  }

  private async trackBusinessJourneyEvent(
    eventType: BusinessJourneyEventType,
    metadata: any,
    userId: string,
  ): Promise<void> {
    try {
      const event = await this.prisma.businessJourneyEvent.create({
        data: {
          type: eventType,
          title: this.getEventTitle(eventType),
          description: this.getEventDescription(eventType, metadata),
          status: "COMPLETED",
          amount: metadata.totalAmount || null,
          clientId: metadata.clientId || null,
          projectId: metadata.projectId || null,
          quotationId: metadata.quotationId || null,
          invoiceId: metadata.invoiceId || null,
          createdBy: userId,
        },
      });

      // Create metadata separately
      await this.prisma.businessJourneyEventMetadata.create({
        data: {
          eventId: event.id,
          userCreated: userId,
          source: "SYSTEM",
          priority: "MEDIUM",
          tags: ["automation", "invoice_generation"],
          relatedDocuments: [],
          materaiRequired: metadata.materaiRequired || false,
          materaiAmount: metadata.materaiRequired ? 10000 : null,
          complianceStatus: "COMPLIANT",
        },
      });
    } catch (error) {
      this.logger.error("Failed to track business journey event:", error);
      // Don't fail the main process if tracking fails
    }
  }

  private getEventTitle(eventType: BusinessJourneyEventType): string {
    const titles: Partial<Record<BusinessJourneyEventType, string>> = {
      INVOICE_GENERATED: "Invoice Dibuat Otomatis",
      QUOTATION_APPROVED: "Quotation Disetujui",
      PAYMENT_RECEIVED: "Pembayaran Diterima",
    };
    return titles[eventType] || eventType;
  }

  private getEventDescription(
    eventType: BusinessJourneyEventType,
    metadata: any,
  ): string {
    switch (eventType) {
      case "INVOICE_GENERATED":
        return `Invoice otomatis dibuat dari quotation ${metadata.quotationId}. Total: ${this.formatCurrency(metadata.totalAmount)}. ${metadata.materaiRequired ? "Materai diperlukan." : ""}`;
      default:
        return `Business journey event: ${eventType}`;
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Batch operations for bulk updates
  async bulkUpdateInvoiceStatus(
    invoiceIds: string[],
    newStatus: InvoiceStatus,
    userId: string,
  ): Promise<{ updated: number; failed: string[] }> {
    // PAID and OVERDUE transitions require GL journal entries that are only
    // posted by markAsPaid / the overdue cron. Allowing a raw bulk updateMany
    // to these states would leave Cash and AR unrecorded — block them here.
    if (
      newStatus === InvoiceStatus.PAID ||
      newStatus === InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException(
        `Bulk status update to "${newStatus}" is not allowed because it bypasses required GL journal entries. ` +
          `To mark invoices as PAID use the individual mark-as-paid endpoint. ` +
          `OVERDUE status is managed automatically by the nightly cron job.`,
      );
    }

    try {
      const results = { updated: 0, failed: [] as string[] };

      // Map newStatus to the corresponding business-journey event name.
      // Only emit an event for status values that have a meaningful journey step.
      // Only SENT has a meaningful business-journey event; other bulk
      // transitions (e.g. CANCELLED) emit none.
      const statusEventMap: Partial<
        Record<InvoiceStatus, BusinessJourneyEventType>
      > = {
        [InvoiceStatus.SENT]: "INVOICE_SENT",
      };
      const journeyEvent = statusEventMap[newStatus] ?? null;

      // Process in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < invoiceIds.length; i += batchSize) {
        const batch = invoiceIds.slice(i, i + batchSize);

        try {
          // Get invoices to validate transitions
          const invoices = await this.prisma.invoice.findMany({
            where: { id: { in: batch } },
            select: { id: true, status: true, invoiceNumber: true },
          });

          // Validate each status transition
          const validInvoices = [];
          for (const invoice of invoices) {
            try {
              this.validateStatusTransition(invoice.status, newStatus);
              validInvoices.push(invoice.id);
            } catch (error) {
              results.failed.push(
                `${invoice.invoiceNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            }
          }

          // Update valid invoices
          if (validInvoices.length > 0) {
            // CANCELLED must auto-correct the GL per invoice (reverse its SENT /
            // payment / reimburse journals), so it can't go through a raw bulk
            // updateMany. Process each, then flip status.
            if (newStatus === InvoiceStatus.CANCELLED) {
              for (const invId of validInvoices) {
                const inv = await this.prisma.invoice.findUnique({
                  where: { id: invId },
                  select: { id: true, invoiceNumber: true, journalEntryId: true, paymentJournalId: true, projectId: true, paymentMilestoneId: true },
                });
                if (inv) {
                  await this.reverseInvoiceJournalsAndReimbursables(inv, userId || "system");
                }
              }
            }
            const updateResult = await this.prisma.invoice.updateMany({
              where: { id: { in: validInvoices } },
              data: {
                status: newStatus,
                updatedAt: new Date(),
              },
            });

            results.updated += updateResult.count;

            // Only emit a business-journey event when there is a meaningful
            // event type mapped for this status transition.
            if (journeyEvent) {
              for (const invoiceId of validInvoices) {
                await this.trackBusinessJourneyEvent(
                  journeyEvent,
                  { invoiceId, newStatus, bulkOperation: true },
                  userId,
                );
              }
            }
          }
        } catch (error) {
          // Add all batch items to failed if batch operation fails
          batch.forEach((id) => {
            results.failed.push(`${id}: Batch operation failed`);
          });
        }
      }

      return results;
    } catch (error) {
      handleServiceError(error, "bulk update invoice status", "invoice");
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: 'Asia/Jakarta' })
  async markOverdueInvoices(): Promise<void> {
    try {
      const result = await this.prisma.invoice.updateMany({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: { lt: new Date() },
        },
        data: { status: InvoiceStatus.OVERDUE },
      });
      this.logger.log(
        `Overdue cron: marked ${result.count} invoice(s) as OVERDUE`,
      );
    } catch (error) {
      this.logger.error("Overdue cron failed", error);
    }
  }
}
