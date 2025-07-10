import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getRevenueAnalytics(period?: string, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    // Get revenue by month/quarter/year
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PAID',
        ...dateFilter,
      },
      select: {
        totalAmount: true,
        creationDate: true,
      },
    });

    // Group by period
    const revenueByPeriod = this.groupByPeriod(invoices, period || 'monthly');
    
    // Calculate totals
    const totalRevenue = invoices.reduce((sum, invoice) => 
      sum + parseFloat(invoice.totalAmount.toString()), 0
    );
    
    const averageRevenue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    return {
      totalRevenue,
      averageRevenue,
      revenueByPeriod,
      invoiceCount: invoices.length,
    };
  }

  async getClientAnalytics(limit?: number) {
    // Get top clients by revenue
    const clientRevenue = await this.prisma.invoice.groupBy({
      by: ['clientId'],
      where: {
        status: 'PAID',
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
      .sort((a, b) => parseFloat(b._sum.totalAmount?.toString() || '0') - parseFloat(a._sum.totalAmount?.toString() || '0'))
      .slice(0, limit || 10)
      .map(item => item.clientId);

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

    const clientMap = new Map(clients.map(client => [client.id, client]));

    const topClients = clientRevenue
      .sort((a, b) => parseFloat(b._sum.totalAmount?.toString() || '0') - parseFloat(a._sum.totalAmount?.toString() || '0'))
      .slice(0, limit || 10)
      .map(item => ({
        client: clientMap.get(item.clientId),
        revenue: parseFloat(item._sum.totalAmount?.toString() || '0'),
        invoiceCount: item._count.id,
      }));

    return {
      topClients,
      totalClients: await this.prisma.client.count(),
    };
  }

  async getProjectAnalytics(limit?: number) {
    // Get project revenue
    const projectRevenue = await this.prisma.invoice.groupBy({
      by: ['projectId'],
      where: {
        status: 'PAID',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get project details
    const topProjects = await Promise.all(
      projectRevenue
        .sort((a, b) => parseFloat(b._sum.totalAmount?.toString() || '0') - parseFloat(a._sum.totalAmount?.toString() || '0'))
        .slice(0, limit || 10)
        .map(async (item) => {
          const project = await this.prisma.project.findUnique({
            where: { id: item.projectId },
            select: {
              id: true,
              number: true,
              description: true,
              type: true,
              status: true,
              client: {
                select: {
                  name: true,
                  company: true,
                },
              },
            },
          });
          
          return {
            project,
            revenue: parseFloat(item._sum.totalAmount?.toString() || '0'),
            invoiceCount: item._count.id,
          };
        })
    );

    // Get project type distribution
    const projectTypes = await this.prisma.project.groupBy({
      by: ['type'],
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

  async getPaymentAnalytics() {
    // Invoice status distribution
    const invoicesByStatus = await this.prisma.invoice.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Overdue invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'SENT',
        dueDate: {
          lt: new Date(),
        },
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

    // Payment trends (paid invoices by month)
    const paidInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PAID',
      },
      select: {
        totalAmount: true,
        creationDate: true,
      },
    });

    const paymentTrends = this.groupByPeriod(paidInvoices, 'monthly');

    return {
      invoicesByStatus,
      overdueInvoices,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0),
      paymentTrends,
    };
  }

  async getBusinessOverview(period?: string) {
    const [
      revenueData,
      clientData,
      projectData,
      paymentData,
    ] = await Promise.all([
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
      approved: quotations.filter(q => q.status === 'APPROVED').length,
      pending: quotations.filter(q => q.status === 'SENT').length,
      totalValue: quotations.reduce((sum, q) => sum + parseFloat(q.totalAmount.toString()), 0),
    };

    // Calculate invoice metrics
    const invoiceMetrics = {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'PAID').length,
      pending: invoices.filter(i => i.status === 'SENT').length,
      overdue: invoices.filter(i => i.status === 'OVERDUE').length,
      totalValue: invoices.reduce((sum, i) => sum + parseFloat(i.totalAmount.toString()), 0),
      paidValue: invoices
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + parseFloat(i.totalAmount.toString()), 0),
      materaiRequired: invoices.filter(i => i.materaiRequired).length,
    };

    return {
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Present',
      },
      quotations: quotationMetrics,
      invoices: invoiceMetrics,
      newClients: clients,
      newProjects: projects,
      conversionRate: quotationMetrics.total > 0 
        ? (quotationMetrics.approved / quotationMetrics.total * 100).toFixed(2)
        : 0,
      paymentRate: invoiceMetrics.total > 0
        ? (invoiceMetrics.paid / invoiceMetrics.total * 100).toFixed(2)
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
    
    data.forEach(item => {
      let key: string;
      const date = new Date(item.creationDate);
      
      switch (period) {
        case 'yearly':
          key = date.getFullYear().toString();
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'monthly':
        default:
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
      }
      
      grouped[key] = (grouped[key] || 0) + parseFloat(item.totalAmount.toString());
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount }));
  }
}