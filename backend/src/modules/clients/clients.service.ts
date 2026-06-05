import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PaginatedResponse } from "../../common/dto/api-response.dto";
import {
  handleServiceError,
  validateIndonesianBusinessRules,
  sanitizeIndonesianInput,
} from "../../common/utils/error-handling.util";

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto): Promise<any> {
    try {
      // Validate Indonesian business rules
      validateIndonesianBusinessRules(createClientDto);

      // Check for duplicate NPWP (only when provided)
      if (createClientDto.taxNumber) {
        const existing = await this.prisma.client.findFirst({
          where: { taxNumber: createClientDto.taxNumber },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException("Klien dengan NPWP ini sudah ada");
        }
      }

      // Sanitize input data
      const sanitizedData = {
        name: sanitizeIndonesianInput(createClientDto.name),
        email: createClientDto.email || null,
        phone: createClientDto.phone || null,
        company: createClientDto.company
          ? sanitizeIndonesianInput(createClientDto.company)
          : null,
        address: createClientDto.address
          ? sanitizeIndonesianInput(createClientDto.address)
          : null,
        contactPerson: createClientDto.contactPerson
          ? sanitizeIndonesianInput(createClientDto.contactPerson)
          : null,
        paymentTerms: createClientDto.paymentTerms,
        status: createClientDto.status || "active",
        taxNumber: createClientDto.taxNumber || null,
        bankAccount: createClientDto.bankAccount || null,
        notes: createClientDto.notes || null,
      };

      return await this.prisma.client.create({
        data: sanitizedData,
      });
    } catch (error) {
      handleServiceError(error, "create client", "klien");
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
  ): Promise<PaginatedResponse<any[]>> {
    try {
      const skip = (page - 1) * limit;

      // Default to active clients only; caller may pass status='all' or a
      // specific value to override (e.g. admin list showing every client).
      const statusFilter: any =
        status === "all"
          ? {}
          : { status: status ?? "active" };

      const where = search
        ? {
            ...statusFilter,
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : { ...statusFilter };

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
            // Include actual data for business metrics calculation
            quotations: {
              select: {
                id: true,
                status: true,
                totalAmount: true,
              },
            },
            invoices: {
              select: {
                id: true,
                status: true,
                totalAmount: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        this.prisma.client.count({ where }),
      ]);

      // Transform clients data to include business metrics
      const clientsWithMetrics = clients.map((client) => {
        // Calculate quotation metrics
        const totalQuotations = client._count.quotations;
        const pendingQuotations = client.quotations.filter(
          (q) => q.status === "DRAFT" || q.status === "SENT",
        ).length;

        // Calculate invoice metrics
        const totalInvoices = client._count.invoices;
        const overdueInvoices = client.invoices.filter(
          (i) => i.status === "OVERDUE",
        ).length;

        // Calculate revenue metrics
        const totalPaid = client.invoices
          .filter((i) => i.status === "PAID")
          .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

        const totalPending = client.invoices
          .filter((i) => ["SENT", "OVERDUE"].includes(i.status))
          .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

        // Remove the detailed data and add calculated metrics
        const { quotations, invoices, ...clientData } = client;

        return {
          ...clientData,
          totalProjects: client._count.projects,
          totalQuotations,
          pendingQuotations,
          totalInvoices,
          overdueInvoices,
          totalPaid,
          totalPending,
        };
      });

      return new PaginatedResponse(
        clientsWithMetrics,
        {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        "Data klien berhasil diambil",
      );
    } catch (error) {
      handleServiceError(error, "find all clients", "klien");
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id },
        include: {
          quotations: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              project: true,
            },
          },
          invoices: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              project: true,
            },
          },
          projects: {
            take: 5,
            orderBy: { createdAt: "desc" },
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
        throw new NotFoundException("Klien tidak ditemukan");
      }

      // Calculate business metrics for individual client
      const totalQuotations = client._count.quotations;
      const pendingQuotations = client.quotations.filter(
        (q) => q.status === "DRAFT" || q.status === "SENT",
      ).length;

      const totalInvoices = client._count.invoices;
      const overdueInvoices = client.invoices.filter(
        (i) => i.status === "OVERDUE",
      ).length;

      // Calculate revenue metrics from ALL invoices (not just the recent 5)
      const allInvoices = await this.prisma.invoice.findMany({
        where: { clientId: id },
        select: {
          status: true,
          totalAmount: true,
        },
      });

      const totalPaid = allInvoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

      const totalPending = allInvoices
        .filter((i) => ["SENT", "OVERDUE"].includes(i.status))
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

      return {
        ...client,
        totalProjects: client._count.projects,
        totalQuotations,
        pendingQuotations,
        totalInvoices,
        overdueInvoices,
        totalPaid,
        totalPending,
      };
    } catch (error) {
      handleServiceError(error, "find client", "klien");
    }
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<any> {
    const client = await this.findOne(id);

    // Check for duplicate NPWP on update (skip own record)
    if (updateClientDto.taxNumber) {
      const existing = await this.prisma.client.findFirst({
        where: {
          taxNumber: updateClientDto.taxNumber,
          NOT: { id },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException("Klien dengan NPWP ini sudah ada");
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });
  }

  async remove(id: string): Promise<any> {
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

    if (
      hasRecords &&
      (hasRecords._count.quotations > 0 ||
        hasRecords._count.invoices > 0 ||
        hasRecords._count.projects > 0)
    ) {
      throw new ConflictException(
        "Tidak dapat menghapus klien yang memiliki quotation, invoice, atau proyek",
      );
    }

    try {
      return await this.prisma.client.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2003"
      ) {
        throw new ConflictException(
          "Cannot delete: it still has related records (expenses, calendar items, media projects, decks, events). Remove or reassign them first.",
        );
      }
      throw error;
    }
  }

  async getClientStats(): Promise<{ total: number; recent: any[] }> {
    const [total, recentClients] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              quotations: true,
              invoices: true,
              projects: true,
            },
          },
          // Include actual data for business metrics calculation
          quotations: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
          },
          invoices: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
          },
        },
      }),
    ]);

    // Transform recent clients data to include business metrics
    const recentClientsWithMetrics = recentClients.map((client) => {
      // Calculate quotation metrics
      const totalQuotations = client._count.quotations;
      const pendingQuotations = client.quotations.filter(
        (q) => q.status === "DRAFT" || q.status === "SENT",
      ).length;

      // Calculate invoice metrics
      const totalInvoices = client._count.invoices;
      const overdueInvoices = client.invoices.filter(
        (i) => i.status === "OVERDUE",
      ).length;

      // Calculate revenue metrics
      const totalPaid = client.invoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

      const totalPending = client.invoices
        .filter((i) => ["SENT", "OVERDUE"].includes(i.status))
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

      // Remove the detailed data and add calculated metrics
      const { quotations, invoices, ...clientData } = client;

      return {
        ...clientData,
        totalProjects: client._count.projects,
        totalQuotations,
        pendingQuotations,
        totalInvoices,
        overdueInvoices,
        totalPaid,
        totalPending,
      };
    });

    return {
      total,
      recent: recentClientsWithMetrics,
    };
  }
}
