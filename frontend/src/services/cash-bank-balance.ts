import { apiClient } from '../config/api';

export interface CashBankBalance {
  id: string;
  period: string; // e.g., "Januari 2025"
  periodDate: string; // First day of the period
  year: number;
  month: number;
  openingBalance: number; // Manual input
  closingBalance: number; // Auto-calculated
  totalInflow: number; // Auto-calculated from journal entries
  totalOutflow: number; // Auto-calculated from journal entries
  netChange: number; // Auto-calculated
  calculatedAt?: string;
  calculatedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CashBankBalanceQueryParams {
  year?: number;
  month?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CashBankBalanceResponse {
  data: CashBankBalance[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Create a new cash/bank balance record
export const createCashBankBalance = async (data: {
  period: string;
  periodDate: string;
  year: number;
  month: number;
  openingBalance: number;
  notes?: string;
  createdBy?: string;
}): Promise<CashBankBalance> => {
  const response = await apiClient.post('/accounting/cash-bank-balances', data);
  return response.data;
};

// Get all cash/bank balances with pagination and filtering
export const getCashBankBalances = async (
  params?: CashBankBalanceQueryParams
): Promise<CashBankBalanceResponse> => {
  const response = await apiClient.get('/accounting/cash-bank-balances', { params });
  // Backend wraps response in { data: { data: [...], meta: {...} } }
  return response.data.data;
};

// Get a single cash/bank balance by ID
export const getCashBankBalance = async (id: string): Promise<CashBankBalance> => {
  const response = await apiClient.get(`/accounting/cash-bank-balances/${id}`);
  return response.data;
};

// Get cash/bank balance by year and month
export const getCashBankBalanceByPeriod = async (
  year: number,
  month: number
): Promise<CashBankBalance> => {
  const response = await apiClient.get(`/accounting/cash-bank-balances/period/${year}/${month}`);
  return response.data;
};

// Update a cash/bank balance record
export const updateCashBankBalance = async (
  id: string,
  data: {
    openingBalance?: number;
    notes?: string;
  }
): Promise<CashBankBalance> => {
  const response = await apiClient.patch(`/accounting/cash-bank-balances/${id}`, data);
  return response.data;
};

// Recalculate balance from journal entries
export const recalculateCashBankBalance = async (id: string): Promise<CashBankBalance> => {
  const response = await apiClient.post(`/accounting/cash-bank-balances/${id}/recalculate`);
  return response.data;
};

// Delete a cash/bank balance record
export const deleteCashBankBalance = async (id: string): Promise<void> => {
  await apiClient.delete(`/accounting/cash-bank-balances/${id}`);
};
