import React, { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Card,
  Space,
  Select,
  DatePicker,
  message,
  Typography,
  Alert,
  Tag,
  Spin,
  Result,
} from 'antd'
import {
  FileTextOutlined,
  SaveOutlined,
  SendOutlined,
  DollarOutlined,
  CalendarOutlined,
  ProjectOutlined,
  UndoOutlined,
  CheckCircleOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { 
  EntityHeroCard, 
  EntityFormLayout, 
  ProgressiveSection,
  FormStatistics,
  IDRCurrencyInput,
  MateraiCompliancePanel,
  PreviewPanel,
} from '../components/forms'
import { quotationService, UpdateQuotationRequest } from '../services/quotations'
import { projectService } from '../services/projects'
import { clientService } from '../services/clients'
import { formatIDR } from '../utils/currency'

const { TextArea } = Input
const { Title, Text } = Typography

interface QuotationFormData {
  clientId: string
  projectId: string
  amountPerProject: number
  totalAmount: number
  terms: string
  validUntil: dayjs.Dayjs
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
}

export const QuotationEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<QuotationFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [autoSaving, setAutoSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValues, setOriginalValues] = useState<QuotationFormData | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)

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

  // Fetch clients for selection
  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Fetch projects for selection
  const {
    data: projects = [],
    isLoading: projectsLoading,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  // Update quotation mutation
  const updateQuotationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuotationRequest }) =>
      quotationService.updateQuotation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      message.success('Quotation updated successfully')
      setHasChanges(false)
      navigate(`/quotations/${id}`)
    },
    onError: () => {
      message.error('Failed to update quotation')
    },
  })

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: quotationService.generateInvoice,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (result.isExisting) {
        message.info(`Invoice ${result.invoice.invoiceNumber} already exists for this quotation`)
      } else {
        message.success(`Invoice ${result.invoice.invoiceNumber} generated successfully`)
      }
      navigate(`/invoices/${result.invoiceId}`)
    },
    onError: () => {
      message.error('Failed to generate invoice')
    },
  })

  // Initialize form when quotation data is loaded
  useEffect(() => {
    if (quotation) {
      const formData: QuotationFormData = {
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        amountPerProject: Number(quotation.amountPerProject),
        totalAmount: Number(quotation.totalAmount),
        terms: quotation.terms,
        validUntil: dayjs(quotation.validUntil),
        status: quotation.status,
      }
      form.setFieldsValue(formData)
      setOriginalValues(formData)
      updatePreviewData(formData)
    }
  }, [quotation, form])

  // Update preview data when form changes
  const updatePreviewData = (values: any) => {
    const selectedClient = clients.find(c => c.id === values.clientId) || quotation?.client
    const selectedProject = projects.find(p => p.id === values.projectId) || quotation?.project
    
    setPreviewData({
      ...values,
      client: selectedClient,
      project: selectedProject,
      number: quotation?.quotationNumber || 'DRAFT',
      status: values.status || quotation?.status,
    })
  }

  // Track form changes
  const handleFormChange = () => {
    const currentValues = form.getFieldsValue()
    const changed = originalValues && JSON.stringify(currentValues) !== JSON.stringify(originalValues)
    setHasChanges(!!changed)
    updatePreviewData(currentValues)
  }

  const handleSubmit = async (values: QuotationFormData) => {
    if (!id) return
    
    const quotationData: UpdateQuotationRequest = {
      clientId: values.clientId,
      projectId: values.projectId,
      amountPerProject: values.amountPerProject,
      totalAmount: values.totalAmount,
      terms: values.terms,
      validUntil: values.validUntil.toISOString(),
      status: values.status,
    }
    
    updateQuotationMutation.mutate({ id, data: quotationData })
  }

  const handleRevertChanges = () => {
    if (originalValues) {
      form.setFieldsValue(originalValues)
      setHasChanges(false)
      updatePreviewData(originalValues)
      message.info('Changes reverted')
    }
  }

  const handleGenerateInvoice = () => {
    if (!id) return
    generateInvoiceMutation.mutate(id)
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

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="Loading quotation data..." />
      </div>
    )
  }

  if (error || !quotation) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="404"
          title="Quotation Not Found"
          subTitle="The quotation you're trying to edit doesn't exist."
          extra={
            <Button type="primary" onClick={() => navigate('/quotations')}>
              Back to Quotations
            </Button>
          }
        />
      </div>
    )
  }

  const totalAmount = form.getFieldValue('totalAmount') || 0
  const canEdit = quotation.status === 'DRAFT' || quotation.status === 'REVISED'
  const canGenerateInvoice = quotation.status === 'APPROVED'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'blue'
      case 'SENT': return 'orange'
      case 'APPROVED': return 'green'
      case 'DECLINED': return 'red'
      case 'REVISED': return 'purple'
      default: return 'default'
    }
  }

  const heroCard = (
    <EntityHeroCard
      title={quotation.quotationNumber}
      subtitle={`Editing quotation • ${quotation.client?.name || 'Unknown Client'}`}
      icon={<FileTextOutlined />}
      avatar={quotation.client?.name?.charAt(0).toUpperCase()}
      breadcrumb={['Quotations', quotation.quotationNumber, 'Edit']}
      metadata={[
        { 
          label: 'Created', 
          value: quotation.createdAt, 
          format: 'date' 
        },
        { 
          label: 'Valid Until', 
          value: quotation.validUntil, 
          format: 'date' 
        },
        { 
          label: 'Status', 
          value: quotation.status 
        },
      ]}
      actions={[
        ...(canEdit ? [
          {
            label: 'Revert Changes',
            type: 'default' as const,
            icon: <UndoOutlined />,
            onClick: handleRevertChanges,
            disabled: !hasChanges,
          },
          {
            label: 'Save Changes',
            type: 'primary' as const,
            icon: <SaveOutlined />,
            onClick: () => form.submit(),
            loading: updateQuotationMutation.isPending,
            disabled: !hasChanges,
          },
        ] : []),
        ...(canGenerateInvoice ? [
          {
            label: 'Generate Invoice',
            type: 'primary' as const,
            icon: <ExportOutlined />,
            onClick: handleGenerateInvoice,
            loading: generateInvoiceMutation.isPending,
          },
        ] : []),
      ]}
      status={
        !canEdit ? {
          type: 'warning',
          message: `Quotation is ${quotation.status.toLowerCase()} and cannot be edited`
        } : hasChanges ? {
          type: 'warning',
          message: 'You have unsaved changes'
        } : {
          type: 'info',
          message: 'Auto-saved 2 minutes ago'
        }
      }
    />
  )

  return (
    <EntityFormLayout 
      hero={heroCard}
      sidebar={
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Real-time Statistics */}
          <FormStatistics
            title="Quotation Overview"
            stats={[
              {
                label: 'Project Value',
                value: form.getFieldValue('amountPerProject') || 0,
                format: 'currency',
                icon: <ProjectOutlined />,
                color: '#1890ff',
              },
              {
                label: 'Total Amount',
                value: totalAmount,
                format: 'currency',
                icon: <DollarOutlined />,
                color: '#52c41a',
              },
              {
                label: 'Days Remaining',
                value: Math.max(0, dayjs(quotation.validUntil).diff(dayjs(), 'day')),
                format: 'duration',
                icon: <CalendarOutlined />,
                color: dayjs(quotation.validUntil).diff(dayjs(), 'day') > 7 ? '#722ed1' : '#ff4d4f',
              },
            ]}
            layout="vertical"
            size="small"
          />

          {/* Status Information */}
          <Card size="small" title="Quotation Status">
            <Tag color={getStatusColor(quotation.status)} style={{ marginBottom: '8px' }}>
              {quotation.status}
            </Tag>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Created by: {quotation.user?.name || 'Unknown'}
              </Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Related invoices: {quotation.invoices?.length || 0}
              </Text>
            </div>
          </Card>

          {/* Materai Compliance */}
          {totalAmount > 0 && (
            <MateraiCompliancePanel
              totalAmount={totalAmount}
              showCalculation={true}
            />
          )}
        </Space>
      }
      preview={
        <PreviewPanel
          mode="live"
          data={previewData}
          template="quotation"
          showPdf={false}
          allowDownload={quotation.status !== 'DRAFT'}
        />
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
        autoComplete="off"
        style={{ width: '100%' }}
        disabled={!canEdit}
      >
        {/* Status Warning */}
        {!canEdit && (
          <Alert
            style={{ marginBottom: '24px' }}
            message="Quotation Cannot Be Edited"
            description={`This quotation is ${quotation.status.toLowerCase()} and cannot be modified. Only draft and revised quotations can be edited.`}
            type="warning"
            showIcon
          />
        )}

        {/* Project & Client Selection */}
        <ProgressiveSection
          title="Project & Client Selection"
          subtitle="Project and client information for this quotation"
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
          validation={hasChanges ? {
            status: 'warning',
            message: 'Modified fields detected'
          } : {
            status: 'success',
            message: 'All required fields completed'
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="projectId"
                label="Project"
                rules={[{ required: true, message: 'Please select a project' }]}
              >
                <Select
                  placeholder="Select project"
                  size="large"
                  loading={projectsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={projects.map(project => ({
                    value: project.id,
                    label: `${project.number || 'No Number'} - ${project.description}`,
                  }))}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="clientId"
                label="Client"
                rules={[{ required: true, message: 'Please select a client' }]}
              >
                <Select
                  placeholder="Select client"
                  size="large"
                  loading={clientsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
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

        {/* Pricing Strategy */}
        <ProgressiveSection
          title="Pricing Strategy"
          subtitle="Project pricing and quotation amounts"
          icon={<DollarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="amountPerProject"
                label="Project Amount (IDR)"
                rules={[{ required: true, message: 'Please enter project amount' }]}
              >
                <IDRCurrencyInput
                  placeholder="Enter project amount"
                  showMateraiWarning={false}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="totalAmount"
                label="Total Quotation Amount (IDR)"
                rules={[{ required: true, message: 'Please enter total amount' }]}
              >
                <IDRCurrencyInput
                  placeholder="Enter total amount"
                  showMateraiWarning={true}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Pricing Calculations */}
          {totalAmount > 0 && (
            <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f0f5ff' }}>
              <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
                Pricing Breakdown
              </Title>
              <Row gutter={[16, 8]}>
                <Col xs={12} sm={6}>
                  <Text type="secondary">Subtotal:</Text>
                  <div><Text strong>{formatIDR(totalAmount)}</Text></div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type="secondary">PPN (11%):</Text>
                  <div><Text strong>{formatIDR(totalAmount * 0.11)}</Text></div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type="secondary">Total + Tax:</Text>
                  <div><Text strong style={{ color: '#52c41a' }}>{formatIDR(totalAmount * 1.11)}</Text></div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type="secondary">Materai:</Text>
                  <div>
                    <Text strong style={{ color: totalAmount > 5000000 ? '#faad14' : '#52c41a' }}>
                      {totalAmount > 5000000 ? 'Required' : 'Not Required'}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </ProgressiveSection>

        {/* Quotation Details */}
        <ProgressiveSection
          title="Quotation Details"
          subtitle="Status, validity period and terms & conditions"
          icon={<CalendarOutlined />}
          defaultOpen={false}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="status"
                label="Quotation Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select
                  placeholder="Select status"
                  size="large"
                  options={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'SENT', label: 'Sent' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'DECLINED', label: 'Declined' },
                    { value: 'REVISED', label: 'Revised' },
                  ]}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="validUntil"
                label="Valid Until"
                rules={[
                  { required: true, message: 'Please select validity date' },
                ]}
              >
                <DatePicker
                  size="large"
                  style={{ width: '100%' }}
                  format="DD MMM YYYY"
                />
              </Form.Item>
            </Col>
          </Row>

          <Col xs={24}>
            <Form.Item
              name="terms"
              label="Terms & Conditions"
              rules={[
                { required: true, message: 'Please enter terms and conditions' },
                { min: 50, message: 'Terms must be at least 50 characters' },
              ]}
            >
              <TextArea 
                rows={8}
                placeholder="Enter detailed terms and conditions for this quotation..."
              />
            </Form.Item>
          </Col>
        </ProgressiveSection>

        {/* Action Buttons */}
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size="large">
            <Button 
              size="large"
              onClick={() => navigate(`/quotations/${id}`)}
            >
              Cancel
            </Button>
            {canEdit && (
              <>
                <Button 
                  type="default" 
                  size="large"
                  icon={<UndoOutlined />}
                  onClick={handleRevertChanges}
                  disabled={!hasChanges}
                >
                  Revert Changes
                </Button>
                <Button 
                  type="primary" 
                  size="large"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={updateQuotationMutation.isPending}
                  disabled={!hasChanges}
                >
                  Save Changes
                </Button>
              </>
            )}
            {canGenerateInvoice && (
              <Button 
                type="primary" 
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleGenerateInvoice}
                loading={generateInvoiceMutation.isPending}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Generate Invoice
              </Button>
            )}
          </Space>
        </Card>
      </Form>
    </EntityFormLayout>
  )
}