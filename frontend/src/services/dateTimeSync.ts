// Date/Time Synchronization Service
// Uses WorldTimeAPI for accurate date/time with Indonesian timezone support

/**
 * WorldTimeAPI Response Interface
 */
interface WorldTimeAPIResponse {
  abbreviation: string
  client_ip: string
  datetime: string // ISO 8601 format
  day_of_week: number
  day_of_year: number
  dst: boolean
  dst_from: string | null
  dst_offset: number
  dst_until: string | null
  raw_offset: number
  timezone: string
  unixtime: number
  utc_datetime: string
  utc_offset: string
  week_number: number
}

/**
 * Fallback API response interface (timeapi.io)
 */
interface TimeAPIResponse {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  seconds: number
  milliSeconds: number
  dateTime: string
  date: string
  time: string
  timeZone: string
  dayOfWeek: string
  dstActive: boolean
}

/**
 * Date/Time sync configuration
 */
interface DateTimeSyncConfig {
  timezone: string
  syncIntervalMinutes: number
  retryAttempts: number
  retryDelayMs: number
}

/**
 * Synchronized date/time state
 */
interface SyncedDateTime {
  serverTime: Date
  localTime: Date
  offset: number // milliseconds
  timezone: string
  lastSync: Date
  isSynced: boolean
}

class DateTimeSyncService {
  private static instance: DateTimeSyncService
  private config: DateTimeSyncConfig
  private syncState: SyncedDateTime
  private syncInterval: NodeJS.Timeout | null = null
  private syncInProgress = false

  private constructor() {
    this.config = {
      timezone: 'Asia/Jakarta', // Indonesian WIB
      syncIntervalMinutes: 1440, // Sync every 24 hours (1440 minutes)
      retryAttempts: 3,
      retryDelayMs: 2000,
    }

    this.syncState = {
      serverTime: new Date(),
      localTime: new Date(),
      offset: 0,
      timezone: 'Asia/Jakarta',
      lastSync: new Date(),
      isSynced: false,
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DateTimeSyncService {
    if (!DateTimeSyncService.instance) {
      DateTimeSyncService.instance = new DateTimeSyncService()
    }
    return DateTimeSyncService.instance
  }

  /**
   * Initialize date/time synchronization
   */
  public async initialize(): Promise<void> {
    // console.log('[DateTimeSync] Initializing date/time synchronization...')

    // Perform initial sync
    await this.syncWithServer()

    // Set up periodic sync
    this.startPeriodicSync()

    // Sync on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.syncInProgress) {
        this.syncWithServer()
      }
    })
  }

  /**
   * Sync with time server (with fallback APIs)
   */
  private async syncWithServer(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[DateTimeSync] Sync already in progress, skipping...')
      return
    }

    this.syncInProgress = true

    try {
      // Try multiple APIs in sequence (prioritize most reliable)
      const apis = [
        { name: 'Backend', fetch: () => this.fetchBackendTime() },
        { name: 'WorldClock', fetch: () => this.fetchWorldClockAPI() },
        { name: 'TimeAPI.io', fetch: () => this.fetchTimeAPIIO() },
        { name: 'WorldTimeAPI', fetch: () => this.fetchWorldTimeAPI() },
      ]

      for (const api of apis) {
        try {
          const serverTime = await api.fetch()
          if (serverTime) {
            this.updateSyncState(serverTime)
            // console.log(`[DateTimeSync] Successfully synced with ${api.name}`)
            return
          }
        } catch (error) {
          console.warn(`[DateTimeSync] ${api.name} failed, trying next...`)
        }
      }

      // If all APIs fail, use local time
      console.warn('[DateTimeSync] All time APIs failed, using local time')
      this.updateSyncState(new Date())

    } catch (error) {
      console.error('[DateTimeSync] Sync error:', error)
      this.updateSyncState(new Date())
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Fetch time from our own backend (most reliable, no external dependencies)
   */
  private async fetchBackendTime(): Promise<Date | null> {
    try {
      const response = await fetch('/api/v1/system/time', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout for local backend
      })

      if (!response.ok) {
        console.warn(`[DateTimeSync] Backend returned ${response.status}`)
        return null
      }

      const data = await response.json()
      return new Date(data.currentTime || data.data?.currentTime || data.timestamp)

    } catch (error) {
      console.warn('[DateTimeSync] Backend fetch failed, trying external APIs...', error)
      return null
    }
  }

  /**
   * Fetch time from WorldClock API (fastest, no CORS issues)
   */
  private async fetchWorldClockAPI(): Promise<Date | null> {
    try {
      const response = await fetch(
        'https://worldclockapi.com/api/json/utc/now',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      )

      if (!response.ok) {
        console.warn(`[DateTimeSync] WorldClock returned ${response.status}`)
        return null
      }

      const data = await response.json()
      // WorldClock returns UTC time, adjust for WIB (+7 hours)
      const utcTime = new Date(data.currentDateTime)
      const wibTime = new Date(utcTime.getTime() + (7 * 60 * 60 * 1000))
      return wibTime

    } catch (error) {
      console.warn('[DateTimeSync] WorldClock fetch failed:', error)
      return null
    }
  }

  /**
   * Fetch time from WorldTimeAPI
   */
  private async fetchWorldTimeAPI(): Promise<Date | null> {
    try {
      const response = await fetch(
        `https://worldtimeapi.org/api/timezone/${this.config.timezone}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      )

      if (!response.ok) {
        console.warn(`[DateTimeSync] WorldTimeAPI returned ${response.status}`)
        return null
      }

      const data: WorldTimeAPIResponse = await response.json()
      return new Date(data.datetime)

    } catch (error) {
      console.warn('[DateTimeSync] WorldTimeAPI fetch failed:', error)
      return null
    }
  }

  /**
   * Fetch time from timeapi.io (fallback)
   */
  private async fetchTimeAPIIO(): Promise<Date | null> {
    try {
      const response = await fetch(
        `https://timeapi.io/api/Time/current/zone?timeZone=${this.config.timezone}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      )

      if (!response.ok) {
        console.warn(`[DateTimeSync] timeapi.io returned ${response.status}`)
        return null
      }

      const data: TimeAPIResponse = await response.json()
      return new Date(data.dateTime)

    } catch (error) {
      console.warn('[DateTimeSync] timeapi.io fetch failed:', error)
      return null
    }
  }

  /**
   * Update sync state with new server time
   */
  private updateSyncState(serverTime: Date): void {
    const localTime = new Date()
    const offset = serverTime.getTime() - localTime.getTime()

    this.syncState = {
      serverTime,
      localTime,
      offset,
      timezone: this.config.timezone,
      lastSync: new Date(),
      isSynced: true,
    }

    // Log sync info (only show warnings for significant offset)
    const offsetMinutes = Math.round(offset / 60000)
    if (Math.abs(offsetMinutes) > 1) {
      console.warn(
        `[DateTimeSync] Clock offset detected: ${offsetMinutes} minutes. ` +
        `Server time: ${serverTime.toISOString()}, Local time: ${localTime.toISOString()}`
      )
    }
    // else {
    //   console.log('[DateTimeSync] Clock is synchronized (offset < 1 minute)')
    // }
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(
      () => this.syncWithServer(),
      this.config.syncIntervalMinutes * 60 * 1000
    )

    // const hours = Math.floor(this.config.syncIntervalMinutes / 60)
    // console.log(
    //   `[DateTimeSync] Periodic sync started (every ${hours} hours / ${this.config.syncIntervalMinutes} minutes)`
    // )
  }

  /**
   * Stop periodic synchronization
   */
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('[DateTimeSync] Periodic sync stopped')
    }
  }

  /**
   * Get current synchronized date/time
   */
  public now(): Date {
    if (!this.syncState.isSynced) {
      return new Date()
    }

    const timeSinceLastSync = Date.now() - this.syncState.localTime.getTime()
    return new Date(this.syncState.serverTime.getTime() + timeSinceLastSync)
  }

  /**
   * Get sync state information
   */
  public getSyncState(): SyncedDateTime {
    return { ...this.syncState }
  }

  /**
   * Check if time is synchronized
   */
  public isSynced(): boolean {
    return this.syncState.isSynced
  }

  /**
   * Get clock offset in milliseconds
   */
  public getOffset(): number {
    return this.syncState.offset
  }

  /**
   * Format date/time for Indonesian locale
   */
  public formatIndonesian(date?: Date, options?: Intl.DateTimeFormatOptions): string {
    const targetDate = date || this.now()

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: this.config.timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }

    return new Intl.DateTimeFormat('id-ID', defaultOptions).format(targetDate)
  }

  /**
   * Force immediate synchronization
   */
  public async forceSync(): Promise<void> {
    await this.syncWithServer()
  }
}

// Export singleton instance
export const dateTimeSync = DateTimeSyncService.getInstance()

// Export convenience function for getting current time
export const getCurrentDateTime = (): Date => {
  return dateTimeSync.now()
}

// Export function to check if synced
export const isDateTimeSynced = (): boolean => {
  return dateTimeSync.isSynced()
}

// Export Indonesian formatting function
export const formatIndonesianDateTime = (
  date?: Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  return dateTimeSync.formatIndonesian(date, options)
}
