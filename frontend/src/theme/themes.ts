import { Theme } from './types'

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: {
      primary: '#0a0e1a',
      secondary: '#1a1f2e',
      tertiary: '#2d3548',
    },
    glass: {
      background: 'rgba(26, 31, 46, 0.6)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(45, 53, 72, 0.6)',
      shadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    },
    card: {
      background: 'rgba(26, 31, 46, 0.6)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      shadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
      tertiary: '#64748b',
      inverse: '#0a0e1a',
    },
    border: {
      default: 'rgba(100, 116, 139, 0.3)',
      light: 'rgba(100, 116, 139, 0.2)',
      strong: 'rgba(100, 116, 139, 0.5)',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    accent: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      tertiary: '#ec4899',
    },
  },
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      shadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    },
    card: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      inverse: '#ffffff',
    },
    border: {
      default: '#e2e8f0',
      light: '#f1f5f9',
      strong: '#cbd5e1',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    accent: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      tertiary: '#ec4899',
    },
  },
}

export const themes = {
  light: lightTheme,
  dark: darkTheme,
}
