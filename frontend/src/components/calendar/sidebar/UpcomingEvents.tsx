import React from 'react'
import { Empty } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CalendarEvent } from '../../../services/calendar-events'
import { getCategoryColor } from '../../../utils/calendar-colors'

dayjs.extend(relativeTime)

interface UpcomingEventsProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onEventClick }) => {
  if (events.length === 0) {
    return <Empty description="No upcoming events" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className="upcoming-events-list">
      {events.map((event) => {
        const color = getCategoryColor(event.category)
        const timeLabel = event.allDay
          ? dayjs(event.startTime).format('MMM D')
          : dayjs(event.startTime).format('MMM D · HH:mm')

        return (
          <div
            key={event.id}
            className="upcoming-event-item"
            onClick={() => onEventClick(event)}
          >
            {/* Left accent bar */}
            <div className="upcoming-event-item-accent" style={{ background: color }} />

            <div className="upcoming-event-item-body">
              <div className="upcoming-event-item-title">{event.title}</div>
              <div className="upcoming-event-item-time">{timeLabel}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
