/**
 * Design Tokens for Monomi Finance
 * Indonesian Business Management System
 *
 * This file contains all design tokens used across the application
 * to ensure visual consistency and maintainability.
 */

// ========================================
// COLOR SYSTEM
// ========================================

export const colors = {
  // Primary Brand Colors (Dark Slate - matching sidebar/navbar)
  primary: {
    50: '#f8f9fa',
    100: '#e9ecef',
    200: '#d1d5db',
    300: '#9ca3af',
    400: '#6b7280',
    500: '#2d3142', // Primary dark slate (matching sidebar/navbar)
    600: '#1f2230',
    700: '#191c29',
    800: '#131620',
    900: '#0d1117',
    950: '#080a0f',
  },

  // Success Colors (Revenue, Approved)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning Colors (Pending, Overdue)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error Colors (Declined, Cancelled)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral Colors (Text, Borders, Backgrounds) - matching reference sidebar
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#2d3142', // Dark sidebar color from reference
    900: '#1f2937',
    950: '#111827',
  },

  // Purple (Invoices, Projects)
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Info Colors (Quotations)
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Semantic Colors for Status
  status: {
    draft: '#8c8c8c',
    sent: '#1890ff',
    approved: '#52c41a',
    declined: '#f5222d',
    revised: '#fa8c16',
    paid: '#52c41a',
    pending: '#faad14',
    overdue: '#f5222d',
    cancelled: '#8c8c8c',
  },
} as const

// ========================================
// TYPOGRAPHY (Updated to match reference)
// ========================================

export const typography = {
  // Font Families - cleaner, more modern
  fontFamily: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  // Font Sizes (optimized for readability)
  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    lg: '17px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
} as const

// ========================================
// SPACING SYSTEM
// ========================================

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

// ========================================
// BORDER RADIUS
// ========================================

export const borderRadius = {
  none: '0px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
} as const

// ========================================
// BOX SHADOWS
// ========================================

export const shadows = {
  none: 'none',
  subtle: '0 2px 8px rgba(0, 0, 0, 0.04)',
  medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
  emphasized: '0 8px 24px rgba(0, 0, 0, 0.12)',
  strong: '0 12px 32px rgba(0, 0, 0, 0.16)',
  // Specific shadows for cards
  card: '0 4px 12px rgba(0, 0, 0, 0.05)',
  cardHover: '0 8px 24px rgba(0, 0, 0, 0.08)',
  // Header shadow
  header: '0 4px 12px rgba(0, 0, 0, 0.15)',
} as const

// ========================================
// GRADIENTS
// ========================================

export const gradients = {
  // Primary gradient for headers (dark slate theme)
  primary: 'linear-gradient(135deg, #1f2230 0%, #2d3142 50%, #3f4456 100%)',

  // Subtle gradient for default cards (keep unchanged)
  subtle: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',

  // UPDATED: Subtle light gradients for better readability (50-100 color scale)
  success: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',      // Green 50-100
  warning: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',      // Amber 50-100
  info: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',         // Blue 50-100
  purple: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',       // Purple 50-100
  danger: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',       // Red 50-100
  teal: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',         // Teal 50-100
  indigo: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',       // Indigo 50-100
  rose: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',         // Rose 50-100
  amber: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',        // Amber 50-100
  cyan: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',         // Cyan 50-100
  emerald: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',      // Emerald 50-100
  gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',     // Same as info for backward compat
} as const

// ========================================
// STAT CARD COLORS (DEPRECATED - kept for reference)
// ========================================

/**
 * @deprecated These color mappings are no longer used by StatCard component.
 * StatCard now uses pure white backgrounds with custom icon colors.
 * Use iconColor and iconBackground props directly on StatCard instead.
 *
 * Kept for backward compatibility with other components that may use these colors.
 */
export const statCardBorders = {
  success: colors.success[500],
  warning: colors.warning[500],
  info: colors.primary[500],
  purple: colors.purple[600],
  danger: colors.error[500],
  teal: '#14b8a6',
  indigo: '#2d3142',
  rose: '#f43f5e',
  amber: colors.warning[500],
  cyan: '#06b6d4',
  emerald: '#10b981',
  gradient: colors.primary[500],
  default: colors.neutral[300],
} as const

/**
 * @deprecated These icon colors are no longer used by StatCard component.
 * Use iconColor prop directly on StatCard instead.
 *
 * Kept for backward compatibility.
 */
export const statCardIcons = {
  success: colors.success[600],
  warning: colors.warning[600],
  info: colors.primary[600],
  purple: colors.purple[600],
  danger: colors.error[600],
  teal: '#0d9488',
  indigo: '#2d3142',
  rose: '#e11d48',
  amber: colors.warning[600],
  cyan: '#0891b2',
  emerald: '#059669',
  gradient: colors.primary[600],
  default: colors.neutral[600],
} as const

// ========================================
// BREAKPOINTS (Mobile-first)
// ========================================

export const breakpoints = {
  xs: '0px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1600px',
} as const

// ========================================
// Z-INDEX LAYERS
// ========================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
} as const

// ========================================
// ANIMATION DURATIONS
// ========================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
} as const

// ========================================
// COMPONENT-SPECIFIC TOKENS
// ========================================

export const components = {
  // Stat Card
  statCard: {
    background: gradients.subtle,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral[200]}`,
    boxShadow: shadows.card,
    padding: spacing[6],
  },

  // Revenue Card (Large gradient cards)
  revenueCard: {
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.neutral[200]}`,
    boxShadow: shadows.cardHover,
    padding: spacing[6],
  },

  // Table
  table: {
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral[200]}`,
    boxShadow: shadows.card,
  },

  // Modal
  modal: {
    borderRadius: borderRadius.xl,
    boxShadow: shadows.strong,
  },

  // Button
  button: {
    borderRadius: borderRadius.md,
    paddingX: spacing[4],
    paddingY: spacing[2],
  },

  // Input
  input: {
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral[300]}`,
  },
} as const

// ========================================
// INDONESIAN-SPECIFIC TOKENS
// ========================================

export const indonesian = {
  // Currency formatting
  currency: {
    symbol: 'Rp',
    locale: 'id-ID',
    maximumFractionDigits: 0,
  },

  // Date formatting
  date: {
    locale: 'id-ID',
    shortFormat: 'dd/MM/yyyy',
    longFormat: 'dd MMMM yyyy',
  },

  // Materai (stamp duty)
  materai: {
    threshold: 5000000, // 5 million IDR
    amount: 10000, // 10,000 IDR
    color: colors.warning[500],
  },
} as const

// ========================================
// TYPE EXPORTS
// ========================================

export type ColorPalette = typeof colors
export type Typography = typeof typography
export type Spacing = typeof spacing
export type BorderRadius = typeof borderRadius
export type Shadows = typeof shadows
export type Gradients = typeof gradients
export type StatCardBorders = typeof statCardBorders
export type StatCardIcons = typeof statCardIcons
export type Breakpoints = typeof breakpoints
export type ZIndex = typeof zIndex
export type Animation = typeof animation
export type Components = typeof components
export type Indonesian = typeof indonesian
