import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MilestoneAnalyticsDto,
  ProfitabilityDataDto,
  CashFlowDataDto,
  MilestoneMetricDto,
} from './dto/milestone-analytics.dto';
import {
  MilestoneAnalyticsQueryDto,
  TimeRangeEnum,
} from './dto/milestone-analytics-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MilestoneAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive milestone analytics
   */
  async getAnalytics(
    query: MilestoneAnalyticsQueryDto
  ): Promise<MilestoneAnalyticsDto> {
    const dateRange = this.calculateDateRange(query);

    // Build where clause for filtering
    const whereClause: Prisma.ProjectMilestoneWhereInput = {
      ...(query.projectId && { projectId: query.projectId }),
      plannedEndDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    // Fetch all milestones with related data
    const milestones = await this.prisma.projectMilestone.findMany({
      where: whereClause,
      include: {
        project: {
          include: {
            invoices: {
              include: {
                payments: true,
              },
            },
            expenses: true,
          },
        },
      },
      orderBy: [{ plannedEndDate: 'asc' }, { milestoneNumber: 'asc' }],
    });

    // Calculate metrics
    const [
      averagePaymentCycle,
      onTimePaymentRate,
      revenueRecognitionRate,
      projectProfitabilityByPhase,
      cashFlowForecast,
      milestoneMetrics,
    ] = await Promise.all([
      this.calculateAveragePaymentCycle(milestones),
      this.calculateOnTimePaymentRate(milestones),
      this.calculateRevenueRecognitionRate(milestones),
      this.calculateProfitabilityByPhase(milestones),
      this.calculateCashFlowForecast(milestones, dateRange),
      this.calculateMilestoneMetrics(milestones),
    ]);

    return {
      averagePaymentCycle,
      onTimePaymentRate,
      revenueRecognitionRate,
      projectProfitabilityByPhase,
      cashFlowForecast,
      milestoneMetrics,
    };
  }

  /**
   * Calculate date range from query parameters
   */
  private calculateDateRange(query: MilestoneAnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(query.endDate || now);

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      // Calculate based on timeRange
      switch (query.timeRange) {
        case TimeRangeEnum.THIRTY_DAYS:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        case TimeRangeEnum.ONE_YEAR:
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case TimeRangeEnum.NINETY_DAYS:
        default:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 90);
          break;
      }
    }

    return { startDate, endDate };
  }

  /**
   * Calculate average payment cycle (days from invoice to payment)
   */
  private async calculateAveragePaymentCycle(milestones: any[]): Promise<number> {
    const paymentCycles: number[] = [];

    for (const milestone of milestones) {
      const invoices = milestone.project.invoices;

      for (const invoice of invoices) {
        if (invoice.payments && invoice.payments.length > 0) {
          // Get the first payment date (typically the actual payment date)
          const firstPayment = invoice.payments.sort(
            (a: any, b: any) =>
              new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
          )[0];

          const invoiceDate = new Date(invoice.creationDate);
          const paymentDate = new Date(firstPayment.paymentDate);
          const diffTime = paymentDate.getTime() - invoiceDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0) {
            paymentCycles.push(diffDays);
          }
        }
      }
    }

    if (paymentCycles.length === 0) return 0;

    const average =
      paymentCycles.reduce((sum, cycle) => sum + cycle, 0) / paymentCycles.length;
    return Math.round(average);
  }

  /**
   * Calculate on-time payment rate (percentage)
   */
  private async calculateOnTimePaymentRate(milestones: any[]): Promise<number> {
    let totalInvoices = 0;
    let onTimePayments = 0;

    for (const milestone of milestones) {
      const invoices = milestone.project.invoices;

      for (const invoice of invoices) {
        totalInvoices++;

        if (invoice.payments && invoice.payments.length > 0) {
          const firstPayment = invoice.payments.sort(
            (a: any, b: any) =>
              new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
          )[0];

          const dueDate = new Date(invoice.dueDate);
          const paymentDate = new Date(firstPayment.paymentDate);

          if (paymentDate <= dueDate) {
            onTimePayments++;
          }
        }
      }
    }

    if (totalInvoices === 0) return 100;

    return Math.round((onTimePayments / totalInvoices) * 100);
  }

  /**
   * Calculate revenue recognition rate (percentage)
   */
  private async calculateRevenueRecognitionRate(milestones: any[]): Promise<number> {
    let totalPlannedRevenue = 0;
    let totalRecognizedRevenue = 0;

    for (const milestone of milestones) {
      totalPlannedRevenue += Number(milestone.plannedRevenue || 0);
      totalRecognizedRevenue += Number(milestone.recognizedRevenue || 0);
    }

    if (totalPlannedRevenue === 0) return 0;

    return Math.round((totalRecognizedRevenue / totalPlannedRevenue) * 100);
  }

  /**
   * Calculate profitability by phase
   */
  private async calculateProfitabilityByPhase(
    milestones: any[]
  ): Promise<ProfitabilityDataDto[]> {
    const profitabilityMap = new Map<string, ProfitabilityDataDto>();

    for (const milestone of milestones) {
      const milestoneName = milestone.name || `Milestone ${milestone.milestoneNumber}`;

      // Get actual cost from project expenses related to this milestone
      const actualCost = Number(milestone.actualCost || milestone.estimatedCost || 0);

      // Get revenue (planned or recognized)
      const revenue = Number(milestone.recognizedRevenue || milestone.plannedRevenue || 0);

      // Calculate profit and margin
      const profit = revenue - actualCost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      if (profitabilityMap.has(milestoneName)) {
        const existing = profitabilityMap.get(milestoneName)!;
        existing.revenue += revenue;
        existing.cost += actualCost;
        existing.profit += profit;
        existing.profitMargin =
          existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      } else {
        profitabilityMap.set(milestoneName, {
          milestone: milestoneName,
          revenue,
          cost: actualCost,
          profit,
          profitMargin,
        });
      }
    }

    return Array.from(profitabilityMap.values());
  }

  /**
   * Calculate cash flow forecast
   */
  private async calculateCashFlowForecast(
    milestones: any[],
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<CashFlowDataDto[]> {
    const cashFlowMap = new Map<string, CashFlowDataDto>();

    // Group milestones by month
    for (const milestone of milestones) {
      const plannedDate = new Date(milestone.plannedEndDate);
      const monthKey = `${plannedDate.getFullYear()}-${String(plannedDate.getMonth() + 1).padStart(2, '0')}-01`;

      const revenue = Number(milestone.plannedRevenue || 0);
      const recognized = Number(milestone.recognizedRevenue || 0);

      // Check if milestone has been invoiced
      const hasInvoice = milestone.project.invoices.some(
        (inv: any) => inv.projectId === milestone.projectId
      );

      // Check if payment received
      const hasPayment = milestone.project.invoices.some((inv: any) =>
        inv.payments?.some((p: any) => p.status === 'COMPLETED')
      );

      if (cashFlowMap.has(monthKey)) {
        const existing = cashFlowMap.get(monthKey)!;
        existing.expectedInflow += revenue;
        existing.actualInflow += hasPayment ? revenue : 0;
        existing.forecastedInflow += hasInvoice ? revenue : revenue * 0.9; // 90% forecast if not invoiced
      } else {
        cashFlowMap.set(monthKey, {
          date: monthKey,
          expectedInflow: revenue,
          actualInflow: hasPayment ? revenue : 0,
          forecastedInflow: hasInvoice ? revenue : revenue * 0.9,
        });
      }
    }

    // Sort by date and return
    return Array.from(cashFlowMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  /**
   * Calculate milestone metrics for table display
   */
  private async calculateMilestoneMetrics(
    milestones: any[]
  ): Promise<MilestoneMetricDto[]> {
    const metrics: MilestoneMetricDto[] = [];

    for (const milestone of milestones) {
      // Find related invoice
      const relatedInvoice = milestone.project.invoices.find(
        (inv: any) => inv.projectId === milestone.projectId
      );

      // Find payment
      const payment = relatedInvoice?.payments?.[0];

      // Calculate status
      let status: MilestoneMetricDto['status'] = 'PENDING';
      if (payment?.status === 'COMPLETED') {
        status = 'PAID';
      } else if (relatedInvoice) {
        status = 'INVOICED';
      } else if (milestone.status === 'COMPLETED' || milestone.status === 'ACCEPTED') {
        const dueDate = new Date(milestone.plannedEndDate);
        const now = new Date();
        if (now > dueDate) {
          status = 'OVERDUE';
        }
      }

      // Calculate days to payment
      let daysToPayment: number | undefined;
      if (relatedInvoice && payment) {
        const invoiceDate = new Date(relatedInvoice.creationDate);
        const paymentDate = new Date(payment.paymentDate);
        const diffTime = paymentDate.getTime() - invoiceDate.getTime();
        daysToPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      metrics.push({
        id: milestone.id,
        milestoneNumber: milestone.milestoneNumber,
        name: milestone.name || `Milestone ${milestone.milestoneNumber}`,
        amount: Number(milestone.plannedRevenue || 0),
        dueDate: milestone.plannedEndDate.toISOString().split('T')[0],
        invoicedDate: relatedInvoice
          ? relatedInvoice.creationDate.toISOString().split('T')[0]
          : undefined,
        paidDate: payment
          ? new Date(payment.paymentDate).toISOString().split('T')[0]
          : undefined,
        daysToPayment,
        status,
        revenueRecognized: Number(milestone.recognizedRevenue || 0),
      });
    }

    return metrics;
  }
}
