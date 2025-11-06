import React, { useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
} from 'antd'
import { ProjectOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  EntityHeroCard,
  OptimizedFormLayout,
  ProgressiveSection,
} from '../components/forms'
import { useOptimizedAutoSave } from '../hooks/useOptimizedAutoSave'
import { useMobileOptimized } from '../hooks/useMobileOptimized'
import { clientService } from '../services/clients'
import { useTheme } from '../theme'

const { TextArea } = Input

interface ClientFormData {
  name: string
  email: string
  phone?: string
  company?: string
  contactPerson?: string
  address?: string
  taxNumber?: string
  bankAccount?: string
  paymentTerms?: string
  notes?: string
}

export const ClientCreatePage: React.FC = () => {
  const [form] = Form.useForm<ClientFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
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
        console.log('Auto-saving client draft:', data)
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    },
    onError: error => {
      console.error('Client auto-save failed:', error)
    },
    enabled: true,
  })

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: client => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      message.success('Client created successfully')
      navigate(`/clients/${client.id}`)
    },
    onError: () => {
      message.error('Failed to create client')
    },
  })

  const handleSubmit = async (values: ClientFormData) => {
    // Wait for pending auto-save before submitting
    if (autoSave.isSaving) {
      await autoSave.forceSave(values)
    }
    createClientMutation.mutate(values)
  }

  const handleSaveAndCreateProject = async () => {
    try {
      const values = await form.validateFields()

      // Wait for pending auto-save before creating client
      if (autoSave.isSaving) {
        await autoSave.forceSave(values)
      }

      const client = await clientService.createClient(values)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      message.success('Client created successfully')
      navigate(`/projects/new?clientId=${client.id}`)
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

  const heroCard = (
    <EntityHeroCard
      title='Create New Client'
      subtitle='Add client information and business details'
      icon={<UserOutlined />}
      breadcrumb={['Clients', 'Create New']}
      actions={[
        {
          label: 'Save as Draft',
          type: 'default',
          icon: <SaveOutlined />,
          onClick: handleSaveDraft,
          loading: autoSave.isSaving,
        },
        {
          label: 'Save & Create Project',
          type: 'primary',
          icon: <ProjectOutlined />,
          onClick: handleSaveAndCreateProject,
          loading: createClientMutation.isPending,
        },
      ]}
    />
  )

  return (
    <OptimizedFormLayout hero={heroCard}>
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        onValuesChange={() => {
          const values = form.getFieldsValue()
          if (values.name && values.email) {
            autoSave.triggerAutoSave(values)
          }
        }}
        autoComplete='off'
        style={{ width: '100%' }}
      >
        {/* Basic Information Section */}
        <ProgressiveSection
          title='Basic Information'
          subtitle='Essential client details and contact information'
          icon={<UserOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='name'
                label='Client Name'
                rules={[
                  { required: true, message: 'Please enter client name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                ]}
              >
                <Input id='name' placeholder='Enter client name' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='email'
                label='Email Address'
                rules={[
                  { required: true, message: 'Please enter email address' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  id='email'
                  type='email'
                  placeholder='client@company.com'
                  size='large'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='company'
                label='Company'
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input placeholder='Company name' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='phone'
                label='Phone Number'
                rules={[
                  { required: true, message: 'Please enter phone number' },
                  {
                    pattern: /^[+]?[\d\s\-\(\)]+$/,
                    message: 'Please enter a valid phone number',
                  },
                ]}
              >
                <Input placeholder='+62 812 3456 7890' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='contactPerson'
                label='Contact Person'
                rules={[{ required: true, message: 'Please enter contact person' }]}
              >
                <Input placeholder='Primary contact person' size='large' />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Business Details Section */}
        <ProgressiveSection
          title='Business Details'
          subtitle='Tax information and business address'
          icon={<UserOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='address'
                label='Business Address'
                rules={[{ required: true, message: 'Please enter business address' }]}
              >
                <TextArea rows={3} placeholder='Complete business address' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='taxNumber'
                label='Tax Number (NPWP)'
                rules={[
                  {
                    pattern: /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/,
                    message:
                      'Please enter valid NPWP format (XX.XXX.XXX.X-XXX.XXX)',
                  },
                ]}
              >
                <Input placeholder='01.234.567.8-901.000' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='paymentTerms'
                label='Payment Terms'
                rules={[{ required: true, message: 'Please select payment terms' }]}
              >
                <Select
                  placeholder='Select payment terms'
                  size='large'
                  options={[
                    { value: 'Net 7', label: 'Net 7 days' },
                    { value: 'Net 14', label: 'Net 14 days' },
                    { value: 'Net 30', label: 'Net 30 days' },
                    { value: 'Net 60', label: 'Net 60 days' },
                    { value: 'Cash on Delivery', label: 'Cash on Delivery' },
                    { value: 'Advance Payment', label: 'Advance Payment' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Banking Information Section */}
        <ProgressiveSection
          title='Banking Information'
          subtitle='Payment details and bank account'
          icon={<UserOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item name='bankAccount' label='Bank Account Details'>
                <TextArea
                  rows={3}
                  placeholder='Bank name, account number, account holder name'
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name='notes' label='Additional Notes'>
                <TextArea
                  rows={4}
                  placeholder='Any additional information about this client'
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
            <Button size='large' onClick={() => navigate('/clients')}>
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
              loading={createClientMutation.isPending}
            >
              Create Client
            </Button>
          </Space>
        </Card>
      </Form>
    </OptimizedFormLayout>
  )
}
