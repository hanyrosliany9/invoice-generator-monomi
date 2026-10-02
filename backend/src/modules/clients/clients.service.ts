import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import {
  EXCLUDE_INTERNAL_CLIENTS,
  INTERNAL_CLIENT_NAME,
} from "./client-scope";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PaginatedResponse } from "../../common/dto/api-response.dto";
import {
  handleServiceError,
  validateIndonesianBusinessRules,
  sanitizeIndonesianInput,
} from "../../common/utils/error-handling.util";

// Arbitrary constant key for the pg advisory lock guarding internal-client creation.
const INTERNAL_CLIENT_LOCK_KEY = 727001;
// Prisma default for CompanySettings.companyName (means "not configured").
const DEFAULT_COMPANY_NAME = "PT Teknologi Indonesia";

@Injectable()
export class ClientsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ClientsService.name);
  private ensured = false;

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureInternalClient();
    } catch (error) {
      // Never block startup (e.g. migration not applied yet); the client list
      // endpoint retries lazily.
      this.logger.error(
        `Could not ensure internal client: ${(error as Error)?.message}`,
      );
    }
  }

  /**
   * Idempotently guarantee exactly one internal client (the agency itself,
   * "Monomi") exists. Safe under concurrent calls and multiple app instances:
   * a transaction-scoped advisory lock serialises find-or-create.
   */
  async ensureInternalClient(): Promise<{ id: string; name: string }> {
    const existing = await this.prisma.client.findFirst({
      where: { isInternal: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    if (existing) {
      this.ensured = true;
      return existing;
    }

    // Prefer real Monomi data from company settings when configured. Select
    // only needed columns (company_settings may lack newer columns on drifted
    // databases) and tolerate failure: this is best-effort enrichment.
    let settings: {
      companyName: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
    } | null = null;
    try {
      settings = await this.prisma.companySettings.findUnique({
        where: { id: "default" },
        select: { companyName: true, email: true, phone: true, address: true },
      });
    } catch (error) {
      this.logger.warn(
        `Company settings unavailable: ${(error as Error)?.message}`,
      );
    }

    let wasCreated = false;
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INTERNAL_CLIENT_LOCK_KEY})`;
      const again = await tx.client.findFirst({
        where: { isInternal: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      });
      if (again) return again;

      // The schema default name means settings were never configured.
      const configuredName =
        settings?.companyName && settings.companyName !== DEFAULT_COMPANY_NAME
          ? settings.companyName
          : null;
      wasCreated = true;
      return tx.client.create({
        data: {
          name: INTERNAL_CLIENT_NAME,
          company: configuredName || INTERNAL_CLIENT_NAME,
          email: settings?.email || null,
          phone: settings?.phone || null,
          address: settings?.address || null,
          status: "active",
          isInternal: true,
          notes:
            "Klien internal (agensi sendiri) - untuk perencanaan konten media sosial Monomi. Tidak dapat ditagih.",
        },
        select: { id: true, name: true },
      });
    });
    this.ensured = true;
    if (wasCreated) {
      this.logger.log(`Created internal client ${created.id}`);
    }
    return created;
  }

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
        instagramHandle: createClientDto.instagramHandle || null,
        instagramAvatarUrl: createClientDto.instagramAvatarUrl || null,
        instagramBio: createClientDto.instagramBio || null,
        tiktokHandle: createClientDto.tiktokHandle || null,
        tiktokAvatarUrl: createClientDto.tiktokAvatarUrl || null,
        tiktokBio: createClientDto.tiktokBio || null,
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
    includeInternal = false,
  ): Promise<PaginatedResponse<any[]>> {
    try {
      const skip = (page - 1) * limit;

      // Business pickers (invoices, quotations, projects...) never see the
      // internal client; the Clients page and content calendar opt in.
      if (includeInternal && !this.ensured) {
        try {
          await this.ensureInternalClient();
        } catch (error) {
          // Listing must keep working even if the internal client can't be
          // created (e.g. schema drift); return whatever exists.
          this.logger.error(
            `Could not ensure internal client: ${(error as Error)?.message}`,
          );
        }
      }
      const internalFilter: any = includeInternal
        ? {}
        : EXCLUDE_INTERNAL_CLIENTS;

      // Default to active clients only; caller may pass status='all' or a
      // specific value to override (e.g. admin list showing every client).
      const statusFilter: any =
        status === "all"
          ? {}
          : { status: status ?? "active" };

      const where = search
        ? {
            ...internalFilter,
            ...statusFilter,
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : { ...internalFilter, ...statusFilter };

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
                payments: { select: { amount: true, status: true } },
              },
            },
          },
          orderBy: [{ isInternal: "desc" }, { createdAt: "desc" }],
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
          .reduce((sum, i) => {
            // Subtract CONFIRMED payments — a partially-paid SENT/OVERDUE
            // invoice (termin) only owes the remaining balance, not its total.
            const paid = ((i as any).payments || []).reduce(
              (s: number, p: any) =>
                p.status === "CONFIRMED" ? s + Number(p.amount || 0) : s,
              0,
            );
            return sum + Math.max(0, Number(i.totalAmount || 0) - paid);
          }, 0);

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
          payments: { select: { amount: true, status: true } },
        },
      });

      const totalPaid = allInvoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

      const totalPending = allInvoices
        .filter((i) => ["SENT", "OVERDUE"].includes(i.status))
        .reduce((sum, i) => {
          // Subtract CONFIRMED payments — only the remaining balance is owed.
          const paid = ((i as any).payments || []).reduce(
            (s: number, p: any) =>
              p.status === "CONFIRMED" ? s + Number(p.amount || 0) : s,
            0,
          );
          return sum + Math.max(0, Number(i.totalAmount || 0) - paid);
        }, 0);

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

    // isInternal is never settable through the API, even if a body smuggles it in.
    const { isInternal: _ignored, ...safeDto } = updateClientDto as any;
    if (client.isInternal && safeDto.status === "inactive") {
      throw new BadRequestException("Klien internal tidak dapat dinonaktifkan");
    }

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
      data: safeDto,
    });
  }

  async remove(id: string): Promise<any> {
    const client = await this.findOne(id);
    if (client.isInternal) {
      throw new BadRequestException("Klien internal tidak dapat dihapus");
    }

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
      this.prisma.client.count({ where: EXCLUDE_INTERNAL_CLIENTS }),
      this.prisma.client.findMany({
        where: EXCLUDE_INTERNAL_CLIENTS,
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
              payments: { select: { amount: true, status: true } },
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
        .reduce((sum, i) => {
          // Subtract CONFIRMED payments — only the remaining balance is owed.
          const paid = ((i as any).payments || []).reduce(
            (s: number, p: any) =>
              p.status === "CONFIRMED" ? s + Number(p.amount || 0) : s,
            0,
          );
          return sum + Math.max(0, Number(i.totalAmount || 0) - paid);
        }, 0);

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
