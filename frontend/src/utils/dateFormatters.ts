import dayjs from 'dayjs'

/**
 * Format a date string to DD/MM/YYYY format
 * Returns '-' if the date is null, undefined, or invalid
 *
 * @param date - Date string or Date object
 * @param fallback - Fallback string to display (default: '-')
 * @returns Formatted date string or fallback
 */
export const formatDate = (
  date: string | Date | null | undefined,
  fallback: string = '-'
): string => {
  if (!date) return fallback

  const parsed = dayjs(date)
  if (!parsed.isValid()) return fallback

  return parsed.format('DD/MM/YYYY')
}

/**
 * Format a date string to DD MMM YYYY format (e.g., "15 Jan 2025")
 * Returns '-' if the date is null, undefined, or invalid
 *
 * @param date - Date string or Date object
 * @param fallback - Fallback string to display (default: '-')
 * @returns Formatted date string or fallback
 */
export const formatDateLong = (
  date: string | Date | null | undefined,
  fallback: string = '-'
): string => {
  if (!date) return fallback

  const parsed = dayjs(date)
  if (!parsed.isValid()) return fallback

  return parsed.format('DD MMM YYYY')
}

/**
 * Format a date string to full datetime format (e.g., "15/01/2025 14:30")
 * Returns '-' if the date is null, undefined, or invalid
 *
 * @param date - Date string or Date object
 * @param fallback - Fallback string to display (default: '-')
 * @returns Formatted datetime string or fallback
 */
export const formatDateTime = (
  date: string | Date | null | undefined,
  fallback: string = '-'
): string => {
  if (!date) return fallback

  const parsed = dayjs(date)
  if (!parsed.isValid()) return fallback

  return parsed.format('DD/MM/YYYY HH:mm')
}
