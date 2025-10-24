import React, { useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Card, Tooltip, Space, Progress } from 'antd'
import { ProjectMilestone } from '../../services/milestones'
import { transformMilestonesToEvents, getStatusLabel } from '../../utils/calendarUtils'
import { formatIDR } from '../../utils/currency'
import dayjs from 'dayjs'

interface EventClickInfo {
  event: { id: string; title: string }
}

const CalendarComponent = FullCalendar as unknown as React.ComponentType<any>

interface WeekCalendarViewProps {
  milestones: ProjectMilestone[]
  onEventClick: (milestone: ProjectMilestone) => void
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  milestones,
  onEventClick,
}) => {
  const events = transformMilestonesToEvents(milestones)

  const handleEventClick = useCallback(
    (clickInfo: EventClickInfo) => {
      const milestoneId = clickInfo.event.id
      const milestone = milestones.find((m) => m.id === milestoneId)
      if (milestone) {
        onEventClick(milestone)
      }
    },
    [milestones, onEventClick]
  )

  const renderEventContent = (eventInfo: any): React.ReactElement => {
    const milestone = milestones.find((m) => m.id === eventInfo.event.id)
    if (!milestone) return <div>{eventInfo.event.title}</div>

    return (
      <Tooltip
        title={
          <Space direction="vertical" size={4} style={{ fontSize: '12px' }}>
            <div>
              <strong>{eventInfo.event.title}</strong>
            </div>
            <div>Status: {getStatusLabel(milestone.status)}</div>
            <div>Priority: {milestone.priority}</div>
            <div>
              {dayjs(milestone.plannedStartDate).format('DD MMM')} →{' '}
              {dayjs(milestone.plannedEndDate).format('DD MMM YYYY')}
            </div>
            <div>
              <Progress
                percent={milestone.completionPercentage || 0}
                size="small"
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>Revenue: {formatIDR(milestone.plannedRevenue)}</div>
            {milestone.estimatedCost && (
              <div>Cost: {formatIDR(milestone.estimatedCost)}</div>
            )}
          </Space>
        }
      >
        <div style={{ padding: '4px', cursor: 'pointer' }}>
          <div
            style={{
              fontWeight: '500',
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {eventInfo.event.title}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>
            {milestone.completionPercentage || 0}%
          </div>
        </div>
      </Tooltip>
    )
  }

  return (
    <Card style={{ padding: '16px' }}>
      <CalendarComponent
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,timeGridDay,dayGridMonth',
        }}
        height="auto"
        events={events}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        locale="id"
        firstDay={1}
        weekends={true}
        eventDisplay="block"
        slotLabelFormat={{
          hour: 'numeric',
          meridiem: 'short',
          omitZeroMinute: true,
        }}
        allDaySlot={true}
        contentHeight="auto"
      />
    </Card>
  )
}
