import dayjs from 'dayjs'
import type { ProjectStatus } from './projectStatus'

export interface ProjectProgressData {
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
}

/**
 * Calculate project progress percentage based on status and timeline
 *
 * Algorithm:
 * - PLANNING: 5%
 * - IN_PROGRESS: Time-based calculation (0-95%)
 * - COMPLETED: 100%
 * - CANCELLED: 0%
 * - ON_HOLD: 25%
 *
 * For IN_PROGRESS projects:
 * - If dates are available, calculate based on time elapsed
 * - Caps at 95% for projects still in progress
 * - Defaults to 30% if dates are missing
 */
export const calculateProjectProgress = (project: ProjectProgressData): number => {
  const { status, startDate, endDate } = project

  // Base progress on status
  let statusProgress = 0

  switch (status) {
    case 'PLANNING':
      statusProgress = 5
      break

    case 'IN_PROGRESS':
      // Calculate based on time elapsed
      if (startDate && endDate) {
        const now = new Date()
        const start = new Date(startDate)
        const end = new Date(endDate)

        const totalDuration = end.getTime() - start.getTime()
        const elapsedDuration = now.getTime() - start.getTime()

        // Calculate progress, capped at 95% for in-progress projects
        const timeProgress = Math.max(0, Math.min(95, (elapsedDuration / totalDuration) * 100))
        statusProgress = Math.round(timeProgress)
      } else {
        // Conservative estimate when dates are missing
        statusProgress = 30
      }
      break

    case 'COMPLETED':
      statusProgress = 100
      break

    case 'CANCELLED':
      statusProgress = 0
      break

    case 'ON_HOLD':
      statusProgress = 25
      break

    default:
      statusProgress = 0
  }

  // Ensure progress is between 0 and 100
  return Math.min(Math.max(statusProgress, 0), 100)
}

/**
 * Simplified progress calculation for sorting purposes
 */
export const getProgressForSorting = (status: ProjectStatus): number => {
  switch (status) {
    case 'PLANNING':
      return 5
    case 'IN_PROGRESS':
      return 50
    case 'COMPLETED':
      return 100
    case 'CANCELLED':
      return 0
    case 'ON_HOLD':
      return 25
    default:
      return 0
  }
}

/**
 * Get progress color based on percentage
 */
export const getProgressColor = (progress: number): string => {
  if (progress >= 100) return '#52c41a' // Green
  if (progress >= 75) return '#1890ff'  // Blue
  if (progress >= 50) return '#fa8c16'  // Orange
  return '#f5222d' // Red
}

/**
 * Calculate days remaining until project end date
 */
export const getDaysRemaining = (endDate: string | null): number => {
  if (!endDate) return 0
  return dayjs(endDate).diff(dayjs(), 'day')
}

/**
 * Check if project is overdue
 */
export const isProjectOverdue = (project: ProjectProgressData): boolean => {
  return (
    project.status !== 'COMPLETED' &&
    project.status !== 'CANCELLED' &&
    dayjs().isAfter(dayjs(project.endDate))
  )
}
