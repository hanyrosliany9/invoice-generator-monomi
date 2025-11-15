import React from 'react'
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  FloatButton,
  Progress,
  Result,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  ProjectOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatIDR, safeNumber, safeString } from '../utils/currency'
import { Client, clientService } from '../services/clients'
import { useIsMobile } from '../hooks/useMediaQuery'
import { mobileTheme } from '../theme/mobileTheme'
import dayjs from 'dayjs'
import { now } from '../utils/date'

const { Title, Text, Paragraph } = Typography

interface ClientDetailPageProps {}

export const ClientDetailPage: React.FC<ClientDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  // Fetch client data
  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getClient(id!),
    enabled: !!id,
  })

  const handleBack = () => {
    navigate('/clients')
  }

  const handleEdit = () => {
    navigate(`/clients/${id}/edit`)
  }

  const handleExportData = () => {
    // Export client data functionality
    if (!client) return

    const exportData = {
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        address: client.address,
      },
      statistics: {
        totalRevenue: client.totalRevenue,
        activeProjects: client.activeProjects,
        pendingInvoices: client.pendingInvoices,
        overdueInvoices: client.overdueInvoices,
      },
      exportDate: now().toISOString(),
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `client-${client.name.replace(/\s+/g, '-').toLowerCase()}-${now().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Business health score calculation
  const calculateHealthScore = (client: Client) => {
    let score = 100

    // Reduce score based on overdue invoices
    if (client.overdueInvoices && client.overdueInvoices > 0) {
      score -= Math.min(client.overdueInvoices * 10, 40)
    }

    // Reduce score based on pending quotations ratio
    const totalQuotations = client.totalQuotations || 0
    const pendingQuotations = client.pendingQuotations || 0
    if (totalQuotations > 0) {
      const pendingRatio = pendingQuotations / totalQuotations
      if (pendingRatio > 0.5) score -= 20
    }

    // Bonus for recent activity
    if (client.lastTransaction) {
      const daysSinceLastTransaction = dayjs().diff(
        dayjs(client.lastTransaction),
        'day'
      )
      if (daysSinceLastTransaction < 30) score += 10
    }

    return Math.max(0, Math.min(100, score))
  }

  // Health score status configuration
  const getHealthConfig = (score: number) => {
    if (score >= 80)
      return {
        color: 'green',
        status: 'Excellent',
        icon: <CheckCircleOutlined />,
      }
    if (score >= 60)
      return { color: 'blue', status: 'Good', icon: <UserOutlined /> }
    if (score >= 40)
      return { color: 'orange', status: 'Fair', icon: <WarningOutlined /> }
    return { color: 'red', status: 'Poor', icon: <WarningOutlined /> }
  }

  // Financial metrics calculation
  const getFinancialMetrics = (client: Client) => {
    const totalRevenue = client.totalPaid || 0
    const pendingAmount = client.totalPending || 0
    const totalValue = totalRevenue + pendingAmount

    return {
      totalRevenue,
      pendingAmount,
      totalValue,
      averageProject: client.totalProjects
        ? totalValue / client.totalProjects
        : 0,
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card loading style={{ height: '400px' }} />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Result
            status='404'
            title='Client Not Found'
            subTitle="The client you're looking for doesn't exist."
            extra={
              <Button type='primary' onClick={handleBack}>
                Back to Clients
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const healthScore = calculateHealthScore(client)
  const healthConfig = getHealthConfig(healthScore)
  const financialMetrics = getFinancialMetrics(client)

  return (
    <div
      style={{
        padding: '16px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        style={{ marginBottom: '24px' }}
        items={[
          {
            title: (
              <Button type='text' icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Clients
              </Button>
            ),
          },
          {
            title: client.name,
          },
        ]}
      />

      {/* Header Section - Hero Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} lg={16}>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <div>
                <Space align='center'>
                  <Avatar
                    size={64}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {client.name}
                    </Title>
                    <Text type='secondary' style={{ fontSize: '16px' }}>
                      {client.company}
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Tag color={healthConfig.color} icon={healthConfig.icon}>
                        Business Health: {healthConfig.status}
                      </Tag>
                    </div>
                  </div>
                </Space>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Space wrap>
                  <Space>
                    <MailOutlined />
                    <Text>{client.email}</Text>
                  </Space>
                  <Space>
                    <PhoneOutlined />
                    <Text>{client.phone}</Text>
                  </Space>
                  <Space>
                    <ShopOutlined />
                    <Text>{client.contactPerson}</Text>
                  </Space>
                </Space>
              </div>
            </Space>
          </Col>

          {!isMobile && (
            <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
              <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                <Button
                  type='primary'
                  icon={<EditOutlined />}
                  size='large'
                  block
                  onClick={handleEdit}
                  aria-label='Edit client details'
                >
                  Edit Client
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  size='large'
                  block
                  onClick={handleExportData}
                  aria-label='Export client data'
                >
                  Export Data
                </Button>
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Business Health Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={healthScore}
                size={120}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '30%': '#faad14',
                  '60%': '#1890ff',
                  '80%': '#52c41a',
                }}
                format={percent => `${percent}%`}
              />
              <Title level={4} style={{ marginTop: '16px' }}>
                Business Health Score
              </Title>
              <Text type='secondary'>
                Based on payment history and engagement
              </Text>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>Last Transaction</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {client.lastTransaction
                      ? dayjs(client.lastTransaction).format('DD MMM YYYY')
                      : 'No transactions yet'}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>Payment Terms</Text>
                <div>
                  <BankOutlined style={{ marginRight: '8px' }} />
                  <Text strong>{client.paymentTerms}</Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>Account Status</Text>
                <div>
                  <Badge
                    count={client.overdueInvoices || 0}
                    style={{
                      backgroundColor:
                        (client.overdueInvoices || 0) > 0
                          ? '#ff4d4f'
                          : '#52c41a',
                    }}
                  />
                  <Text style={{ marginLeft: '8px' }}>
                    {(client.overdueInvoices || 0) > 0
                      ? 'Overdue invoices'
                      : 'All payments current'}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics Grid - 4-Column Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Total Projects'
              value={safeNumber(client._count?.projects)}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Total Quotations'
              value={safeNumber(client._count?.quotations)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Total Invoices'
              value={safeNumber(client._count?.invoices)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Total Revenue'
              value={
                financialMetrics.totalRevenue
                  ? formatIDR(financialMetrics.totalRevenue)
                  : 'N/A'
              }
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Sections - Tabbed Interface */}
      <Card>
        <Tabs
          defaultActiveKey='details'
          items={[
            {
              key: 'details',
              label: (
                <span>
                  <UserOutlined />
                  Client Details
                </span>
              ),
              children: (
                <div>
                  <Descriptions
                    title='Contact Information'
                    bordered
                    column={{ xs: 1, sm: 2 }}
                  >
                    <Descriptions.Item label='Full Name'>
                      {client.name}
                    </Descriptions.Item>
                    <Descriptions.Item label='Company'>
                      {client.company}
                    </Descriptions.Item>
                    <Descriptions.Item label='Contact Person'>
                      {client.contactPerson}
                    </Descriptions.Item>
                    <Descriptions.Item label='Email'>
                      {client.email}
                    </Descriptions.Item>
                    <Descriptions.Item label='Phone'>
                      {client.phone}
                    </Descriptions.Item>
                    <Descriptions.Item label='Payment Terms'>
                      {client.paymentTerms}
                    </Descriptions.Item>
                    <Descriptions.Item label='Address' span={2}>
                      {client.address}
                    </Descriptions.Item>
                    {client.taxNumber && (
                      <Descriptions.Item label='Tax Number'>
                        {client.taxNumber}
                      </Descriptions.Item>
                    )}
                    {client.bankAccount && (
                      <Descriptions.Item label='Bank Account'>
                        {client.bankAccount}
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {client.notes && (
                    <div style={{ marginTop: '24px' }}>
                      <Title level={5}>Notes</Title>
                      <Paragraph>{client.notes}</Paragraph>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'projects',
              label: (
                <span>
                  <ProjectOutlined />
                  Projects & Work
                </span>
              ),
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <ProjectOutlined
                    style={{ fontSize: '48px', color: '#d9d9d9' }}
                  />
                  <Title level={4} type='secondary'>
                    Project History
                  </Title>
                  <Text type='secondary'>
                    Detailed project history and work timeline coming soon.
                  </Text>
                </div>
              ),
            },
            {
              key: 'financial',
              label: (
                <span>
                  <DollarOutlined />
                  Financial History
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card>
                        <Statistic
                          title='Total Revenue'
                          value={financialMetrics.totalRevenue}
                          formatter={value => formatIDR(Number(value))}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card>
                        <Statistic
                          title='Pending Amount'
                          value={financialMetrics.pendingAmount}
                          formatter={value => formatIDR(Number(value))}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <DollarOutlined
                      style={{ fontSize: '48px', color: '#d9d9d9' }}
                    />
                    <Title level={4} type='secondary'>
                      Payment History
                    </Title>
                    <Text type='secondary'>
                      Detailed payment tracking and financial analytics coming
                      soon.
                    </Text>
                  </div>
                </div>
              ),
            },
            {
              key: 'documents',
              label: (
                <span>
                  <FileTextOutlined />
                  Documents
                </span>
              ),
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <FileTextOutlined
                    style={{ fontSize: '48px', color: '#d9d9d9' }}
                  />
                  <Title level={4} type='secondary'>
                    Documents & Files
                  </Title>
                  <Text type='secondary'>
                    Contract management and document storage coming soon.
                  </Text>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Mobile-only FloatButton.Group */}
      {isMobile && (
        <FloatButton.Group
          shape="circle"
          style={{
            right: mobileTheme.floatButton.right,
            bottom: mobileTheme.floatButton.bottom
          }}
        >
          <FloatButton
            icon={<EditOutlined />}
            tooltip='Edit Client'
            onClick={handleEdit}
            type="primary"
            aria-label='Edit client details'
          />
          <FloatButton
            icon={<ExportOutlined />}
            tooltip='Export Data'
            onClick={handleExportData}
            aria-label='Export client data'
          />
        </FloatButton.Group>
      )}
    </div>
  )
}
