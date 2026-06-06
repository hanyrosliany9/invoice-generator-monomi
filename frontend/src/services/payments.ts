import { apiClient } from '../config/api';

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'OTHER';

export interface Payment {
  id: string;
  invoiceId?: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  bankDetails?: string;
  status: string;
  confirmedAt?: string;
  createdAt?: string;
}

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate: string; // ISO
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  bankDetails?: string;
}

export const paymentService = {
  /** Create a payment (server records it as PENDING). */
  create: async (input: CreatePaymentInput): Promise<Payment> => {
    const res = await apiClient.post('/payments', input);
    if (!res?.data?.data) throw new Error('Failed to record payment');
    return res.data.data;
  },

  /** Confirm a payment → posts the cash-receipt journal + updates invoice status. */
  confirm: async (id: string): Promise<Payment> => {
    const res = await apiClient.patch(`/payments/${id}/confirm`);
    if (!res?.data?.data) throw new Error('Failed to confirm payment');
    return res.data.data;
  },

  /**
   * Record + immediately confirm so the payment posts to the ledger and the
   * invoice status updates in one user action (partial or full).
   */
  record: async (input: CreatePaymentInput): Promise<Payment> => {
    const created = await paymentService.create(input);
    return paymentService.confirm(created.id);
  },

  /** Payment history for an invoice (newest first). */
  getByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    const res = await apiClient.get(`/payments/invoice/${invoiceId}`);
    return res?.data?.data ?? [];
  },
};
