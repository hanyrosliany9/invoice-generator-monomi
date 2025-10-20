import React, { useEffect, useState } from 'react'
import {
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
  CalendarOutlined,
  DeleteOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  ProjectOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  EntityFormLayout,
  EntityHeroCard,
  FormStatistics,
  IDRCurrencyInput,
  MateraiCompliancePanel,
  ProgressiveSection,
} from '../components/forms'
import { CreateProjectRequest, projectService, ProjectType as ProjectTypeFromService } from '../services/projects'
import { clientService } from '../services/clients'
import { ProjectType, projectTypesApi } from '../services/project-types'
import { useTheme } from '../theme'

const { TextArea } = Input
const { Title, Text } = Typography

interface ProductItem {
  name: string
  description: string
  price: number
  quantity: number
}

interface ProjectFormData {
  description: string
  scopeOfWork?: string
  output?: string
  projectTypeId: string  // Changed from 'type' to use actual database ID
  clientId: string
  startDate?: dayjs.Dayjs
  endDate?: dayjs.Dayjs
  products: ProductItem[]
}

export const ProjectCreatePage: React.FC = () => {
  const [form] = Form.useForm<ProjectFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [autoSaving, setAutoSaving] = useState(false)
  const [calculatedValue, setCalculatedValue] = useState(0)
  const { message } = App.useApp()
  const { theme } = useTheme()

  const prefilledClientId = searchParams.get('clientId')

  // Fetch clients for selection
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Fetch project types for selection
  const { data: projectTypes = [], isLoading: projectTypesLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectTypesApi.getAll,
  })

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: project => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Project created successfully')
      navigate(`/projects/${project.id}`)
    },
    onError: () => {
      message.error('Failed to create project')
    },
  })

  // Pre-fill client if provided in URL
  useEffect(() => {
    if (prefilledClientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === prefilledClientId)
      if (selectedClient) {
        form.setFieldsValue({ clientId: prefilledClientId })
      }
    }
  }, [prefilledClientId, clients, form])

  // Calculate total value when products change
  const calculateTotal = (products: ProductItem[]) => {
    const total = products.reduce((sum, product) => {
      return sum + product.price * (product.quantity || 1)
    }, 0)
    setCalculatedValue(total)
    return total
  }

  const handleSubmit = async (values: ProjectFormData) => {
    const projectData: CreateProjectRequest = {
      description: values.description,
      scopeOfWork: values.scopeOfWork,
      output: values.output,
      projectTypeId: values.projectTypeId,  // Use ID directly from form
      clientId: values.clientId,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      estimatedBudget: calculatedValue,
      products: values.products || [],
    }

    createProjectMutation.mutate(projectData)
  }

  const handleSaveAndCreateQuotation = async () => {
    try {
      const values = await form.validateFields()
      const projectData: CreateProjectRequest = {
        description: values.description,
        scopeOfWork: values.scopeOfWork,
        output: values.output,
        projectTypeId: values.projectTypeId,  // Use ID directly from form
        clientId: values.clientId,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        estimatedBudget: calculatedValue,
        products: values.products || [],
      }

      const project = await projectService.createProject(projectData)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Project created successfully')
      navigate(`/quotations/new?projectId=${project.id}`)
    } catch (error) {
      message.error('Please complete required fields')
    }
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

  // Use Form.useWatch for reactive form values (better pattern than onValuesChange)
  const clientId = Form.useWatch('clientId', form)
  const startDate = Form.useWatch('startDate', form)
  const endDate = Form.useWatch('endDate', form)
  const products = Form.useWatch('products', form)

  const selectedClient = clients.find(c => c.id === clientId)
  const duration =
    startDate && endDate
      ? endDate.diff(startDate, 'day') + 1
      : 0

  // Recalculate total when products change
  useEffect(() => {
    if (products) {
      calculateTotal(products)
    }
  }, [products])

  const heroCard = (
    <EntityHeroCard
      title='Create New Project'
      subtitle='Set up project details, timeline, and product specifications'
      icon={<ProjectOutlined />}
      breadcrumb={['Projects', 'Create New']}
      actions={[
        {
          label: 'Save as Draft',
          type: 'default',
          icon: <SaveOutlined />,
          onClick: handleSaveDraft,
          loading: autoSaving,
        },
        {
          label: 'Save & Create Quotation',
          type: 'primary',
          icon: <FileTextOutlined />,
          onClick: handleSaveAndCreateQuotation,
          loading: createProjectMutation.isPending,
        },
      ]}
    />
  )

  return (
    <EntityFormLayout
      hero={heroCard}
      sidebar={
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          {/* Real-time Statistics */}
          <FormStatistics
            title='Project Overview'
            stats={[
              {
                label: 'Total Products',
                value: (products || []).length,
                icon: <ProjectOutlined />,
                color: theme.colors.accent.primary,
              },
              {
                label: 'Estimated Value',
                value: calculatedValue,
                format: 'currency',
                icon: <DollarOutlined />,
                color: theme.colors.status.success,
              },
              {
                label: 'Duration',
                value: duration || 0,
                format: 'duration',
                icon: <CalendarOutlined />,
                color: theme.colors.accent.primary,
              },
            ]}
            layout='vertical'
            size='small'
          />

          {/* Materai Compliance */}
          {calculatedValue > 0 && (
            <MateraiCompliancePanel
              totalAmount={calculatedValue}
              showCalculation={true}
            />
          )}
        </Space>
      }
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        autoComplete='off'
        style={{ width: '100%' }}
      >
        {/* Project Details Section */}
        <ProgressiveSection
          title='Project Details'
          subtitle='Basic project information and client selection'
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='clientId'
                label='Client'
                rules={[{ required: true, message: 'Please select a client' }]}
              >
                <Select
                  id='clientId'
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

            <Col xs={24}>
              <Form.Item
                name='description'
                label='Project Description'
                rules={[
                  {
                    required: true,
                    message: 'Please enter project description',
                  },
                  {
                    min: 10,
                    message: 'Description must be at least 10 characters',
                  },
                ]}
              >
                <TextArea
                  id='description'
                  rows={3}
                  placeholder='Describe the project scope and objectives'
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='projectTypeId'
                label='Project Type'
                rules={[
                  { required: true, message: 'Please select project type' },
                ]}
              >
                <Select
                  id='projectTypeId'
                  placeholder='Select project type'
                  size='large'
                  loading={projectTypesLoading}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={projectTypes
                    .filter((pt: ProjectType) => pt.isActive)
                    .sort((a: ProjectType, b: ProjectType) => a.sortOrder - b.sortOrder)
                    .map((pt: ProjectType) => ({
                      value: pt.id,
                      label: pt.name,
                    }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name='output' label='Expected Output'>
                <Input
                  id='output'
                  placeholder='e.g., Website, Mobile App, Campaign'
                  size='large'
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Timeline Section */}
        <ProgressiveSection
          title='Project Timeline'
          subtitle='Start and end dates for project planning'
          icon={<CalendarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='startDate'
                label='Start Date'
                rules={[
                  { required: true, message: 'Please select start date' },
                ]}
              >
                <DatePicker
                  id='startDate'
                  size='large'
                  style={{ width: '100%' }}
                  format='DD MMM YYYY'
                  disabledDate={current =>
                    current && current < dayjs().startOf('day')
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='endDate'
                label='End Date'
                rules={[
                  { required: true, message: 'Please select end date' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startDate = getFieldValue('startDate')
                      if (!value || !startDate || value.isAfter(startDate)) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('End date must be after start date')
                      )
                    },
                  }),
                ]}
              >
                <DatePicker
                  id='endDate'
                  size='large'
                  style={{ width: '100%' }}
                  format='DD MMM YYYY'
                  disabledDate={current => {
                    return !!(current && startDate && current < startDate)
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {duration > 0 && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: theme.colors.glass.background,
                backdropFilter: theme.colors.glass.backdropFilter,
                border: theme.colors.glass.border,
                borderRadius: '6px',
                boxShadow: theme.colors.glass.shadow,
              }}
            >
              <Text type='secondary'>
                <CalendarOutlined
                  style={{ marginRight: '8px', color: theme.colors.status.success }}
                />
                Project duration: <Text strong>{duration} days</Text>
              </Text>
            </div>
          )}
        </ProgressiveSection>

        {/* Products & Services Section */}
        <ProgressiveSection
          title='Products & Services'
          subtitle='Define project deliverables and pricing'
          icon={<DollarOutlined />}
          defaultOpen={true}
        >
          <Form.List
            name='products'
            initialValue={[
              { name: '', description: '', price: 0, quantity: 1 },
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size='small'
                    style={{
                      marginBottom: '16px',
                      background: theme.colors.card.background,
                      border: theme.colors.card.border,
                    }}
                    title={`Product/Service ${name + 1}`}
                    extra={
                      fields.length > 1 && (
                        <Button
                          type='text'
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      )
                    }
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label='Product/Service Name'
                          rules={[
                            {
                              required: true,
                              message: 'Product name is required',
                            },
                          ]}
                        >
                          <Input 
                            id={`product-name-${name}`}
                            placeholder='e.g., Website Development' 
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label='Quantity'
                          rules={[
                            { required: true, message: 'Quantity is required' },
                          ]}
                        >
                          <Input 
                            id={`product-quantity-${name}`}
                            type='number' 
                            min={1} 
                            placeholder='1' 
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item
                          {...restField}
                          name={[name, 'description']}
                          label='Description'
                          rules={[
                            {
                              required: true,
                              message: 'Description is required',
                            },
                          ]}
                        >
                          <TextArea
                            id={`product-description-${name}`}
                            rows={2}
                            placeholder='Detailed description of the product/service'
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item
                          {...restField}
                          name={[name, 'price']}
                          label='Unit Price (IDR)'
                          rules={[
                            { required: true, message: 'Price is required' },
                          ]}
                        >
                          <IDRCurrencyInput
                            id={`product-price-${name}`}
                            placeholder='Enter price in IDR'
                            showMateraiWarning={false}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type='dashed'
                  onClick={() =>
                    add({ name: '', description: '', price: 0, quantity: 1 })
                  }
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: '16px' }}
                >
                  Add Product/Service
                </Button>
              </>
            )}
          </Form.List>
        </ProgressiveSection>

        {/* Scope of Work Section */}
        <ProgressiveSection
          title='Scope of Work'
          subtitle='Narrative description of work scope, timeline, and deliverables'
          icon={<FileTextOutlined />}
          defaultOpen={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='scopeOfWork'
                label='Scope of Work Description'
                help='Describe the complete scope: tasks, timeline, deliverables, revisions, etc.'
              >
                <TextArea
                  id='scopeOfWork'
                  rows={6}
                  placeholder={`Example:\nProject ini meliputi:\n1. Pembuatan konsep kreatif\n2. Produksi video 30 detik\n3. Editing dan color grading\n4. Revisi hingga 3 kali\n\nTimeline: 2 minggu\nDeliverables: Video final format MP4 1080p`}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>
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
            <Button size='large' onClick={() => navigate('/projects')}>
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
              loading={createProjectMutation.isPending}
            >
              Create Project
            </Button>
          </Space>
        </Card>
      </Form>
    </EntityFormLayout>
  )
}
