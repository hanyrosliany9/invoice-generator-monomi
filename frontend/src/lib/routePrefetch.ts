/**
 * Route chunk prefetching — eliminates the JS-fetch delay on first navigation.
 *
 * Strategy:
 *  1. On idle (requestIdleCallback after app boot): warm the highest-traffic
 *     routes so the first click is instant for most users.
 *  2. On NavLink hover (onMouseEnter / onFocus): prefetch that specific route's
 *     chunk 200 ms before the user actually clicks.
 *
 * Each dynamic import() is idempotent — the browser caches the result, so
 * calling the same import twice is a no-op after the first fetch.
 */

type ImportFn = () => Promise<unknown>

/**
 * High-frequency routes — loaded eagerly during browser idle time after login.
 * Order matters: most-visited first so the idle budget is spent wisely.
 */
const IDLE_PREFETCH_ROUTES: ImportFn[] = [
  () => import('../pages/v2/DashboardPage'),
  () => import('../pages/v2/invoices/InvoicesPage'),
  () => import('../pages/v2/invoices/InvoiceDetailPage'),
  () => import('../pages/v2/quotations/QuotationsPage'),
  () => import('../pages/v2/quotations/QuotationDetailPage'),
  () => import('../pages/v2/clients/ClientsPage'),
  () => import('../pages/v2/projects/ProjectsPage'),
  () => import('../pages/v2/expenses/ExpensesPage'),
  () => import('../pages/v2/media/MediaCollaborationPage'),
]

/**
 * Map from route `href` (as defined in sidebar-items.tsx) to the lazy import
 * for that chunk.  Used by the hover handler in Sidebar.
 */
export const ROUTE_IMPORT_MAP: Record<string, ImportFn> = {
  '/': () => import('../pages/v2/DashboardPage'),
  '/invoices': () => import('../pages/v2/invoices/InvoicesPage'),
  '/invoices/new': () => import('../pages/v2/invoices/InvoiceCreatePage'),
  '/quotations': () => import('../pages/v2/quotations/QuotationsPage'),
  '/quotations/new': () => import('../pages/v2/quotations/QuotationCreatePage'),
  '/clients': () => import('../pages/v2/clients/ClientsPage'),
  '/clients/new': () => import('../pages/v2/clients/ClientCreatePage'),
  '/projects': () => import('../pages/v2/projects/ProjectsPage'),
  '/projects/new': () => import('../pages/v2/projects/ProjectCreatePage'),
  '/expenses': () => import('../pages/v2/expenses/ExpensesPage'),
  '/expenses/new': () => import('../pages/v2/expenses/ExpenseCreatePage'),
  '/expenses/categories': () => import('../pages/v2/expenses/ExpenseCategoriesPage'),
  '/vendors': () => import('../pages/v2/vendors/VendorsPage'),
  '/assets': () => import('../pages/v2/assets/AssetsPage'),
  '/salaries': () => import('../pages/v2/salaries/SalariesPage'),
  '/reports': () => import('../pages/v2/reports/ReportsPage'),
  '/calendar': () => import('../pages/v2/calendar/CalendarPage'),
  '/calendar/content': () => import('../pages/v2/calendar/ContentCalendarPage'),
  '/call-sheets': () => import('../pages/v2/call-sheets/CallSheetsListPage'),
  '/decks': () => import('../pages/v2/decks/DecksPage'),
  '/shot-lists': () => import('../pages/v2/shot-lists/ShotListsPage'),
  '/media-collab': () => import('../pages/v2/media/MediaCollaborationPage'),
  '/milestones': () => import('../pages/v2/milestones/MilestoneAnalyticsPage'),
  '/accounting/journal-entries': () => import('../pages/v2/accounting/JournalEntriesPage'),
  '/accounting/chart-of-accounts': () => import('../pages/v2/accounting/ChartOfAccountsPage'),
  '/accounting/accounts-receivable': () => import('../pages/v2/accounting/AccountsReceivablePage'),
  '/accounting/accounts-payable': () => import('../pages/v2/accounting/AccountsPayablePage'),
  '/accounting/general-ledger': () => import('../pages/v2/accounting/GeneralLedgerPage'),
  '/accounting/balance-sheet': () => import('../pages/v2/accounting/BalanceSheetPage'),
  '/accounting/income-statement': () => import('../pages/v2/accounting/IncomeStatementPage'),
  '/users': () => import('../pages/v2/users/UsersPage'),
  '/settings': () => import('../pages/v2/SettingsPage'),
}

/** Silently fire-and-forget a single import (errors are swallowed intentionally). */
function warmChunk(importFn: ImportFn): void {
  importFn().catch(() => {/* network unavailable — not fatal */})
}

let idlePrefetchScheduled = false

/**
 * Call once after the user authenticates.
 * Schedules high-traffic route chunks to be fetched during idle periods
 * so the first sidebar click lands on a cached module.
 */
export function scheduleIdlePrefetch(): void {
  if (idlePrefetchScheduled) return
  idlePrefetchScheduled = true

  const prefetchAll = () => {
    IDLE_PREFETCH_ROUTES.forEach(fn => warmChunk(fn))
  }

  if (typeof requestIdleCallback !== 'undefined') {
    // Give the initial paint time to settle before competing for bandwidth.
    requestIdleCallback(prefetchAll, { timeout: 4000 })
  } else {
    // Safari fallback
    setTimeout(prefetchAll, 1500)
  }
}

/**
 * Returns an onMouseEnter / onFocus handler for a NavLink.
 * Pass the route's `href`; we'll look up and warm the matching chunk.
 * Debounced by a 100 ms delay to avoid firing on quick mouse passes.
 */
export function makePrefetchHandlers(href: string) {
  const importFn = ROUTE_IMPORT_MAP[href]
  if (!importFn) return {}

  let timer: ReturnType<typeof setTimeout> | null = null

  const start = () => {
    if (timer) return
    timer = setTimeout(() => { warmChunk(importFn) }, 100)
  }
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null }
  }

  return {
    onMouseEnter: start,
    onFocus: start,
    onMouseLeave: cancel,
    onBlur: cancel,
  }
}
