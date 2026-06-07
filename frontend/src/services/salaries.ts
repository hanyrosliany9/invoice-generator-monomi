import { apiClient } from '../config/api';

// ============================================================================
// TYPES
// ============================================================================

export type SalaryPaymentStatus = 'DRAFT' | 'PAID';

export interface Staff {
  id: string;
  name: string;
  position: string;
  email?: string | null;
  phone?: string | null;
  joinedDate?: string | null;
  baseSalary: string | number;
  bankName?: string | null;
  bankAccount?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  salaryPayments?: SalaryPayment[];
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  staff?: Pick<Staff, 'id' | 'name' | 'position'>;
  period: string;
  year: number;
  month: number;
  baseSalary: string | number;
  allowances: string | number;
  deductions: string | number;
  netPay: string | number;
  status: SalaryPaymentStatus;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryStats {
  totalActiveStaff: number;
  thisMonthTotal: number;
  thisMonthPaid: number;
  thisMonthDraft: number;
  totalUnpaid: number;
}

export interface CreateStaffData {
  name: string;
  position: string;
  email?: string;
  phone?: string;
  joinedDate?: string;
  baseSalary: number;
  bankName?: string;
  bankAccount?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateSalaryPaymentData {
  staffId: string;
  period: string;
  year: number;
  month: number;
  baseSalary: number;
  allowances?: number;
  deductions?: number;
  paidAt?: string;
  notes?: string;
}

export interface UpdateSalaryPaymentData extends Partial<CreateSalaryPaymentData> {
  status?: SalaryPaymentStatus;
}

// ============================================================================
// SERVICE
// ============================================================================

export const salaryService = {
  // Stats
  getStats: async (): Promise<SalaryStats> => {
    const res = await apiClient.get('/salaries/stats');
    return res.data.data;
  },

  // Staff CRUD
  listStaff: async (includeInactive = false): Promise<Staff[]> => {
    const res = await apiClient.get('/salaries/staff', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return res.data.data;
  },

  getStaff: async (id: string): Promise<Staff> => {
    const res = await apiClient.get(`/salaries/staff/${id}`);
    return res.data.data;
  },

  createStaff: async (data: CreateStaffData): Promise<Staff> => {
    const res = await apiClient.post('/salaries/staff', data);
    return res.data.data;
  },

  updateStaff: async (id: string, data: Partial<CreateStaffData>): Promise<Staff> => {
    const res = await apiClient.patch(`/salaries/staff/${id}`, data);
    return res.data.data;
  },

  deactivateStaff: async (id: string): Promise<Staff> => {
    const res = await apiClient.delete(`/salaries/staff/${id}`);
    return res.data.data;
  },

  // Payments CRUD
  listPayments: async (params?: {
    staffId?: string;
    year?: number;
    month?: number;
    status?: SalaryPaymentStatus;
  }): Promise<SalaryPayment[]> => {
    const res = await apiClient.get('/salaries/payments', { params });
    return res.data.data;
  },

  getPayment: async (id: string): Promise<SalaryPayment> => {
    const res = await apiClient.get(`/salaries/payments/${id}`);
    return res.data.data;
  },

  createPayment: async (data: CreateSalaryPaymentData): Promise<SalaryPayment> => {
    const res = await apiClient.post('/salaries/payments', data);
    return res.data.data;
  },

  updatePayment: async (id: string, data: UpdateSalaryPaymentData): Promise<SalaryPayment> => {
    const res = await apiClient.patch(`/salaries/payments/${id}`, data);
    return res.data.data;
  },

  markPaid: async (
    id: string,
    opts?: { paidAt?: string; paymentMethod?: string; notes?: string },
  ): Promise<SalaryPayment> => {
    const res = await apiClient.post(`/salaries/payments/${id}/mark-paid`, opts ?? {});
    return res.data.data;
  },

  bulkGeneratePayroll: async (
    year: number,
    month: number,
  ): Promise<{ period: string; created: number; skipped: number; activeStaff: number }> => {
    const res = await apiClient.post('/salaries/payments/bulk-generate', { year, month });
    return res.data.data;
  },

  getPayslipPdf: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(`/salaries/payments/${id}/payslip`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  getPaymentsByStaff: async (staffId: string): Promise<SalaryPayment[]> => {
    const res = await apiClient.get('/salaries/payments', { params: { staffId } });
    return res.data.data;
  },

  deletePayment: async (id: string): Promise<void> => {
    await apiClient.delete(`/salaries/payments/${id}`);
  },
};
