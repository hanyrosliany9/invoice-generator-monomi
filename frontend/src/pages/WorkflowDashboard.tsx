import React, { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { formatIDR, safeArray, safeNumber } from '../utils/currency'
import { apiClient } from '../config/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TabPane } = Tabs

interface WorkflowItem {
  id: string
  type: 'quotation' | 'invoice'
  number: string
  clientName: string
  status: string
  totalAmount: number
  dueDate?: string
  validUntil?: string
  createdAt: string
}

interface WorkflowStats {
  quotations: Array<{
    _count: number
    _sum: { totalAmount: string }
    status: string
  }>
  invoices: Array<{
    _count: number
    _sum: { totalAmount: string }
    status: string
  }>
  alerts: {
    overdueInvoices: number
    expiringQuotations: number
  }
}

interface StatusStats {
  [status: string]: {
    count: number
    value: number
  }
}

// API service functions
const workflowService = {
  getActiveWorkflows: async (): Promise<{ data: WorkflowItem[], total: number }> => {
    const response = await apiClient.get('/workflow/active')
    const responseData = response?.data?.data || {}
    return {
      data: Array.isArray(responseData.data) ? responseData.data : [],
      total: responseData.total || 0
    }
  },

  getWorkflowStats: async (): Promise<WorkflowStats> => {
    const response = await apiClient.get('/workflow/stats')
    return response.data?.data?.data || {
      quotations: [],
      invoices: [],
      alerts: { overdueInvoices: 0, expiringQuotations: 0 }
    }
  },

  runWorkflowChecks: async (): Promise<void> => {
    await apiClient.post('/workflow/run-checks')
  }
}

export const WorkflowDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  // Queries
  const { data: workflows = { data: [], total: 0 }, isLoading: workflowsLoading, refetch: refetchWorkflows } = useQuery({
    queryKey: ['workflows', 'active'],
    queryFn: workflowService.getActiveWorkflows
  })

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['workflows', 'stats'],
    queryFn: workflowService.getWorkflowStats
  })

  const handleRefresh = async () => {
    await Promise.all([refetchWorkflows(), refetchStats()])
  }

  const handleRunChecks = async () => {
    try {
      await workflowService.runWorkflowChecks()
      await handleRefresh()
    } catch (error) {
      console.error('Failed to run workflow checks:', error)
    }
  }

  const getStatusColor = (status: string, type: string) => {
    if (type === 'quotation') {
      const colors = {
        'DRAFT': 'default',
        'SENT': 'blue',
        'APPROVED': 'green',
        'DECLINED': 'red',
        'REVISED': 'orange'
      }
      return colors[status as keyof typeof colors] || 'default'
    } else {
      const colors = {
        'DRAFT': 'default',
        'SENT': 'blue',
        'PAID': 'green',
        'OVERDUE': 'red',
        'CANCELLED': 'volcano'
      }
      return colors[status as keyof typeof colors] || 'default'
    }
  }

  const getStatusText = (status: string, type: string) => {
    if (type === 'quotation') {
      const statusMap = {
        'DRAFT': 'Draft',
        'SENT': 'Terkirim',
        'APPROVED': 'Disetujui',
        'DECLINED': 'Ditolak',
        'REVISED': 'Revisi'
      }
      return statusMap[status as keyof typeof statusMap] || status
    } else {
      const statusMap = {
        'DRAFT': 'Draft',
        'SENT': 'Terkirim',
        'PAID': 'Lunas',
        'OVERDUE': 'Jatuh Tempo',
        'CANCELLED': 'Dibatalkan'
      }
      return statusMap[status as keyof typeof statusMap] || status
    }
  }

  const getUrgencyLevel = (item: WorkflowItem) => {
    const now = dayjs()
    
    if (item.type === 'quotation' && item.validUntil) {
      const validUntil = dayjs(item.validUntil)
      const daysUntilExpiry = validUntil.diff(now, 'day')
      
      if (daysUntilExpiry < 0) return { level: 'expired', color: 'red', text: 'Kadaluarsa' }
      if (daysUntilExpiry <= 1) return { level: 'critical', color: 'red', text: `${daysUntilExpiry} hari lagi` }
      if (daysUntilExpiry <= 3) return { level: 'warning', color: 'orange', text: `${daysUntilExpiry} hari lagi` }
      return { level: 'normal', color: 'green', text: `${daysUntilExpiry} hari lagi` }
    }
    
    if (item.type === 'invoice' && item.dueDate) {
      const dueDate = dayjs(item.dueDate)
      const daysUntilDue = dueDate.diff(now, 'day')
      
      if (daysUntilDue < 0) return { level: 'overdue', color: 'red', text: `Terlambat ${Math.abs(daysUntilDue)} hari` }
      if (daysUntilDue <= 3) return { level: 'warning', color: 'orange', text: `${daysUntilDue} hari lagi` }
      return { level: 'normal', color: 'green', text: `${daysUntilDue} hari lagi` }
    }
    
    return { level: 'normal', color: 'blue', text: 'Normal' }
  }

  const workflowColumns = [
    {
      title: 'Tipe',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'quotation' ? 'blue' : 'green'}>
          {type === 'quotation' ? 'Quotation' : 'Invoice'}
        </Tag>
      )
    },
    {
      title: 'Nomor',
      dataIndex: 'number',
      key: 'number',
      render: (number: string, record: WorkflowItem) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/${record.type}s/${record.id}`)}
          style={{ padding: 0 }}
        >
          {number}
        </Button>
      )
    },
    {
      title: 'Klien',
      dataIndex: 'clientName',
      key: 'clientName'
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: WorkflowItem) => (
        <Tag color={getStatusColor(record.status, record.type)}>
          {getStatusText(record.status, record.type)}
        </Tag>
      )
    },
    {
      title: 'Jumlah',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <Text className="idr-amount">{formatIDR(amount)}</Text>
      )
    },
    {
      title: 'Urgensi',
      key: 'urgency',
      render: (_: any, record: WorkflowItem) => {
        const urgency = getUrgencyLevel(record)
        return (
          <Tag color={urgency.color} icon={
            urgency.level === 'critical' || urgency.level === 'overdue' ? <ExclamationCircleOutlined /> :
            urgency.level === 'warning' ? <WarningOutlined /> : <CheckCircleOutlined />
          }>
            {urgency.text}
          </Tag>
        )
      }
    },
    {
      title: 'Dibuat',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    }
  ]

  const quotationStats: StatusStats = stats?.quotations?.reduce((acc, item) => {
    acc[item.status] = {
      count: item._count,
      value: safeNumber(item._sum.totalAmount)
    }
    return acc
  }, {} as StatusStats) || {}

  const invoiceStats: StatusStats = stats?.invoices?.reduce((acc, item) => {
    acc[item.status] = {
      count: item._count,
      value: safeNumber(item._sum.totalAmount)
    }
    return acc
  }, {} as StatusStats) || {}

  const totalQuotationValue = Object.values(quotationStats).reduce((sum: number, stat) => sum + stat.value, 0)
  const totalInvoiceValue = Object.values(invoiceStats).reduce((sum: number, stat) => sum + stat.value, 0)

  if (workflowsLoading || statsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Title level={2}>
          <DashboardOutlined className="mr-2" />
          Dashboard Workflow
        </Title>
        <Space>
          <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
            Refresh
          </Button>
          <Button type="primary" onClick={handleRunChecks}>
            Jalankan Pemeriksaan
          </Button>
        </Space>
      </div>

      {/* Alerts */}
      {((stats?.alerts?.overdueInvoices || 0) > 0 || (stats?.alerts?.expiringQuotations || 0) > 0) && (
        <Alert
          message="Perhatian Diperlukan"
          description={
            <div>
              {(stats?.alerts?.overdueInvoices || 0) > 0 && (
                <div>• {stats?.alerts?.overdueInvoices || 0} invoice terlambat pembayaran</div>
              )}
              {(stats?.alerts?.expiringQuotations || 0) > 0 && (
                <div>• {stats?.alerts?.expiringQuotations || 0} quotation akan kadaluarsa dalam 3 hari</div>
              )}
            </div>
          }
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Ringkasan" key="overview">
          {/* Summary Statistics */}
          <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Workflows Aktif"
                  value={workflows.total}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Nilai Quotation"
                  value={formatIDR(totalQuotationValue)}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Nilai Invoice"
                  value={formatIDR(totalInvoiceValue)}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Item Mendesak"
                  value={safeArray(workflows?.data).filter(item => {
                    const urgency = getUrgencyLevel(item)
                    return urgency.level === 'critical' || urgency.level === 'warning' || urgency.level === 'overdue'
                  }).length}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Status Breakdown */}
          <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title="Status Quotation" className="h-full">
                {Object.keys(quotationStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(quotationStats).map(([status, data]: [string, any]) => (
                      <div key={status} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Tag color={getStatusColor(status, 'quotation')}>
                            {getStatusText(status, 'quotation')}
                          </Tag>
                          <Text>{data.count} item</Text>
                        </div>
                        <Text className="idr-amount">{formatIDR(data.value)}</Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="Tidak ada data quotation" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Status Invoice" className="h-full">
                {Object.keys(invoiceStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(invoiceStats).map(([status, data]: [string, any]) => (
                      <div key={status} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Tag color={getStatusColor(status, 'invoice')}>
                            {getStatusText(status, 'invoice')}
                          </Tag>
                          <Text>{data.count} item</Text>
                        </div>
                        <Text className="idr-amount">{formatIDR(data.value)}</Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="Tidak ada data invoice" />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Workflows Aktif" key="active">
          <Card title={`Workflows Aktif (${workflows.total})`}>
            {safeArray(workflows?.data).length > 0 ? (
              <Table
                columns={workflowColumns}
                dataSource={safeArray(workflows?.data)}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} item`
                }}
              />
            ) : (
              <Empty description="Tidak ada workflow aktif" />
            )}
          </Card>
        </TabPane>

        <TabPane tab="Timeline" key="timeline">
          <Card title="Timeline Workflow Terbaru">
            {safeArray(workflows?.data).length > 0 ? (
              <Timeline>
                {safeArray(workflows?.data).slice(0, 10).map(item => {
                  const urgency = getUrgencyLevel(item)
                  return (
                    <Timeline.Item
                      key={item.id}
                      color={urgency.color}
                      dot={urgency.level === 'critical' || urgency.level === 'overdue' ? 
                        <ExclamationCircleOutlined /> : undefined}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <Text strong>{item.number}</Text>
                          <div>
                            <Tag color={item.type === 'quotation' ? 'blue' : 'green'} className="mr-2">
                              {item.type === 'quotation' ? 'Quotation' : 'Invoice'}
                            </Tag>
                            <Tag color={getStatusColor(item.status, item.type)}>
                              {getStatusText(item.status, item.type)}
                            </Tag>
                          </div>
                          <div className="text-gray-600">
                            {item.clientName} • {formatIDR(item.totalAmount)}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {dayjs(item.createdAt).format('DD/MM/YYYY')}
                          <div>
                            <Tag color={urgency.color}>
                              {urgency.text}
                            </Tag>
                          </div>
                        </div>
                      </div>
                    </Timeline.Item>
                  )
                })}
              </Timeline>
            ) : (
              <Empty description="Tidak ada workflow untuk ditampilkan" />
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}