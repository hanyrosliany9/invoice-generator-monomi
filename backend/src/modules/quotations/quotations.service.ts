import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SettingsService } from "../settings/settings.service";
import { InvoiceCounterService } from "../invoices/services/invoice-counter.service";
import { PaymentMilestonesService } from "./services/payment-milestones.service";
import { DocumentsService } from "../documents/documents.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";
import { QuotationStatus, Prisma } from "@prisma/client";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import {
  validateStatusTransition,
  QuotationStatus as ValidatorQuotationStatus,
} from "./validators/status-transition.validator";

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

    // Generate unique quotation number
    const quotationNumber = await this.generateQuotationNumber();

    // Cascade scopeOfWork from project if not provided in DTO
    const scopeOfWork =
      createQuotationDto.scopeOfWork || project.scopeOfWork || null;

    // Cascade priceBreakdown from project if not provided in DTO
    const priceBreakdown =
      createQuotationDto.priceBreakdown || project.priceBreakdown || undefined;

    // Extract paymentMilestones from DTO (should not be passed to Prisma create)
    const { paymentMilestones, ...quotationData } = createQuotationDto as any;

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
          await this.autoGenerateInvoice(updated);
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

  async remove(id: string): Promise<any> {
    const quotation = await this.findOne(id);

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

  private async autoGenerateInvoice(quotation: any): Promise<any> {
    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate due date (default 30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Check if materai is required (> 5M IDR)
    const materaiRequired = Number(quotation.totalAmount) > 5000000;

    // Generate payment info from company settings
    const paymentInfo = await this.generatePaymentInfo();

    // Create invoice from quotation data (with scopeOfWork and priceBreakdown cascade)
    const invoice = await this.prisma.invoice.create({
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

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    // Get count of invoices this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const count = await this.prisma.invoice.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(3, "0");
    return `INV-${year}${month}-${sequence}`;
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

    // Use PaymentMilestonesService to generate invoice
    // This will be injected when we update the module
    // For now, create invoice directly
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    const count = await this.prisma.invoice.count({
      where: {
        creationDate: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });

    const invoiceNumber = `INV-${year}-${month}-${String(count + 1).padStart(5, "0")}`;

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
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + nextMilestone.dueDaysFromPrev);
      }
    }

    if (!dueDate) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const materaiRequired = Number(nextMilestone.paymentAmount) > 5000000;

    // Generate payment info from company settings
    const paymentInfo = await this.generatePaymentInfo();

    const invoice = await this.prisma.invoice.create({
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

    // Update milestone as invoiced
    await this.prisma.paymentMilestone.update({
      where: { id: nextMilestone.id },
      data: { isInvoiced: true },
    });

    return invoice;
  }
}
