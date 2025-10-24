import { useState, useCallback } from 'react'

export type CalendarViewType = 'month' | 'week' | 'gantt'

/**
 * Hook for managing calendar view state with localStorage persistence
 */
export const useCalendarView = (projectId: string) => {
  const storageKey = `calendar-view-${projectId}`

  const [view, setView] = useState<CalendarViewType>(() => {
    if (typeof window === 'undefined') return 'month'
    const saved = localStorage.getItem(storageKey)
    return (saved as CalendarViewType) || 'month'
  })

  const changeView = useCallback((newView: CalendarViewType) => {
    setView(newView)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newView)
    }
  }, [storageKey])

  return { view, changeView }
}
