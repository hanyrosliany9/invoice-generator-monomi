export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  scopeOfWork?: string;
  status: ProjectStatus;

  // Price fields
  basePrice?: string | number;
  priceBreakdown?: Record<string, any>;

  // Projection fields
  estimatedExpenses?: string | number;
  projectedGrossMargin?: string | number;
  projectedNetMargin?: string | number;
  projectedProfit?: string | number;

  // Date fields
  startDate?: string;
  endDate?: string;

  // Relations
  clientId: string;
  client?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
  };

  quotations?: Array<{
    id: string;
    quotationNumber: string;
    status: string;
    totalAmount: string | number;
  }>;

  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string | number;
  }>;

  expenses?: Array<{
    id: string;
    amount: string | number;
    category: string;
    expenseDate: string;
  }>;

  // Computed financial data
  financialSummary?: {
    totalRevenue: string | number;
    totalExpenses: string | number;
    actualProfit: string | number;
    profitMargin: string | number;
  };

  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form values for creating/editing projects
 */
export interface ProjectFormValues {
  projectNumber: string;
  name: string;
  description?: string;
  scopeOfWork?: string;
  clientId: string;
  status: ProjectStatus;
  basePrice?: number | string;
  priceBreakdown?: Record<string, number>;
  estimatedExpenses?: number | string;
  startDate?: Date | string;
  endDate?: Date | string;
}
