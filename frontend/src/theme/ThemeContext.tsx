import React, { createContext, useContext, useEffect, useState } from 'react'
import { theme as antdTheme, ConfigProvider } from 'antd'
import type { Theme, ThemeContextType, ThemeMode } from './types'

const THEME_STORAGE_KEY = 'monomi-theme-mode'

// Inline theme definitions to avoid circular dependencies
const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: {
      primary: '#191919',
      secondary: '#2F3438',
      tertiary: '#3F4448',
    },
    glass: {
      background: 'rgba(47, 52, 56, 0.7)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(63, 68, 72, 0.5)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    },
    card: {
      background: 'rgba(47, 52, 56, 0.8)',
      border: '1px solid rgba(63, 68, 72, 0.4)',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },
    text: {
      primary: '#E3E3E3',
      secondary: '#979A9B',
      tertiary: '#6B7280',
      inverse: '#191919',
    },
    border: {
      default: 'rgba(151, 154, 155, 0.2)',
      light: 'rgba(151, 154, 155, 0.1)',
      strong: 'rgba(151, 154, 155, 0.3)',
    },
    status: {
      success: '#4DAB9A',
      warning: '#FFA344',
      error: '#FF7369',
      info: '#529CCA',
    },
    accent: {
      primary: '#529CCA',
      secondary: '#9A6DD7',
      tertiary: '#E255A1',
    },
  },
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F7F6F3',
      tertiary: '#F1F1EF',
    },
    glass: {
      background: 'rgba(247, 246, 243, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(225, 224, 220, 0.6)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    },
    card: {
      background: '#FFFFFF',
      border: '1px solid #E1E0DC',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
    text: {
      primary: '#37352F',
      secondary: '#787774',
      tertiary: '#9F9A97',
      inverse: '#FFFFFF',
    },
    border: {
      default: '#E1E0DC',
      light: '#F1F1EF',
      strong: '#CFCCC8',
    },
    status: {
      success: '#448361',
      warning: '#D9730D',
      error: '#D44C47',
      info: '#337EA9',
    },
    accent: {
      primary: '#337EA9',
      secondary: '#9065B0',
      tertiary: '#C14C8A',
    },
  },
}

const themes = {
  light: lightTheme,
  dark: darkTheme,
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeMode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
}) => {
  // Get initial theme from localStorage or use default
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    }
    return defaultTheme
  })

  const [theme, setTheme] = useState<Theme>(() => themes[mode])

  // Update theme when mode changes
  useEffect(() => {
    setTheme(themes[mode])

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    }

    // Update document body class for global styles
    document.body.className = `theme-${mode}`

    // Update CSS custom properties for smooth transitions
    const root = document.documentElement
    const colors = themes[mode].colors

    // Background colors
    root.style.setProperty('--bg-primary', colors.background.primary)
    root.style.setProperty('--bg-secondary', colors.background.secondary)
    root.style.setProperty('--bg-tertiary', colors.background.tertiary)

    // Glass/Glassmorphism colors
    root.style.setProperty('--glass-background', colors.glass.background)
    root.style.setProperty('--glass-backdrop-filter', colors.glass.backdropFilter)
    root.style.setProperty('--glass-border', colors.glass.border)
    root.style.setProperty('--glass-shadow', colors.glass.shadow)

    // Card colors
    root.style.setProperty('--card-background', colors.card.background)
    root.style.setProperty('--card-border', colors.card.border)
    root.style.setProperty('--card-shadow', colors.card.shadow)

    // Text colors
    root.style.setProperty('--text-primary', colors.text.primary)
    root.style.setProperty('--text-secondary', colors.text.secondary)
    root.style.setProperty('--text-tertiary', colors.text.tertiary)
    root.style.setProperty('--text-inverse', colors.text.inverse)

    // Border colors
    root.style.setProperty('--border-default', colors.border.default)
    root.style.setProperty('--border-light', colors.border.light)
    root.style.setProperty('--border-strong', colors.border.strong)

    // Status colors
    root.style.setProperty('--status-success', colors.status.success)
    root.style.setProperty('--status-warning', colors.status.warning)
    root.style.setProperty('--status-error', colors.status.error)
    root.style.setProperty('--status-info', colors.status.info)

    // Accent colors
    root.style.setProperty('--accent-primary', colors.accent.primary)
    root.style.setProperty('--accent-secondary', colors.accent.secondary)
    root.style.setProperty('--accent-tertiary', colors.accent.tertiary)
  }, [mode])

  const toggleTheme = () => {
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const handleSetTheme = (newMode: ThemeMode) => {
    setMode(newMode)
  }

  const value: ThemeContextType = {
    theme,
    mode,
    toggleTheme,
    setTheme: handleSetTheme,
  }

  // Configure Ant Design theme based on current mode
  const antdThemeConfig = {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: theme.colors.accent.primary,
      colorSuccess: theme.colors.status.success,
      colorWarning: theme.colors.status.warning,
      colorError: theme.colors.status.error,
      colorInfo: theme.colors.status.info,
      colorBgBase: theme.colors.background.primary,
      colorTextBase: theme.colors.text.primary,
      borderRadius: 8,
      fontSize: 14,
    },
    components: {
      Card: {
        colorBgContainer: theme.colors.card.background,
        boxShadow: theme.colors.card.shadow,
      },
      Button: {
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
      },
      Input: {
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
      },
      Select: {
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
      },
    },
  }

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={antdThemeConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    // Fallback to default theme if context not available
    console.warn('useTheme called outside ThemeProvider, using default theme')
    return {
      theme: darkTheme,
      mode: 'dark' as ThemeMode,
      toggleTheme: () => {},
      setTheme: () => {},
    }
  }
  return context
}
