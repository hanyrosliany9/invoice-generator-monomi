import React, { useState, useMemo, useCallback } from 'react'
import { Tabs, Card, Segmented, Space, Button, Drawer, Statistic, Row, Col, Alert } from 'antd'
import { BarChartOutlined, BgColorsOutlined, FunctionOutlined, LineChartOutlined } from '@ant-design/icons'
import { ProjectMilestone } from '../../services/milestones'
import { MonthCalendarView } from './MonthCalendarView'
import { WeekCalendarView } from './WeekCalendarView'
import { GanttChartView } from './GanttChartView'
import { TimelineView } from './TimelineView'
import { DependencyVisualization } from './DependencyVisualization'
import { getTimelineMetrics, assessMilestoneRisks } from '../../utils/calendarUtils'
import dayjs from 'dayjs'

interface ProjectTimelineManagerProps {
  projectId: string
  milestones: ProjectMilestone[]
  onMilestoneClick: (milestone: ProjectMilestone) => void
  loading?: boolean
}

type ViewType = 'month' | 'week' | 'gantt' | 'timeline' | 'dependencies'

/**
 * Project Timeline Manager - Comprehensive timeline visualization
 * Provides multiple views:
 * - Month Calendar: FullCalendar month view with milestones
 * - Week Calendar: FullCalendar week/day view with time grid
 * - Gantt Chart: Horizontal bar chart with critical path and risk assessment
 * - Interactive Timeline: React Calendar Timeline with zoom and grouping
 * - Dependency Visualization: DAG visualization of milestone dependencies
 */
export const ProjectTimelineManager: React.FC<ProjectTimelineManagerProps> = ({
  projectId,
  milestones,
  onMilestoneClick,
  loading = false,
}) => {
  const [activeView, setActiveView] = useState<ViewType>('gantt')
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | null>(null)
  const [showMetrics, setShowMetrics] = useState(false)

  const timelineMetrics = useMemo(() => getTimelineMetrics(milestones), [milestones])
  const riskAssessments = useMemo(() => assessMilestoneRisks(milestones), [milestones])

  const handleMilestoneClick = useCallback((milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone)
    onMilestoneClick(milestone)
  }, [onMilestoneClick])

  const highRisks = riskAssessments.filter(r => r.riskLevel === 'HIGH')

  const views = [
    {
      key: 'gantt',
      label: (
        <span>
          <BarChartOutlined />
          Gantt Chart
        </span>
      ),
      children: (
        <GanttChartView
          milestones={milestones}
          onEventClick={handleMilestoneClick}
        />
      ),
    },
    {
      key: 'timeline',
      label: (
        <span>
          <LineChartOutlined />
          Interactive Timeline
        </span>
      ),
      children: (
        <TimelineView
          milestones={milestones}
          onEventClick={handleMilestoneClick}
        />
      ),
    },
    {
      key: 'dependencies',
      label: (
        <span>
          <FunctionOutlined />
          Dependencies
        </span>
      ),
      children: (
        <DependencyVisualization
          milestones={milestones}
          onMilestoneClick={handleMilestoneClick}
        />
      ),
    },
    {
      key: 'month',
      label: 'Month View',
      children: (
        <MonthCalendarView
          milestones={milestones}
          onEventClick={handleMilestoneClick}
        />
      ),
    },
    {
      key: 'week',
      label: 'Week View',
      children: (
        <WeekCalendarView
          milestones={milestones}
          onEventClick={handleMilestoneClick}
        />
      ),
    },
  ]

  return (
    <div>
      {/* Alert for high-risk items */}
      {highRisks.length > 0 && (
        <Alert
          message={`${highRisks.length} milestone(s) with HIGH risk`}
          description={highRisks.map(r => r.milestoneName).join(', ')}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Top metrics bar */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Statistic
              title="Total Duration"
              value={timelineMetrics.totalDays}
              suffix="days"
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Days Remaining"
              value={Math.max(0, timelineMetrics.daysRemaining)}
              suffix="days"
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Critical Path"
              value={timelineMetrics.criticalPathLength}
              suffix="days"
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Buffer Days"
              value={timelineMetrics.bufferDays}
              suffix="days"
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Avg Milestone Duration"
              value={timelineMetrics.avgMilestoneDuration}
              suffix="days"
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Timeline Variance"
              value={timelineMetrics.timelineVariance}
              suffix="days"
            />
          </Col>
        </Row>
      </Card>

      {/* View selection and controls */}
      <Card
        style={{ marginBottom: '16px' }}
        title="Project Timeline Views"
        extra={
          <Space>
            <Button
              type={showMetrics ? 'primary' : 'default'}
              onClick={() => setShowMetrics(!showMetrics)}
            >
              Detailed Metrics
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeView}
          onChange={(key) => setActiveView(key as ViewType)}
          items={views}
        />
      </Card>

      {/* Detailed metrics drawer */}
      <Drawer
        title="Timeline Metrics & Analytics"
        placement="right"
        onClose={() => setShowMetrics(false)}
        open={showMetrics}
        width={450}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* Timeline Overview */}
          <Card title="Timeline Overview" size="small">
            <Space direction="vertical" size={0} style={{ width: '100%', fontSize: '12px' }}>
              <div>
                <strong>Project Duration:</strong> {timelineMetrics.totalDays} days
              </div>
              <div>
                <strong>Time Remaining:</strong> {Math.max(0, timelineMetrics.daysRemaining)} days
              </div>
              <div>
                <strong>End Date:</strong> {dayjs().add(timelineMetrics.daysRemaining, 'days').format('DD MMM YYYY')}
              </div>
            </Space>
          </Card>

          {/* Critical Path Analysis */}
          <Card title="Critical Path Analysis" size="small">
            <Space direction="vertical" size={0} style={{ width: '100%', fontSize: '12px' }}>
              <div>
                <strong>Critical Path Length:</strong> {timelineMetrics.criticalPathLength} days
              </div>
              <div>
                <strong>Total Buffer Days:</strong> {timelineMetrics.bufferDays} days
              </div>
              <div>
                <strong>Float Percentage:</strong> {timelineMetrics.totalDays > 0 ? ((timelineMetrics.bufferDays / timelineMetrics.totalDays) * 100).toFixed(1) : 0}%
              </div>
              <div style={{ marginTop: '8px', color: '#ff4d4f', fontSize: '11px' }}>
                ⚠️ Low buffer indicates little schedule flexibility
              </div>
            </Space>
          </Card>

          {/* Milestone Statistics */}
          <Card title="Milestone Statistics" size="small">
            <Space direction="vertical" size={0} style={{ width: '100%', fontSize: '12px' }}>
              <div>
                <strong>Total Milestones:</strong> {milestones.length}
              </div>
              <div>
                <strong>Avg Duration:</strong> {timelineMetrics.avgMilestoneDuration} days
              </div>
              <div>
                <strong>Duration Variance:</strong> {timelineMetrics.timelineVariance} days
              </div>
              <div>
                <strong>Shortest Milestone:</strong> {Math.min(...milestones.map(m => Math.ceil((new Date(m.plannedEndDate).getTime() - new Date(m.plannedStartDate).getTime()) / (1000 * 60 * 60 * 24))))} days
              </div>
              <div>
                <strong>Longest Milestone:</strong> {Math.max(...milestones.map(m => Math.ceil((new Date(m.plannedEndDate).getTime() - new Date(m.plannedStartDate).getTime()) / (1000 * 60 * 60 * 24))))} days
              </div>
            </Space>
          </Card>

          {/* Status Distribution */}
          <Card title="Status Distribution" size="small">
            <Space direction="vertical" size={0} style={{ width: '100%', fontSize: '12px' }}>
              <div>
                <strong>Pending:</strong> {milestones.filter(m => m.status === 'PENDING').length}
              </div>
              <div>
                <strong>In Progress:</strong> {milestones.filter(m => m.status === 'IN_PROGRESS').length}
              </div>
              <div>
                <strong>Completed:</strong> {milestones.filter(m => m.status === 'COMPLETED').length}
              </div>
              <div>
                <strong>Accepted:</strong> {milestones.filter(m => m.status === 'ACCEPTED').length}
              </div>
              <div>
                <strong>Billed:</strong> {milestones.filter(m => m.status === 'BILLED').length}
              </div>
            </Space>
          </Card>

          {/* Risk Summary */}
          <Card title="Risk Summary" size="small">
            <Space direction="vertical" size={0} style={{ width: '100%', fontSize: '12px' }}>
              <div>
                <strong style={{ color: '#ff4d4f' }}>High Risk:</strong> {riskAssessments.filter(r => r.riskLevel === 'HIGH').length}
              </div>
              <div>
                <strong style={{ color: '#faad14' }}>Medium Risk:</strong> {riskAssessments.filter(r => r.riskLevel === 'MEDIUM').length}
              </div>
              <div>
                <strong style={{ color: '#52c41a' }}>Low Risk:</strong> {riskAssessments.filter(r => r.riskLevel === 'LOW').length}
              </div>
            </Space>
          </Card>

          {/* Recommendations */}
          <Card title="Recommendations" size="small" style={{ backgroundColor: '#fafafa' }}>
            <ul style={{ fontSize: '11px', margin: 0, paddingLeft: '16px' }}>
              {timelineMetrics.bufferDays < 5 && (
                <li>Low schedule flexibility - consider risk mitigation</li>
              )}
              {riskAssessments.length > 0 && (
                <li>Address {riskAssessments.length} identified risks</li>
              )}
              {milestones.filter(m => m.completionPercentage === 0 && m.status === 'IN_PROGRESS').length > 0 && (
                <li>Update progress on in-progress milestones</li>
              )}
              {milestones.filter(m => m.predecessorId && milestones.find(p => p.id === m.predecessorId)?.status === 'PENDING').length > 0 && (
                <li>Monitor milestones with pending dependencies</li>
              )}
            </ul>
          </Card>
        </Space>
      </Drawer>

      {/* Selected milestone detail drawer */}
      <Drawer
        title={selectedMilestone ? `#${selectedMilestone.milestoneNumber} - ${selectedMilestone.name}` : 'Milestone Details'}
        placement="right"
        onClose={() => setSelectedMilestone(null)}
        open={!!selectedMilestone}
        width={450}
      >
        {selectedMilestone && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title="Overview">
              <Space direction="vertical" size={0} style={{ fontSize: '12px' }}>
                <div><strong>Status:</strong> {selectedMilestone.status}</div>
                <div><strong>Priority:</strong> {selectedMilestone.priority}</div>
                <div><strong>Progress:</strong> {selectedMilestone.completionPercentage || 0}%</div>
                <div><strong>Description:</strong> {selectedMilestone.description || 'N/A'}</div>
              </Space>
            </Card>

            <Card size="small" title="Timeline">
              <Space direction="vertical" size={0} style={{ fontSize: '12px' }}>
                <div><strong>Planned Start:</strong> {dayjs(selectedMilestone.plannedStartDate).format('DD MMM YYYY')}</div>
                <div><strong>Planned End:</strong> {dayjs(selectedMilestone.plannedEndDate).format('DD MMM YYYY')}</div>
                {selectedMilestone.actualStartDate && (
                  <div><strong>Actual Start:</strong> {dayjs(selectedMilestone.actualStartDate).format('DD MMM YYYY')}</div>
                )}
                {selectedMilestone.actualEndDate && (
                  <div><strong>Actual End:</strong> {dayjs(selectedMilestone.actualEndDate).format('DD MMM YYYY')}</div>
                )}
                {selectedMilestone.delayDays && selectedMilestone.delayDays > 0 && (
                  <div style={{ color: '#ff4d4f' }}><strong>Delay:</strong> {selectedMilestone.delayDays} days</div>
                )}
              </Space>
            </Card>

            <Card size="small" title="Financial">
              <Space direction="vertical" size={0} style={{ fontSize: '12px' }}>
                <div><strong>Planned Revenue:</strong> {selectedMilestone.plannedRevenue.toLocaleString('id-ID')}</div>
                <div><strong>Recognized Revenue:</strong> {selectedMilestone.recognizedRevenue.toLocaleString('id-ID')}</div>
                <div><strong>Remaining Revenue:</strong> {selectedMilestone.remainingRevenue.toLocaleString('id-ID')}</div>
                {selectedMilestone.estimatedCost && (
                  <div><strong>Estimated Cost:</strong> {selectedMilestone.estimatedCost.toLocaleString('id-ID')}</div>
                )}
                <div><strong>Actual Cost:</strong> {selectedMilestone.actualCost.toLocaleString('id-ID')}</div>
              </Space>
            </Card>

            {selectedMilestone.predecessorId && (
              <Card size="small" title="Dependencies">
                <div style={{ fontSize: '12px' }}>
                  ↳ Depends on another milestone
                </div>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  )
}
