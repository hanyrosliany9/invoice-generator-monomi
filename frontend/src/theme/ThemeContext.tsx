import React, { createContext, useContext, useEffect, useState } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { Theme, ThemeContextType, ThemeMode } from './types'
import { themes } from './themes'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'monomi-theme-mode'

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

  const [theme, setTheme] = useState<Theme>(themes[mode])

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

    root.style.setProperty('--bg-primary', colors.background.primary)
    root.style.setProperty('--bg-secondary', colors.background.secondary)
    root.style.setProperty('--text-primary', colors.text.primary)
    root.style.setProperty('--text-secondary', colors.text.secondary)
    root.style.setProperty('--border-default', colors.border.default)
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
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
