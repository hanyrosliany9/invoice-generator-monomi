import React from 'react'
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
  Switch,
} from 'antd'
import { LockOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  EntityHeroCard,
  OptimizedFormLayout,
  ProgressiveSection,
} from '../components/forms'
import { useMobileOptimized } from '../hooks/useMobileOptimized'
import { usePermissions } from '../hooks/usePermissions'
import { usersService } from '../services/users'
import { useTheme } from '../theme'
import type { CreateUserRequest, UserRole } from '../types/user'

interface UserFormData {
  name: string
  email: string
  password: string
  role: UserRole
  isActive: boolean
}

export const UserCreatePage: React.FC = () => {
  const [form] = Form.useForm<UserFormData>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { theme } = useTheme()
  const { canManageUsers, getAllRoles } = usePermissions()

  // Mobile optimization
  const mobile = useMobileOptimized()

  // Redirect if not authorized
  if (!canManageUsers()) {
    navigate('/users')
    return null
  }

  // Set default values
  React.useEffect(() => {
    form.setFieldsValue({
      isActive: true,
      role: 'STAFF' as UserRole,
    })
  }, [form])

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: usersService.createUser,
    onSuccess: user => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('User created successfully')
      navigate(`/users`)
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create user')
    },
  })

  const handleSubmit = async (values: UserFormData) => {
    // Validate password strength
    const passwordValidation = usersService.validatePassword(values.password)
    if (!passwordValidation.isValid) {
      message.error(passwordValidation.message)
      return
    }

    const createData: CreateUserRequest = {
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      isActive: values.isActive,
    }

    createUserMutation.mutate(createData)
  }

  const roleOptions = getAllRoles()

  const heroCard = (
    <EntityHeroCard
      title='Create New User'
      subtitle='Add user account with role and permissions'
      icon={<UserOutlined />}
      breadcrumb={['Users', 'Create New']}
      actions={[
        {
          label: 'Cancel',
          type: 'default',
          onClick: () => navigate('/users'),
        },
        {
          label: 'Create User',
          type: 'primary',
          icon: <SaveOutlined />,
          onClick: () => form.submit(),
          loading: createUserMutation.isPending,
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
        autoComplete='off'
        style={{ width: '100%' }}
      >
        {/* Basic Information Section */}
        <ProgressiveSection
          title='Basic Information'
          subtitle='User account details and credentials'
          icon={<UserOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='name'
                label='Full Name'
                rules={[
                  { required: true, message: 'Please enter full name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                ]}
              >
                <Input
                  id='name'
                  placeholder='Enter full name'
                  size='large'
                  prefix={<UserOutlined />}
                />
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
                  placeholder='user@monomi.id'
                  size='large'
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='password'
                label='Password'
                rules={[
                  { required: true, message: 'Please enter password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                ]}
                help='Must contain uppercase, lowercase, and number'
              >
                <Input.Password
                  id='password'
                  placeholder='Enter secure password'
                  size='large'
                  prefix={<LockOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='role'
                label='User Role'
                rules={[{ required: true, message: 'Please select a role' }]}
                help='Determines user permissions and access level'
              >
                <Select
                  id='role'
                  placeholder='Select user role'
                  size='large'
                  options={roleOptions.map(role => ({
                    value: role.value,
                    label: (
                      <div>
                        <div style={{ fontWeight: 500 }}>{role.label}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {role.description}
                        </div>
                      </div>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name='isActive'
                label='Account Status'
                valuePropName='checked'
                help='Active users can log in and access the system'
              >
                <Switch
                  checkedChildren='Active'
                  unCheckedChildren='Inactive'
                  defaultChecked
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Role Information Section */}
        <ProgressiveSection
          title='Role Descriptions'
          subtitle='Understanding user roles and permissions'
          icon={<LockOutlined />}
          defaultOpen={false}
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: '16px' }}>
              <strong>Super Admin:</strong>
              <br />
              Full system access including user management, settings, and all financial operations. Use for owners and IT administrators.
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Finance Manager:</strong>
              <br />
              Can approve quotations, invoices, and financial transactions. Manages accounting operations and reports.
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Accountant:</strong>
              <br />
              Handles accounting operations and reports but cannot approve financial transactions. Suitable for bookkeepers.
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Project Manager:</strong>
              <br />
              Manages projects, clients, and operations. Can create and edit but submits for approval. Cannot approve own submissions.
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Staff:</strong>
              <br />
              Basic user with ability to create drafts and manage own data. Default role for most users.
            </div>
            <div>
              <strong>Viewer:</strong>
              <br />
              Read-only access to view data without editing capabilities. For stakeholders who need visibility only.
            </div>
          </div>
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
            <Button size='large' onClick={() => navigate('/users')}>
              Cancel
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<SaveOutlined />}
              htmlType='submit'
              loading={createUserMutation.isPending}
            >
              Create User
            </Button>
          </Space>
        </Card>
      </Form>
    </OptimizedFormLayout>
  )
}
