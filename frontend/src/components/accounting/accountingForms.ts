/**
 * Pure helpers + validators for the cash receipt / disbursement create dialog.
 *
 * Validation mirrors the backend DTOs and services
 * (backend/src/modules/accounting/dto + services) so most mistakes are caught
 * before the request. Error values are i18n keys under `accounting.forms.errors`.
 */

/** Cash (1-101x) and bank (1-102x) accounts — same rule as the backend `isCashOrBank`. */
export const isCashOrBankCode = (code?: string | null): boolean =>
  !!code && /^1-10[12]\d$/.test(code);

/** Digits only -> number (IDR has no decimals in the UI). Empty -> 0. */
export const parseIdr = (raw: string): number => {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

/** Format typed digits with Indonesian thousand separators ("1500000" -> "1.500.000"). */
export const formatIdrInput = (raw: string): string => {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
};

export type FormErrors<K extends string> = Partial<Record<K, string>>;

/* ---------------- cash receipt / disbursement ---------------- */

export interface CashTransactionFormValues {
  transactionDate?: Date;
  amount: string;
  cashAccountId: string;
  offsetAccountId: string;
  description: string;
}

export type CashTransactionField = 'transactionDate' | 'amount' | 'cashAccountId' | 'offsetAccountId' | 'description';

export function validateCashTransaction(v: CashTransactionFormValues): FormErrors<CashTransactionField> {
  const e: FormErrors<CashTransactionField> = {};
  if (!v.transactionDate) e.transactionDate = 'dateRequired';
  if (parseIdr(v.amount) <= 0) e.amount = 'amountPositive';
  if (!v.cashAccountId) e.cashAccountId = 'cashAccountRequired';
  if (!v.offsetAccountId) e.offsetAccountId = 'offsetAccountRequired';
  else if (v.offsetAccountId === v.cashAccountId) e.offsetAccountId = 'offsetSameAsCash';
  if (!v.description.trim()) e.description = 'descriptionRequired';
  return e;
}
