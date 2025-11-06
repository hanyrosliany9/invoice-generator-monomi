import React from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { CalendarEvent } from '../../utils/calendarUtils'

interface MonthCalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (eventId: string) => void
  onDateClick?: (date: Date) => void
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  events,
  onEventClick,
  onDateClick,
}) => {
  const handleEventClick = (info: any) => {
    if (onEventClick) {
      onEventClick(info.event.id)
    }
  }

  const handleDateClick = (info: any) => {
    if (onDateClick) {
      onDateClick(info.date)
    }
  }

  return (
    <div style={{ height: '100%', minHeight: '600px' }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        editable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        height="auto"
        contentHeight="auto"
      />
    </div>
  )
}
