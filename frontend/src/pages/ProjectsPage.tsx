import React, { useCallback, useEffect, useState } from 'react'
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'

const { MonthPicker } = DatePicker
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatIDR, safeArray, safeNumber, safeString } from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { Project, UpdateProjectRequest, projectService } from '../services/projects'
import { clientService } from '../services/clients'
import { projectTypesApi } from '../services/project-types'
import { useTheme } from '../theme'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import FormErrorBoundary from '../components/FormErrorBoundary'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { RangePicker } = DatePicker

// interface ProjectTeamMember {
//   id: string
//   name: string
//   role: string
//   email: string
// }

export const ProjectsPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [searchInput, setSearchInput] = useState('')
  const searchText = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  // Export functionality
  const handleExport = useCallback(() => {
    message.info({
      content:
        'Fitur export proyek sedang dalam pengembangan. Data proyek akan dapat di-export dalam format CSV/Excel pada update mendatang.',
      duration: 4,
    })
  }, [message])

  // Queries
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  const { data: projectTypes = [], isLoading: projectTypesLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectTypesApi.getAll,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      form.resetFields()
      setModalVisible(false)
      message.success(t('messages.success.created', { item: 'Proyek' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      form.resetFields()
      setEditingProject(null)
      setModalVisible(false)
      message.success(t('messages.success.updated', { item: 'Proyek' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success(t('messages.success.deleted', { item: 'Proyek' }))
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => projectService.deleteProject(id))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      return { succeeded, failed, total: ids.length }
    },
    onSuccess: ({ succeeded, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedRowKeys([])
      setBatchLoading(false)
      if (failed > 0) {
        message.warning(
          `${succeeded} dari ${total} proyek berhasil dihapus. ${failed} gagal.`
        )
      } else {
        message.success(`Berhasil menghapus ${succeeded} proyek`)
      }
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Gagal menghapus proyek')
    },
  })

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[]
      status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
    }) => {
      const results = await Promise.allSettled(
        ids.map(id => projectService.updateProject(id, { status }))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      return { succeeded, failed, total: ids.length, status }
    },
    onSuccess: ({ succeeded, failed, total, status }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedRowKeys([])
      setBatchLoading(false)
      const statusText =
        {
          PLANNING: 'perencanaan',
          IN_PROGRESS: 'sedang berjalan',
          COMPLETED: 'selesai',
          CANCELLED: 'dibatalkan',
          ON_HOLD: 'ditahan',
        }[status] || status
      if (failed > 0) {
        message.warning(
          `${succeeded} dari ${total} proyek berhasil diubah ke ${statusText}. ${failed} gagal.`
        )
      } else {
        message.success(
          `Berhasil mengubah status ${succeeded} proyek menjadi ${statusText}`
        )
      }
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Gagal mengubah status proyek')
    },
  })

  // Handle URL parameters for direct navigation
  useEffect(() => {
    // Handle viewProject query parameter (navigate to specific project detail page)
    const viewProjectId = searchParams.get('projectId')
    if (viewProjectId) {
      // Navigate to dedicated project detail page
      navigate(`/projects/${viewProjectId}`, { replace: true })
    }
  }, [searchParams, projects, navigate])

  // Handle clientId query parameter for filtering
  const clientFilter = searchParams.get('clientId')
  const [filteredByClient, setFilteredByClient] = useState<string | null>(null)

  useEffect(() => {
    if (clientFilter) {
      setFilteredByClient(clientFilter)
    } else {
      setFilteredByClient(null)
    }
  }, [clientFilter])

  // Filtered data
  const filteredProjects = safeArray(projects).filter(project => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch =
      safeString(project?.number).toLowerCase().includes(searchLower) ||
      safeString(project?.description).toLowerCase().includes(searchLower) ||
      safeString(project?.client?.name).toLowerCase().includes(searchLower) ||
      safeString(project?.client?.company).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || project?.status === statusFilter
    const matchesType = !typeFilter || project?.projectType?.code === typeFilter
    const matchesClient =
      !filteredByClient || project?.clientId === filteredByClient
    return matchesSearch && matchesStatus && matchesType && matchesClient
  })

  // Statistics
  const safeProjects = safeArray(projects)
  const stats = {
    total: safeProjects.length,
    planning: safeProjects.filter(p => p?.status === 'PLANNING').length,
    inProgress: safeProjects.filter(p => p?.status === 'IN_PROGRESS').length,
    completed: safeProjects.filter(p => p?.status === 'COMPLETED').length,
    cancelled: safeProjects.filter(p => p?.status === 'CANCELLED').length,
    production: safeProjects.filter(p => p?.projectType?.code === 'PRODUCTION').length,
    socialMedia: safeProjects.filter(p => p?.projectType?.code === 'SOCIAL_MEDIA').length,
    totalBudget: safeProjects.reduce(
      (sum, p) => sum + safeNumber(p?.estimatedBudget || p?.basePrice || 0),
      0
    ),
    totalActual: safeProjects.reduce(
      (sum, p) => sum + safeNumber(p?.basePrice || 0),
      0
    ),
    totalRevenue: safeProjects.reduce(
      (sum, p) => sum + safeNumber(p?.totalRevenue || 0),
      0
    ),
    totalPending: safeProjects.reduce(
      (sum, p) => sum + Math.max(
        safeNumber(p?.basePrice || 0) - safeNumber(p?.totalRevenue || 0),
        0
      ),
      0
    ),
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'blue',
      inProgress: 'orange',
      completed: 'green',
      cancelled: 'red',
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      planning: <CalendarOutlined />,
      inProgress: <PlayCircleOutlined />,
      completed: <CheckCircleOutlined />,
      cancelled: <StopOutlined />,
    }
    return icons[status as keyof typeof icons] || <ClockCircleOutlined />
  }

  const getTypeColor = (type: string) => {
    return type === 'production' ? 'red' : 'cyan'
  }

  const getTypeText = (type: string) => {
    if (type === 'PRODUCTION' || type === 'production') return 'Produksi'
    if (type === 'SOCIAL_MEDIA' || type === 'socialMedia') return 'Media Sosial'
    return type || 'Unknown'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#52c41a'
    if (progress >= 75) return '#1890ff'
    if (progress >= 50) return '#fa8c16'
    return '#f5222d'
  }

  const isProjectOverdue = (project: Project) => {
    return (
      project.status !== 'COMPLETED' &&
      project.status !== 'CANCELLED' &&
      dayjs().isAfter(dayjs(project.endDate))
    )
  }

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0
    return dayjs(endDate).diff(dayjs(), 'days')
  }

  // Navigation function for clickable table links
  const navigateToClient = useCallback(
    (clientId: string) => {
      navigate(`/clients?clientId=${clientId}`)
    },
    [navigate]
  )

  const handleCreate = () => {
    navigate('/projects/new')
  }

  const handleEdit = (project: Project) => {
    navigate(`/projects/${project.id}/edit`)
  }

  const handleView = (project: Project) => {
    navigate(`/projects/${project.id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkDeleteMutation.mutate(selectedRowKeys)
  }

  const handleBulkStatusUpdate = (
    status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  ) => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkUpdateStatusMutation.mutate({ ids: selectedRowKeys, status })
  }

  const handleClearSelection = () => {
    setSelectedRowKeys([])
  }

  const handleFormSubmit = (values: any) => {
    const data = {
      ...values,
      startDate: values.dateRange[0].startOf('day').toISOString(),
      endDate: values.dateRange[1].endOf('day').toISOString(),
    }
    delete data.dateRange

    // Clean undefined values and empty strings to prevent validation errors
    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null || data[key] === '') {
        delete data[key]
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Submitting project data:', JSON.stringify(data, null, 2))
    }

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data })
    } else {
      createMutation.mutate({ ...data, status: 'PLANNING' })
    }
  }

  const getActionMenuItems = (project: Project) => {
    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(project),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        danger: true,
        onClick: () => handleDelete(project.id),
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
        const allKeys = filteredProjects.map(project => project.id)
        setSelectedRowKeys(allKeys)
      } else {
        setSelectedRowKeys([])
      }
    },
    getCheckboxProps: (record: Project) => ({
      disabled: false,
      name: record.number,
    }),
  }

  const columns = [
    {
      title: 'Proyek',
      key: 'project',
      render: (_: any, project: Project) => (
        <div>
          <div className='font-semibold'>
            <Button
              type='link'
              onClick={() => handleView(project)}
              className='text-blue-600 hover:text-blue-800 p-0 font-semibold'
            >
              {project.number}
            </Button>
          </div>
          <div className='text-sm text-gray-600'>{project.description}</div>
          <div className='mt-1'>
            {project.projectType ? (
              <span style={{
                background: project.projectType.code === 'PRODUCTION'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(6, 182, 212, 0.15)',
                color: project.projectType.code === 'PRODUCTION'
                  ? '#ef4444'
                  : '#06b6d4',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-block',
              }}>
                {getTypeText(project.projectType.code)}
              </span>
            ) : (
              <span style={{
                background: 'rgba(156, 163, 175, 0.15)',
                color: '#6b7280',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-block',
              }}>
                No Type
              </span>
            )}
          </div>
        </div>
      ),
      sorter: (a: Project, b: Project) => a.number.localeCompare(b.number),
    },
    {
      title: 'Klien',
      key: 'clientName',
      render: (_: any, project: Project) => (
        <Button
          type='link'
          onClick={() => navigateToClient(project.client?.id || '')}
          className='text-blue-600 hover:text-blue-800 p-0'
          disabled={!project.client?.id}
        >
          {project.client?.name || 'N/A'}
        </Button>
      ),
      sorter: (a: Project, b: Project) =>
        (a.client?.name || '').localeCompare(b.client?.name || ''),
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_: any, project: Project) => {
        const calculateProgress = (project: Project) => {
          // Calculate progress based on status and dates
          const now = new Date()
          const startDate = project.startDate ? new Date(project.startDate) : null
          const endDate = project.endDate ? new Date(project.endDate) : null

          // Base progress on status
          let statusProgress = 0
          switch (project.status) {
            case 'PLANNING':
              statusProgress = 5
              break
            case 'IN_PROGRESS':
              // Calculate based on time elapsed
              if (startDate && endDate) {
                const totalDuration = endDate.getTime() - startDate.getTime()
                const elapsedDuration = now.getTime() - startDate.getTime()
                const timeProgress = Math.max(0, Math.min(95, (elapsedDuration / totalDuration) * 100))
                statusProgress = Math.round(timeProgress)
              } else {
                statusProgress = 30 // More conservative estimate when dates are missing
              }
              break
            case 'COMPLETED':
              statusProgress = 100
              break
            case 'CANCELLED':
              statusProgress = 0
              break
            case 'ON_HOLD':
              statusProgress = 25
              break
            default:
              statusProgress = 0
          }

          return Math.min(Math.max(statusProgress, 0), 100)
        }

        const progress = calculateProgress(project)

        return (
          <div>
            <Progress
              percent={progress}
              size='small'
              strokeColor={getProgressColor(progress)}
            />
            <div className='text-sm text-gray-500 mt-1'>{progress}%</div>
          </div>
        )
      },
      sorter: (a: Project, b: Project) => {
        const getProgress = (project: Project) => {
          switch (project.status) {
            case 'PLANNING':
              return 5
            case 'IN_PROGRESS':
              return 50
            case 'COMPLETED':
              return 100
            case 'CANCELLED':
              return 0
            case 'ON_HOLD':
              return 25
            default:
              return 0
          }
        }
        return getProgress(a) - getProgress(b)
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, project: Project) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            PLANNING: 'Perencanaan',
            IN_PROGRESS: 'Berlangsung',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
            ON_HOLD: 'Ditahan',
          }
          return statusMap[status as keyof typeof statusMap] || status
        }

        const getStatusBadgeColor = (status: string) => {
          switch (status) {
            case 'PLANNING':
              return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }
            case 'IN_PROGRESS':
              return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }
            case 'COMPLETED':
              return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }
            case 'CANCELLED':
              return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
            case 'ON_HOLD':
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
            default:
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
          }
        }

        const badgeColors = getStatusBadgeColor(project.status)

        return (
          <div>
            <span style={{
              background: badgeColors.bg,
              color: badgeColors.color,
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-block',
            }}>
              {getStatusText(project.status)}
            </span>
            {isProjectOverdue(project) && (
              <div className='mt-1'>
                <Badge
                  status='error'
                  text={<span className='text-xs'>Terlambat</span>}
                />
              </div>
            )}
          </div>
        )
      },
      filters: [
        { text: 'Perencanaan', value: 'PLANNING' },
        { text: 'Berlangsung', value: 'IN_PROGRESS' },
        { text: 'Selesai', value: 'COMPLETED' },
        { text: 'Dibatalkan', value: 'CANCELLED' },
        { text: 'Ditahan', value: 'ON_HOLD' },
      ],
      onFilter: (value: any, record: Project) => record.status === value,
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (_: any, project: Project) => {
        const daysRemaining = getDaysRemaining(project.endDate)
        const isOverdue = isProjectOverdue(project)

        return (
          <div className='text-sm'>
            <div>Mulai: {formatDate(project.startDate)}</div>
            <div>Selesai: {formatDate(project.endDate)}</div>
            {project.status !== 'COMPLETED' &&
              project.status !== 'CANCELLED' && (
                <div
                  className={`mt-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {isOverdue
                    ? `Terlambat ${Math.abs(daysRemaining)} hari`
                    : `${daysRemaining} hari lagi`}
                </div>
              )}
          </div>
        )
      },
      sorter: (a: Project, b: Project) =>
        dayjs(a.endDate).unix() - dayjs(b.endDate).unix(),
    },
    {
      title: 'Nilai Proyek',
      key: 'budget',
      render: (_: any, project: Project) => {
        const budget = safeNumber(project.estimatedBudget || project.basePrice || 0)
        const actualPrice = safeNumber(project.basePrice || 0)
        const totalRevenue = safeNumber(project.totalRevenue || 0)
        const pendingAmount = Math.max(actualPrice - totalRevenue, 0)

        return (
          <div className='text-sm'>
            <div>
              Nilai: <Text strong>{formatIDR(budget)}</Text>
            </div>
            <div>
              Aktual: <Text strong>{formatIDR(actualPrice)}</Text>
            </div>
            <div className='mt-1'>
              <Text type='success'>Dibayar: {formatIDR(totalRevenue)}</Text>
            </div>
            {pendingAmount > 0 && (
              <div>
                <Text type='warning'>Pending: {formatIDR(pendingAmount)}</Text>
              </div>
            )}
          </div>
        )
      },
      sorter: (a: Project, b: Project) => {
        const aPrice = typeof a.basePrice === 'string'
          ? parseFloat(a.basePrice) || 0
          : safeNumber(a.basePrice)
        const bPrice = typeof b.basePrice === 'string'
          ? parseFloat(b.basePrice) || 0
          : safeNumber(b.basePrice)
        return aPrice - bPrice
      },
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      className: 'actions-column',
      render: (_: any, project: Project) => (
        <div className='row-actions'>
          <Dropdown
            menu={{ items: getActionMenuItems(project) }}
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
      {/* Hover-revealed row actions CSS */}
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
      `}</style>
      <div className='mb-6'>
        <Title level={2}>{t('projects.title')}</Title>

        {/* Statistics - Compact Design */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ProjectOutlined />}
              iconColor='#f59e0b'
              iconBg='rgba(245, 158, 11, 0.15)'
              label='Total Proyek'
              value={stats.total}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<PlayCircleOutlined />}
              iconColor='#fa8c16'
              iconBg='rgba(250, 140, 22, 0.15)'
              label='Berlangsung'
              value={stats.inProgress}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CheckCircleOutlined />}
              iconColor='#52c41a'
              iconBg='rgba(82, 196, 26, 0.15)'
              label='Selesai'
              value={stats.completed}
            />
          </Col>
        </Row>

        {/* Secondary Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CalendarOutlined />}
              iconColor='#1890ff'
              iconBg='rgba(24, 144, 255, 0.15)'
              label='Perencanaan'
              value={stats.planning}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<TeamOutlined />}
              iconColor='#dc2626'
              iconBg='rgba(220, 38, 38, 0.15)'
              label='Produksi'
              value={stats.production}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<BarChartOutlined />}
              iconColor='#13c2c2'
              iconBg='rgba(19, 194, 194, 0.15)'
              label='Media Sosial'
              value={stats.socialMedia}
            />
          </Col>
        </Row>

        {/* Revenue Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <CompactMetricCard
              icon={<DollarOutlined />}
              iconColor='#3b82f6'
              iconBg='rgba(59, 130, 246, 0.15)'
              label='Budget Total'
              value={formatIDR(stats.totalBudget)}
            />
          </Col>
          <Col xs={24} lg={12}>
            <CompactMetricCard
              icon={<DollarOutlined />}
              iconColor='#10b981'
              iconBg='rgba(16, 185, 129, 0.15)'
              label='Pendapatan'
              value={formatIDR(stats.totalRevenue)}
            />
          </Col>
        </Row>

        {/* Bulk Actions Toolbar */}
        {selectedRowKeys.length > 0 && (
          <Card className='mb-4 border-blue-200 bg-blue-50' size='small'>
            <div className='flex justify-between items-center'>
              <div className='flex items-center space-x-4'>
                <Text strong className='text-blue-700'>
                  {selectedRowKeys.length} proyek dipilih
                </Text>
                <div className='flex items-center space-x-2'>
                  <Button
                    size='small'
                    type='primary'
                    icon={<PlayCircleOutlined />}
                    loading={batchLoading}
                    onClick={() => handleBulkStatusUpdate('IN_PROGRESS')}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Mulai (
                    {
                      selectedRowKeys.filter(id => {
                        const project = filteredProjects.find(p => p.id === id)
                        return project?.status === 'PLANNING'
                      }).length
                    }
                    )
                  </Button>
                  <Button
                    size='small'
                    icon={<CheckCircleOutlined />}
                    loading={batchLoading}
                    onClick={() => handleBulkStatusUpdate('COMPLETED')}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Selesaikan (
                    {
                      selectedRowKeys.filter(id => {
                        const project = filteredProjects.find(p => p.id === id)
                        return project?.status === 'IN_PROGRESS'
                      }).length
                    }
                    )
                  </Button>
                  <Button
                    size='small'
                    icon={<StopOutlined />}
                    loading={batchLoading}
                    onClick={() => handleBulkStatusUpdate('ON_HOLD')}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Tahan (
                    {
                      selectedRowKeys.filter(id => {
                        const project = filteredProjects.find(p => p.id === id)
                        return project?.status === 'IN_PROGRESS'
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
        <div className='flex justify-between items-center mb-4'>
          <Space>
            <Input
              id='project-search'
              name='search'
              placeholder='Cari proyek...'
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: 300 }}
              autoComplete='off'
            />
            <Select
              id='project-status-filter'
              data-testid='project-filter-button'
              placeholder='Filter status'
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='PLANNING'>Perencanaan</Option>
              <Option value='IN_PROGRESS'>Berlangsung</Option>
              <Option value='COMPLETED'>Selesai</Option>
              <Option value='CANCELLED'>Dibatalkan</Option>
            </Select>
            <Select
              id='project-type-filter'
              data-testid='project-timeline-button'
              placeholder='Filter tipe'
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='PRODUCTION'>Produksi</Option>
              <Option value='SOCIAL_MEDIA'>Media Sosial</Option>
            </Select>
            <MonthPicker
              placeholder='Pilih bulan & tahun'
              value={filters.monthYear}
              onChange={value => setFilters(prev => ({ ...prev, monthYear: value }))}
              style={{ width: 180 }}
              format='MMMM YYYY'
              allowClear
            />
            <InputNumber
              placeholder='Nilai min'
              value={filters.amount?.[0]}
              onChange={value => setFilters(prev => ({ ...prev, amount: [value, prev.amount?.[1]] }))}
              style={{ width: 120 }}
              formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={value => value?.replace(/Rp\s?|(\.*)/g, '')}
            />
            <InputNumber
              placeholder='Nilai max'
              value={filters.amount?.[1]}
              onChange={value => setFilters(prev => ({ ...prev, amount: [prev.amount?.[0], value] }))}
              style={{ width: 120 }}
              formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={value => value?.replace(/Rp\s?|(\.*)/g, '')}
            />
            <Button onClick={() => setFilters({})}>Reset</Button>
          </Space>

          <Space>
            <Button
              data-testid='project-export-button'
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              data-testid='create-project-button'
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('projects.create')}
            </Button>
          </Space>
        </div>

        {/* Active Filters Pills (Notion-style) */}
        {(searchText || statusFilter || typeFilter || filters.monthYear || filters.amount?.[0] || filters.amount?.[1]) && (
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
                Status: {statusFilter === 'PLANNING' ? 'Perencanaan' : statusFilter === 'IN_PROGRESS' ? 'Berlangsung' : statusFilter === 'COMPLETED' ? 'Selesai' : statusFilter === 'CANCELLED' ? 'Dibatalkan' : statusFilter === 'ON_HOLD' ? 'Ditahan' : statusFilter}
              </Tag>
            )}
            {typeFilter && (
              <Tag
                closable
                onClose={() => setTypeFilter('')}
                style={{
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Tipe: {getTypeText(typeFilter)}
              </Tag>
            )}
            {filters.monthYear && (
              <Tag
                closable
                onClose={() => setFilters(prev => ({ ...prev, monthYear: undefined }))}
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Month: {dayjs(filters.monthYear).format('MMMM YYYY')}
              </Tag>
            )}
            {(filters.amount?.[0] || filters.amount?.[1]) && (
              <Tag
                closable
                onClose={() => setFilters(prev => ({ ...prev, amount: undefined }))}
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Amount: {filters.amount?.[0] ? formatIDR(filters.amount[0]) : '0'} - {filters.amount?.[1] ? formatIDR(filters.amount[1]) : '∞'}
              </Tag>
            )}
            <Button
              size='small'
              type='text'
              onClick={() => {
                setSearchInput('')
                setStatusFilter('')
                setTypeFilter('')
                setFilters({})
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

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredProjects}
          loading={isLoading}
          rowKey='id'
          rowSelection={rowSelection}
          pagination={{
            total: filteredProjects.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} proyek`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingProject ? 'Edit Proyek' : t('projects.create')}
        open={modalVisible}
        onCancel={() => {
          form.resetFields()
          setEditingProject(null)
          setModalVisible(false)
        }}
        footer={null}
        width={800}
      >
        <FormErrorBoundary
          formTitle={editingProject ? 'Edit Proyek' : 'Proyek Baru'}
          onReset={() => {
            form.resetFields()
            setEditingProject(null)
            setModalVisible(false)
          }}
        >
          <Form
            data-testid='project-form'
            form={form}
            layout='vertical'
            onFinish={handleFormSubmit}
            name='projectForm'
          >
          <Form.Item
            name='clientId'
            label='Klien'
            rules={[{ required: true, message: 'Pilih klien' }]}
          >
            <Select
              placeholder='Pilih klien'
              loading={clientsLoading}
              disabled={clientsLoading}
            >
              {safeArray(clients).map(client => (
                <Option key={client.id} value={client.id}>
                  {client.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name='description'
            label={t('projects.description')}
            rules={[
              { required: true, message: 'Deskripsi proyek wajib diisi' },
            ]}
          >
            <Input id='description' name='description' placeholder='Deskripsi singkat proyek' autoComplete='off' />
          </Form.Item>

          <Form.Item
            name='projectTypeId'
            label={t('projects.type')}
            rules={[{ required: true, message: 'Pilih tipe proyek' }]}
          >
            <Select
              id='projectTypeId'
              placeholder='Pilih tipe proyek'
              loading={projectTypesLoading}
              disabled={projectTypesLoading}
            >
              {safeArray(projectTypes).map(type => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label='Produk & Harga'>
            <Form.List name='products'>
              {(fields, { add, remove }) => (
                <div>
                  {fields.map(field => (
                    <Card
                      key={field.key}
                      size='small'
                      style={{ marginBottom: 8 }}
                      extra={
                        <Button
                          type='text'
                          danger
                          size='small'
                          onClick={() => remove(field.name)}
                          icon={<DeleteOutlined />}
                        />
                      }
                    >
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item
                            name={[field.name, 'name']}
                            fieldKey={[field.fieldKey ?? field.name, 'name']}
                            label='Nama Produk'
                            rules={[
                              {
                                required: true,
                                message: 'Nama produk wajib diisi',
                              },
                            ]}
                          >
                            <Input id={`product-name-${field.name}`} name={`product-name-${field.name}`} placeholder='Nama produk/layanan' autoComplete='off' />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name={[field.name, 'quantity']}
                            fieldKey={[
                              field.fieldKey ?? field.name,
                              'quantity',
                            ]}
                            label='Qty'
                            rules={[
                              { required: true, message: 'Qty wajib diisi' },
                            ]}
                          >
                            <InputNumber
                              id={`product-quantity-${field.name}`}
                              name={`product-quantity-${field.name}`}
                              min={1}
                              placeholder='1'
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name={[field.name, 'price']}
                            fieldKey={[field.fieldKey ?? field.name, 'price']}
                            label='Harga'
                            rules={[
                              { required: true, message: 'Harga wajib diisi' },
                            ]}
                          >
                            <InputNumber
                              name={`product-price-${field.name}`}
                              style={{ width: '100%' }}
                              formatter={value =>
                                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                              }
                              parser={value => value!.replace(/\./g, '')}
                              placeholder='0'
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        name={[field.name, 'description']}
                        fieldKey={[field.fieldKey ?? field.name, 'description']}
                        label='Deskripsi'
                        rules={[
                          {
                            required: true,
                            message: 'Deskripsi produk wajib diisi',
                          },
                        ]}
                      >
                        <Input.TextArea
                          name={`product-description-${field.name}`}
                          rows={2}
                          placeholder='Deskripsi produk/layanan'
                          autoComplete='off'
                        />
                      </Form.Item>
                    </Card>
                  ))}
                  <Button
                    type='dashed'
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Tambah Produk
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item
            name='dateRange'
            label='Periode Proyek'
            rules={[{ required: true, message: 'Pilih periode proyek' }]}
          >
            <RangePicker name='dateRange' style={{ width: '100%' }} />
          </Form.Item>

          {editingProject && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='status' label='Status'>
                  <Select>
                    <Option value='PLANNING'>Perencanaan</Option>
                    <Option value='IN_PROGRESS'>Berlangsung</Option>
                    <Option value='COMPLETED'>Selesai</Option>
                    <Option value='CANCELLED'>Dibatalkan</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='progress' label='Progress (%)'>
                  <InputNumber
                    name='progress'
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    placeholder='0'
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name='notes' label='Catatan'>
            <TextArea
              name='notes'
              rows={3}
              placeholder='Catatan tambahan tentang proyek...'
              autoComplete='off'
            />
          </Form.Item>

          <div className='flex justify-end space-x-2'>
            <Button
              onClick={() => {
                form.resetFields()
                setEditingProject(null)
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
