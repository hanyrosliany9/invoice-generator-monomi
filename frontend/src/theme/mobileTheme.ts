// Mobile Theme Constants - Invoice Generator Monomi
// 2025 Mobile UX Best Practices: Touch targets, spacing, and typography

/**
 * Mobile-optimized spacing scale
 * Based on 8px grid system with mobile-first considerations
 */
export const mobileSpacing = {
  xs: 8,    // Minimum spacing between elements
  sm: 12,   // Small spacing
  md: 16,   // Default spacing (1rem)
  lg: 24,   // Large spacing
  xl: 32,   // Extra large spacing
  xxl: 48,  // Section spacing
} as const

/**
 * Touch target sizes
 * WCAG AAA Compliance: Minimum 48x48px touch targets
 * iOS Human Interface Guidelines: 44pt minimum
 * Material Design: 48dp minimum
 */
export const touchTarget = {
  min: 48,         // WCAG AAA minimum (48x48px)
  comfortable: 56, // Comfortable tap target
  large: 64,       // Large, easy-to-tap target
  icon: 24,        // Icon size within touch target
} as const

/**
 * Mobile typography
 * Font sizes optimized for mobile readability
 * 16px body prevents iOS Safari auto-zoom on input focus
 */
export const mobileFontSize = {
  caption: 12,    // Small helper text
  body: 16,       // Default body text (prevents iOS zoom)
  bodyLarge: 18,  // Emphasized body text
  heading: 20,    // Section headings
  title: 24,      // Page titles
  display: 32,    // Hero/display text
} as const

/**
 * Mobile button sizes
 * Ensures all interactive elements meet touch target requirements
 */
export const mobileButton = {
  small: {
    height: touchTarget.min,
    padding: '0 16px',
    fontSize: mobileFontSize.body,
  },
  default: {
    height: touchTarget.comfortable,
    padding: '0 24px',
    fontSize: mobileFontSize.bodyLarge,
  },
  large: {
    height: touchTarget.large,
    padding: '0 32px',
    fontSize: mobileFontSize.heading,
  },
} as const

/**
 * Mobile form input sizes
 * Ensures inputs are easy to tap and don't trigger iOS zoom
 */
export const mobileInput = {
  height: touchTarget.min,
  fontSize: mobileFontSize.body, // 16px prevents iOS zoom
  padding: '12px 16px',
  lineHeight: '24px',
} as const

/**
 * Mobile card padding
 * Responsive padding for card components
 */
export const mobileCard = {
  padding: mobileSpacing.md,
  paddingSmall: mobileSpacing.sm,
  paddingLarge: mobileSpacing.lg,
} as const

/**
 * FloatButton positioning
 * Bottom-right positioning with safe area insets
 */
export const floatButton = {
  bottom: 24,      // Distance from bottom
  right: 24,       // Distance from right
  safeBottom: 40,  // With safe area (iOS home indicator)
  size: 56,        // Button size (comfortable tap)
  iconSize: 24,    // Icon size
  gap: 16,         // Gap between buttons in group
} as const

/**
 * Mobile modal/drawer sizes
 * Optimal sizes for mobile bottom sheets and modals
 */
export const mobileModal = {
  drawerHeight: '85vh',     // Bottom drawer height
  drawerHeightSmall: '60vh', // Small drawer height
  modalMaxWidth: '95vw',     // Modal max width
  modalTopOffset: '2vh',     // Modal top offset
} as const

/**
 * Mobile navigation
 * Bottom navigation and tab bar dimensions
 */
export const mobileNavigation = {
  bottomNavHeight: 56,      // Bottom nav height
  tabBarHeight: 48,         // Tab bar height
  headerHeight: 56,         // Mobile header height
  floatingActionSize: 56,   // FAB size
} as const

/**
 * Mobile-specific z-index scale
 * Ensures proper layering of mobile UI elements
 */
export const mobileZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  floatButton: 1200,
  drawer: 1300,
  modal: 1400,
  toast: 1500,
  tooltip: 1600,
} as const

/**
 * Mobile gesture thresholds
 * Thresholds for swipe and gesture detection
 */
export const mobileGesture = {
  swipeThreshold: 50,       // Minimum swipe distance (px)
  swipeVelocity: 0.3,       // Minimum swipe velocity
  longPressDelay: 500,      // Long press duration (ms)
  doubleTapDelay: 300,      // Double tap max delay (ms)
} as const

/**
 * Mobile animation timing
 * Performance-optimized animation durations
 */
export const mobileAnimation = {
  fast: 150,      // Fast transitions
  normal: 250,    // Normal transitions
  slow: 350,      // Slow transitions
  drawer: 300,    // Drawer slide duration
  modal: 250,     // Modal fade duration
} as const

/**
 * Indonesian business-specific mobile constants
 * Tailored for Indonesian market and Materai requirements
 */
export const indonesianMobile = {
  materaiBoxSize: 80,           // Materai stamp box size
  materaiBoxSizeMobile: 60,     // Smaller on mobile
  whatsappButtonColor: '#25D366', // WhatsApp brand color
  invoicePdfViewerHeight: '85vh', // PDF viewer height
  quotationCardHeight: 'auto',    // Auto height for quotations
} as const

/**
 * Composite mobile theme object
 * Combines all mobile theme constants
 */
export const mobileTheme = {
  spacing: mobileSpacing,
  touchTarget,
  fontSize: mobileFontSize,
  button: mobileButton,
  input: mobileInput,
  card: mobileCard,
  floatButton,
  modal: mobileModal,
  navigation: mobileNavigation,
  zIndex: mobileZIndex,
  gesture: mobileGesture,
  animation: mobileAnimation,
  indonesian: indonesianMobile,
} as const

/**
 * Helper function: Get button size based on priority
 */
export const getButtonSize = (priority: 'primary' | 'secondary' | 'tertiary' = 'secondary') => {
  switch (priority) {
    case 'primary':
      return mobileButton.large
    case 'secondary':
      return mobileButton.default
    case 'tertiary':
      return mobileButton.small
    default:
      return mobileButton.default
  }
}

/**
 * Helper function: Get responsive padding
 */
export const getResponsivePadding = (size: 'small' | 'default' | 'large' = 'default') => {
  switch (size) {
    case 'small':
      return mobileCard.paddingSmall
    case 'large':
      return mobileCard.paddingLarge
    default:
      return mobileCard.padding
  }
}

export default mobileTheme
