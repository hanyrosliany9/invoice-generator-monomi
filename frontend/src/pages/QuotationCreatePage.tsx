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
  Divider,
} from 'antd'
import {
  FileTextOutlined,
  SaveOutlined,
  SendOutlined,
  DollarOutlined,
  CalendarOutlined,
  ProjectOutlined,
  UserOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { 
  EntityHeroCard, 
  OptimizedFormLayout, 
  ProgressiveSection,
  FormStatistics,
  IDRCurrencyInput,
  MateraiCompliancePanel,
  InheritanceIndicator,
  PreviewPanel,
} from '../components/forms'
import { useOptimizedAutoSave } from '../hooks/useOptimizedAutoSave'
import { useMobileOptimized } from '../hooks/useMobileOptimized'
import { quotationService, CreateQuotationRequest } from '../services/quotations'
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
}

export const QuotationCreatePage: React.FC = () => {
  const [form] = Form.useForm<QuotationFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [previewData, setPreviewData] = useState<any>(null)
  
  // Mobile optimization and performance
  const mobile = useMobileOptimized()
  const performanceSettings = mobile.getPerformanceSettings()
  
  // Auto-save functionality
  const autoSave = useOptimizedAutoSave({
    delay: performanceSettings.autoSaveDelay,
    onSave: async (data: any) => {
      console.log('Auto-saving quotation draft:', data)
      await new Promise(resolve => setTimeout(resolve, 300))
    },
    onError: (error) => {
      console.error('Quotation auto-save failed:', error)
    },
    enabled: true
  })
  
  const prefilledProjectId = searchParams.get('projectId')
  const prefilledClientId = searchParams.get('clientId')
  const templateId = searchParams.get('template')

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

  // Fetch specific project if prefilled
  const {
    data: selectedProject,
    isLoading: projectLoading,
  } = useQuery({
    queryKey: ['project', prefilledProjectId],
    queryFn: () => projectService.getProject(prefilledProjectId!),
    enabled: !!prefilledProjectId,
  })

  // Create quotation mutation
  const createQuotationMutation = useMutation({
    mutationFn: quotationService.createQuotation,
    onSuccess: (quotation) => {
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
        amountPerProject: Number(selectedProject.estimatedBudget) || 0,
        totalAmount: Number(selectedProject.estimatedBudget) || 0,
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
    const selectedProjectData = projects.find(p => p.id === values.projectId) || selectedProject
    
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
    updatePreviewData(values)
    
    // Trigger auto-save when basic data is present
    if (values.clientId && values.projectId && values.totalAmount) {
      autoSave.triggerAutoSave(values)
    }
  }

  const handleSubmit = async (values: QuotationFormData) => {
    const quotationData: CreateQuotationRequest = {
      clientId: values.clientId,
      projectId: values.projectId,
      amountPerProject: values.amountPerProject,
      totalAmount: values.totalAmount,
      terms: values.terms,
      validUntil: values.validUntil.toISOString(),
    }
    
    createQuotationMutation.mutate(quotationData)
  }

  const handleSaveAndSend = async () => {
    try {
      const values = await form.validateFields()
      const quotationData: CreateQuotationRequest = {
        clientId: values.clientId,
        projectId: values.projectId,
        amountPerProject: values.amountPerProject,
        totalAmount: values.totalAmount,
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

  const selectedClient = clients.find(c => c.id === form.getFieldValue('clientId'))
  const currentProject = projects.find(p => p.id === form.getFieldValue('projectId')) || selectedProject
  const totalAmount = form.getFieldValue('totalAmount') || 0

  const getInheritedData = (): Record<string, any> => {
    if (!selectedProject) return {}
    
    return {
      'Project Budget': {
        value: selectedProject.estimatedBudget,
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
        value: selectedProject.type,
        editable: false,
        confidence: 100,
        source: 'project',
      },
    }
  }

  const heroCard = (
    <EntityHeroCard
      title="Create New Quotation"
      subtitle="Generate professional quotations with intelligent project data inheritance"
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
                label: 'Valid Days',
                value: form.getFieldValue('validUntil') ? 
                  form.getFieldValue('validUntil').diff(dayjs(), 'day') : 30,
                format: 'duration',
                icon: <CalendarOutlined />,
                color: '#722ed1',
              },
            ]}
            layout="vertical"
            size="small"
          />

          {/* Inheritance Indicator */}
          {selectedProject && (
            <InheritanceIndicator
              source="project"
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
          mode="live"
          data={previewData}
          template="quotation"
          showPdf={false}
          allowDownload={false}
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
      >
        {/* Smart Context Detection */}
        {(prefilledProjectId || prefilledClientId || templateId) && (
          <Alert
            style={{ marginBottom: '24px' }}
            message="Smart Context Detected"
            description={
              prefilledProjectId ? `Creating quotation from project: ${selectedProject?.description}` :
              prefilledClientId ? `Creating quotation for client: ${selectedClient?.name}` :
              templateId ? `Using template: ${templateId}` :
              'Form pre-filled with context data'
            }
            type="info"
            showIcon
            closable
          />
        )}

        {/* Project & Client Selection */}
        <ProgressiveSection
          title="Project & Client Selection"
          subtitle="Select the project and client for this quotation"
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
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

          {/* Project Context Display */}
          {currentProject && (
            <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f6ffed' }}>
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Project Type:</Text>
                  <div><Text strong>{currentProject.type}</Text></div>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Status:</Text>
                  <div><Text strong>{currentProject.status}</Text></div>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Timeline:</Text>
                  <div>
                    <Text strong>
                      {dayjs(currentProject.startDate).format('DD MMM')} - {dayjs(currentProject.endDate).format('DD MMM')}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </ProgressiveSection>

        {/* Pricing Strategy */}
        <ProgressiveSection
          title="Pricing Strategy"
          subtitle="Set project pricing and quotation amounts"
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
                <BankOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
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
          subtitle="Validity period and terms & conditions"
          icon={<CalendarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="validUntil"
                label="Valid Until"
                rules={[
                  { required: true, message: 'Please select validity date' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value.isAfter(dayjs())) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('Validity date must be in the future'))
                    },
                  }),
                ]}
              >
                <DatePicker
                  size="large"
                  style={{ width: '100%' }}
                  format="DD MMM YYYY"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
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
              onClick={() => navigate('/quotations')}
            >
              Cancel
            </Button>
            <Button 
              type="default" 
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSaveDraft}
              loading={autoSave.isSaving}
            >
              Save as Draft
            </Button>
            <Button 
              type="primary" 
              size="large"
              icon={<SaveOutlined />}
              htmlType="submit"
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