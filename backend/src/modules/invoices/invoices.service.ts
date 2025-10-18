import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QuotationsService } from "../quotations/quotations.service";
import { NotificationsService } from "../notifications/notifications.service";
import { JournalService } from "../accounting/services/journal.service";
import { RevenueRecognitionService } from "../accounting/services/revenue-recognition.service";
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

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private quotationsService: QuotationsService,
    private notificationsService: NotificationsService,
    private journalService: JournalService,
    private revenueRecognitionService: RevenueRecognitionService,
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    userId: string,
  ): Promise<any> {
    // Validate client exists
    const client = await this.prisma.client.findUnique({
      where: { id: createInvoiceDto.clientId },
    });
    if (!client) {
      throw new NotFoundException(
        `Client dengan ID ${createInvoiceDto.clientId} tidak ditemukan`,
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

    // Validate business rules
    await this.validateBusinessRules(createInvoiceDto);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Auto-calculate materai
    const materaiRequired = createInvoiceDto.totalAmount > 5000000;

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

    // Sanitize input data
    const sanitizedData = {
      ...createInvoiceDto,
      paymentInfo: this.sanitizeInput(createInvoiceDto.paymentInfo),
      terms: createInvoiceDto.terms
        ? this.sanitizeInput(createInvoiceDto.terms)
        : null,
    };

    return this.prisma.$transaction(async (prisma) => {
      const invoice = await prisma.invoice.create({
        data: {
          ...sanitizedData,
          invoiceNumber,
          materaiRequired,
          materaiApplied: createInvoiceDto.materaiApplied || false,
          priceBreakdown: priceBreakdown,
          createdBy: userId,
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

      // Create audit log
      await prisma.auditLog
        .create({
          data: {
            action: "CREATE",
            entityType: "invoice",
            entityId: invoice.id,
            newValues: invoice as any,
            userId: userId,
          },
        })
        .catch(() => {
          // Audit log is optional, don't fail the transaction if audit table doesn't exist
        });

      return invoice;
    });
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

      // Check if invoice already exists for this quotation
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { quotationId },
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

      // Inherit and enhance terms
      const enhancedTerms = this.enhanceTermsForInvoice(
        quotation.terms,
        quotation.client,
      );

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
        terms: enhancedTerms,
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
        console.error("Failed to send invoice generation notification:", error);
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

  async findAll(
    page = 1,
    limit = 10,
    status?: InvoiceStatus,
  ): Promise<PaginatedResponse<any[]>> {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return new PaginatedResponse(
      invoices,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      "Invoices retrieved successfully",
    );
  }

  async findOne(id: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
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

    if (!invoice) {
      throw new NotFoundException("Invoice tidak ditemukan");
    }

    return invoice;
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto): Promise<any> {
    const invoice = await this.findOne(id);

    // Recalculate materai requirement if total amount changed
    const data = { ...updateInvoiceDto };
    if (data.totalAmount) {
      data.materaiRequired = data.totalAmount > 5000000;
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

  async updateStatus(id: string, status: InvoiceStatus, userId?: string): Promise<any> {
    const invoice = await this.findOne(id);

    // Validate status transition
    this.validateStatusTransition(invoice.status, status);

    // Create journal entry if status changes to SENT (revenue recognition)
    if (status === InvoiceStatus.SENT && invoice.status !== InvoiceStatus.SENT) {
      try {
        const journalEntry = await this.journalService.createInvoiceJournalEntry(
          invoice.id,
          invoice.invoiceNumber,
          invoice.clientId,
          Number(invoice.totalAmount),
          'SENT',
          userId || 'system',
        );

        // Post journal entry immediately
        await this.journalService.postJournalEntry(journalEntry.id, userId || 'system');

        // Update invoice with journal entry ID
        await this.prisma.invoice.update({
          where: { id },
          data: { journalEntryId: journalEntry.id },
        });
      } catch (error) {
        console.error('Failed to create journal entry for invoice:', error);
        // Continue with status update even if journal entry fails
      }
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

  async markAsPaid(
    id: string,
    paymentData?: {
      paymentMethod?: string;
      paymentDate?: string;
      notes?: string;
    },
    userId?: string,
  ): Promise<any> {
    const invoice = await this.findOne(id);

    // Validate that invoice can be marked as paid
    if (
      invoice.status !== InvoiceStatus.SENT &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException(
        "Hanya invoice dengan status SENT atau OVERDUE yang dapat ditandai sebagai lunas",
      );
    }

    // Create journal entry for payment (Cash/Bank debit, AR credit)
    try {
      const journalEntry = await this.journalService.createInvoiceJournalEntry(
        invoice.id,
        invoice.invoiceNumber,
        invoice.clientId,
        Number(invoice.totalAmount),
        'PAID',
        userId || 'system',
      );

      // Post journal entry immediately
      await this.journalService.postJournalEntry(journalEntry.id, userId || 'system');

      // Update invoice with payment journal entry ID
      await this.prisma.invoice.update({
        where: { id },
        data: { paymentJournalId: journalEntry.id },
      });
    } catch (error) {
      console.error('Failed to create payment journal entry for invoice:', error);
      // Continue with status update even if journal entry fails
    }

    // Reverse ECL provision if exists (PSAK 71)
    try {
      const activeProvisions = await this.prisma.allowanceForDoubtfulAccounts.findMany({
        where: {
          invoiceId: id,
          provisionStatus: 'ACTIVE',
        },
      });

      for (const provision of activeProvisions) {
        // Update provision status to REVERSED
        await this.prisma.allowanceForDoubtfulAccounts.update({
          where: { id: provision.id },
          data: {
            provisionStatus: 'REVERSED',
          },
        });

        // Create and post ECL reversal journal entry
        const reversalEntry = await this.journalService.createECLReversalEntry(
          provision.id,
          invoice.invoiceNumber,
          invoice.clientId,
          Number(provision.eclAmount),
          userId || 'system',
        );

        await this.journalService.postJournalEntry(reversalEntry.id, userId || 'system');

        console.log(
          `ECL provision reversed for invoice ${invoice.invoiceNumber}: ${Number(provision.eclAmount)} IDR`,
        );
      }
    } catch (error) {
      console.error('Failed to reverse ECL provision for invoice:', error);
      // Continue even if ECL reversal fails
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
      include: {
        client: true,
        project: true,
      },
    });

    // Create payment record if payment data is provided
    if (paymentData) {
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: id,
          amount: invoice.totalAmount,
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
        userId || 'system',
      );
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
    await this.handleAdvancePaymentDetection(invoiceId, paymentDate, paymentAmount, userId);
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
      const isAdvancePayment = await this.revenueRecognitionService.detectAdvancePayment(invoiceId);

      if (!isAdvancePayment) {
        console.log(`Invoice ${invoiceId}: Not an advance payment - project completed or in final stages`);
        return;
      }

      // Check if deferred revenue already exists for this invoice
      const existingDeferred = await this.prisma.deferredRevenue.findFirst({
        where: {
          invoiceId,
          status: { in: ['DEFERRED', 'PARTIALLY_RECOGNIZED'] },
        },
      });

      if (existingDeferred) {
        console.log(`Invoice ${invoiceId}: Deferred revenue already exists`);
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
      const deferredRevenue = await this.revenueRecognitionService.createDeferredRevenue({
        invoiceId,
        paymentDate,
        totalAmount: paymentAmount,
        recognitionDate,
        performanceObligation: invoice.scopeOfWork || `Service delivery for ${invoice.project.description}`,
        userId,
      });

      console.log(
        `✅ PSAK 72: Deferred revenue created for Invoice ${invoice.invoiceNumber}`,
        `\n   Amount: Rp ${paymentAmount.toLocaleString('id-ID')}`,
        `\n   Recognition Date: ${recognitionDate.toISOString().split('T')[0]}`,
        `\n   Performance Obligation: ${deferredRevenue.performanceObligation}`,
      );

      // Track business journey event
      await this.trackBusinessJourneyEvent(
        'PAYMENT_RECEIVED',
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
      console.error(`Failed to handle advance payment detection for invoice ${invoiceId}:`, error);
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

  async remove(id: string): Promise<any> {
    const invoice = await this.findOne(id);

    // Only allow deletion of draft invoices
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        "Hanya invoice dengan status draft yang dapat dihapus",
      );
    }

    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    // Get count of invoices this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const count = await this.prisma.invoice.count({
      where: {
        creationDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(3, "0");
    return `INV-${year}${month}-${sequence}`;
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

  private sanitizeInput(input: string): string {
    return input.trim().replace(/<[^>]*>/g, "");
  }

  private async validateBusinessRules(dto: CreateInvoiceDto) {
    // Check due date is in future
    const dueDate = new Date(dto.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
  }

  // Enhanced automation methods for workflow efficiency

  private async getCompanySettings(): Promise<any> {
    try {
      const settings = await this.prisma.companySettings.findFirst({
        where: { id: "default" },
      });

      return (
        settings || {
          bankBCA: "1234567890",
          bankMandiri: "0987654321",
          bankBNI: "1122334455",
          companyName: "PT Teknologi Indonesia",
        }
      );
    } catch (error) {
      // Return default settings if not found
      return {
        bankBCA: "1234567890",
        bankMandiri: "0987654321",
        bankBNI: "1122334455",
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

    // Add business days only (Indonesian business practice)
    const dueDate = new Date();
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

    if (companySettings.bankBCA) {
      paymentMethods.push(
        `Bank BCA: ${companySettings.bankBCA} a.n. ${companySettings.companyName}`,
      );
    }

    if (companySettings.bankMandiri) {
      paymentMethods.push(
        `Bank Mandiri: ${companySettings.bankMandiri} a.n. ${companySettings.companyName}`,
      );
    }

    if (companySettings.bankBNI) {
      paymentMethods.push(
        `Bank BNI: ${companySettings.bankBNI} a.n. ${companySettings.companyName}`,
      );
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
    // Indonesian law: Materai required for documents > 5 million IDR
    return totalAmount > 5000000;
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
      console.error("Failed to track business journey event:", error);
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
    try {
      const results = { updated: 0, failed: [] as string[] };

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
            const updateResult = await this.prisma.invoice.updateMany({
              where: { id: { in: validInvoices } },
              data: {
                status: newStatus,
                updatedAt: new Date(),
              },
            });

            results.updated += updateResult.count;

            // Track business journey events for successful updates
            for (const invoiceId of validInvoices) {
              await this.trackBusinessJourneyEvent(
                "INVOICE_SENT", // Assuming status change to sent
                { invoiceId, newStatus, bulkOperation: true },
                userId,
              );
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
}
