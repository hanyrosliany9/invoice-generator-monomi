import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotationsService } from '../quotations/quotations.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus, QuotationStatus } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/api-response.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private quotationsService: QuotationsService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, userId: string) {
    // Generate unique invoice number if not provided
    const invoiceNumber = createInvoiceDto.invoiceNumber || await this.generateInvoiceNumber();
    
    // Calculate if materai is required (> 5 million IDR)
    const materaiRequired = createInvoiceDto.totalAmount > 5000000;
    
    return this.prisma.invoice.create({
      data: {
        ...createInvoiceDto,
        invoiceNumber,
        materaiRequired,
        createdBy: userId,
      },
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

  async createFromQuotation(quotationId: string, userId: string) {
    // Get the quotation
    const quotation = await this.quotationsService.findOne(quotationId);
    
    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException('Hanya quotation yang disetujui yang dapat dibuat menjadi invoice');
    }

    // Check if invoice already exists for this quotation
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { quotationId },
    });

    if (existingInvoice) {
      throw new BadRequestException('Invoice sudah dibuat untuk quotation ini');
    }

    // Create invoice from quotation data
    const invoiceData: CreateInvoiceDto = {
      quotationId,
      clientId: quotation.clientId,
      projectId: quotation.projectId,
      amountPerProject: quotation.amountPerProject.toNumber(),
      totalAmount: quotation.totalAmount.toNumber(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      paymentInfo: 'Bank BCA: 1234567890 a.n. Perusahaan\nBank Mandiri: 0987654321 a.n. Perusahaan',
      terms: quotation.terms,
    };

    return this.create(invoiceData, userId);
  }

  async findAll(page = 1, limit = 10, status?: InvoiceStatus) {
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

  async findOne(id: string) {
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

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
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

  async updateStatus(id: string, status: InvoiceStatus) {
    const invoice = await this.findOne(id);

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        project: true,
      },
    });
  }

  async updateMateraiStatus(id: string, materaiApplied: boolean) {
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

  async remove(id: string) {
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

  async getRecentInvoices(limit = 5) {
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

  async getInvoiceStats() {
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
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      overdueCount,
    };
  }

  async getOverdueInvoices() {
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
}