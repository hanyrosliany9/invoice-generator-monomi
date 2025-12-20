import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  CopyOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatIDR, safeArray, safeNumber, safeString } from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { Project, projectService } from '../services/projects'
import { useTheme } from '../theme'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import { getProjectStatusConfig, getStatusText, getStatusColor } from '../utils/projectStatus'
import { calculateProjectProgress, getDaysRemaining, isProjectOverdue } from '../utils/projectProgress'
import dayjs from 'dayjs'
import { useIsMobile } from '../hooks/useMediaQuery'
import MobileTableView from '../components/mobile/MobileTableView'
import { projectToBusinessEntity } from '../adapters/mobileTableAdapters'
import type { MobileTableAction, MobileFilterConfig } from '../components/mobile/MobileTableView'

const { Title, Text } = Typography
const { Option } = Select

// interface ProjectTeamMember {
//   id: string
//   name: string
//   role: string
//   email: string
// }

export const ProjectsPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { modal, message } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile()

  const [searchInput, setSearchInput] = useState('')
  const searchText = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusProject, setStatusProject] = useState<Project | null>(null)
  const [statusForm] = Form.useForm()

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

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success(t('messages.success.deleted', { item: 'Proyek' }))
    },
    onError: (error: any) => {
      // Handle 409 Conflict (project has quotations/invoices)
      if (error?.response?.status === 409) {
        const errorMessage = error?.response?.data?.message ||
          'Tidak dapat menghapus proyek yang memiliki quotation atau invoice'

        modal.error({
          title: 'Tidak Dapat Menghapus Proyek',
          content: (
            <div>
              <p>{errorMessage}</p>
              <p style={{ marginTop: '12px', color: theme.colors.text.secondary }}>
                <strong>Solusi:</strong> Hapus semua quotation dan invoice yang terkait dengan proyek ini terlebih dahulu,
                atau ubah status proyek menjadi "Cancelled" jika ingin mengarsipkannya.
              </p>
            </div>
          ),
          okText: 'Mengerti',
        })
      } else {
        // Generic error
        message.error(error?.response?.data?.message || 'Gagal menghapus proyek')
      }
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: projectService.duplicateProject,
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success(`Proyek berhasil diduplikasi: ${newProject.number}`)
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Gagal menduplikasi proyek')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => projectService.deleteProject(id))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      const conflictErrors = results.filter(
        r => r.status === 'rejected' && (r.reason as any)?.response?.status === 409
      ).length
      return { succeeded, failed, conflictErrors, total: ids.length }
    },
    onSuccess: ({ succeeded, failed, conflictErrors, total }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedRowKeys([])
      setBatchLoading(false)
      if (failed > 0) {
        const conflictMsg = conflictErrors > 0
          ? ` (${conflictErrors} proyek memiliki quotation/invoice yang masih aktif)`
          : ''
        modal.warning({
          title: 'Penghapusan Sebagian Berhasil',
          content: (
            <div>
              <p><strong>{succeeded}</strong> dari <strong>{total}</strong> proyek berhasil dihapus.</p>
              <p><strong>{failed}</strong> proyek gagal dihapus{conflictMsg}.</p>
              {conflictErrors > 0 && (
                <p style={{ marginTop: '12px', color: theme.colors.text.secondary }}>
                  <strong>Catatan:</strong> Proyek yang memiliki quotation atau invoice tidak dapat dihapus.
                  Hapus quotation/invoice terlebih dahulu atau ubah status proyek menjadi "Cancelled".
                </p>
              )}
            </div>
          ),
          okText: 'Mengerti',
        })
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

  // Single project status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      projectService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Status proyek berhasil diubah')
      setStatusModalVisible(false)
      setStatusProject(null)
      statusForm.resetFields()
    },
    onError: () => {
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

  // Define handler functions BEFORE they're used in mobile actions
  const handleEdit = useCallback((project: Project) => {
    navigate(`/projects/${project.id}/edit`)
  }, [navigate])

  const handleDelete = useCallback((id: string) => {
    const project = projects.find(p => p.id === id)
    modal.confirm({
      title: 'Delete Project?',
      content: `Are you sure you want to delete project "${project?.number || 'this project'}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMutation.mutate(id)
      },
    })
  }, [projects, deleteMutation, modal])

  const handleDuplicate = useCallback((project: Project) => {
    modal.confirm({
      title: 'Duplikasi Proyek?',
      content: `Apakah Anda yakin ingin menduplikasi proyek "${project.number}"? Proyek baru akan dibuat dengan status PLANNING.`,
      okText: 'Duplikasi',
      cancelText: 'Batal',
      onOk: () => {
        duplicateMutation.mutate(project.id)
      },
    })
  }, [duplicateMutation, modal])

  // Mobile data adapter - convert projects to BusinessEntity format
  const mobileData = useMemo(
    () => filteredProjects.map(projectToBusinessEntity),
    [filteredProjects]
  )

  // Mobile actions - only project-specific actions
  // Note: 'view', 'edit', and 'whatsapp' are provided by MobileTableView's defaultMobileActions
  const mobileActions = useMemo<MobileTableAction[]>(
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
        key: 'start',
        label: 'Mulai Proyek',
        icon: <PlayCircleOutlined />,
        color: theme.colors.status.success,
        visible: (record) => record.status === 'draft',
        onClick: (record) => {
          const project = projects.find(p => p.id === record.id)
          if (project) {
            bulkUpdateStatusMutation.mutate({ ids: [record.id], status: 'IN_PROGRESS' })
          }
        },
      },
      {
        key: 'complete',
        label: 'Selesaikan',
        icon: <CheckCircleOutlined />,
        color: theme.colors.status.success,
        visible: (record) => record.status === 'sent',
        onClick: (record) => {
          modal.confirm({
            title: 'Selesaikan Proyek?',
            content: `Apakah Anda yakin ingin menyelesaikan proyek ${record.number}?`,
            okText: 'Ya, Selesaikan',
            cancelText: 'Batal',
            onOk: () => {
              bulkUpdateStatusMutation.mutate({ ids: [record.id], status: 'COMPLETED' })
            },
          })
        },
      },
      {
        key: 'hold',
        label: 'Tahan Proyek',
        icon: <StopOutlined />,
        color: theme.colors.status.warning,
        visible: (record) => record.status === 'sent',
        onClick: (record) => {
          modal.confirm({
            title: 'Tahan Proyek?',
            content: `Apakah Anda yakin ingin menahan proyek ${record.number}?`,
            okText: 'Ya, Tahan',
            cancelText: 'Batal',
            onOk: () => {
              bulkUpdateStatusMutation.mutate({ ids: [record.id], status: 'ON_HOLD' })
            },
          })
        },
      },
      {
        key: 'print',
        label: 'Print',
        icon: <FileTextOutlined />,
        onClick: (record) => {
          message.info('Fitur print proyek sedang dalam pengembangan')
        },
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (record) => handleDelete(record.id),
        // No visibility restriction - matches desktop behavior
      },
    ],
    [projects, handleDelete, bulkUpdateStatusMutation, message, theme, modal]
  )

  // Mobile filters configuration
  const mobileFilters = useMemo<MobileFilterConfig[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Perencanaan', value: 'draft' },
          { label: 'Berlangsung', value: 'sent' },
          { label: 'Selesai', value: 'paid' },
          { label: 'Dibatalkan', value: 'declined' },
        ],
      },
    ],
    []
  )

  // Statistics - memoized for performance
  const safeProjects = safeArray(projects)
  const stats = useMemo(() => ({
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
  }), [safeProjects])

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

  // Navigation function for clickable table links
  const navigateToClient = useCallback(
    (clientId: string) => {
      navigate(`/clients?clientId=${clientId}`)
    },
    [navigate]
  )

  const handleCreate = useCallback(() => {
    navigate('/projects/new')
  }, [navigate])

  const handleView = useCallback((project: Project) => {
    navigate(`/projects/${project.id}`)
  }, [navigate])

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return

    modal.confirm({
      title: `Delete ${selectedRowKeys.length} Project${selectedRowKeys.length > 1 ? 's' : ''}?`,
      content: `Are you sure you want to delete ${selectedRowKeys.length} selected project${selectedRowKeys.length > 1 ? 's' : ''}? This action cannot be undone.`,
      okText: 'Delete All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        setBatchLoading(true)
        bulkDeleteMutation.mutate(selectedRowKeys)
      },
    })
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

  const handleChangeStatus = (project: Project) => {
    setStatusProject(project)
    statusForm.setFieldsValue({ status: project.status })
    setStatusModalVisible(true)
  }

  const handleStatusModalOk = () => {
    statusForm.validateFields().then(values => {
      if (statusProject) {
        updateStatusMutation.mutate({
          id: statusProject.id,
          status: values.status,
        })
      }
    })
  }

  const handleStatusModalCancel = () => {
    setStatusModalVisible(false)
    setStatusProject(null)
    statusForm.resetFields()
  }

  const getActionMenuItems = useCallback((project: Project) => {
    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(project),
      },
      {
        key: 'changeStatus',
        icon: <EditOutlined />,
        label: 'Ubah Status',
        onClick: () => handleChangeStatus(project),
      },
      {
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: 'Duplikasi',
        onClick: () => handleDuplicate(project),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        danger: true,
        onClick: () => handleDelete(project.id),
      },
    ]
  }, [handleEdit, handleDelete, handleChangeStatus, handleDuplicate])

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

  const columns = useMemo(() => [
    {
      title: 'Proyek',
      key: 'project',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: unknown, project: Project) => (
        <div>
          <div className='font-semibold'>
            <Button
              type='link'
              onClick={() => handleView(project)}
              className='text-blue-600 hover:text-blue-800 p-0 font-semibold'
            >
              {project.number || `DRAFT-${project.id.slice(-6).toUpperCase()}`}
            </Button>
          </div>
          <div className='text-sm text-gray-600'>{project.description || 'No description'}</div>
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
      responsive: ['sm', 'md', 'lg'] as any,
      render: (_: unknown, project: Project) => (
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
      responsive: ['md', 'lg'] as any,
      render: (_: unknown, project: Project) => {
        const progress = calculateProjectProgress(project)

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
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: unknown, project: Project) => {
        const statusConfig = getProjectStatusConfig(project.status)
        const badgeColors = statusConfig.badgeColor

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
              {statusConfig.text}
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
      responsive: ['md', 'lg'] as any,
      render: (_: unknown, project: Project) => {
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
      responsive: ['lg'] as any,
      render: (_: unknown, project: Project) => {
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
      fixed: 'right' as const,
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      className: 'actions-column',
      render: (_: unknown, project: Project) => (
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
  ], [handleView, navigateToClient, getActionMenuItems])

  return (
    <div style={{ padding: isMobile ? '12px' : '0' }}>
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
      <div className='mb-6' style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Title level={isMobile ? 3 : 2} style={{ marginBottom: isMobile ? '4px' : '8px' }}>{t('projects.title')}</Title>

        {/* Statistics - Compact Design */}
        <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
          <Col xs={12} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ProjectOutlined />}
              iconColor='#f59e0b'
              iconBg='rgba(245, 158, 11, 0.15)'
              label='Total Proyek'
              value={stats.total}
              style={{ minHeight: '100px' }}
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <CompactMetricCard
              icon={<PlayCircleOutlined />}
              iconColor='#fa8c16'
              iconBg='rgba(250, 140, 22, 0.15)'
              label='Berlangsung'
              value={stats.inProgress}
              style={{ minHeight: '100px' }}
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CheckCircleOutlined />}
              iconColor='#52c41a'
              iconBg='rgba(82, 196, 26, 0.15)'
              label='Selesai'
              value={stats.completed}
              style={{ minHeight: '100px' }}
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CalendarOutlined />}
              iconColor='#1890ff'
              iconBg='rgba(24, 144, 255, 0.15)'
              label='Perencanaan'
              value={stats.planning}
              style={{ minHeight: '100px' }}
            />
          </Col>
        </Row>

        {/* Secondary Statistics */}
        <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
          <Col xs={12} sm={12} lg={6}>
            <CompactMetricCard
              icon={<TeamOutlined />}
              iconColor='#dc2626'
              iconBg='rgba(220, 38, 38, 0.15)'
              label='Produksi'
              value={stats.production}
              style={{ minHeight: '100px' }}
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <CompactMetricCard
              icon={<BarChartOutlined />}
              iconColor='#13c2c2'
              iconBg='rgba(19, 194, 194, 0.15)'
              label='Media Sosial'
              value={stats.socialMedia}
              style={{ minHeight: '100px' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<DollarOutlined />}
              iconColor='#3b82f6'
              iconBg='rgba(59, 130, 246, 0.15)'
              label='Budget Total'
              value={formatIDR(stats.totalBudget)}
              style={{ minHeight: '100px' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<DollarOutlined />}
              iconColor='#10b981'
              iconBg='rgba(16, 185, 129, 0.15)'
              label='Pendapatan'
              value={formatIDR(stats.totalRevenue)}
              style={{ minHeight: '100px' }}
            />
          </Col>
        </Row>

        {/* Bulk Actions Toolbar */}
        {selectedRowKeys.length > 0 && !isMobile && (
          <Card
            className='mb-4'
            size='small'
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <div className='flex justify-between items-center'>
              <Text strong style={{ color: theme.colors.text.primary }}>
                {selectedRowKeys.length} proyek dipilih
              </Text>
              <Space>
                <Button
                  size='small'
                  type='primary'
                  icon={<PlayCircleOutlined />}
                  loading={batchLoading}
                  onClick={() => handleBulkStatusUpdate('IN_PROGRESS')}
                  disabled={selectedRowKeys.filter(id => {
                    const project = filteredProjects.find(p => p.id === id)
                    return project?.status === 'PLANNING'
                  }).length === 0}
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
                  disabled={selectedRowKeys.filter(id => {
                    const project = filteredProjects.find(p => p.id === id)
                    return project?.status === 'IN_PROGRESS'
                  }).length === 0}
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
                  disabled={selectedRowKeys.filter(id => {
                    const project = filteredProjects.find(p => p.id === id)
                    return project?.status === 'IN_PROGRESS'
                  }).length === 0}
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
                >
                  Hapus ({selectedRowKeys.length})
                </Button>
                <Button
                  size='small'
                  onClick={handleClearSelection}
                >
                  Batal Pilih
                </Button>
              </Space>
            </div>
          </Card>
        )}

        {/* Controls */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[8, 12]} style={{ marginBottom: '12px' }}>
            <Col xs={24} sm={12} md={6}>
              <Input
                id='project-search'
                name='search'
                placeholder='Cari proyek...'
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ width: '100%' }}
                autoComplete='off'
                size='large'
              />
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                id='project-status-filter'
                data-testid='project-filter-button'
                placeholder='Filter status'
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
                size='large'
              >
                <Option value='PLANNING'>Perencanaan</Option>
                <Option value='IN_PROGRESS'>Berlangsung</Option>
                <Option value='COMPLETED'>Selesai</Option>
                <Option value='CANCELLED'>Dibatalkan</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                id='project-type-filter'
                data-testid='project-timeline-button'
                placeholder='Filter tipe'
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: '100%' }}
                allowClear
                size='large'
              >
                <Option value='PRODUCTION'>Produksi</Option>
                <Option value='SOCIAL_MEDIA'>Media Sosial</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <MonthPicker
                placeholder='Pilih bulan & tahun'
                value={filters.monthYear}
                onChange={value => setFilters(prev => ({ ...prev, monthYear: value }))}
                style={{ width: '100%' }}
                format='MMMM YYYY'
                allowClear
                size='large'
              />
            </Col>
            <Col xs={12} sm={12} md={3}>
              <InputNumber
                placeholder='Min'
                value={filters.amount?.[0]}
                onChange={value => setFilters(prev => ({ ...prev, amount: [value, prev.amount?.[1]] }))}
                style={{ width: '100%' }}
                formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={value => value?.replace(/Rp\s?|(\.*)/g, '')}
                size='large'
              />
            </Col>
            <Col xs={12} sm={12} md={3}>
              <InputNumber
                placeholder='Max'
                value={filters.amount?.[1]}
                onChange={value => setFilters(prev => ({ ...prev, amount: [prev.amount?.[0], value] }))}
                style={{ width: '100%' }}
                formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={value => value?.replace(/Rp\s?|(\.*)/g, '')}
                size='large'
              />
            </Col>
          </Row>

          <Row gutter={[8, 12]} justify='space-between' align='middle'>
            <Col xs={24} sm={6}>
              <Button onClick={() => setFilters({})} style={{ width: '100%' }} size='large'>
                Reset
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button
                data-testid='project-export-button'
                icon={<ExportOutlined />}
                onClick={handleExport}
                size='large'
                style={{ width: '100%' }}
              >
                Export
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button
                data-testid='create-project-button'
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size='large'
                style={{ width: '100%' }}
              >
                Project
              </Button>
            </Col>
          </Row>
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

      {/* Main Table - Conditional rendering for mobile/desktop */}
      {isMobile ? (
        <MobileTableView
          data={mobileData}
          loading={isLoading}
          entityType="projects"
          enableWhatsAppActions
          showQuickStats
          searchable
          searchFields={['number', 'title', 'client.name']}
          filters={mobileFilters}
          actions={mobileActions}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
        />
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
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
              scroll={{ x: 1200 }}
            />
          </div>
        </Card>
      )}

      {/* Status Change Modal */}
      <Modal
        title='Ubah Status Proyek'
        open={statusModalVisible}
        onOk={handleStatusModalOk}
        onCancel={handleStatusModalCancel}
        width={400}
        confirmLoading={updateStatusMutation.isPending}
        forceRender
      >
        <Form
          form={statusForm}
          layout='vertical'
          initialValues={{ status: statusProject?.status }}
        >
          <Form.Item
            label='Status Baru'
            name='status'
            rules={[{ required: true, message: 'Pilih status baru' }]}
          >
            <Select placeholder='Pilih status'>
              <Select.Option value='PLANNING'>Perencanaan</Select.Option>
              <Select.Option value='IN_PROGRESS'>Sedang Berjalan</Select.Option>
              <Select.Option value='ON_HOLD'>Ditahan</Select.Option>
              <Select.Option value='COMPLETED'>Selesai</Select.Option>
              <Select.Option value='CANCELLED'>Dibatalkan</Select.Option>
            </Select>
          </Form.Item>

          {statusProject && (
            <div
              style={{
                padding: '12px',
                backgroundColor: theme.colors.background.secondary,
                borderRadius: '8px',
                marginTop: '12px',
              }}
            >
              <Text strong>Proyek: </Text>
              <Text>{statusProject.number}</Text>
              <br />
              <Text strong>Status Saat Ini: </Text>
              <Tag color={getStatusColor(statusProject.status)}>
                {getStatusText(statusProject.status)}
              </Tag>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}
