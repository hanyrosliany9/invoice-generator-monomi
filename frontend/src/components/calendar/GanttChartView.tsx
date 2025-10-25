import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Card, Table, Tag, Tooltip, Space, Progress, Empty, Row, Col, Statistic, Button, Drawer } from 'antd'
import { ProjectMilestone } from '../../services/milestones'
import { getStatusColor, getPriorityColor, getStatusLabel, getTimelineMetrics, assessMilestoneRisks } from '../../utils/calendarUtils'
import { formatIDR } from '../../utils/currency'
import dayjs, { Dayjs } from 'dayjs'
import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

interface GanttChartViewProps {
  milestones: ProjectMilestone[]
  onEventClick: (milestone: ProjectMilestone) => void
}

/**
 * Gantt Chart View - Visual timeline with milestone dependencies
 * Shows:
 * - Milestone bars spanning from start to end date
 * - Dependencies between milestones with connecting lines
 * - Critical path highlighting
 * - Progress indicators
 */
export const GanttChartView: React.FC<GanttChartViewProps> = ({
  milestones,
  onEventClick,
}) => {
  const [showRisks, setShowRisks] = useState(false)

  if (milestones.length === 0) {
    return <Empty description="No milestones to display" />
  }

  // Calculate timeline bounds
  const timeline = useMemo(() => {
    const dates = milestones.flatMap((m) => [
      new Date(m.plannedStartDate),
      new Date(m.plannedEndDate),
    ])
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

    return {
      minDate,
      maxDate,
      totalDays: Math.ceil(
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }
  }, [milestones])

  // Calculate bar positions
  const getBarStyle = (milestone: ProjectMilestone) => {
    const start = new Date(milestone.plannedStartDate)
    const end = new Date(milestone.plannedEndDate)

    const startDays = Math.floor(
      (start.getTime() - timeline.minDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const duration = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    )

    const percentStart = (startDays / timeline.totalDays) * 100
    const percentWidth = (duration / timeline.totalDays) * 100

    return {
      left: `${percentStart}%`,
      width: `${Math.max(percentWidth, 2)}%`,
    }
  }

  // Build dependency map for critical path detection
  const dependencyMap = useMemo(() => {
    const map = new Map<string, string[]>()
    milestones.forEach((m) => {
      if (m.predecessorId) {
        const dependents = map.get(m.predecessorId) || []
        dependents.push(m.id)
        map.set(m.predecessorId, dependents)
      }
    })
    return map
  }, [milestones])

  // Detect critical path (longest sequence of dependencies)
  const criticalPath = useMemo(() => {
    const paths = new Set<string>()

    const traversePath = (milestoneId: string, path: string[] = []): string[] => {
      const newPath = [...path, milestoneId]
      const dependents = dependencyMap.get(milestoneId) || []

      if (dependents.length === 0) {
        return newPath
      }

      let longestPath = newPath
      dependents.forEach((dependent) => {
        const resultPath = traversePath(dependent, newPath)
        if (resultPath.length > longestPath.length) {
          longestPath = resultPath
        }
      })

      return longestPath
    }

    // Find milestones with no predecessors (start points)
    const startMilestones = milestones.filter((m) => !m.predecessorId)
    let criticalPath: string[] = []

    startMilestones.forEach((m) => {
      const path = traversePath(m.id)
      if (path.length > criticalPath.length) {
        criticalPath = path
      }
    })

    criticalPath.forEach((id) => paths.add(id))
    return paths
  }, [milestones, dependencyMap])

  const columns = [
    {
      title: 'Milestone',
      key: 'milestone',
      width: 200,
      fixed: 'left' as const,
      render: (_: any, record: ProjectMilestone) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            #{record.milestoneNumber} - {record.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(record.plannedStartDate).format('DD MMM')} →{' '}
            {dayjs(record.plannedEndDate).format('DD MMM')}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>,
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 110,
      render: (_: any, record: ProjectMilestone) => (
        <Progress
          percent={record.completionPercentage || 0}
          size="small"
          showInfo={true}
        />
      ),
    },
    {
      title: 'Timeline',
      key: 'timeline',
      width: 'auto',
      render: (_: any, record: ProjectMilestone) => {
        const isCritical = criticalPath.has(record.id)
        const barStyle = getBarStyle(record)

        return (
          <Tooltip
            title={
              <Space direction="vertical" size={4} style={{ fontSize: '12px' }}>
                <div>
                  <strong>{record.name}</strong>
                </div>
                <div>
                  {dayjs(record.plannedStartDate).format('DD MMM YYYY')} →{' '}
                  {dayjs(record.plannedEndDate).format('DD MMM YYYY')}
                </div>
                <div>
                  Duration:{' '}
                  {Math.ceil(
                    (new Date(record.plannedEndDate).getTime() -
                      new Date(record.plannedStartDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  days
                </div>
                <div>Revenue: {formatIDR(record.plannedRevenue)}</div>
                {isCritical && <div style={{ color: '#ff4d4f' }}>⚠️ Critical Path</div>}
              </Space>
            }
          >
            <div
              style={{
                position: 'relative',
                height: '30px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                marginRight: '8px',
              }}
              onClick={() => onEventClick(record)}
            >
              <div
                style={{
                  ...barStyle,
                  height: '24px',
                  backgroundColor: isCritical ? '#ff4d4f' : getStatusColor(record.status),
                  borderLeft: `3px solid ${getPriorityColor(record.priority)}`,
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: 0.85,
                  fontSize: '11px',
                  color: '#fff',
                  fontWeight: 500,
                  position: 'absolute',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                  e.currentTarget.style.zIndex = '10'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.85'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {record.completionPercentage || 0}%
              </div>
            </div>
          </Tooltip>
        )
      },
    },
  ]

  const stats = useMemo(() => {
    const completed = milestones.filter(
      (m) => m.status === 'COMPLETED' || m.status === 'ACCEPTED'
    ).length
    const inProgress = milestones.filter((m) => m.status === 'IN_PROGRESS').length
    const pending = milestones.filter((m) => m.status === 'PENDING').length
    const totalRevenue = milestones.reduce((sum, m) => sum + m.plannedRevenue, 0)
    const totalCost = milestones.reduce((sum, m) => sum + (m.estimatedCost || 0), 0)

    return {
      completed,
      inProgress,
      pending,
      totalRevenue,
      totalCost,
      daysRemaining: Math.ceil(
        (timeline.maxDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
    }
  }, [milestones, timeline])

  const timelineMetrics = useMemo(() => getTimelineMetrics(milestones), [milestones])
  const riskAssessments = useMemo(() => assessMilestoneRisks(milestones), [milestones])

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Duration"
              value={timeline.totalDays}
              suffix="days"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Days Remaining"
              value={Math.max(0, stats.daysRemaining)}
              suffix="days"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Critical Path"
              value={criticalPath.size}
              suffix="milestones"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Buffer Days"
              value={timelineMetrics.bufferDays}
              suffix="days"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              suffix={`/ ${milestones.length}`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Button
              type={riskAssessments.length > 0 ? 'primary' : 'default'}
              danger={riskAssessments.some(r => r.riskLevel === 'HIGH')}
              onClick={() => setShowRisks(true)}
              icon={<AlertOutlined />}
            >
              Risks: {riskAssessments.filter(r => r.riskLevel === 'HIGH').length} High
            </Button>
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          overflowX: 'auto',
          padding: '16px',
        }}
      >
        <Table
          columns={columns}
          dataSource={milestones}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          size="small"
          scroll={{ x: 'max-content' }}
          rowClassName={(record) =>
            criticalPath.has(record.id)
              ? 'gantt-critical-row'
              : ''
          }
        />
        <style>{`
          .gantt-critical-row {
            background-color: rgba(255, 77, 79, 0.05) !important;
          }
          .gantt-critical-row:hover {
            background-color: rgba(255, 77, 79, 0.1) !important;
          }
        `}</style>
      </Card>

      <Drawer
        title="Risk Assessment"
        placement="right"
        onClose={() => setShowRisks(false)}
        open={showRisks}
        width={400}
      >
        {riskAssessments.length === 0 ? (
          <Empty description="No risks identified" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {riskAssessments.map((risk) => (
              <Card
                key={risk.milestoneId}
                size="small"
                style={{
                  borderLeft: `4px solid ${
                    risk.riskLevel === 'HIGH'
                      ? '#ff4d4f'
                      : risk.riskLevel === 'MEDIUM'
                      ? '#faad14'
                      : '#52c41a'
                  }`,
                }}
              >
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {risk.milestoneName}
                  </div>
                  <Tag
                    color={
                      risk.riskLevel === 'HIGH'
                        ? 'red'
                        : risk.riskLevel === 'MEDIUM'
                        ? 'orange'
                        : 'green'
                    }
                    style={{ marginTop: '4px' }}
                  >
                    {risk.riskLevel} RISK
                  </Tag>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
                    {risk.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Drawer>
    </div>
  )
}
