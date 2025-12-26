// Category colors for calendar events - using theme colors
// Dark mode: #529CCA (primary), #9A6DD7 (secondary), #E255A1 (tertiary), #FFA344 (warning), #FF7369 (error)
// Light mode: #337EA9 (primary), #9065B0 (secondary), #C14C8A (tertiary), #D9730D (warning), #D44C47 (error)
export const CATEGORY_COLORS_DARK: Record<string, string> = {
  MEETING: '#529CCA',      // Theme Primary (Blue)
  PROJECT_WORK: '#4DAB9A', // Theme Success (Teal)
  MILESTONE: '#9A6DD7',    // Theme Secondary (Purple)
  TASK: '#FFA344',         // Theme Warning (Orange)
  REMINDER: '#FF7369',     // Theme Error (Red)
  PHOTOSHOOT: '#E255A1',   // Theme Tertiary (Magenta)
  DELIVERY: '#E255A1',     // Theme Tertiary (Magenta)
  OTHER: '#979A9B',        // Theme Text Secondary (Gray)
}

export const CATEGORY_COLORS_LIGHT: Record<string, string> = {
  MEETING: '#337EA9',      // Theme Primary (Blue)
  PROJECT_WORK: '#448361', // Theme Success (Green)
  MILESTONE: '#9065B0',    // Theme Secondary (Purple)
  TASK: '#D9730D',         // Theme Warning (Orange)
  REMINDER: '#D44C47',     // Theme Error (Red)
  PHOTOSHOOT: '#C14C8A',   // Theme Tertiary (Magenta)
  DELIVERY: '#C14C8A',     // Theme Tertiary (Magenta)
  OTHER: '#787774',        // Theme Text Secondary (Gray)
}

export const PRIORITY_COLORS_DARK: Record<string, string> = {
  LOW: '#4DAB9A',  // Theme Success (Teal)
  MEDIUM: '#FFA344', // Theme Warning (Orange)
  HIGH: '#FF7369',   // Theme Error (Red)
}

export const PRIORITY_COLORS_LIGHT: Record<string, string> = {
  LOW: '#448361',  // Theme Success (Green)
  MEDIUM: '#D9730D', // Theme Warning (Orange)
  HIGH: '#D44C47',   // Theme Error (Red)
}

export const STATUS_COLORS_DARK: Record<string, string> = {
  SCHEDULED: '#529CCA',   // Theme Primary (Blue)
  IN_PROGRESS: '#FFA344', // Theme Warning (Orange)
  COMPLETED: '#4DAB9A',   // Theme Success (Teal)
  CANCELLED: '#979A9B',   // Theme Text Secondary (Gray)
}

export const STATUS_COLORS_LIGHT: Record<string, string> = {
  SCHEDULED: '#337EA9',   // Theme Primary (Blue)
  IN_PROGRESS: '#D9730D', // Theme Warning (Orange)
  COMPLETED: '#448361',   // Theme Success (Green)
  CANCELLED: '#787774',   // Theme Text Secondary (Gray)
}

export const ATTENDEE_STATUS_COLORS_DARK: Record<string, string> = {
  PENDING: '#FFA344',    // Theme Warning (Orange)
  ACCEPTED: '#4DAB9A',   // Theme Success (Teal)
  DECLINED: '#FF7369',   // Theme Error (Red)
  TENTATIVE: '#529CCA',  // Theme Primary (Blue)
}

export const ATTENDEE_STATUS_COLORS_LIGHT: Record<string, string> = {
  PENDING: '#D9730D',    // Theme Warning (Orange)
  ACCEPTED: '#448361',   // Theme Success (Green)
  DECLINED: '#D44C47',   // Theme Error (Red)
  TENTATIVE: '#337EA9',  // Theme Primary (Blue)
}

// Get colors based on current theme mode
function getThemeMode(): 'dark' | 'light' {
  // Check CSS variable to detect theme mode
  const isDark = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') === '#191919'
  return isDark ? 'dark' : 'light'
}

export const CATEGORY_COLORS: Record<string, string> = CATEGORY_COLORS_DARK
export const PRIORITY_COLORS: Record<string, string> = PRIORITY_COLORS_DARK
export const STATUS_COLORS: Record<string, string> = STATUS_COLORS_DARK
export const ATTENDEE_STATUS_COLORS: Record<string, string> = ATTENDEE_STATUS_COLORS_DARK

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
