export type ThemeMode = 'light' | 'dark'

export interface ThemeColors {
  // Background colors
  background: {
    primary: string
    secondary: string
    tertiary: string
  }

  // Glassmorphism effects
  glass: {
    background: string
    backdropFilter: string
    border: string
    shadow: string
  }

  // Card colors
  card: {
    background: string
    border: string
    shadow: string
  }

  // Text colors
  text: {
    primary: string
    secondary: string
    tertiary: string
    inverse: string
  }

  // Border colors
  border: {
    default: string
    light: string
    strong: string
  }

  // Status colors (consistent across themes)
  status: {
    success: string
    warning: string
    error: string
    info: string
  }

  // Accent colors
  accent: {
    primary: string
    secondary: string
    tertiary: string
  }

  // Calendar colors
  calendar: {
    todayBg: string
    slotLabel: string
    borderColor: string
    highlightColor: string
    eventText: string
  }
}

export interface Theme {
  mode: ThemeMode
  colors: ThemeColors
}

export interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}
