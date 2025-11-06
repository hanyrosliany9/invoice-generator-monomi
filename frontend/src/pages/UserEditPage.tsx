import React, { useEffect, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Switch,
} from 'antd'
import {
  LockOutlined,
  SaveOutlined,
  UndoOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  EntityFormLayout,
  EntityHeroCard,
  ProgressiveSection,
} from '../components/forms'
import { usersService } from '../services/users'
import { usePermissions } from '../hooks/usePermissions'
import { useTheme } from '../theme'
import type { UpdateUserRequest, UserRole } from '../types/user'
import { formatDate } from '../utils/dateFormatters'

interface UserFormData {
  name: string
  email: string
  password?: string
  role: UserRole
  isActive: boolean
}

export const UserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<UserFormData>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { theme } = useTheme()
  const { canManageUsers, getAllRoles, getRoleDisplayName } = usePermissions()
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValues, setOriginalValues] = useState<UserFormData | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Redirect if not authorized
  if (!canManageUsers()) {
    navigate('/users')
    return null
  }

  // Fetch user data
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      try {
        return await usersService.getUserById(id!)
      } catch (err) {
        console.error('Error fetching user:', err)
        throw err
      }
    },
    enabled: !!id,
    retry: 1,
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('User updated successfully')
      setHasChanges(false)
      setIsChangingPassword(false)
      navigate('/users')
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update user')
    },
  })

  // Initialize form when user data is loaded
  useEffect(() => {
    if (user && user.id) {
      const formData: UserFormData = {
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'STAFF',
        isActive: user.isActive ?? true, // Default to true if undefined
      }
      // Use setTimeout to ensure form is mounted before setting values
      const timeoutId = setTimeout(() => {
        form.setFieldsValue(formData)
        setOriginalValues(formData)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [user, form])

  // Track form changes
  const handleFormChange = () => {
    const currentValues = form.getFieldsValue()
    const changed =
      originalValues &&
      (currentValues.name !== originalValues.name ||
        currentValues.email !== originalValues.email ||
        currentValues.role !== originalValues.role ||
        currentValues.isActive !== originalValues.isActive ||
        (isChangingPassword && currentValues.password))
    setHasChanges(!!changed)
  }

  const handleSubmit = async (values: UserFormData) => {
    if (!id) return

    const updateData: UpdateUserRequest = {
      name: values.name,
      email: values.email,
      role: values.role,
      isActive: values.isActive,
    }

    // Only include password if changing
    if (isChangingPassword && values.password) {
      // Validate password strength
      const passwordValidation = usersService.validatePassword(values.password)
      if (!passwordValidation.isValid) {
        message.error(passwordValidation.message)
        return
      }
      updateData.password = values.password
    }

    updateUserMutation.mutate({ id, data: updateData })
  }

  const handleRevertChanges = () => {
    if (originalValues) {
      form.setFieldsValue(originalValues)
      form.setFieldValue('password', undefined)
      setIsChangingPassword(false)
      setHasChanges(false)
      message.info('Changes reverted')
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size='large' tip='Loading user data...' spinning={true}>
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  if (error || !user) {
    console.error('User fetch error:', { error, user, id })
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status='404'
          title='User Not Found'
          subTitle={error?.message || "The user you're trying to edit doesn't exist."}
          extra={
            <Button type='primary' onClick={() => navigate('/users')}>
              Back to Users
            </Button>
          }
        />
      </div>
    )
  }

  // Validate critical user data - check that user object has required fields
  // Log detailed info about what we're receiving
  if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
    console.warn('Invalid user data - empty or null user object:', { user })
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status='error'
          title='Invalid User Data'
          subTitle='The user data is incomplete or corrupted. Please try again.'
          extra={
            <Button type='primary' onClick={() => navigate('/users')}>
              Back to Users
            </Button>
          }
        />
      </div>
    )
  }

  // Debug: Log all keys in the user object to understand API response structure
  console.log('User object keys:', Object.keys(user), 'User data:', user)

  const roleOptions = getAllRoles()
  const roleChanged = originalValues && form.getFieldValue('role') !== originalValues.role

  const heroCard = (
    <EntityHeroCard
      title={user.name}
      subtitle={`Editing user account • ${getRoleDisplayName(user.role)}`}
      icon={<UserOutlined />}
      avatar={user.name?.charAt(0)?.toUpperCase() || '?'}
      breadcrumb={['Users', user.name, 'Edit']}
      metadata={[
        {
          label: 'Email',
          value: user.email || 'N/A',
        },
        {
          label: 'Role',
          value: user.role ? getRoleDisplayName(user.role) : 'N/A',
        },
        {
          label: 'Status',
          value: user.isActive !== undefined ? (user.isActive ? 'Active' : 'Inactive') : 'N/A',
        },
        {
          label: 'Created',
          value: user.createdAt || 'N/A',
          format: 'date',
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
          loading: updateUserMutation.isPending,
          disabled: !hasChanges,
        },
      ]}
      status={
        hasChanges
          ? {
              type: 'warning',
              message: 'You have unsaved changes',
            }
          : undefined
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
          subtitle='User account details and contact information'
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
                label='Full Name'
                rules={[
                  { required: true, message: 'Please enter full name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                ]}
              >
                <Input
                  id='edit-user-name'
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
                  id='edit-user-email'
                  type='email'
                  placeholder='user@monomi.id'
                  size='large'
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name='isActive'
                label='Account Status'
                valuePropName='checked'
                help='Inactive users cannot log in to the system'
              >
                <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Role & Permissions Section */}
        <ProgressiveSection
          title='Role & Permissions'
          subtitle='User role determines access level and permissions'
          icon={<LockOutlined />}
          defaultOpen={true}
          required={true}
        >
          {roleChanged && (
            <Alert
              message='Role Change Warning'
              description='Changing a user role will immediately affect their permissions and access level. The user may need to log out and back in for changes to take full effect.'
              type='warning'
              icon={<WarningOutlined />}
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='role'
                label='User Role'
                rules={[{ required: true, message: 'Please select a role' }]}
                help='Determines user permissions and access level'
              >
                <Select
                  id='edit-user-role'
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
          </Row>
        </ProgressiveSection>

        {/* Password Change Section */}
        <ProgressiveSection
          title='Change Password'
          subtitle='Update user password (optional)'
          icon={<LockOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div>
                  <Button
                    type={isChangingPassword ? 'default' : 'dashed'}
                    onClick={() => {
                      setIsChangingPassword(!isChangingPassword)
                      if (!isChangingPassword) {
                        form.setFieldValue('password', undefined)
                      }
                    }}
                  >
                    {isChangingPassword
                      ? 'Cancel Password Change'
                      : 'Change Password'}
                  </Button>
                </div>

                {isChangingPassword && (
                  <>
                    <Alert
                      message='Password Change'
                      description='User will need to use the new password on their next login.'
                      type='info'
                      showIcon
                    />
                    <Form.Item
                      name='password'
                      label='New Password'
                      rules={
                        isChangingPassword
                          ? [
                              {
                                required: true,
                                message: 'Please enter new password',
                              },
                              {
                                min: 8,
                                message: 'Password must be at least 8 characters',
                              },
                            ]
                          : []
                      }
                      help='Must contain uppercase, lowercase, and number'
                    >
                      <Input.Password
                        id='edit-user-password'
                        placeholder='Enter new password'
                        size='large'
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>
                  </>
                )}
              </Space>
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
            <Button size='large' onClick={() => navigate('/users')}>
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
              loading={updateUserMutation.isPending}
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
