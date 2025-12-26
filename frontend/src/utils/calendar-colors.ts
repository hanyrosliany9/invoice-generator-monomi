// Category colors for calendar events
export const CATEGORY_COLORS: Record<string, string> = {
  MEETING: '#1890ff',      // Blue
  PROJECT_WORK: '#52c41a', // Green
  MILESTONE: '#722ed1',    // Purple
  TASK: '#faad14',         // Orange
  REMINDER: '#f5222d',     // Red
  PHOTOSHOOT: '#13c2c2',   // Cyan
  DELIVERY: '#eb2f96',     // Magenta
  OTHER: '#bfbfbf',        // Gray
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#52c41a',    // Green
  MEDIUM: '#faad14', // Orange
  HIGH: '#f5222d',   // Red
}

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#1890ff',   // Blue
  IN_PROGRESS: '#faad14', // Orange
  COMPLETED: '#52c41a',   // Green
  CANCELLED: '#bfbfbf',   // Gray
}

export const ATTENDEE_STATUS_COLORS: Record<string, string> = {
  PENDING: '#faad14',    // Orange
  ACCEPTED: '#52c41a',   // Green
  DECLINED: '#f5222d',   // Red
  TENTATIVE: '#1890ff',  // Blue
}

export function getCategoryColor(category?: string): string {
  return CATEGORY_COLORS[category || 'OTHER'] || CATEGORY_COLORS.OTHER
}

export function getPriorityColor(priority?: string): string {
  return PRIORITY_COLORS[priority || 'MEDIUM'] || PRIORITY_COLORS.MEDIUM
}

export function getStatusColor(status?: string): string {
  return STATUS_COLORS[status || 'SCHEDULED'] || STATUS_COLORS.SCHEDULED
}

export function getAttendeeStatusColor(status?: string): string {
  return ATTENDEE_STATUS_COLORS[status || 'PENDING'] || ATTENDEE_STATUS_COLORS.PENDING
}

export function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    MEETING: 'Meeting',
    PROJECT_WORK: 'Project Work',
    MILESTONE: 'Milestone',
    TASK: 'Task',
    REMINDER: 'Reminder',
    PHOTOSHOOT: 'Photoshoot',
    DELIVERY: 'Delivery',
    OTHER: 'Other',
  }
  return labels[category || 'OTHER'] || 'Other'
}

export function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return labels[status || 'SCHEDULED'] || 'Scheduled'
}

export function getPriorityLabel(priority?: string): string {
  const labels: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
  }
  return labels[priority || 'MEDIUM'] || 'Medium'
}

export function getAttendeeStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    DECLINED: 'Declined',
    TENTATIVE: 'Tentative',
  }
  return labels[status || 'PENDING'] || 'Pending'
}

// Format time for display
export function formatEventTime(startTime: string, endTime: string, allDay: boolean): string {
  if (allDay) {
    return 'All day'
  }

  const start = new Date(startTime)
  const end = new Date(endTime)

  const startStr = start.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const endStr = end.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${startStr} - ${endStr}`
}

// Get duration in minutes
export function getEventDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  return Math.round((end - start) / (1000 * 60))
}

// Format duration for display
export function formatEventDuration(startTime: string, endTime: string): string {
  const minutes = getEventDurationMinutes(startTime, endTime)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}m`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}m`
  }
}
