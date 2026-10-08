/**
 * Cash transaction categories. These are the values of the Prisma `CashCategory`
 * enum (backend/prisma/schema.prisma); the API rejects anything else with a 400.
 * Receipts and disbursements use disjoint subsets.
 */
export type CashCategory =
  | 'SALES_REVENUE' | 'SERVICE_REVENUE' | 'OTHER_INCOME'
  | 'OPERATING_EXPENSE' | 'ASSET_PURCHASE' | 'LOAN_REPAYMENT' | 'OTHER_EXPENSE';

export const RECEIPT_CATEGORIES: readonly CashCategory[] = ['SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_INCOME'];
export const DISBURSEMENT_CATEGORIES: readonly CashCategory[] = ['OPERATING_EXPENSE', 'ASSET_PURCHASE', 'LOAN_REPAYMENT', 'OTHER_EXPENSE'];

export const categoriesFor = (type: 'RECEIPT' | 'DISBURSEMENT'): readonly CashCategory[] =>
  type === 'RECEIPT' ? RECEIPT_CATEGORIES : DISBURSEMENT_CATEGORIES;

export const CATEGORY_LABEL_KEY: Record<string, string> = Object.fromEntries(
  [...RECEIPT_CATEGORIES, ...DISBURSEMENT_CATEGORIES].map((c) => [c, `accounting.cashCategory.${c}`]),
);

export const CATEGORY_LABEL_FALLBACK: Record<string, string> = {
  SALES_REVENUE: 'Sales revenue',
  SERVICE_REVENUE: 'Service revenue',
  OTHER_INCOME: 'Other income',
  OPERATING_EXPENSE: 'Operating expense',
  ASSET_PURCHASE: 'Asset purchase',
  LOAN_REPAYMENT: 'Loan repayment',
  OTHER_EXPENSE: 'Other expense',
};
