import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";
import { QuotationStatus, Prisma } from "@prisma/client";
import { getErrorMessage } from "../../common/utils/error-handling.util";

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createQuotationDto: CreateQuotationDto,
    userId: string,
  ): Promise<any> {
    // Validate that the project belongs to the selected client
    const project = await this.prisma.project.findUnique({
      where: { id: createQuotationDto.projectId },
      select: { clientId: true, id: true },
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

    return this.prisma.quotation.create({
      data: {
        ...createQuotationDto,
        quotationNumber,
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
        project: true,
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

    return this.prisma.quotation.update({
      where: { id },
      data: updateQuotationDto,
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

    const updatedQuotation = await this.prisma.quotation.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        project: true,
      },
    });

    // Auto-generate invoice when quotation is approved
    if (status === QuotationStatus.APPROVED) {
      try {
        await this.autoGenerateInvoice(updatedQuotation);
        console.log(
          `✅ Auto-generated invoice for approved quotation ${updatedQuotation.quotationNumber}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to auto-generate invoice for quotation ${updatedQuotation.quotationNumber}:`,
          getErrorMessage(error),
        );
        // Don't fail the status update, but log the error
      }
    }

    // Send notification about status change
    try {
      await this.notificationsService.sendQuotationStatusUpdate(id, status);
    } catch (error) {
      // Log error but don't fail the status update
      console.error("Failed to send status update notification:", error);
    }

    return updatedQuotation;
  }

  async remove(id: string): Promise<any> {
    const quotation = await this.findOne(id);

    // Only allow deletion of draft quotations
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new Error("Hanya quotation dengan status draft yang dapat dihapus");
    }

    return this.prisma.quotation.delete({
      where: { id },
    });
  }

  async generateQuotationNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    // Get count of quotations this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const count = await this.prisma.quotation.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(3, "0");
    return `QT-${year}${month}-${sequence}`;
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

  private async autoGenerateInvoice(quotation: any): Promise<any> {
    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate due date (default 30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Check if materai is required (> 5M IDR)
    const materaiRequired = Number(quotation.totalAmount) > 5000000;

    // Create invoice from quotation data
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        dueDate,
        quotationId: quotation.id,
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        amountPerProject: quotation.amountPerProject,
        totalAmount: quotation.totalAmount,
        paymentInfo: "Bank Transfer - Lihat detail di company settings",
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

    console.log(
      `📄 Auto-generated invoice ${invoiceNumber} from quotation ${quotation.quotationNumber}`,
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
}
