import React, { useMemo, useState, useCallback } from 'react'
import Timeline from 'react-calendar-timeline'
import 'react-calendar-timeline/lib/css/react-calendar-timeline.css'
import { Card, Tag, Tooltip, Space, Empty, Button, Segmented, Select } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'
import { ProjectMilestone } from '../../services/milestones'
import { getStatusColor, getPriorityColor, getStatusLabel } from '../../utils/calendarUtils'
import { formatIDR } from '../../utils/currency'
import dayjs from 'dayjs'

interface TimelineViewProps {
  milestones: ProjectMilestone[]
  onEventClick: (milestone: ProjectMilestone) => void
}

interface TimelineItem {
  id: string
  group: number
  title: string
  start_time: number
  end_time: number
  canMove: boolean
  canResize: boolean
  canChangeGroup: boolean
  className: string
}

interface TimelineGroup {
  id: number
  title: string
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  milestones,
  onEventClick,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1000 * 60 * 60 * 24 * 7) // 1 week
  const [groupBy, setGroupBy] = useState<'status' | 'priority'>('status')
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)

  if (milestones.length === 0) {
    return <Empty description="No milestones to display" />
  }

  // Build dependency map for visual connection
  const dependencyMap = useMemo(() => {
    const map = new Map<string, string>()
    milestones.forEach((m) => {
      if (m.predecessorId) {
        map.set(m.id, m.predecessorId)
      }
    })
    return map
  }, [milestones])

  // Calculate critical path
  const criticalPath = useMemo(() => {
    const paths = new Set<string>()

    const getDependencyChain = (milestoneId: string, visited = new Set<string>()): number => {
      if (visited.has(milestoneId)) return 0
      visited.add(milestoneId)

      const milestone = milestones.find((m) => m.id === milestoneId)
      if (!milestone) return 0

      const duration = Math.ceil(
        (new Date(milestone.plannedEndDate).getTime() -
          new Date(milestone.plannedStartDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      let maxChain = 0
      const dependents = milestones.filter((m) => m.predecessorId === milestoneId)
      if (dependents.length === 0) {
        return duration
      }

      dependents.forEach((dependent) => {
        const chainLength = getDependencyChain(dependent.id, visited)
        maxChain = Math.max(maxChain, chainLength)
      })

      return duration + maxChain
    }

    const startMilestones = milestones.filter((m) => !m.predecessorId)
    let longestPath: string[] = []

    startMilestones.forEach((m) => {
      const length = getDependencyChain(m.id)
      if (length > longestPath.length) {
        const path: string[] = []
        let current: ProjectMilestone | undefined = m

        while (current) {
          path.push(current.id)
          const dependent = milestones.find((dep) => dep.predecessorId === current?.id)
          current = dependent
        }

        longestPath = path
      }
    })

    longestPath.forEach((id) => paths.add(id))
    return paths
  }, [milestones])

  // Group milestones by status or priority
  const { groups, items } = useMemo(() => {
    const groupMap = new Map<string, TimelineGroup>()
    const itemsList: TimelineItem[] = []
    let groupId = 0

    if (groupBy === 'status') {
      const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'BILLED']

      statuses.forEach((status) => {
        groupMap.set(status, { id: groupId, title: getStatusLabel(status) })
        groupId++
      })

      milestones.forEach((m) => {
        const group = groupMap.get(m.status)
        if (group) {
          const isCritical = criticalPath.has(m.id)
          itemsList.push({
            id: m.id,
            group: group.id,
            title: `#${m.milestoneNumber} - ${m.name}`,
            start_time: new Date(m.plannedStartDate).getTime(),
            end_time: new Date(m.plannedEndDate).getTime(),
            canMove: false,
            canResize: false,
            canChangeGroup: false,
            className: isCritical ? 'critical-path-item' : 'normal-item',
          })
        }
      })
    } else {
      const priorities = ['HIGH', 'MEDIUM', 'LOW']

      priorities.forEach((priority) => {
        groupMap.set(priority, { id: groupId, title: `${priority} Priority` })
        groupId++
      })

      milestones.forEach((m) => {
        const group = groupMap.get(m.priority)
        if (group) {
          const isCritical = criticalPath.has(m.id)
          itemsList.push({
            id: m.id,
            group: group.id,
            title: `#${m.milestoneNumber} - ${m.name}`,
            start_time: new Date(m.plannedStartDate).getTime(),
            end_time: new Date(m.plannedEndDate).getTime(),
            canMove: false,
            canResize: false,
            canChangeGroup: false,
            className: isCritical ? 'critical-path-item' : 'normal-item',
          })
        }
      })
    }

    return {
      groups: Array.from(groupMap.values()),
      items: itemsList,
    }
  }, [milestones, groupBy, criticalPath])

  const handleItemClick = useCallback(
    (itemId: string) => {
      const milestone = milestones.find((m) => m.id === itemId)
      if (milestone) {
        setSelectedMilestone(itemId)
        onEventClick(milestone)
      }
    },
    [milestones, onEventClick]
  )

  const renderItemContent = (item: TimelineItem) => {
    const milestone = milestones.find((m) => m.id === item.id)
    if (!milestone) return item.title

    const isCritical = criticalPath.has(milestone.id)
    const duration = Math.ceil(
      (new Date(milestone.plannedEndDate).getTime() -
        new Date(milestone.plannedStartDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )

    return (
      <Tooltip
        title={
          <Space direction="vertical" size={4} style={{ fontSize: '11px' }}>
            <div>
              <strong>{milestone.name}</strong>
            </div>
            <div>Status: {getStatusLabel(milestone.status)}</div>
            <div>Priority: {milestone.priority}</div>
            <div>
              {dayjs(milestone.plannedStartDate).format('DD MMM')} →{' '}
              {dayjs(milestone.plannedEndDate).format('DD MMM YYYY')}
            </div>
            <div>Duration: {duration} days</div>
            <div>Progress: {milestone.completionPercentage || 0}%</div>
            <div>Revenue: {formatIDR(milestone.plannedRevenue)}</div>
            {milestone.estimatedCost && (
              <div>Cost: {formatIDR(milestone.estimatedCost)}</div>
            )}
            {milestone.predecessorId && (
              <div style={{ color: '#1890ff' }}>↳ Depends on milestone</div>
            )}
            {isCritical && (
              <div style={{ color: '#ff4d4f' }}>⚠️ On critical path</div>
            )}
          </Space>
        }
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '4px',
            paddingRight: '4px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '500',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            backgroundColor: isCritical ? '#ff4d4f' : getStatusColor(milestone.status),
            borderLeft: `3px solid ${getPriorityColor(milestone.priority)}`,
          }}
          onClick={() => handleItemClick(item.id)}
        >
          {item.title} ({milestone.completionPercentage || 0}%)
        </div>
      </Tooltip>
    )
  }

  return (
    <Card
      style={{ padding: '16px' }}
      title="Interactive Timeline View"
      extra={
        <Space>
          <Segmented
            value={groupBy}
            onChange={(value) => setGroupBy(value as 'status' | 'priority')}
            options={[
              { label: 'By Status', value: 'status' },
              { label: 'By Priority', value: 'priority' },
            ]}
          />
          <Button
            type="text"
            icon={<ZoomOutOutlined />}
            onClick={() => setZoomLevel((prev) => prev * 1.5)}
            title="Zoom out"
          />
          <Button
            type="text"
            icon={<ZoomInOutlined />}
            onClick={() => setZoomLevel((prev) => Math.max(prev / 1.5, 1000 * 60 * 60 * 24))}
            title="Zoom in"
          />
        </Space>
      }
    >
      <div style={{ overflow: 'auto', height: '500px' }}>
        <Timeline
          groups={groups}
          items={items}
          defaultTimeStart={dayjs().subtract(1, 'month').toDate()}
          defaultTimeEnd={dayjs().add(3, 'months').toDate()}
          itemTouchSendsClick={false}
          stackItems
          traditionalZoom
          lineHeight={40}
          onItemClick={({ itemId }: { itemId: string }) => handleItemClick(itemId)}
          onCanvasClick={() => setSelectedMilestone(null)}
          minZoom={1000 * 60 * 60 * 24} // 1 day
          maxZoom={1000 * 60 * 60 * 24 * 365} // 1 year
          visibleTimeStart={dayjs().subtract(1, 'month').valueOf()}
          visibleTimeEnd={dayjs().add(3, 'months').valueOf()}
        >
          {/* Custom rendering for items with enhanced styling */}
        </Timeline>
      </div>

      <style>{`
        .react-calendar-timeline .rct-item {
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .react-calendar-timeline .rct-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        .react-calendar-timeline .rct-item.critical-path-item {
          filter: brightness(1.1);
        }

        .react-calendar-timeline .rct-item.normal-item {
          opacity: 0.9;
        }

        .react-calendar-timeline .rct-group-title {
          font-weight: 600;
          color: #262626;
        }

        .react-calendar-timeline .rct-header-root {
          background: #fafafa;
          border-bottom: 1px solid #d9d9d9;
        }

        .react-calendar-timeline .rct-dateHeader {
          border-left: 1px solid #d9d9d9;
        }

        .react-calendar-timeline .rct-grid-body .rct-vgrid {
          border-left: 1px solid #f0f0f0;
        }

        .react-calendar-timeline .rct-cross {
          background: linear-gradient(
            90deg,
            transparent 48%,
            #d9d9d9 48%,
            #d9d9d9 52%,
            transparent 52%
          );
        }

        .react-calendar-timeline .rct-today-line {
          background: linear-gradient(
            to bottom,
            #ff4d4f,
            transparent
          );
          opacity: 0.6;
        }
      `}</style>
    </Card>
  )
}
