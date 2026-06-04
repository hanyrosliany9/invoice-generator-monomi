import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  MilestoneAnalyticsDto,
  ProfitabilityDataDto,
  CashFlowDataDto,
  MilestoneMetricDto,
} from "./dto/milestone-analytics.dto";
import {
  MilestoneAnalyticsQueryDto,
  TimeRangeEnum,
} from "./dto/milestone-analytics-query.dto";
import { Prisma } from "@prisma/client";

/**
 * Milestone analytics are derived from PAYMENT milestones (termin) — the
 * structured payment terms that already exist on every quotation/invoice.
 * There is no separate manual "project milestone" entry; setting termin on a
 * quotation (e.g. DP 30% / Pelunasan 70%) auto-populates these analytics.
 *
 * Each PaymentMilestone carries: paymentAmount, paymentPercentage, isInvoiced,
 * an optional dueDate, the owning quotation→project→client, and the invoices
 * generated for it (each with its payments). All metrics below are computed
 * from that graph.
 */
@Injectable()
export class MilestoneAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(
    query: MilestoneAnalyticsQueryDto,
  ): Promise<MilestoneAnalyticsDto> {
    const dateRange = this.calculateDateRange(query);

    // Filter by creation date (always present) and, optionally, the project the
    // owning quotation belongs to. Payment milestones often have no dueDate, so
    // createdAt is the reliable window field.
    const whereClause: Prisma.PaymentMilestoneWhereInput = {
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      ...(query.projectId && {
        quotation: { projectId: query.projectId },
      }),
    };

    const milestones = await this.prisma.paymentMilestone.findMany({
      where: whereClause,
      include: {
        quotation: {
          include: { project: true, client: true },
        },
        invoices: {
          include: { payments: true },
        },
      },
      orderBy: [{ createdAt: "asc" }, { milestoneNumber: "asc" }],
    });

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
      this.calculateCashFlowForecast(milestones),
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

  private calculateDateRange(query: MilestoneAnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const endDate: Date = new Date(query.endDate || now);
    let startDate: Date;

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
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

  /** First (earliest) payment across a milestone's invoices, if any. */
  private firstPayment(milestone: any): any | null {
    const payments: any[] = [];
    for (const inv of milestone.invoices ?? []) {
      for (const p of inv.payments ?? []) payments.push(p);
    }
    if (payments.length === 0) return null;
    return payments.sort(
      (a, b) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
    )[0];
  }

  /** Earliest invoice linked to a milestone, if any. */
  private firstInvoice(milestone: any): any | null {
    const invoices: any[] = milestone.invoices ?? [];
    if (invoices.length === 0) return null;
    return [...invoices].sort(
      (a, b) =>
        new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime(),
    )[0];
  }

  private isPaid(milestone: any): boolean {
    return (milestone.invoices ?? []).some((inv: any) =>
      (inv.payments ?? []).some(
        (p: any) => String(p.status).toUpperCase() === "COMPLETED",
      ),
    );
  }

  /** Average days from invoice issue to first payment, across all milestones. */
  private async calculateAveragePaymentCycle(
    milestones: any[],
  ): Promise<number> {
    const cycles: number[] = [];
    for (const m of milestones) {
      for (const inv of m.invoices ?? []) {
        if (!inv.payments || inv.payments.length === 0) continue;
        const firstPayment = [...inv.payments].sort(
          (a: any, b: any) =>
            new Date(a.paymentDate).getTime() -
            new Date(b.paymentDate).getTime(),
        )[0];
        const invoiceDate = new Date(inv.creationDate);
        const paymentDate = new Date(firstPayment.paymentDate);
        const diffDays = Math.ceil(
          (paymentDate.getTime() - invoiceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 0) cycles.push(diffDays);
      }
    }
    if (cycles.length === 0) return 0;
    return Math.round(cycles.reduce((s, c) => s + c, 0) / cycles.length);
  }

  /** Percentage of paid milestone-invoices that were paid on or before due. */
  private async calculateOnTimePaymentRate(milestones: any[]): Promise<number> {
    let total = 0;
    let onTime = 0;
    for (const m of milestones) {
      for (const inv of m.invoices ?? []) {
        if (!inv.payments || inv.payments.length === 0) continue;
        total++;
        const firstPayment = [...inv.payments].sort(
          (a: any, b: any) =>
            new Date(a.paymentDate).getTime() -
            new Date(b.paymentDate).getTime(),
        )[0];
        const due = inv.dueDate ? new Date(inv.dueDate) : null;
        const paid = new Date(firstPayment.paymentDate);
        if (!due || paid <= due) onTime++;
      }
    }
    if (total === 0) return 100;
    return Math.round((onTime / total) * 100);
  }

  /** Recognized revenue = invoiced milestone value ÷ total milestone value. */
  private async calculateRevenueRecognitionRate(
    milestones: any[],
  ): Promise<number> {
    let totalPlanned = 0;
    let totalRecognized = 0;
    for (const m of milestones) {
      const amount = Number(m.paymentAmount || 0);
      totalPlanned += amount;
      if (m.isInvoiced || (m.invoices ?? []).length > 0) {
        totalRecognized += amount;
      }
    }
    if (totalPlanned === 0) return 0;
    return Math.round((totalRecognized / totalPlanned) * 100);
  }

  /** Group milestone value by phase name (DP, Pelunasan, …). */
  private async calculateProfitabilityByPhase(
    milestones: any[],
  ): Promise<ProfitabilityDataDto[]> {
    const map = new Map<string, ProfitabilityDataDto>();
    for (const m of milestones) {
      const name = m.nameId || m.name || `Termin ${m.milestoneNumber}`;
      const revenue = Number(m.paymentAmount || 0);
      // Payment milestones do not carry a per-phase cost; profit == revenue.
      const cost = 0;
      const profit = revenue - cost;
      const existing = map.get(name);
      if (existing) {
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit += profit;
        existing.profitMargin =
          existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      } else {
        map.set(name, {
          milestone: name,
          revenue,
          cost,
          profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        });
      }
    }
    return Array.from(map.values());
  }

  /** Monthly inflow forecast, bucketed by the milestone's expected date. */
  private async calculateCashFlowForecast(
    milestones: any[],
  ): Promise<CashFlowDataDto[]> {
    const map = new Map<string, CashFlowDataDto>();
    for (const m of milestones) {
      // Expected date: milestone dueDate → its invoice dueDate → createdAt.
      const inv = this.firstInvoice(m);
      const when =
        (m.dueDate && new Date(m.dueDate)) ||
        (inv?.dueDate && new Date(inv.dueDate)) ||
        new Date(m.createdAt);
      const monthKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-01`;

      const revenue = Number(m.paymentAmount || 0);
      const invoiced = m.isInvoiced || (m.invoices ?? []).length > 0;
      const paid = this.isPaid(m);

      const existing = map.get(monthKey);
      if (existing) {
        existing.expectedInflow += revenue;
        existing.actualInflow += paid ? revenue : 0;
        existing.forecastedInflow += invoiced ? revenue : revenue * 0.9;
      } else {
        map.set(monthKey, {
          date: monthKey,
          expectedInflow: revenue,
          actualInflow: paid ? revenue : 0,
          forecastedInflow: invoiced ? revenue : revenue * 0.9,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Per-milestone rows for the table. */
  private async calculateMilestoneMetrics(
    milestones: any[],
  ): Promise<MilestoneMetricDto[]> {
    const metrics: MilestoneMetricDto[] = [];
    const now = new Date();

    for (const m of milestones) {
      const relatedInvoice = this.firstInvoice(m);
      const payment = this.firstPayment(m);
      const invoiced = m.isInvoiced || !!relatedInvoice;

      let status: MilestoneMetricDto["status"] = "PENDING";
      if (this.isPaid(m)) {
        status = "PAID";
      } else if (invoiced) {
        status = "INVOICED";
      }
      // Overdue: a due date has passed and it has not been paid.
      const due =
        (m.dueDate && new Date(m.dueDate)) ||
        (relatedInvoice?.dueDate && new Date(relatedInvoice.dueDate)) ||
        null;
      if (status !== "PAID" && due && now > due) {
        status = "OVERDUE";
      }

      let daysToPayment: number | undefined;
      if (relatedInvoice && payment) {
        const invoiceDate = new Date(relatedInvoice.creationDate);
        const paymentDate = new Date(payment.paymentDate);
        daysToPayment = Math.ceil(
          (paymentDate.getTime() - invoiceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }

      const amount = Number(m.paymentAmount || 0);
      metrics.push({
        id: m.id,
        milestoneNumber: m.milestoneNumber,
        name: m.nameId || m.name || `Termin ${m.milestoneNumber}`,
        amount,
        dueDate: due
          ? due.toISOString().split("T")[0]
          : new Date(m.createdAt).toISOString().split("T")[0],
        invoicedDate: relatedInvoice
          ? new Date(relatedInvoice.creationDate).toISOString().split("T")[0]
          : undefined,
        paidDate: payment
          ? new Date(payment.paymentDate).toISOString().split("T")[0]
          : undefined,
        daysToPayment,
        status,
        revenueRecognized: invoiced ? amount : 0,
        projectId: m.quotation?.project?.id,
      });
    }

    return metrics;
  }
}
