import { ProjectStatus } from "@prisma/client";

export class ProjectResponseDto {
  id: string;
  number: string;
  description: string;
  output: string;
  scopeOfWork?: string;

  projectType: {
    id: string;
    code: string;
    name: string;
    prefix: string;
    color: string;
  };
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;

  // Pricing
  estimatedBudget?: string; // Convert Decimal to string
  basePrice?: string;
  priceBreakdown?: Record<string, any>;

  // Project Projections (Planning Phase)
  estimatedExpenses?: Record<string, any>;
  projectedGrossMargin?: string;
  projectedNetMargin?: string;
  projectedProfit?: string;

  createdAt: string;
  updatedAt: string;

  // Client reference
  client: {
    id: string;
    name: string;
    email?: string;
    company?: string;
  };

  // Relations - summary counts only
  _count?: {
    quotations: number;
    invoices: number;
  };

  // Project progress
  progress?: {
    quotationsApproved: number;
    invoicesPaid: number;
    totalRevenue: string;
  };

  // Profit Margin Tracking (auto-calculated)
  totalDirectCosts?: string; // Convert Decimal to string
  totalIndirectCosts?: string;
  totalAllocatedCosts?: string;
  totalInvoicedAmount?: string;
  totalPaidAmount?: string;
  grossProfit?: string;
  netProfit?: string;
  grossMarginPercent?: string;
  netMarginPercent?: string;
  budgetVariance?: string;
  budgetVariancePercent?: string;
  profitCalculatedAt?: string;
  profitCalculatedBy?: string;

  // Cost Breakdown (optional, fetch separately via /cost-breakdown endpoint)
  costBreakdown?: {
    direct: {
      materials: string;
      labor: string;
      expenses: string;
      total: string;
    };
    indirect: {
      overhead: string;
      allocated: string;
      total: string;
    };
    total: string;
  };
}
