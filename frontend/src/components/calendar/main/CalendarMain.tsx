import React, { useMemo } from 'react'
import { Button, Space } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import dayjs, { Dayjs } from 'dayjs'
import { CalendarEvent } from '../../../services/calendar-events'
import { getCategoryColor, getCategoryLabel } from '../../../utils/calendar-colors'
import { CalendarToolbar } from './CalendarToolbar'

type ViewType = 'month' | 'week' | 'day' | 'list'

const VIEW_MAP: Record<ViewType, string> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
  list: 'listWeek',
}

interface CalendarMainProps {
  events: CalendarEvent[]
  selectedDate: Dayjs
  onDateClick: (date: Dayjs) => void
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: () => void
  view: ViewType
  onViewChange: (view: ViewType) => void
}

export const CalendarMain: React.FC<CalendarMainProps> = ({
  events,
  selectedDate,
  onDateClick,
  onEventClick,
  onAddEvent,
  view,
  onViewChange,
}) => {
  const calendarRef = React.useRef<FullCalendar>(null)

  // Transform events for FullCalendar
  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      allDay: event.allDay,
      backgroundColor: getCategoryColor(event.category),
      borderColor: getCategoryColor(event.category),
      textColor: '#ffffff',
      extendedProps: {
        category: event.category,
        status: event.status,
        description: event.description,
        location: event.location,
        assignee: event.assignee,
        project: event.project,
        milestone: event.milestone,
        data: event,
      },
      classNames: [`event-${event.category.toLowerCase()}`],
    }))
  }, [events])

  const handlePrevClick = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev()
    }
  }

  const handleNextClick = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next()
    }
  }

  const handleTodayClick = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today()
      onDateClick(dayjs())
    }
  }

  const handleDateClick = (info: any) => {
    const date = dayjs(info.date)
    onDateClick(date)
  }

  const handleEventClick = (info: any) => {
    const eventData = info.event.extendedProps.data as CalendarEvent
    onEventClick(eventData)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <CalendarToolbar
        view={view}
        onViewChange={onViewChange}
        onAddEvent={onAddEvent}
        onPrev={handlePrevClick}
        onNext={handleNextClick}
        onToday={handleTodayClick}
      />

      {/* Calendar */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={VIEW_MAP[view]}
          headerToolbar={false}
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="00:30:00"
          firstDay={1} // Monday
          locale="id"
          height="auto"
          contentHeight="auto"
          eventDisplay="block"
          moreLinkClick="popover"
          eventContent={(info) => (
            <div
              style={{
                padding: '2px 4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px',
              }}
            >
              {info.event.title}
            </div>
          )}
        />
      </div>
    </div>
  )
}
