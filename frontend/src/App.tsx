import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
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
import { WorkflowDashboard } from './pages/WorkflowDashboard'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Routes>
        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <MainLayout>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/quotations/*" element={<QuotationsPage />} />
                    <Route path="/invoices/*" element={<InvoicesPage />} />
                    <Route path="/clients/*" element={<ClientsPage />} />
                    <Route path="/projects/*" element={<ProjectsPage />} />
                    <Route path="/workflow" element={<WorkflowDashboard />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </ErrorBoundary>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Layout>
  )
}

export default App