import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  App,
  Progress,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { ProjectMilestoneTimeline, ProjectMilestoneItem } from './ProjectMilestoneTimeline'
import {
  useProjectMilestones,
  useDeleteMilestone,
  useCompleteMilestone,
  useUpdateMilestoneProgress,
} from '../../hooks/useMilestones'
import { ProjectMilestone } from '../../services/milestones'
import { formatIDR } from '../../utils/currency'
import { MilestoneFormModal } from './MilestoneFormModal'

interface MilestoneManagementPanelProps {
  projectId: string
  projectBudget: number
  onRefresh: () => void
}

export const MilestoneManagementPanel: React.FC<MilestoneManagementPanelProps> = ({
  projectId,
  projectBudget,
  onRefresh,
}) => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | undefined>()

  // Queries and mutations
  const { data: milestones = [], isLoading } = useProjectMilestones(projectId)
  const deleteMutation = useDeleteMilestone()
  const completeMutation = useCompleteMilestone()
  const progressMutation = useUpdateMilestoneProgress()

  // Calculate statistics
  const stats = useMemo(() => {
    const total = milestones.length
    const completed = milestones.filter(m => m.status === 'COMPLETED').length
    const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length
    const pending = milestones.filter(m => m.status === 'PENDING').length

    return { total, completed, inProgress, pending }
  }, [milestones])

  // Event handlers
  const handleCreate = () => {
    setSelectedMilestone(undefined)
    setModalOpen(true)
  }

  const handleEdit = (milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Milestone',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this milestone? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({ id, projectId })
          message.success('Milestone deleted successfully')
          onRefresh()
        } catch (error) {
          message.error('Failed to delete milestone')
        }
      },
    })
  }

  const handleComplete = async (id: string) => {
    try {
      await completeMutation.mutateAsync(id)
      message.success('Milestone marked as completed')
      onRefresh()
    } catch (error) {
      message.error('Failed to complete milestone')
    }
  }

  const handleViewCalendar = () => {
    navigate(`/projects/${projectId}/calendar`)
  }

  const handleMilestoneClick = (milestone: ProjectMilestoneItem) => {
    // Find the full milestone object from the milestones array
    const fullMilestone = milestones.find(m => m.id === milestone.id)
    if (fullMilestone) {
      handleEdit(fullMilestone)
    }
  }

  // Convert ProjectMilestone to ProjectMilestoneItem for the timeline component
  const timelineMilestones = useMemo(() => {
    return milestones.map(milestone => ({
      id: milestone.id,
      milestoneNumber: milestone.milestoneNumber,
      name: milestone.name,
      nameId: milestone.nameId,
      status: milestone.status,
      plannedStartDate: milestone.plannedStartDate,
      plannedEndDate: milestone.plannedEndDate,
      actualStartDate: milestone.actualStartDate,
      actualEndDate: milestone.actualEndDate,
      plannedRevenue: milestone.plannedRevenue,
      recognizedRevenue: milestone.recognizedRevenue,
      deliverables: milestone.deliverables ? JSON.parse(milestone.deliverables) : undefined,
    }))
  }, [milestones])

  const handleSave = () => {
    setModalOpen(false)
    setSelectedMilestone(undefined)
    onRefresh()
  }

  const handleCancel = () => {
    setModalOpen(false)
    setSelectedMilestone(undefined)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'IN_PROGRESS':
        return 'processing'
      case 'PENDING':
        return 'warning'
      case 'ACCEPTED':
        return 'cyan'
      case 'BILLED':
        return 'purple'
      default:
        return 'default'
    }
  }

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed'
      case 'IN_PROGRESS':
        return 'In Progress'
      case 'PENDING':
        return 'Pending'
      case 'ACCEPTED':
        return 'Accepted'
      case 'BILLED':
        return 'Billed'
      default:
        return status
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'red'
      case 'MEDIUM':
        return 'orange'
      case 'LOW':
        return 'blue'
      default:
        return 'default'
    }
  }

  // Table columns - operational fields only (no financial fields)
  const columns = [
    {
      title: '#',
      dataIndex: 'milestoneNumber',
      key: 'milestoneNumber',
      width: 60,
      sorter: (a: ProjectMilestone, b: ProjectMilestone) => a.milestoneNumber - b.milestoneNumber,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: ProjectMilestone) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Planned Dates',
      key: 'plannedDates',
      width: 180,
      render: (_: any, record: ProjectMilestone) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            <strong>Start:</strong> {dayjs(record.plannedStartDate).format('DD/MM/YYYY')}
          </div>
          <div style={{ fontSize: '12px' }}>
            <strong>End:</strong> {dayjs(record.plannedEndDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'completionPercentage',
      key: 'completionPercentage',
      width: 150,
      render: (percentage: number) => (
        <Progress
          percent={percentage || 0}
          size="small"
          status={percentage === 100 ? 'success' : 'active'}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ProjectMilestone) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          {record.status !== 'COMPLETED' && (
            <Tooltip title="Mark Complete">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleComplete(record.id)}
                size="small"
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Statistics Row */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Milestones"
              value={stats.total}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Timeline Visualization - USE ORPHANED COMPONENT! */}
      <ProjectMilestoneTimeline
        projectId={projectId}
        milestones={timelineMilestones}
        onMilestoneClick={handleMilestoneClick}
        isLoading={isLoading}
      />

      {/* Action Buttons */}
      <Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          New Milestone
        </Button>
        <Button
          icon={<CalendarOutlined />}
          onClick={handleViewCalendar}
        >
          View Calendar
        </Button>
      </Space>

      {/* Table View - NO financial columns */}
      <Card title="Milestones List">
        <Table
          dataSource={milestones}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} milestones`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Modal - Simplified Form */}
      <MilestoneFormModal
        open={modalOpen}
        milestone={selectedMilestone}
        projectId={projectId}
        projectBudget={projectBudget}
        availableMilestones={milestones}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </Space>
  )
}
