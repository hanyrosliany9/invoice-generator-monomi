// Centralized Breakpoint Configuration - Invoice Generator Monomi
// Consistent breakpoint values for responsive design across the application

export const breakpoints = {
  mobile: 768,        // Mobile devices (max-width)
  tablet: 1024,       // Tablet devices (max-width)
  desktop: 1280,      // Desktop devices (min-width)
  smallMobile: 480,   // Small mobile devices (max-width)
  tinyMobile: 375,    // Tiny mobile devices like iPhone SE (max-width)
} as const

export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile}px)`,
  tablet: `(max-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
  smallMobile: `(max-width: ${breakpoints.smallMobile}px)`,
  tinyMobile: `(max-width: ${breakpoints.tinyMobile}px)`,

  // Orientation queries
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',

  // Device-specific queries
  touch: '(hover: none) and (pointer: coarse)',
  highDPI: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',

  // Accessibility queries
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
  darkMode: '(prefers-color-scheme: dark)',
} as const

// Ant Design responsive Grid breakpoints
// These match Ant Design's default breakpoints for consistency
export const antBreakpoints = {
  xs: 0,    // Extra small (mobile)
  sm: 576,  // Small (tablet)
  md: 768,  // Medium (small desktop) - matches our mobile breakpoint
  lg: 992,  // Large (desktop)
  xl: 1200, // Extra large (wide desktop)
  xxl: 1600, // 2X extra large (very wide)
} as const

// Helper functions for use in styled components or inline styles
export const minWidth = (bp: keyof typeof breakpoints) =>
  `@media (min-width: ${breakpoints[bp]}px)`

export const maxWidth = (bp: keyof typeof breakpoints) =>
  `@media (max-width: ${breakpoints[bp]}px)`

export const between = (min: keyof typeof breakpoints, max: keyof typeof breakpoints) =>
  `@media (min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max]}px)`

// Indonesian business-specific breakpoint helpers
export const indonesianBusinessBreakpoints = {
  // Show WhatsApp floating button on mobile
  showWhatsAppButton: mediaQueries.mobile,

  // Use compact Materai display on small screens
  compactMateraiDisplay: mediaQueries.smallMobile,

  // Show mobile table view instead of desktop tables
  useMobileTableView: mediaQueries.mobile,

  // Show bottom navigation on mobile
  showBottomNavigation: mediaQueries.mobile,

  // Use vertical card layout for Indonesian business entities
  useVerticalCardLayout: mediaQueries.mobile,

  // Enable touch optimizations
  enableTouchOptimizations: mediaQueries.touch,
} as const

export default breakpoints
