import React, { useEffect, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
} from 'antd'
import {
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SaveOutlined,
  SendOutlined,
  UserOutlined,
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
import {
  CreateQuotationRequest,
  quotationService,
} from '../services/quotations'
import { projectService } from '../services/projects'
import { clientService } from '../services/clients'
import { formatIDR } from '../utils/currency'
import { useTheme } from '../theme'

const { TextArea } = Input
const { Title, Text } = Typography

interface QuotationFormData {
  clientId: string
  projectId: string
  amountPerProject: number
  totalAmount: number
  scopeOfWork?: string
  terms: string
  validUntil: dayjs.Dayjs
}

export const QuotationCreatePage: React.FC = () => {
  const [form] = Form.useForm<QuotationFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [previewData, setPreviewData] = useState<any>(null)
  const { message } = App.useApp()
  const { theme } = useTheme()

  // Mobile optimization and performance
  const mobile = useMobileOptimized()
  const performanceSettings = mobile.getPerformanceSettings()

  // Auto-save functionality
  const autoSave = useOptimizedAutoSave({
    delay: performanceSettings.autoSaveDelay,
    messageApi: message,
    onSave: async (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auto-saving quotation draft:', data)
      }
      await new Promise(resolve => setTimeout(resolve, 300))
    },
    onError: error => {
      console.error('Quotation auto-save failed:', error)
    },
    enabled: true,
  })

  const prefilledProjectId = searchParams.get('projectId')
  const prefilledClientId = searchParams.get('clientId')
  const templateId = searchParams.get('template')

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

  // Fetch specific project if prefilled
  const { data: selectedProject, isLoading: projectLoading } = useQuery({
    queryKey: ['project', prefilledProjectId],
    queryFn: () => projectService.getProject(prefilledProjectId!),
    enabled: !!prefilledProjectId,
  })

  // Create quotation mutation
  const createQuotationMutation = useMutation({
    mutationFn: quotationService.createQuotation,
    onSuccess: quotation => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      message.success('Quotation created successfully')
      navigate(`/quotations/${quotation.id}`)
    },
    onError: () => {
      message.error('Failed to create quotation')
    },
  })

  // Pre-fill form when project/client data is loaded
  useEffect(() => {
    if (selectedProject) {
      const inheritedData = {
        clientId: selectedProject.clientId,
        projectId: selectedProject.id,
        amountPerProject: parseFloat(selectedProject.basePrice || '0') || 0,
        totalAmount: parseFloat(selectedProject.basePrice || '0') || 0,
        validUntil: dayjs().add(30, 'day'),
        terms: generateDefaultTerms(selectedProject),
      }
      form.setFieldsValue(inheritedData)
      updatePreviewData(inheritedData)
    } else if (prefilledClientId) {
      form.setFieldsValue({
        clientId: prefilledClientId,
        validUntil: dayjs().add(30, 'day'),
      })
    }
  }, [selectedProject, prefilledClientId, form])

  // Generate default terms based on project
  const generateDefaultTerms = (project: any) => {
    const baseTerms = `
1. Payment Terms: Net 30 days from invoice date
2. Project Timeline: ${project.startDate ? dayjs(project.startDate).format('DD MMM YYYY') : 'TBD'} - ${project.endDate ? dayjs(project.endDate).format('DD MMM YYYY') : 'TBD'}
3. Scope: ${project.description}
4. Deliverables: ${project.output || 'As specified in project requirements'}
5. Revision Policy: Up to 3 rounds of revisions included
6. Payment Schedule: 50% upfront, 50% on completion
7. Cancellation: 30 days written notice required
8. Indonesian Tax: PPN 11% applies
9. Materai: Stamp duty required for amounts over IDR 5,000,000
10. Jurisdiction: Indonesian law applies
    `.trim()
    return baseTerms
  }

  // Update preview data when form changes
  const updatePreviewData = (values: any) => {
    const selectedClient = clients.find(c => c.id === values.clientId)
    const selectedProjectData =
      projects.find(p => p.id === values.projectId) || selectedProject

    setPreviewData({
      ...values,
      client: selectedClient,
      project: selectedProjectData,
      number: 'DRAFT',
      status: 'DRAFT',
      products: (selectedProjectData as any)?.products || [],
    })
  }

  const handleFormChange = () => {
    const values = form.getFieldsValue()
    setFormValues(values)
    updatePreviewData(values)

    // Trigger auto-save when basic data is present
    if (values.clientId && values.projectId && values.totalAmount) {
      autoSave.triggerAutoSave(values)
    }
  }

  const handleSubmit = async (values: QuotationFormData) => {
    // Wait for pending auto-save before submitting
    if (autoSave.isSaving) {
      await autoSave.forceSave(values)
    }

    const quotationData: CreateQuotationRequest = {
      clientId: values.clientId,
      projectId: values.projectId,
      amountPerProject: typeof values.amountPerProject === 'string' ? parseFloat(values.amountPerProject) : values.amountPerProject,
      totalAmount: typeof values.totalAmount === 'string' ? parseFloat(values.totalAmount) : values.totalAmount,
      scopeOfWork: values.scopeOfWork,
      terms: values.terms,
      validUntil: values.validUntil.toISOString(),
    }

    createQuotationMutation.mutate(quotationData)
  }

  const handleSaveAndSend = async () => {
    try {
      const values = await form.validateFields()

      // Wait for pending auto-save before creating and sending
      if (autoSave.isSaving) {
        await autoSave.forceSave(values)
      }

      const quotationData: CreateQuotationRequest = {
        clientId: values.clientId,
        projectId: values.projectId,
        amountPerProject: values.amountPerProject,
        totalAmount: values.totalAmount,
        scopeOfWork: values.scopeOfWork,
        terms: values.terms,
        validUntil: values.validUntil.toISOString(),
      }

      const quotation = await quotationService.createQuotation(quotationData)
      // Update status to SENT
      await quotationService.updateStatus(quotation.id, 'SENT')

      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      message.success('Quotation created and sent successfully')
      navigate(`/quotations/${quotation.id}`)
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

  // Use form watcher instead of direct getFieldValue calls to avoid useForm warning
  const [formValues, setFormValues] = useState<Partial<QuotationFormData>>({})
  
  const selectedClient = clients.find(c => c.id === formValues.clientId)
  const currentProject = projects.find(p => p.id === formValues.projectId) || selectedProject
  const totalAmount = formValues.totalAmount || 0

  const getInheritedData = (): Record<string, any> => {
    if (!selectedProject) return {}

    return {
      'Project Budget': {
        value: selectedProject.basePrice,
        editable: true,
        confidence: 95,
        source: 'project',
      },
      'Client Information': {
        value: selectedProject.client?.name,
        editable: false,
        confidence: 100,
        source: 'project',
      },
      'Project Timeline': {
        value: `${dayjs(selectedProject.startDate).format('DD MMM')} - ${dayjs(selectedProject.endDate).format('DD MMM YYYY')}`,
        editable: true,
        confidence: 90,
        source: 'project',
      },
      'Project Type': {
        value: selectedProject.projectType?.code,
        editable: false,
        confidence: 100,
        source: 'project',
      },
    }
  }

  const heroCard = (
    <EntityHeroCard
      title='Create New Quotation'
      subtitle='Generate professional quotations with intelligent project data inheritance'
      icon={<FileTextOutlined />}
      breadcrumb={['Quotations', 'Create New']}
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
          loading: createQuotationMutation.isPending,
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
            title='Quotation Overview'
            stats={[
              {
                label: 'Project Value',
                value: formValues.amountPerProject || 0,
                format: 'currency',
                icon: <ProjectOutlined />,
                color: theme.colors.accent.primary,
              },
              {
                label: 'Total Amount',
                value: totalAmount,
                format: 'currency',
                icon: <DollarOutlined />,
                color: theme.colors.status.success,
              },
              {
                label: 'Valid Days',
                value: formValues.validUntil
                  ? formValues.validUntil.diff(dayjs(), 'day')
                  : 30,
                format: 'duration',
                icon: <CalendarOutlined />,
                color: theme.colors.accent.primary,
              },
            ]}
            layout='vertical'
            size='small'
          />

          {/* Inheritance Indicator */}
          {selectedProject && (
            <InheritanceIndicator
              source='project'
              sourceEntity={{
                id: selectedProject.id,
                name: selectedProject.description,
                number: selectedProject.number,
              }}
              inheritedData={getInheritedData()}
            />
          )}

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
          mode='live'
          data={previewData}
          template='quotation'
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
        {(prefilledProjectId || prefilledClientId || templateId) && (
          <Alert
            style={{ marginBottom: '24px' }}
            message='Smart Context Detected'
            description={
              prefilledProjectId
                ? `Creating quotation from project: ${selectedProject?.description}`
                : prefilledClientId
                  ? `Creating quotation for client: ${selectedClient?.name}`
                  : templateId
                    ? `Using template: ${templateId}`
                    : 'Form pre-filled with context data'
            }
            type='info'
            showIcon
            closable
          />
        )}

        {/* Project & Client Selection */}
        <ProgressiveSection
          title='Project & Client Selection'
          subtitle='Select the project and client for this quotation'
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
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

            <Col xs={24} sm={12}>
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

          {/* Project Context Display */}
          {currentProject && (
            <Card
              size='small'
              style={{
                marginTop: '16px',
                background: theme.colors.glass.background,
                backdropFilter: theme.colors.glass.backdropFilter,
                border: theme.colors.glass.border,
                boxShadow: theme.colors.glass.shadow,
              }}
            >
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={8}>
                  <Text type='secondary'>Project Type:</Text>
                  <div>
                    <Text strong>{currentProject.projectType?.code}</Text>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type='secondary'>Status:</Text>
                  <div>
                    <Text strong>{currentProject.status}</Text>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type='secondary'>Timeline:</Text>
                  <div>
                    <Text strong>
                      {dayjs(currentProject.startDate).format('DD MMM')} -{' '}
                      {dayjs(currentProject.endDate).format('DD MMM')}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </ProgressiveSection>

        {/* Pricing Strategy */}
        <ProgressiveSection
          title='Pricing Strategy'
          subtitle='Set project pricing and quotation amounts'
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
                label='Total Quotation Amount (IDR)'
                rules={[
                  { required: true, message: 'Please enter total amount' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const amountPerProject = getFieldValue('amountPerProject')
                      if (value && amountPerProject && value < amountPerProject) {
                        return Promise.reject(
                          new Error('Total amount must be greater than or equal to project amount')
                        )
                      }
                      return Promise.resolve()
                    },
                  }),
                ]}
              >
                <IDRCurrencyInput
                  placeholder='Enter total amount'
                  showMateraiWarning={true}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Pricing Calculations */}
          {totalAmount > 0 && (
            <Card
              size='small'
              style={{
                marginTop: '16px',
                background: theme.colors.glass.background,
                backdropFilter: theme.colors.glass.backdropFilter,
                border: theme.colors.glass.border,
                boxShadow: theme.colors.glass.shadow,
              }}
            >
              <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
                <BankOutlined
                  style={{ marginRight: '8px', color: theme.colors.accent.primary }}
                />
                Pricing Breakdown
              </Title>
              <Row gutter={[16, 8]}>
                <Col xs={12} sm={6}>
                  <Text type='secondary'>Subtotal:</Text>
                  <div>
                    <Text strong>{formatIDR(totalAmount)}</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type='secondary'>PPN (11%):</Text>
                  <div>
                    <Text strong>{formatIDR(totalAmount * 0.11)}</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type='secondary'>Total + Tax:</Text>
                  <div>
                    <Text strong style={{ color: theme.colors.status.success }}>
                      {formatIDR(totalAmount * 1.11)}
                    </Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type='secondary'>Materai:</Text>
                  <div>
                    <Text
                      strong
                      style={{
                        color: totalAmount > 5000000 ? theme.colors.status.warning : theme.colors.status.success,
                      }}
                    >
                      {totalAmount > 5000000 ? 'Required' : 'Not Required'}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </ProgressiveSection>

        {/* Scope of Work Section */}
        <ProgressiveSection
          title='Scope of Work'
          subtitle='Narrative description of work scope (inherited from project or custom)'
          icon={<FileTextOutlined />}
          defaultOpen={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              {selectedProject?.scopeOfWork && (
                <Alert
                  style={{ marginBottom: '16px' }}
                  message='Scope of Work Inherited from Project'
                  description={
                    <div>
                      <Text type='secondary'>
                        This scope of work is inherited from the project. You can customize it for this quotation:
                      </Text>
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: theme.colors.glass.background,
                        backdropFilter: theme.colors.glass.backdropFilter,
                        border: theme.colors.glass.border,
                        boxShadow: theme.colors.glass.shadow,
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        maxHeight: '100px',
                        overflow: 'auto',
                        color: theme.colors.text.secondary
                      }}>
                        {selectedProject.scopeOfWork}
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
                help='Describe the complete scope: tasks, timeline, deliverables, revisions, etc. Leave empty to inherit from project.'
              >
                <TextArea
                  rows={6}
                  placeholder={
                    selectedProject?.scopeOfWork
                      ? 'Leave empty to use project scope, or customize it here...'
                      : `Example:\nProyek pengembangan website meliputi:\n1. Design UI/UX\n2. Development frontend dan backend\n3. Testing dan deployment\n\nTimeline: 3 bulan\nDeliverables: Website responsive, dokumentasi, training`
                  }
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Quotation Details */}
        <ProgressiveSection
          title='Quotation Details'
          subtitle='Validity period and terms & conditions'
          icon={<CalendarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='validUntil'
                label='Valid Until'
                rules={[
                  { required: true, message: 'Please select validity date' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value.isAfter(dayjs())) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('Validity date must be in the future')
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
              name='terms'
              label='Terms & Conditions'
              rules={[
                {
                  required: true,
                  message: 'Please enter terms and conditions',
                },
                { min: 50, message: 'Terms must be at least 50 characters' },
              ]}
            >
              <TextArea
                rows={8}
                placeholder='Enter detailed terms and conditions for this quotation...'
              />
            </Form.Item>
          </Col>
        </ProgressiveSection>

        {/* Action Buttons */}
        <Card
          style={{
            marginTop: '24px',
            textAlign: 'center',
            background: theme.colors.glass.background,
            backdropFilter: theme.colors.glass.backdropFilter,
            border: theme.colors.glass.border,
            boxShadow: theme.colors.glass.shadow,
          }}
        >
          <Space size='large'>
            <Button size='large' onClick={() => navigate('/quotations')}>
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
              loading={createQuotationMutation.isPending}
            >
              Create Quotation
            </Button>
          </Space>
        </Card>
      </Form>
    </OptimizedFormLayout>
  )
}
