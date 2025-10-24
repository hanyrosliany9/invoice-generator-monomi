import { ProjectMilestone } from '../services/milestones'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    status: string
    priority: string
    revenue: number
    cost?: number
    completion: number
    description?: string
    milestoneNumber: number
  }
}

/**
 * Get color based on milestone status
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return '#1890ff' // Blue
    case 'IN_PROGRESS':
      return '#faad14' // Orange
    case 'COMPLETED':
      return '#52c41a' // Green
    case 'ACCEPTED':
      return '#52c41a' // Green
    case 'BILLED':
      return '#722ed1' // Purple
    default:
      return '#d9d9d9' // Gray
  }
}

/**
 * Get color based on priority
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'HIGH':
      return '#ff4d4f' // Red
    case 'MEDIUM':
      return '#faad14' // Orange
    case 'LOW':
      return '#52c41a' // Green
    default:
      return '#d9d9d9' // Gray
  }
}

/**
 * Get status label
 */
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'COMPLETED':
      return 'Completed'
    case 'ACCEPTED':
      return 'Accepted'
    case 'BILLED':
      return 'Billed'
    default:
      return 'Unknown'
  }
}

/**
 * Transform ProjectMilestone array to FullCalendar events
 */
export const transformMilestonesToEvents = (
  milestones: ProjectMilestone[]
): CalendarEvent[] => {
  return milestones.map((milestone) => ({
    id: milestone.id,
    title: `#${milestone.milestoneNumber} - ${milestone.name}`,
    start: milestone.plannedStartDate,
    end: new Date(
      new Date(milestone.plannedEndDate).getTime() + 24 * 60 * 60 * 1000
    ).toISOString(), // FullCalendar end dates are exclusive, add 1 day
    backgroundColor: getStatusColor(milestone.status),
    borderColor: getPriorityColor(milestone.priority),
    textColor: '#ffffff',
    extendedProps: {
      status: milestone.status,
      priority: milestone.priority,
      revenue: milestone.plannedRevenue,
      cost: milestone.estimatedCost,
      completion: milestone.completionPercentage || 0,
      description: milestone.description,
      milestoneNumber: milestone.milestoneNumber,
    },
  }))
}

/**
 * Calculate duration in days
 */
export const calculateDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get status statistics
 */
export const getStatusStats = (milestones: ProjectMilestone[]) => {
  return {
    total: milestones.length,
    pending: milestones.filter((m) => m.status === 'PENDING').length,
    inProgress: milestones.filter((m) => m.status === 'IN_PROGRESS').length,
    completed: milestones.filter((m) => m.status === 'COMPLETED').length,
    accepted: milestones.filter((m) => m.status === 'ACCEPTED').length,
    billed: milestones.filter((m) => m.status === 'BILLED').length,
  }
}
