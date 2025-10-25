import React, { useCallback, useState } from 'react'
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePermissions } from '../hooks/usePermissions'
import { PermissionGuard } from '../components/auth/PermissionGuard'
import { User, UserRole } from '../types/user'
import { userService } from '../services/users'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import { formatDate } from '../utils/dateFormatters'

const { Title, Text } = Typography
const { Option } = Select

export const UsersPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const {
    canManageUsers,
    getRoleDisplayName,
    getRoleDisplayNameId,
    getRoleBadgeColor,
  } = usePermissions()

  const [searchInput, setSearchInput] = useState('')
  const searchText = useDebouncedValue(searchInput, 300)
  const [roleFilter, setRoleFilter] = useState<string | undefined>('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)

  // Redirect if not authorized
  if (!canManageUsers()) {
    return (
      <div className='flex items-center justify-center h-96'>
        <Card className='text-center'>
          <LockOutlined style={{ fontSize: 48, color: '#faad14' }} />
          <Title level={3}>Access Denied</Title>
          <Text>You don't have permission to manage users.</Text>
          <br />
          <Button type='primary' onClick={() => navigate('/')} className='mt-4'>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // Queries
  const { data: usersData = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  })

  // Ensure users is always an array
  const users = Array.isArray(usersData) ? usersData : []

  const { data: stats } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: userService.getUserStats,
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('User deleted successfully')
    },
    onError: () => {
      message.error('Failed to delete user')
    },
  })

  const activateMutation = useMutation({
    mutationFn: userService.activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('User activated successfully')
    },
    onError: () => {
      message.error('Failed to activate user')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: userService.deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('User deactivated successfully')
    },
    onError: () => {
      message.error('Failed to deactivate user')
    },
  })

  const bulkActivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => userService.activateUser(id))
      )
      return {
        succeeded: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: results.length,
      }
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedRowKeys([])
      setBatchLoading(false)

      if (data.failed === 0) {
        message.success(`Successfully activated ${data.succeeded} users`)
      } else {
        message.warning(
          `Activated ${data.succeeded} users, ${data.failed} failed`
        )
      }
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Failed to activate users')
    },
  })

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => userService.deactivateUser(id))
      )
      return {
        succeeded: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: results.length,
      }
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedRowKeys([])
      setBatchLoading(false)

      if (data.failed === 0) {
        message.success(`Successfully deactivated ${data.succeeded} users`)
      } else {
        message.warning(
          `Deactivated ${data.succeeded} users, ${data.failed} failed`
        )
      }
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Failed to deactivate users')
    },
  })

  // Filtered data
  const filteredUsers = users.filter(user => {
    const searchLower = searchText.toLowerCase()
    const matchesSearch =
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    const matchesRole = !roleFilter || user.role === roleFilter
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)
    return matchesSearch && matchesRole && matchesStatus
  })

  // Handlers
  const handleCreate = () => {
    navigate('/users/new')
  }

  const handleEdit = (user: User) => {
    navigate(`/users/${user.id}/edit`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleToggleActive = (user: User) => {
    if (user.isActive) {
      deactivateMutation.mutate(user.id)
    } else {
      activateMutation.mutate(user.id)
    }
  }

  const handleBulkActivate = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkActivateMutation.mutate(selectedRowKeys)
  }

  const handleBulkDeactivate = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkDeactivateMutation.mutate(selectedRowKeys)
  }

  const handleClearSelection = () => {
    setSelectedRowKeys([])
  }

  const getActionMenuItems = (user: User) => {
    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit User',
        onClick: () => handleEdit(user),
      },
      {
        key: 'toggle-active',
        icon: user.isActive ? <LockOutlined /> : <UnlockOutlined />,
        label: user.isActive ? 'Deactivate' : 'Activate',
        onClick: () => handleToggleActive(user),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: () => handleDelete(user.id),
      },
    ]
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[])
    },
    getCheckboxProps: (record: User) => ({
      disabled: false,
      name: record.name,
    }),
  }

  const columns: any = [
    {
      title: 'User',
      key: 'user',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: any, user: User) => (
        <div className='flex items-center'>
          <Avatar icon={<UserOutlined />} className='mr-3' />
          <div>
            <div className='font-semibold'>{user.name}</div>
            <div className='text-sm text-gray-500 flex items-center'>
              <MailOutlined className='mr-1' />
              {user.email}
            </div>
          </div>
        </div>
      ),
      sorter: (a: User, b: User) => a.name.localeCompare(b.name),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      responsive: ['sm', 'md', 'lg'] as any,
      render: (role: UserRole) => (
        <Tag color={getRoleBadgeColor(role)}>
          {getRoleDisplayName(role)}
        </Tag>
      ),
      filters: [
        { text: 'Super Admin', value: 'SUPER_ADMIN' },
        { text: 'Finance Manager', value: 'FINANCE_MANAGER' },
        { text: 'Accountant', value: 'ACCOUNTANT' },
        { text: 'Project Manager', value: 'PROJECT_MANAGER' },
        { text: 'Staff', value: 'STAFF' },
        { text: 'Viewer', value: 'VIEWER' },
      ],
      onFilter: (value: any, record: User) => record.role === value,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      responsive: ['sm', 'md', 'lg'] as any,
      render: (isActive: boolean, user: User) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(user)}
          checkedChildren='Active'
          unCheckedChildren='Inactive'
        />
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: any, record: User) => record.isActive === value,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['md', 'lg'] as any,
      render: (date: string) => formatDate(date),
      sorter: (a: User, b: User) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      className: 'actions-column',
      render: (_: any, user: User) => (
        <div className='row-actions'>
          <Dropdown
            menu={{ items: getActionMenuItems(user) }}
            trigger={['click']}
            placement='bottomRight'
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* Hover-revealed row actions CSS + Responsive table */}
      <style>{`
        .row-actions {
          opacity: 0.2;
          transition: opacity 0.2s ease-in-out;
        }

        .ant-table-row:hover .row-actions {
          opacity: 1;
        }

        .row-actions:hover {
          opacity: 1;
        }

        /* Responsive table for mobile */
        @media (max-width: 768px) {
          .ant-table {
            font-size: 12px;
          }

          .ant-table-cell {
            padding: 8px 4px !important;
          }

          .ant-table-column-title {
            font-size: 11px;
          }
        }
      `}</style>

      <div className='mb-6'>
        <Title level={2}>User Management</Title>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<TeamOutlined />}
              iconColor='#8b5cf6'
              iconBg='rgba(139, 92, 246, 0.15)'
              label='Total Users'
              value={stats?.totalUsers || users.length}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<UserOutlined />}
              iconColor='#52c41a'
              iconBg='rgba(82, 196, 26, 0.15)'
              label='Active Users'
              value={stats?.activeUsers || users.filter(u => u.isActive).length}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<LockOutlined />}
              iconColor='#ef4444'
              iconBg='rgba(239, 68, 68, 0.15)'
              label='Inactive Users'
              value={
                stats?.inactiveUsers || users.filter(u => !u.isActive).length
              }
            />
          </Col>
        </Row>

        {/* Bulk Actions Toolbar */}
        {selectedRowKeys.length > 0 && (
          <Card className='mb-4 border-blue-200 bg-blue-50' size='small'>
            <div className='flex justify-between items-center'>
              <div className='flex items-center space-x-4'>
                <Text strong className='text-blue-700'>
                  {selectedRowKeys.length} users selected
                </Text>
                <div className='flex items-center space-x-2'>
                  <Button
                    size='small'
                    type='primary'
                    loading={batchLoading}
                    onClick={handleBulkActivate}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Activate
                  </Button>
                  <Button
                    size='small'
                    loading={batchLoading}
                    onClick={handleBulkDeactivate}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
              <Button
                size='small'
                type='text'
                onClick={handleClearSelection}
                className='text-gray-500 hover:text-gray-700'
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Controls */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[8, 12]} style={{ marginBottom: '12px' }}>
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder='Search users...'
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ width: '100%' }}
                size='large'
                autoComplete='off'
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder='Filter by role'
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: '100%' }}
                size='large'
                allowClear
              >
                <Option value='SUPER_ADMIN'>Super Admin</Option>
                <Option value='FINANCE_MANAGER'>Finance Manager</Option>
                <Option value='ACCOUNTANT'>Accountant</Option>
                <Option value='PROJECT_MANAGER'>Project Manager</Option>
                <Option value='STAFF'>Staff</Option>
                <Option value='VIEWER'>Viewer</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder='Filter by status'
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                size='large'
                allowClear
              >
                <Option value='active'>Active</Option>
                <Option value='inactive'>Inactive</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                onClick={() => {
                  setSearchInput('')
                  setRoleFilter(undefined)
                  setStatusFilter(undefined)
                }}
                style={{ width: '100%' }}
                size='large'
              >
                Reset
              </Button>
            </Col>
          </Row>

          <Row gutter={[8, 12]}>
            <Col xs={24}>
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleCreate}
                style={{ width: '100%' }}
                size='large'
              >
                Create User
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            dataSource={filteredUsers}
            loading={isLoading}
            rowKey='id'
            rowSelection={rowSelection}
            pagination={{
              total: filteredUsers.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} users`,
            }}
            scroll={{ x: 1200 }}
          />
        </div>
      </Card>
    </div>
  )
}
