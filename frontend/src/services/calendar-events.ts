import { apiClient } from '../config/api'

export interface CalendarEventAttendee {
  userId: string
  status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
}

export interface CalendarEventReminder {
  minutes: number
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  allDay: boolean
  timezone: string
  category: 'MEETING' | 'PROJECT_WORK' | 'MILESTONE' | 'TASK' | 'REMINDER' | 'PHOTOSHOOT' | 'DELIVERY' | 'OTHER'
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  color?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  projectId?: string
  milestoneId?: string
  clientId?: string
  assigneeId?: string
  attendees?: Array<{
    id: string
    userId: string
    status: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  reminders?: Array<{
    id: string
    minutes: number
  }>
  createdBy?: {
    id: string
    name: string
    email: string
  }
  assignee?: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    number: string
  }
  milestone?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateCalendarEventRequest {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  allDay?: boolean
  timezone?: string
  category?: string
  status?: string
  color?: string
  priority?: string
  projectId?: string
  milestoneId?: string
  clientId?: string
  assigneeId?: string
  attendees?: CalendarEventAttendee[]
  reminders?: CalendarEventReminder[]
  recurrence?: string
}

export interface UpdateCalendarEventRequest extends Partial<CreateCalendarEventRequest> {}

export interface QueryEventsRequest {
  startDate?: string
  endDate?: string
  categories?: string[]
  projectId?: string
  assigneeId?: string
  limit?: number
  offset?: number
}

export const calendarEventsService = {
  async createEvent(data: CreateCalendarEventRequest): Promise<CalendarEvent> {
    const response = await apiClient.post('/calendar-events', data)
    return response?.data?.data || response?.data
  },

  async getEvents(query?: QueryEventsRequest): Promise<CalendarEvent[]> {
    const response = await apiClient.get('/calendar-events', { params: query })
    return response?.data?.data || response?.data || []
  },

  async getEventById(id: string): Promise<CalendarEvent> {
    const response = await apiClient.get(`/calendar-events/${id}`)
    return response?.data?.data || response?.data
  },

  async updateEvent(id: string, data: UpdateCalendarEventRequest): Promise<CalendarEvent> {
    const response = await apiClient.patch(`/calendar-events/${id}`, data)
    return response?.data?.data || response?.data
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/calendar-events/${id}`)
  },

  async rescheduleEvent(id: string, startTime: string, endTime: string): Promise<CalendarEvent> {
    const response = await apiClient.post(`/calendar-events/${id}/reschedule`, {
      startTime,
      endTime,
    })
    return response?.data?.data || response?.data
  },

  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const response = await apiClient.get(`/calendar-events/upcoming`, {
      params: { days },
    })
    return response?.data?.data || response?.data || []
  },
}
