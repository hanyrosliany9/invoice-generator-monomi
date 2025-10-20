import { apiClient } from '../config/api';
import type {
  ApproveExpenseFormData,
  CreateExpenseFormData,
  Expense,
  ExpenseCategory,
  ExpensePaymentStatus,
  ExpenseQueryParams,
  ExpenseStatistics,
  ExpenseStatus,
  MarkPaidFormData,
  PaginatedExpenseResponse,
  PPNCalculationResult,
  RejectExpenseFormData,
  UpdateExpenseFormData,
  WithholdingTaxCalculationResult,
} from '../types/expense';
import { WithholdingTaxType } from '../types/expense';

/**
 * Expense Service
 *
 * Comprehensive API client for Indonesian-compliant expense management.
 *
 * Features:
 * - Complete CRUD operations
 * - Approval workflow (submit, approve, reject)
 * - Payment tracking
 * - Indonesian tax calculations (PPN, PPh)
 * - e-Faktur validation
 * - Statistics and analytics
 * - Category management
 */
export const expenseService = {
  // ============================================================================
  // EXPENSE CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all expenses with filtering and pagination
   *
   * Returns expenses based on user role:
   * - Regular users: Only their own expenses
   * - Admins/Finance Managers: All expenses
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated expense list
   */
  getExpenses: async (
    params?: ExpenseQueryParams
  ): Promise<PaginatedExpenseResponse> => {
    const queryString = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryString.append(key, String(value));
        }
      });
    }

    const url = `/expenses${queryString.toString() ? `?${queryString.toString()}` : ''}`;
    const response = await apiClient.get(url);

    return (
      response?.data?.data || {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }
    );
  },

  /**
   * Get expense by ID
   *
   * @param id - Expense ID
   * @returns Expense with all relations
   */
  getExpense: async (id: string): Promise<Expense> => {
    const response = await apiClient.get(`/expenses/${id}`);
    if (!response?.data?.data) {
      throw new Error('Expense not found');
    }
    return response.data.data;
  },

  /**
   * Create new expense
   *
   * Creates expense in DRAFT status with Indonesian tax validation.
   *
   * @param data - Expense creation data
   * @returns Created expense
   */
  createExpense: async (data: CreateExpenseFormData): Promise<Expense> => {
    const requestId = `expense_${Date.now()}_${Math.random()}`;

    const response = await apiClient.post('/expenses', data, {
      headers: {
        'X-Request-ID': requestId,
      },
    });

    if (!response?.data?.data) {
      throw new Error('Expense creation failed');
    }
    return response.data.data;
  },

  /**
   * Update existing expense
   *
   * Only DRAFT expenses can be updated.
   *
   * @param id - Expense ID
   * @param data - Partial expense update data
   * @returns Updated expense
   */
  updateExpense: async (
    id: string,
    data: UpdateExpenseFormData
  ): Promise<Expense> => {
    const response = await apiClient.patch(`/expenses/${id}`, data);
    if (!response?.data?.data) {
      throw new Error('Expense update failed');
    }
    return response.data.data;
  },

  /**
   * Delete expense
   *
   * Only DRAFT expenses can be deleted.
   *
   * @param id - Expense ID
   */
  deleteExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  // ============================================================================
  // APPROVAL WORKFLOW
  // ============================================================================

  /**
   * Submit expense for approval
   *
   * Changes status from DRAFT to SUBMITTED.
   *
   * @param id - Expense ID
   * @returns Updated expense
   */
  submitExpense: async (id: string): Promise<Expense> => {
    const response = await apiClient.post(`/expenses/${id}/submit`);
    if (!response?.data?.data) {
      throw new Error('Expense submission failed');
    }
    return response.data.data;
  },

  /**
   * Approve expense
   *
   * Changes status from SUBMITTED to APPROVED.
   * Requires ADMIN or FINANCE_MANAGER role.
   *
   * @param id - Expense ID
   * @param data - Optional approval comments
   * @returns Updated expense
   */
  approveExpense: async (
    id: string,
    data?: ApproveExpenseFormData
  ): Promise<Expense> => {
    const response = await apiClient.post(`/expenses/${id}/approve`, data);
    if (!response?.data?.data) {
      throw new Error('Expense approval failed');
    }
    return response.data.data;
  },

  /**
   * Reject expense
   *
   * Changes status from SUBMITTED to REJECTED.
   * Requires ADMIN or FINANCE_MANAGER role.
   *
   * @param id - Expense ID
   * @param data - Rejection reason (required) and comments
   * @returns Updated expense
   */
  rejectExpense: async (
    id: string,
    data: RejectExpenseFormData
  ): Promise<Expense> => {
    const response = await apiClient.post(`/expenses/${id}/reject`, data);
    if (!response?.data?.data) {
      throw new Error('Expense rejection failed');
    }
    return response.data.data;
  },

  /**
   * Mark expense as paid
   *
   * Changes payment status to PAID.
   * Only APPROVED expenses can be marked as paid.
   * Requires ADMIN or FINANCE_MANAGER role.
   *
   * @param id - Expense ID
   * @param data - Payment details
   * @returns Updated expense
   */
  markExpenseAsPaid: async (
    id: string,
    data: MarkPaidFormData
  ): Promise<Expense> => {
    const response = await apiClient.post(`/expenses/${id}/mark-paid`, data);
    if (!response?.data?.data) {
      throw new Error('Expense payment marking failed');
    }
    return response.data.data;
  },

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Get expense statistics
   *
   * Returns aggregated expense statistics with optional filters.
   *
   * @param filters - Optional filters (category, project, client, date range)
   * @returns Expense statistics
   */
  getExpenseStatistics: async (
    filters?: Partial<ExpenseQueryParams>
  ): Promise<ExpenseStatistics> => {
    const queryString = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryString.append(key, String(value));
        }
      });
    }

    const url = `/expenses/statistics${queryString.toString() ? `?${queryString.toString()}` : ''}`;
    const response = await apiClient.get(url);

    return response?.data?.data || {
      totalExpenses: 0,
      totalAmount: '0',
      totalPPN: '0',
      totalWithholding: '0',
      netPayable: '0',
      byStatus: {},
      byClass: {},
      byPaymentStatus: {},
    };
  },

  // ============================================================================
  // EXPENSE CATEGORIES
  // ============================================================================

  /**
   * Get all expense categories
   *
   * Returns active PSAK-compliant expense categories.
   *
   * @returns List of expense categories
   */
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await apiClient.get('/expenses/categories');
    return response?.data?.data || [];
  },

  /**
   * Get expense category by ID
   *
   * @param id - Category ID
   * @returns Expense category
   */
  getExpenseCategory: async (id: string): Promise<ExpenseCategory> => {
    const response = await apiClient.get(`/expenses/categories/${id}`);
    if (!response?.data?.data) {
      throw new Error('Expense category not found');
    }
    return response.data.data;
  },

  /**
   * Create expense category
   *
   * Creates a new expense category with PSAK account code.
   * Requires ADMIN role.
   *
   * @param data - Category creation data
   * @returns Created category
   */
  createExpenseCategory: async (data: any): Promise<ExpenseCategory> => {
    const response = await apiClient.post('/expenses/categories', data);
    if (!response?.data?.data) {
      throw new Error('Category creation failed');
    }
    return response.data.data;
  },

  /**
   * Update expense category
   *
   * Updates an existing expense category.
   * Requires ADMIN role.
   *
   * @param id - Category ID
   * @param data - Partial category update data
   * @returns Updated category
   */
  updateExpenseCategory: async (
    id: string,
    data: any
  ): Promise<ExpenseCategory> => {
    const response = await apiClient.patch(`/expenses/categories/${id}`, data);
    if (!response?.data?.data) {
      throw new Error('Category update failed');
    }
    return response.data.data;
  },

  /**
   * Delete expense category
   *
   * Deletes an expense category if it's not used by any expenses.
   * Requires ADMIN role.
   *
   * @param id - Category ID
   */
  deleteExpenseCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/categories/${id}`);
  },

  // ============================================================================
  // INDONESIAN TAX CALCULATIONS
  // ============================================================================

  /**
   * Calculate PPN (VAT) for expense
   *
   * Uses Indonesian PPN rates:
   * - 12% standard rate for luxury goods
   * - 11% effective rate for non-luxury goods
   *
   * @param grossAmount - Base amount before tax
   * @param isLuxuryGoods - Whether expense is luxury goods
   * @returns PPN calculation result
   */
  calculatePPN: (
    grossAmount: number,
    isLuxuryGoods: boolean = false
  ): PPNCalculationResult => {
    const ppnRate = isLuxuryGoods ? 0.12 : 0.11; // Effective rate
    const ppnAmount = grossAmount * ppnRate;
    const totalAmount = grossAmount + ppnAmount;

    return {
      grossAmount,
      ppnRate: isLuxuryGoods ? 0.12 : 0.12, // Actual statutory rate
      ppnAmount,
      totalAmount,
      isLuxuryGoods,
      effectiveRate: ppnRate,
      breakdown: [
        {
          label: 'Gross Amount',
          labelId: 'Jumlah Bruto',
          amount: grossAmount,
        },
        {
          label: isLuxuryGoods ? 'PPN 12%' : 'PPN 11% (Effective)',
          labelId: isLuxuryGoods ? 'PPN 12%' : 'PPN 11% (Efektif)',
          amount: ppnAmount,
        },
        {
          label: 'Total Amount',
          labelId: 'Jumlah Total',
          amount: totalAmount,
        },
      ],
    };
  },

  /**
   * Calculate Withholding Tax (PPh) for expense
   *
   * Uses Indonesian PPh rates:
   * - PPh 23: 2% (services) or 15% (dividends, interest)
   * - PPh 4(2): 10% (building rental, interest)
   * - PPh 15: Various rates for shipping/aviation
   *
   * @param grossAmount - Base amount before tax
   * @param withholdingType - Type of withholding tax
   * @param customRate - Optional custom rate (overrides default)
   * @returns Withholding tax calculation result
   */
  calculateWithholdingTax: (
    grossAmount: number,
    withholdingType: WithholdingTaxType,
    customRate?: number
  ): WithholdingTaxCalculationResult => {
    // Default rates by type
    const defaultRates: Record<WithholdingTaxType, number> = {
      NONE: 0,
      PPH23: 0.02, // 2% for services
      PPH4_2: 0.1, // 10% for building rental
      PPH15: 0.0265, // 2.65% average for shipping
    };

    const rate = customRate !== undefined ? customRate : defaultRates[withholdingType];
    const withholdingAmount = grossAmount * rate;
    const netAmount = grossAmount - withholdingAmount;
    const buktiPotongRequired = withholdingType !== 'NONE';

    return {
      grossAmount,
      withholdingType,
      withholdingRate: rate,
      withholdingAmount,
      netAmount,
      buktiPotongRequired,
      breakdown: [
        {
          label: 'Gross Amount',
          labelId: 'Jumlah Bruto',
          amount: grossAmount,
        },
        {
          label: `Withholding Tax (${(rate * 100).toFixed(2)}%)`,
          labelId: `Pajak Dipotong (${(rate * 100).toFixed(2)}%)`,
          amount: -withholdingAmount,
        },
        {
          label: 'Net Amount',
          labelId: 'Jumlah Netto',
          amount: netAmount,
        },
      ],
    };
  },

  /**
   * Calculate complete expense amounts
   *
   * Calculates all amounts including PPN and withholding tax.
   *
   * @param grossAmount - Base amount
   * @param isLuxuryGoods - Whether expense is luxury goods
   * @param withholdingType - Type of withholding tax
   * @param customWithholdingRate - Optional custom withholding rate
   * @returns Complete calculation with all amounts
   */
  calculateExpenseAmounts: (
    grossAmount: number,
    isLuxuryGoods: boolean = false,
    withholdingType: WithholdingTaxType = WithholdingTaxType.NONE,
    customWithholdingRate?: number
  ) => {
    const ppn = expenseService.calculatePPN(grossAmount, isLuxuryGoods);
    const withholding = expenseService.calculateWithholdingTax(
      grossAmount,
      withholdingType,
      customWithholdingRate
    );

    return {
      grossAmount,
      ppnAmount: ppn.ppnAmount,
      withholdingAmount: withholding.withholdingAmount,
      netAmount: grossAmount - withholding.withholdingAmount,
      totalAmount: grossAmount + ppn.ppnAmount,
      totalPayable: grossAmount + ppn.ppnAmount - withholding.withholdingAmount,
    };
  },

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate e-Faktur NSFP format
   *
   * Format: 010.123-25.12345678
   *
   * @param nsfp - e-Faktur serial number
   * @returns Whether NSFP is valid
   */
  validateNSFP: (nsfp: string): boolean => {
    const pattern = /^\d{3}\.\d{3}-\d{2}\.\d{8}$/;
    return pattern.test(nsfp);
  },

  /**
   * Validate NPWP format
   *
   * Format: 01.234.567.8-901.000
   *
   * @param npwp - Tax identification number
   * @returns Whether NPWP is valid
   */
  validateNPWP: (npwp: string): boolean => {
    const pattern = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;
    return pattern.test(npwp);
  },

  /**
   * Validate PSAK account code format
   *
   * Format: 6-1010, 6-2020, 8-1010, etc.
   *
   * @param accountCode - PSAK account code
   * @returns Whether account code is valid
   */
  validateAccountCode: (accountCode: string): boolean => {
    const pattern = /^[6-8]-\d{4}$/;
    return pattern.test(accountCode);
  },

  // ============================================================================
  // FORMATTING HELPERS
  // ============================================================================

  /**
   * Format Indonesian Rupiah
   *
   * @param amount - Amount to format
   * @returns Formatted IDR string
   */
  formatIDR: (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  },

  /**
   * Format NPWP for display
   *
   * @param npwp - NPWP string
   * @returns Formatted NPWP
   */
  formatNPWP: (npwp: string): string => {
    const cleaned = npwp.replace(/\D/g, '');
    if (cleaned.length !== 15) return npwp;

    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}.${cleaned.substring(8, 9)}-${cleaned.substring(9, 12)}.${cleaned.substring(12, 15)}`;
  },

  /**
   * Format NSFP (e-Faktur Serial Number) for display
   *
   * @param nsfp - NSFP string
   * @returns Formatted NSFP
   */
  formatNSFP: (nsfp: string): string => {
    const cleaned = nsfp.replace(/\D/g, '');
    if (cleaned.length !== 16) return nsfp;

    return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}.${cleaned.substring(8, 16)}`;
  },

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  /**
   * Get expense status color for UI
   *
   * @param status - Expense status
   * @returns Tailwind CSS color classes
   */
  getStatusColor: (status: ExpenseStatus): string => {
    switch (status) {
      case 'DRAFT':
        return 'text-gray-600 bg-gray-100';
      case 'SUBMITTED':
        return 'text-blue-600 bg-blue-100';
      case 'APPROVED':
        return 'text-green-600 bg-green-100';
      case 'REJECTED':
        return 'text-red-600 bg-red-100';
      case 'CANCELLED':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  /**
   * Get payment status color for UI
   *
   * @param status - Payment status
   * @returns Tailwind CSS color classes
   */
  getPaymentStatusColor: (status: ExpensePaymentStatus): string => {
    switch (status) {
      case 'UNPAID':
        return 'text-red-600 bg-red-100';
      case 'PARTIALLY_PAID':
        return 'text-orange-600 bg-orange-100';
      case 'PAID':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  /**
   * Get Indonesian status label
   *
   * @param status - Expense status
   * @returns Indonesian status label
   */
  getStatusLabel: (status: ExpenseStatus): string => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SUBMITTED':
        return 'Diajukan';
      case 'APPROVED':
        return 'Disetujui';
      case 'REJECTED':
        return 'Ditolak';
      case 'CANCELLED':
        return 'Dibatalkan';
      default:
        return status;
    }
  },

  /**
   * Get Indonesian payment status label
   *
   * @param status - Payment status
   * @returns Indonesian payment status label
   */
  getPaymentStatusLabel: (status: ExpensePaymentStatus): string => {
    switch (status) {
      case 'UNPAID':
        return 'Belum Dibayar';
      case 'PARTIALLY_PAID':
        return 'Dibayar Sebagian';
      case 'PAID':
        return 'Lunas';
      default:
        return status;
    }
  },

  /**
   * Check if expense can be edited
   *
   * @param expense - Expense object
   * @returns Whether expense can be edited
   */
  canEdit: (expense: Expense): boolean => {
    return expense.status === 'DRAFT';
  },

  /**
   * Check if expense can be deleted
   *
   * @param expense - Expense object
   * @returns Whether expense can be deleted
   */
  canDelete: (expense: Expense): boolean => {
    return expense.status === 'DRAFT';
  },

  /**
   * Check if expense can be submitted
   *
   * @param expense - Expense object
   * @returns Whether expense can be submitted
   */
  canSubmit: (expense: Expense): boolean => {
    return expense.status === 'DRAFT';
  },

  /**
   * Check if expense can be approved
   *
   * @param expense - Expense object
   * @param userRole - Current user's role
   * @returns Whether expense can be approved
   */
  canApprove: (expense: Expense, userRole: string): boolean => {
    return (
      expense.status === 'SUBMITTED' &&
      (userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER')
    );
  },

  /**
   * Check if expense can be rejected
   *
   * @param expense - Expense object
   * @param userRole - Current user's role
   * @returns Whether expense can be rejected
   */
  canReject: (expense: Expense, userRole: string): boolean => {
    return (
      expense.status === 'SUBMITTED' &&
      (userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER')
    );
  },

  /**
   * Check if expense can be marked as paid
   *
   * @param expense - Expense object
   * @param userRole - Current user's role
   * @returns Whether expense can be marked as paid
   */
  canMarkPaid: (expense: Expense, userRole: string): boolean => {
    return (
      expense.status === 'APPROVED' &&
      expense.paymentStatus !== 'PAID' &&
      (userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER')
    );
  },
};
