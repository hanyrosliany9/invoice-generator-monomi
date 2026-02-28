import React from 'react'
import { Layout, Button, Divider } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { CalendarEvent } from '../../../services/calendar-events'
import { MiniCalendar } from './MiniCalendar'
import { UpcomingEvents } from './UpcomingEvents'
import { CalendarFilters } from './CalendarFilters'

interface CalendarSidebarProps {
  selectedDate: dayjs.Dayjs
  onDateSelect: (date: dayjs.Dayjs) => void
  upcomingEvents: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: () => void
  selectedCategories: string[]
  onCategoryFilterChange: (categories: string[]) => void
  selectedProjectId: string | null
  onProjectFilterChange: (projectId: string | null) => void
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  selectedDate,
  onDateSelect,
  upcomingEvents,
  onEventClick,
  onAddEvent,
  selectedCategories,
  onCategoryFilterChange,
  selectedProjectId,
  onProjectFilterChange,
}) => {
  return (
    <Layout.Sider
      width={268}
      style={{ height: '100vh', overflow: 'auto', flexShrink: 0 }}
      className="calendar-sidebar"
    >
      {/* Add Event Button */}
      <Button
        type="primary"
        block
        icon={<PlusOutlined />}
        onClick={onAddEvent}
        style={{ marginBottom: '16px' }}
      >
        New Event
      </Button>

      {/* Mini Calendar */}
      <div className="calendar-sidebar-section">
        <div className="mini-cal-wrapper">
          <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />
        </div>
      </div>

      <Divider style={{ margin: '4px 0 16px' }} />

      {/* Upcoming Events */}
      <div className="calendar-sidebar-section">
        <div className="calendar-sidebar-section-title">Upcoming Events</div>
        <UpcomingEvents events={upcomingEvents} onEventClick={onEventClick} />
      </div>

      <Divider style={{ margin: '4px 0 16px' }} />

      {/* Filters */}
      <div className="calendar-sidebar-section">
        <div className="calendar-sidebar-section-title">Filters</div>
        <CalendarFilters
          selectedCategories={selectedCategories}
          onCategoryFilterChange={onCategoryFilterChange}
          selectedProjectId={selectedProjectId}
          onProjectFilterChange={onProjectFilterChange}
        />
      </div>
    </Layout.Sider>
  )
}
