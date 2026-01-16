import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * PSAK 72 Compliance Reports Service
 *
 * Generates financial reports compliant with Indonesian accounting standard PSAK 72
 * (Revenue from Contracts with Customers).
 *
 * Reports:
 * 1. Revenue Recognition Summary - revenue recognized by period
 * 2. Contract Performance Obligations - open vs satisfied obligations
 * 3. Deferred Revenue Aging - revenue received but not earned
 * 4. Milestone Completion Analysis - planned vs actual milestone completion
 * 5. Project Profitability - revenue vs costs by milestone
 */
@Injectable()
export class PSAK72ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Revenue Recognition Summary Report
   *
   * Shows revenue recognized during a specified period.
   * Useful for financial statements and P&L reporting.
   *
   * @param startDate Period start date
   * @param endDate Period end date
   * @returns Revenue recognition summary
   */
  async getRevenueRecognitionSummary(startDate: Date, endDate: Date) {
    // Get all milestones completed in the period
    const completedMilestones = await this.prisma.projectMilestone.findMany({
      where: {
        status: {
          in: ["COMPLETED", "ACCEPTED"],
        },
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    // Calculate totals
    const totalRecognized = completedMilestones.reduce(
      (sum, m) => sum + Number(m.recognizedRevenue),
      0,
    );

    // Group by project
    const byProject = this.groupByProject(completedMilestones);

    // Group by client
    const byClient = this.groupByClient(completedMilestones);

    return {
      period: { startDate, endDate },
      summary: {
        totalMilestones: completedMilestones.length,
        totalRevenue: totalRecognized,
        averagePerMilestone:
          completedMilestones.length > 0
            ? totalRecognized / completedMilestones.length
            : 0,
      },
      byProject,
      byClient,
      details: completedMilestones.map((m) => ({
        milestoneId: m.id,
        projectName: m.project.description,
        clientName: m.project.client.name,
        milestoneName: m.name,
        completionPercentage: Number(m.completionPercentage),
        plannedRevenue: Number(m.plannedRevenue),
        recognizedRevenue: Number(m.recognizedRevenue),
        completedAt: m.updatedAt,
      })),
    };
  }

  /**
   * Contract Performance Obligations Report
   *
   * Shows performance obligations (milestones) that are open vs satisfied.
   * Useful for understanding project progress and revenue recognition potential.
   *
   * @param projectId Optional: if provided, returns only for this project
   * @returns Performance obligations status
   */
  async getPerformanceObligations(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const allMilestones = await this.prisma.projectMilestone.findMany({
      where: {
        ...where,
        status: {
          notIn: ["CANCELLED"],
        },
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    const pending = allMilestones.filter((m) => m.status === "PENDING");
    const inProgress = allMilestones.filter((m) => m.status === "IN_PROGRESS");
    const satisfied = allMilestones.filter((m) =>
      ["COMPLETED", "ACCEPTED"].includes(m.status),
    );

    const totalPlannedRevenue = allMilestones.reduce(
      (sum, m) => sum + Number(m.plannedRevenue),
      0,
    );
    const totalRecognizedRevenue = allMilestones.reduce(
      (sum, m) => sum + Number(m.recognizedRevenue),
      0,
    );
    const totalUnsatisfied = allMilestones
      .filter((m) => !["COMPLETED", "ACCEPTED"].includes(m.status))
      .reduce((sum, m) => sum + Number(m.remainingRevenue), 0);

    return {
      summary: {
        totalObligations: allMilestones.length,
        pending: pending.length,
        inProgress: inProgress.length,
        satisfied: satisfied.length,
        totalPlannedRevenue,
        totalRecognizedRevenue,
        totalUnsatisfied,
        satisfactionRate:
          allMilestones.length > 0
            ? parseFloat(
                ((satisfied.length / allMilestones.length) * 100).toFixed(2),
              )
            : 0,
      },
      byStatus: {
        pending: pending.map(this.formatMilestoneForReport),
        inProgress: inProgress.map(this.formatMilestoneForReport),
        satisfied: satisfied.map(this.formatMilestoneForReport),
      },
    };
  }

  /**
   * Deferred Revenue Aging Report
   *
   * Shows revenue received in advance that hasn't been recognized yet.
   * Important for liability tracking and cash flow analysis.
   *
   * @returns Deferred revenue aging analysis
   */
  async getDeferredRevenueAging() {
    const deferredRevenues = await this.prisma.deferredRevenue.findMany({
      where: {
        status: {
          in: ["DEFERRED", "PARTIALLY_RECOGNIZED"],
        },
      },
      include: {
        invoice: {
          include: {
            client: true,
            project: true,
          },
        },
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const lessThan30Days = deferredRevenues.filter(
      (dr) => dr.paymentDate >= thirtyDaysAgo,
    );
    const thirtyTo60Days = deferredRevenues.filter(
      (dr) => dr.paymentDate < thirtyDaysAgo && dr.paymentDate >= sixtyDaysAgo,
    );
    const sixtyTo90Days = deferredRevenues.filter(
      (dr) => dr.paymentDate < sixtyDaysAgo && dr.paymentDate >= ninetyDaysAgo,
    );
    const over90Days = deferredRevenues.filter(
      (dr) => dr.paymentDate < ninetyDaysAgo,
    );

    const totalDeferred = deferredRevenues.reduce(
      (sum, dr) => sum + Number(dr.remainingAmount),
      0,
    );

    return {
      summary: {
        totalDeferred,
        count: deferredRevenues.length,
        averagePerInvoice:
          deferredRevenues.length > 0
            ? totalDeferred / deferredRevenues.length
            : 0,
      },
      byAge: {
        lessThan30Days: {
          count: lessThan30Days.length,
          total: lessThan30Days.reduce(
            (sum, dr) => sum + Number(dr.remainingAmount),
            0,
          ),
          details: lessThan30Days.map(this.formatDeferredRevenueForReport),
        },
        thirtyTo60Days: {
          count: thirtyTo60Days.length,
          total: thirtyTo60Days.reduce(
            (sum, dr) => sum + Number(dr.remainingAmount),
            0,
          ),
          details: thirtyTo60Days.map(this.formatDeferredRevenueForReport),
        },
        sixtyTo90Days: {
          count: sixtyTo90Days.length,
          total: sixtyTo90Days.reduce(
            (sum, dr) => sum + Number(dr.remainingAmount),
            0,
          ),
          details: sixtyTo90Days.map(this.formatDeferredRevenueForReport),
        },
        over90Days: {
          count: over90Days.length,
          total: over90Days.reduce(
            (sum, dr) => sum + Number(dr.remainingAmount),
            0,
          ),
          details: over90Days.map(this.formatDeferredRevenueForReport),
        },
      },
    };
  }

  /**
   * Milestone Completion Analysis Report
   *
   * Compares planned vs actual milestone completion.
   * Useful for project tracking and budget variance analysis.
   *
   * @param projectId Optional: if provided, analyzes only this project
   * @returns Milestone completion variance analysis
   */
  async getMilestoneCompletionAnalysis(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const milestones = await this.prisma.projectMilestone.findMany({
      where: {
        ...where,
        status: {
          notIn: ["CANCELLED"],
        },
      },
      include: {
        project: true,
      },
    });

    const analysis = milestones.map((m) => {
      const plannedDuration =
        m.plannedEndDate && m.plannedStartDate
          ? m.plannedEndDate.getTime() - m.plannedStartDate.getTime()
          : null;
      const actualDuration =
        m.actualEndDate && m.actualStartDate
          ? m.actualEndDate.getTime() - m.actualStartDate.getTime()
          : null;
      const delay = m.delayDays || 0;

      return {
        milestoneId: m.id,
        projectNumber: m.project.number,
        milestoneName: m.name,
        status: m.status,
        plannedStartDate: m.plannedStartDate,
        plannedEndDate: m.plannedEndDate,
        actualStartDate: m.actualStartDate,
        actualEndDate: m.actualEndDate,
        completionPercentage: Number(m.completionPercentage),
        plannedRevenue: Number(m.plannedRevenue),
        recognizedRevenue: Number(m.recognizedRevenue),
        plannedCost: m.estimatedCost ? Number(m.estimatedCost) : null,
        actualCost: m.actualCost ? Number(m.actualCost) : null,
        costVariance:
          m.estimatedCost && m.actualCost
            ? Number(m.actualCost) - Number(m.estimatedCost)
            : null,
        delayDays: delay,
        durationVariancePercent:
          plannedDuration && actualDuration
            ? parseFloat(
                (
                  ((actualDuration - plannedDuration) / plannedDuration) *
                  100
                ).toFixed(2),
              )
            : null,
      };
    });

    const totalPlanned = milestones.reduce(
      (sum, m) => sum + Number(m.plannedRevenue),
      0,
    );
    const totalRecognized = milestones.reduce(
      (sum, m) => sum + Number(m.recognizedRevenue),
      0,
    );
    const totalPlannedCost = milestones.reduce(
      (sum, m) => sum + (m.estimatedCost ? Number(m.estimatedCost) : 0),
      0,
    );
    const totalActualCost = milestones.reduce(
      (sum, m) => sum + (m.actualCost ? Number(m.actualCost) : 0),
      0,
    );

    return {
      summary: {
        totalMilestones: milestones.length,
        totalPlannedRevenue: totalPlanned,
        totalRecognizedRevenue: totalRecognized,
        revenueVariance: totalRecognized - totalPlanned,
        revenueVariancePercent:
          totalPlanned > 0
            ? parseFloat(
                (
                  ((totalRecognized - totalPlanned) / totalPlanned) *
                  100
                ).toFixed(2),
              )
            : 0,
        totalPlannedCost,
        totalActualCost,
        costVariance: totalActualCost - totalPlannedCost,
        averageDelayDays:
          milestones.length > 0
            ? milestones.reduce((sum, m) => sum + (m.delayDays || 0), 0) /
              milestones.length
            : 0,
      },
      details: analysis,
    };
  }

  /**
   * Project Profitability Report
   *
   * Analyzes revenue vs costs for each milestone in a project.
   * Useful for understanding project profitability and margins.
   *
   * @param projectId Project ID to analyze
   * @returns Project profitability breakdown by milestone
   */
  async getProjectProfitabilityByMilestone(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          where: {
            status: {
              notIn: ["CANCELLED"],
            },
          },
          include: {
            paymentMilestones: true,
          },
        },
        expenses: {
          where: {
            status: {
              in: ["APPROVED", "PAID"],
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const milestoneAnalysis = project.milestones.map((m) => {
      const revenue = Number(m.recognizedRevenue) || Number(m.plannedRevenue);
      const cost = m.actualCost
        ? Number(m.actualCost)
        : Number(m.estimatedCost || 0);
      const profit = revenue - cost;
      const margin =
        revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(2)) : 0;

      return {
        milestoneId: m.id,
        milestoneName: m.name,
        status: m.status,
        revenue,
        cost,
        profit,
        marginPercent: margin,
        completionPercent: Number(m.completionPercentage),
      };
    });

    const totalRevenue = milestoneAnalysis.reduce(
      (sum, m) => sum + m.revenue,
      0,
    );
    const totalCost = milestoneAnalysis.reduce((sum, m) => sum + m.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const averageMargin =
      totalRevenue > 0
        ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      project: {
        id: project.id,
        number: project.number,
        description: project.description,
      },
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        averageMarginPercent: averageMargin,
        milestoneCount: milestoneAnalysis.length,
      },
      milestones: milestoneAnalysis,
    };
  }

  // ============ Helper Methods ============

  private groupByProject(
    milestones: Array<{
      id: string;
      name: string;
      recognizedRevenue: any;
      project: { description: string };
    }>,
  ) {
    const grouped: Record<string, { count: number; total: number }> = {};

    milestones.forEach((m) => {
      if (!grouped[m.project.description]) {
        grouped[m.project.description] = { count: 0, total: 0 };
      }
      grouped[m.project.description].count += 1;
      grouped[m.project.description].total += Number(m.recognizedRevenue);
    });

    return grouped;
  }

  private groupByClient(
    milestones: Array<{
      id: string;
      name: string;
      recognizedRevenue: any;
      project: { client: { name: string } };
    }>,
  ) {
    const grouped: Record<string, { count: number; total: number }> = {};

    milestones.forEach((m) => {
      const clientName = m.project.client.name;
      if (!grouped[clientName]) {
        grouped[clientName] = { count: 0, total: 0 };
      }
      grouped[clientName].count += 1;
      grouped[clientName].total += Number(m.recognizedRevenue);
    });

    return grouped;
  }

  private formatMilestoneForReport(m: any) {
    return {
      milestoneId: m.id,
      projectName: m.project.description,
      clientName: m.project.client.name,
      milestoneName: m.name,
      plannedRevenue: Number(m.plannedRevenue),
      recognizedRevenue: Number(m.recognizedRevenue),
      remainingRevenue: Number(m.remainingRevenue),
      completionPercent: Number(m.completionPercentage),
      status: m.status,
    };
  }

  private formatDeferredRevenueForReport(dr: any) {
    return {
      deferredRevenueId: dr.id,
      invoiceNumber: dr.invoice.invoiceNumber,
      clientName: dr.invoice.client.name,
      projectName: dr.invoice.project.description,
      paymentDate: dr.paymentDate,
      totalAmount: Number(dr.totalAmount),
      recognizedAmount: Number(dr.recognizedAmount),
      remainingAmount: Number(dr.remainingAmount),
      status: dr.status,
      completionPercent: Number(dr.completionPercentage),
    };
  }
}
