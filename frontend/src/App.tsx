import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout, Spin } from 'antd'
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
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
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
  )
}

export default App
