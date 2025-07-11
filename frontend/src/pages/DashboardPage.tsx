import React from 'react'
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space, Spin, Alert } from 'antd'
import { 
  FileTextOutlined, 
  FileDoneOutlined, 
  UserOutlined, 
  ProjectOutlined,
  RiseOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIDR, safeString } from '../utils/currency'
import { useDashboardData } from '../hooks/useDashboard'
import { RecentQuotation, RecentInvoice } from '../types/dashboard'

const { Title, Text } = Typography

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error loading dashboard data"
        description={error instanceof Error ? error.message : 'Something went wrong'}
        type="error"
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
      render: (client: RecentQuotation['client']) => safeString(client?.name) || 'N/A',
    },
    {
      title: 'Proyek',
      dataIndex: 'project',
      key: 'project',
      render: (project: RecentQuotation['project']) => safeString(project?.description) || 'N/A',
    },
    {
      title: 'Jumlah',
      key: 'amount',
      render: (_: any, record: RecentQuotation) => (
        <Text className="idr-amount">{formatIDR(parseFloat(record.totalAmount) || 0)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            'DRAFT': 'Draft',
            'SENT': 'Terkirim',
            'APPROVED': 'Disetujui',
            'DECLINED': 'Ditolak',
            'REVISED': 'Revisi'
          }
          return statusMap[status as keyof typeof statusMap] || status
        }
        
        return (
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
        )
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
      render: (client: RecentInvoice['client']) => safeString(client?.name) || 'N/A',
    },
    {
      title: 'Proyek',
      dataIndex: 'project',
      key: 'project',
      render: (project: RecentInvoice['project']) => safeString(project?.description) || 'N/A',
    },
    {
      title: 'Jumlah',
      key: 'amount',
      render: (_: any, record: RecentInvoice) => (
        <Text className="idr-amount">{formatIDR(parseFloat(record.totalAmount) || 0)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            'DRAFT': 'Draft',
            'SENT': 'Terkirim',
            'PAID': 'Lunas',
            'OVERDUE': 'Jatuh Tempo',
            'CANCELLED': 'Dibatalkan',
            'PENDING': 'Tertunda'
          }
          return statusMap[status as keyof typeof statusMap] || status
        }
        
        return (
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
        )
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
    <div style={{ background: 'transparent' }} data-testid="dashboard-container">
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ 
          color: '#1e293b', 
          fontSize: '32px', 
          fontWeight: 700, 
          marginBottom: '8px' 
        }}>
          {t('dashboard.title')}
        </Title>
        <Text style={{ color: '#64748b', fontSize: '16px' }}>
          Welcome back! Here's what's happening with your business today.
        </Text>
      </div>
      
      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}>
            <Statistic
              title={t('dashboard.totalQuotations')}
              value={stats.totalQuotations}
              prefix={<FileTextOutlined style={{ 
                fontSize: '24px', 
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '8px',
                borderRadius: '12px'
              }} />}
              valueStyle={{ 
                color: '#1e293b', 
                fontSize: '28px', 
                fontWeight: 700 
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card style={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}>
            <Statistic
              title={t('dashboard.totalInvoices')}
              value={stats.totalInvoices}
              prefix={<FileDoneOutlined style={{ 
                fontSize: '24px', 
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '8px',
                borderRadius: '12px'
              }} />}
              valueStyle={{ 
                color: '#1e293b', 
                fontSize: '28px', 
                fontWeight: 700 
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card style={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}>
            <Statistic
              title={t('dashboard.totalClients')}
              value={stats.totalClients}
              prefix={<UserOutlined style={{ 
                fontSize: '24px', 
                color: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '8px',
                borderRadius: '12px'
              }} />}
              valueStyle={{ 
                color: '#1e293b', 
                fontSize: '28px', 
                fontWeight: 700 
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card style={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}>
            <Statistic
              title={t('dashboard.totalProjects')}
              value={stats.totalProjects}
              prefix={<ProjectOutlined style={{ 
                fontSize: '24px', 
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '8px',
                borderRadius: '12px'
              }} />}
              valueStyle={{ 
                color: '#1e293b', 
                fontSize: '28px', 
                fontWeight: 700 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        <Col xs={24} lg={12}>
          <Card style={{
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff'
          }}>
            <Statistic
              title="Total Pendapatan"
              value={formatIDR(stats.totalRevenue)}
              prefix={<RiseOutlined style={{ 
                fontSize: '32px', 
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '12px',
                borderRadius: '16px'
              }} />}
              valueStyle={{ 
                color: '#ffffff', 
                fontSize: '32px', 
                fontWeight: 800 
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card style={{
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff'
          }}>
            <Statistic
              title="Pembayaran Tertunda"
              value={formatIDR(stats.pendingPayments)}
              prefix={<ClockCircleOutlined style={{ 
                fontSize: '32px', 
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '12px',
                borderRadius: '16px'
              }} />}
              valueStyle={{ 
                color: '#ffffff', 
                fontSize: '32px', 
                fontWeight: 800 
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
            extra={<a href="/quotations" style={{ color: '#6366f1', fontWeight: 600 }}>Lihat Semua</a>}
            style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Table
              dataSource={recentQuotations}
              columns={quotationColumns}
              pagination={false}
              size="middle"
              rowKey="id"
              style={{ marginTop: '16px' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title={t('dashboard.recentInvoices')}
            extra={<a href="/invoices" style={{ color: '#6366f1', fontWeight: 600 }}>Lihat Semua</a>}
            style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Table
              dataSource={recentInvoices}
              columns={invoiceColumns}
              pagination={false}
              size="middle"
              rowKey="id"
              style={{ marginTop: '16px' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}