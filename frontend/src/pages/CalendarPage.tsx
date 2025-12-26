import React from 'react'
import { CalendarLayout } from '../components/calendar/CalendarLayout'

/**
 * Calendar Page - Full redesign with 3-panel layout
 *
 * Features:
 * - Left Sidebar: Mini calendar, upcoming events, filters
 * - Main Area: FullCalendar with month/week/day/list views
 * - Right Panel: Event details with edit/delete actions
 * - Full event CRUD with attendee management
 * - Drag-drop rescheduling
 * - Category-based filtering and coloring
 */
export const CalendarPage: React.FC = () => {
  return <CalendarLayout />
}
