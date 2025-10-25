import { Navigate, Route, Routes } from 'react-router-dom'
import { App as AntApp, Layout, Spin } from 'antd'
import { lazy, Suspense } from 'react'
import { useAuthStore } from './store/auth'
import { AuthLayout } from './components/layout/AuthLayout'
import { MainLayout } from './components/layout/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
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

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
        <Routes>
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

        {/* Protected Routes */}
        <Route
          path='/*'
          element={
            isAuthenticated ? (
              <MainLayout>
                <ErrorBoundary level='page'>
                  <Routes>
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
                    <Route
                      path='/quotations/:id'
                      element={<QuotationDetailPage />}
                    />
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
                    <Route
                      path='/invoices/:id'
                      element={<InvoiceDetailPage />}
                    />
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
                    <Route
                      path='/projects/:id'
                      element={<ProjectDetailPage />}
                    />
                    <Route
                      path='/projects/:id/edit'
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProjectEditPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path='/projects/:projectId/calendar'
                      element={<ProjectCalendarPage />}
                    />
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

                    {/* Vendor Management Routes */}
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

                    {/* User Management Routes */}
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

                    {/* Accounting Routes */}
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
                    <Route
                      path='/'
                      element={<Navigate to='/dashboard' replace />}
                    />
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
