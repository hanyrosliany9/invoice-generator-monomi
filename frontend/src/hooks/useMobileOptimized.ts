import { useEffect, useState, useCallback } from 'react'

// Simple throttle implementation
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  const throttled = ((...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      lastExecTime = currentTime
      func(...args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastExecTime = Date.now()
        func(...args)
        timeoutId = null
      }, delay - (currentTime - lastExecTime))
    }
  }) as T & { cancel: () => void }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return throttled
}

interface MobileOptimizedState {
  isMobile: boolean
  isTablet: boolean
  isTouch: boolean
  orientation: 'portrait' | 'landscape'
  viewportHeight: number
  keyboardOpen: boolean
  connectionType: 'slow' | 'fast' | 'unknown'
}

export const useMobileOptimized = () => {
  const [state, setState] = useState<MobileOptimizedState>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    orientation: 'portrait',
    viewportHeight: window.innerHeight,
    keyboardOpen: false,
    connectionType: 'unknown'
  })

  // Detect device type and capabilities
  const detectDevice = useCallback(() => {
    const userAgent = navigator.userAgent
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android.*Tablet|Windows.*Touch/i.test(userAgent) && !isMobile
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // Detect network connection
    let connectionType: 'slow' | 'fast' | 'unknown' = 'unknown'
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection.effectiveType) {
        connectionType = ['slow-2g', '2g'].includes(connection.effectiveType) ? 'slow' : 'fast'
      }
    }

    setState(prev => ({
      ...prev,
      isMobile,
      isTablet,
      isTouch,
      connectionType
    }))
  }, [])

  // Handle orientation and viewport changes
  const handleResize = useCallback(
    throttle(() => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      const viewportHeight = window.innerHeight
      
      // Detect virtual keyboard (simplified heuristic)
      const keyboardOpen = viewportHeight < window.screen.height * 0.7

      setState(prev => ({
        ...prev,
        orientation,
        viewportHeight,
        keyboardOpen
      }))
    }, 100),
    []
  )

  useEffect(() => {
    detectDevice()
    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      handleResize.cancel()
    }
  }, [detectDevice, handleResize])

  // Mobile-optimized styles
  const getMobileStyles = useCallback((baseStyles: React.CSSProperties = {}): React.CSSProperties => {
    if (!state.isMobile) return baseStyles

    return {
      ...baseStyles,
      // Improve touch targets
      minHeight: state.isTouch ? '44px' : baseStyles.minHeight,
      // Optimize for mobile scrolling
      WebkitOverflowScrolling: 'touch',
      // Prevent zoom on input focus
      fontSize: state.isMobile ? Math.max(16, parseInt(baseStyles.fontSize as string) || 16) : baseStyles.fontSize,
      // Better touch feedback
      WebkitTapHighlightColor: 'transparent',
    }
  }, [state.isMobile, state.isTouch])

  // Touch event handlers for better responsiveness
  const getTouchProps = useCallback((onClick?: () => void) => {
    if (!state.isTouch || !onClick) return { onClick }

    let touchStartTime = 0

    return {
      onTouchStart: () => {
        touchStartTime = Date.now()
      },
      onTouchEnd: (e: React.TouchEvent) => {
        // Prevent ghost clicks and improve responsiveness
        const touchDuration = Date.now() - touchStartTime
        if (touchDuration < 500) { // Only trigger for quick taps
          e.preventDefault()
          onClick()
        }
      },
      onClick // Fallback for non-touch devices
    }
  }, [state.isTouch])

  // Optimized form field props for mobile
  const getFormFieldProps = useCallback(() => {
    if (!state.isMobile) return {}

    return {
      size: 'large' as const,
      autoComplete: 'off',
      spellCheck: false,
      // Prevent iOS zoom on focus
      style: {
        fontSize: '16px',
        ...getMobileStyles()
      }
    }
  }, [state.isMobile, getMobileStyles])

  // Virtual keyboard management
  const handleVirtualKeyboard = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    if (!state.isMobile || !inputRef.current) return

    // Scroll into view when keyboard opens
    if (state.keyboardOpen) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 300) // Delay for keyboard animation
    }
  }, [state.isMobile, state.keyboardOpen])

  // Performance optimizations for mobile
  const getPerformanceSettings = useCallback(() => {
    return {
      // Reduce animations on slow connections
      reduceMotion: state.connectionType === 'slow',
      // Enable lazy loading
      enableLazyLoading: state.isMobile,
      // Optimize image loading
      imageQuality: state.connectionType === 'slow' ? 'low' : 'high',
      // Debounce delays
      autoSaveDelay: state.connectionType === 'slow' ? 5000 : 2000,
      // Pagination size
      pageSize: state.isMobile ? 10 : 20
    }
  }, [state.connectionType, state.isMobile])

  return {
    // State
    ...state,
    
    // Utilities
    getMobileStyles,
    getTouchProps,
    getFormFieldProps,
    handleVirtualKeyboard,
    getPerformanceSettings,
    
    // Computed properties
    isSmallScreen: state.isMobile || state.isTablet,
    shouldOptimizeForMobile: state.isMobile || state.connectionType === 'slow',
    preferReducedMotion: state.connectionType === 'slow' || 
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }
}

export default useMobileOptimized