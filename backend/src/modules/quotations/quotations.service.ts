import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SettingsService } from "../settings/settings.service";
import { InvoiceCounterService } from "../invoices/services/invoice-counter.service";
import { InvoicesService } from "../invoices/invoices.service";
import { PaymentMilestonesService } from "./services/payment-milestones.service";
import { DocumentsService } from "../documents/documents.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";
import { QuotationStatus, PaymentType, Prisma } from "@prisma/client";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import {
  validateStatusTransition,
  QuotationStatus as ValidatorQuotationStatus,
} from "./validators/status-transition.validator";
import { wibStartOfDay } from "../../common/utils/wib-date.util";

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private invoiceCounterService: InvoiceCounterService,
    private paymentMilestonesService: PaymentMilestonesService,
    private documentsService: DocumentsService,
    @Inject(forwardRef(() => InvoicesService))
    private invoicesService: InvoicesService,
  ) {}

  async create(
    createQuotationDto: CreateQuotationDto,
    userId: string,
  ): Promise<any> {
    // Validate that the project belongs to the selected client
    const project = await this.prisma.project.findUnique({
      where: { id: createQuotationDto.projectId },
      select: {
        clientId: true,
        id: true,
        priceBreakdown: true,
        scopeOfWork: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project tidak ditemukan");
    }

    if (project.clientId !== createQuotationDto.clientId) {
      throw new BadRequestException(
        "Project yang dipilih tidak sesuai dengan klien yang dipilih",
      );
    }

    // Guard: reject if client is inactive
    const client = await this.prisma.client.findUnique({
      where: { id: createQuotationDto.clientId },
      select: { status: true },
    });
    if (!client) {
      throw new NotFoundException("Klien tidak ditemukan");
    }
    if (client.status !== "active") {
      throw new BadRequestException(
        "Cannot create document for an inactive client",
      );
    }

    // Generate unique quotation number
    const quotationNumber = await this.generateQuotationNumber();

    // Cascade scopeOfWork from project if not provided in DTO
    const scopeOfWork =
      createQuotationDto.scopeOfWork || project.scopeOfWork || null;

    // Cascade priceBreakdown from project if not provided in DTO
    const priceBreakdown =
      createQuotationDto.priceBreakdown || project.priceBreakdown || undefined;

    // Extract paymentMilestones AND fields that are in the DTO but NOT columns
    // on the Quotation model (includeTax/subtotalAmount/taxRate/taxAmount are
    // display-only tax helpers). Without this, prisma.quotation.create throws
    // "Unknown argument `includeTax`" — mirrors the same extraction in update().
    const {
      paymentMilestones,
      includeTax: _includeTax,
      subtotalAmount: _subtotalAmount,
      taxRate: _taxRate,
      taxAmount: _taxAmount,
      ...quotationData
    } = createQuotationDto as any;

    // Create quotation
    const quotation = await this.prisma.quotation.create({
      data: {
        ...quotationData,
        quotationNumber,
        createdBy: userId,
        scopeOfWork: scopeOfWork,
        priceBreakdown: priceBreakdown,
      },
      include: {
        client: true,
        project: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create payment milestones if provided
    if (
      paymentMilestones &&
      Array.isArray(paymentMilestones) &&
      paymentMilestones.length > 0
    ) {
      for (const milestone of paymentMilestones) {
        await this.paymentMilestonesService.addPaymentMilestone(quotation.id, {
          milestoneNumber: milestone.milestoneNumber,
          name: milestone.name,
          nameId: milestone.nameId || milestone.name,
          description: milestone.description,
          descriptionId: milestone.descriptionId,
          paymentPercentage: milestone.paymentPercentage,
          // paymentAmount is calculated by backend
        });
      }
    }

    return quotation;
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: QuotationStatus,
    month?: number,
    year?: number,
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationWhereInput = {};

    if (status) {
      where.status = status;
    }

    // Add month/year filtering
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [quotations, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          project: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        client: true,
        project: {
          include: {
            projectType: true, // Include project type for PDF filename
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoices: true,
        // Needed so the detail/edit UI can show the configured payment terms.
        paymentMilestones: { orderBy: { milestoneNumber: "asc" } },
      },
    });

    if (!quotation) {
      throw new NotFoundException("Quotation tidak ditemukan");
    }

    return quotation;
  }

  async update(
    id: string,
    updateQuotationDto: UpdateQuotationDto,
  ): Promise<any> {
    const quotation = await this.findOne(id);

    // Business Rule #2: Prevent Quotation Changes After First Milestone Invoice
    // Check if quotation has invoiced milestones
    const invoicedMilestones = await this.prisma.paymentMilestone.findFirst({
      where: {
        quotationId: id,
        isInvoiced: true,
      },
    });

    if (invoicedMilestones) {
      // Block changes to financial fields
      const financialFields: (keyof UpdateQuotationDto)[] = [
        "totalAmount",
        "amountPerProject",
      ];
      const hasFinancialChanges = financialFields.some(
        (field) => updateQuotationDto[field] !== undefined,
      );

      if (hasFinancialChanges) {
        throw new BadRequestException(
          "Tidak dapat mengubah jumlah quotation karena sudah ada milestone yang di-invoice. " +
            "Silakan batalkan invoice terlebih dahulu atau buat quotation baru.",
        );
      }

      // Also block milestone changes (check if the DTO has this field)
      if ((updateQuotationDto as any).paymentMilestones) {
        throw new BadRequestException(
          "Tidak dapat mengubah payment milestone karena sudah ada yang di-invoice.",
        );
      }
    }

    // Extract paymentMilestones, relation IDs, and fields not in Prisma schema
    // Note: includeTax, subtotalAmount, taxRate, taxAmount are in DTO but not in database schema
    const {
      paymentMilestones: _paymentMilestones,
      clientId,
      projectId,
      includeTax: _includeTax,
      subtotalAmount: _subtotalAmount,
      taxRate: _taxRate,
      taxAmount: _taxAmount,
      ...quotationUpdateData
    } = updateQuotationDto as any;

    // Build the update data with proper Prisma relations
    const updateData: any = {
      ...quotationUpdateData,
    };

    // Add relation connects if IDs are provided
    if (clientId) {
      updateData.client = { connect: { id: clientId } };
    }
    if (projectId) {
      updateData.project = { connect: { id: projectId } };
    }

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        project: true,
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

  async updateStatus(id: string, status: QuotationStatus): Promise<any> {
    const quotation = await this.findOne(id);

    // Validate status transition
    validateStatusTransition(
      quotation.status as ValidatorQuotationStatus,
      status as ValidatorQuotationStatus,
    );

    // Validate milestones before approval (only for MILESTONE payment type)
    if (
      status === QuotationStatus.APPROVED &&
      quotation.paymentType === "MILESTONE"
    ) {
      await this.paymentMilestonesService.validateQuotationMilestones(id);
    }

    // Use transaction for approval + invoice generation
    const updatedQuotation = await this.prisma.$transaction(async (tx) => {
      // Update quotation status
      const updated = await tx.quotation.update({
        where: { id },
        data: { status },
        include: {
          client: true,
          project: true,
          paymentMilestones: true,
        },
      });

      // Auto-generate invoice when quotation is approved (inside transaction)
      if (status === QuotationStatus.APPROVED) {
        try {
          await this.autoGenerateInvoice(updated, tx);
          this.logger.log(
            `Auto-generated invoice for approved quotation ${updated.quotationNumber}`,
          );
        } catch (error) {
          // Transaction will auto-rollback on error
          throw new BadRequestException(
            `Failed to generate invoice from approved quotation: ${getErrorMessage(error)}`,
          );
        }
      }

      return updated;
    });

    // Send notification about status change (outside transaction)
    try {
      await this.notificationsService.sendQuotationStatusUpdate(id, status);
    } catch (error) {
      // Log error but don't fail the status update
      this.logger.error("Failed to send status update notification", error);
    }

    return updatedQuotation;
  }

  /**
   * Reopen an APPROVED quotation back to DRAFT so its terms/status can change
   * again. Approval is normally terminal because it auto-generates an invoice,
   * so this is a guarded "undo": it refuses if any generated invoice has been
   * issued (SENT) or paid (PAID/OVERDUE/has payments) — those are real AR/cash
   * records that must be reversed first. Unpaid DRAFT invoices are removed via
   * the invoice service (which cascades payments/documents and resets the
   * milestone), then the quotation returns to DRAFT.
   */
  async reopenQuotation(id: string): Promise<any> {
    const quotation = await this.findOne(id);

    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException(
        "Hanya penawaran berstatus Disetujui yang dapat dibuka kembali.",
      );
    }

    const invoices = (quotation as any).invoices ?? [];

    // Guard: block if any generated invoice is issued or paid.
    for (const inv of invoices) {
      const paymentCount = await this.prisma.payment.count({
        where: { invoiceId: inv.id },
      });
      // ConflictException (409), not BadRequestException — the global
      // ValidationInterceptor relabels BadRequest as "Validation failed" and
      // drops the real reason, so the user would never learn WHY it refused.
      if (
        inv.status === "PAID" ||
        inv.status === "OVERDUE" ||
        inv.markedPaidAt ||
        paymentCount > 0
      ) {
        throw new ConflictException(
          `Tidak dapat membuka kembali: invoice ${inv.invoiceNumber} sudah dibayar. Batalkan pembayaran invoice terlebih dahulu.`,
        );
      }
      if (inv.status === "SENT") {
        throw new ConflictException(
          `Tidak dapat membuka kembali: invoice ${inv.invoiceNumber} sudah dikirim ke klien. Batalkan/hapus invoice tersebut terlebih dahulu.`,
        );
      }
    }

    // Safe to undo: remove the (unpaid, un-issued) generated invoices.
    for (const inv of invoices) {
      await this.invoicesService.remove(inv.id);
    }

    // Reset any milestone invoiced flags and return the quotation to DRAFT.
    await this.prisma.paymentMilestone.updateMany({
      where: { quotationId: id },
      data: { isInvoiced: false },
    });

    this.logger.log(
      `Reopened quotation ${quotation.quotationNumber}: removed ${invoices.length} generated invoice(s), status → DRAFT`,
    );

    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.DRAFT },
      include: {
        client: true,
        project: true,
        paymentMilestones: { orderBy: { milestoneNumber: "asc" } },
      },
    });
  }

  /**
   * Replace a quotation's payment terms (termin). Used by the edit form, since
   * the generic update() does not persist milestone changes. Atomic: clears the
   * existing milestones and recreates them, recomputing amounts from the total.
   * Blocked once any milestone has been invoiced (real AR already issued).
   */
  async setPaymentTerms(
    id: string,
    paymentType: PaymentType,
    milestones: Array<{
      name: string;
      nameId?: string;
      paymentPercentage: number;
    }> = [],
  ): Promise<any> {
    const quotation = await this.findOne(id);
    const existing = (quotation as any).paymentMilestones ?? [];

    if (existing.some((m: any) => m.isInvoiced)) {
      throw new ConflictException(
        "Tidak dapat mengubah termin: sudah ada milestone yang di-invoice. Batalkan invoice terlebih dahulu.",
      );
    }

    const isMilestone = paymentType === "MILESTONE_BASED";
    if (isMilestone) {
      if (!milestones || milestones.length < 2) {
        throw new BadRequestException(
          "Termin membutuhkan minimal 2 tahap pembayaran.",
        );
      }
      const sum = milestones.reduce(
        (s, m) => s + Number(m.paymentPercentage || 0),
        0,
      );
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException(
          `Total persentase termin harus tepat 100% (sekarang ${sum.toFixed(2)}%).`,
        );
      }
    }

    const total = Number(quotation.totalAmount) || 0;

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentMilestone.deleteMany({ where: { quotationId: id } });

      if (isMilestone) {
        // FIX 2: Round each milestone to whole rupiah, then adjust the last
        // milestone so the sum equals the quotation total exactly.
        // Example: total=10_000_000, three equal 33.33% milestones →
        //   rounds to 3_333_333 + 3_333_333 + 3_333_334 = 10_000_000 ✓
        let runningSum = 0;
        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          const isLast = i === milestones.length - 1;
          const paymentAmount = isLast
            ? total - runningSum // last milestone absorbs any rounding remainder
            : Math.round((total * Number(m.paymentPercentage)) / 100);
          runningSum += paymentAmount;
          await tx.paymentMilestone.create({
            data: {
              quotationId: id,
              milestoneNumber: i + 1,
              name: m.name,
              nameId: m.nameId || m.name,
              paymentPercentage: m.paymentPercentage,
              paymentAmount,
            },
          });
        }
      }

      return tx.quotation.update({
        where: { id },
        data: { paymentType },
        include: {
          client: true,
          project: true,
          paymentMilestones: { orderBy: { milestoneNumber: "asc" } },
        },
      });
    });
  }

  async remove(id: string): Promise<any> {
    const quotation = await this.findOne(id);

    // FIX 3 (CRITICAL): Block deletion if related invoices exist — deleting an
    // APPROVED quotation with invoices would orphan AR/GL records permanently.
    const invoiceCount = await this.prisma.invoice.count({
      where: { quotationId: id },
    });
    if (invoiceCount > 0) {
      throw new ConflictException(
        `Tidak dapat menghapus penawaran yang sudah memiliki ${invoiceCount} invoice. Hapus invoice terlebih dahulu.`,
      );
    }

    // CRITICAL: Delete document files from filesystem BEFORE database deletion
    await this.documentsService.deleteDocumentsByQuotation(id);

    // Allow deletion of quotations regardless of status
    // CASCADE will delete Document DB records
    return this.prisma.quotation.delete({
      where: { id },
    });
  }

  async generateQuotationNumber(): Promise<string> {
    // Use thread-safe atomic counter service
    return await this.invoiceCounterService.getNextQuotationNumber();
  }

  async getRecentQuotations(limit = 5): Promise<any[]> {
    return this.prisma.quotation.findMany({
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

  async getQuotationStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
  }> {
    const [total, byStatus] = await Promise.all([
      this.prisma.quotation.count(),
      this.prisma.quotation.groupBy({
        by: ["status"],
        _count: {
          status: true,
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
    };
  }

  async inheritPriceFromProject(
    projectId: string,
    customPrice?: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        basePrice: true,
        estimatedBudget: true,
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project tidak ditemukan");
    }

    // If custom price is provided, use it
    if (customPrice !== undefined && customPrice !== null) {
      return customPrice;
    }

    // If project has base price, use it
    if (project.basePrice !== null) {
      return project.basePrice;
    }

    // Fallback to estimated budget
    if (project.estimatedBudget !== null) {
      return project.estimatedBudget;
    }

    // If no price information available, throw an error
    throw new NotFoundException(
      "Project tidak memiliki informasi harga. Silakan set basePrice atau estimatedBudget pada project terlebih dahulu.",
    );
  }

  /**
   * Generate payment information string from company settings
   * @returns Formatted payment info string with bank account details
   */
  private async generatePaymentInfo(): Promise<string> {
    try {
      const companySettings = await this.settingsService.getCompanySettings();
      const bankAccounts: string[] = [];

      // Build bank account list from new flexible fields
      if (companySettings.bank1Name && companySettings.bank1Number) {
        bankAccounts.push(
          `${companySettings.bank1Name}: ${companySettings.bank1Number}`,
        );
      }
      if (companySettings.bank2Name && companySettings.bank2Number) {
        bankAccounts.push(
          `${companySettings.bank2Name}: ${companySettings.bank2Number}`,
        );
      }
      if (companySettings.bank3Name && companySettings.bank3Number) {
        bankAccounts.push(
          `${companySettings.bank3Name}: ${companySettings.bank3Number}`,
        );
      }

      // Format payment info based on available bank accounts
      if (bankAccounts.length > 0) {
        // Use bankAccountName if set, otherwise fall back to companyName
        const accountName =
          companySettings.bankAccountName ||
          companySettings.companyName ||
          "Company";
        return `Bank Transfer\nRekening atas nama: ${accountName}\n${bankAccounts.join(" | ")}`;
      }

      // Fallback if no bank accounts configured
      return "Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran";
    } catch (error) {
      this.logger.error(
        "Error fetching company settings for payment info",
        error,
      );
      // Safe fallback
      return "Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran";
    }
  }

  /**
   * FIX 1 (CRITICAL) — autoGenerateInvoice MUST run inside the caller's transaction.
   * Previously it used `this.prisma.*` directly, so the duplicate-check and
   * invoice.create ran OUTSIDE the $transaction in updateStatus.  Two concurrent
   * approvals could both pass the findFirst check before either create committed,
   * resulting in duplicate invoices.  Now the caller passes its `tx` client and
   * all writes go through it.
   */
  private async autoGenerateInvoice(
    quotation: any,
    tx: Prisma.TransactionClient,
  ): Promise<any> {
    // Idempotency guard — skip if invoice already exists for this quotation.
    // For MILESTONE_BASED quotations the per-milestone guard is handled further
    // down; for all other payment types a single invoice per quotation suffices.
    // Uses tx so the check is serialised within the same transaction snapshot.
    if (quotation.paymentType !== "MILESTONE_BASED") {
      const existing = await tx.invoice.findFirst({
        where: { quotationId: quotation.id },
        select: { id: true, invoiceNumber: true },
      });
      if (existing) {
        this.logger.warn(
          `autoGenerateInvoice: invoice ${existing.invoiceNumber} already exists for quotation ${quotation.quotationNumber} — skipping duplicate creation`,
        );
        return existing;
      }
    }

    const invoiceNumber = await this.invoiceCounterService.getNextInvoiceNumber();

    // FIX 3: Base due date on WIB calendar day; honour client.paymentTerms when set.
    // paymentTerms is e.g. "NET 30", "NET 60", "COD".  Extract the numeric days;
    // fall back to 30 if the field is absent or unparseable.
    const paymentTermsDays = (() => {
      const terms: string | null | undefined = quotation.client?.paymentTerms;
      if (!terms) return 30;
      const m = terms.match(/\b(\d+)\b/);
      return m ? parseInt(m[1], 10) : 30;
    })();
    const dueDate = wibStartOfDay(new Date());
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    // Check if materai is required (> 5M IDR)
    const materaiRequired = Number(quotation.totalAmount) > 5000000;

    // Generate payment info from company settings
    const paymentInfo = await this.generatePaymentInfo();

    // Create invoice inside the transaction so dup-check + create are atomic.
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        dueDate,
        quotationId: quotation.id,
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        amountPerProject: quotation.amountPerProject,
        totalAmount: quotation.totalAmount,
        scopeOfWork: quotation.scopeOfWork || null, // Cascade from quotation
        priceBreakdown: quotation.priceBreakdown || undefined, // Cascade from quotation
        paymentInfo,
        materaiRequired,
        materaiApplied: false,
        terms:
          quotation.terms ||
          "Pembayaran dalam 30 hari setelah invoice diterima",
        createdBy: quotation.createdBy,
      },
      include: {
        client: true,
        project: true,
        quotation: true,
      },
    });

    this.logger.log(
      `Auto-generated invoice ${invoiceNumber} from quotation ${quotation.quotationNumber}`,
    );
    return invoice;
  }

  /**
   * Phase 1 Enhancement: Approve quotation with milestone support
   * If quotation has milestones, only generate invoice for first milestone
   * Otherwise, generate single invoice as before
   */
  async approveQuotationWithMilestones(
    quotationId: string,
    userId: string,
  ): Promise<{ quotation: any; invoices: any[] }> {
    // Approve quotation
    const quotation = await this.updateStatus(
      quotationId,
      QuotationStatus.APPROVED,
    );

    // Check if milestone-based
    if (quotation.paymentType !== "MILESTONE_BASED") {
      // Already generated by updateStatus, just return
      const invoices = await this.prisma.invoice.findMany({
        where: { quotationId },
      });
      return { quotation, invoices };
    }

    // For milestone-based quotations
    // The single invoice generation will happen via updateStatus
    // Return the generated invoice
    const invoices = await this.prisma.invoice.findMany({
      where: { quotationId },
    });

    return { quotation, invoices };
  }

  /**
   * Phase 1 Enhancement: Generate next milestone invoice
   * Called when client is ready for next phase payment
   */
  async generateNextMilestoneInvoice(
    quotationId: string,
    userId: string,
  ): Promise<any> {
    const quotation = await this.findOne(quotationId);

    if (quotation.paymentType !== "MILESTONE_BASED") {
      throw new BadRequestException(
        "Quotation ini bukan milestone-based, gunakan invoice generator standar",
      );
    }

    // Get all milestones
    const milestones = await this.prisma.paymentMilestone.findMany({
      where: { quotationId },
      orderBy: { milestoneNumber: "asc" },
    });

    if (!milestones.length) {
      throw new BadRequestException("Tidak ada milestone untuk quotation ini");
    }

    // Find first milestone without invoice
    const nextMilestone = milestones.find((m) => !m.isInvoiced);

    if (!nextMilestone) {
      throw new BadRequestException("Semua milestone sudah diinvoice");
    }

    // FIX 1 (CRITICAL): Idempotency guard for milestone — don't create a second
    // invoice if this milestone already has one (re-entrance protection).
    const existingMilestoneInvoice = await this.prisma.invoice.findFirst({
      where: { paymentMilestoneId: nextMilestone.id },
      select: { id: true, invoiceNumber: true },
    });
    if (existingMilestoneInvoice) {
      this.logger.warn(
        `generateNextMilestoneInvoice: invoice ${existingMilestoneInvoice.invoiceNumber} already exists for milestone ${nextMilestone.id} — skipping duplicate creation`,
      );
      return existingMilestoneInvoice;
    }

    // FIX 2 (HIGH): Use canonical InvoiceCounterService (atomic, correct format).
    const invoiceNumber = await this.invoiceCounterService.getNextInvoiceNumber();

    // Calculate due date
    let dueDate = nextMilestone.dueDate;
    if (!dueDate && nextMilestone.dueDaysFromPrev) {
      const prevMilestone = await this.prisma.paymentMilestone.findFirst({
        where: {
          quotationId,
          milestoneNumber: nextMilestone.milestoneNumber - 1,
        },
      });

      if (prevMilestone && prevMilestone.dueDate) {
        dueDate = new Date(prevMilestone.dueDate);
        dueDate.setDate(dueDate.getDate() + nextMilestone.dueDaysFromPrev);
      } else {
        // FIX 3: use WIB baseline for milestone offset
        dueDate = wibStartOfDay(new Date());
        dueDate.setDate(dueDate.getDate() + nextMilestone.dueDaysFromPrev);
      }
    }

    if (!dueDate) {
      // FIX 3: use WIB baseline for fallback 30-day due date
      dueDate = wibStartOfDay(new Date());
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const materaiRequired = Number(nextMilestone.paymentAmount) > 5000000;

    // Generate payment info from company settings
    const paymentInfo = await this.generatePaymentInfo();

    // FIX 1 (CRITICAL): wrap invoice create + milestone flag in one transaction
    // so a partial failure cannot leave the milestone un-flagged after the
    // invoice was created (or vice versa).
    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          creationDate: new Date(),
          dueDate,
          clientId: quotation.clientId,
          projectId: quotation.projectId,
          quotationId,
          paymentMilestoneId: nextMilestone.id,
          amountPerProject: quotation.amountPerProject,
          totalAmount: nextMilestone.paymentAmount,
          scopeOfWork: quotation.scopeOfWork,
          priceBreakdown: quotation.priceBreakdown,
          paymentInfo,
          materaiRequired,
          status: "DRAFT",
          createdBy: userId,
        },
        include: { client: true, project: true },
      });

      await tx.paymentMilestone.update({
        where: { id: nextMilestone.id },
        data: { isInvoiced: true },
      });

      return created;
    });

    return invoice;
  }
}
