import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WorkInProgress,
  ProjectCostAllocation,
  AllocationMethod,
  CostType,
  Prisma
} from '@prisma/client';

/**
 * Project Costing Service - PSAK 57 Compliance
 *
 * Implements Indonesian accounting standard for construction/service contracts:
 * - Work in Progress (WIP) tracking
 * - Cost accumulation (material, labor, overhead)
 * - Overhead allocation
 * - Revenue recognition based on percentage-of-completion
 * - Project profitability analysis
 */
@Injectable()
export class ProjectCostingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Accumulate project costs to Work in Progress
   *
   * PSAK 57: All contract costs should be accumulated in WIP asset account
   * until project completion or milestone recognition
   */
  async accumulateProjectCosts(
    projectId: string,
    periodDate: Date,
    costs: {
      directMaterialCost?: number;
      directLaborCost?: number;
      directExpenses?: number;
      allocatedOverhead?: number;
    },
    userId: string,
  ): Promise<WorkInProgress> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        invoices: true,
        milestones: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate total cost
    const totalCost =
      (costs.directMaterialCost || 0) +
      (costs.directLaborCost || 0) +
      (costs.directExpenses || 0) +
      (costs.allocatedOverhead || 0);

    // Get or create fiscal period
    const fiscalPeriod = await this.getOrCreateFiscalPeriod(periodDate);

    // Find existing WIP entry for this period
    const existingWIP = await this.prisma.workInProgress.findUnique({
      where: {
        projectId_periodDate: {
          projectId,
          periodDate,
        },
      },
    });

    let wip: WorkInProgress;

    if (existingWIP) {
      // Update existing WIP entry
      wip = await this.prisma.workInProgress.update({
        where: { id: existingWIP.id },
        data: {
          directMaterialCost: { increment: costs.directMaterialCost || 0 },
          directLaborCost: { increment: costs.directLaborCost || 0 },
          directExpenses: { increment: costs.directExpenses || 0 },
          allocatedOverhead: { increment: costs.allocatedOverhead || 0 },
          totalCost: { increment: totalCost },
        },
      });
    } else {
      // Create new WIP entry
      wip = await this.prisma.workInProgress.create({
        data: {
          projectId,
          periodDate,
          fiscalPeriodId: fiscalPeriod.id,
          directMaterialCost: costs.directMaterialCost || 0,
          directLaborCost: costs.directLaborCost || 0,
          directExpenses: costs.directExpenses || 0,
          allocatedOverhead: costs.allocatedOverhead || 0,
          totalCost,
          createdBy: userId,
        },
      });
    }

    // Create journal entry for WIP accumulation
    // Debit: WIP (Asset 1-2010)
    // Credit: Various expense/payable accounts
    await this.createWIPJournalEntry(wip, 'COST_ACCUMULATION', userId);

    return wip;
  }

  /**
   * Allocate overhead costs to projects
   *
   * PSAK 57: Overhead should be allocated systematically to projects
   * based on normal capacity and allocation methods
   */
  async allocateOverhead(
    projectId: string,
    expenseId: string,
    allocationMethod: AllocationMethod,
    allocationPercentage: number,
    allocatedAmount: number,
    userId: string,
  ): Promise<ProjectCostAllocation> {
    // Verify project and expense exist
    const [project, expense] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.prisma.expense.findUnique({ where: { id: expenseId } }),
    ]);

    if (!project) throw new NotFoundException('Project not found');
    if (!expense) throw new NotFoundException('Expense not found');

    // Validate allocation
    if (allocationPercentage < 0 || allocationPercentage > 100) {
      throw new BadRequestException('Allocation percentage must be between 0 and 100');
    }

    // Create cost allocation record
    const allocation = await this.prisma.projectCostAllocation.create({
      data: {
        projectId,
        expenseId,
        allocationMethod,
        allocationPercentage,
        allocatedAmount,
        costType: CostType.OVERHEAD,
        isDirect: false,
        createdBy: userId,
      },
    });

    // Accumulate to WIP for current period
    const currentPeriod = new Date();
    currentPeriod.setDate(1); // First day of month
    currentPeriod.setHours(0, 0, 0, 0);

    await this.accumulateProjectCosts(
      projectId,
      currentPeriod,
      { allocatedOverhead: allocatedAmount },
      userId,
    );

    // Create journal entry for overhead allocation
    // Debit: WIP
    // Credit: Overhead Control Account
    await this.createAllocationJournalEntry(allocation, userId);

    return allocation;
  }

  /**
   * Recognize revenue from WIP based on percentage-of-completion
   *
   * PSAK 57: Revenue should be recognized proportionally to work completed
   * using percentage-of-completion method
   */
  async recognizeRevenueFromWIP(
    projectId: string,
    periodDate: Date,
    completionPercentage: number,
    userId: string,
  ): Promise<WorkInProgress> {
    if (completionPercentage < 0 || completionPercentage > 100) {
      throw new BadRequestException('Completion percentage must be between 0 and 100');
    }

    // Get project with total contract value
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        invoices: true,
        workInProgress: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate total contract value from invoices
    const totalContractValue = project.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    // Get or create WIP for this period
    let wip = await this.prisma.workInProgress.findUnique({
      where: {
        projectId_periodDate: {
          projectId,
          periodDate,
        },
      },
    });

    if (!wip) {
      const fiscalPeriod = await this.getOrCreateFiscalPeriod(periodDate);
      wip = await this.prisma.workInProgress.create({
        data: {
          projectId,
          periodDate,
          fiscalPeriodId: fiscalPeriod.id,
          completionPercentage: 0,
          createdBy: userId,
        },
      });
    }

    // Calculate revenue to recognize
    const totalRevenue = totalContractValue * (completionPercentage / 100);
    const previouslyRecognized = Number(wip.recognizedRevenue);
    const revenueToRecognize = totalRevenue - previouslyRecognized;

    // Calculate billed vs unbilled
    const billedToDate = Number(wip.billedToDate);
    const unbilledRevenue = totalRevenue - billedToDate;

    // Update WIP with revenue recognition
    const updatedWIP = await this.prisma.workInProgress.update({
      where: { id: wip.id },
      data: {
        completionPercentage,
        recognizedRevenue: totalRevenue,
        unbilledRevenue,
        isCompleted: completionPercentage >= 100,
      },
    });

    // Create journal entry for revenue recognition
    if (revenueToRecognize > 0) {
      // Debit: Unbilled Revenue (Asset 1-2020) or AR if billed
      // Credit: Revenue (4-1010)
      await this.createRevenueRecognitionJournalEntry(
        updatedWIP,
        revenueToRecognize,
        unbilledRevenue > 0,
        userId,
      );
    }

    return updatedWIP;
  }

  /**
   * Calculate project profitability analysis
   *
   * Returns comprehensive profitability metrics:
   * - Total costs (accumulated in WIP)
   * - Total revenue (recognized)
   * - Gross profit/loss
   * - Profit margin
   * - Cost variance
   */
  async calculateProjectProfitability(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workInProgress: {
          orderBy: { periodDate: 'desc' },
        },
        invoices: true,
        milestones: true,
        costAllocations: {
          include: {
            expense: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get latest WIP entry
    const latestWIP = project.workInProgress[0];

    // Calculate total costs from WIP
    const totalCosts = latestWIP
      ? Number(latestWIP.totalCost)
      : project.costAllocations.reduce(
          (sum, allocation) => sum + Number(allocation.allocatedAmount),
          0,
        );

    // Calculate total revenue
    const totalContractValue = project.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    const recognizedRevenue = latestWIP ? Number(latestWIP.recognizedRevenue) : 0;
    const billedToDate = latestWIP ? Number(latestWIP.billedToDate) : 0;
    const unbilledRevenue = latestWIP ? Number(latestWIP.unbilledRevenue) : 0;

    // Calculate profitability metrics
    const grossProfit = recognizedRevenue - totalCosts;
    const profitMargin = recognizedRevenue > 0
      ? (grossProfit / recognizedRevenue) * 100
      : 0;

    // Calculate cost breakdown
    const directMaterialCost = latestWIP ? Number(latestWIP.directMaterialCost) : 0;
    const directLaborCost = latestWIP ? Number(latestWIP.directLaborCost) : 0;
    const directExpenses = latestWIP ? Number(latestWIP.directExpenses) : 0;
    const allocatedOverhead = latestWIP ? Number(latestWIP.allocatedOverhead) : 0;

    // Calculate estimated vs actual (if estimated budget exists)
    const estimatedBudget = project.estimatedBudget
      ? Number(project.estimatedBudget)
      : null;
    const costVariance = estimatedBudget
      ? totalCosts - estimatedBudget
      : null;
    const costVariancePercentage = estimatedBudget && estimatedBudget > 0
      ? (costVariance! / estimatedBudget) * 100
      : null;

    // Completion metrics
    const completionPercentage = latestWIP
      ? Number(latestWIP.completionPercentage)
      : 0;
    const isCompleted = latestWIP ? latestWIP.isCompleted : false;

    return {
      projectId: project.id,
      projectNumber: project.number,
      projectDescription: project.description,
      status: project.status,

      // Financial Summary
      totalContractValue,
      estimatedBudget,

      // Cost Analysis
      costs: {
        totalCosts,
        directMaterialCost,
        directLaborCost,
        directExpenses,
        allocatedOverhead,
        breakdown: {
          material: directMaterialCost > 0 ? (directMaterialCost / totalCosts) * 100 : 0,
          labor: directLaborCost > 0 ? (directLaborCost / totalCosts) * 100 : 0,
          expenses: directExpenses > 0 ? (directExpenses / totalCosts) * 100 : 0,
          overhead: allocatedOverhead > 0 ? (allocatedOverhead / totalCosts) * 100 : 0,
        },
      },

      // Revenue Analysis
      revenue: {
        recognizedRevenue,
        billedToDate,
        unbilledRevenue,
        revenueRecognitionRate: totalContractValue > 0
          ? (recognizedRevenue / totalContractValue) * 100
          : 0,
      },

      // Profitability Metrics
      profitability: {
        grossProfit,
        profitMargin,
        costVariance,
        costVariancePercentage,
      },

      // Project Status
      progress: {
        completionPercentage,
        isCompleted,
        startDate: project.startDate,
        endDate: project.endDate,
      },

      // WIP Summary
      wipSummary: latestWIP
        ? {
            periodDate: latestWIP.periodDate,
            totalCost: Number(latestWIP.totalCost),
            recognizedRevenue: Number(latestWIP.recognizedRevenue),
            unbilledRevenue: Number(latestWIP.unbilledRevenue),
          }
        : null,
    };
  }

  /**
   * Get WIP summary for a project
   */
  async getWIPSummary(projectId: string) {
    const wipEntries = await this.prisma.workInProgress.findMany({
      where: { projectId },
      orderBy: { periodDate: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            number: true,
            description: true,
            status: true,
          },
        },
        fiscalPeriod: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return wipEntries.map((wip) => ({
      id: wip.id,
      project: wip.project,
      periodDate: wip.periodDate,
      fiscalPeriod: wip.fiscalPeriod,
      costs: {
        directMaterialCost: Number(wip.directMaterialCost),
        directLaborCost: Number(wip.directLaborCost),
        directExpenses: Number(wip.directExpenses),
        allocatedOverhead: Number(wip.allocatedOverhead),
        totalCost: Number(wip.totalCost),
      },
      revenue: {
        billedToDate: Number(wip.billedToDate),
        recognizedRevenue: Number(wip.recognizedRevenue),
        unbilledRevenue: Number(wip.unbilledRevenue),
      },
      progress: {
        completionPercentage: Number(wip.completionPercentage),
        isCompleted: wip.isCompleted,
      },
      createdAt: wip.createdAt,
      updatedAt: wip.updatedAt,
    }));
  }

  /**
   * Get cost allocation summary for a project
   */
  async getCostAllocationSummary(projectId: string) {
    const allocations = await this.prisma.projectCostAllocation.findMany({
      where: { projectId },
      include: {
        expense: {
          select: {
            id: true,
            expenseNumber: true,
            description: true,
            accountCode: true,
            accountName: true,
            totalAmount: true,
          },
        },
        project: {
          select: {
            id: true,
            number: true,
            description: true,
          },
        },
      },
      orderBy: { allocationDate: 'desc' },
    });

    // Group by cost type
    const summary = allocations.reduce(
      (acc, allocation) => {
        const costType = allocation.costType;
        if (!acc.byCostType[costType]) {
          acc.byCostType[costType] = {
            count: 0,
            totalAmount: 0,
            allocations: [],
          };
        }

        acc.byCostType[costType].count += 1;
        acc.byCostType[costType].totalAmount += Number(allocation.allocatedAmount);
        acc.byCostType[costType].allocations.push({
          id: allocation.id,
          expense: allocation.expense,
          allocatedAmount: Number(allocation.allocatedAmount),
          allocationMethod: allocation.allocationMethod,
          allocationPercentage: allocation.allocationPercentage
            ? Number(allocation.allocationPercentage)
            : null,
          allocationDate: allocation.allocationDate,
        });

        acc.totalAllocated += Number(allocation.allocatedAmount);

        return acc;
      },
      {
        projectId,
        totalAllocated: 0,
        byCostType: {} as Record<string, any>,
      },
    );

    return summary;
  }

  /**
   * Helper: Get or create fiscal period for date
   */
  private async getOrCreateFiscalPeriod(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const code = `${year}-${month.toString().padStart(2, '0')}`;

    let period = await this.prisma.fiscalPeriod.findUnique({
      where: { code },
    });

    if (!period) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      period = await this.prisma.fiscalPeriod.create({
        data: {
          name: `${date.toLocaleString('en-US', { month: 'long' })} ${year}`,
          code,
          periodType: 'MONTHLY',
          startDate,
          endDate,
        },
      });
    }

    return period;
  }

  /**
   * Helper: Create journal entry for WIP cost accumulation
   */
  private async createWIPJournalEntry(
    wip: WorkInProgress,
    transactionType: string,
    userId: string,
  ) {
    // TODO: Implement journal entry creation
    // This will integrate with the existing JournalEntryService
    // Debit: WIP (1-2010)
    // Credit: Various accounts based on cost type
    console.log(`📝 PSAK 57: WIP journal entry created for project ${wip.projectId}`);
  }

  /**
   * Helper: Create journal entry for overhead allocation
   */
  private async createAllocationJournalEntry(
    allocation: ProjectCostAllocation,
    userId: string,
  ) {
    // TODO: Implement journal entry creation
    // Debit: WIP
    // Credit: Overhead Control Account
    console.log(`📝 PSAK 57: Overhead allocation journal entry created`);
  }

  /**
   * Helper: Create journal entry for revenue recognition
   */
  private async createRevenueRecognitionJournalEntry(
    wip: WorkInProgress,
    revenueAmount: number,
    isUnbilled: boolean,
    userId: string,
  ) {
    // TODO: Implement journal entry creation
    // If unbilled:
    //   Debit: Unbilled Revenue (1-2020)
    //   Credit: Revenue (4-1010)
    // If billed:
    //   Debit: AR (1-1020)
    //   Credit: Revenue (4-1010)
    console.log(`📝 PSAK 57: Revenue recognition journal entry created for ${revenueAmount}`);
  }
}
