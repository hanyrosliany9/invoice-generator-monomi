// Export types first (no runtime dependencies)
export type { Theme, ThemeMode, ThemeColors, ThemeContextType } from './types'

// Export ThemeProvider and useTheme - theme objects are internal to ThemeContext to avoid circular dependencies
export { ThemeProvider, useTheme } from './ThemeContext'

// Note: darkTheme, lightTheme, and themes are now internal to ThemeContext.tsx
// If you need to access them directly, import from './ThemeContext' instead
// This prevents circular dependency issues during bundling
