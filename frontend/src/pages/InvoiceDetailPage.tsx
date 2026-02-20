import React, { useState } from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  FloatButton,
  Form,
  Input,
  Modal,
  Progress,
  Result,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  EyeInvisibleOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MailOutlined,
  PrinterOutlined,
  ProjectOutlined,
  SendOutlined,
  SyncOutlined,
  UserOutlined,
  WarningOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatIDR, safeNumber, safeString } from '../utils/currency'
import { Invoice, invoiceService } from '../services/invoices'
import { FileUpload } from '../components/documents/FileUpload'
import { useTheme } from '../theme'
import { mobileTheme } from '../theme/mobileTheme'
import { usePermissions } from '../hooks/usePermissions'
import { useIsMobile } from '../hooks/useMediaQuery'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Title, Text, Paragraph } = Typography

interface InvoiceDetailPageProps {}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const { canApproveFinancial } = usePermissions()
  const queryClient = useQueryClient()
  const [pdfModalVisible, setPdfModalVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfMode, setPdfMode] = useState<'continuous' | 'paginated'>('continuous')
  const [showMaterai, setShowMaterai] = useState(true) // Default: show if required
  const [form] = Form.useForm()

  // Fetch invoice data
  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoice(id!),
    enabled: !!id,
  })

  // Fetch documents data
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['documents', 'invoice', id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/documents/invoice/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const result = await response.json();
      return result.data || []; // Extract data field from backend response
    },
    enabled: !!id,
  })

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: (paymentData: {
      paymentMethod?: string
      paymentDate?: string
      notes?: string
    }) => invoiceService.markAsPaid(id!, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      setPaymentModalVisible(false)
      form.resetFields()
      Modal.success({
        title: 'Payment Recorded',
        content: 'Invoice has been marked as paid successfully.',
      })
    },
    onError: () => {
      Modal.error({
        title: 'Failed to Record Payment',
        content: 'There was an error recording the payment. Please try again.',
      })
    },
  })

  const handleBack = () => {
    navigate('/invoices')
  }

  const handleEdit = () => {
    navigate(`/invoices/${id}/edit`)
  }

  const handleSendEmail = () => {
    if (!invoice) return

    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber}`)
    const body = encodeURIComponent(
      `Dear ${invoice.client?.name || 'Customer'},\n\n` +
      `Please find the details of invoice ${invoice.invoiceNumber}:\n\n` +
      `Invoice Number: ${invoice.invoiceNumber}\n` +
      `Amount: ${formatIDR(invoice.totalAmount)}\n` +
      `Due Date: ${dayjs(invoice.dueDate).format('DD MMM YYYY')}\n` +
      `Status: ${invoice.status}\n\n` +
      `Please process the payment at your earliest convenience.\n\n` +
      `Best regards`
    )

    window.location.href = `mailto:${invoice.client?.email || ''}?subject=${subject}&body=${body}`
  }

  // Status configuration
  const getStatusConfig = (status: Invoice['status']) => {
    const configs = {
      DRAFT: {
        color: 'default',
        icon: <EditOutlined />,
        text: 'Draft',
        progress: 20,
      },
      SENT: {
        color: 'blue',
        icon: <SendOutlined />,
        text: 'Sent',
        progress: 60,
      },
      PAID: {
        color: 'green',
        icon: <CheckCircleOutlined />,
        text: 'Paid',
        progress: 100,
      },
      OVERDUE: {
        color: 'red',
        icon: <ClockCircleOutlined />,
        text: 'Overdue',
        progress: 80,
      },
      CANCELLED: {
        color: 'red',
        icon: <CloseCircleOutlined />,
        text: 'Cancelled',
        progress: 100,
      },
    }
    return configs[status] || configs.DRAFT
  }

  // Materai status configuration
  const getMateraiConfig = (invoice: Invoice) => {
    if (!invoice.materaiRequired) {
      return { status: 'not_required', color: 'default', text: 'Not Required' }
    }
    return invoice.materaiApplied
      ? { status: 'applied', color: 'green', text: 'Applied' }
      : { status: 'required', color: 'orange', text: 'Required' }
  }

  // Payment status and overdue calculations
  const getPaymentStatus = (invoice: Invoice) => {
    const now = dayjs()
    const dueDate = dayjs(invoice.dueDate)
    const daysUntilDue = dueDate.diff(now, 'day')

    if (invoice.status === 'PAID') {
      return { status: 'paid', color: 'green', text: 'Paid', urgency: 'none' }
    }

    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue)
      return {
        status: 'overdue',
        color: 'red',
        text: `${daysOverdue} days overdue`,
        urgency: 'critical',
      }
    }

    if (daysUntilDue <= 3) {
      return {
        status: 'due_soon',
        color: 'orange',
        text: `Due in ${daysUntilDue} days`,
        urgency: 'high',
      }
    }

    return {
      status: 'pending',
      color: 'blue',
      text: `Due in ${daysUntilDue} days`,
      urgency: 'low',
    }
  }

  // Timeline data for payment workflow
  const getPaymentTimeline = (invoice: Invoice) => {
    const timeline = [
      {
        children: 'Invoice created',
        color: 'green',
        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
      },
    ]

    if (
      invoice.status === 'SENT' ||
      invoice.status === 'PAID' ||
      invoice.status === 'OVERDUE'
    ) {
      timeline.push({
        children: 'Invoice sent to client',
        color: 'blue',
        dot: <SendOutlined style={{ fontSize: '16px' }} />,
      })
    }

    if (invoice.status === 'PAID') {
      timeline.push({
        children: `Payment received${invoice.paidAt ? ` on ${dayjs(invoice.paidAt).format('DD MMM YYYY')}` : ''}`,
        color: 'green',
        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
      })
    }

    if (invoice.status === 'OVERDUE') {
      timeline.push({
        children: 'Invoice overdue',
        color: 'red',
        dot: <ClockCircleOutlined style={{ fontSize: '16px' }} />,
      })
    }

    return timeline
  }

  const handleMarkAsPaid = () => {
    setPaymentModalVisible(true)
  }

  const handlePaymentSubmit = () => {
    form.validateFields().then(values => {
      markAsPaidMutation.mutate({
        paymentMethod: values.paymentMethod,
        paymentDate: values.paymentDate?.toISOString(),
        notes: values.notes,
      })
    })
  }

  const handlePdfPreview = async (mode?: 'continuous' | 'paginated', showMateraiBox?: boolean) => {
    // Check if mode is actually a mode string (not a MouseEvent from onClick)
    const targetMode = (typeof mode === 'string' ? mode : undefined) ?? 'continuous'
    const shouldShowMaterai = showMateraiBox !== undefined ? showMateraiBox : showMaterai

    setPdfMode(targetMode)
    setPdfLoading(true)
    setPdfModalVisible(true)

    try {
      const isContinuous = targetMode === 'continuous'
      const blob = await invoiceService.previewPDF(id!, isContinuous, shouldShowMaterai)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (error) {
      Modal.error({
        title: 'Failed to Load PDF',
        content: 'There was an error loading the PDF preview. Please try again.',
      })
      setPdfModalVisible(false)
    } finally {
      setPdfLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card loading style={{ height: '400px' }} />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Result
            status='404'
            title='Invoice Not Found'
            subTitle="The invoice you're looking for doesn't exist."
            extra={
              <Button type='primary' onClick={handleBack}>
                Back to Invoices
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const statusConfig = getStatusConfig(invoice.status)
  const materaiConfig = getMateraiConfig(invoice)
  const paymentStatus = getPaymentStatus(invoice)
  const paymentTimeline = getPaymentTimeline(invoice)

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
                Invoices
              </Button>
            ),
          },
          {
            title: invoice.invoiceNumber,
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
                    icon={<FileTextOutlined />}
                    style={{
                      backgroundColor:
                        statusConfig.color === 'default'
                          ? '#d9d9d9'
                          : statusConfig.color,
                    }}
                  />
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {invoice.invoiceNumber}
                    </Title>
                    <Text type='secondary' style={{ fontSize: '16px' }}>
                      {formatIDR(invoice.totalAmount)}
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Tag color={statusConfig.color} icon={statusConfig.icon}>
                        {statusConfig.text}
                      </Tag>
                      <Tag
                        color={paymentStatus.color}
                        icon={<CalendarOutlined />}
                      >
                        {paymentStatus.text}
                      </Tag>
                      {invoice.materaiRequired && (
                        <Tag
                          color={materaiConfig.color}
                          icon={<BankOutlined />}
                        >
                          Materai {materaiConfig.text}
                        </Tag>
                      )}
                      {invoice.paymentMilestone && (
                        <Tag color="blue" icon={<ClockCircleOutlined />}>
                          Termin {invoice.paymentMilestone.milestoneNumber}: {invoice.paymentMilestone.nameId || invoice.paymentMilestone.name} ({invoice.paymentMilestone.paymentPercentage}%)
                        </Tag>
                      )}
                    </div>
                  </div>
                </Space>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Space wrap>
                  {invoice.client && (
                    <Space>
                      <UserOutlined />
                      <Text strong>{invoice.client.name}</Text>
                      <Text type='secondary'>({invoice.client.company})</Text>
                    </Space>
                  )}
                  {invoice.project && (
                    <Space>
                      <ProjectOutlined />
                      <Text>{invoice.project.number}</Text>
                    </Space>
                  )}
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
                  aria-label='Edit invoice'
                >
                  Edit Invoice
                </Button>

                <Button
                  icon={<FilePdfOutlined />}
                  size='large'
                  block
                  onClick={() => handlePdfPreview()}
                  aria-label='View PDF'
                >
                  View PDF
                </Button>

                {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') &&
                 canApproveFinancial() && (
                  <Button
                    icon={<DollarOutlined />}
                    size='large'
                    block
                    loading={markAsPaidMutation.isPending}
                    onClick={handleMarkAsPaid}
                    aria-label='Mark as paid'
                    style={{
                      backgroundColor: theme.colors.status.success,
                      borderColor: theme.colors.status.success,
                      color: 'white',
                    }}
                  >
                    Mark as Paid
                  </Button>
                )}
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Payment Status Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={statusConfig.progress}
                size={120}
                strokeColor={{
                  '0%': '#d9d9d9',
                  '60%': '#1890ff',
                  '80%': invoice.status === 'OVERDUE' ? '#ff4d4f' : '#faad14',
                  '100%': invoice.status === 'PAID' ? '#52c41a' : '#ff4d4f',
                }}
                format={percent => (
                  <span>
                    {statusConfig.icon}
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      {statusConfig.text}
                    </div>
                  </span>
                )}
              />
              <Title level={4} style={{ marginTop: '16px' }}>
                Payment Status
              </Title>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>Creation Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(invoice.creationDate).format('DD MMM YYYY')}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>Due Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(invoice.dueDate).format('DD MMM YYYY')}
                  </Text>
                  {paymentStatus.urgency === 'critical' && (
                    <Badge
                      count='OVERDUE'
                      style={{ backgroundColor: theme.colors.status.error, marginLeft: '8px' }}
                    />
                  )}
                </div>
              </div>

              <div>
                <Text type='secondary'>Payment Info</Text>
                <div>
                  <BankOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {invoice.paymentInfo || 'Standard payment terms'}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Overdue/Materai Alerts */}
      {paymentStatus.urgency === 'critical' && (
        <Alert
          message='Invoice Overdue'
          description={`This invoice is ${paymentStatus.text}. Please follow up with the client for payment.`}
          type='error'
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {invoice.materaiRequired && !invoice.materaiApplied && (
        <Alert
          message='Materai Required'
          description='This invoice requires a 10,000 IDR materai stamp due to the amount exceeding 5 million IDR.'
          type='warning'
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Statistics Grid - 4-Column Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Total Amount'
              value={invoice.totalAmount}
              formatter={value => formatIDR(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: theme.colors.accent.primary }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Paid Amount'
              value={invoice.paymentSummary?.totalPaid || 0}
              formatter={value => formatIDR(Number(value))}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: theme.colors.status.success }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Outstanding'
              value={
                invoice.paymentSummary?.remainingAmount || invoice.totalAmount
              }
              formatter={value => formatIDR(Number(value))}
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                color:
                  invoice.status === 'PAID'
                    ? theme.colors.status.success
                    : paymentStatus.urgency === 'critical'
                      ? theme.colors.status.error
                      : theme.colors.status.warning,
              }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Days Until Due'
              value={Math.max(0, dayjs(invoice.dueDate).diff(dayjs(), 'day'))}
              prefix={<CalendarOutlined />}
              valueStyle={{
                color:
                  paymentStatus.urgency === 'critical'
                    ? '#ff4d4f'
                    : paymentStatus.urgency === 'high'
                      ? '#faad14'
                      : '#52c41a',
              }}
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
                  <FileTextOutlined />
                  Invoice Details
                </span>
              ),
              children: (
                <div>
                  <Descriptions
                    title='Invoice Information'
                    bordered
                    column={{ xs: 1, sm: 2 }}
                  >
                    <Descriptions.Item label='Invoice Number'>
                      {invoice.invoiceNumber}
                    </Descriptions.Item>
                    <Descriptions.Item label='Status'>
                      <Tag color={statusConfig.color} icon={statusConfig.icon}>
                        {statusConfig.text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label='Creation Date'>
                      {dayjs(invoice.creationDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label='Due Date'>
                      {dayjs(invoice.dueDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label='Total Amount'>
                      {formatIDR(invoice.totalAmount)}
                    </Descriptions.Item>
                    <Descriptions.Item label='Amount Per Project'>
                      {formatIDR(invoice.amountPerProject)}
                    </Descriptions.Item>
                    {invoice.paymentMilestone && (
                      <Descriptions.Item label='Payment Term'>
                        <Space direction="vertical" size="small">
                          <Tag color="blue" icon={<ClockCircleOutlined />}>
                            Termin {invoice.paymentMilestone.milestoneNumber}: {invoice.paymentMilestone.paymentPercentage}%
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {invoice.paymentMilestone.nameId || invoice.paymentMilestone.name}
                          </Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label='Materai Required'>
                      {invoice.materaiRequired ? (
                        <Tag color={materaiConfig.color}>
                          {materaiConfig.text}
                        </Tag>
                      ) : (
                        <Tag color='default'>Not Required</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label='Last Updated'>
                      {dayjs(invoice.updatedAt).format('DD MMM YYYY HH:mm')}
                    </Descriptions.Item>
                  </Descriptions>

                  {invoice.terms && (
                    <div style={{ marginTop: '24px' }}>
                      <Title level={5}>Terms & Conditions</Title>
                      <Paragraph>{invoice.terms}</Paragraph>
                    </div>
                  )}

                  {invoice.paymentInfo && (
                    <div style={{ marginTop: '24px' }}>
                      <Title level={5}>Payment Information</Title>
                      <Paragraph>{invoice.paymentInfo}</Paragraph>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'payment',
              label: (
                <span>
                  <DollarOutlined />
                  Payment History
                </span>
              ),
              children: (
                <div>
                  <Title level={4}>Payment Timeline</Title>
                  <Timeline items={paymentTimeline} />

                  {invoice.paymentSummary && (
                    <div style={{ marginTop: '24px' }}>
                      <Title level={5}>Payment Summary</Title>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                          <Card size='small'>
                            <Statistic
                              title='Total Paid'
                              value={invoice.paymentSummary.totalPaid}
                              formatter={value => formatIDR(Number(value))}
                              valueStyle={{ color: theme.colors.status.success }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} md={8}>
                          <Card size='small'>
                            <Statistic
                              title='Remaining'
                              value={invoice.paymentSummary.remainingAmount}
                              formatter={value => formatIDR(Number(value))}
                              valueStyle={{ color: theme.colors.status.warning }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} md={8}>
                          <Card size='small'>
                            <Statistic
                              title='Payment Count'
                              value={invoice.paymentSummary.paymentCount}
                              valueStyle={{ color: theme.colors.accent.primary }}
                            />
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'related',
              label: (
                <span>
                  <ProjectOutlined />
                  Client & Project
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 24]}>
                    {invoice.client && (
                      <Col xs={24} md={12}>
                        <Card title='Client Information' size='small'>
                          <Descriptions column={1}>
                            <Descriptions.Item label='Name'>
                              {invoice.client.name}
                            </Descriptions.Item>
                            <Descriptions.Item label='Company'>
                              {invoice.client.company}
                            </Descriptions.Item>
                            <Descriptions.Item label='Email'>
                              {invoice.client.email}
                            </Descriptions.Item>
                          </Descriptions>
                          <Button
                            type='link'
                            onClick={() =>
                              navigate(`/clients/${invoice.client!.id}`)
                            }
                          >
                            View Client Details
                          </Button>
                        </Card>
                      </Col>
                    )}

                    {invoice.project && (
                      <Col xs={24} md={12}>
                        <Card title='Project Information' size='small'>
                          <Descriptions column={1}>
                            <Descriptions.Item label='Project Number'>
                              {invoice.project.number}
                            </Descriptions.Item>
                            <Descriptions.Item label='Description'>
                              {invoice.project.description}
                            </Descriptions.Item>
                            <Descriptions.Item label='Type'>
                              {invoice.project.type}
                            </Descriptions.Item>
                          </Descriptions>
                          <Button
                            type='link'
                            onClick={() =>
                              navigate(`/projects/${invoice.project!.id}`)
                            }
                          >
                            View Project Details
                          </Button>
                        </Card>
                      </Col>
                    )}

                    {invoice.quotation && (
                      <Col xs={24} md={12}>
                        <Card title='Related Quotation' size='small'>
                          <Descriptions column={1}>
                            <Descriptions.Item label='Quotation Number'>
                              {invoice.quotation.quotationNumber}
                            </Descriptions.Item>
                          </Descriptions>
                          <Button
                            type='link'
                            onClick={() =>
                              navigate(`/quotations/${invoice.quotation!.id}`)
                            }
                          >
                            View Quotation Details
                          </Button>
                        </Card>
                      </Col>
                    )}

                    {invoice.paymentMilestone && (
                      <Col xs={24} md={12}>
                        <Card
                          title={
                            <Space>
                              <ClockCircleOutlined />
                              Payment Milestone
                            </Space>
                          }
                          size='small'
                        >
                          <Descriptions column={1}>
                            <Descriptions.Item label='Termin Number'>
                              #{invoice.paymentMilestone.milestoneNumber}
                            </Descriptions.Item>
                            <Descriptions.Item label='Name'>
                              {invoice.paymentMilestone.nameId || invoice.paymentMilestone.name}
                            </Descriptions.Item>
                            {(invoice.paymentMilestone.descriptionId || invoice.paymentMilestone.description) && (
                              <Descriptions.Item label='Description'>
                                {invoice.paymentMilestone.descriptionId || invoice.paymentMilestone.description}
                              </Descriptions.Item>
                            )}
                            <Descriptions.Item label='Payment Percentage'>
                              <Tag color="blue">{invoice.paymentMilestone.paymentPercentage}%</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label='Milestone Amount'>
                              {formatIDR(invoice.paymentMilestone.paymentAmount)}
                            </Descriptions.Item>
                            <Descriptions.Item label='Status'>
                              <Tag color={invoice.paymentMilestone.isInvoiced ? 'green' : 'orange'}>
                                {invoice.paymentMilestone.isInvoiced ? 'Invoiced' : 'Pending'}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>
                          {invoice.quotation && (
                            <Button
                              type='link'
                              onClick={() =>
                                navigate(`/quotations/${invoice.quotation!.id}`)
                              }
                            >
                              View All Milestones in Quotation
                            </Button>
                          )}
                        </Card>
                      </Col>
                    )}
                  </Row>
                </div>
              ),
            },
            {
              key: 'documents',
              label: (
                <span>
                  <FilePdfOutlined />
                  Documents
                </span>
              ),
              children: (
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <Space>
                      <Button
                        type='primary'
                        icon={<FilePdfOutlined />}
                        onClick={() => handlePdfPreview()}
                      >
                        Preview Invoice PDF
                      </Button>
                    </Space>
                  </div>
                  <FileUpload
                    invoiceId={id}
                    documents={documents}
                    onDocumentsChange={() => refetchDocuments()}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Payment Modal */}
      <Modal
        title='Mark Invoice as Paid'
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handlePaymentSubmit}
        confirmLoading={markAsPaidMutation.isPending}
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            label='Payment Method'
            name='paymentMethod'
            rules={[
              { required: true, message: 'Please select payment method' },
            ]}
          >
            <Select placeholder='Select payment method'>
              <Select.Option value='bank_transfer'>Bank Transfer</Select.Option>
              <Select.Option value='cash'>Cash</Select.Option>
              <Select.Option value='credit_card'>Credit Card</Select.Option>
              <Select.Option value='gopay'>GoPay</Select.Option>
              <Select.Option value='ovo'>OVO</Select.Option>
              <Select.Option value='dana'>DANA</Select.Option>
              <Select.Option value='other'>Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label='Payment Date'
            name='paymentDate'
            rules={[{ required: true, message: 'Please select payment date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label='Notes' name='notes'>
            <Input.TextArea
              rows={3}
              placeholder='Additional notes about the payment...'
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* PDF Preview Modal */}
      <Modal
        title='Invoice PDF Preview'
        open={pdfModalVisible}
        onCancel={() => {
          setPdfModalVisible(false)
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl)
            setPdfUrl(null)
          }
        }}
        width='95vw'
        style={{ top: '2vh' }}
        styles={{ body: { height: '85vh', padding: 0 } }}
        centered
        footer={[
          <div key='controls' style={{ display: 'flex', gap: '12px', marginRight: 'auto' }}>
            <Segmented
              value={pdfMode}
              onChange={(value) => {
                const newMode = value as 'continuous' | 'paginated'
                setPdfMode(newMode)
                // Regenerate PDF with new mode
                if (pdfUrl) {
                  URL.revokeObjectURL(pdfUrl)
                  setPdfUrl(null)
                }
                // Pass the new mode directly to avoid React state timing issues
                handlePdfPreview(newMode)
              }}
              options={[
                {
                  label: 'Digital View',
                  value: 'continuous',
                  icon: <FileTextOutlined />,
                },
                {
                  label: 'Print Ready',
                  value: 'paginated',
                  icon: <PrinterOutlined />,
                },
              ]}
            />
            {/* Materai Toggle - Only show if invoice requires materai */}
            {invoice?.materaiRequired && (
              <Segmented
                value={showMaterai ? 'show' : 'hide'}
                onChange={(value) => {
                  const newShowMaterai = value === 'show'
                  setShowMaterai(newShowMaterai)
                  // Regenerate PDF with new materai setting
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl)
                    setPdfUrl(null)
                  }
                  handlePdfPreview(pdfMode, newShowMaterai)
                }}
                options={[
                  { label: 'Show Materai', value: 'show', icon: <BankOutlined /> },
                  { label: 'Hide Materai', value: 'hide', icon: <EyeInvisibleOutlined /> },
                ]}
              />
            )}
          </div>,
          <Button key='close' onClick={() => {
            setPdfModalVisible(false)
            if (pdfUrl) {
              URL.revokeObjectURL(pdfUrl)
              setPdfUrl(null)
            }
          }}>
            Close
          </Button>,
          <Button
            key='download'
            type='primary'
            icon={<ExportOutlined />}
            onClick={async () => {
              try {
                const isContinuous = pdfMode === 'continuous'
                const blob = await invoiceService.generatePDF(id!, isContinuous, showMaterai)
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                // Build filename with client name and project type
                const sanitize = (str: string) => str?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || ''
                const invoiceNum = (invoice?.invoiceNumber || 'invoice').replace(/\//g, '-')
                const clientName = sanitize(invoice?.client?.name || '')
                const projectType = sanitize(invoice?.project?.type || '')
                const filenameParts = ['Invoice', invoiceNum]
                if (clientName) filenameParts.push(clientName)
                if (projectType) filenameParts.push(projectType)
                a.download = `${filenameParts.join('-')}.pdf`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              } catch (error) {
                Modal.error({
                  title: 'Download Failed',
                  content: 'There was an error downloading the PDF. Please try again.',
                })
              }
            }}
          >
            Download PDF
          </Button>,
        ]}
      >
        {pdfLoading ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <SyncOutlined spin style={{ fontSize: '48px', color: theme.colors.accent.primary }} />
            <Title level={4} type='secondary' style={{ marginTop: '16px' }}>
              Loading PDF...
            </Title>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '6px',
            }}
            title='Invoice PDF Preview'
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FilePdfOutlined style={{ fontSize: '64px', color: theme.colors.border.default }} />
            <Title level={4} type='secondary'>
              PDF Preview
            </Title>
            <Text type='secondary'>
              Failed to load PDF preview.
            </Text>
          </div>
        )}
      </Modal>

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
            tooltip='Edit Invoice'
            onClick={handleEdit}
            type="primary"
            aria-label='Edit invoice'
          />
          <FloatButton
            icon={<FilePdfOutlined />}
            tooltip='View PDF'
            onClick={() => handlePdfPreview()}
            aria-label='View PDF'
          />
          <FloatButton
            icon={<MailOutlined />}
            tooltip='Send via Email'
            onClick={handleSendEmail}
            aria-label='Send via email'
          />
          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') &&
           canApproveFinancial() && (
            <FloatButton
              icon={<DollarOutlined />}
              tooltip='Mark as Paid'
              onClick={handleMarkAsPaid}
              aria-label='Mark as paid'
            />
          )}
        </FloatButton.Group>
      )}
    </div>
  )
}
