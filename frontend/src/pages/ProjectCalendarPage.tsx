import React, { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Space,
  Tag,
  Tooltip,
  Empty,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  Segmented,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  BarsOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { formatIDR } from '../utils/currency'
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useCompleteMilestone,
  useUpdateMilestoneProgress,
} from '../hooks/useMilestones'
import { useCalendarView } from '../hooks/useCalendarView'
import { ProjectMilestone, CreateMilestoneRequest, UpdateMilestoneRequest } from '../services/milestones'
import { MonthCalendarView } from '../components/calendar/MonthCalendarView'
import { WeekCalendarView } from '../components/calendar/WeekCalendarView'
import { GanttChartView } from '../components/calendar/GanttChartView'

const { TextArea } = Input
const { RangePicker } = DatePicker

export const ProjectCalendarPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Queries and mutations
  const { data: milestones = [], isLoading, error, refetch } = useProjectMilestones(projectId!)
  const createMutation = useCreateMilestone()
  const updateMutation = useUpdateMilestone()
  const deleteMutation = useDeleteMilestone()
  const completeMutation = useCompleteMilestone()
  const progressMutation = useUpdateMilestoneProgress()

  // Calendar view management
  const { view, changeView } = useCalendarView(projectId!)

  if (!projectId) {
    return <Empty description="Project ID is required" />
  }

  const handleCreateClick = () => {
    form.resetFields()
    setEditingId(null)
    setIsModalVisible(true)
  }

  const handleEditClick = (milestone: ProjectMilestone) => {
    setEditingId(milestone.id)
    form.setFieldsValue({
      name: milestone.name,
      description: milestone.description,
      plannedStartDate: dayjs(milestone.plannedStartDate),
      plannedEndDate: dayjs(milestone.plannedEndDate),
      plannedRevenue: milestone.plannedRevenue,
      estimatedCost: milestone.estimatedCost,
      priority: milestone.priority,
      predecessorId: milestone.predecessorId,
    })
    setIsModalVisible(true)
  }

  const handleDeleteClick = (id: string) => {
    Modal.confirm({
      title: 'Delete Milestone',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this milestone?',
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        deleteMutation.mutate({ id, projectId: projectId! })
      },
    })
  }

  const handleCompleteClick = (id: string) => {
    completeMutation.mutate(id)
  }

  const handleProgressChange = (id: string, percentage: number) => {
    progressMutation.mutate({ id, percentage })
  }

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        plannedStartDate: values.plannedStartDate.toISOString(),
        plannedEndDate: values.plannedEndDate.toISOString(),
      }

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: data as UpdateMilestoneRequest,
        })
      } else {
        await createMutation.mutateAsync({
          ...data,
          projectId: projectId!,
          milestoneNumber: (milestones.length + 1),
        } as CreateMilestoneRequest)
      }

      setIsModalVisible(false)
      form.resetFields()
      setEditingId(null)
    } catch (err) {
      console.error('Error saving milestone:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'default'
      case 'IN_PROGRESS':
        return 'processing'
      case 'COMPLETED':
        return 'success'
      case 'ACCEPTED':
        return 'success'
      case 'BILLED':
        return 'cyan'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'red'
      case 'MEDIUM':
        return 'orange'
      case 'LOW':
        return 'green'
      default:
        return 'default'
    }
  }

  const columns = [
    {
      title: 'Milestone',
      dataIndex: 'milestoneNumber',
      key: 'milestoneNumber',
      width: 80,
      render: (_: any, record: ProjectMilestone) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>#{record.milestoneNumber}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.name}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>,
    },
    {
      title: 'Progress',
      dataIndex: 'completionPercentage',
      key: 'completionPercentage',
      width: 100,
      render: (percentage: number | undefined) => `${percentage || 0}%`,
    },
    {
      title: 'Planned Dates',
      key: 'dates',
      width: 160,
      render: (_: any, record: ProjectMilestone) => (
        <div style={{ fontSize: '12px' }}>
          <div>{dayjs(record.plannedStartDate).format('DD MMM YYYY')}</div>
          <div style={{ color: '#999' }}>to</div>
          <div>{dayjs(record.plannedEndDate).format('DD MMM YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Revenue',
      dataIndex: 'plannedRevenue',
      key: 'plannedRevenue',
      width: 120,
      render: (amount: number) => formatIDR(amount),
    },
    {
      title: 'Estimated Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      render: (amount: number | undefined) => (amount ? formatIDR(amount) : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: ProjectMilestone) => (
        <Space size="small">
          {record.status !== 'COMPLETED' && record.status !== 'ACCEPTED' && (
            <Tooltip title="Mark Complete">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteClick(record.id)}
                loading={completeMutation.isPending}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record.id)}
              loading={deleteMutation.isPending}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const totalPlannedRevenue = milestones.reduce((sum, m) => sum + m.plannedRevenue, 0)
  const totalEstimatedCost = milestones.reduce((sum, m) => sum + (m.estimatedCost || 0), 0)
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED' || m.status === 'ACCEPTED').length

  const handleMilestoneClick = (milestone: ProjectMilestone) => {
    handleEditClick(milestone)
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Project Timeline & Milestones</h1>
          <p style={{ color: '#666', margin: 0 }}>Manage project milestones and track progress</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateClick}
          size="large"
        >
          New Milestone
        </Button>
      </div>

      {error && (
        <Alert
          message="Error loading milestones"
          description={error instanceof Error ? error.message : 'Something went wrong'}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Milestones"
              value={milestones.length}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedMilestones}
              suffix={`/ ${milestones.length}`}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={totalPlannedRevenue}
              formatter={(value) => formatIDR(value as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Costs"
              value={totalEstimatedCost}
              formatter={(value) => formatIDR(value as number)}
            />
          </Card>
        </Col>
      </Row>

      {/* View Toggle */}
      <Card style={{ marginBottom: '24px', padding: '12px' }}>
        <Space>
          <span style={{ fontWeight: 500, marginRight: '8px' }}>View:</span>
          <Segmented
            value={view}
            onChange={(value) => changeView(value as any)}
            options={[
              {
                label: (
                  <span>
                    <CalendarOutlined /> Month
                  </span>
                ),
                value: 'month',
              },
              {
                label: (
                  <span>
                    <BarsOutlined /> Week
                  </span>
                ),
                value: 'week',
              },
              {
                label: (
                  <span>
                    <LineChartOutlined /> Gantt
                  </span>
                ),
                value: 'gantt',
              },
            ]}
          />
        </Space>
      </Card>

      {/* Calendar Views */}
      {isLoading ? (
        <Spin style={{ display: 'flex', justifyContent: 'center', padding: '60px' }} />
      ) : milestones.length === 0 ? (
        <Card>
          <Empty description="No milestones yet" />
        </Card>
      ) : (
        <>
          {view === 'month' && (
            <MonthCalendarView
              milestones={milestones}
              onEventClick={handleMilestoneClick}
            />
          )}
          {view === 'week' && (
            <WeekCalendarView
              milestones={milestones}
              onEventClick={handleMilestoneClick}
            />
          )}
          {view === 'gantt' && (
            <GanttChartView
              milestones={milestones}
              onEventClick={handleMilestoneClick}
            />
          )}
        </>
      )}

      {/* Old Table View - Now Hidden by Default but kept for reference */}
      <Card
        title="All Milestones (Table View)"
        style={{ marginTop: '32px' }}
        extra={
          <Button
            type="link"
            onClick={() => {
              // Toggle table visibility if needed
            }}
          >
            Show Details
          </Button>
        }
      >
        {isLoading ? (
          <Spin style={{ display: 'flex', justifyContent: 'center', padding: '40px' }} />
        ) : milestones.length === 0 ? (
          <Empty description="No milestones yet" />
        ) : (
          <Table
            columns={columns}
            dataSource={milestones}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}
      </Card>

      <Modal
        title={editingId ? 'Edit Milestone' : 'Create Milestone'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
          setEditingId(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Milestone Name"
            rules={[{ required: true, message: 'Please enter milestone name' }]}
          >
            <Input placeholder="e.g., Design Phase" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Description of milestone deliverables" />
          </Form.Item>

          <Form.Item
            label="Planned Dates"
            required
          >
            <Form.Item
              name="plannedStartDate"
              rules={[{ required: true, message: 'Start date is required' }]}
              noStyle
            >
              <DatePicker style={{ width: '48%', marginRight: '4%' }} />
            </Form.Item>
            <Form.Item
              name="plannedEndDate"
              rules={[{ required: true, message: 'End date is required' }]}
              noStyle
            >
              <DatePicker style={{ width: '48%' }} />
            </Form.Item>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="plannedRevenue"
                label="Planned Revenue"
                rules={[{ required: true, message: 'Revenue is required' }]}
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="estimatedCost"
                label="Estimated Cost"
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                initialValue="MEDIUM"
              >
                <Select
                  options={[
                    { label: 'Low', value: 'LOW' },
                    { label: 'Medium', value: 'MEDIUM' },
                    { label: 'High', value: 'HIGH' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="predecessorId"
                label="Predecessor Milestone"
              >
                <Select
                  placeholder="None"
                  allowClear
                  options={milestones
                    .filter(m => m.id !== editingId)
                    .map(m => ({
                      label: `#${m.milestoneNumber} - ${m.name}`,
                      value: m.id,
                    }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
