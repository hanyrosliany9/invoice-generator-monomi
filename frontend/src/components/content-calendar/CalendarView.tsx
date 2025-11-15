import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Tag } from 'antd';
import type { ContentCalendarItem } from '../../services/content-calendar';

interface Props {
  data: ContentCalendarItem[];
  onDateClick: (date: Date) => void;
  onEventClick: (item: ContentCalendarItem) => void;
}

export const CalendarView: React.FC<Props> = ({ data, onDateClick, onEventClick }) => {
  // Convert content items to calendar events
  const events = data
    .filter((item) => item.scheduledAt)
    .map((item) => ({
      id: item.id,
      title: item.caption.length > 50 ? item.caption.substring(0, 50) + '...' : item.caption,
      date: item.scheduledAt,
      backgroundColor:
        item.status === 'PUBLISHED' ? '#52c41a' :
        item.status === 'SCHEDULED' ? '#1890ff' :
        item.status === 'DRAFT' ? '#d9d9d9' :
        item.status === 'ARCHIVED' ? '#faad14' :
        '#d9d9d9',
      borderColor:
        item.status === 'PUBLISHED' ? '#52c41a' :
        item.status === 'SCHEDULED' ? '#1890ff' :
        item.status === 'DRAFT' ? '#d9d9d9' :
        item.status === 'ARCHIVED' ? '#faad14' :
        '#d9d9d9',
      extendedProps: {
        item,
        platforms: item.platforms,
        mediaCount: item.media?.length || 0,
      },
    }));

  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={(info) => onDateClick(info.date)}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          onEventClick(info.event.extendedProps.item);
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek',
        }}
        height="auto"
        eventContent={(arg) => {
          return (
            <div
              style={{
                padding: '2px 4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <strong>{arg.event.title}</strong>
              <div style={{ fontSize: '10px', marginTop: '2px' }}>
                {arg.event.extendedProps.platforms?.slice(0, 2).join(', ')}
                {arg.event.extendedProps.mediaCount > 0 && (
                  <span style={{ marginLeft: 4 }}>
                    📎 {arg.event.extendedProps.mediaCount}
                  </span>
                )}
              </div>
            </div>
          );
        }}
        eventClassNames="content-calendar-event"
        dayMaxEvents={3}
        moreLinkClick="popover"
      />
      <style>{`
        .content-calendar-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 4px;
        }
        .content-calendar-event:hover {
          opacity: 0.8;
        }
        .fc-daygrid-event {
          white-space: normal !important;
        }
        .fc-event-title {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
