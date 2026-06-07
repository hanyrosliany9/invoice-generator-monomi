import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { wibYear, wibMonth, wibParts } from "../../common/utils/wib-date.util";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getRevenueAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get revenue by month/quarter/year
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: "PAID",
        ...dateFilter,
      },
      select: {
        totalAmount: true,
        creationDate: true,
        // FIX 5: fetch markedPaidAt for cash-basis date resolution
        markedPaidAt: true,
        updatedAt: true,
      },
    });

    // Group by period
    const revenueByPeriod = this.groupByPeriod(invoices, period || "monthly");

    // FIX 4 (precision): use Number() on Prisma Decimal to avoid parseFloat
    // string-round-trip drift; accumulate with integer-safe addition.
    const totalRevenue = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    const averageRevenue =
      invoices.length > 0 ? totalRevenue / invoices.length : 0;

    return {
      totalRevenue,
      averageRevenue,
      revenueByPeriod,
      invoiceCount: invoices.length,
    };
  }

  async getClientAnalytics(
    limit?: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Build date filter on invoice issue date (creationDate)
    const dateWhere =
      startDate || endDate
        ? {
            creationDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {};

    // Get top clients by revenue
    const clientRevenue = await this.prisma.invoice.groupBy({
      by: ["clientId"],
      where: {
        status: "PAID",
        ...dateWhere,
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get client details with optimized query
    const topClientIds = clientRevenue
      .sort(
        (a, b) =>
          Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0),
      )
      .slice(0, limit || 10)
      .map((item) => item.clientId);

    const clients = await this.prisma.client.findMany({
      where: {
        id: { in: topClientIds },
      },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
      },
    });

    const clientMap = new Map(clients.map((client) => [client.id, client]));

    const topClients = clientRevenue
      .sort(
        (a, b) =>
          Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0),
      )
      .slice(0, limit || 10)
      .map((item) => ({
        client: clientMap.get(item.clientId),
        revenue: Number(item._sum.totalAmount ?? 0),
        invoiceCount: item._count.id,
      }));

    return {
      topClients,
      totalClients: await this.prisma.client.count(),
    };
  }

  async getProjectAnalytics(
    limit?: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Build date filter on invoice issue date (creationDate)
    const dateWhere =
      startDate || endDate
        ? {
            creationDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {};

    // Get project revenue
    const projectRevenue = await this.prisma.invoice.groupBy({
      by: ["projectId"],
      where: {
        status: "PAID",
        ...dateWhere,
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // FIX 3 (N+1): replace per-project findUnique inside Promise.all with a
    // single findMany + Map lookup.
    const sortedTopRevenue = projectRevenue
      .sort(
        (a, b) =>
          Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0),
      )
      .slice(0, limit || 10);

    const topProjectIds = sortedTopRevenue
      .map((item) => item.projectId)
      .filter((id): id is string => id !== null);

    const projectDetails = await this.prisma.project.findMany({
      where: { id: { in: topProjectIds } },
      select: {
        id: true,
        number: true,
        description: true,
        projectType: {
          select: {
            code: true,
            name: true,
          },
        },
        status: true,
        client: {
          select: {
            name: true,
            company: true,
          },
        },
      },
    });
    const projectMap = new Map(projectDetails.map((p) => [p.id, p]));

    const topProjects = sortedTopRevenue.map((item) => ({
      project: item.projectId ? projectMap.get(item.projectId) ?? null : null,
      revenue: Number(item._sum.totalAmount ?? 0),
      invoiceCount: item._count.id,
    }));

    // Get project type distribution
    const projectTypes = await this.prisma.project.groupBy({
      by: ["projectTypeId"],
      _count: {
        id: true,
      },
    });

    return {
      topProjects,
      projectTypes,
      totalProjects: await this.prisma.project.count(),
    };
  }

  async getPaymentAnalytics(startDate?: string, endDate?: string) {
    // Build date filter on payment date (markedPaidAt) for paid invoices,
    // and on creationDate for the general status distribution.
    const creationDateWhere =
      startDate || endDate
        ? {
            creationDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {};

    const paidDateWhere =
      startDate || endDate
        ? {
            markedPaidAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {};

    // Invoice status distribution (scoped by invoice issue date)
    const invoicesByStatus = await this.prisma.invoice.groupBy({
      by: ["status"],
      where: {
        ...creationDateWhere,
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    // FIX 6: Coerce Prisma Decimal _sum.totalAmount to JS number for each group
    const invoicesByStatusNormalized = invoicesByStatus.map((row) => ({
      ...row,
      _sum: {
        totalAmount: Number(row._sum.totalAmount ?? 0),
      },
    }));

    // Overdue invoices (FIX 2: include explicit OVERDUE status rows)
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        OR: [
          { status: "OVERDUE", ...creationDateWhere },
          {
            status: "SENT",
            dueDate: { lt: new Date() },
            ...creationDateWhere,
          },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
        client: {
          select: {
            name: true,
            company: true,
          },
        },
      },
    });

    // Payment trends (paid invoices by month) — scoped by payment date
    const paidInvoices = await this.prisma.invoice.findMany({
      where: {
        status: "PAID",
        ...paidDateWhere,
      },
      select: {
        totalAmount: true,
        creationDate: true,
        // FIX 5: include payment date fields for correct period bucketing
        markedPaidAt: true,
        updatedAt: true,
      },
    });

    const paymentTrends = this.groupByPeriod(paidInvoices, "monthly");

    return {
      invoicesByStatus: invoicesByStatusNormalized,
      overdueInvoices,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      ),
      paymentTrends,
    };
  }

  async getBusinessOverview(period?: string) {
    const [revenueData, clientData, projectData, paymentData] =
      await Promise.all([
        this.getRevenueAnalytics(period),
        this.getClientAnalytics(5),
        this.getProjectAnalytics(5),
        this.getPaymentAnalytics(),
      ]);

    return {
      revenue: revenueData,
      clients: clientData,
      projects: projectData,
      payments: paymentData,
      generatedAt: new Date(),
    };
  }

  async getFinancialSummary(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [quotations, invoices, clients, projects] = await Promise.all([
      this.prisma.quotation.findMany({
        where: dateFilter,
        select: {
          status: true,
          totalAmount: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: dateFilter,
        select: {
          status: true,
          totalAmount: true,
          materaiRequired: true,
        },
      }),
      this.prisma.client.count({
        where: {
          createdAt: dateFilter.createdAt,
        },
      }),
      this.prisma.project.count({
        where: {
          createdAt: dateFilter.createdAt,
        },
      }),
    ]);

    // Calculate quotation metrics
    const quotationMetrics = {
      total: quotations.length,
      approved: quotations.filter((q) => q.status === "APPROVED").length,
      pending: quotations.filter((q) => q.status === "SENT").length,
      // FIX 4: Exclude DRAFT from pipeline value (committed pipeline only)
      totalValue: quotations
        .filter((q) => q.status !== "DRAFT")
        .reduce((sum, q) => sum + Number(q.totalAmount), 0),
    };

    // Calculate invoice metrics (exclude CANCELLED from totals and rate)
    const activeInvoices = invoices.filter((i) => i.status !== "CANCELLED");
    const invoiceMetrics = {
      total: activeInvoices.length,
      paid: activeInvoices.filter((i) => i.status === "PAID").length,
      pending: activeInvoices.filter((i) => i.status === "SENT").length,
      overdue: activeInvoices.filter((i) => i.status === "OVERDUE").length,
      totalValue: activeInvoices.reduce(
        (sum, i) => sum + Number(i.totalAmount),
        0,
      ),
      paidValue: activeInvoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.totalAmount), 0),
      materaiRequired: activeInvoices.filter((i) => i.materaiRequired).length,
    };

    return {
      period: {
        startDate: startDate || "All time",
        endDate: endDate || "Present",
      },
      quotations: quotationMetrics,
      invoices: invoiceMetrics,
      newClients: clients,
      newProjects: projects,
      // FIX 1: Denominator = quotations actually sent (exclude DRAFT)
      conversionRate: (() => {
        const sentCount = quotations.filter(
          (q) => q.status !== "DRAFT",
        ).length;
        return sentCount > 0
          ? ((quotationMetrics.approved / sentCount) * 100).toFixed(2)
          : 0;
      })(),
      paymentRate:
        invoiceMetrics.total > 0
          ? ((invoiceMetrics.paid / invoiceMetrics.total) * 100).toFixed(2)
          : 0,
    };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    const filter: any = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.lte = new Date(endDate);
      }
    }

    return filter;
  }

  private groupByPeriod(data: any[], period: string) {
    const grouped: { [key: string]: number } = {};

    data.forEach((item) => {
      let key: string;
      // FIX 5: bucket PAID invoices by payment date (markedPaidAt → updatedAt → creationDate)
      const rawDate = item.markedPaidAt ?? item.updatedAt ?? item.creationDate;
      const date = new Date(rawDate);

      switch (period) {
        case "yearly":
          key = wibYear(date).toString();
          break;
        case "quarterly": {
          const { year, month } = wibParts(date);
          const quarter = Math.floor((month - 1) / 3) + 1;
          key = `${year}-Q${quarter}`;
          break;
        }
        case "monthly":
        default:
          key = `${wibYear(date)}-${wibMonth(date).toString().padStart(2, "0")}`;
          break;
      }

      grouped[key] = (grouped[key] || 0) + Number(item.totalAmount);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount }));
  }
}
