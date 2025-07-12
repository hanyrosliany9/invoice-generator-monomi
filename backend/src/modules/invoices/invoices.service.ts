import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotationsService } from '../quotations/quotations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus, QuotationStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/api-response.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private quotationsService: QuotationsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, userId: string): Promise<any> {
    // Validate client exists
    const client = await this.prisma.client.findUnique({ 
      where: { id: createInvoiceDto.clientId } 
    });
    if (!client) {
      throw new NotFoundException(`Client dengan ID ${createInvoiceDto.clientId} tidak ditemukan`);
    }
    
    // Validate project exists
    const project = await this.prisma.project.findUnique({ 
      where: { id: createInvoiceDto.projectId } 
    });
    if (!project) {
      throw new NotFoundException(`Project dengan ID ${createInvoiceDto.projectId} tidak ditemukan`);
    }

    // Validate business rules
    await this.validateBusinessRules(createInvoiceDto);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // Auto-calculate materai
    const materaiRequired = createInvoiceDto.totalAmount > 5000000;
    
    // Sanitize input data
    const sanitizedData = {
      ...createInvoiceDto,
      paymentInfo: this.sanitizeInput(createInvoiceDto.paymentInfo),
      terms: createInvoiceDto.terms ? this.sanitizeInput(createInvoiceDto.terms) : null,
    };
    
    return this.prisma.$transaction(async (prisma) => {
      const invoice = await prisma.invoice.create({
        data: {
          ...sanitizedData,
          invoiceNumber,
          materaiRequired,
          materaiApplied: createInvoiceDto.materaiApplied || false,
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
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'invoice',
          entityId: invoice.id,
          newValues: invoice as any,
          userId: userId,
        },
      }).catch(() => {
        // Audit log is optional, don't fail the transaction if audit table doesn't exist
      });

      return invoice;
    });
  }

  async createFromQuotation(quotationId: string, userId: string): Promise<any> {
    // Get the quotation
    const quotation = await this.quotationsService.findOne(quotationId);
    
    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException('Hanya quotation yang disetujui yang dapat dibuat menjadi invoice');
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

    // Create invoice from quotation data
    const invoiceData: CreateInvoiceDto = {
      quotationId,
      clientId: quotation.clientId,
      projectId: quotation.projectId,
      amountPerProject: parseFloat(quotation.amountPerProject.toString()),
      totalAmount: parseFloat(quotation.totalAmount.toString()),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      paymentInfo: 'Bank BCA: 1234567890 a.n. Perusahaan\nBank Mandiri: 0987654321 a.n. Perusahaan',
      terms: quotation.terms,
    };

    // Create invoice and update quotation status
    const invoice = await this.create(invoiceData, userId);
    
    // Update quotation status to indicate it has been converted to invoice
    await this.quotationsService.updateStatus(quotationId, QuotationStatus.APPROVED);
    
    // Send notification about invoice generation
    try {
      await this.notificationsService.sendInvoiceGenerated(invoice.id, quotationId);
    } catch (error) {
      // Log error but don't fail the invoice creation
      console.error('Failed to send invoice generation notification:', error);
    }
    
    return invoice;
  }

  async findAll(page = 1, limit = 10, status?: InvoiceStatus): Promise<PaginatedResponse<any[]>> {
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
          createdAt: 'desc',
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
      'Invoices retrieved successfully'
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
      throw new NotFoundException('Invoice tidak ditemukan');
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

  async updateStatus(id: string, status: InvoiceStatus): Promise<any> {
    const invoice = await this.findOne(id);

    // Validate status transition
    this.validateStatusTransition(invoice.status, status);

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        project: true,
      },
    });
  }

  async markAsPaid(id: string, paymentData?: { paymentMethod?: string; paymentDate?: string; notes?: string }): Promise<any> {
    const invoice = await this.findOne(id);

    // Validate that invoice can be marked as paid
    if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.OVERDUE) {
      throw new BadRequestException('Hanya invoice dengan status SENT atau OVERDUE yang dapat ditandai sebagai lunas');
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
      await this.prisma.payment.create({
        data: {
          invoiceId: id,
          amount: invoice.totalAmount,
          paymentMethod: (paymentData.paymentMethod as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          bankDetails: paymentData.notes, // Use bankDetails field for notes
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });
    }

    return updatedInvoice;
  }

  async bulkUpdateStatus(ids: string[], status: InvoiceStatus): Promise<any> {
    // Validate all invoices first
    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    if (invoices.length !== ids.length) {
      throw new BadRequestException('Beberapa invoice tidak ditemukan');
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

  private validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus) {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
      [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
      [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      [InvoiceStatus.PAID]: [], // Paid invoices cannot be changed
      [InvoiceStatus.CANCELLED]: [], // Cancelled invoices cannot be changed
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}. Transisi yang diizinkan: ${allowedTransitions.join(', ')}`
      );
    }
  }

  async updateMateraiStatus(id: string, materaiApplied: boolean): Promise<any> {
    const invoice = await this.findOne(id);

    if (!invoice.materaiRequired) {
      throw new BadRequestException('Invoice ini tidak memerlukan materai');
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
      throw new BadRequestException('Hanya invoice dengan status draft yang dapat dihapus');
    }

    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
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

    const sequence = (count + 1).toString().padStart(3, '0');
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
        createdAt: 'desc',
      },
    });
  }

  async getInvoiceStats(): Promise<{ total: number; byStatus: Record<string, number>; totalRevenue: number; overdueCount: number }> {
    const [total, byStatus, totalRevenue, overdueCount] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.groupBy({
        by: ['status'],
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

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byStatus: statusCounts,
      totalRevenue: totalRevenue._sum.totalAmount ? Number(totalRevenue._sum.totalAmount) : 0,
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
        dueDate: 'asc',
      },
    });
  }

  async inheritPriceFromQuotation(quotationId: string, customPrice?: Prisma.Decimal): Promise<Prisma.Decimal> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { 
        totalAmount: true,
        amountPerProject: true,
        id: true,
        project: {
          select: {
            basePrice: true,
            estimatedBudget: true
          }
        }
      }
    });

    if (!quotation) {
      throw new NotFoundException('Quotation tidak ditemukan');
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
    return input.trim().replace(/<[^>]*>/g, '');
  }

  private async validateBusinessRules(dto: CreateInvoiceDto) {
    // Check due date is in future
    const dueDate = new Date(dto.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate <= today) {
      throw new BadRequestException('Tanggal jatuh tempo harus di masa depan');
    }
    
    // Check amount is reasonable
    if (dto.totalAmount < 1000) {
      throw new BadRequestException('Jumlah invoice minimal Rp 1.000');
    }
    
    if (dto.totalAmount > 1000000000) {
      throw new BadRequestException('Jumlah invoice melebihi batas maksimal');
    }
  }
}