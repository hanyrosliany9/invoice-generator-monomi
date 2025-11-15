/**
 * Expense Management Type Definitions
 *
 * Comprehensive TypeScript types for Indonesian-compliant expense management.
 * Mirrors backend Prisma schema with additional frontend-specific types.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ExpensePaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum ExpenseClass {
  SELLING = 'SELLING',               // 6-1xxx: Beban Penjualan
  GENERAL_ADMIN = 'GENERAL_ADMIN',   // 6-2xxx: Beban Administrasi & Umum
  OTHER = 'OTHER',                   // 8-xxxx: Beban Lain-Lain
}

export enum PPNCategory {
  CREDITABLE = 'CREDITABLE',         // Pajak Masukan (can claim credit)
  NON_CREDITABLE = 'NON_CREDITABLE', // Cannot claim PPN credit
  EXEMPT = 'EXEMPT',                 // PPN exempt
}

export enum WithholdingTaxType {
  NONE = 'NONE',
  PPH23 = 'PPH23',                   // Article 23 (services, rental, etc.)
  PPH4_2 = 'PPH4_2',                 // Article 4(2) (building rental, interest)
  PPH15 = 'PPH15',                   // Article 15 (shipping, aviation)
}

export enum EFakturStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',     // No e-Faktur needed
  REQUIRED = 'REQUIRED',             // e-Faktur needed but not uploaded
  UPLOADED = 'UPLOADED',             // e-Faktur uploaded
  VALIDATED = 'VALIDATED',           // Validated against DGT system
  REJECTED = 'REJECTED',             // Rejected by DGT system
}

export enum ApprovalAction {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REVISED = 'REVISED',
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Expense Category
 *
 * PSAK-compliant chart of accounts category.
 */
export interface ExpenseCategory {
  id: string;
  code: string;                      // OFFICE_RENT, PROFESSIONAL_SERVICE, etc.
  accountCode: string;               // 6-2020, 6-2070, etc. (PSAK)
  expenseClass: ExpenseClass;
  name: string;
  nameId: string;                    // Indonesian name
  description?: string;
  descriptionId?: string;
  defaultPPNCategory: PPNCategory;
  withholdingTaxType?: WithholdingTaxType;
  withholdingTaxRate?: number;      // Decimal (0.02 = 2%, 0.10 = 10%)
  requiresEFaktur: boolean;
  isBillable: boolean;               // Can be billed to clients
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Expense Approval History
 *
 * Tracks approval workflow history.
 */
export interface ExpenseApprovalHistory {
  id: string;
  expenseId: string;
  action: ApprovalAction;
  previousStatus?: ExpenseStatus;
  newStatus: ExpenseStatus;
  performedById: string;
  performedBy?: {
    id: string;
    name: string;
    email: string;
  };
  comments?: string;
  commentsId?: string;
  rejectionReason?: string;
  timestamp: string;
}

/**
 * Expense Comment
 *
 * Comments on expenses for collaboration.
 */
export interface ExpenseComment {
  id: string;
  expenseId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  comment: string;
  commentId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Main Expense Interface
 *
 * Comprehensive expense with all Indonesian compliance fields.
 */
export interface Expense {
  id: string;
  expenseNumber: string;                  // EXP-2025-00001
  buktiPengeluaranNumber: string;         // BKK-2025-00001

  // PSAK Chart of Accounts
  accountCode: string;                    // 6-2020, 8-1010, etc.
  accountName: string;
  expenseClass: ExpenseClass;

  // Category
  categoryId: string;
  category?: ExpenseCategory;

  // Description
  description: string;
  descriptionId?: string;
  notes?: string;
  notesId?: string;

  // Vendor
  vendorName: string;
  vendorNPWP?: string;                    // 01.234.567.8-901.000
  vendorAddress?: string;

  // Amounts (stored as Decimal strings for precision)
  grossAmount: string;                    // Base amount before tax
  ppnAmount: string;                      // PPN amount (12% or 11%)
  withholdingAmount?: string;             // PPh withholding amount
  netAmount: string;                      // Amount after withholding
  totalAmount: string;                    // Total payable (gross + PPN)

  // PPN (VAT) Fields
  ppnRate: string;                        // Decimal: 0.1200 = 12%, 0.1100 = 11%
  ppnCategory: PPNCategory;
  isLuxuryGoods: boolean;

  // e-Faktur Integration
  eFakturNSFP?: string;                   // 010.123-25.12345678
  eFakturQRCode?: string;
  eFakturStatus: EFakturStatus;
  eFakturIssueDate?: string;
  eFakturDueDate?: string;
  eFakturValidatedAt?: string;

  // Withholding Tax (PPh)
  withholdingTaxType?: WithholdingTaxType;
  withholdingTaxRate?: string;            // Decimal: 0.02 = 2%, 0.10 = 10%
  buktiPotongNumber?: string;             // Bukti Potong number

  // Payment Tracking
  paymentStatus: ExpensePaymentStatus;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAmount?: string;

  // Billable to Project/Client
  isBillable: boolean;
  projectId?: string;
  project?: {
    id: string;
    number: string;
    description: string;
    clientId: string;
  };
  clientId?: string;
  client?: {
    id: string;
    name: string;
    company: string;
  };

  // Dates
  expenseDate: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;

  // Approval
  status: ExpenseStatus;
  approvedBy?: string;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  rejectionReason?: string;

  // User
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Relations
  approvalHistory?: ExpenseApprovalHistory[];
  comments?: ExpenseComment[];

  // Frontend-specific computed fields
  businessStatus?: {
    canEdit: boolean;
    canDelete: boolean;
    canSubmit: boolean;
    canApprove: boolean;
    canReject: boolean;
    canMarkPaid: boolean;
    isDraft: boolean;
    isSubmitted: boolean;
    isApproved: boolean;
    isRejected: boolean;
    isPaid: boolean;
    requiresEFaktur: boolean;
  };
}

// ============================================================================
// QUERY & FILTER INTERFACES
// ============================================================================

/**
 * Expense Query Parameters
 *
 * Comprehensive filtering and pagination for expense list.
 */
export interface ExpenseQueryParams {
  // Search
  search?: string;                        // Search description, vendor, NSFP, account code

  // Filters
  status?: ExpenseStatus;
  paymentStatus?: ExpensePaymentStatus;
  expenseClass?: ExpenseClass;
  ppnCategory?: PPNCategory;
  categoryId?: string;
  projectId?: string;
  clientId?: string;
  userId?: string;
  approvedBy?: string;
  isBillable?: boolean;
  accountCode?: string;

  // Date range
  startDate?: string;                     // ISO 8601
  endDate?: string;

  // Amount range
  minAmount?: number;
  maxAmount?: number;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: string;                        // expenseDate, createdAt, totalAmount, etc.
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Expense Response
 */
export interface PaginatedExpenseResponse {
  data: Expense[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// FORM DATA INTERFACES
// ============================================================================

/**
 * Create Expense Form Data
 *
 * Data required to create a new expense.
 */
export interface CreateExpenseFormData {
  // Category & Account
  categoryId: string;
  accountCode: string;
  accountName: string;
  expenseClass: ExpenseClass;

  // Description
  description: string;
  descriptionId?: string;
  notes?: string;
  notesId?: string;

  // Vendor
  vendorName: string;
  vendorNPWP?: string;
  vendorAddress?: string;

  // Amounts
  grossAmount: number | string;
  ppnAmount: number | string;
  withholdingAmount?: number | string;
  netAmount: number | string;
  totalAmount: number | string;

  // PPN
  ppnRate: number | string;
  ppnCategory: PPNCategory;
  isLuxuryGoods: boolean;

  // e-Faktur
  eFakturNSFP?: string;
  eFakturQRCode?: string;
  eFakturStatus: EFakturStatus;
  eFakturIssueDate?: string;
  eFakturDueDate?: string;

  // Withholding Tax
  withholdingTaxType?: WithholdingTaxType;
  withholdingTaxRate?: number | string;
  buktiPotongNumber?: string;

  // Billable
  isBillable: boolean;
  projectId?: string;
  clientId?: string;

  // Date
  expenseDate: string;

  // Optional fields
  isTaxDeductible?: boolean;
}

/**
 * Update Expense Form Data
 *
 * Partial update of expense (DRAFT only).
 */
export type UpdateExpenseFormData = Partial<CreateExpenseFormData>;

/**
 * Approve Expense Form Data
 */
export interface ApproveExpenseFormData {
  comments?: string;
  commentsId?: string;
  commentsEn?: string;
}

/**
 * Reject Expense Form Data
 */
export interface RejectExpenseFormData {
  rejectionReason: string;
  comments?: string;
  commentsId?: string;
}

/**
 * Mark Paid Form Data
 */
export interface MarkPaidFormData {
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Expense Statistics
 *
 * Aggregated expense analytics.
 */
export interface ExpenseStatistics {
  totalExpenses: number;
  totalAmount: string;
  totalPPN: string;
  totalWithholding: string;
  netPayable: string;

  byStatus: {
    [key in ExpenseStatus]: {
      count: number;
      amount: string;
    };
  };

  byClass: {
    [key in ExpenseClass]: {
      count: number;
      amount: string;
    };
  };

  byPaymentStatus: {
    [key in ExpensePaymentStatus]: {
      count: number;
      amount: string;
    };
  };
}

/**
 * PPN Calculation Result
 *
 * Frontend helper for PPN calculations.
 */
export interface PPNCalculationResult {
  grossAmount: number;
  ppnRate: number;
  ppnAmount: number;
  totalAmount: number;
  isLuxuryGoods: boolean;
  effectiveRate: number;           // 11% or 12%
  breakdown: {
    label: string;
    labelId: string;
    amount: number;
  }[];
}

/**
 * Withholding Tax Calculation Result
 *
 * Frontend helper for PPh withholding calculations.
 */
export interface WithholdingTaxCalculationResult {
  grossAmount: number;
  withholdingType: WithholdingTaxType;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  buktiPotongRequired: boolean;
  breakdown: {
    label: string;
    labelId: string;
    amount: number;
  }[];
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Helper: Check if expense can be edited
 */
export const canEditExpense = (expense: Expense): boolean => {
  return expense.status === ExpenseStatus.DRAFT;
};

/**
 * Helper: Check if expense can be deleted
 */
export const canDeleteExpense = (expense: Expense): boolean => {
  return expense.status === ExpenseStatus.DRAFT;
};

/**
 * Helper: Check if expense can be submitted
 */
export const canSubmitExpense = (expense: Expense): boolean => {
  return expense.status === ExpenseStatus.DRAFT;
};

/**
 * Helper: Check if expense can be approved
 */
export const canApproveExpense = (expense: Expense, userRole: string): boolean => {
  return (
    expense.status === ExpenseStatus.SUBMITTED &&
    (userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER')
  );
};

/**
 * Helper: Check if expense can be rejected
 */
export const canRejectExpense = (expense: Expense, userRole: string): boolean => {
  return (
    expense.status === ExpenseStatus.SUBMITTED &&
    (userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER')
  );
};

/**
 * Helper: Check if expense can be marked as paid
 */
export const canMarkPaidExpense = (expense: Expense, userRole: string): boolean => {
  return (
    expense.status === ExpenseStatus.APPROVED &&
    expense.paymentStatus !== ExpensePaymentStatus.PAID &&
    (userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER')
  );
};

/**
 * Helper: Format Indonesian Rupiah
 */
export const formatIDR = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

/**
 * Helper: Format NPWP (Tax ID)
 */
export const formatNPWP = (npwp: string): string => {
  // Format: 01.234.567.8-901.000
  const cleaned = npwp.replace(/\D/g, '');
  if (cleaned.length !== 15) return npwp;

  return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}.${cleaned.substring(8, 9)}-${cleaned.substring(9, 12)}.${cleaned.substring(12, 15)}`;
};

/**
 * Helper: Format NSFP (e-Faktur Serial Number)
 */
export const formatNSFP = (nsfp: string): string => {
  // Format: 010.123-25.12345678
  const cleaned = nsfp.replace(/\D/g, '');
  if (cleaned.length !== 16) return nsfp;

  return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}.${cleaned.substring(8, 16)}`;
};

/**
 * Helper: Get expense status color for UI
 */
export const getExpenseStatusColor = (status: ExpenseStatus): string => {
  switch (status) {
    case ExpenseStatus.DRAFT:
      return 'gray';
    case ExpenseStatus.SUBMITTED:
      return 'blue';
    case ExpenseStatus.APPROVED:
      return 'green';
    case ExpenseStatus.REJECTED:
      return 'red';
    case ExpenseStatus.CANCELLED:
      return 'orange';
    default:
      return 'gray';
  }
};

/**
 * Helper: Get payment status color for UI
 */
export const getPaymentStatusColor = (status: ExpensePaymentStatus): string => {
  switch (status) {
    case ExpensePaymentStatus.UNPAID:
      return 'red';
    case ExpensePaymentStatus.PARTIALLY_PAID:
      return 'orange';
    case ExpensePaymentStatus.PAID:
      return 'green';
    default:
      return 'gray';
  }
};
