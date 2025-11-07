// useMediaQuery Hook - Indonesian Business Management System
// React hook for responsive design and media query handling

import { useEffect, useState } from 'react'
import { mediaQueries } from '../theme/breakpoints'

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
// Now using centralized breakpoint configuration
export const useIsMobile = () => useMediaQuery(mediaQueries.mobile)
export const useIsTablet = () => useMediaQuery(mediaQueries.tablet)
export const useIsDesktop = () => useMediaQuery(mediaQueries.desktop)
export const useIsSmallMobile = () => useMediaQuery(mediaQueries.smallMobile)
export const useIsLargeMobile = () =>
  useMediaQuery('(min-width: 481px) and (max-width: 768px)')

// Orientation hooks
export const useIsPortrait = () => useMediaQuery(mediaQueries.portrait)
export const useIsLandscape = () => useMediaQuery(mediaQueries.landscape)

// High DPI/Retina display detection
export const useIsHighDPI = () => useMediaQuery(mediaQueries.highDPI)

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
    showBottomNavigation: isMobile,
  }
}

export default useMediaQuery
