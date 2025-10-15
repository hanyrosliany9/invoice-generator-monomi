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
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  EntityFormLayout,
  EntityHeroCard,
  FormStatistics,
  IDRCurrencyInput,
  InheritanceIndicator,
  MateraiCompliancePanel,
  PreviewPanel,
  ProgressiveSection,
} from '../components/forms'
import { invoiceService, UpdateInvoiceRequest } from '../services/invoices'
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
  paymentInfo: string
  terms: string
  scopeOfWork?: string
  dueDate: dayjs.Dayjs
  materaiRequired: boolean
  materaiApplied: boolean
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
}

export const InvoiceEditPage: React.FC = () => {
  const [form] = Form.useForm<InvoiceFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const [autoSaving, setAutoSaving] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // Fetch invoice data
  const {
    data: invoice,
    isLoading: invoiceLoading,
    error: invoiceError,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoice(id!),
    enabled: !!id,
  })

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

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: UpdateInvoiceRequest) =>
      invoiceService.updateInvoice(id!, data),
    onSuccess: updatedInvoice => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      message.success('Invoice updated successfully')
      navigate(`/invoices/${updatedInvoice.id}`)
    },
    onError: () => {
      message.error('Failed to update invoice')
    },
  })

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: () => invoiceService.markAsPaid(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      message.success('Invoice marked as paid')
    },
    onError: () => {
      message.error('Failed to mark invoice as paid')
    },
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => invoiceService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      message.success('Invoice status updated')
    },
    onError: () => {
      message.error('Failed to update invoice status')
    },
  })

  // Pre-fill form when invoice data is loaded
  useEffect(() => {
    if (invoice) {
      const formData = {
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        quotationId: invoice.quotationId,
        amountPerProject: Number(invoice.amountPerProject),
        totalAmount: Number(invoice.totalAmount),
        paymentInfo: invoice.paymentInfo,
        terms: invoice.terms,
        scopeOfWork: invoice.scopeOfWork || '',
        dueDate: dayjs(invoice.dueDate),
        materaiRequired: invoice.materaiRequired,
        materaiApplied: invoice.materaiApplied,
        status: invoice.status,
      }
      form.setFieldsValue(formData)
      updatePreviewData(formData)
    }
  }, [invoice, form])

  // Update preview data when form changes
  const updatePreviewData = (values: any) => {
    const selectedClient =
      clients.find(c => c.id === values.clientId) || invoice?.client
    const selectedProject =
      projects.find(p => p.id === values.projectId) || invoice?.project
    const selectedQuotation =
      quotations.find(q => q.id === values.quotationId) || invoice?.quotation

    setPreviewData({
      ...values,
      client: selectedClient,
      project: selectedProject,
      quotation: selectedQuotation,
      number: invoice?.invoiceNumber || 'DRAFT',
      invoiceNumber: invoice?.invoiceNumber || 'DRAFT',
    })
  }

  const handleFormChange = () => {
    const values = form.getFieldsValue()
    updatePreviewData(values)
  }

  const handleSubmit = async (values: InvoiceFormData) => {
    const updateData: UpdateInvoiceRequest = {
      clientId: values.clientId,
      projectId: values.projectId,
      quotationId: values.quotationId,
      amountPerProject: values.amountPerProject,
      totalAmount: values.totalAmount,
      paymentInfo: values.paymentInfo,
      terms: values.terms,
      scopeOfWork: values.scopeOfWork,
      dueDate: values.dueDate.toISOString(),
      materaiRequired: values.materaiRequired,
      materaiApplied: values.materaiApplied,
    }

    updateInvoiceMutation.mutate(updateData)
  }

  const handleSaveAndSend = async () => {
    try {
      const values = await form.validateFields()
      const updateData: UpdateInvoiceRequest = {
        clientId: values.clientId,
        projectId: values.projectId,
        quotationId: values.quotationId,
        amountPerProject: values.amountPerProject,
        totalAmount: values.totalAmount,
        paymentInfo: values.paymentInfo,
        terms: values.terms,
        scopeOfWork: values.scopeOfWork,
        dueDate: values.dueDate.toISOString(),
        materaiRequired: values.materaiRequired,
        materaiApplied: values.materaiApplied,
        status: 'SENT',
      }

      updateInvoiceMutation.mutate(updateData)
    } catch (error) {
      message.error('Please complete required fields')
    }
  }

  const handleMarkAsPaid = () => {
    markAsPaidMutation.mutate()
  }

  const handleSaveDraft = async () => {
    setAutoSaving(true)
    try {
      const values = form.getFieldsValue()
      // Auto-save logic would go here
      message.success('Draft saved')
    } catch (error) {
      message.error('Failed to save draft')
    } finally {
      setAutoSaving(false)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus)
  }

  if (invoiceLoading) {
    return <div>Loading invoice...</div>
  }

  if (invoiceError || !invoice) {
    return (
      <Alert
        message='Invoice Not Found'
        description='The requested invoice could not be found.'
        type='error'
        showIcon
        action={
          <Button onClick={() => navigate('/invoices')}>
            Back to Invoices
          </Button>
        }
      />
    )
  }

  const selectedClient =
    clients.find(c => c.id === form.getFieldValue('clientId')) || invoice.client
  const totalAmount =
    form.getFieldValue('totalAmount') || Number(invoice.totalAmount)
  const dueDate = form.getFieldValue('dueDate') || dayjs(invoice.dueDate)
  const daysToDue = dueDate.diff(dayjs(), 'day')
  const canEdit = invoice.status === 'DRAFT' || invoice.status === 'SENT'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'default'
      case 'SENT':
        return 'processing'
      case 'PAID':
        return 'success'
      case 'OVERDUE':
        return 'error'
      case 'CANCELLED':
        return 'error'
      default:
        return 'default'
    }
  }

  const getInheritedData = (): Record<string, any> => {
    if (!invoice.quotation) return {}

    return {
      'Original Amount': {
        value: (invoice.quotation as any).totalAmount || 'N/A',
        editable: canEdit,
        confidence: 100,
        source: 'quotation',
      },
      'Payment Terms': {
        value: 'Net 30 days',
        editable: canEdit,
        confidence: 90,
        source: 'quotation',
      },
    }
  }

  const availableActions = invoiceService.getAvailableStatusTransitions(
    invoice.status as any
  )

  const heroCard = (
    <EntityHeroCard
      title={`Edit Invoice ${invoice.invoiceNumber || invoice.number || 'Draft'}`}
      subtitle='Modify invoice details, payment information, and status'
      icon={<FileTextOutlined />}
      breadcrumb={['Invoices', invoice.invoiceNumber || 'Draft', 'Edit']}
      metadata={[
        { label: 'Invoice ID', value: invoice.id },
        {
          label: 'Created',
          value: dayjs(invoice.createdAt).format('DD MMM YYYY'),
        },
        {
          label: 'Due Date',
          value: dayjs(invoice.dueDate).format('DD MMM YYYY'),
        },
        { label: 'Status', value: invoice.status },
      ]}
      actions={[
        ...(canEdit
          ? [
              {
                label: 'Save Draft',
                type: 'default' as const,
                icon: <SaveOutlined />,
                onClick: handleSaveDraft,
                loading: autoSaving,
              },
              ...(invoice.status === 'DRAFT'
                ? [
                    {
                      label: 'Save & Send',
                      type: 'primary' as const,
                      icon: <SendOutlined />,
                      onClick: handleSaveAndSend,
                      loading: updateInvoiceMutation.isPending,
                    },
                  ]
                : []),
            ]
          : []),
        ...(invoice.status === 'SENT' || invoice.status === 'OVERDUE'
          ? [
              {
                label: 'Mark as Paid',
                type: 'primary' as const,
                icon: <CheckCircleOutlined />,
                onClick: handleMarkAsPaid,
                loading: markAsPaidMutation.isPending,
              },
            ]
          : []),
      ]}
    />
  )

  return (
    <EntityFormLayout
      hero={heroCard}
      sidebar={
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          {/* Invoice Status Management */}
          {availableActions.length > 0 && (
            <Card title='Status Actions' size='small'>
              <Space direction='vertical' style={{ width: '100%' }}>
                {availableActions.map(action => (
                  <Button
                    key={action.value}
                    type='default'
                    block
                    icon={
                      action.value === 'PAID' ? (
                        <CheckCircleOutlined />
                      ) : (
                        <ClockCircleOutlined />
                      )
                    }
                    onClick={() => handleStatusChange(action.value)}
                    loading={updateStatusMutation.isPending}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            </Card>
          )}

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
          {invoice.quotation && (
            <InheritanceIndicator
              source='quotation'
              sourceEntity={{
                id: invoice.quotation.id,
                name: invoice.quotation.quotationNumber,
                number: invoice.quotation.quotationNumber,
              }}
              inheritedData={getInheritedData()}
            />
          )}

          {/* Materai Compliance */}
          {totalAmount > 0 && (
            <MateraiCompliancePanel
              totalAmount={totalAmount}
              currentStatus={
                invoice.materaiApplied
                  ? 'APPLIED'
                  : invoice.materaiRequired
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
          showPdf={true}
          allowDownload={true}
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
        {/* Edit Restrictions Alert */}
        {!canEdit && (
          <Alert
            style={{ marginBottom: '24px' }}
            message='Invoice Cannot Be Modified'
            description={`This invoice has status "${invoice.status}" and cannot be edited. Only DRAFT and SENT invoices can be modified.`}
            type='warning'
            showIcon
          />
        )}

        {/* Source Information */}
        <ProgressiveSection
          title='Invoice Source'
          subtitle='Project and quotation information'
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item name='quotationId' label='From Quotation'>
                <Select
                  placeholder='Select quotation'
                  size='large'
                  loading={quotationsLoading}
                  allowClear
                  disabled={!canEdit}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={quotations.map(quotation => ({
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
          subtitle='Project and total invoice amounts'
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Indonesian Compliance */}
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='materaiRequired'
                label='Materai (Stamp Duty) Required'
                valuePropName='checked'
              >
                <Switch
                  checkedChildren='Required'
                  unCheckedChildren='Not Required'
                  disabled={!canEdit || totalAmount > 5000000} // Auto-enable for high amounts
                />
              </Form.Item>
              {totalAmount > 5000000 && (
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  Materai is automatically required for amounts over IDR
                  5,000,000
                </Text>
              )}
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='materaiApplied'
                label='Materai Applied'
                valuePropName='checked'
              >
                <Switch
                  checkedChildren='Applied'
                  unCheckedChildren='Not Applied'
                  disabled={!canEdit || !form.getFieldValue('materaiRequired')}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Scope of Work Section */}
        <ProgressiveSection
          title='Scope of Work'
          subtitle='Narrative description of work scope (inherited from quotation/project or custom)'
          icon={<FileTextOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='scopeOfWork'
                label='Scope of Work Description'
                help='Describe the complete scope: tasks, timeline, deliverables, revisions, etc. Leave empty to keep inherited value from quotation/project.'
              >
                <TextArea
                  rows={6}
                  placeholder={`Example:\nInvoice ini mencakup:\n1. Pengembangan website e-commerce\n2. Integrasi payment gateway\n3. Training tim internal\n\nDeliverables: Website fully functional, dokumentasi lengkap`}
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
                  disabled={!canEdit}
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
                disabled={!canEdit}
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
                disabled={!canEdit}
              />
            </Form.Item>
          </Col>
        </ProgressiveSection>

        {/* Action Buttons */}
        {canEdit && (
          <Card style={{ marginTop: '24px', textAlign: 'center' }}>
            <Space size='large'>
              <Button size='large' onClick={() => navigate(`/invoices/${id}`)}>
                Cancel
              </Button>
              <Button
                type='default'
                size='large'
                icon={<SaveOutlined />}
                onClick={handleSaveDraft}
                loading={autoSaving}
              >
                Save as Draft
              </Button>
              <Button
                type='primary'
                size='large'
                icon={<SaveOutlined />}
                htmlType='submit'
                loading={updateInvoiceMutation.isPending}
              >
                Update Invoice
              </Button>
            </Space>
          </Card>
        )}
      </Form>
    </EntityFormLayout>
  )
}

export default InvoiceEditPage
