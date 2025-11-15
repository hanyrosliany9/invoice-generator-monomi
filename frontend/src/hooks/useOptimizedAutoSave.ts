import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageInstance } from 'antd/es/message/interface'
import { now } from '../utils/date'

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

interface UseOptimizedAutoSaveOptions {
  delay?: number // Debounce delay in ms
  maxRetries?: number
  messageApi: MessageInstance
  onSave: (data: any) => Promise<void>
  onError?: (error: Error) => void
  enabled?: boolean
}

interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  isDirty: boolean
  saveCount: number
  errorCount: number
}

export const useOptimizedAutoSave = (options: UseOptimizedAutoSaveOptions) => {
  const {
    delay = 2000, // 2 seconds default
    maxRetries = 3,
    messageApi,
    onSave,
    onError,
    enabled = true,
  } = options

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    isDirty: false,
    saveCount: 0,
    errorCount: 0,
  })

  const retryCountRef = useRef(0)
  const lastDataRef = useRef<any>(null)

  // Create a debounced save function
  const debouncedSave = useCallback(
    debounce(async (data: any) => {
      if (!enabled || !data) return

      // Skip if data hasn't changed
      if (JSON.stringify(data) === JSON.stringify(lastDataRef.current)) {
        return
      }

      setState(prev => ({ ...prev, isSaving: true }))

      try {
        await onSave(data)

        // Success - reset retry count and update state
        retryCountRef.current = 0
        lastDataRef.current = data

        setState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: now(),
          isDirty: false,
          saveCount: prev.saveCount + 1,
        }))

        // Show subtle success indication (only after first few saves)
        if (state.saveCount < 3) {
          messageApi.success('Draft saved', 1)
        }
      } catch (error) {
        retryCountRef.current++

        setState(prev => ({
          ...prev,
          isSaving: false,
          errorCount: prev.errorCount + 1,
        }))

        // Retry if under max retries
        if (retryCountRef.current < maxRetries) {
          console.warn(
            `Auto-save failed, retrying (${retryCountRef.current}/${maxRetries})`
          )
          setTimeout(() => debouncedSave(data), 1000 * retryCountRef.current) // Exponential backoff
        } else {
          console.error('Auto-save failed after max retries:', error)
          messageApi.error('Auto-save failed. Please save manually.', 3)
          onError?.(error as Error)
        }
      }
    }, delay),
    [delay, enabled, maxRetries, messageApi, onSave, onError, state.saveCount]
  )

  // Trigger auto-save when data changes
  const triggerAutoSave = useCallback(
    (data: any) => {
      if (!enabled) return

      setState(prev => ({ ...prev, isDirty: true }))
      debouncedSave(data)
    },
    [debouncedSave, enabled]
  )

  // Manual save function (bypasses debounce)
  const forceSave = useCallback(
    async (data: any) => {
      if (!enabled || !data) return

      debouncedSave.cancel() // Cancel any pending auto-saves

      setState(prev => ({ ...prev, isSaving: true }))

      try {
        await onSave(data)
        lastDataRef.current = data

        setState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: now(),
          isDirty: false,
          saveCount: prev.saveCount + 1,
        }))

        messageApi.success('Saved successfully')
      } catch (error) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          errorCount: prev.errorCount + 1,
        }))

        messageApi.error('Save failed')
        onError?.(error as Error)
        throw error
      }
    },
    [enabled, messageApi, onSave, onError, debouncedSave]
  )

  // Reset state
  const reset = useCallback(() => {
    debouncedSave.cancel()
    retryCountRef.current = 0
    lastDataRef.current = null

    setState({
      isSaving: false,
      lastSaved: null,
      isDirty: false,
      saveCount: 0,
      errorCount: 0,
    })
  }, [debouncedSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  // Get human-readable last saved time
  const getLastSavedText = useCallback(() => {
    if (!state.lastSaved) return 'Never saved'

    const currentTime = now()
    const diffMs = currentTime.getTime() - state.lastSaved.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)

    if (diffSeconds < 60) {
      return `Saved ${diffSeconds} seconds ago`
    } else if (diffMinutes < 60) {
      return `Saved ${diffMinutes} minutes ago`
    } else {
      return `Saved at ${state.lastSaved.toLocaleTimeString()}`
    }
  }, [state.lastSaved])

  return {
    // State
    ...state,

    // Actions
    triggerAutoSave,
    forceSave,
    reset,

    // Utilities
    getLastSavedText,
    canSave: enabled && !state.isSaving,
    hasUnsavedChanges: state.isDirty,
  }
}

export default useOptimizedAutoSave
