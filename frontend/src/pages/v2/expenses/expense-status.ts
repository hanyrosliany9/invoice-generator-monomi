import type { TFunction } from 'i18next';

/**
 * Localised labels for the expense lifecycle (`status`) and payment state
 * (`paymentStatus`). Shared by the list, detail and form so the same badge never
 * reads "Paid" in one place and "Lunas" in another.
 */
const STATUS: Partial<Record<string, [string, string]>> = {
  DRAFT: ['expenseStatus.draft', 'Draft'],
  SUBMITTED: ['expenseStatus.submitted', 'Submitted'],
  APPROVED: ['expenseStatus.approved', 'Approved'],
  REJECTED: ['expenseStatus.rejected', 'Rejected'],
  PAID: ['expenseStatus.paid', 'Paid'],
  CANCELLED: ['expenseStatus.cancelled', 'Cancelled'],
};

const PAYMENT: Partial<Record<string, [string, string]>> = {
  UNPAID: ['expensePayment.unpaid', 'Unpaid'],
  PARTIALLY_PAID: ['expensePayment.partiallyPaid', 'Partially Paid'],
  PAID: ['expensePayment.paid', 'Paid'],
};

export const expenseStatusLabel = (t: TFunction, s?: string): string => {
  const e = STATUS[s ?? ''];
  return e !== undefined ? t(e[0], e[1]) : (s ?? '—');
};

export const expensePaymentLabel = (t: TFunction, s?: string): string => {
  const e = PAYMENT[s ?? ''];
  return e !== undefined ? t(e[0], e[1]) : (s ?? '—');
};
