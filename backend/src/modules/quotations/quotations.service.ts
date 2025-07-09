import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationStatus } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  async create(createQuotationDto: CreateQuotationDto, userId: string) {
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

  async findAll(page = 1, limit = 10, status?: QuotationStatus) {
    const skip = (page - 1) * limit;
    
    const where = status ? { status } : {};
    
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
        },
        orderBy: {
          createdAt: 'desc',
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

  async findOne(id: string) {
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
      throw new NotFoundException('Quotation tidak ditemukan');
    }

    return quotation;
  }

  async update(id: string, updateQuotationDto: UpdateQuotationDto) {
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

  async updateStatus(id: string, status: QuotationStatus) {
    const quotation = await this.findOne(id);

    return this.prisma.quotation.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        project: true,
      },
    });
  }

  async remove(id: string) {
    const quotation = await this.findOne(id);

    // Only allow deletion of draft quotations
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new Error('Hanya quotation dengan status draft yang dapat dihapus');
    }

    return this.prisma.quotation.delete({
      where: { id },
    });
  }

  async generateQuotationNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
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

    const sequence = (count + 1).toString().padStart(3, '0');
    return `QT-${year}${month}-${sequence}`;
  }

  async getRecentQuotations(limit = 5) {
    return this.prisma.quotation.findMany({
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

  async getQuotationStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.quotation.count(),
      this.prisma.quotation.groupBy({
        by: ['status'],
        _count: {
          status: true,
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
    };
  }
}