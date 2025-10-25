import React, { useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Card, Tooltip, Space } from 'antd'
import { ProjectMilestone } from '../../services/milestones'
import { transformMilestonesToEvents, getStatusLabel } from '../../utils/calendarUtils'
import { formatIDR } from '../../utils/currency'
import dayjs from 'dayjs'

// FullCalendar CSS is embedded in the JavaScript bundles for v6

interface EventClickInfo {
  event: { id: string; title: string }
}

const CalendarComponent = FullCalendar as unknown as React.ComponentType<any>

interface MonthCalendarViewProps {
  milestones: ProjectMilestone[]
  onEventClick: (milestone: ProjectMilestone) => void
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
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
            <div>Revenue: {formatIDR(milestone.plannedRevenue)}</div>
            {milestone.estimatedCost && (
              <div>Cost: {formatIDR(milestone.estimatedCost)}</div>
            )}
            <div>Progress: {milestone.completionPercentage || 0}%</div>
          </Space>
        }
      >
        <div style={{ padding: '2px 4px', cursor: 'pointer', fontSize: '11px' }}>
          <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay',
        }}
        height="auto"
        events={events}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        dayMaxEvents={3}
        dayMaxEventRows={true}
        locale="id"
        firstDay={1}
        weekends={true}
        eventDisplay="block"
        eventOrder="-duration,allDay,-start"
        datesSet={(info: any) => {
          // Optional: Handle date range changes
        }}
      />
    </Card>
  )
}
