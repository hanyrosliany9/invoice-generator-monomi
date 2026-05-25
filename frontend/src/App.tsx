import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { App as AntApp, Layout, Spin } from 'antd'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useAuthStore } from './store/auth'
import { usePermissions } from './hooks/usePermissions'
import { useMediaTokenStore } from './stores/mediaTokenStore'
import { dateTimeSync } from './services/dateTimeSync'
import { tokenRefreshService } from './services/token-refresh.service'
import { AuthLayout } from './components/layout/AuthLayout'
import { MainLayout } from './components/layout/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'
import { V2Guard } from './pages/v2/V2RouteGuard'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import GuestAcceptInvitePage from './pages/GuestAcceptInvitePage'
import GuestProjectViewPage from './pages/GuestProjectViewPage'
import PublicProjectViewPage from './pages/PublicProjectViewPage'
import { QuotationsPage } from './pages/QuotationsPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { ClientsPage } from './pages/ClientsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { QuotationDetailPage } from './pages/QuotationDetailPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { AssetsPage } from './pages/AssetsPage'
import { AssetDetailPage } from './pages/AssetDetailPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ExpenseDetailPage } from './pages/ExpenseDetailPage'
import { ExpenseCategoriesPage } from './pages/ExpenseCategoriesPage'
import ChartOfAccountsPage from './pages/accounting/ChartOfAccountsPage'
import JournalEntriesPage from './pages/accounting/JournalEntriesPage'
import IncomeStatementPage from './pages/accounting/IncomeStatementPage'
import BalanceSheetPage from './pages/accounting/BalanceSheetPage'
import TrialBalancePage from './pages/accounting/TrialBalancePage'
import GeneralLedgerPage from './pages/accounting/GeneralLedgerPage'
import CashFlowStatementPage from './pages/accounting/CashFlowStatementPage'
import AccountsReceivablePage from './pages/accounting/AccountsReceivablePage'
import AccountsPayablePage from './pages/accounting/AccountsPayablePage'
import ARAgingPage from './pages/accounting/ARAgingPage'
import APAgingPage from './pages/accounting/APAgingPage'
import DepreciationPage from './pages/accounting/DepreciationPage'
import ECLProvisionPage from './pages/accounting/ECLProvisionPage'
import CashReceiptsPage from './pages/accounting/CashReceiptsPage'
import CashDisbursementsPage from './pages/accounting/CashDisbursementsPage'
import BankTransfersPage from './pages/accounting/BankTransfersPage'
import BankReconciliationsPage from './pages/accounting/BankReconciliationsPage'
import { CashBankBalancePage } from './pages/accounting/CashBankBalancePage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import { CalendarPage } from './pages/CalendarPage'
import { ProjectCalendarPage } from './pages/ProjectCalendarPage'
import { VendorsPage } from './pages/VendorsPage'
import { VendorDetailPage } from './pages/VendorDetailPage'
// DELETED: Campaign page imports - replaced with Universal Social Media Reports
import SocialMediaReportsPage from './pages/SocialMediaReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import ContentCalendarPage from './pages/ContentCalendarPage'
import ProjectContentCalendarPage from './pages/ProjectContentCalendarPage'
import MediaCollaborationPage from './pages/MediaCollaborationPage'
import MediaProjectDetailPage from './pages/MediaProjectDetailPage'
import MediaDownloaderPage from './pages/MediaDownloader'
import DecksPage from './pages/DecksPage'
import ShotListsPage from './pages/ShotListsPage'
import ShotListEditorPage from './pages/ShotListEditorPage'
import CallSheetEditorPage from './pages/CallSheetEditorPage'
import CallSheetsListPage from './pages/CallSheetsListPage'

// Lazy load report builder for performance
const ReportBuilderPage = lazy(() =>
  import('./pages/ReportBuilderPage').then(module => ({
    default: module.ReportBuilderPage,
  }))
)

// Lazy load v2 pages
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
// Wave 8 — project calendars, accounting suite, guest/public, downloaders
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

import './styles/relationships.css'

// Lazy load heavy create/edit pages for performance
const ClientCreatePage = lazy(() =>
  import('./pages/ClientCreatePage').then(module => ({
    default: module.ClientCreatePage,
  }))
)
const ClientEditPage = lazy(() =>
  import('./pages/ClientEditPage').then(module => ({
    default: module.ClientEditPage,
  }))
)
const ProjectCreatePage = lazy(() =>
  import('./pages/ProjectCreatePage').then(module => ({
    default: module.ProjectCreatePage,
  }))
)
const ProjectEditPage = lazy(() =>
  import('./pages/ProjectEditPage').then(module => ({
    default: module.ProjectEditPage,
  }))
)
const QuotationCreatePage = lazy(() =>
  import('./pages/QuotationCreatePage').then(module => ({
    default: module.QuotationCreatePage,
  }))
)
const QuotationEditPage = lazy(() =>
  import('./pages/QuotationEditPage').then(module => ({
    default: module.QuotationEditPage,
  }))
)
const InvoiceCreatePage = lazy(() =>
  import('./pages/InvoiceCreatePage').then(module => ({
    default: module.InvoiceCreatePage,
  }))
)
const InvoiceEditPage = lazy(() =>
  import('./pages/InvoiceEditPage').then(module => ({
    default: module.InvoiceEditPage,
  }))
)
const AssetCreatePage = lazy(() =>
  import('./pages/AssetCreatePage').then(module => ({
    default: module.AssetCreatePage,
  }))
)
const AssetEditPage = lazy(() =>
  import('./pages/AssetEditPage').then(module => ({
    default: module.AssetEditPage,
  }))
)
const ExpenseCreatePage = lazy(() =>
  import('./pages/ExpenseCreatePage').then(module => ({
    default: module.ExpenseCreatePage,
  }))
)
const ExpenseEditPage = lazy(() =>
  import('./pages/ExpenseEditPage').then(module => ({
    default: module.ExpenseEditPage,
  }))
)
const UserCreatePage = lazy(() =>
  import('./pages/UserCreatePage').then(module => ({
    default: module.UserCreatePage,
  }))
)
const UserEditPage = lazy(() =>
  import('./pages/UserEditPage').then(module => ({
    default: module.UserEditPage,
  }))
)
const JournalEntryFormPage = lazy(() =>
  import('./pages/accounting/JournalEntryFormPage').then(module => ({
    default: module.default,
  }))
)
const AdjustingEntryWizard = lazy(() =>
  import('./pages/accounting/AdjustingEntryWizard').then(module => ({
    default: module.default,
  }))
)
const VendorCreatePage = lazy(() =>
  import('./pages/VendorCreatePage').then(module => ({
    default: module.VendorCreatePage,
  }))
)
const VendorEditPage = lazy(() =>
  import('./pages/VendorEditPage').then(module => ({
    default: module.VendorEditPage,
  }))
)
// DELETED: CampaignFormPage lazy load

// Lazy load Deck pages
const DeckEditorPage = lazy(() =>
  import('./pages/DeckEditorPage').then(module => ({
    default: module.default,
  }))
)

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: '16px',
    }}
  >
    <Spin size='large' />
    <div style={{ color: '#666', fontSize: '14px' }}>Loading...</div>
  </div>
)

// Redirects VIDEOGRAPHER away from admin-only routes
function AdminRoute({ children }: { children?: ReactNode }) {
  const { isAdmin } = usePermissions()
  if (!isAdmin()) return <Navigate to='/media-collab' replace />
  return children ? <>{children}</> : <Outlet />
}

// Role-aware default redirect
function DefaultRedirect() {
  const { isAdmin } = usePermissions()
  return <Navigate to={isAdmin() ? '/dashboard' : '/media-collab'} replace />
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

  return (
    <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
        <Routes>
        {/* Guest Routes (No Auth Required) */}
        <Route path='/guest/accept' element={<GuestAcceptInvitePage />} />
        <Route path='/guest/project/:projectId' element={<GuestProjectViewPage />} />
        <Route path='/shared/:token' element={<PublicProjectViewPage />} />

        {/* v2 Guest Routes (No Auth Required) */}
        <Route path='/v2/guest/accept' element={<Suspense fallback={<PageLoader />}><V2Guard><V2GuestAcceptInvitePage /></V2Guard></Suspense>} />
        <Route path='/v2/guest/project/:projectId' element={<Suspense fallback={<PageLoader />}><V2Guard><V2GuestProjectViewPage /></V2Guard></Suspense>} />
        <Route path='/v2/shared/:token' element={<Suspense fallback={<PageLoader />}><V2Guard><V2PublicProjectViewPage /></V2Guard></Suspense>} />

        {/* Auth Routes */}
        <Route
          path='/login'
          element={
            isAuthenticated ? (
              <Navigate to='/dashboard' replace />
            ) : (
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            )
          }
        />

        {/* v2 Login — anonymous-only (mirror of classic /login). Self-contained
            page (full-screen with own AuroraBackground), no AuthLayout wrapper. */}
        <Route
          path='/v2/login'
          element={
            isAuthenticated ? (
              <Navigate to='/v2' replace />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <V2Guard>
                  <V2LoginPage />
                </V2Guard>
              </Suspense>
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path='/*'
          element={
            isAuthenticated ? (
              <MainLayout>
                <ErrorBoundary level='page'>
                  <Routes>
                    {/* Routes accessible by all authenticated roles (VIDEOGRAPHER included) */}
                    <Route path='/media-collab' element={<MediaCollaborationPage />} />
                    <Route path='/media-collab/projects/:projectId' element={<MediaProjectDetailPage />} />
                    <Route path='/pinterest-downloader' element={<Navigate to='/media-downloader' replace />} />
                    <Route path='/media-downloader' element={<MediaDownloaderPage />} />
                    <Route path='/shot-lists' element={<ShotListsPage />} />
                    <Route path='/shot-lists/:id' element={<ShotListEditorPage />} />
                    <Route path='/call-sheets' element={<CallSheetsListPage />} />
                    <Route path='/call-sheets/:id' element={<CallSheetEditorPage />} />

                    {/* v2 redesigned pages (authenticated). /v2/login is OUTSIDE
                        this protected block, declared above with anonymous-only guard. */}
                    <Route path='/v2' element={<Suspense fallback={<PageLoader />}><V2Guard><V2DashboardPage /></V2Guard></Suspense>} />
                    <Route path='/v2/style-guide' element={<Suspense fallback={<PageLoader />}><V2Guard><StyleGuidePage /></V2Guard></Suspense>} />
                    <Route path='/v2/invoices' element={<Suspense fallback={<PageLoader />}><V2Guard><V2InvoicesPage /></V2Guard></Suspense>} />
                    <Route path='/v2/invoices/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2InvoiceCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/invoices/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2InvoiceDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/invoices/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2InvoiceEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/quotations' element={<Suspense fallback={<PageLoader />}><V2Guard><V2QuotationsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/quotations/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2QuotationCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/quotations/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2QuotationDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/quotations/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2QuotationEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/clients' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ClientsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/clients/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ClientCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/clients/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ClientDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/clients/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ClientEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/projects' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ProjectsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/projects/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ProjectCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/projects/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ProjectDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/projects/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ProjectEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/expenses' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ExpensesPage /></V2Guard></Suspense>} />
                    <Route path='/v2/expenses/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ExpenseCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/expenses/categories' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ExpenseCategoriesPage /></V2Guard></Suspense>} />
                    <Route path='/v2/expenses/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ExpenseDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/expenses/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ExpenseEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/vendors' element={<Suspense fallback={<PageLoader />}><V2Guard><V2VendorsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/vendors/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2VendorCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/vendors/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2VendorDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/vendors/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2VendorEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/users' element={<Suspense fallback={<PageLoader />}><V2Guard><V2UsersPage /></V2Guard></Suspense>} />
                    <Route path='/v2/users/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2UserCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/users/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2UserEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/settings' element={<Suspense fallback={<PageLoader />}><V2Guard><V2SettingsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/assets' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AssetsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/assets/new' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AssetCreatePage /></V2Guard></Suspense>} />
                    <Route path='/v2/assets/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AssetDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/assets/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AssetEditPage /></V2Guard></Suspense>} />
                    <Route path='/v2/reports' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ReportsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/reports/social-media' element={<Suspense fallback={<PageLoader />}><V2Guard><V2SocialMediaReportsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/reports/builder' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ReportBuilderPage /></V2Guard></Suspense>} />
                    <Route path='/v2/reports/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ReportBuilderPage /></V2Guard></Suspense>} />
                    <Route path='/v2/reports/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ReportDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/calendar' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CalendarPage /></V2Guard></Suspense>} />
                    <Route path='/v2/calendar/content' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ContentCalendarPage /></V2Guard></Suspense>} />
                    <Route path='/v2/call-sheets' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CallSheetsListPage /></V2Guard></Suspense>} />
                    <Route path='/v2/call-sheets/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CallSheetEditorPage /></V2Guard></Suspense>} />
                    <Route path='/v2/decks' element={<Suspense fallback={<PageLoader />}><V2Guard><V2DecksPage /></V2Guard></Suspense>} />
                    <Route path='/v2/decks/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2DeckEditorPage /></V2Guard></Suspense>} />
                    <Route path='/v2/shot-lists' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ShotListsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/shot-lists/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ShotListEditorPage /></V2Guard></Suspense>} />
                    <Route path='/v2/media-collab' element={<Suspense fallback={<PageLoader />}><V2Guard><V2MediaCollaborationPage /></V2Guard></Suspense>} />
                    <Route path='/v2/media-collab/projects/:projectId' element={<Suspense fallback={<PageLoader />}><V2Guard><V2MediaProjectDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/collections/:id' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CollectionDetailPage /></V2Guard></Suspense>} />
                    <Route path='/v2/milestones' element={<Suspense fallback={<PageLoader />}><V2Guard><V2MilestoneAnalyticsPage /></V2Guard></Suspense>} />

                    {/* Wave 8 — project calendars */}
                    <Route path='/v2/projects/:projectId/calendar' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ProjectCalendarPage /></V2Guard></Suspense>} />
                    <Route path='/v2/projects/:projectId/content-calendar' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ProjectContentCalendarPage /></V2Guard></Suspense>} />

                    {/* Wave 8 — accounting suite */}
                    <Route path='/v2/accounting/chart-of-accounts' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ChartOfAccountsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/depreciation' element={<Suspense fallback={<PageLoader />}><V2Guard><V2DepreciationPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/ecl-provisions' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ECLProvisionPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/bank-reconciliations' element={<Suspense fallback={<PageLoader />}><V2Guard><V2BankReconciliationsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/bank-transfers' element={<Suspense fallback={<PageLoader />}><V2Guard><V2BankTransfersPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/cash-bank-balance' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CashBankBalancePage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/journal-entries' element={<Suspense fallback={<PageLoader />}><V2Guard><V2JournalEntriesPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/journal-entries/create' element={<Suspense fallback={<PageLoader />}><V2Guard><V2JournalEntryFormPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/journal-entries/:id/edit' element={<Suspense fallback={<PageLoader />}><V2Guard><V2JournalEntryFormPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/adjusting-entries' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AdjustingEntryWizard /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/balance-sheet' element={<Suspense fallback={<PageLoader />}><V2Guard><V2BalanceSheetPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/income-statement' element={<Suspense fallback={<PageLoader />}><V2Guard><V2IncomeStatementPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/cash-flow' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CashFlowStatementPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/trial-balance' element={<Suspense fallback={<PageLoader />}><V2Guard><V2TrialBalancePage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/general-ledger' element={<Suspense fallback={<PageLoader />}><V2Guard><V2GeneralLedgerPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/accounts-receivable' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AccountsReceivablePage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/accounts-payable' element={<Suspense fallback={<PageLoader />}><V2Guard><V2AccountsPayablePage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/ar-aging' element={<Suspense fallback={<PageLoader />}><V2Guard><V2ARAgingPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/ap-aging' element={<Suspense fallback={<PageLoader />}><V2Guard><V2APAgingPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/cash-receipts' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CashReceiptsPage /></V2Guard></Suspense>} />
                    <Route path='/v2/accounting/cash-disbursements' element={<Suspense fallback={<PageLoader />}><V2Guard><V2CashDisbursementsPage /></V2Guard></Suspense>} />

                    {/* Wave 8 — internal tooling subapps */}
                    <Route path='/v2/media-downloader' element={<Suspense fallback={<PageLoader />}><V2Guard><V2MediaDownloaderPage /></V2Guard></Suspense>} />
                    <Route path='/v2/pinterest-downloader' element={<Suspense fallback={<PageLoader />}><V2Guard><V2PinterestDownloaderPage /></V2Guard></Suspense>} />

                    <Route path='/v2/*' element={<V2Guard><div /></V2Guard>} />

                    {/* Admin-only routes (SUPER_ADMIN + ADMIN) — VIDEOGRAPHER redirected to /media-collab */}
                    <Route element={<AdminRoute />}>
                      <Route path='/dashboard' element={<DashboardPage />} />
                      <Route path='/quotations' element={<QuotationsPage />} />
                      <Route
                        path='/quotations/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <QuotationCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/quotations/:id' element={<QuotationDetailPage />} />
                      <Route
                        path='/quotations/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <QuotationEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/invoices' element={<InvoicesPage />} />
                      <Route
                        path='/invoices/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <InvoiceCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/invoices/:id' element={<InvoiceDetailPage />} />
                      <Route
                        path='/invoices/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <InvoiceEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/clients' element={<ClientsPage />} />
                      <Route
                        path='/clients/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ClientCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/clients/:id' element={<ClientDetailPage />} />
                      <Route
                        path='/clients/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ClientEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/assets' element={<AssetsPage />} />
                      <Route
                        path='/assets/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <AssetCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/assets/:id' element={<AssetDetailPage />} />
                      <Route
                        path='/assets/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <AssetEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/calendar' element={<CalendarPage />} />
                      <Route path='/projects' element={<ProjectsPage />} />
                      <Route
                        path='/projects/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ProjectCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/projects/:id' element={<ProjectDetailPage />} />
                      <Route
                        path='/projects/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ProjectEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/projects/:projectId/calendar' element={<ProjectCalendarPage />} />
                      <Route path='/expenses' element={<ExpensesPage />} />
                      <Route
                        path='/expenses/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ExpenseCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/expenses/:id' element={<ExpenseDetailPage />} />
                      <Route
                        path='/expenses/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ExpenseEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/expense-categories' element={<ExpenseCategoriesPage />} />
                      <Route path='/vendors' element={<VendorsPage />} />
                      <Route
                        path='/vendors/create'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <VendorCreatePage />
                          </Suspense>
                        }
                      />
                      <Route path='/vendors/:id' element={<VendorDetailPage />} />
                      <Route
                        path='/vendors/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <VendorEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/social-media-reports' element={<SocialMediaReportsPage />} />
                      <Route path='/social-media-reports/:id' element={<ReportDetailPage />} />
                      <Route
                        path='/social-media-reports/:id/builder'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ReportBuilderPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path='/social-media-reports/:id/sections/:sectionId/builder'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ReportBuilderPage />
                          </Suspense>
                        }
                      />
                      <Route path='/content-calendar'>
                        <Route index element={<ContentCalendarPage />} />
                        <Route path='project/:projectId' element={<ProjectContentCalendarPage />} />
                      </Route>
                      <Route path='/decks' element={<DecksPage />} />
                      <Route
                        path='/decks/:id'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <DeckEditorPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path='/decks/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <DeckEditorPage />
                          </Suspense>
                        }
                      />
                      <Route path='/users' element={<UsersPage />} />
                      <Route
                        path='/users/new'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <UserCreatePage />
                          </Suspense>
                        }
                      />
                      <Route
                        path='/users/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <UserEditPage />
                          </Suspense>
                        }
                      />
                      <Route path='/accounting/chart-of-accounts' element={<ChartOfAccountsPage />} />
                      <Route path='/accounting/cash-bank-balance' element={<CashBankBalancePage />} />
                      <Route path='/accounting/journal-entries' element={<JournalEntriesPage />} />
                      <Route
                        path='/accounting/adjusting-entries'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <AdjustingEntryWizard />
                          </Suspense>
                        }
                      />
                      <Route
                        path='/accounting/journal-entries/create'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <JournalEntryFormPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path='/accounting/journal-entries/:id/edit'
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <JournalEntryFormPage />
                          </Suspense>
                        }
                      />
                      <Route path='/accounting/trial-balance' element={<TrialBalancePage />} />
                      <Route path='/accounting/general-ledger' element={<GeneralLedgerPage />} />
                      <Route path='/accounting/income-statement' element={<IncomeStatementPage />} />
                      <Route path='/accounting/balance-sheet' element={<BalanceSheetPage />} />
                      <Route path='/accounting/cash-flow' element={<CashFlowStatementPage />} />
                      <Route path='/accounting/accounts-receivable' element={<AccountsReceivablePage />} />
                      <Route path='/accounting/accounts-payable' element={<AccountsPayablePage />} />
                      <Route path='/accounting/ar-aging' element={<ARAgingPage />} />
                      <Route path='/accounting/ap-aging' element={<APAgingPage />} />
                      <Route path='/accounting/depreciation' element={<DepreciationPage />} />
                      <Route path='/accounting/ecl-provisions' element={<ECLProvisionPage />} />
                      <Route path='/accounting/cash-receipts' element={<CashReceiptsPage />} />
                      <Route path='/accounting/cash-disbursements' element={<CashDisbursementsPage />} />
                      <Route path='/accounting/bank-transfers' element={<BankTransfersPage />} />
                      <Route path='/accounting/bank-reconciliations' element={<BankReconciliationsPage />} />
                      <Route path='/reports' element={<ReportsPage />} />
                      <Route path='/settings' element={<SettingsPage />} />
                    </Route>

                    {/* Default redirect — role-aware */}
                    <Route path='/' element={<DefaultRedirect />} />
                  </Routes>
                </ErrorBoundary>
              </MainLayout>
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
