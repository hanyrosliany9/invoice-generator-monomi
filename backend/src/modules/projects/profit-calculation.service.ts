import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

export interface ProfitMetrics {
  totalDirectCosts: number;
  totalIndirectCosts: number;
  totalAllocatedCosts: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  grossProfit: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  budgetVariance: number;
  budgetVariancePercent: number;
  profitCalculatedAt: Date;
}

@Injectable()
export class ProfitCalculationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate comprehensive profit metrics for a project
   * Integrates with PSAK 57 WIP tracking and cost allocations
   */
  async calculateProjectProfitMargin(
    projectId: string,
    calculatedBy?: string,
  ): Promise<ProfitMetrics> {
    // 1. Get total revenue from invoices
    const revenue = await this.calculateTotalRevenue(projectId);

    // 2. Get direct costs
    const directCosts = await this.calculateDirectCosts(projectId);

    // 3. Get indirect costs (allocated overhead)
    const indirectCosts = await this.calculateIndirectCosts(projectId);

    // 4. Calculate profit metrics
    const totalCosts = directCosts.total + indirectCosts.total;
    const grossProfit = revenue.paid - directCosts.total;
    const netProfit = revenue.paid - totalCosts;

    const grossMargin =
      revenue.paid > 0 ? (grossProfit / revenue.paid) * 100 : 0;
    const netMargin = revenue.paid > 0 ? (netProfit / revenue.paid) * 100 : 0;

    // 5. Calculate budget variance
    const budgetVariance = await this.calculateBudgetVariance(
      projectId,
      totalCosts,
    );

    // 6. Prepare metrics object
    const metrics: ProfitMetrics = {
      totalDirectCosts: directCosts.total,
      totalIndirectCosts: indirectCosts.total,
      totalAllocatedCosts: totalCosts,
      totalInvoicedAmount: revenue.invoiced,
      totalPaidAmount: revenue.paid,
      grossProfit,
      netProfit,
      grossMarginPercent: grossMargin,
      netMarginPercent: netMargin,
      budgetVariance: budgetVariance.amount,
      budgetVariancePercent: budgetVariance.percent,
      profitCalculatedAt: new Date(),
    };

    // 7. Update project record
    await this.updateProjectProfitMetrics(projectId, metrics, calculatedBy);

    return metrics;
  }

  /**
   * Calculate total revenue from invoices
   * Indonesian compliance: Count both PAID_OFF and PARTIALLY_PAID invoices
   */
  private async calculateTotalRevenue(
    projectId: string,
  ): Promise<{ invoiced: number; paid: number }> {
    const invoices = await this.prisma.invoice.findMany({
      where: { projectId },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    // Total invoiced amount (all invoices)
    const invoiced = invoices.reduce(
      (sum, inv) => sum + this.toNumber(inv.totalAmount),
      0,
    );

    // Only count paid invoices for profit calculation
    const paid = invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + this.toNumber(inv.totalAmount), 0);

    return { invoiced, paid };
  }

  /**
   * Calculate direct costs from:
   * 1. ProjectCostAllocation (isDirect = true)
   * 2. WorkInProgress direct cost fields (PSAK 57)
   */
  private async calculateDirectCosts(
    projectId: string,
  ): Promise<{ allocated: number; wip: number; total: number }> {
    // Direct allocated expenses
    const allocations = await this.prisma.projectCostAllocation.findMany({
      where: {
        projectId,
        isDirect: true,
        costType: { in: ["MATERIAL", "LABOR"] },
      },
      select: { allocatedAmount: true },
    });

    const allocatedDirect = allocations.reduce(
      (sum, alloc) => sum + this.toNumber(alloc.allocatedAmount),
      0,
    );

    // WIP direct costs (PSAK 57 compliant)
    const wip = await this.prisma.workInProgress.findMany({
      where: { projectId, isCompleted: false },
      select: {
        directMaterialCost: true,
        directLaborCost: true,
        directExpenses: true,
      },
    });

    const wipDirect = wip.reduce(
      (sum, w) =>
        sum +
        this.toNumber(w.directMaterialCost) +
        this.toNumber(w.directLaborCost) +
        this.toNumber(w.directExpenses),
      0,
    );

    return {
      allocated: allocatedDirect,
      wip: wipDirect,
      total: allocatedDirect + wipDirect,
    };
  }

  /**
   * Calculate indirect costs (overhead allocation)
   */
  private async calculateIndirectCosts(
    projectId: string,
  ): Promise<{ allocated: number; wip: number; total: number }> {
    // Indirect allocated expenses
    const allocations = await this.prisma.projectCostAllocation.findMany({
      where: {
        projectId,
        isDirect: false,
        costType: "OVERHEAD",
      },
      select: { allocatedAmount: true },
    });

    const allocated = allocations.reduce(
      (sum, alloc) => sum + this.toNumber(alloc.allocatedAmount),
      0,
    );

    // WIP allocated overhead (PSAK 57)
    const wip = await this.prisma.workInProgress.findMany({
      where: { projectId, isCompleted: false },
      select: { allocatedOverhead: true },
    });

    const wipOverhead = wip.reduce(
      (sum, w) => sum + this.toNumber(w.allocatedOverhead),
      0,
    );

    return {
      allocated,
      wip: wipOverhead,
      total: allocated + wipOverhead,
    };
  }

  /**
   * Calculate budget variance
   */
  private async calculateBudgetVariance(
    projectId: string,
    actualCosts: number,
  ): Promise<{ amount: number; percent: number }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { estimatedBudget: true },
    });

    const estimated = this.toNumber(project?.estimatedBudget || 0);
    const variance = actualCosts - estimated;
    const percent = estimated > 0 ? (variance / estimated) * 100 : 0;

    return { amount: variance, percent };
  }

  /**
   * Update project with calculated profit metrics
   */
  private async updateProjectProfitMetrics(
    projectId: string,
    metrics: ProfitMetrics,
    calculatedBy?: string,
  ) {
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        totalDirectCosts: new Decimal(metrics.totalDirectCosts),
        totalIndirectCosts: new Decimal(metrics.totalIndirectCosts),
        totalAllocatedCosts: new Decimal(metrics.totalAllocatedCosts),
        totalInvoicedAmount: new Decimal(metrics.totalInvoicedAmount),
        totalPaidAmount: new Decimal(metrics.totalPaidAmount),
        grossProfit: new Decimal(metrics.grossProfit),
        netProfit: new Decimal(metrics.netProfit),
        grossMarginPercent: new Decimal(metrics.grossMarginPercent),
        netMarginPercent: new Decimal(metrics.netMarginPercent),
        budgetVariance: new Decimal(metrics.budgetVariance),
        budgetVariancePercent: new Decimal(metrics.budgetVariancePercent),
        profitCalculatedAt: metrics.profitCalculatedAt,
        profitCalculatedBy: calculatedBy,
      },
    });
  }

  /**
   * Recalculate profit margins for all active projects
   * Use for scheduled jobs (daily recalculation)
   *
   * FIX 2 (N+1): batch-load all needed relations in parallel with WHERE IN (...)
   * queries, then compute each project in memory instead of issuing 5+ queries
   * per project serially.  calculateProjectProfitMargin is still used for
   * single-project updates (its DB queries are fine for one project).
   */
  async recalculateAllProjects(): Promise<{ processed: number }> {
    const projects = await this.prisma.project.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "PLANNING"] },
      },
      select: { id: true, estimatedBudget: true },
    });

    if (projects.length === 0) return { processed: 0 };

    const projectIds = projects.map((p) => p.id);

    // Batch-load all relations in parallel — one query per relation type
    const [invoices, directAllocations, indirectAllocations, wipEntries] =
      await Promise.all([
        this.prisma.invoice.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, totalAmount: true, status: true },
        }),
        this.prisma.projectCostAllocation.findMany({
          where: {
            projectId: { in: projectIds },
            isDirect: true,
            costType: { in: ["MATERIAL", "LABOR"] },
          },
          select: { projectId: true, allocatedAmount: true },
        }),
        this.prisma.projectCostAllocation.findMany({
          where: {
            projectId: { in: projectIds },
            isDirect: false,
            costType: "OVERHEAD",
          },
          select: { projectId: true, allocatedAmount: true },
        }),
        this.prisma.workInProgress.findMany({
          where: { projectId: { in: projectIds }, isCompleted: false },
          select: {
            projectId: true,
            directMaterialCost: true,
            directLaborCost: true,
            directExpenses: true,
            allocatedOverhead: true,
          },
        }),
      ]);

    // Group by projectId for O(1) lookup
    const invoicesByProject = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      const list = invoicesByProject.get(inv.projectId) ?? [];
      list.push(inv);
      invoicesByProject.set(inv.projectId, list);
    }

    const directByProject = new Map<string, typeof directAllocations>();
    for (const a of directAllocations) {
      const list = directByProject.get(a.projectId) ?? [];
      list.push(a);
      directByProject.set(a.projectId, list);
    }

    const indirectByProject = new Map<string, typeof indirectAllocations>();
    for (const a of indirectAllocations) {
      const list = indirectByProject.get(a.projectId) ?? [];
      list.push(a);
      indirectByProject.set(a.projectId, list);
    }

    const wipByProject = new Map<string, typeof wipEntries>();
    for (const w of wipEntries) {
      const list = wipByProject.get(w.projectId) ?? [];
      list.push(w);
      wipByProject.set(w.projectId, list);
    }

    // Compute per-project metrics in memory using the same formulas as
    // calculateProjectProfitMargin / calculateDirectCosts / calculateIndirectCosts
    const updates: Array<{ projectId: string; metrics: ProfitMetrics }> = [];

    for (const project of projects) {
      const pid = project.id;

      // Revenue
      const projInvoices = invoicesByProject.get(pid) ?? [];
      const invoiced = projInvoices.reduce(
        (sum, inv) => sum + this.toNumber(inv.totalAmount),
        0,
      );
      const paid = projInvoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + this.toNumber(inv.totalAmount), 0);

      // Direct costs
      const allocatedDirect = (directByProject.get(pid) ?? []).reduce(
        (sum, a) => sum + this.toNumber(a.allocatedAmount),
        0,
      );
      const projWip = wipByProject.get(pid) ?? [];
      const wipDirect = projWip.reduce(
        (sum, w) =>
          sum +
          this.toNumber(w.directMaterialCost) +
          this.toNumber(w.directLaborCost) +
          this.toNumber(w.directExpenses),
        0,
      );
      const totalDirectCosts = allocatedDirect + wipDirect;

      // Indirect costs
      const allocatedIndirect = (indirectByProject.get(pid) ?? []).reduce(
        (sum, a) => sum + this.toNumber(a.allocatedAmount),
        0,
      );
      const wipOverhead = projWip.reduce(
        (sum, w) => sum + this.toNumber(w.allocatedOverhead),
        0,
      );
      const totalIndirectCosts = allocatedIndirect + wipOverhead;

      const totalCosts = totalDirectCosts + totalIndirectCosts;
      const grossProfit = paid - totalDirectCosts;
      const netProfit = paid - totalCosts;
      const grossMargin = paid > 0 ? (grossProfit / paid) * 100 : 0;
      const netMargin = paid > 0 ? (netProfit / paid) * 100 : 0;

      // Budget variance
      const estimated = this.toNumber(project.estimatedBudget ?? 0);
      const varianceAmount = totalCosts - estimated;
      const variancePercent = estimated > 0 ? (varianceAmount / estimated) * 100 : 0;

      const metrics: ProfitMetrics = {
        totalDirectCosts,
        totalIndirectCosts,
        totalAllocatedCosts: totalCosts,
        totalInvoicedAmount: invoiced,
        totalPaidAmount: paid,
        grossProfit,
        netProfit,
        grossMarginPercent: grossMargin,
        netMarginPercent: netMargin,
        budgetVariance: varianceAmount,
        budgetVariancePercent: variancePercent,
        profitCalculatedAt: new Date(),
      };

      updates.push({ projectId: pid, metrics });
    }

    // Write updates — still per-project (no bulk upsert in Prisma without $queryRaw)
    for (const { projectId, metrics } of updates) {
      await this.updateProjectProfitMetrics(projectId, metrics, "SYSTEM");
    }

    return { processed: projects.length };
  }

  /**
   * Get cost breakdown for a project
   */
  async getCostBreakdown(projectId: string) {
    const direct = await this.calculateDirectCosts(projectId);
    const indirect = await this.calculateIndirectCosts(projectId);

    return {
      direct: {
        materials: direct.allocated * 0.4, // Rough estimate, can be refined
        labor: direct.allocated * 0.4,
        expenses: direct.wip,
        total: direct.total,
      },
      indirect: {
        overhead: indirect.wip,
        allocated: indirect.allocated,
        total: indirect.total,
      },
      total: direct.total + indirect.total,
    };
  }

  /**
   * Helper: Convert Prisma Decimal to number
   */
  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (value instanceof Decimal) return value.toNumber();
    return parseFloat(value.toString()) || 0;
  }

  /**
   * Check if project needs profit recalculation
   * Returns true if never calculated or older than 24 hours
   */
  async needsRecalculation(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { profitCalculatedAt: true },
    });

    if (!project?.profitCalculatedAt) return true;

    const daysSinceCalc = Math.floor(
      (Date.now() - project.profitCalculatedAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return daysSinceCalc > 0; // Recalculate if more than 1 day old
  }
}
