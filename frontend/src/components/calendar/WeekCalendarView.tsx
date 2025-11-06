import React from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { CalendarEvent } from '../../utils/calendarUtils'

interface WeekCalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (eventId: string) => void
  onDateClick?: (date: Date) => void
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
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
        initialView="timeGridWeek"
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
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
      />
    </div>
  )
}
