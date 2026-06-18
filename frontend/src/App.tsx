import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { App as AntApp, Layout, Spin } from 'antd'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/auth'
import { usePermissions } from './hooks/usePermissions'
import { useMediaTokenStore } from './stores/mediaTokenStore'
import { dateTimeSync } from './services/dateTimeSync'
import { tokenRefreshService } from './services/token-refresh.service'
import ErrorBoundary from './components/ErrorBoundary'
import { scheduleIdlePrefetch } from './lib/routePrefetch'
import { CommandPalette, useCommandPaletteShortcut } from './components/monomi/CommandPalette'

// v2 is now the entire app. Pages are lazy-loaded for performance.
const StyleGuidePage = lazy(() =>
  import('./pages/v2/StyleGuidePage').then(module => ({
    default: module.default,
  }))
)
const V2DashboardPage = lazy(() =>
  import('./pages/v2/DashboardPage').then(module => ({
    default: module.default,
  }))
)
const V2LoginPage = lazy(() =>
  import('./pages/v2/auth/LoginPage').then(module => ({
    default: module.default,
  }))
)
const V2InvoicesPage = lazy(() => import('./pages/v2/invoices/InvoicesPage'))
const V2InvoiceDetailPage = lazy(() => import('./pages/v2/invoices/InvoiceDetailPage'))
const V2InvoiceCreatePage = lazy(() => import('./pages/v2/invoices/InvoiceCreatePage'))
const V2InvoiceEditPage = lazy(() => import('./pages/v2/invoices/InvoiceEditPage'))
const V2QuotationsPage = lazy(() => import('./pages/v2/quotations/QuotationsPage'))
const V2QuotationDetailPage = lazy(() => import('./pages/v2/quotations/QuotationDetailPage'))
const V2QuotationCreatePage = lazy(() => import('./pages/v2/quotations/QuotationCreatePage'))
const V2QuotationEditPage = lazy(() => import('./pages/v2/quotations/QuotationEditPage'))
const V2ClientsPage = lazy(() => import('./pages/v2/clients/ClientsPage'))
const V2ClientDetailPage = lazy(() => import('./pages/v2/clients/ClientDetailPage'))
const V2ClientCreatePage = lazy(() => import('./pages/v2/clients/ClientCreatePage'))
const V2ClientEditPage = lazy(() => import('./pages/v2/clients/ClientEditPage'))
const V2ProjectsPage = lazy(() => import('./pages/v2/projects/ProjectsPage'))
const V2ProjectDetailPage = lazy(() => import('./pages/v2/projects/ProjectDetailPage'))
const V2ProjectCreatePage = lazy(() => import('./pages/v2/projects/ProjectCreatePage'))
const V2ProjectEditPage = lazy(() => import('./pages/v2/projects/ProjectEditPage'))
const V2ProductionHubPage = lazy(() => import('./pages/v2/projects/ProductionHubPage'))
const V2ExpensesPage = lazy(() => import('./pages/v2/expenses/ExpensesPage'))
const V2ExpenseDetailPage = lazy(() => import('./pages/v2/expenses/ExpenseDetailPage'))
const V2ExpenseCreatePage = lazy(() => import('./pages/v2/expenses/ExpenseCreatePage'))
const V2ExpenseEditPage = lazy(() => import('./pages/v2/expenses/ExpenseEditPage'))
const V2ExpenseCategoriesPage = lazy(() => import('./pages/v2/expenses/ExpenseCategoriesPage'))
const V2VendorsPage = lazy(() => import('./pages/v2/vendors/VendorsPage'))
const V2VendorDetailPage = lazy(() => import('./pages/v2/vendors/VendorDetailPage'))
const V2VendorCreatePage = lazy(() => import('./pages/v2/vendors/VendorCreatePage'))
const V2VendorEditPage = lazy(() => import('./pages/v2/vendors/VendorEditPage'))
const V2UsersPage = lazy(() => import('./pages/v2/users/UsersPage'))
const V2UserCreatePage = lazy(() => import('./pages/v2/users/UserCreatePage'))
const V2UserEditPage = lazy(() => import('./pages/v2/users/UserEditPage'))
const V2SettingsPage = lazy(() => import('./pages/v2/SettingsPage'))
const V2AssetsPage = lazy(() => import('./pages/v2/assets/AssetsPage'))
const V2AssetDetailPage = lazy(() => import('./pages/v2/assets/AssetDetailPage'))
const V2AssetCreatePage = lazy(() => import('./pages/v2/assets/AssetCreatePage'))
const V2AssetEditPage = lazy(() => import('./pages/v2/assets/AssetEditPage'))
const V2ReportsPage = lazy(() => import('./pages/v2/reports/ReportsPage'))
const V2ReportDetailPage = lazy(() => import('./pages/v2/reports/ReportDetailPage'))
const V2ReportBuilderPage = lazy(() => import('./pages/v2/reports/ReportBuilderPage'))
const V2SocialMediaReportsPage = lazy(() => import('./pages/v2/reports/SocialMediaReportsPage'))
const V2SystemReportPage = lazy(() => import('./pages/v2/reports/SystemReportPage'))
const V2MonthlyBusinessReportPage = lazy(() => import('./pages/v2/reports/MonthlyBusinessReportPage'))
const V2CalendarPage = lazy(() => import('./pages/v2/calendar/CalendarPage'))
const V2ContentCalendarPage = lazy(() => import('./pages/v2/calendar/ContentCalendarPage'))
const V2ContentCalendarClientsPage = lazy(() => import('./pages/v2/calendar/ContentCalendarClientsPage'))
const V2CallSheetsListPage = lazy(() => import('./pages/v2/call-sheets/CallSheetsListPage'))
const V2CallSheetEditorPage = lazy(() => import('./pages/v2/call-sheets/CallSheetEditorPage'))
const V2DecksPage = lazy(() => import('./pages/v2/decks/DecksPage'))
const V2DeckEditorPage = lazy(() => import('./pages/v2/decks/DeckEditorPage'))
const V2ShotListsPage = lazy(() => import('./pages/v2/shot-lists/ShotListsPage'))
const V2ShotListEditorPage = lazy(() => import('./pages/v2/shot-lists/ShotListEditorPage'))
const V2SchedulesPage = lazy(() => import('./pages/v2/schedules/SchedulesPage'))
const V2ScheduleEditorPage = lazy(() => import('./pages/v2/schedules/ScheduleEditorPage'))
const V2MediaCollaborationPage = lazy(() => import('./pages/v2/media/MediaCollaborationPage'))
const V2MediaProjectDetailPage = lazy(() => import('./pages/v2/media/MediaProjectDetailPage'))
const V2CollectionDetailPage = lazy(() => import('./pages/v2/collections/CollectionDetailPage'))
const V2MilestoneAnalyticsPage = lazy(() => import('./pages/v2/milestones/MilestoneAnalyticsPage'))
const V2ProjectCalendarPage = lazy(() => import('./pages/v2/projects/ProjectCalendarPage'))
const V2ProjectContentCalendarPage = lazy(() => import('./pages/v2/projects/ProjectContentCalendarPage'))
const V2ChartOfAccountsPage = lazy(() => import('./pages/v2/accounting/ChartOfAccountsPage'))
const V2DepreciationPage = lazy(() => import('./pages/v2/accounting/DepreciationPage'))
const V2ECLProvisionPage = lazy(() => import('./pages/v2/accounting/ECLProvisionPage'))
const V2BankReconciliationsPage = lazy(() => import('./pages/v2/accounting/BankReconciliationsPage'))
const V2BankTransfersPage = lazy(() => import('./pages/v2/accounting/BankTransfersPage'))
const V2CashBankBalancePage = lazy(() => import('./pages/v2/accounting/CashBankBalancePage'))
const V2JournalEntriesPage = lazy(() => import('./pages/v2/accounting/JournalEntriesPage'))
const V2JournalEntryFormPage = lazy(() => import('./pages/v2/accounting/JournalEntryFormPage'))
const V2AdjustingEntryWizard = lazy(() => import('./pages/v2/accounting/AdjustingEntryWizard'))
const V2BalanceSheetPage = lazy(() => import('./pages/v2/accounting/BalanceSheetPage'))
const V2IncomeStatementPage = lazy(() => import('./pages/v2/accounting/IncomeStatementPage'))
const V2CashFlowStatementPage = lazy(() => import('./pages/v2/accounting/CashFlowStatementPage'))
const V2TrialBalancePage = lazy(() => import('./pages/v2/accounting/TrialBalancePage'))
const V2GeneralLedgerPage = lazy(() => import('./pages/v2/accounting/GeneralLedgerPage'))
const V2AccountsReceivablePage = lazy(() => import('./pages/v2/accounting/AccountsReceivablePage'))
const V2AccountsPayablePage = lazy(() => import('./pages/v2/accounting/AccountsPayablePage'))
const V2PurchaseReportPage = lazy(() => import('./pages/v2/accounting/PurchaseReportPage'))
const V2PurchaseCreatePage = lazy(() => import('./pages/v2/accounting/PurchaseCreatePage'))
const V2SalesReportPage = lazy(() => import('./pages/v2/accounting/SalesReportPage'))
const V2SalesCreatePage = lazy(() => import('./pages/v2/accounting/SalesCreatePage'))
const V2ARAgingPage = lazy(() => import('./pages/v2/accounting/ARAgingPage'))
const V2APAgingPage = lazy(() => import('./pages/v2/accounting/APAgingPage'))
const V2CashReceiptsPage = lazy(() => import('./pages/v2/accounting/CashReceiptsPage'))
const V2CashDisbursementsPage = lazy(() => import('./pages/v2/accounting/CashDisbursementsPage'))
const V2GuestAcceptInvitePage = lazy(() => import('./pages/v2/guest/GuestAcceptInvitePage'))
const V2GuestProjectViewPage = lazy(() => import('./pages/v2/guest/GuestProjectViewPage'))
const V2PublicProjectViewPage = lazy(() => import('./pages/v2/guest/PublicProjectViewPage'))
const V2PublicContentViewPage = lazy(() => import('./pages/v2/guest/PublicContentViewPage'))
const V2MediaDownloaderPage = lazy(() => import('./pages/v2/downloaders/MediaDownloaderPage'))
const V2PinterestDownloaderPage = lazy(() => import('./pages/v2/downloaders/PinterestDownloaderPage'))
const V2SalariesPage = lazy(() => import('./pages/v2/salaries/SalariesPage'))
const V2StaffFormPage = lazy(() => import('./pages/v2/salaries/StaffFormPage'))
const V2StaffDetailPage = lazy(() => import('./pages/v2/salaries/StaffDetailPage'))
const V2SalaryPaymentFormPage = lazy(() => import('./pages/v2/salaries/SalaryPaymentFormPage'))
const V2PublicDeckViewPage = lazy(() => import('./pages/v2/guest/PublicDeckViewPage'))
const V2DeckAcceptInvitePage = lazy(() => import('./pages/v2/guest/DeckAcceptInvitePage'))
const V2ProjectTypesPage = lazy(() => import('./pages/v2/settings/ProjectTypesPage'))

import './styles/relationships.css'

// Loading component for lazy-loaded routes.
// Intentionally minimal: no full-screen takeover so that already-rendered
// shell (AppShell + sidebar) stays visible while only the content area shows
// a brief spinner. The 150 ms opacity-in delay hides the spinner entirely on
// cache hits (chunk already in browser cache), eliminating the flash.
const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: '12px',
      opacity: 0,
      animation: 'fadeInLoader 0.15s ease 0.15s forwards',
    }}
  >
    <style>{`@keyframes fadeInLoader { to { opacity: 1 } }`}</style>
    <Spin size='large' />
  </div>
)

// Landing at "/" is role-aware: admins get the dashboard; videographers (who
// can't see admin analytics) are sent to their media workspace.
function RootLanding() {
  const { isAdmin } = usePermissions()
  return isAdmin() ? <V2DashboardPage /> : <Navigate to='/media-collab' replace />
}

/**
 * AdminRoute — renders children only when the current user is ADMIN or
 * SUPER_ADMIN (i.e. usePermissions().isAdmin() === true).
 *
 * isAdmin() returns true for ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] and false
 * for VIDEOGRAPHER. A VIDEOGRAPHER hitting an admin URL is redirected to their
 * allowed landing page (/media-collab) instead of the dashboard to avoid an
 * empty/403 experience.
 */
function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = usePermissions()
  return isAdmin() ? <>{children}</> : <Navigate to='/media-collab' replace />
}

// Back-compat: old /v2/* deep links and bookmarks redirect to the same path
// without the prefix (e.g. /v2/invoices/123 -> /invoices/123).
function StripV2Redirect() {
  const location = useLocation()
  const target = location.pathname.replace(/^\/v2/, '') || '/'
  return <Navigate to={`${target}${location.search}`} replace />
}

/**
 * Thin wrapper rendered only when the user is authenticated.
 * Mounts the global CommandPalette once so it's available on every page
 * without each page needing to wire it up individually.
 */
function AuthenticatedCommandPalette() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Toggle (not just open) so Ctrl-K closes an open palette too.
  useCommandPaletteShortcut(() => setPaletteOpen((o) => !o))
  return (
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
  )
}

function App() {
  const { isAuthenticated } = useAuthStore()
  const { token: mediaToken, fetchToken } = useMediaTokenStore()

  // Initialize date/time synchronization on app mount
  useEffect(() => {
    dateTimeSync.initialize().catch(error => {
      console.error('[App] Failed to initialize date/time sync:', error)
    })

    // Cleanup on unmount
    return () => {
      dateTimeSync.stopPeriodicSync()
    }
  }, [])

  // Initialize media token for authenticated users
  useEffect(() => {
    if (isAuthenticated && !mediaToken) {
      console.log('[App] User authenticated, fetching media token...')
      fetchToken()
    }
  }, [isAuthenticated, mediaToken, fetchToken])

  // Initialize token refresh service for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[App] Starting automatic token refresh...')
      tokenRefreshService.startAutoRefresh()
    } else {
      tokenRefreshService.stopAutoRefresh()
    }

    // Cleanup on unmount
    return () => {
      tokenRefreshService.stopAutoRefresh()
    }
  }, [isAuthenticated])

  // Prefetch high-traffic route chunks during idle time so first nav is instant
  useEffect(() => {
    if (isAuthenticated) {
      scheduleIdlePrefetch()
    }
  }, [isAuthenticated])

  return (
    <AntApp>
      <Toaster theme="dark" position="bottom-right" richColors />
      <Layout style={{ minHeight: '100vh' }}>
        <Routes>
          {/* Public / anonymous routes (no auth) */}
          <Route path='/guest/accept' element={<Suspense fallback={<PageLoader />}><V2GuestAcceptInvitePage /></Suspense>} />
          <Route path='/guest/project/:projectId' element={<Suspense fallback={<PageLoader />}><V2GuestProjectViewPage /></Suspense>} />
          <Route path='/shared/content/:token' element={<Suspense fallback={<PageLoader />}><V2PublicContentViewPage /></Suspense>} />
          <Route path='/shared/:token' element={<Suspense fallback={<PageLoader />}><V2PublicProjectViewPage /></Suspense>} />
          <Route path='/deck/shared/:token' element={<Suspense fallback={<PageLoader />}><V2PublicDeckViewPage /></Suspense>} />
          <Route path='/deck/invite/:token' element={<Suspense fallback={<PageLoader />}><V2DeckAcceptInvitePage /></Suspense>} />

          {/* Login — anonymous only */}
          <Route
            path='/login'
            element={
              isAuthenticated
                ? <Navigate to='/' replace />
                : <Suspense fallback={<PageLoader />}><V2LoginPage /></Suspense>
            }
          />

          {/* Back-compat: strip the legacy /v2 prefix from old links */}
          <Route path='/v2/*' element={<StripV2Redirect />} />

          {/* Protected app */}
          <Route
            path='/*'
            element={
              isAuthenticated ? (
                <ErrorBoundary level='page'>
                  {/* Global command palette — available on every authenticated page */}
                  <AuthenticatedCommandPalette />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path='/' element={<RootLanding />} />
                      <Route path='/style-guide' element={<StyleGuidePage />} />

                      {/* ── Admin-only routes ─────────────────────────────────────────────
                       *  All routes below require ADMIN or SUPER_ADMIN.
                       *  A VIDEOGRAPHER hitting any of these URLs is redirected to
                       *  /media-collab by <AdminRoute>.
                       * ─────────────────────────────────────────────────────────────── */}

                      {/* Sales */}
                      <Route path='/invoices' element={<AdminRoute><V2InvoicesPage /></AdminRoute>} />
                      <Route path='/invoices/new' element={<AdminRoute><V2InvoiceCreatePage /></AdminRoute>} />
                      <Route path='/invoices/:id' element={<AdminRoute><V2InvoiceDetailPage /></AdminRoute>} />
                      <Route path='/invoices/:id/edit' element={<AdminRoute><V2InvoiceEditPage /></AdminRoute>} />
                      <Route path='/quotations' element={<AdminRoute><V2QuotationsPage /></AdminRoute>} />
                      <Route path='/quotations/new' element={<AdminRoute><V2QuotationCreatePage /></AdminRoute>} />
                      <Route path='/quotations/:id' element={<AdminRoute><V2QuotationDetailPage /></AdminRoute>} />
                      <Route path='/quotations/:id/edit' element={<AdminRoute><V2QuotationEditPage /></AdminRoute>} />
                      <Route path='/clients' element={<AdminRoute><V2ClientsPage /></AdminRoute>} />
                      <Route path='/clients/new' element={<AdminRoute><V2ClientCreatePage /></AdminRoute>} />
                      <Route path='/clients/:id' element={<AdminRoute><V2ClientDetailPage /></AdminRoute>} />
                      <Route path='/clients/:id/edit' element={<AdminRoute><V2ClientEditPage /></AdminRoute>} />

                      {/* Projects / expenses / vendors / assets */}
                      <Route path='/projects' element={<AdminRoute><V2ProjectsPage /></AdminRoute>} />
                      <Route path='/projects/new' element={<AdminRoute><V2ProjectCreatePage /></AdminRoute>} />
                      <Route path='/projects/:id' element={<AdminRoute><V2ProjectDetailPage /></AdminRoute>} />
                      <Route path='/projects/:id/edit' element={<AdminRoute><V2ProjectEditPage /></AdminRoute>} />
                      <Route path='/projects/:id/production' element={<AdminRoute><V2ProductionHubPage /></AdminRoute>} />
                      <Route path='/projects/:projectId/calendar' element={<AdminRoute><V2ProjectCalendarPage /></AdminRoute>} />
                      <Route path='/projects/:projectId/content-calendar' element={<AdminRoute><V2ProjectContentCalendarPage /></AdminRoute>} />
                      <Route path='/expenses' element={<AdminRoute><V2ExpensesPage /></AdminRoute>} />
                      <Route path='/expenses/new' element={<AdminRoute><V2ExpenseCreatePage /></AdminRoute>} />
                      <Route path='/expenses/categories' element={<AdminRoute><V2ExpenseCategoriesPage /></AdminRoute>} />
                      <Route path='/expenses/:id' element={<AdminRoute><V2ExpenseDetailPage /></AdminRoute>} />
                      <Route path='/expenses/:id/edit' element={<AdminRoute><V2ExpenseEditPage /></AdminRoute>} />
                      <Route path='/vendors' element={<AdminRoute><V2VendorsPage /></AdminRoute>} />
                      <Route path='/vendors/new' element={<AdminRoute><V2VendorCreatePage /></AdminRoute>} />
                      <Route path='/vendors/:id' element={<AdminRoute><V2VendorDetailPage /></AdminRoute>} />
                      <Route path='/vendors/:id/edit' element={<AdminRoute><V2VendorEditPage /></AdminRoute>} />
                      <Route path='/assets' element={<AdminRoute><V2AssetsPage /></AdminRoute>} />
                      <Route path='/assets/new' element={<AdminRoute><V2AssetCreatePage /></AdminRoute>} />
                      <Route path='/assets/:id' element={<AdminRoute><V2AssetDetailPage /></AdminRoute>} />
                      <Route path='/assets/:id/edit' element={<AdminRoute><V2AssetEditPage /></AdminRoute>} />

                      {/* Salaries */}
                      <Route path='/salaries' element={<AdminRoute><V2SalariesPage /></AdminRoute>} />
                      <Route path='/salaries/staff/new' element={<AdminRoute><V2StaffFormPage /></AdminRoute>} />
                      <Route path='/salaries/staff/:id' element={<AdminRoute><V2StaffDetailPage /></AdminRoute>} />
                      <Route path='/salaries/staff/:id/edit' element={<AdminRoute><V2StaffFormPage /></AdminRoute>} />
                      <Route path='/salaries/payments/new' element={<AdminRoute><V2SalaryPaymentFormPage /></AdminRoute>} />
                      <Route path='/salaries/payments/:id/edit' element={<AdminRoute><V2SalaryPaymentFormPage /></AdminRoute>} />

                      {/* User management is available to ADMIN + SUPER_ADMIN
                          (backend @RequireAdmin) — full CRUD incl. role assignment. */}
                      <Route path='/users' element={<AdminRoute><V2UsersPage /></AdminRoute>} />
                      <Route path='/users/new' element={<AdminRoute><V2UserCreatePage /></AdminRoute>} />
                      <Route path='/users/:id/edit' element={<AdminRoute><V2UserEditPage /></AdminRoute>} />
                      {/* Settings is reachable by ANY authenticated user — the page
                          self-filters (Profile/Security/Notifications for everyone;
                          Company/System/Backup for super-admin only). It's the only
                          place a user can change their own password. */}
                      <Route path='/settings' element={<V2SettingsPage />} />
                      <Route path='/settings/project-types' element={<AdminRoute><V2ProjectTypesPage /></AdminRoute>} />

                      {/* Reports */}
                      <Route path='/reports' element={<AdminRoute><V2ReportsPage /></AdminRoute>} />
                      <Route path='/reports/social-media' element={<AdminRoute><V2SocialMediaReportsPage /></AdminRoute>} />
                      <Route path='/reports/builder' element={<AdminRoute><V2ReportBuilderPage /></AdminRoute>} />
                      <Route path='/reports/monthly' element={<AdminRoute><V2MonthlyBusinessReportPage /></AdminRoute>} />
                      <Route path='/reports/system/:slug' element={<AdminRoute><V2SystemReportPage /></AdminRoute>} />
                      <Route path='/reports/:id/edit' element={<AdminRoute><V2ReportBuilderPage /></AdminRoute>} />
                      <Route path='/reports/:id' element={<AdminRoute><V2ReportDetailPage /></AdminRoute>} />

                      {/* ── All-roles routes (VIDEOGRAPHER allowed) ──────────────────────
                       *  Dashboard, media-collab, creative tools, and utility pages are
                       *  accessible to every authenticated role.
                       * ─────────────────────────────────────────────────────────────── */}

                      {/* Calendar / creative tooling.
                          Business calendar is admin-only; content calendar +
                          all production/media tools are open to VIDEOGRAPHER. */}
                      <Route path='/calendar' element={<AdminRoute><V2CalendarPage /></AdminRoute>} />
                      <Route path='/calendar/content' element={<V2ContentCalendarClientsPage />} />
                      <Route path='/calendar/content/clients/:clientId' element={<V2ContentCalendarPage />} />
                      <Route path='/call-sheets' element={<V2CallSheetsListPage />} />
                      <Route path='/call-sheets/:id' element={<V2CallSheetEditorPage />} />
                      <Route path='/decks' element={<V2DecksPage />} />
                      <Route path='/decks/:id' element={<V2DeckEditorPage />} />
                      <Route path='/shot-lists' element={<V2ShotListsPage />} />
                      <Route path='/shot-lists/:id' element={<V2ShotListEditorPage />} />
                      <Route path='/schedules' element={<V2SchedulesPage />} />
                      <Route path='/schedules/:id' element={<V2ScheduleEditorPage />} />
                      <Route path='/media-collab' element={<V2MediaCollaborationPage />} />
                      <Route path='/media-collab/projects/:projectId' element={<V2MediaProjectDetailPage />} />
                      <Route path='/collections/:id' element={<V2CollectionDetailPage />} />
                      <Route path='/milestones' element={<V2MilestoneAnalyticsPage />} />
                      <Route path='/media-downloader' element={<V2MediaDownloaderPage />} />
                      <Route path='/pinterest-downloader' element={<V2PinterestDownloaderPage />} />

                      {/* Accounting suite — admin-only (backend @RequireAdmin).
                          Wrapped so a VIDEOGRAPHER can't reach a broken/403 page
                          by URL; the nav already hides this whole section. */}
                      <Route path='/accounting/chart-of-accounts' element={<AdminRoute><V2ChartOfAccountsPage /></AdminRoute>} />
                      <Route path='/accounting/depreciation' element={<AdminRoute><V2DepreciationPage /></AdminRoute>} />
                      <Route path='/accounting/ecl-provisions' element={<AdminRoute><V2ECLProvisionPage /></AdminRoute>} />
                      <Route path='/accounting/bank-reconciliations' element={<AdminRoute><V2BankReconciliationsPage /></AdminRoute>} />
                      <Route path='/accounting/bank-transfers' element={<AdminRoute><V2BankTransfersPage /></AdminRoute>} />
                      <Route path='/accounting/cash-bank-balance' element={<AdminRoute><V2CashBankBalancePage /></AdminRoute>} />
                      <Route path='/accounting/journal-entries' element={<AdminRoute><V2JournalEntriesPage /></AdminRoute>} />
                      <Route path='/accounting/journal-entries/create' element={<AdminRoute><V2JournalEntryFormPage /></AdminRoute>} />
                      <Route path='/accounting/journal-entries/:id/edit' element={<AdminRoute><V2JournalEntryFormPage /></AdminRoute>} />
                      <Route path='/accounting/adjusting-entries' element={<AdminRoute><V2AdjustingEntryWizard /></AdminRoute>} />
                      <Route path='/accounting/balance-sheet' element={<AdminRoute><V2BalanceSheetPage /></AdminRoute>} />
                      <Route path='/accounting/income-statement' element={<AdminRoute><V2IncomeStatementPage /></AdminRoute>} />
                      <Route path='/accounting/cash-flow' element={<AdminRoute><V2CashFlowStatementPage /></AdminRoute>} />
                      <Route path='/accounting/trial-balance' element={<AdminRoute><V2TrialBalancePage /></AdminRoute>} />
                      <Route path='/accounting/general-ledger' element={<AdminRoute><V2GeneralLedgerPage /></AdminRoute>} />
                      <Route path='/accounting/accounts-receivable' element={<AdminRoute><V2AccountsReceivablePage /></AdminRoute>} />
                      <Route path='/accounting/accounts-payable' element={<AdminRoute><V2AccountsPayablePage /></AdminRoute>} />
                      <Route path='/accounting/purchases' element={<AdminRoute><V2PurchaseReportPage /></AdminRoute>} />
                      <Route path='/accounting/purchases/new' element={<AdminRoute><V2PurchaseCreatePage /></AdminRoute>} />
                      <Route path='/accounting/sales' element={<AdminRoute><V2SalesReportPage /></AdminRoute>} />
                      <Route path='/accounting/sales/new' element={<AdminRoute><V2SalesCreatePage /></AdminRoute>} />
                      <Route path='/accounting/ar-aging' element={<AdminRoute><V2ARAgingPage /></AdminRoute>} />
                      <Route path='/accounting/ap-aging' element={<AdminRoute><V2APAgingPage /></AdminRoute>} />
                      <Route path='/accounting/cash-receipts' element={<AdminRoute><V2CashReceiptsPage /></AdminRoute>} />
                      <Route path='/accounting/cash-disbursements' element={<AdminRoute><V2CashDisbursementsPage /></AdminRoute>} />

                      {/* Unknown → home */}
                      <Route path='*' element={<Navigate to='/' replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <Navigate to='/login' replace />
              )
            }
          />
        </Routes>
      </Layout>
    </AntApp>
  )
}

export default App
