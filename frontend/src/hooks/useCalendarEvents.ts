import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import {
  CalendarEvent,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  QueryEventsRequest,
  calendarEventsService,
} from '../services/calendar-events'

const CALENDAR_QUERY_KEYS = {
  all: ['calendar-events'],
  list: (query?: QueryEventsRequest) => [...CALENDAR_QUERY_KEYS.all, 'list', query],
  detail: (id: string) => [...CALENDAR_QUERY_KEYS.all, 'detail', id],
  upcoming: ['calendar-events', 'upcoming'],
} as const

export const useCalendarEvents = (query?: QueryEventsRequest) => {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.list(query),
    queryFn: () => calendarEventsService.getEvents(query),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  })
}

export const useCalendarEvent = (id: string) => {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.detail(id),
    queryFn: () => calendarEventsService.getEventById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpcomingEvents = (days: number = 7) => {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.upcoming,
    queryFn: () => calendarEventsService.getUpcomingEvents(days),
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
  })
}

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCalendarEventRequest) =>
      calendarEventsService.createEvent(data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEYS.all })
      queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(event.id), event)
      message.success('Event created successfully')
    },
    onError: () => {
      message.error('Failed to create event')
    },
  })
}

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCalendarEventRequest }) =>
      calendarEventsService.updateEvent(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: CALENDAR_QUERY_KEYS.detail(id) })
      const previousEvent = queryClient.getQueryData(CALENDAR_QUERY_KEYS.detail(id))

      queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(id), (old: CalendarEvent) => ({
        ...old,
        ...data,
      }))

      return { previousEvent }
    },
    onSuccess: (event) => {
      queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(event.id), event)
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEYS.all })
      message.success('Event updated successfully')
    },
    onError: (_, { id }, context: any) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(id), context.previousEvent)
      }
      message.error('Failed to update event')
    },
  })
}

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => calendarEventsService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEYS.all })
      message.success('Event deleted successfully')
    },
    onError: () => {
      message.error('Failed to delete event')
    },
  })
}

export const useRescheduleCalendarEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) =>
      calendarEventsService.rescheduleEvent(id, startTime, endTime),
    onMutate: async ({ id, startTime, endTime }) => {
      await queryClient.cancelQueries({ queryKey: CALENDAR_QUERY_KEYS.detail(id) })
      const previousEvent = queryClient.getQueryData(CALENDAR_QUERY_KEYS.detail(id))

      queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(id), (old: CalendarEvent) => ({
        ...old,
        startTime,
        endTime,
      }))

      return { previousEvent }
    },
    onSuccess: (event) => {
      queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(event.id), event)
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEYS.all })
    },
    onError: (_, variables, context: any) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(CALENDAR_QUERY_KEYS.detail(variables.id), context.previousEvent)
      }
      message.error('Failed to reschedule event')
    },
  })
}
