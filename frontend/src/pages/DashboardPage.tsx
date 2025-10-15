import React from 'react'
import {
  Alert,
  Card,
  Col,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  ClockCircleOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ProjectOutlined,
  RiseOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIDR, safeString } from '../utils/currency'
import { useDashboardData } from '../hooks/useDashboard'
import { RecentInvoice, RecentQuotation } from '../types/dashboard'
import { useTheme } from '../theme'

const { Title, Text } = Typography

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size='large' />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message='Error loading dashboard data'
        description={
          error instanceof Error ? error.message : 'Something went wrong'
        }
        type='error'
        showIcon
        action={
          <Space>
            <button onClick={() => refetch()}>Retry</button>
          </Space>
        }
      />
    )
  }

  const stats = dashboardData?.stats || {
    totalQuotations: 0,
    totalInvoices: 0,
    totalClients: 0,
    totalProjects: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  }

  const recentQuotations = dashboardData?.recentQuotations || []
  const recentInvoices = dashboardData?.recentInvoices || []

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      sent: 'blue',
      approved: 'green',
      declined: 'red',
      paid: 'green',
      overdue: 'red',
      pending: 'orange',
    }
    return colors[status.toLowerCase() as keyof typeof colors] || 'default'
  }

  const quotationColumns = [
    {
      title: 'Nomor',
      dataIndex: 'quotationNumber',
      key: 'quotationNumber',
    },
    {
      title: 'Klien',
      dataIndex: 'client',
      key: 'client',
      render: (client: RecentQuotation['client']) =>
        safeString(client?.name) || 'N/A',
    },
    {
      title: 'Proyek',
      dataIndex: 'project',
      key: 'project',
      render: (project: RecentQuotation['project']) =>
        safeString(project?.description) || 'N/A',
    },
    {
      title: 'Jumlah',
      key: 'amount',
      render: (_: any, record: RecentQuotation) => (
        <Text className='idr-amount'>
          {formatIDR(parseFloat(record.totalAmount) || 0)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            DRAFT: 'Draft',
            SENT: 'Terkirim',
            APPROVED: 'Disetujui',
            DECLINED: 'Ditolak',
            REVISED: 'Revisi',
          }
          return statusMap[status as keyof typeof statusMap] || status
        }

        return <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      },
    },
  ]

  const invoiceColumns = [
    {
      title: 'Nomor',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: 'Klien',
      dataIndex: 'client',
      key: 'client',
      render: (client: RecentInvoice['client']) =>
        safeString(client?.name) || 'N/A',
    },
    {
      title: 'Proyek',
      dataIndex: 'project',
      key: 'project',
      render: (project: RecentInvoice['project']) =>
        safeString(project?.description) || 'N/A',
    },
    {
      title: 'Jumlah',
      key: 'amount',
      render: (_: any, record: RecentInvoice) => (
        <Text className='idr-amount'>
          {formatIDR(parseFloat(record.totalAmount) || 0)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            DRAFT: 'Draft',
            SENT: 'Terkirim',
            PAID: 'Lunas',
            OVERDUE: 'Jatuh Tempo',
            CANCELLED: 'Dibatalkan',
            PENDING: 'Tertunda',
          }
          return statusMap[status as keyof typeof statusMap] || status
        }

        return <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      },
    },
    {
      title: 'Jatuh Tempo',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate: string) => (
        <Text>{new Date(dueDate).toLocaleDateString('id-ID')}</Text>
      ),
    },
  ]

  return (
    <div
      style={{ background: 'transparent' }}
      data-testid='dashboard-container'
    >
      <div style={{ marginBottom: '32px' }}>
        <Title
          level={2}
          style={{
            color: theme.colors.text.primary,
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '8px',
          }}
        >
          {t('dashboard.title')}
        </Title>
        <Text style={{ color: theme.colors.text.secondary, fontSize: '16px' }}>
          Welcome back! Here's what's happening with your business today.
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: '16px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Statistic
              title={t('dashboard.totalQuotations')}
              value={stats.totalQuotations}
              prefix={
                <FileTextOutlined
                  style={{
                    fontSize: '24px',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.15)',
                    padding: '8px',
                    borderRadius: '12px',
                  }}
                />
              }
              valueStyle={{
                color: theme.colors.text.primary,
                fontSize: '28px',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: '16px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Statistic
              title={t('dashboard.totalInvoices')}
              value={stats.totalInvoices}
              prefix={
                <FileDoneOutlined
                  style={{
                    fontSize: '24px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '8px',
                    borderRadius: '12px',
                  }}
                />
              }
              valueStyle={{
                color: theme.colors.text.primary,
                fontSize: '28px',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: '16px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Statistic
              title={t('dashboard.totalClients')}
              value={stats.totalClients}
              prefix={
                <UserOutlined
                  style={{
                    fontSize: '24px',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.15)',
                    padding: '8px',
                    borderRadius: '12px',
                  }}
                />
              }
              valueStyle={{
                color: theme.colors.text.primary,
                fontSize: '28px',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: '16px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Statistic
              title={t('dashboard.totalProjects')}
              value={stats.totalProjects}
              prefix={
                <ProjectOutlined
                  style={{
                    fontSize: '24px',
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '8px',
                    borderRadius: '12px',
                  }}
                />
              }
              valueStyle={{
                color: theme.colors.text.primary,
                fontSize: '28px',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        <Col xs={24} lg={12}>
          <Card
            style={{
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
            }}
          >
            <Statistic
              title='Total Pendapatan'
              value={formatIDR(stats.totalRevenue)}
              prefix={
                <RiseOutlined
                  style={{
                    fontSize: '32px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.2)',
                    padding: '12px',
                    borderRadius: '16px',
                  }}
                />
              }
              valueStyle={{
                color: theme.colors.text.primary,
                fontSize: '32px',
                fontWeight: 800,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            style={{
              borderRadius: '20px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
            }}
          >
            <Statistic
              title='Pembayaran Tertunda'
              value={formatIDR(stats.pendingPayments)}
              prefix={
                <ClockCircleOutlined
                  style={{
                    fontSize: '32px',
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.2)',
                    padding: '12px',
                    borderRadius: '16px',
                  }}
                />
              }
              valueStyle={{
                color: theme.colors.text.primary,
                fontSize: '32px',
                fontWeight: 800,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Data Tables */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.recentQuotations')}
            extra={
              <a
                href='/quotations'
                style={{ color: '#3b82f6', fontWeight: 600 }}
              >
                Lihat Semua
              </a>
            }
            style={{
              borderRadius: '16px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Table
              dataSource={recentQuotations}
              columns={quotationColumns}
              pagination={false}
              size='middle'
              rowKey='id'
              style={{ marginTop: '16px' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.recentInvoices')}
            extra={
              <a href='/invoices' style={{ color: '#3b82f6', fontWeight: 600 }}>
                Lihat Semua
              </a>
            }
            style={{
              borderRadius: '16px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Table
              dataSource={recentInvoices}
              columns={invoiceColumns}
              pagination={false}
              size='middle'
              rowKey='id'
              style={{ marginTop: '16px' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
