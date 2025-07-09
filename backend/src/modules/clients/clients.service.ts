import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    return this.prisma.client.create({
      data: createClientDto,
    });
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { company: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              quotations: true,
              invoices: true,
              projects: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        quotations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            project: true,
          },
        },
        invoices: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            project: true,
          },
        },
        projects: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            quotations: true,
            invoices: true,
            projects: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Klien tidak ditemukan');
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const client = await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });
  }

  async remove(id: string) {
    const client = await this.findOne(id);

    // Check if client has associated records
    const hasRecords = await this.prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
            projects: true,
          },
        },
      },
    });

    if (hasRecords._count.quotations > 0 || hasRecords._count.invoices > 0 || hasRecords._count.projects > 0) {
      throw new Error('Tidak dapat menghapus klien yang memiliki quotation, invoice, atau proyek');
    }

    return this.prisma.client.delete({
      where: { id },
    });
  }

  async getClientStats() {
    const [total, recentClients] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              quotations: true,
              invoices: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      recent: recentClients,
    };
  }
}