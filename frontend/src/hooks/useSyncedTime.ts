// React hook for synchronized time
import { useState, useEffect } from 'react'
import { dateTimeSync } from '../services/dateTimeSync'
import { now } from '../utils/date'

/**
 * Hook to get current synchronized time that updates every second
 * @param updateInterval - Update interval in milliseconds (default: 1000ms)
 */
export function useSyncedTime(updateInterval: number = 1000): Date {
  const [currentTime, setCurrentTime] = useState<Date>(now())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(now())
    }, updateInterval)

    return () => clearInterval(interval)
  }, [updateInterval])

  return currentTime
}

/**
 * Hook to check if time is synchronized
 */
export function useTimeSyncStatus(): {
  isSynced: boolean
  offset: number
  lastSync: Date | null
  timezone: string
} {
  const [syncStatus, setSyncStatus] = useState(() => {
    const state = dateTimeSync.getSyncState()
    return {
      isSynced: state.isSynced,
      offset: state.offset,
      lastSync: state.isSynced ? state.lastSync : null,
      timezone: state.timezone,
    }
  })

  useEffect(() => {
    // Update sync status periodically
    const interval = setInterval(() => {
      const state = dateTimeSync.getSyncState()
      setSyncStatus({
        isSynced: state.isSynced,
        offset: state.offset,
        lastSync: state.isSynced ? state.lastSync : null,
        timezone: state.timezone,
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return syncStatus
}

/**
 * Hook to force time synchronization
 */
export function useForceTimeSync(): () => Promise<void> {
  return async () => {
    await dateTimeSync.forceSync()
  }
}
