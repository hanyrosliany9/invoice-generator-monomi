import React, { useEffect, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import {
  BankOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  EntityHeroCard,
  FormStatistics,
  IDRCurrencyInput,
  InheritanceIndicator,
  MateraiCompliancePanel,
  OptimizedFormLayout,
  PreviewPanel,
  ProgressiveSection,
} from '../components/forms'
import { useOptimizedAutoSave } from '../hooks/useOptimizedAutoSave'
import { useMobileOptimized } from '../hooks/useMobileOptimized'
import { CreateInvoiceRequest, invoiceService } from '../services/invoices'
import { quotationService } from '../services/quotations'
import { projectService } from '../services/projects'
import { clientService } from '../services/clients'
import { formatIDR } from '../utils/currency'

const { TextArea } = Input
const { Title, Text } = Typography

interface InvoiceFormData {
  clientId: string
  projectId: string
  quotationId?: string
  amountPerProject: number
  totalAmount: number
  scopeOfWork?: string
  paymentInfo: string
  terms: string
  dueDate: dayjs.Dayjs
  materaiRequired: boolean
}

export const InvoiceCreatePage: React.FC = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm<InvoiceFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [previewData, setPreviewData] = useState<any>(null)

  // Mobile optimization
  const mobile = useMobileOptimized()
  const performanceSettings = mobile.getPerformanceSettings()

  // Auto-save functionality
  const autoSave = useOptimizedAutoSave({
    delay: performanceSettings.autoSaveDelay,
    messageApi: message,
    onSave: async (data: any) => {
      // In a real app, this would save a draft to the backend
      console.log('Auto-saving invoice draft:', data)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
    },
    onError: error => {
      console.error('Auto-save failed:', error)
    },
    enabled: true,
  })

  const prefilledQuotationId = searchParams.get('quotationId')
  const prefilledProjectId = searchParams.get('projectId')
  const prefilledClientId = searchParams.get('clientId')

  // Fetch clients for selection
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Fetch projects for selection
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  // Fetch quotations for selection
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: quotationService.getQuotations,
  })

  // Fetch specific quotation if prefilled
  const { data: selectedQuotation, isLoading: quotationLoading } = useQuery({
    queryKey: ['quotation', prefilledQuotationId],
    queryFn: () => quotationService.getQuotation(prefilledQuotationId!),
    enabled: !!prefilledQuotationId,
  })

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: invoice => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      message.success('Invoice created successfully')
      navigate(`/invoices/${invoice.id}`)
    },
    onError: () => {
      message.error('Failed to create invoice')
    },
  })

  // Pre-fill form when quotation data is loaded
  useEffect(() => {
    if (selectedQuotation) {
      // Warn if quotation is not APPROVED (UX enhancement)
      if (selectedQuotation.status !== 'APPROVED') {
        message.warning({
          content: `Warning: This quotation is ${selectedQuotation.status}. Only APPROVED quotations can be used to generate invoices. The backend will reject this submission.`,
          duration: 8,
        })
      }

      const defaultDueDate = dayjs().add(30, 'day')
      const materaiRequired = selectedQuotation.totalAmount > 5000000

      const inheritedData = {
        clientId: selectedQuotation.clientId,
        projectId: selectedQuotation.projectId,
        quotationId: selectedQuotation.id,
        amountPerProject: selectedQuotation.amountPerProject,
        totalAmount: selectedQuotation.totalAmount,
        dueDate: defaultDueDate,
        materaiRequired,
        paymentInfo: generateDefaultPaymentInfo(selectedQuotation),
        terms: selectedQuotation.terms || generateDefaultInvoiceTerms(),
      }
      form.setFieldsValue(inheritedData)
      updatePreviewData(inheritedData)
    } else if (prefilledClientId) {
      form.setFieldsValue({
        clientId: prefilledClientId,
        dueDate: dayjs().add(30, 'day'),
      })
    }
  }, [selectedQuotation, prefilledClientId, form])

  // Generate default payment info
  const generateDefaultPaymentInfo = (quotation: any) => {
    return `
Payment Methods:
• Bank Transfer: BCA 1234567890 (PT Monomi)
• Digital Payment: GoPay, OVO, DANA
• Cash on Delivery (for local clients)

Payment Terms:
• Net 30 days from invoice date
• Early payment discount: 2% if paid within 10 days
• Late payment fee: 2% per month

Reference: Quotation ${quotation.quotationNumber}
    `.trim()
  }

  // Generate default invoice terms
  const generateDefaultInvoiceTerms = () => {
    return `
1. Payment due within 30 days of invoice date
2. Indonesian Tax (PPN 11%) included in total amount
3. Materai (stamp duty) required for amounts over IDR 5,000,000
4. Payment confirmation required within 3 business days
5. Disputes must be raised within 14 days of invoice date
6. Indonesian law and Jakarta jurisdiction applies
7. Interest charges apply for overdue payments (2% per month)
8. Digital signatures have the same legal validity as handwritten signatures
    `.trim()
  }

  // Update preview data when form changes
  const updatePreviewData = (values: any) => {
    const selectedClient =
      clients.find(c => c.id === values.clientId) || selectedQuotation?.client
    const selectedProject =
      projects.find(p => p.id === values.projectId) ||
      selectedQuotation?.project

    setPreviewData({
      ...values,
      client: selectedClient,
      project: selectedProject,
      quotation: selectedQuotation,
      number: 'DRAFT',
      status: 'DRAFT',
      invoiceNumber: 'DRAFT',
    })
  }

  const handleFormChange = () => {
    const values = form.getFieldsValue()
    updatePreviewData(values)

    // Trigger auto-save with current form data
    if (values.clientId && values.projectId && values.totalAmount) {
      autoSave.triggerAutoSave(values)
    }
  }

  const handleSubmit = async (values: InvoiceFormData) => {
    const invoiceData: CreateInvoiceRequest = {
      clientId: values.clientId,
      projectId: values.projectId,
      quotationId: values.quotationId,
      amountPerProject: values.amountPerProject,
      totalAmount: values.totalAmount,
      scopeOfWork: values.scopeOfWork,
      paymentInfo: values.paymentInfo,
      terms: values.terms,
      dueDate: values.dueDate.toISOString(),
      materaiRequired: values.materaiRequired,
    }

    createInvoiceMutation.mutate(invoiceData)
  }

  const handleSaveAndSend = async () => {
    try {
      const values = await form.validateFields()
      const invoiceData: CreateInvoiceRequest = {
        clientId: values.clientId,
        projectId: values.projectId,
        quotationId: values.quotationId,
        amountPerProject: values.amountPerProject,
        totalAmount: values.totalAmount,
        scopeOfWork: values.scopeOfWork,
        paymentInfo: values.paymentInfo,
        terms: values.terms,
        dueDate: values.dueDate.toISOString(),
        materaiRequired: values.materaiRequired,
      }

      const invoice = await invoiceService.createInvoice(invoiceData)
      // Update status to SENT
      await invoiceService.updateInvoice(invoice.id, { status: 'SENT' })

      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      message.success('Invoice created and sent successfully')
      navigate(`/invoices/${invoice.id}`)
    } catch (error) {
      message.error('Please complete required fields')
    }
  }

  const handleSaveDraft = async () => {
    try {
      const values = form.getFieldsValue()
      await autoSave.forceSave(values)
    } catch (error) {
      message.error('Failed to save draft')
    }
  }

  const selectedClient = clients.find(
    c => c.id === form.getFieldValue('clientId')
  )
  const totalAmount = form.getFieldValue('totalAmount') || 0
  const dueDate = form.getFieldValue('dueDate')
  const daysToDue = dueDate ? dueDate.diff(dayjs(), 'day') : 30

  const getInheritedData = (): Record<string, any> => {
    if (!selectedQuotation) return {}

    return {
      'Quotation Amount': {
        value: selectedQuotation.totalAmount,
        editable: true,
        confidence: 100,
        source: 'quotation',
      },
      'Client Information': {
        value: selectedQuotation.client?.name,
        editable: false,
        confidence: 100,
        source: 'quotation',
      },
      'Project Details': {
        value: selectedQuotation.project?.description,
        editable: false,
        confidence: 100,
        source: 'quotation',
      },
      'Payment Terms': {
        value: 'Net 30 days',
        editable: true,
        confidence: 90,
        source: 'quotation',
      },
    }
  }

  const heroCard = (
    <EntityHeroCard
      title='Create New Invoice'
      subtitle='Generate professional invoices with integrated payment systems'
      icon={<FileTextOutlined />}
      breadcrumb={['Invoices', 'Create New']}
      actions={[
        {
          label: autoSave.getLastSavedText(),
          type: 'default',
          icon: <SaveOutlined />,
          onClick: handleSaveDraft,
          loading: autoSave.isSaving,
        },
        {
          label: 'Save & Send',
          type: 'primary',
          icon: <SendOutlined />,
          onClick: handleSaveAndSend,
          loading: createInvoiceMutation.isPending,
        },
      ]}
    />
  )

  return (
    <OptimizedFormLayout
      hero={heroCard}
      sidebar={
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          {/* Real-time Statistics */}
          <FormStatistics
            title='Invoice Overview'
            stats={[
              {
                label: 'Invoice Amount',
                value: totalAmount,
                format: 'currency',
                icon: <DollarOutlined />,
                color: '#52c41a',
              },
              {
                label: 'Days to Due',
                value: daysToDue,
                format: 'duration',
                icon: <CalendarOutlined />,
                color:
                  daysToDue > 15
                    ? '#1890ff'
                    : daysToDue > 7
                      ? '#faad14'
                      : '#ff4d4f',
              },
              {
                label: 'Tax (PPN 11%)',
                value: totalAmount * 0.11,
                format: 'currency',
                icon: <BankOutlined />,
                color: '#1890ff',
              },
            ]}
            layout='vertical'
            size='small'
          />

          {/* Inheritance Indicator */}
          {selectedQuotation && (
            <InheritanceIndicator
              source='quotation'
              sourceEntity={{
                id: selectedQuotation.id,
                name: selectedQuotation.quotationNumber,
                number: selectedQuotation.quotationNumber,
              }}
              inheritedData={getInheritedData()}
            />
          )}

          {/* Materai Compliance */}
          {totalAmount > 0 && (
            <MateraiCompliancePanel
              totalAmount={totalAmount}
              currentStatus={
                form.getFieldValue('materaiRequired')
                  ? 'REQUIRED'
                  : 'NOT_REQUIRED'
              }
              showCalculation={true}
            />
          )}
        </Space>
      }
      preview={
        <PreviewPanel
          mode='live'
          data={previewData}
          template='invoice'
          showPdf={false}
          allowDownload={false}
        />
      }
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
        autoComplete='off'
        style={{ width: '100%' }}
      >
        {/* Smart Context Detection */}
        {(prefilledQuotationId || prefilledProjectId || prefilledClientId) && (
          <Alert
            style={{ marginBottom: '24px' }}
            message='Smart Context Detected'
            description={
              prefilledQuotationId && selectedQuotation ? (
                <Space direction='vertical' size='small'>
                  <div>
                    Creating invoice from quotation:{' '}
                    <strong>{selectedQuotation.quotationNumber}</strong>
                  </div>
                  <div>
                    Status:{' '}
                    <Tag
                      color={
                        selectedQuotation.status === 'APPROVED'
                          ? 'green'
                          : selectedQuotation.status === 'SENT'
                            ? 'blue'
                            : selectedQuotation.status === 'DRAFT'
                              ? 'default'
                              : selectedQuotation.status === 'DECLINED'
                                ? 'red'
                                : 'orange'
                      }
                    >
                      {selectedQuotation.status}
                    </Tag>
                    {selectedQuotation.status !== 'APPROVED' && (
                      <span style={{ color: '#faad14', marginLeft: '8px' }}>
                        ⚠️ Only APPROVED quotations can generate invoices
                      </span>
                    )}
                  </div>
                </Space>
              ) : prefilledProjectId ? (
                `Creating invoice for project`
              ) : prefilledClientId ? (
                `Creating invoice for client: ${selectedClient?.name}`
              ) : (
                'Form pre-filled with context data'
              )
            }
            type={
              prefilledQuotationId && selectedQuotation?.status !== 'APPROVED'
                ? 'warning'
                : 'info'
            }
            showIcon
            closable
          />
        )}

        {/* Source Selection */}
        <ProgressiveSection
          title='Invoice Source'
          subtitle='Select quotation, project, or create from scratch'
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item name='quotationId' label='From Quotation (Optional)'>
                <Select
                  placeholder='Select quotation'
                  size='large'
                  loading={quotationsLoading}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={quotations
                    .filter(q => q.status === 'APPROVED')
                    .map(quotation => ({
                      value: quotation.id,
                      label: `${quotation.quotationNumber} - ${quotation.client?.name}`,
                    }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name='projectId'
                label='Project'
                rules={[{ required: true, message: 'Please select a project' }]}
              >
                <Select
                  placeholder='Select project'
                  size='large'
                  loading={projectsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={projects.map(project => ({
                    value: project.id,
                    label: `${project.number || 'No Number'} - ${project.description}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name='clientId'
                label='Client'
                rules={[{ required: true, message: 'Please select a client' }]}
              >
                <Select
                  placeholder='Select client'
                  size='large'
                  loading={clientsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={clients.map(client => ({
                    value: client.id,
                    label: `${client.name} ${client.company ? `(${client.company})` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Invoice Amounts */}
        <ProgressiveSection
          title='Invoice Amounts'
          subtitle='Set project and total invoice amounts'
          icon={<DollarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='amountPerProject'
                label='Project Amount (IDR)'
                rules={[
                  { required: true, message: 'Please enter project amount' },
                ]}
              >
                <IDRCurrencyInput
                  placeholder='Enter project amount'
                  showMateraiWarning={false}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='totalAmount'
                label='Total Invoice Amount (IDR)'
                rules={[
                  { required: true, message: 'Please enter total amount' },
                ]}
              >
                <IDRCurrencyInput
                  placeholder='Enter total amount'
                  showMateraiWarning={true}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Indonesian Compliance */}
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24}>
              <Form.Item
                name='materaiRequired'
                label='Materai (Stamp Duty) Required'
                valuePropName='checked'
              >
                <Switch
                  checkedChildren='Required'
                  unCheckedChildren='Not Required'
                  disabled={totalAmount > 5000000} // Auto-enable for high amounts
                />
              </Form.Item>
              {totalAmount > 5000000 && (
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  Materai is automatically required for amounts over IDR
                  5,000,000
                </Text>
              )}
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Scope of Work Section */}
        <ProgressiveSection
          title='Scope of Work'
          subtitle='Narrative description of work scope (inherited from quotation/project or custom)'
          icon={<FileTextOutlined />}
          defaultOpen={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              {selectedQuotation?.scopeOfWork && (
                <Alert
                  style={{ marginBottom: '16px' }}
                  message='Scope of Work Inherited from Quotation'
                  description={
                    <div>
                      <Text type='secondary'>
                        This scope of work is inherited from the quotation. You can customize it for this invoice:
                      </Text>
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: '#fafafa',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        maxHeight: '100px',
                        overflow: 'auto'
                      }}>
                        {selectedQuotation.scopeOfWork}
                      </div>
                    </div>
                  }
                  type='info'
                  showIcon
                />
              )}
              <Form.Item
                name='scopeOfWork'
                label='Scope of Work Description'
                help='Describe the complete scope: tasks, timeline, deliverables, revisions, etc. Leave empty to inherit from quotation/project.'
              >
                <TextArea
                  rows={6}
                  placeholder={
                    selectedQuotation?.scopeOfWork
                      ? 'Leave empty to use quotation scope, or customize it here...'
                      : `Example:\nInvoice ini mencakup:\n1. Pengembangan website e-commerce\n2. Integrasi payment gateway\n3. Training tim internal\n\nDeliverables: Website fully functional, dokumentasi lengkap`
                  }
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Payment Configuration */}
        <ProgressiveSection
          title='Payment Configuration'
          subtitle='Payment methods, due date, and instructions'
          icon={<CreditCardOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='dueDate'
                label='Due Date'
                rules={[
                  { required: true, message: 'Please select due date' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value.isAfter(dayjs())) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('Due date must be in the future')
                      )
                    },
                  }),
                ]}
              >
                <DatePicker
                  size='large'
                  style={{ width: '100%' }}
                  format='DD MMM YYYY'
                  disabledDate={current =>
                    current && current < dayjs().startOf('day')
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Col xs={24}>
            <Form.Item
              name='paymentInfo'
              label='Payment Information'
              rules={[
                { required: true, message: 'Please enter payment information' },
                {
                  min: 50,
                  message: 'Payment info must be at least 50 characters',
                },
              ]}
            >
              <TextArea
                rows={6}
                placeholder='Enter payment methods, bank details, and payment instructions...'
              />
            </Form.Item>
          </Col>
        </ProgressiveSection>

        {/* Terms & Conditions */}
        <ProgressiveSection
          title='Terms & Conditions'
          subtitle='Invoice terms, conditions, and legal requirements'
          icon={<FileTextOutlined />}
          defaultOpen={false}
          required={true}
        >
          <Col xs={24}>
            <Form.Item
              name='terms'
              label='Terms & Conditions'
              rules={[
                {
                  required: true,
                  message: 'Please enter terms and conditions',
                },
                { min: 100, message: 'Terms must be at least 100 characters' },
              ]}
            >
              <TextArea
                rows={8}
                placeholder='Enter detailed terms and conditions for this invoice...'
              />
            </Form.Item>
          </Col>
        </ProgressiveSection>

        {/* Action Buttons */}
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size='large'>
            <Button size='large' onClick={() => navigate('/invoices')}>
              Cancel
            </Button>
            <Button
              type='default'
              size='large'
              icon={<SaveOutlined />}
              onClick={handleSaveDraft}
              loading={autoSave.isSaving}
            >
              Save as Draft
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<SaveOutlined />}
              htmlType='submit'
              loading={createInvoiceMutation.isPending}
            >
              Create Invoice
            </Button>
          </Space>
        </Card>
      </Form>
    </OptimizedFormLayout>
  )
}
