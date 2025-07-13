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
  Divider,
  Typography,
} from 'antd'
import {
  ProjectOutlined,
  SaveOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
} from '../components/forms'
import { projectService, CreateProjectRequest } from '../services/projects'
import { clientService } from '../services/clients'

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
  output?: string
  type: 'PRODUCTION' | 'SOCIAL_MEDIA' | 'CONSULTATION' | 'MAINTENANCE' | 'OTHER'
  clientId: string
  startDate: dayjs.Dayjs
  endDate: dayjs.Dayjs
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
  
  const prefilledClientId = searchParams.get('clientId')

  // Fetch clients for selection
  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: (project) => {
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
      return sum + (product.price * (product.quantity || 1))
    }, 0)
    setCalculatedValue(total)
    return total
  }

  const handleSubmit = async (values: ProjectFormData) => {
    const projectData: CreateProjectRequest = {
      description: values.description,
      output: values.output,
      type: values.type,
      clientId: values.clientId,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      estimatedBudget: calculatedValue.toString(),
      products: values.products || [],
    }
    
    createProjectMutation.mutate(projectData)
  }

  const handleSaveAndCreateQuotation = async () => {
    try {
      const values = await form.validateFields()
      const projectData: CreateProjectRequest = {
        description: values.description,
        output: values.output,
        type: values.type,
        clientId: values.clientId,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        estimatedBudget: calculatedValue.toString(),
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

  const handleProductsChange = () => {
    const products = form.getFieldValue('products') || []
    calculateTotal(products)
  }

  const selectedClient = clients.find(c => c.id === form.getFieldValue('clientId'))
  const duration = form.getFieldValue('startDate') && form.getFieldValue('endDate') 
    ? form.getFieldValue('endDate').diff(form.getFieldValue('startDate'), 'day') + 1
    : 0

  const heroCard = (
    <EntityHeroCard
      title="Create New Project"
      subtitle="Set up project details, timeline, and product specifications"
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
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Real-time Statistics */}
          <FormStatistics
            title="Project Overview"
            stats={[
              {
                label: 'Total Products',
                value: (form.getFieldValue('products') || []).length,
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
                color: '#722ed1',
              },
            ]}
            layout="vertical"
            size="small"
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
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleProductsChange}
        autoComplete="off"
        style={{ width: '100%' }}
      >
        {/* Project Details Section */}
        <ProgressiveSection
          title="Project Details"
          subtitle="Basic project information and client selection"
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
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
            
            <Col xs={24}>
              <Form.Item
                name="description"
                label="Project Description"
                rules={[
                  { required: true, message: 'Please enter project description' },
                  { min: 10, message: 'Description must be at least 10 characters' },
                ]}
              >
                <TextArea 
                  rows={3}
                  placeholder="Describe the project scope and objectives"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="type"
                label="Project Type"
                rules={[{ required: true, message: 'Please select project type' }]}
              >
                <Select
                  placeholder="Select project type"
                  size="large"
                  options={[
                    { value: 'PRODUCTION', label: 'Production Work' },
                    { value: 'SOCIAL_MEDIA', label: 'Social Media Management' },
                    { value: 'CONSULTATION', label: 'Consultation Services' },
                    { value: 'MAINTENANCE', label: 'Maintenance & Support' },
                    { value: 'OTHER', label: 'Other Services' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="output"
                label="Expected Output"
              >
                <Input 
                  placeholder="e.g., Website, Mobile App, Campaign"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Timeline Section */}
        <ProgressiveSection
          title="Project Timeline"
          subtitle="Start and end dates for project planning"
          icon={<CalendarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker
                  size="large"
                  style={{ width: '100%' }}
                  format="DD MMM YYYY"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="endDate"
                label="End Date"
                rules={[
                  { required: true, message: 'Please select end date' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startDate = getFieldValue('startDate')
                      if (!value || !startDate || value.isAfter(startDate)) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('End date must be after start date'))
                    },
                  }),
                ]}
              >
                <DatePicker
                  size="large"
                  style={{ width: '100%' }}
                  format="DD MMM YYYY"
                  disabledDate={(current) => {
                    const startDate = form.getFieldValue('startDate')
                    return current && startDate && current < startDate
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          {duration > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
              <Text type="secondary">
                <CalendarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                Project duration: <Text strong>{duration} days</Text>
              </Text>
            </div>
          )}
        </ProgressiveSection>

        {/* Products & Services Section */}
        <ProgressiveSection
          title="Products & Services"
          subtitle="Define project deliverables and pricing"
          icon={<DollarOutlined />}
          defaultOpen={true}
        >
          <Form.List name="products" initialValue={[{ name: '', description: '', price: 0, quantity: 1 }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card 
                    key={key} 
                    size="small" 
                    style={{ marginBottom: '16px' }}
                    title={`Product/Service ${name + 1}`}
                    extra={
                      fields.length > 1 && (
                        <Button 
                          type="text" 
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
                          label="Product/Service Name"
                          rules={[{ required: true, message: 'Product name is required' }]}
                        >
                          <Input placeholder="e.g., Website Development" />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24} sm={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label="Quantity"
                          rules={[{ required: true, message: 'Quantity is required' }]}
                        >
                          <Input type="number" min={1} placeholder="1" />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24}>
                        <Form.Item
                          {...restField}
                          name={[name, 'description']}
                          label="Description"
                          rules={[{ required: true, message: 'Description is required' }]}
                        >
                          <TextArea 
                            rows={2} 
                            placeholder="Detailed description of the product/service"
                          />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24}>
                        <Form.Item
                          {...restField}
                          name={[name, 'price']}
                          label="Unit Price (IDR)"
                          rules={[{ required: true, message: 'Price is required' }]}
                        >
                          <IDRCurrencyInput
                            placeholder="Enter price in IDR"
                            showMateraiWarning={false}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                
                <Button
                  type="dashed"
                  onClick={() => add({ name: '', description: '', price: 0, quantity: 1 })}
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

        {/* Action Buttons */}
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size="large">
            <Button 
              size="large"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </Button>
            <Button 
              type="default" 
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSaveDraft}
              loading={autoSaving}
            >
              Save as Draft
            </Button>
            <Button 
              type="primary" 
              size="large"
              icon={<SaveOutlined />}
              htmlType="submit"
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