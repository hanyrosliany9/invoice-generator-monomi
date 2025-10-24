import React, { useState } from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  FloatButton,
  Modal,
  Progress,
  Result,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  FilePdfOutlined,
  FileTextOutlined,
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
import { Quotation, quotationService } from '../services/quotations'
import { FileUpload } from '../components/documents/FileUpload'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Title, Text, Paragraph } = Typography

interface QuotationDetailPageProps {}

export const QuotationDetailPage: React.FC<QuotationDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [pdfModalVisible, setPdfModalVisible] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Documents query for FileUpload component
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['documents', 'quotation', id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/documents/quotation/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!id,
  })
  const [pdfLoading, setPdfLoading] = useState(false)

  // Fetch quotation data
  const {
    data: quotation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getQuotation(id!),
    enabled: !!id,
  })

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (quotationId: string) =>
      quotationService.generateInvoice(quotationId),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      Modal.success({
        title: 'Invoice Generated Successfully',
        content: `Invoice ${data.invoice.invoiceNumber} has been ${data.isExisting ? 'updated' : 'created'}.`,
        onOk: () => navigate(`/invoices/${data.invoiceId}`),
      })
    },
    onError: () => {
      Modal.error({
        title: 'Failed to Generate Invoice',
        content: 'There was an error generating the invoice. Please try again.',
      })
    },
  })

  const handleBack = () => {
    navigate('/quotations')
  }

  const handleEdit = () => {
    navigate(`/quotations/${id}/edit`)
  }

  const handleShareWhatsApp = () => {
    if (!quotation) return

    const message = encodeURIComponent(
      `Quotation ${quotation.quotationNumber}\n` +
      `Client: ${quotation.client?.name || 'N/A'}\n` +
      `Amount: ${formatIDR(quotation.totalAmount)}\n` +
      `Valid Until: ${dayjs(quotation.validUntil).format('DD MMM YYYY')}\n` +
      `Status: ${quotation.status}`
    )

    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  // Status configuration
  const getStatusConfig = (status: Quotation['status']) => {
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
        progress: 40,
      },
      APPROVED: {
        color: 'green',
        icon: <CheckCircleOutlined />,
        text: 'Approved',
        progress: 80,
      },
      DECLINED: {
        color: 'red',
        icon: <CloseCircleOutlined />,
        text: 'Declined',
        progress: 100,
      },
      REVISED: {
        color: 'orange',
        icon: <SyncOutlined />,
        text: 'Revised',
        progress: 60,
      },
    }
    return configs[status] || configs.DRAFT
  }

  // Validity check
  const getValidityStatus = (validUntil: string) => {
    const now = dayjs()
    const validDate = dayjs(validUntil)
    const daysRemaining = validDate.diff(now, 'day')

    if (daysRemaining < 0)
      return { status: 'expired', color: 'red', text: 'Expired' }
    if (daysRemaining <= 3)
      return {
        status: 'expiring',
        color: 'orange',
        text: `${daysRemaining} days left`,
      }
    return {
      status: 'valid',
      color: 'green',
      text: `${daysRemaining} days remaining`,
    }
  }

  // Timeline data for workflow
  const getWorkflowTimeline = (quotation: Quotation) => {
    const timeline = [
      {
        children: 'Quotation created',
        color: 'green',
        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
      },
    ]

    if (
      quotation.status === 'SENT' ||
      quotation.status === 'APPROVED' ||
      quotation.status === 'DECLINED'
    ) {
      timeline.push({
        children: 'Quotation sent to client',
        color: 'blue',
        dot: <SendOutlined style={{ fontSize: '16px' }} />,
      })
    }

    if (quotation.status === 'APPROVED') {
      timeline.push({
        children: 'Quotation approved by client',
        color: 'green',
        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
      })
    }

    if (quotation.status === 'DECLINED') {
      timeline.push({
        children: 'Quotation declined by client',
        color: 'red',
        dot: <CloseCircleOutlined style={{ fontSize: '16px' }} />,
      })
    }

    if (quotation.status === 'REVISED') {
      timeline.push({
        children: 'Quotation under revision',
        color: 'orange',
        dot: <SyncOutlined style={{ fontSize: '16px' }} />,
      })
    }

    return timeline
  }

  const handleGenerateInvoice = () => {
    if (quotation?.status === 'APPROVED') {
      generateInvoiceMutation.mutate(quotation.id)
    }
  }

  const handlePdfPreview = async () => {
    setPdfLoading(true)
    setPdfModalVisible(true)
    try {
      const blob = await quotationService.previewQuotationPDF(id!)
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

  if (error || !quotation) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Result
            status='404'
            title='Quotation Not Found'
            subTitle="The quotation you're looking for doesn't exist."
            extra={
              <Button type='primary' onClick={handleBack}>
                Back to Quotations
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const statusConfig = getStatusConfig(quotation.status)
  const validityStatus = getValidityStatus(quotation.validUntil)
  const workflowTimeline = getWorkflowTimeline(quotation)

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
                Quotations
              </Button>
            ),
          },
          {
            title: quotation.quotationNumber,
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
                      {quotation.quotationNumber}
                    </Title>
                    <Text type='secondary' style={{ fontSize: '16px' }}>
                      {formatIDR(quotation.totalAmount)}
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Tag color={statusConfig.color} icon={statusConfig.icon}>
                        {statusConfig.text}
                      </Tag>
                      <Tag
                        color={validityStatus.color}
                        icon={<CalendarOutlined />}
                      >
                        {validityStatus.text}
                      </Tag>
                    </div>
                  </div>
                </Space>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Space wrap>
                  {quotation.client && (
                    <Space>
                      <UserOutlined />
                      <Text strong>{quotation.client.name}</Text>
                      <Text type='secondary'>({quotation.client.company})</Text>
                    </Space>
                  )}
                  {quotation.project && (
                    <Space>
                      <ProjectOutlined />
                      <Text>{quotation.project.number}</Text>
                    </Space>
                  )}
                </Space>
              </div>
            </Space>
          </Col>

          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              <Button
                type='primary'
                icon={<EditOutlined />}
                size='large'
                block
                onClick={handleEdit}
                aria-label='Edit quotation'
              >
                Edit Quotation
              </Button>

              <Button
                icon={<FilePdfOutlined />}
                size='large'
                block
                onClick={handlePdfPreview}
                aria-label='View PDF'
              >
                View PDF
              </Button>

              {quotation.status === 'APPROVED' && (
                <Button
                  icon={<DollarOutlined />}
                  size='large'
                  block
                  loading={generateInvoiceMutation.isPending}
                  onClick={handleGenerateInvoice}
                  aria-label='Generate invoice'
                  style={{
                    backgroundColor: '#52c41a',
                    borderColor: '#52c41a',
                    color: 'white',
                  }}
                >
                  Generate Invoice
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Workflow Status Section */}
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
                  '40%': '#1890ff',
                  '60%': '#faad14',
                  '80%': '#52c41a',
                  '100%':
                    quotation.status === 'DECLINED' ? '#ff4d4f' : '#52c41a',
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
                Workflow Status
              </Title>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>Created Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(quotation.date).format('DD MMM YYYY')}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>Valid Until</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(quotation.validUntil).format('DD MMM YYYY')}
                  </Text>
                  {validityStatus.status === 'expired' && (
                    <Badge
                      count='EXPIRED'
                      style={{ backgroundColor: '#ff4d4f', marginLeft: '8px' }}
                    />
                  )}
                </div>
              </div>

              <div>
                <Text type='secondary'>Response Time</Text>
                <div>
                  <ClockCircleOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {quotation.status === 'DRAFT' || quotation.status === 'SENT'
                      ? 'Pending response'
                      : `Responded ${dayjs(quotation.updatedAt).fromNow()}`}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Validity Alert */}
      {validityStatus.status === 'expired' && (
        <Alert
          message='Quotation Expired'
          description='This quotation has expired. Consider creating a revised quotation with updated validity period.'
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
              value={quotation.totalAmount}
              formatter={value => formatIDR(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Per Project'
              value={quotation.amountPerProject}
              formatter={value => formatIDR(Number(value))}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Days Valid'
              value={Math.max(
                0,
                dayjs(quotation.validUntil).diff(dayjs(), 'day')
              )}
              prefix={<CalendarOutlined />}
              valueStyle={{
                color:
                  validityStatus.status === 'expired'
                    ? '#ff4d4f'
                    : validityStatus.status === 'expiring'
                      ? '#faad14'
                      : '#52c41a',
              }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Related Invoices'
              value={quotation.invoices?.length || 0}
              prefix={<FileTextOutlined />}
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
                  <FileTextOutlined />
                  Quotation Details
                </span>
              ),
              children: (
                <div>
                  <Descriptions
                    title='Quotation Information'
                    bordered
                    column={{ xs: 1, sm: 2 }}
                  >
                    <Descriptions.Item label='Quotation Number'>
                      {quotation.quotationNumber}
                    </Descriptions.Item>
                    <Descriptions.Item label='Status'>
                      <Tag color={statusConfig.color} icon={statusConfig.icon}>
                        {statusConfig.text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label='Created Date'>
                      {dayjs(quotation.date).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label='Valid Until'>
                      {dayjs(quotation.validUntil).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label='Total Amount'>
                      {formatIDR(quotation.totalAmount)}
                    </Descriptions.Item>
                    <Descriptions.Item label='Amount Per Project'>
                      {formatIDR(quotation.amountPerProject)}
                    </Descriptions.Item>
                    <Descriptions.Item label='Created By'>
                      {quotation.user?.name || 'Unknown'}
                    </Descriptions.Item>
                    <Descriptions.Item label='Last Updated'>
                      {dayjs(quotation.updatedAt).format('DD MMM YYYY HH:mm')}
                    </Descriptions.Item>
                  </Descriptions>

                  {quotation.terms && (
                    <div style={{ marginTop: '24px' }}>
                      <Title level={5}>Terms & Conditions</Title>
                      <Paragraph>{quotation.terms}</Paragraph>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'workflow',
              label: (
                <span>
                  <SyncOutlined />
                  Workflow History
                </span>
              ),
              children: (
                <div>
                  <Title level={4}>Approval Workflow</Title>
                  <Timeline items={workflowTimeline} />

                  {quotation.status === 'APPROVED' &&
                    quotation.invoices &&
                    quotation.invoices.length > 0 && (
                      <div style={{ marginTop: '24px' }}>
                        <Title level={5}>Generated Invoices</Title>
                        <Space direction='vertical' style={{ width: '100%' }}>
                          {quotation.invoices.map(invoice => (
                            <Card key={invoice.id} size='small'>
                              <Space>
                                <FileTextOutlined />
                                <Text strong>{invoice.invoiceNumber}</Text>
                                <Tag color='blue'>{invoice.status}</Tag>
                                <Button
                                  type='link'
                                  onClick={() =>
                                    navigate(`/invoices/${invoice.id}`)
                                  }
                                >
                                  View Invoice
                                </Button>
                              </Space>
                            </Card>
                          ))}
                        </Space>
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
                    {quotation.client && (
                      <Col xs={24} md={12}>
                        <Card title='Client Information' size='small'>
                          <Descriptions column={1}>
                            <Descriptions.Item label='Name'>
                              {quotation.client.name}
                            </Descriptions.Item>
                            <Descriptions.Item label='Company'>
                              {quotation.client.company}
                            </Descriptions.Item>
                            <Descriptions.Item label='Email'>
                              {quotation.client.email}
                            </Descriptions.Item>
                          </Descriptions>
                          <Button
                            type='link'
                            onClick={() =>
                              navigate(`/clients/${quotation.client!.id}`)
                            }
                          >
                            View Client Details
                          </Button>
                        </Card>
                      </Col>
                    )}

                    {quotation.project && (
                      <Col xs={24} md={12}>
                        <Card title='Project Information' size='small'>
                          <Descriptions column={1}>
                            <Descriptions.Item label='Project Number'>
                              {quotation.project.number}
                            </Descriptions.Item>
                            <Descriptions.Item label='Description'>
                              {quotation.project.description}
                            </Descriptions.Item>
                            <Descriptions.Item label='Type'>
                              {quotation.project.type}
                            </Descriptions.Item>
                          </Descriptions>
                          <Button
                            type='link'
                            onClick={() =>
                              navigate(`/projects/${quotation.project!.id}`)
                            }
                          >
                            View Project Details
                          </Button>
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
                  <FileUpload
                    quotationId={id}
                    documents={documents}
                    onDocumentsChange={() => refetchDocuments()}
                  />
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button
                      type='primary'
                      icon={<FilePdfOutlined />}
                      onClick={handlePdfPreview}
                    >
                      Preview PDF
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* PDF Preview Modal */}
      <Modal
        title='Quotation PDF Preview'
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
                const blob = await quotationService.downloadQuotationPDF(id!)
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${quotation?.quotationNumber || 'quotation'}.pdf`
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
            <SyncOutlined spin style={{ fontSize: '48px', color: '#1890ff' }} />
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
            title='Quotation PDF Preview'
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FilePdfOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
            <Title level={4} type='secondary'>
              PDF Preview
            </Title>
            <Text type='secondary'>
              Failed to load PDF preview.
            </Text>
          </div>
        )}
      </Modal>

      {/* Floating Action Button */}
      <FloatButton.Group>
        <FloatButton
          icon={<EditOutlined />}
          tooltip='Edit Quotation'
          onClick={handleEdit}
          aria-label='Edit quotation'
        />
        <FloatButton
          icon={<FilePdfOutlined />}
          tooltip='View PDF'
          onClick={handlePdfPreview}
          aria-label='View PDF'
        />
        <FloatButton
          icon={<WhatsAppOutlined />}
          tooltip='Share via WhatsApp'
          onClick={handleShareWhatsApp}
          aria-label='Share via WhatsApp'
        />
      </FloatButton.Group>
    </div>
  )
}
