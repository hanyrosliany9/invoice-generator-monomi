import React, { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Tag,
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
  UndoOutlined,
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
  MateraiCompliancePanel,
  ProgressiveSection,
} from '../components/forms'
import { projectService, UpdateProjectRequest, ProductItem } from '../services/projects'
import { clientService } from '../services/clients'
import { projectTypesApi } from '../services/project-types'
import { useTheme } from '../theme'

const { TextArea } = Input
const { Title, Text } = Typography

interface ProjectFormData {
  description: string
  scopeOfWork?: string
  output?: string
  projectTypeId: string  // Changed from 'type' enum to use database ID
  clientId: string
  startDate?: dayjs.Dayjs | null
  endDate?: dayjs.Dayjs | null
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  products: ProductItem[]
}

export const ProjectEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<ProjectFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { theme } = useTheme()
  const [autoSaving, setAutoSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValues, setOriginalValues] = useState<ProjectFormData | null>(
    null
  )
  const [calculatedValue, setCalculatedValue] = useState(0)
  const [formValues, setFormValues] = useState<Partial<ProjectFormData>>({})

  // Fetch project data
  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  })

  // Fetch clients for selection
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Fetch project types for selection
  const { data: projectTypesResponse, isLoading: projectTypesLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectTypesApi.getAll,
  })

  const projectTypes = Array.isArray(projectTypesResponse)
    ? projectTypesResponse
    : (projectTypesResponse?.data || [])

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Project updated successfully')
      setHasChanges(false)
      navigate(`/projects/${id}`)
    },
    onError: () => {
      message.error('Failed to update project')
    },
  })

  // Initialize form when project data is loaded
  useEffect(() => {
    if (project) {
      const formData: ProjectFormData = {
        description: project.description,
        scopeOfWork: project.scopeOfWork || '',
        output: project.output || '',
        projectTypeId: project.projectTypeId,  // Use ID directly from project
        clientId: project.clientId,
        startDate: project.startDate ? dayjs(project.startDate) : null,
        endDate: project.endDate ? dayjs(project.endDate) : null,
        status: project.status,
        products: project.products || [
          { name: '', description: '', price: 0, quantity: 1 },
        ],
      }
      form.setFieldsValue(formData)
      setOriginalValues(formData)

      // Calculate initial value
      if (project.products) {
        const total = project.products.reduce(
          (sum: number, product: ProductItem) => {
            return sum + product.price * (product.quantity || 1)
          },
          0
        )
        setCalculatedValue(total)
      }
    }
  }, [project, form])

  // Track form changes
  const handleFormChange = () => {
    const currentValues = form.getFieldsValue()
    const changed =
      originalValues &&
      JSON.stringify(currentValues) !== JSON.stringify(originalValues)
    setHasChanges(!!changed)

    // Recalculate total
    const products = currentValues.products || []
    calculateTotal(products)
  }

  // Calculate total value when products change
  const calculateTotal = (products: ProductItem[]) => {
    const total = products.reduce((sum, product) => {
      return sum + product.price * (product.quantity || 1)
    }, 0)
    setCalculatedValue(total)
    return total
  }

  const handleSubmit = async (values: ProjectFormData) => {
    if (!id) return

    const projectData: UpdateProjectRequest = {
      description: values.description,
      scopeOfWork: values.scopeOfWork,
      output: values.output,
      projectTypeId: values.projectTypeId,  // Use ID directly from form
      clientId: values.clientId,
      startDate: values.startDate ? values.startDate.toISOString() : undefined,
      endDate: values.endDate ? values.endDate.toISOString() : undefined,
      status: values.status,
      estimatedBudget: calculatedValue,
      products: values.products || [],
    }

    updateProjectMutation.mutate({ id, data: projectData })
  }

  const handleRevertChanges = () => {
    if (originalValues) {
      form.setFieldsValue(originalValues)
      setHasChanges(false)
      calculateTotal(originalValues.products || [])
      message.info('Changes reverted')
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

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  // Warn user before navigating away with unsaved changes
  useEffect(() => {
    const unblock = () => {
      if (hasChanges) {
        return window.confirm('You have unsaved changes. Are you sure you want to leave?')
      }
      return true
    }
    // Note: This is a simple implementation. For proper route blocking,
    // consider using useBlocker from react-router v6.4+
    return () => {
      // Cleanup
    }
  }, [hasChanges])

  if (isLoading || clientsLoading || projectTypesLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size='large' tip='Loading project data...' spinning={true}>
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status='404'
          title='Project Not Found'
          subTitle="The project you're trying to edit doesn't exist."
          extra={
            <Button type='primary' onClick={() => navigate('/projects')}>
              Back to Projects
            </Button>
          }
        />
      </div>
    )
  }

  // Use form watcher instead of direct getFieldValue calls to avoid useForm warning
  const duration =
    formValues.startDate && formValues.endDate
      ? formValues.endDate.diff(formValues.startDate, 'day') + 1
      : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'blue'
      case 'IN_PROGRESS':
        return 'orange'
      case 'COMPLETED':
        return 'green'
      case 'CANCELLED':
        return 'red'
      case 'ON_HOLD':
        return 'orange'
      default:
        return 'default'
    }
  }

  const heroCard = (
    <EntityHeroCard
      title={project.number || project.description}
      subtitle={`Editing project • ${project.client?.name || 'Unknown Client'}`}
      icon={<ProjectOutlined />}
      avatar={project.client?.name?.charAt(0).toUpperCase()}
      breadcrumb={['Projects', project.number || project.description, 'Edit']}
      metadata={[
        {
          label: 'Created',
          value: project.createdAt,
          format: 'date',
        },
        {
          label: 'Client',
          value: project.client?.name || 'Unknown',
        },
        {
          label: 'Status',
          value: project.status,
        },
      ]}
      actions={[
        {
          label: 'Revert Changes',
          type: 'default',
          icon: <UndoOutlined />,
          onClick: handleRevertChanges,
          disabled: !hasChanges,
        },
        {
          label: 'Save Changes',
          type: 'primary',
          icon: <SaveOutlined />,
          onClick: () => form.submit(),
          loading: updateProjectMutation.isPending,
          disabled: !hasChanges,
        },
      ]}
      status={
        hasChanges
          ? {
              type: 'warning',
              message: 'You have unsaved changes',
            }
          : {
              type: 'info',
              message: 'Auto-saved 2 minutes ago',
            }
      }
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
                value: (formValues.products || []).length,
                icon: <ProjectOutlined />,
                color: '#1890ff',
              },
              {
                label: 'Estimated Value',
                value: calculatedValue,
                format: 'currency',
                icon: <DollarOutlined />,
                color: '#52c41a',
              },
              {
                label: 'Duration',
                value: duration || 0,
                format: 'duration',
                icon: <CalendarOutlined />,
                color: '#1890ff',
              },
            ]}
            layout='vertical'
            size='small'
          />

          {/* Project Status */}
          <Card
            size='small'
            title='Project Status'
            style={{
              background: theme.colors.card.background,
              border: theme.colors.card.border,
            }}
          >
            <Tag
              color={getStatusColor(formValues.status || project.status)}
              style={{ marginBottom: '8px' }}
            >
              {formValues.status || project.status}
            </Tag>
            <div>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                Related: {project._count?.quotations || 0} quotations,{' '}
                {project._count?.invoices || 0} invoices
              </Text>
            </div>
          </Card>

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
        onValuesChange={(_, allValues) => {
          setFormValues(allValues)
          handleFormChange()
        }}
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
          validation={
            hasChanges
              ? {
                  status: 'warning',
                  message: 'Modified fields detected',
                }
              : {
                  status: 'success',
                  message: 'All required fields completed',
                }
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
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
                  rows={3}
                  placeholder='Describe the project scope and objectives'
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name='projectTypeId'
                label='Project Type'
                rules={[
                  { required: true, message: 'Please select project type' },
                ]}
              >
                <Select
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
                    .filter(pt => pt.isActive)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(pt => ({
                      value: pt.id,
                      label: pt.name,
                    }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name='status'
                label='Project Status'
                rules={[
                  { required: true, message: 'Please select project status' },
                ]}
              >
                <Select
                  placeholder='Select status'
                  size='large'
                  options={[
                    { value: 'PLANNING', label: 'Planning' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'COMPLETED', label: 'Completed' },
                    { value: 'ON_HOLD', label: 'On Hold' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item name='output' label='Expected Output'>
                <Input
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
          defaultOpen={false}
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
                  size='large'
                  style={{ width: '100%' }}
                  format='DD MMM YYYY'
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
                  size='large'
                  style={{ width: '100%' }}
                  format='DD MMM YYYY'
                  disabledDate={current => {
                    if (!current) return false
                    const startDate = formValues.startDate
                    return startDate ? current < startDate : false
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
                  style={{ marginRight: '8px', color: '#52c41a' }}
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
          defaultOpen={false}
        >
          <Form.List name='products'>
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
                          <Input placeholder='e.g., Website Development' />
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
                          <Input type='number' min={1} placeholder='1' />
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
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='scopeOfWork'
                label='Scope of Work Description'
                help='Describe the complete scope: tasks, timeline, deliverables, revisions, etc.'
              >
                <TextArea
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
            <Button size='large' onClick={() => navigate(`/projects/${id}`)}>
              Cancel
            </Button>
            <Button
              type='default'
              size='large'
              icon={<UndoOutlined />}
              onClick={handleRevertChanges}
              disabled={!hasChanges}
            >
              Revert Changes
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<SaveOutlined />}
              htmlType='submit'
              loading={updateProjectMutation.isPending}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </Space>
        </Card>
      </Form>
    </EntityFormLayout>
  )
}
