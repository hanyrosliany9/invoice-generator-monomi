import React, { useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Tag,
  Space,
  Empty,
  Statistic,
  Button,
  Tooltip,
  Badge,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { formatIDR } from '../../utils/currency'

export interface ProjectMilestoneItem {
  id: string
  milestoneNumber: number
  name: string
  nameId?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  plannedRevenue?: number
  recognizedRevenue?: number
  deliverables?: string[]
}

interface ProjectMilestoneTimelineProps {
  projectId: string
  projectName?: string
  milestones: ProjectMilestoneItem[]
  onMilestoneClick?: (milestone: ProjectMilestoneItem) => void
  isLoading?: boolean
  className?: string
}

/**
 * ProjectMilestoneTimeline Component
 *
 * Displays a simplified, lightweight timeline of project milestones.
 * NOT a Gantt chart - just a clean horizontal timeline for Indonesian business users.
 *
 * Features:
 * - Horizontal timeline view
 * - Status indicators (pending, in-progress, completed)
 * - Revenue tracking
 * - Mobile-friendly
 */
export const ProjectMilestoneTimeline: React.FC<ProjectMilestoneTimelineProps> = ({
  projectId,
  projectName,
  milestones,
  onMilestoneClick,
  isLoading = false,
  className,
}) => {
  const { t } = useTranslation()

  // Calculate timeline metrics
  const metrics = useMemo(() => {
    const completed = milestones.filter(m => m.status === 'COMPLETED').length
    const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length
    const pending = milestones.filter(m => m.status === 'PENDING').length

    const totalPlannedRevenue = milestones.reduce(
      (sum, m) => sum + (m.plannedRevenue || 0),
      0
    )
    const totalRecognizedRevenue = milestones.reduce(
      (sum, m) => sum + (m.recognizedRevenue || 0),
      0
    )

    return {
      completed,
      inProgress,
      pending,
      completionPercentage: Math.round((completed / milestones.length) * 100),
      totalPlannedRevenue,
      totalRecognizedRevenue,
    }
  }, [milestones])

  if (!milestones || milestones.length === 0) {
    return (
      <Card title='Project Timeline' className={className}>
        <Empty description='No milestones found' />
      </Card>
    )
  }

  // Sort milestones by planned end date
  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateA = a.actualEndDate || a.plannedEndDate || '9999-12-31'
    const dateB = b.actualEndDate || b.plannedEndDate || '9999-12-31'
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })

  // Get earliest and latest dates for timeline scale
  const allDates = sortedMilestones
    .filter(m => m.plannedEndDate)
    .map(m => new Date(m.plannedEndDate!).getTime())
  const minDate = Math.min(...allDates)
  const maxDate = Math.max(...allDates)
  const dateRange = maxDate - minDate

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'IN_PROGRESS':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'PENDING':
      default:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'IN_PROGRESS':
        return 'processing'
      case 'PENDING':
      default:
        return 'warning'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed'
      case 'IN_PROGRESS':
        return 'In Progress'
      case 'PENDING':
      default:
        return 'Pending'
    }
  }

  // Calculate milestone position on timeline (0-100%)
  const getMilestonePosition = (milestone: ProjectMilestoneItem) => {
    if (!milestone.plannedEndDate) return 0
    const milestoneDate = new Date(milestone.plannedEndDate).getTime()
    if (dateRange === 0) return 50
    return ((milestoneDate - minDate) / dateRange) * 100
  }

  return (
    <div className={className}>
      {/* Summary Stats */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Statistic
              title='Total Milestones'
              value={milestones.length}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title='Completed'
              value={metrics.completed}
              suffix={`/ ${milestones.length}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title='In Progress'
              value={metrics.inProgress}
              suffix={`/ ${milestones.length}`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title='Completion'
              value={metrics.completionPercentage}
              suffix='%'
            />
          </Col>
        </Row>
      </Card>

      {/* Horizontal Timeline */}
      <Card title='Timeline' style={{ marginBottom: '24px' }}>
        {/* Desktop Timeline View */}
        <div
          style={{
            display: 'none',
            marginBottom: '32px',
            '@media (min-width: 768px)': {
              display: 'block',
            },
          }}
        >
          <div
            style={{
              position: 'relative',
              height: '4px',
              backgroundColor: '#f0f0f0',
              marginBottom: '32px',
              borderRadius: '2px',
            }}
          >
            {/* Timeline bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                backgroundColor: '#1890ff',
                borderRadius: '2px',
                width: `${metrics.completionPercentage}%`,
              }}
            />

            {/* Milestone markers */}
            {sortedMilestones.map((milestone, index) => {
              const position = getMilestonePosition(milestone)
              return (
                <Tooltip
                  key={milestone.id}
                  title={`${milestone.nameId || milestone.name} - ${getStatusLabel(milestone.status)}`}
                >
                  <div
                    onClick={() => onMilestoneClick?.(milestone)}
                    style={{
                      position: 'absolute',
                      left: `${position}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '3px solid',
                      borderColor:
                        milestone.status === 'COMPLETED'
                          ? '#52c41a'
                          : milestone.status === 'IN_PROGRESS'
                            ? '#1890ff'
                            : '#faad14',
                      cursor: 'pointer',
                      zIndex: 2,
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform =
                        'translate(-50%, -50%) scale(1.3)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform =
                        'translate(-50%, -50%) scale(1)'
                    }}
                  />
                </Tooltip>
              )
            })}
          </div>

          {/* Month labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#666',
              marginBottom: '24px',
            }}
          >
            {sortedMilestones
              .filter((_, index) => index === 0 || index === sortedMilestones.length - 1)
              .map(milestone => (
                <div key={milestone.id}>
                  {milestone.plannedEndDate
                    ? dayjs(milestone.plannedEndDate).format('MMM YYYY')
                    : '-'}
                </div>
              ))}
          </div>
        </div>
      </Card>

      {/* Milestones List */}
      <Card title='Milestone Details'>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedMilestones.map((milestone, index) => (
            <div
              key={milestone.id}
              onClick={() => onMilestoneClick?.(milestone)}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                padding: '16px',
                backgroundColor:
                  milestone.status === 'COMPLETED'
                    ? '#f6ffed'
                    : milestone.status === 'IN_PROGRESS'
                      ? '#e6f7ff'
                      : '#fffbe6',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 4px 12px rgba(0, 0, 0, 0.1)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              {/* Header with status */}
              <Row align='middle' gutter={16} style={{ marginBottom: '12px' }}>
                <Col flex='auto'>
                  <Space>
                    {getStatusIcon(milestone.status)}
                    <Badge
                      count={milestone.milestoneNumber}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    <span style={{ fontWeight: '600', fontSize: '16px' }}>
                      {milestone.nameId || milestone.name}
                    </span>
                    <Tag color={getStatusColor(milestone.status)}>
                      {getStatusLabel(milestone.status)}
                    </Tag>
                  </Space>
                </Col>
                <Col>
                  <RightOutlined style={{ color: '#999' }} />
                </Col>
              </Row>

              {/* Timeline info */}
              <Row gutter={24} style={{ marginBottom: '12px' }}>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Planned End
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {milestone.plannedEndDate
                      ? dayjs(milestone.plannedEndDate).format('DD/MM/YYYY')
                      : '-'}
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Actual End
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {milestone.actualEndDate
                      ? dayjs(milestone.actualEndDate).format('DD/MM/YYYY')
                      : '-'}
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Planned Revenue
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {formatIDR(milestone.plannedRevenue || 0)}
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Recognized Revenue
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {formatIDR(milestone.recognizedRevenue || 0)}
                  </div>
                </Col>
              </Row>

              {/* Deliverables */}
              {milestone.deliverables && milestone.deliverables.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                    Deliverables
                  </div>
                  <div style={{ fontSize: '12px', marginLeft: '12px' }}>
                    {milestone.deliverables.map((deliverable, idx) => (
                      <div key={idx} style={{ color: '#555', marginBottom: '2px' }}>
                        • {deliverable}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card title='Revenue Summary' style={{ marginTop: '24px' }}>
        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Statistic
              title='Planned Revenue'
              value={formatIDR(metrics.totalPlannedRevenue)}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title='Recognized Revenue'
              value={formatIDR(metrics.totalRecognizedRevenue)}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title='Deferred Revenue'
              value={formatIDR(metrics.totalPlannedRevenue - metrics.totalRecognizedRevenue)}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
        </Row>
      </Card>
    </div>
  )
}
