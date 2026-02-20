import React from 'react'
import { Empty, Badge } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CalendarEvent } from '../../../services/calendar-events'
import { getCategoryColor, formatEventTime } from '../../../utils/calendar-colors'

dayjs.extend(relativeTime)

interface UpcomingEventsProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onEventClick }) => {
  if (events.length === 0) {
    return <Empty description="No upcoming events" />
  }

  return (
    <div className="upcoming-events-list">
      {events.map((event) => (
        <div
          key={event.id}
          className="upcoming-event-item"
          style={{ borderLeftColor: getCategoryColor(event.category) }}
          onClick={() => onEventClick(event)}
        >
          <div className="upcoming-event-item-title">{event.title}</div>
          <div className="upcoming-event-item-time">
            {dayjs(event.startTime).format('MMM DD, HH:mm')}
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            <Badge
              color={getCategoryColor(event.category)}
              text={event.category.replace('_', ' ')}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
