import React, { useState, useMemo } from 'react'
import { Layout, Spin } from 'antd'
import dayjs from 'dayjs'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useCalendarEvents, useUpcomingEvents } from '../../hooks/useCalendarEvents'
import { CalendarEvent } from '../../services/calendar-events'
import { CalendarSidebar } from './sidebar/CalendarSidebar'
import { CalendarMain } from './main/CalendarMain'
import { EventDetailPanel } from './detail/EventDetailPanel'
import { EventForm } from './detail/EventForm'
import './CalendarLayout.css'

type ViewType = 'month' | 'week' | 'day' | 'list'

export const CalendarLayout: React.FC = () => {
  // State management
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<ViewType>('week')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const isMobile = useIsMobile()

  // API calls
  const dateRange = useMemo(() => {
    const start = selectedDate.clone().startOf('month').toISOString()
    const end = selectedDate.clone().endOf('month').toISOString()
    return { start, end }
  }, [selectedDate])

  const queryParams = useMemo(() => {
    return {
      startDate: dateRange.start,
      endDate: dateRange.end,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      projectId: selectedProjectId || undefined,
    }
  }, [dateRange, selectedCategories, selectedProjectId])

  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(queryParams)
  const { data: upcomingEvents = [] } = useUpcomingEvents(7)

  // Handlers
  const handleDateClick = (date: dayjs.Dayjs) => {
    setSelectedDate(date)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailPanelOpen(true)
  }

  const handleAddEvent = () => {
    setEditingEvent(null)
    setFormModalOpen(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormModalOpen(true)
  }

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false)
    setSelectedEvent(null)
  }

  const handleCloseFormModal = () => {
    setFormModalOpen(false)
    setEditingEvent(null)
  }

  const handleCategoryFilterChange = (categories: string[]) => {
    setSelectedCategories(categories)
  }

  const handleProjectFilterChange = (projectId: string | null) => {
    setSelectedProjectId(projectId)
  }

  if (eventsLoading && events.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="calendar-layout">
      <Layout style={{ height: '100vh', display: 'flex' }}>
        {/* Left Sidebar */}
        {!isMobile && (
          <CalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={handleDateClick}
            upcomingEvents={upcomingEvents}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
            selectedCategories={selectedCategories}
            onCategoryFilterChange={handleCategoryFilterChange}
            selectedProjectId={selectedProjectId}
            onProjectFilterChange={handleProjectFilterChange}
          />
        )}

        {/* Main Content */}
        <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Calendar area */}
          <Layout.Content style={{ flex: 1, overflow: 'auto' }}>
            <CalendarMain
              events={events}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onAddEvent={handleAddEvent}
              view={view}
              onViewChange={setView}
            />
          </Layout.Content>
        </Layout>

        {/* Right Detail Panel */}
        {!isMobile && selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onEdit={() => handleEditEvent(selectedEvent)}
            onClose={handleCloseDetailPanel}
            onDelete={() => {
              handleCloseDetailPanel()
            }}
          />
        )}
      </Layout>

      {/* Event Form Modal */}
      <EventForm
        visible={formModalOpen}
        event={editingEvent}
        onClose={handleCloseFormModal}
        onSuccess={() => {
          handleCloseFormModal()
        }}
      />
    </div>
  )
}
