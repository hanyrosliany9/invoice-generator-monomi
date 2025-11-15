import React, { useCallback, useEffect, useState } from 'react'
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  BankOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  FundOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  ShopOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatIDR, safeArray, safeNumber, safeString } from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { Client, clientService } from '../services/clients'
import { useTheme } from '../theme'
import FormErrorBoundary from '../components/FormErrorBoundary'
import {
  EntityBreadcrumb,
  RelatedEntitiesPanel,
} from '../components/navigation'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
import MetricBadge from '../components/ui/MetricBadge'
import RevenueIndicator from '../components/ui/RevenueIndicator'
import HealthScore from '../components/ui/HealthScore'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import dayjs from 'dayjs'
import { useIsMobile } from '../hooks/useMediaQuery'
import MobileTableView from '../components/mobile/MobileTableView'
import { clientToBusinessEntity } from '../adapters/mobileTableAdapters'
import type { MobileTableAction, MobileFilterConfig } from '../components/mobile/MobileTableView'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

export const ClientsPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile()

  const [searchInput, setSearchInput] = useState('')
  const searchText = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<string | undefined>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  // Export functionality
  const handleExport = useCallback(() => {
    message.info({
      content:
        'Fitur export sedang dalam pengembangan. Data klien akan dapat di-export dalam format CSV/Excel pada update mendatang.',
      duration: 4,
    })
  }, [message])

  // Import functionality
  const handleImport = useCallback(() => {
    message.info({
      content:
        'Fitur import sedang dalam pengembangan. Import data klien dari CSV/Excel akan tersedia pada update mendatang.',
      duration: 4,
    })
  }, [message])

  // Queries
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      form.resetFields()
      setModalVisible(false)
      message.success(t('messages.success.created', { item: 'Klien' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientService.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      form.resetFields()
      setEditingClient(null)
      setModalVisible(false)
      message.success(t('messages.success.updated', { item: 'Klien' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: clientService.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      message.success(t('messages.success.deleted', { item: 'Klien' }))
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Gagal menghapus klien'
      message.error(errorMessage)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => clientService.deleteClient(id))
      )
      return {
        succeeded: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: results.length,
      }
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setSelectedRowKeys([])
      setBatchLoading(false)

      if (data.failed === 0) {
        message.success(`Berhasil menghapus ${data.succeeded} klien`)
      } else if (data.succeeded === 0) {
        message.error(`Gagal menghapus semua klien (${data.failed} gagal)`)
      } else {
        message.warning(
          `Berhasil menghapus ${data.succeeded} klien, ${data.failed} gagal`
        )
      }
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Gagal menghapus klien')
    },
  })

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[]
      status: 'active' | 'inactive'
    }) => {
      const results = await Promise.allSettled(
        ids.map(id => clientService.updateClient(id, { status }))
      )
      return {
        succeeded: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: results.length,
        status,
      }
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setSelectedRowKeys([])
      setBatchLoading(false)
      const statusText = data.status === 'active' ? 'aktif' : 'tidak aktif'

      if (data.failed === 0) {
        message.success(
          `Berhasil mengubah status ${data.succeeded} klien menjadi ${statusText}`
        )
      } else if (data.succeeded === 0) {
        message.error(
          `Gagal mengubah status semua klien (${data.failed} gagal)`
        )
      } else {
        message.warning(
          `Berhasil mengubah status ${data.succeeded} klien menjadi ${statusText}, ${data.failed} gagal`
        )
      }
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Gagal mengubah status klien')
    },
  })

  // Handle URL parameters for direct navigation
  useEffect(() => {
    // Handle clientId query parameter (navigate to specific client detail page)
    const viewClientId = searchParams.get('clientId')
    if (viewClientId) {
      // Navigate to dedicated client detail page
      navigate(`/clients/${viewClientId}`, { replace: true })
    }
  }, [searchParams, clients, navigate])

  // Filtered data
  const filteredClients = safeArray(clients).filter(client => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch =
      safeString(client?.name).toLowerCase().includes(searchLower) ||
      safeString(client?.email).toLowerCase().includes(searchLower) ||
      safeString(client?.company).toLowerCase().includes(searchLower) ||
      safeString(client?.contactPerson).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || client?.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Handler functions (must be defined before mobileActions useMemo)
  const handleEdit = (client: Client) => {
    setEditingClient(client)
    form.setFieldsValue(client)
    setModalVisible(true)
  }

  const handleView = (client: Client) => {
    navigate(`/clients/${client.id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  // Mobile data adapter - convert clients to BusinessEntity format
  const mobileData = React.useMemo(
    () => filteredClients.map(clientToBusinessEntity),
    [filteredClients]
  )

  // Mobile actions configuration
  // Mobile actions - only client-specific actions
  // Note: 'view', 'edit', and 'whatsapp' are provided by MobileTableView's defaultMobileActions
  const mobileActions = React.useMemo<MobileTableAction[]>(
    () => [
      {
        key: 'call',
        label: 'Telepon',
        icon: <PhoneOutlined />,
        color: theme.colors.accent.primary,
        visible: (record) => !!record.client?.phone,
        onClick: (record) => {
          const phone = record.client?.phone?.replace(/[^\d]/g, '')
          if (phone) {
            window.location.href = `tel:${phone}`
          }
        },
      },
      {
        key: 'email',
        label: 'Email',
        icon: <MailOutlined />,
        color: theme.colors.status.warning,
        visible: (record) => !!record.client?.email,
        onClick: (record) => {
          if (record.client?.email) {
            window.location.href = `mailto:${record.client.email}`
          }
        },
      },
      {
        key: 'projects',
        label: 'Lihat Proyek',
        icon: <ProjectOutlined />,
        onClick: (record) => navigate(`/projects?clientId=${record.id}`),
      },
      {
        key: 'quotations',
        label: 'Lihat Quotasi',
        icon: <FileTextOutlined />,
        onClick: (record) => navigate(`/quotations?clientId=${record.id}`),
      },
      {
        key: 'invoices',
        label: 'Lihat Invoice',
        icon: <FundOutlined />,
        onClick: (record) => navigate(`/invoices?clientId=${record.id}`),
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (record) => {
          Modal.confirm({
            title: 'Hapus Klien?',
            content: `Apakah Anda yakin ingin menghapus klien "${record.client?.name}"? Tindakan ini tidak dapat dibatalkan.`,
            okText: 'Hapus',
            okType: 'danger',
            cancelText: 'Batal',
            onOk: () => handleDelete(record.id),
          })
        },
      },
    ],
    [navigate, clients, handleDelete, theme]
  )

  // Mobile filters configuration
  const mobileFilters = React.useMemo<MobileFilterConfig[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Aktif', value: 'active' },
          { label: 'Tidak Aktif', value: 'inactive' },
        ],
      },
    ],
    []
  )

  // Statistics
  const safeClients = safeArray(clients)
  const stats = {
    total: safeClients.length,
    active: safeClients.filter(c => c?.status === 'active').length,
    inactive: safeClients.filter(c => c?.status === 'inactive').length,
    totalRevenue: safeClients.reduce(
      (sum, c) => sum + safeNumber(c?.totalPaid),
      0
    ),
    totalPending: safeClients.reduce(
      (sum, c) => sum + safeNumber(c?.totalPending),
      0
    ),
    totalQuotations: safeClients.reduce(
      (sum, c) => sum + safeNumber(c?.totalQuotations),
      0
    ),
    totalInvoices: safeClients.reduce(
      (sum, c) => sum + safeNumber(c?.totalInvoices),
      0
    ),
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'green' : 'red'
  }

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Aktif' : 'Tidak Aktif'
  }

  const getCompanyIcon = (company: string | null | undefined) => {
    const safeCompany = safeString(company).toUpperCase()
    if (safeCompany.startsWith('PT.') || safeCompany.startsWith('PT '))
      return <ShopOutlined />
    if (safeCompany.startsWith('CV.') || safeCompany.startsWith('CV '))
      return <TeamOutlined />
    return <UserOutlined />
  }

  // Navigation functions for clickable table links

  const navigateToQuotations = useCallback(
    (clientId?: string) => {
      navigate(clientId ? '/quotations?clientId=' + clientId : '/quotations')
    },
    [navigate]
  )

  const navigateToInvoices = useCallback(
    (clientId?: string) => {
      navigate(clientId ? '/invoices?clientId=' + clientId : '/invoices')
    },
    [navigate]
  )

  const handleCreate = () => {
    setEditingClient(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkDeleteMutation.mutate(selectedRowKeys)
  }

  const handleBulkActivate = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkUpdateStatusMutation.mutate({ ids: selectedRowKeys, status: 'active' })
  }

  const handleBulkDeactivate = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkUpdateStatusMutation.mutate({
      ids: selectedRowKeys,
      status: 'inactive',
    })
  }

  const handleClearSelection = () => {
    setSelectedRowKeys([])
  }

  const handleFormSubmit = (values: Record<string, any>) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: values as Partial<Client> })
    } else {
      createMutation.mutate(values as any)
    }
  }

  const getActionMenuItems = (client: Client) => {
    return [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(client),
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(client),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        danger: true,
        onClick: () => handleDelete(client.id),
      },
    ]
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[])
    },
    onSelectAll: (selected: boolean) => {
      if (selected) {
        const allKeys = filteredClients.map(client => client.id)
        setSelectedRowKeys(allKeys)
      } else {
        setSelectedRowKeys([])
      }
    },
    getCheckboxProps: (record: Client) => ({
      disabled: false,
      name: record.name,
    }),
  }

  const columns: any = [
    {
      title: 'Klien',
      key: 'client',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: unknown, client: Client) => (
        <div className='flex items-center'>
          <Avatar icon={getCompanyIcon(client?.company)} className='mr-3' />
          <div>
            <div className='font-semibold'>{safeString(client?.name)}</div>
            <div className='text-sm text-gray-500'>
              {safeString(client?.company)}
            </div>
          </div>
        </div>
      ),
      sorter: (a: Client, b: Client) =>
        safeString(a?.name).localeCompare(safeString(b?.name)),
    },
    {
      title: 'Kontak',
      key: 'contact',
      responsive: ['md', 'lg'] as any,
      render: (_: unknown, client: Client) => (
        <div>
          <div className='flex items-center mb-1'>
            <UserOutlined className='mr-2 text-gray-400' />
            <span className='text-sm'>{safeString(client?.contactPerson)}</span>
          </div>
          <div className='flex items-center mb-1'>
            <MailOutlined className='mr-2 text-gray-400' />
            <span className='text-sm'>{safeString(client?.email)}</span>
          </div>
          <div className='flex items-center'>
            <PhoneOutlined className='mr-2 text-gray-400' />
            <span className='text-sm'>{safeString(client?.phone)}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Business Overview',
      key: 'business',
      responsive: ['lg'] as any,
      render: (_: unknown, client: Client) => (
        <div className='flex items-center space-x-4'>
          <HealthScore client={client} size='small' />
          <div className='flex items-center space-x-2'>
            <MetricBadge
              icon={<ProjectOutlined />}
              value={client.totalProjects || 0}
              color='red'
              onClick={() => navigate(`/projects?clientId=${client.id}`)}
              tooltip='View projects'
            />
            <MetricBadge
              icon={<FileTextOutlined />}
              value={client.totalQuotations || 0}
              color='blue'
              badge={
                (client.pendingQuotations || 0) > 0
                  ? client.pendingQuotations || 0
                  : null
              }
              onClick={() => navigateToQuotations(client.id)}
              tooltip={`View quotations${(client.pendingQuotations || 0) > 0 ? ` (${client.pendingQuotations || 0} pending)` : ''}`}
            />
            <MetricBadge
              icon={<FundOutlined />}
              value={client.totalInvoices || 0}
              color='green'
              badge={
                (client.overdueInvoices || 0) > 0
                  ? client.overdueInvoices || 0
                  : null
              }
              onClick={() => navigateToInvoices(client.id)}
              tooltip={`View invoices${(client.overdueInvoices || 0) > 0 ? ` (${client.overdueInvoices || 0} overdue)` : ''}`}
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Revenue',
      key: 'revenue',
      responsive: ['sm', 'md', 'lg'] as any,
      render: (_: unknown, client: Client) => (
        <RevenueIndicator
          paid={client.totalPaid || 0}
          pending={client.totalPending || 0}
          compact
        />
      ),
      sorter: (a: Client, b: Client) => (a.totalPaid || 0) - (b.totalPaid || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (status: string) => {
        const getStatusBadgeColor = (status: string) => {
          switch (status) {
            case 'active':
              return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }
            case 'inactive':
              return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
            default:
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
          }
        }

        const badgeColors = getStatusBadgeColor(status)

        return (
          <span style={{
            background: badgeColors.bg,
            color: badgeColors.color,
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'inline-block',
          }}>
            {getStatusText(status)}
          </span>
        )
      },
      filters: [
        { text: 'Aktif', value: 'active' },
        { text: 'Tidak Aktif', value: 'inactive' },
      ],
      onFilter: (value: any, record: Client) => record.status === value,
    },
    {
      title: 'Transaksi Terakhir',
      dataIndex: 'lastTransaction',
      key: 'lastTransaction',
      responsive: ['md', 'lg'] as any,
      render: (date: string) => formatDate(date),
      sorter: (a: Client, b: Client) => {
        if (!a.lastTransaction && !b.lastTransaction) return 0
        if (!a.lastTransaction) return 1
        if (!b.lastTransaction) return -1
        return dayjs(a.lastTransaction).unix() - dayjs(b.lastTransaction).unix()
      },
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      className: 'actions-column',
      render: (_: unknown, client: Client) => (
        <div className='row-actions'>
          <Dropdown
            menu={{ items: getActionMenuItems(client) }}
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
        <Title level={2}>{t('clients.title')}</Title>

        {/* Statistics - 4-2 Layout for Better Visual Hierarchy */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<UserOutlined />}
              iconColor='#8b5cf6'
              iconBg='rgba(139, 92, 246, 0.15)'
              label='Total Klien'
              value={stats.total}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<UserOutlined />}
              iconColor='#52c41a'
              iconBg='rgba(82, 196, 26, 0.15)'
              label='Klien Aktif'
              value={stats.active}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<FileTextOutlined />}
              iconColor='#1890ff'
              iconBg='rgba(24, 144, 255, 0.15)'
              label='Total Quotations'
              value={stats.totalQuotations}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<FileTextOutlined />}
              iconColor='#dc2626'
              iconBg='rgba(220, 38, 38, 0.15)'
              label='Total Invoices'
              value={stats.totalInvoices}
            />
          </Col>
        </Row>

        {/* Financial Metrics Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={12}>
            <CompactMetricCard
              icon={<DollarOutlined />}
              iconColor='#10b981'
              iconBg='rgba(16, 185, 129, 0.15)'
              label='Total Pendapatan'
              value={formatIDR(stats.totalRevenue)}
            />
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <CompactMetricCard
              icon={<BankOutlined />}
              iconColor='#f59e0b'
              iconBg='rgba(245, 158, 11, 0.15)'
              label='Pembayaran Tertunda'
              value={formatIDR(stats.totalPending)}
            />
          </Col>
        </Row>

        {/* Bulk Actions Toolbar */}
        {selectedRowKeys.length > 0 && (
          <Card className='mb-4 border-blue-200 bg-blue-50' size='small'>
            <div className='flex justify-between items-center'>
              <div className='flex items-center space-x-4'>
                <Text strong className='text-blue-700'>
                  {selectedRowKeys.length} klien dipilih
                </Text>
                <div className='flex items-center space-x-2'>
                  <Button
                    size='small'
                    type='primary'
                    loading={batchLoading}
                    onClick={handleBulkActivate}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Aktifkan (
                    {
                      selectedRowKeys.filter(id => {
                        const client = filteredClients.find(c => c.id === id)
                        return client?.status === 'inactive'
                      }).length
                    }
                    )
                  </Button>
                  <Button
                    size='small'
                    loading={batchLoading}
                    onClick={handleBulkDeactivate}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Nonaktifkan (
                    {
                      selectedRowKeys.filter(id => {
                        const client = filteredClients.find(c => c.id === id)
                        return client?.status === 'active'
                      }).length
                    }
                    )
                  </Button>
                  <Button
                    size='small'
                    danger
                    icon={<DeleteOutlined />}
                    loading={batchLoading}
                    onClick={handleBulkDelete}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Hapus ({selectedRowKeys.length})
                  </Button>
                </div>
              </div>
              <Button
                size='small'
                type='text'
                onClick={handleClearSelection}
                className='text-gray-500 hover:text-gray-700'
              >
                Batal
              </Button>
            </div>
          </Card>
        )}

        {/* Controls */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[8, 12]} style={{ marginBottom: '12px' }}>
            <Col xs={24} sm={12} md={8}>
              <Input
                id='client-search'
                name='search'
                placeholder='Cari klien...'
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ width: '100%' }}
                size='large'
                autoComplete='off'
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder='Filter status'
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                size='large'
                allowClear
              >
                <Option value='active'>Aktif</Option>
                <Option value='inactive'>Tidak Aktif</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Button
                data-testid='client-reset-button'
                onClick={() => {
                  setSearchInput('')
                  setStatusFilter(undefined)
                }}
                style={{ width: '100%' }}
                size='large'
              >
                Reset
              </Button>
            </Col>
          </Row>

          <Row gutter={[8, 12]} justify='space-between' align='middle'>
            <Col xs={24} sm={8}>
              <Button
                data-testid='client-import-button'
                icon={<UploadOutlined />}
                onClick={handleImport}
                style={{ width: '100%' }}
                size='large'
              >
                Import
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                data-testid='client-export-button'
                icon={<ExportOutlined />}
                onClick={handleExport}
                style={{ width: '100%' }}
                size='large'
              >
                Export
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                data-testid='create-client-button'
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleCreate}
                style={{ width: '100%' }}
                size='large'
              >
                {t('clients.create')}
              </Button>
            </Col>
          </Row>
        </div>

        {/* Active Filters Pills (Notion-style) */}
        {(searchText || statusFilter) && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Text type='secondary' style={{ fontSize: '13px' }}>Active filters:</Text>
            {searchText && (
              <Tag
                closable
                onClose={() => setSearchInput('')}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Search: "{searchText.length > 20 ? searchText.substring(0, 20) + '...' : searchText}"
              </Tag>
            )}
            {statusFilter && (
              <Tag
                closable
                onClose={() => setStatusFilter('')}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Status: {getStatusText(statusFilter)}
              </Tag>
            )}
            <Button
              size='small'
              type='text'
              onClick={() => {
                setSearchInput('')
                setStatusFilter('')
              }}
              style={{
                color: '#ef4444',
                fontSize: '12px',
                height: '24px',
                padding: '0 8px',
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Table - Conditional rendering for mobile/desktop */}
      {isMobile ? (
        <MobileTableView
          data={mobileData}
          loading={isLoading}
          entityType="clients"
          enableWhatsAppActions
          showQuickStats
          searchable
          searchFields={['client.name', 'client.email', 'client.company']}
          filters={mobileFilters}
          actions={mobileActions}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
        />
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={columns}
              dataSource={filteredClients}
              loading={isLoading}
              rowKey='id'
              rowSelection={rowSelection}
              pagination={{
                total: filteredClients.length,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} dari ${total} klien`,
              }}
              scroll={{ x: 1200 }}
            />
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingClient ? 'Edit Klien' : t('clients.create')}
        open={modalVisible}
        onCancel={() => {
          form.resetFields()
          setEditingClient(null)
          setModalVisible(false)
        }}
        footer={null}
        width={800}
        forceRender
      >
        <FormErrorBoundary
          formTitle={editingClient ? 'Edit Klien' : 'Klien Baru'}
          onReset={() => {
            form.resetFields()
            setEditingClient(null)
            setModalVisible(false)
          }}
        >
          <Form
            data-testid='client-form'
            form={form}
            layout='vertical'
            onFinish={handleFormSubmit}
          >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='name'
                label={t('clients.name')}
                rules={[{ required: true, message: 'Nama klien wajib diisi' }]}
              >
                <Input id='client-name' placeholder='Masukkan nama klien' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='company'
                label={t('clients.company')}
                rules={[
                  { required: true, message: 'Nama perusahaan wajib diisi' },
                ]}
              >
                <Input id='client-company' placeholder='PT. / CV. / Toko...' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='contactPerson'
                label={t('clients.contactPerson')}
                rules={[
                  { required: true, message: 'Contact person wajib diisi' },
                ]}
              >
                <Input id='client-contact-person' placeholder='Nama contact person' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='email'
                label={t('clients.email')}
                rules={[
                  { type: 'email', message: 'Format email tidak valid' },
                ]}
              >
                <Input id='client-email' placeholder='nama@email.com (opsional)' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='phone'
                label={t('clients.phone')}
              >
                <Input id='client-phone' placeholder='+62 21 1234567 (opsional)' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='paymentTerms'
                label={t('clients.paymentTerms')}
                rules={[
                  { required: true, message: 'Syarat pembayaran wajib diisi' },
                ]}
              >
                <Select placeholder='Pilih syarat pembayaran'>
                  <Option value='Cash'>Cash</Option>
                  <Option value='Net 7'>Net 7</Option>
                  <Option value='Net 14'>Net 14</Option>
                  <Option value='Net 21'>Net 21</Option>
                  <Option value='Net 30'>Net 30</Option>
                  <Option value='Net 45'>Net 45</Option>
                  <Option value='Net 60'>Net 60</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='address'
            label={t('clients.address')}
          >
            <TextArea rows={2} placeholder='Alamat lengkap klien (opsional)' />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='taxNumber' label='NPWP'>
                <Input id='client-tax-number' placeholder='XX.XXX.XXX.X-XXX.XXX' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='status' label='Status' initialValue='active'>
                <Select>
                  <Option value='active'>Aktif</Option>
                  <Option value='inactive'>Tidak Aktif</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='bankAccount' label='Rekening Bank'>
            <Input placeholder='Bank BCA: 123-456-789 a.n. Nama Pemilik' />
          </Form.Item>

          <Form.Item name='notes' label='Catatan'>
            <TextArea
              rows={3}
              placeholder='Catatan tambahan tentang klien...'
            />
          </Form.Item>

          <div className='flex justify-end space-x-2'>
            <Button
              onClick={() => {
                form.resetFields()
                setEditingClient(null)
                setModalVisible(false)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
          </Form>
        </FormErrorBoundary>
      </Modal>
    </div>
  )
}
