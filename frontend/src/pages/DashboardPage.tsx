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
import { CompactMetricCard } from '../components/ui/CompactMetricCard'

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

      {/* Statistics Cards - Compact Design */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<FileTextOutlined />}
            iconColor='#ef4444'
            iconBg='rgba(239, 68, 68, 0.15)'
            label={t('dashboard.totalQuotations')}
            value={stats.totalQuotations}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<FileDoneOutlined />}
            iconColor='#10b981'
            iconBg='rgba(16, 185, 129, 0.15)'
            label={t('dashboard.totalInvoices')}
            value={stats.totalInvoices}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<UserOutlined />}
            iconColor='#6366f1'
            iconBg='rgba(99, 102, 241, 0.15)'
            label={t('dashboard.totalClients')}
            value={stats.totalClients}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<ProjectOutlined />}
            iconColor='#f59e0b'
            iconBg='rgba(245, 158, 11, 0.15)'
            label={t('dashboard.totalProjects')}
            value={stats.totalProjects}
          />
        </Col>
      </Row>

      {/* Revenue Statistics - Compact Design */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={12}>
          <CompactMetricCard
            icon={<RiseOutlined />}
            iconColor='#10b981'
            iconBg='rgba(16, 185, 129, 0.15)'
            label='Total Pendapatan'
            value={formatIDR(stats.totalRevenue)}
          />
        </Col>

        <Col xs={24} sm={12} lg={12}>
          <CompactMetricCard
            icon={<ClockCircleOutlined />}
            iconColor='#f59e0b'
            iconBg='rgba(245, 158, 11, 0.15)'
            label='Pembayaran Tertunda'
            value={formatIDR(stats.pendingPayments)}
          />
        </Col>
      </Row>

      {/* Recent Data Tables - iOS Minimal Style */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.recentQuotations')}
            extra={
              <a
                href='/quotations'
                style={{ color: '#3b82f6', fontWeight: 500, fontSize: '14px' }}
              >
                Lihat Semua
              </a>
            }
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Table
              dataSource={recentQuotations}
              columns={quotationColumns}
              pagination={false}
              size='small'
              rowKey='id'
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.recentInvoices')}
            extra={
              <a href='/invoices' style={{ color: '#3b82f6', fontWeight: 500, fontSize: '14px' }}>
                Lihat Semua
              </a>
            }
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Table
              dataSource={recentInvoices}
              columns={invoiceColumns}
              pagination={false}
              size='small'
              rowKey='id'
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
