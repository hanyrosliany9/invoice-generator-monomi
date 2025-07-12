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
import { Project, projectService } from '../services/projects'
import { clientService } from '../services/clients'
import { EntityBreadcrumb, RelatedEntitiesPanel } from '../components/navigation'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  // Queries
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setModalVisible(false)
      form.resetFields()
      message.success(t('messages.success.created', { item: 'Proyek' }))
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setModalVisible(false)
      setEditingProject(null)
      form.resetFields()
      message.success(t('messages.success.updated', { item: 'Proyek' }))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success(t('messages.success.deleted', { item: 'Proyek' }))
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => projectService.deleteProject(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedRowKeys([])
      setBatchLoading(false)
      message.success(`Berhasil menghapus ${selectedRowKeys.length} proyek`)
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Gagal menghapus proyek')
    }
  })

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD' }) => {
      await Promise.all(ids.map(id => projectService.updateProject(id, { status })))
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedRowKeys([])
      setBatchLoading(false)
      const statusText = {
        'PLANNING': 'perencanaan',
        'IN_PROGRESS': 'sedang berjalan',
        'COMPLETED': 'selesai',
        'CANCELLED': 'dibatalkan',
        'ON_HOLD': 'ditahan'
      }[status] || status
      message.success(`Berhasil mengubah status ${selectedRowKeys.length} proyek menjadi ${statusText}`)
    },
    onError: () => {
      setBatchLoading(false)
      message.error('Gagal mengubah status proyek')
    }
  })

  // Handle URL parameters for direct navigation
  useEffect(() => {
    // Handle viewProject query parameter (show specific project detail)
    const viewProjectId = searchParams.get("projectId")
    if (viewProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === viewProjectId)
      if (project) {
        setSelectedProject(project)
        setViewModalVisible(true)
        // Clear the URL parameter after opening modal
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete("projectId")
        navigate("/projects", { replace: true })
      }
    }
  }, [searchParams, projects, navigate])

  // Handle clientId query parameter for filtering
  const clientFilter = searchParams.get("clientId")
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
    const matchesSearch = safeString(project?.number).toLowerCase().includes(searchLower) ||
                         safeString(project?.description).toLowerCase().includes(searchLower) ||
                         safeString(project?.client?.name).toLowerCase().includes(searchLower) ||
                         safeString(project?.client?.company).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || project?.status === statusFilter
    const matchesType = !typeFilter || project?.type === typeFilter
    const matchesClient = !filteredByClient || project?.clientId === filteredByClient
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
    production: safeProjects.filter(p => p?.type === 'PRODUCTION').length,
    socialMedia: safeProjects.filter(p => p?.type === 'SOCIAL_MEDIA').length,
    totalBudget: safeProjects.reduce((sum, p) => sum + safeNumber(p?.estimatedBudget || p?.basePrice), 0),
    totalActual: safeProjects.reduce((sum, p) => sum + safeNumber(p?.basePrice || p?.estimatedBudget), 0),
    totalRevenue: safeProjects.reduce((sum, p) => sum + safeNumber(p?.basePrice || p?.estimatedBudget), 0),
    totalPending: safeProjects.reduce((sum, p) => sum + safeNumber(p?.basePrice || p?.estimatedBudget), 0)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'blue',
      inProgress: 'orange',
      completed: 'green',
      cancelled: 'red'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      planning: <CalendarOutlined />,
      inProgress: <PlayCircleOutlined />,
      completed: <CheckCircleOutlined />,
      cancelled: <StopOutlined />
    }
    return icons[status as keyof typeof icons] || <ClockCircleOutlined />
  }

  const getTypeColor = (type: string) => {
    return type === 'production' ? 'purple' : 'cyan'
  }

  const getTypeText = (type: string) => {
    return type === 'production' ? 'Produksi' : 'Media Sosial'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#52c41a'
    if (progress >= 75) return '#1890ff'
    if (progress >= 50) return '#fa8c16'
    return '#f5222d'
  }

  const isProjectOverdue = (project: Project) => {
    return project.status !== 'COMPLETED' && project.status !== 'CANCELLED' && 
           dayjs().isAfter(dayjs(project.endDate))
  }

  const getDaysRemaining = (endDate: string) => {
    return dayjs(endDate).diff(dayjs(), 'days')
  }

  // Navigation function for clickable table links
  const navigateToClient = useCallback((clientId: string) => {
    navigate(`/clients?clientId=${clientId}`)
  }, [navigate])

  const handleCreate = () => {
    setEditingProject(null)
    setModalVisible(true)
    form.resetFields()
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setModalVisible(true)
    form.setFieldsValue({
      ...project,
      dateRange: [dayjs(project.startDate), dayjs(project.endDate)]
    })
  }

  const handleView = (project: Project) => {
    setSelectedProject(project)
    setViewModalVisible(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return
    setBatchLoading(true)
    bulkDeleteMutation.mutate(selectedRowKeys)
  }

  const handleBulkStatusUpdate = (status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD') => {
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
      endDate: values.dateRange[1].endOf('day').toISOString()
    }
    delete data.dateRange

    // Clean undefined values and empty strings to prevent validation errors
    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null || data[key] === '') {
        delete data[key]
      }
    })

    console.log('Submitting project data:', JSON.stringify(data, null, 2))

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data })
    } else {
      createMutation.mutate({ ...data, status: 'PLANNING' })
    }
  }

  const getActionMenuItems = (project: Project) => {
    return [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(project)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(project)
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        danger: true,
        onClick: () => handleDelete(project.id)
      }
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
          <div className="font-semibold">{project.number}</div>
          <div className="text-sm text-gray-600">{project.description}</div>
          <div className="mt-1">
            <Tag color={getTypeColor(project.type)}>
              {getTypeText(project.type)}
            </Tag>
          </div>
        </div>
      ),
      sorter: (a: Project, b: Project) => a.number.localeCompare(b.number)
    },
    {
      title: 'Klien',
      key: 'clientName',
      render: (_: any, project: Project) => (
        <Button 
          type="link" 
          onClick={() => navigateToClient(project.client?.id || '')}
          className="text-blue-600 hover:text-blue-800 p-0"
          disabled={!project.client?.id}
        >
          {project.client?.name || 'N/A'}
        </Button>
      ),
      sorter: (a: Project, b: Project) => (a.client?.name || '').localeCompare(b.client?.name || '')
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_: any, project: Project) => {
        const calculateProgress = (project: Project) => {
          // Calculate progress based on status and dates
          const now = new Date()
          const startDate = new Date(project.startDate)
          const endDate = new Date(project.endDate)
          
          // Base progress on status
          let statusProgress = 0
          switch (project.status) {
            case 'PLANNING':
              statusProgress = 5
              break
            case 'IN_PROGRESS':
              // Calculate based on time elapsed
              const totalDuration = endDate.getTime() - startDate.getTime()
              const elapsedDuration = now.getTime() - startDate.getTime()
              const timeProgress = Math.min(Math.max((elapsedDuration / totalDuration) * 100, 10), 85)
              statusProgress = Math.round(timeProgress)
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
              size="small"
              strokeColor={getProgressColor(progress)}
            />
            <div className="text-sm text-gray-500 mt-1">
              {progress}%
            </div>
          </div>
        )
      },
      sorter: (a: Project, b: Project) => {
        const getProgress = (project: Project) => {
          switch (project.status) {
            case 'PLANNING': return 5
            case 'IN_PROGRESS': return 50
            case 'COMPLETED': return 100
            case 'CANCELLED': return 0
            case 'ON_HOLD': return 25
            default: return 0
          }
        }
        return getProgress(a) - getProgress(b)
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, project: Project) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            'PLANNING': 'Perencanaan',
            'IN_PROGRESS': 'Berlangsung',
            'COMPLETED': 'Selesai',
            'CANCELLED': 'Dibatalkan',
            'ON_HOLD': 'Ditahan'
          }
          return statusMap[status as keyof typeof statusMap] || status
        }
        
        return (
          <div>
            <Tag color={getStatusColor(project.status.toLowerCase())} icon={getStatusIcon(project.status.toLowerCase())}>
              {getStatusText(project.status)}
            </Tag>
            {isProjectOverdue(project) && (
              <div className="mt-1">
                <Badge status="error" text={<span className="text-xs">Terlambat</span>} />
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
        { text: 'Ditahan', value: 'ON_HOLD' }
      ],
      onFilter: (value: any, record: Project) => record.status === value
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (_: any, project: Project) => {
        const daysRemaining = getDaysRemaining(project.endDate)
        const isOverdue = isProjectOverdue(project)
        
        return (
          <div className="text-sm">
            <div>Mulai: {dayjs(project.startDate).format('DD/MM/YYYY')}</div>
            <div>Selesai: {dayjs(project.endDate).format('DD/MM/YYYY')}</div>
            {project.status !== 'COMPLETED' && project.status !== 'CANCELLED' && (
              <div className={`mt-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                {isOverdue ? `Terlambat ${Math.abs(daysRemaining)} hari` : `${daysRemaining} hari lagi`}
              </div>
            )}
          </div>
        )
      },
      sorter: (a: Project, b: Project) => dayjs(a.endDate).unix() - dayjs(b.endDate).unix()
    },
    {
      title: 'Nilai Proyek',
      key: 'budget',
      render: (_: any, project: Project) => (
        <div className="text-sm">
          <div>Nilai: <Text strong>{formatIDR(project.basePrice || project.estimatedBudget || 0)}</Text></div>
          <div>Aktual: <Text strong>{formatIDR(project.basePrice || project.estimatedBudget || 0)}</Text></div>
          <div className="mt-1">
            <Text type="success">Dibayar: {formatIDR(project.basePrice || project.estimatedBudget || 0)}</Text>
          </div>
          {false && (
            <div>
              <Text type="warning">Pending: {formatIDR(project.basePrice || project.estimatedBudget || 0)}</Text>
            </div>
          )}
        </div>
      ),
      sorter: (a: Project, b: Project) => parseFloat(a.estimatedBudget || a.basePrice || '0') - parseFloat(b.estimatedBudget || b.basePrice || '0')
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      render: (_: any, project: Project) => (
        <Dropdown
          menu={{ items: getActionMenuItems(project) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <Title level={2}>{t('projects.title')}</Title>
        
        <WorkflowIndicator 
          currentEntity="project" 
          entityData={selectedProject || {}} 
          compact 
          className="mb-4"
        />
        
        {/* Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Total Proyek"
                value={stats.total}
                prefix={<ProjectOutlined style={{ 
                  fontSize: '24px', 
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Berlangsung"
                value={stats.inProgress}
                prefix={<PlayCircleOutlined style={{ 
                  fontSize: '24px', 
                  color: '#fa8c16',
                  background: 'rgba(250, 140, 22, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Selesai"
                value={stats.completed}
                prefix={<CheckCircleOutlined style={{ 
                  fontSize: '24px', 
                  color: '#52c41a',
                  background: 'rgba(82, 196, 26, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Perencanaan"
                value={stats.planning}
                prefix={<CalendarOutlined style={{ 
                  fontSize: '24px', 
                  color: '#1890ff',
                  background: 'rgba(24, 144, 255, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Type Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Produksi"
                value={stats.production}
                prefix={<TeamOutlined style={{ 
                  fontSize: '24px', 
                  color: '#722ed1',
                  background: 'rgba(114, 46, 209, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Media Sosial"
                value={stats.socialMedia}
                prefix={<BarChartOutlined style={{ 
                  fontSize: '24px', 
                  color: '#13c2c2',
                  background: 'rgba(19, 194, 194, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              color: '#ffffff'
            }}>
              <Statistic
                title="Budget Total"
                value={formatIDR(stats.totalBudget)}
                prefix={<DollarOutlined style={{ 
                  fontSize: '32px', 
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '12px',
                  borderRadius: '16px'
                }} />}
                valueStyle={{ 
                  color: '#ffffff', 
                  fontSize: '32px', 
                  fontWeight: 800 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff'
            }}>
              <Statistic
                title="Pendapatan"
                value={formatIDR(stats.totalRevenue)}
                prefix={<DollarOutlined style={{ 
                  fontSize: '32px', 
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '12px',
                  borderRadius: '16px'
                }} />}
                valueStyle={{ 
                  color: '#ffffff', 
                  fontSize: '32px', 
                  fontWeight: 800 
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bulk Actions Toolbar */}
        {selectedRowKeys.length > 0 && (
          <Card className="mb-4 border-blue-200 bg-blue-50" size="small">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Text strong className="text-blue-700">
                  {selectedRowKeys.length} proyek dipilih
                </Text>
                <div className="flex items-center space-x-2">
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={batchLoading}
                    onClick={() => handleBulkStatusUpdate('IN_PROGRESS')}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Mulai ({selectedRowKeys.filter(id => {
                      const project = filteredProjects.find(p => p.id === id)
                      return project?.status === 'PLANNING'
                    }).length})
                  </Button>
                  <Button
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={batchLoading}
                    onClick={() => handleBulkStatusUpdate('COMPLETED')}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Selesaikan ({selectedRowKeys.filter(id => {
                      const project = filteredProjects.find(p => p.id === id)
                      return project?.status === 'IN_PROGRESS'
                    }).length})
                  </Button>
                  <Button
                    size="small"
                    icon={<StopOutlined />}
                    loading={batchLoading}
                    onClick={() => handleBulkStatusUpdate('ON_HOLD')}
                    disabled={selectedRowKeys.length === 0}
                  >
                    Tahan ({selectedRowKeys.filter(id => {
                      const project = filteredProjects.find(p => p.id === id)
                      return project?.status === 'IN_PROGRESS'
                    }).length})
                  </Button>
                  <Button
                    size="small"
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
                size="small"
                type="text"
                onClick={handleClearSelection}
                className="text-gray-500 hover:text-gray-700"
              >
                Batal
              </Button>
            </div>
          </Card>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <Space>
            <Input
              placeholder="Cari proyek..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              data-testid="project-filter-button"
              placeholder="Filter status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="PLANNING">Perencanaan</Option>
              <Option value="IN_PROGRESS">Berlangsung</Option>
              <Option value="COMPLETED">Selesai</Option>
              <Option value="CANCELLED">Dibatalkan</Option>
            </Select>
            <Select
              data-testid="project-timeline-button"
              placeholder="Filter tipe"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="production">Produksi</Option>
              <Option value="socialMedia">Media Sosial</Option>
            </Select>
          </Space>
          
          <Space>
            <Button data-testid="project-export-button" icon={<ExportOutlined />}>Export</Button>
            <Button
              data-testid="create-project-button"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('projects.create')}
            </Button>
          </Space>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredProjects}
          loading={isLoading}
          rowKey="id"
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
          setModalVisible(false)
          setEditingProject(null)
          form.resetFields()
        }}
        footer={null}
        width={800}
      >
        <Form
          data-testid="project-form"
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Form.Item
            name="clientId"
            label="Klien"
            rules={[{ required: true, message: 'Pilih klien' }]}
          >
            <Select placeholder="Pilih klien">
              {safeArray(clients).map(client => (
                <Option key={client.id} value={client.id}>
                  {client.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={t('projects.description')}
            rules={[{ required: true, message: 'Deskripsi proyek wajib diisi' }]}
          >
            <Input placeholder="Deskripsi singkat proyek" />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('projects.type')}
            rules={[{ required: true, message: 'Pilih tipe proyek' }]}
          >
            <Select placeholder="Pilih tipe proyek">
              <Option value="PRODUCTION">Produksi</Option>
              <Option value="SOCIAL_MEDIA">Media Sosial</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Produk & Harga">
            <Form.List name="products">
              {(fields, { add, remove }) => (
                <div>
                  {fields.map((field) => (
                    <Card 
                      key={field.key} 
                      size="small" 
                      style={{ marginBottom: 8 }}
                      extra={
                        <Button 
                          type="text" 
                          danger 
                          size="small" 
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
                            label="Nama Produk"
                            rules={[{ required: true, message: 'Nama produk wajib diisi' }]}
                          >
                            <Input placeholder="Nama produk/layanan" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name={[field.name, 'quantity']}
                            fieldKey={[field.fieldKey ?? field.name, 'quantity']}
                            label="Qty"
                            rules={[{ required: true, message: 'Qty wajib diisi' }]}
                          >
                            <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name={[field.name, 'price']}
                            fieldKey={[field.fieldKey ?? field.name, 'price']}
                            label="Harga"
                            rules={[{ required: true, message: 'Harga wajib diisi' }]}
                          >
                            <InputNumber
                              style={{ width: '100%' }}
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              parser={(value) => value!.replace(/\./g, '')}
                              placeholder="0"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        name={[field.name, 'description']}
                        fieldKey={[field.fieldKey ?? field.name, 'description']}
                        label="Deskripsi"
                        rules={[{ required: true, message: 'Deskripsi produk wajib diisi' }]}
                      >
                        <Input.TextArea rows={2} placeholder="Deskripsi produk/layanan" />
                      </Form.Item>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
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
            name="dateRange"
            label="Periode Proyek"
            rules={[{ required: true, message: 'Pilih periode proyek' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          {editingProject && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                >
                  <Select>
                    <Option value="PLANNING">Perencanaan</Option>
                    <Option value="IN_PROGRESS">Berlangsung</Option>
                    <Option value="COMPLETED">Selesai</Option>
                    <Option value="CANCELLED">Dibatalkan</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="progress"
                  label="Progress (%)"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="notes"
            label="Catatan"
          >
            <TextArea rows={3} placeholder="Catatan tambahan tentang proyek..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => {
                setModalVisible(false)
                setEditingProject(null)
                form.resetFields()
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={`Detail Proyek - ${selectedProject?.number}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Tutup
          </Button>
        ]}
        width={900}
      >
        {selectedProject && (
          <div className="space-y-4">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <EntityBreadcrumb
                entityType="project"
                entityData={selectedProject}
                className="mb-2"
              />
              <RelatedEntitiesPanel
                entityType="project"
                entityData={selectedProject}
                className="mb-4"
              />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Nomor Proyek:</Text>
                <div>{selectedProject.number}</div>
              </Col>
              <Col span={12}>
                <Text strong>Klien:</Text>
                <div>{selectedProject.client?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{selectedProject.client?.company}</div>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Tipe:</Text>
                <div>
                  <Tag color={getTypeColor(selectedProject.type)}>
                    {getTypeText(selectedProject.type)}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>
                <div>
                  <Tag color={getStatusColor(selectedProject.status)} icon={getStatusIcon(selectedProject.status)}>
                    {(() => {
                      const statusMap = {
                        'PLANNING': 'Perencanaan',
                        'IN_PROGRESS': 'Sedang Berjalan',
                        'ON_HOLD': 'Ditunda',
                        'COMPLETED': 'Selesai',
                        'CANCELLED': 'Dibatalkan'
                      }
                      return statusMap[selectedProject.status as keyof typeof statusMap] || selectedProject.status
                    })()} 
                  </Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Text strong>Deskripsi:</Text>
                <div>{selectedProject.description}</div>
              </Col>
            </Row>

            {selectedProject.output && (
              <Row gutter={16}>
                <Col span={24}>
                  <Text strong>Output:</Text>
                  <div>{selectedProject.output}</div>
                </Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Tanggal Mulai:</Text>
                <div>{dayjs(selectedProject.startDate).format('DD/MM/YYYY')}</div>
              </Col>
              <Col span={12}>
                <Text strong>Tanggal Selesai:</Text>
                <div>{dayjs(selectedProject.endDate).format('DD/MM/YYYY')}</div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Progress:</Text>
                <div className="mt-2">
                  <Progress percent={0} />
                </div>
              </Col>
              <Col span={12}>
              </Col>
            </Row>

            <Divider />

            <Title level={4}>Statistik Keuangan</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Quotations"
                    value={selectedProject._count?.quotations || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Invoices"
                    value={selectedProject._count?.invoices || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Budget Aktual"
                    value={formatIDR(0)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Sisa Budget"
                    value={formatIDR(selectedProject.estimatedBudget || selectedProject.basePrice || 0)}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            <Title level={4}>Tim Proyek</Title>
            <Row gutter={16}>
              {/* Team members not available in current Project interface */}
              <Col span={24}>
                <Text>Tim proyek tidak tersedia</Text>
              </Col>
            </Row>

            {selectedProject.output && (
              <div className="mt-4">
                <Text strong>Output:</Text>
                <div>{selectedProject.output}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}