import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EstimatedExpenseDto, ProjectItemDto } from "./dto/create-project.dto";

export interface ProjectionResult {
  // Revenue
  estimatedRevenue: number;
  revenueBreakdown: Array<{
    name: string;
    description: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;

  // Costs
  estimatedDirectCosts: number;
  estimatedIndirectCosts: number;
  estimatedTotalCosts: number;
  costBreakdown: {
    direct: Array<{
      categoryId: string;
      categoryName: string;
      categoryNameId: string;
      amount: number;
      notes?: string;
    }>;
    indirect: Array<{
      categoryId: string;
      categoryName: string;
      categoryNameId: string;
      amount: number;
      notes?: string;
    }>;
  };

  // Profit Projections
  projectedGrossProfit: number;
  projectedNetProfit: number;
  projectedGrossMargin: number; // Percentage
  projectedNetMargin: number; // Percentage

  // Metadata
  calculatedAt: Date;
  isProfitable: boolean;
  profitabilityRating: "excellent" | "good" | "breakeven" | "loss";
}

@Injectable()
export class ProjectProjectionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate project profit projections BEFORE creation
   * Used in Create Project form for decision making
   */
  async calculateProjection(
    products: ProjectItemDto[],
    estimatedExpenses: EstimatedExpenseDto[],
  ): Promise<ProjectionResult> {
    // 1. Calculate estimated revenue
    const revenueBreakdown = (products || []).map((p) => ({
      name: p.name,
      description: p.description,
      price: p.price,
      quantity: p.quantity || 1,
      subtotal: p.price * (p.quantity || 1),
    }));

    const estimatedRevenue = revenueBreakdown.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    // 2. Get expense category names
    const categoryIds = (estimatedExpenses || []).map((e) => e.categoryId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, nameId: true },
    });

    const categoryMap = new Map(
      categories.map((c) => [c.id, { name: c.name, nameId: c.nameId }]),
    );

    // 3. Build cost breakdown
    const direct: Array<{
      categoryId: string;
      categoryName: string;
      categoryNameId: string;
      amount: number;
      notes?: string;
    }> = [];
    const indirect: Array<{
      categoryId: string;
      categoryName: string;
      categoryNameId: string;
      amount: number;
      notes?: string;
    }> = [];
    let totalDirect = 0;
    let totalIndirect = 0;

    for (const expense of estimatedExpenses || []) {
      const category = categoryMap.get(expense.categoryId);
      const item = {
        categoryId: expense.categoryId,
        categoryName: category?.name || "Unknown",
        categoryNameId: category?.nameId || "Tidak Diketahui",
        amount: expense.amount,
        notes: expense.notes,
      };

      if (expense.costType === "direct") {
        direct.push(item);
        totalDirect += expense.amount;
      } else {
        indirect.push(item);
        totalIndirect += expense.amount;
      }
    }

    const estimatedDirectCosts = totalDirect;
    const estimatedIndirectCosts = totalIndirect;
    const estimatedTotalCosts = estimatedDirectCosts + estimatedIndirectCosts;

    // 4. Calculate profit projections
    const projectedGrossProfit = estimatedRevenue - estimatedDirectCosts;
    const projectedNetProfit = estimatedRevenue - estimatedTotalCosts;

    const projectedGrossMargin =
      estimatedRevenue > 0
        ? (projectedGrossProfit / estimatedRevenue) * 100
        : 0;

    const projectedNetMargin =
      estimatedRevenue > 0 ? (projectedNetProfit / estimatedRevenue) * 100 : 0;

    // 5. Determine profitability rating (Indonesian standards)
    let profitabilityRating: "excellent" | "good" | "breakeven" | "loss";
    if (projectedNetMargin >= 20) profitabilityRating = "excellent";
    else if (projectedNetMargin >= 10) profitabilityRating = "good";
    else if (projectedNetMargin >= 0) profitabilityRating = "breakeven";
    else profitabilityRating = "loss";

    return {
      // Revenue
      estimatedRevenue,
      revenueBreakdown,

      // Costs
      estimatedDirectCosts,
      estimatedIndirectCosts,
      estimatedTotalCosts,
      costBreakdown: {
        direct,
        indirect,
      },

      // Profit Projections
      projectedGrossProfit,
      projectedNetProfit,
      projectedGrossMargin,
      projectedNetMargin,

      // Metadata
      calculatedAt: new Date(),
      isProfitable: projectedNetProfit >= 0,
      profitabilityRating,
    };
  }
}
