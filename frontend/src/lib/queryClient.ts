import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient shared across the application.
 *
 * Exporting from a dedicated module (instead of creating it inline in main.tsx)
 * allows non-React code (e.g. the auth store) to call queryClient.clear() on
 * logout without creating circular imports.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (dedupes refetches within a page session)
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      // Always refetch when a query observer (re)mounts — i.e. when the user
      // navigates to a page. Without this, with staleTime=5min, opening an
      // accounting page within 5 min of a prior visit served STALE cache, so a
      // freshly-created expense/invoice/payment did not appear until the cache
      // expired. 'always' shows cached data instantly, then refreshes in the
      // background, so every page reflects the current GL on navigation.
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Every TanStack query key used by an accounting page/report. Anything that posts
 * to the General Ledger (expense, invoice, payment, manual journal, depreciation…)
 * should call invalidateAccountingQueries() so already-open accounting pages refresh
 * immediately — not just on next navigation.
 */
const ACCOUNTING_QUERY_KEYS: string[] = [
  'journal-entries', 'journal-entry', 'general-ledger', 'cash-account-ledger',
  'cash-bank-balances', 'cash-transactions', 'bank-reconciliations', 'bank-transfers',
  'chart-of-accounts', 'depreciation-summary', 'ecl-summary', 'current-fiscal-period',
];
// Financial-statement queries are keyed under the ['v2', <report>, …] namespace.
const ACCOUNTING_V2_REPORTS: string[] = [
  'ar-report', 'ap-report', 'ar-aging', 'ap-aging',
  'balance-sheet', 'cash-flow', 'income-statement', 'trial-balance',
];

export function invalidateAccountingQueries(qc = queryClient): void {
  for (const key of ACCOUNTING_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey: [key] });
  }
  for (const report of ACCOUNTING_V2_REPORTS) {
    qc.invalidateQueries({ queryKey: ['v2', report] });
  }
}
