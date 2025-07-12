// useMediaQuery Hook - Indonesian Business Management System
// React hook for responsive design and media query handling

import { useState, useEffect } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (for SSR compatibility)
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

// Common breakpoint hooks for Indonesian business interface
export const useIsMobile = () => useMediaQuery('(max-width: 768px)')
export const useIsTablet = () => useMediaQuery('(max-width: 1024px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)')
export const useIsSmallMobile = () => useMediaQuery('(max-width: 480px)')
export const useIsLargeMobile = () => useMediaQuery('(min-width: 481px) and (max-width: 768px)')

// Orientation hooks
export const useIsPortrait = () => useMediaQuery('(orientation: portrait)')
export const useIsLandscape = () => useMediaQuery('(orientation: landscape)')

// High DPI/Retina display detection
export const useIsHighDPI = () => useMediaQuery('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)')

// Specific Indonesian business interface breakpoints
export const useIndonesianBusinessBreakpoints = () => {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const isSmallMobile = useIsSmallMobile()
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    // Specific breakpoints for Indonesian business features
    showMobileTableView: isMobile,
    showWhatsAppFloatingButton: isMobile,
    useCompactMateraiDisplay: isSmallMobile,
    showFullNavigationDrawer: isTablet || isDesktop,
    enableTouchOptimizations: isMobile || isTablet,
    showIndonesianShortcuts: isMobile,
    useVerticalCardLayout: isMobile,
    showBottomNavigation: isMobile
  }
}

export default useMediaQuery