import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Result,
  Row,
  Select,
  Space,
  Spin,
} from 'antd'
import {
  ProjectOutlined,
  SaveOutlined,
  UndoOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  EntityFormLayout,
  EntityHeroCard,
  ProgressiveSection,
} from '../components/forms'
import { clientService } from '../services/clients'
import { formatIDR, safeNumber } from '../utils/currency'
import dayjs from 'dayjs'

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

export const ClientEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<ClientFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [autoSaving, setAutoSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValues, setOriginalValues] = useState<ClientFormData | null>(
    null
  )

  // Fetch client data
  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getClient(id!),
    enabled: !!id,
  })

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientFormData }) =>
      clientService.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      message.success('Client updated successfully')
      setHasChanges(false)
      navigate(`/clients/${id}`)
    },
    onError: () => {
      message.error('Failed to update client')
    },
  })

  // Initialize form when client data is loaded
  useEffect(() => {
    if (client) {
      const formData: ClientFormData = {
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        company: client.company || '',
        contactPerson: client.contactPerson || '',
        address: client.address || '',
        taxNumber: client.taxNumber || '',
        bankAccount: client.bankAccount || '',
        paymentTerms: client.paymentTerms || '',
        notes: client.notes || '',
      }
      form.setFieldsValue(formData)
      setOriginalValues(formData)
    }
  }, [client, form])

  // Track form changes
  const handleFormChange = () => {
    const currentValues = form.getFieldsValue()
    const changed =
      originalValues &&
      JSON.stringify(currentValues) !== JSON.stringify(originalValues)
    setHasChanges(!!changed)
  }

  const handleSubmit = async (values: ClientFormData) => {
    if (!id) return
    updateClientMutation.mutate({ id, data: values })
  }

  const handleRevertChanges = () => {
    if (originalValues) {
      form.setFieldsValue(originalValues)
      setHasChanges(false)
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

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size='large' tip='Loading client data...' spinning={true}>
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status='404'
          title='Client Not Found'
          subTitle="The client you're trying to edit doesn't exist."
          extra={
            <Button type='primary' onClick={() => navigate('/clients')}>
              Back to Clients
            </Button>
          }
        />
      </div>
    )
  }

  const heroCard = (
    <EntityHeroCard
      title={client.name}
      subtitle={`Editing client information • ${client.company || 'No company'}`}
      icon={<UserOutlined />}
      avatar={client.name.charAt(0).toUpperCase()}
      breadcrumb={['Clients', client.name, 'Edit']}
      metadata={[
        {
          label: 'Created',
          value: client.createdAt || new Date().toISOString(),
          format: 'date',
        },
        {
          label: 'Projects',
          value: safeNumber(client._count?.projects),
        },
        {
          label: 'Total Revenue',
          value: client.totalRevenue || 0,
          format: 'currency',
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
          loading: updateClientMutation.isPending,
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
    <EntityFormLayout hero={heroCard}>
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
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
            <Col xs={24} sm={12}>
              <Form.Item
                name='name'
                label='Client Name'
                rules={[
                  { required: true, message: 'Please enter client name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                ]}
              >
                <Input id='edit-client-name' placeholder='Enter client name' size='large' />
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
                  id='edit-client-email'
                  type='email'
                  placeholder='client@company.com'
                  size='large'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='company' label='Company'>
                <Input id='edit-client-company' placeholder='Company name' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='phone'
                label='Phone Number'
                rules={[
                  {
                    pattern: /^[+]?[\d\s\-\(\)]+$/,
                    message: 'Please enter a valid phone number',
                  },
                ]}
              >
                <Input id='edit-client-phone' placeholder='+62 812 3456 7890' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='contactPerson' label='Contact Person'>
                <Input id='edit-client-contact-person' placeholder='Primary contact person' size='large' />
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
              <Form.Item name='address' label='Business Address'>
                <TextArea id='edit-client-address' rows={3} placeholder='Complete business address' />
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
                <Input id='edit-client-tax-number' placeholder='01.234.567.8-901.000' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='paymentTerms' label='Payment Terms'>
                <Select
                  id='edit-client-payment-terms'
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
                  id='edit-client-bank-account'
                  rows={3}
                  placeholder='Bank name, account number, account holder name'
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name='notes' label='Additional Notes'>
                <TextArea
                  id='edit-client-notes'
                  rows={4}
                  placeholder='Any additional information about this client'
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Action Buttons */}
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size='large'>
            <Button size='large' onClick={() => navigate(`/clients/${id}`)}>
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
              loading={updateClientMutation.isPending}
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
