// Date utility functions with synchronized time support
import { getCurrentDateTime, isDateTimeSynced, formatIndonesianDateTime } from '../services/dateTimeSync'

/**
 * Get current date/time (synchronized with time server)
 * Use this instead of `new Date()` for accurate timestamps
 */
export const now = (): Date => {
  return getCurrentDateTime()
}

/**
 * Check if date/time is synchronized with server
 */
export const isSynced = (): boolean => {
  return isDateTimeSynced()
}

/**
 * Format date in Indonesian locale
 */
export const formatIDDate = (date?: Date, options?: Intl.DateTimeFormatOptions): string => {
  return formatIndonesianDateTime(date, options)
}

/**
 * Format date for display (short format)
 * Example: "10 Nov 2025"
 */
export const formatShortDate = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return formatIndonesianDateTime(targetDate, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format date for display (long format)
 * Example: "10 November 2025, 21:30 WIB"
 */
export const formatLongDate = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return formatIndonesianDateTime(targetDate, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Format date for forms (YYYY-MM-DD)
 */
export const formatFormDate = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate.toISOString().split('T')[0]
}

/**
 * Format time only (HH:MM)
 */
export const formatTime = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return formatIndonesianDateTime(targetDate, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get start of day (00:00:00)
 */
export const startOfDay = (date?: Date): Date => {
  const targetDate = date || now()
  const start = new Date(targetDate)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Get end of day (23:59:59)
 */
export const endOfDay = (date?: Date): Date => {
  const targetDate = date || now()
  const end = new Date(targetDate)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Get start of month
 */
export const startOfMonth = (date?: Date): Date => {
  const targetDate = date || now()
  return new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0)
}

/**
 * Get end of month
 */
export const endOfMonth = (date?: Date): Date => {
  const targetDate = date || now()
  return new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Get start of year
 */
export const startOfYear = (date?: Date): Date => {
  const targetDate = date || now()
  return new Date(targetDate.getFullYear(), 0, 1, 0, 0, 0, 0)
}

/**
 * Get end of year
 */
export const endOfYear = (date?: Date): Date => {
  const targetDate = date || now()
  return new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999)
}

/**
 * Add days to date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add months to date
 */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Add years to date
 */
export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

/**
 * Calculate difference in days between two dates
 */
export const diffDays = (date1: Date, date2: Date): number => {
  const ms = date2.getTime() - date1.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * Check if date is overdue (past current date)
 */
export const isOverdue = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate < startOfDay(now())
}

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = startOfDay(now())
  const target = startOfDay(targetDate)
  return today.getTime() === target.getTime()
}

/**
 * Check if date is in the past
 */
export const isPast = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate < now()
}

/**
 * Check if date is in the future
 */
export const isFuture = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate > now()
}

/**
 * Get relative time string (e.g., "2 hari lagi", "3 hari yang lalu")
 */
export const getRelativeTime = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const currentDate = now()
  const days = diffDays(currentDate, targetDate)

  if (days === 0) return 'Hari ini'
  if (days === 1) return 'Besok'
  if (days === -1) return 'Kemarin'
  if (days > 0) return `${days} hari lagi`
  return `${Math.abs(days)} hari yang lalu`
}
