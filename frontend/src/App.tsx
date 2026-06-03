import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { App as AntApp, Layout, Spin } from 'antd'
import { lazy, Suspense, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/auth'
import { usePermissions } from './hooks/usePermissions'
import { useMediaTokenStore } from './stores/mediaTokenStore'
import { dateTimeSync } from './services/dateTimeSync'
import { tokenRefreshService } from './services/token-refresh.service'
import ErrorBoundary from './components/ErrorBoundary'
import { scheduleIdlePrefetch } from './lib/routePrefetch'

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
const V2CalendarPage = lazy(() => import('./pages/v2/calendar/CalendarPage'))
const V2ContentCalendarPage = lazy(() => import('./pages/v2/calendar/ContentCalendarPage'))
const V2CallSheetsListPage = lazy(() => import('./pages/v2/call-sheets/CallSheetsListPage'))
const V2CallSheetEditorPage = lazy(() => import('./pages/v2/call-sheets/CallSheetEditorPage'))
const V2DecksPage = lazy(() => import('./pages/v2/decks/DecksPage'))
const V2DeckEditorPage = lazy(() => import('./pages/v2/decks/DeckEditorPage'))
const V2ShotListsPage = lazy(() => import('./pages/v2/shot-lists/ShotListsPage'))
const V2ShotListEditorPage = lazy(() => import('./pages/v2/shot-lists/ShotListEditorPage'))
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
const V2ARAgingPage = lazy(() => import('./pages/v2/accounting/ARAgingPage'))
const V2APAgingPage = lazy(() => import('./pages/v2/accounting/APAgingPage'))
const V2CashReceiptsPage = lazy(() => import('./pages/v2/accounting/CashReceiptsPage'))
const V2CashDisbursementsPage = lazy(() => import('./pages/v2/accounting/CashDisbursementsPage'))
const V2GuestAcceptInvitePage = lazy(() => import('./pages/v2/guest/GuestAcceptInvitePage'))
const V2GuestProjectViewPage = lazy(() => import('./pages/v2/guest/GuestProjectViewPage'))
const V2PublicProjectViewPage = lazy(() => import('./pages/v2/guest/PublicProjectViewPage'))
const V2MediaDownloaderPage = lazy(() => import('./pages/v2/downloaders/MediaDownloaderPage'))
const V2PinterestDownloaderPage = lazy(() => import('./pages/v2/downloaders/PinterestDownloaderPage'))
const V2SalariesPage = lazy(() => import('./pages/v2/salaries/SalariesPage'))
const V2StaffFormPage = lazy(() => import('./pages/v2/salaries/StaffFormPage'))
const V2SalaryPaymentFormPage = lazy(() => import('./pages/v2/salaries/SalaryPaymentFormPage'))

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

// Back-compat: old /v2/* deep links and bookmarks redirect to the same path
// without the prefix (e.g. /v2/invoices/123 -> /invoices/123).
function StripV2Redirect() {
  const location = useLocation()
  const target = location.pathname.replace(/^\/v2/, '') || '/'
  return <Navigate to={`${target}${location.search}`} replace />
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
          <Route path='/shared/:token' element={<Suspense fallback={<PageLoader />}><V2PublicProjectViewPage /></Suspense>} />

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
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path='/' element={<RootLanding />} />
                      <Route path='/style-guide' element={<StyleGuidePage />} />

                      {/* Sales */}
                      <Route path='/invoices' element={<V2InvoicesPage />} />
                      <Route path='/invoices/new' element={<V2InvoiceCreatePage />} />
                      <Route path='/invoices/:id' element={<V2InvoiceDetailPage />} />
                      <Route path='/invoices/:id/edit' element={<V2InvoiceEditPage />} />
                      <Route path='/quotations' element={<V2QuotationsPage />} />
                      <Route path='/quotations/new' element={<V2QuotationCreatePage />} />
                      <Route path='/quotations/:id' element={<V2QuotationDetailPage />} />
                      <Route path='/quotations/:id/edit' element={<V2QuotationEditPage />} />
                      <Route path='/clients' element={<V2ClientsPage />} />
                      <Route path='/clients/new' element={<V2ClientCreatePage />} />
                      <Route path='/clients/:id' element={<V2ClientDetailPage />} />
                      <Route path='/clients/:id/edit' element={<V2ClientEditPage />} />

                      {/* Projects / expenses / vendors / assets */}
                      <Route path='/projects' element={<V2ProjectsPage />} />
                      <Route path='/projects/new' element={<V2ProjectCreatePage />} />
                      <Route path='/projects/:id' element={<V2ProjectDetailPage />} />
                      <Route path='/projects/:id/edit' element={<V2ProjectEditPage />} />
                      <Route path='/projects/:projectId/calendar' element={<V2ProjectCalendarPage />} />
                      <Route path='/projects/:projectId/content-calendar' element={<V2ProjectContentCalendarPage />} />
                      <Route path='/expenses' element={<V2ExpensesPage />} />
                      <Route path='/expenses/new' element={<V2ExpenseCreatePage />} />
                      <Route path='/expenses/categories' element={<V2ExpenseCategoriesPage />} />
                      <Route path='/expenses/:id' element={<V2ExpenseDetailPage />} />
                      <Route path='/expenses/:id/edit' element={<V2ExpenseEditPage />} />
                      <Route path='/vendors' element={<V2VendorsPage />} />
                      <Route path='/vendors/new' element={<V2VendorCreatePage />} />
                      <Route path='/vendors/:id' element={<V2VendorDetailPage />} />
                      <Route path='/vendors/:id/edit' element={<V2VendorEditPage />} />
                      <Route path='/assets' element={<V2AssetsPage />} />
                      <Route path='/assets/new' element={<V2AssetCreatePage />} />
                      <Route path='/assets/:id' element={<V2AssetDetailPage />} />
                      <Route path='/assets/:id/edit' element={<V2AssetEditPage />} />

                      {/* Salaries */}
                      <Route path='/salaries' element={<V2SalariesPage />} />
                      <Route path='/salaries/staff/new' element={<V2StaffFormPage />} />
                      <Route path='/salaries/staff/:id/edit' element={<V2StaffFormPage />} />
                      <Route path='/salaries/payments/new' element={<V2SalaryPaymentFormPage />} />
                      <Route path='/salaries/payments/:id/edit' element={<V2SalaryPaymentFormPage />} />

                      {/* Users / settings */}
                      <Route path='/users' element={<V2UsersPage />} />
                      <Route path='/users/new' element={<V2UserCreatePage />} />
                      <Route path='/users/:id/edit' element={<V2UserEditPage />} />
                      <Route path='/settings' element={<V2SettingsPage />} />

                      {/* Reports */}
                      <Route path='/reports' element={<V2ReportsPage />} />
                      <Route path='/reports/social-media' element={<V2SocialMediaReportsPage />} />
                      <Route path='/reports/builder' element={<V2ReportBuilderPage />} />
                      <Route path='/reports/system/:slug' element={<V2SystemReportPage />} />
                      <Route path='/reports/:id/edit' element={<V2ReportBuilderPage />} />
                      <Route path='/reports/:id' element={<V2ReportDetailPage />} />

                      {/* Calendar / creative tooling */}
                      <Route path='/calendar' element={<V2CalendarPage />} />
                      <Route path='/calendar/content' element={<V2ContentCalendarPage />} />
                      <Route path='/call-sheets' element={<V2CallSheetsListPage />} />
                      <Route path='/call-sheets/:id' element={<V2CallSheetEditorPage />} />
                      <Route path='/decks' element={<V2DecksPage />} />
                      <Route path='/decks/:id' element={<V2DeckEditorPage />} />
                      <Route path='/shot-lists' element={<V2ShotListsPage />} />
                      <Route path='/shot-lists/:id' element={<V2ShotListEditorPage />} />
                      <Route path='/media-collab' element={<V2MediaCollaborationPage />} />
                      <Route path='/media-collab/projects/:projectId' element={<V2MediaProjectDetailPage />} />
                      <Route path='/collections/:id' element={<V2CollectionDetailPage />} />
                      <Route path='/milestones' element={<V2MilestoneAnalyticsPage />} />
                      <Route path='/media-downloader' element={<V2MediaDownloaderPage />} />
                      <Route path='/pinterest-downloader' element={<V2PinterestDownloaderPage />} />

                      {/* Accounting suite */}
                      <Route path='/accounting/chart-of-accounts' element={<V2ChartOfAccountsPage />} />
                      <Route path='/accounting/depreciation' element={<V2DepreciationPage />} />
                      <Route path='/accounting/ecl-provisions' element={<V2ECLProvisionPage />} />
                      <Route path='/accounting/bank-reconciliations' element={<V2BankReconciliationsPage />} />
                      <Route path='/accounting/bank-transfers' element={<V2BankTransfersPage />} />
                      <Route path='/accounting/cash-bank-balance' element={<V2CashBankBalancePage />} />
                      <Route path='/accounting/journal-entries' element={<V2JournalEntriesPage />} />
                      <Route path='/accounting/journal-entries/create' element={<V2JournalEntryFormPage />} />
                      <Route path='/accounting/journal-entries/:id/edit' element={<V2JournalEntryFormPage />} />
                      <Route path='/accounting/adjusting-entries' element={<V2AdjustingEntryWizard />} />
                      <Route path='/accounting/balance-sheet' element={<V2BalanceSheetPage />} />
                      <Route path='/accounting/income-statement' element={<V2IncomeStatementPage />} />
                      <Route path='/accounting/cash-flow' element={<V2CashFlowStatementPage />} />
                      <Route path='/accounting/trial-balance' element={<V2TrialBalancePage />} />
                      <Route path='/accounting/general-ledger' element={<V2GeneralLedgerPage />} />
                      <Route path='/accounting/accounts-receivable' element={<V2AccountsReceivablePage />} />
                      <Route path='/accounting/accounts-payable' element={<V2AccountsPayablePage />} />
                      <Route path='/accounting/ar-aging' element={<V2ARAgingPage />} />
                      <Route path='/accounting/ap-aging' element={<V2APAgingPage />} />
                      <Route path='/accounting/cash-receipts' element={<V2CashReceiptsPage />} />
                      <Route path='/accounting/cash-disbursements' element={<V2CashDisbursementsPage />} />

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
