/// <reference types="vite/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import idID from 'antd/locale/id_ID'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './i18n/config' // Initialize i18n
import './index.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Development logging
if (import.meta.env.DEV) {
  console.log('🚀 Starting Monomi Finance Application...')
}

const rootElement = document.getElementById('root')

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={idID}
          theme={{
            algorithm: theme.darkAlgorithm, // Enable dark mode
            token: {
              colorPrimary: '#ef4444', // Softer red primary
              colorSuccess: '#10b981', // Emerald green
              colorWarning: '#f59e0b', // Amber
              colorInfo: '#3b82f6', // Blue
              colorError: '#ef4444', // Red
              colorBgBase: '#0a0e1a', // Very dark blue-gray base
              colorBgContainer: '#1a1f2e', // Dark blue-gray containers
              colorBgElevated: '#121621', // Elevated surfaces
              colorBorder: '#2d3548', // Subtle borders
              colorBorderSecondary: '#1e2433', // Even more subtle
              colorText: '#e2e8f0', // Soft white text
              colorTextSecondary: '#94a3b8', // Muted gray text
              colorTextTertiary: '#64748b', // Very muted text
              colorTextQuaternary: '#475569', // Ultra muted
              borderRadius: 12,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 14,
              wireframe: false,
            },
            components: {
              Layout: {
                bodyBg: '#0a0e1a', // Very dark blue-gray
                headerBg: '#121621', // Slightly elevated
                siderBg: '#121621', // Matches header
                triggerBg: '#1a1f2e', // Trigger background
              },
              Menu: {
                itemBg: 'transparent',
                itemSelectedBg: 'rgba(239, 68, 68, 0.12)', // Red with transparency
                itemSelectedColor: '#ef4444', // Red selected text
                itemHoverBg: '#1a1f2e', // Subtle hover
                itemActiveBg: 'rgba(239, 68, 68, 0.18)', // Slightly more opaque
                darkItemBg: 'transparent',
                darkItemSelectedBg: 'rgba(239, 68, 68, 0.12)',
                darkItemHoverBg: '#1a1f2e',
              },
              Card: {
                borderRadiusLG: 16,
                boxShadowTertiary: '0 4px 24px rgba(0, 0, 0, 0.4)',
                colorBgContainer: '#1a1f2e',
                colorBorderSecondary: '#2d3548',
              },
              Table: {
                headerBg: '#1a1f2e',
                rowHoverBg: '#1a1f2e',
                colorBorderSecondary: '#2d3548',
              },
              Button: {
                colorPrimaryHover: '#dc2626',
                colorPrimaryActive: '#b91c1c',
                defaultBorderColor: '#2d3548',
                defaultColor: '#e2e8f0',
              },
              Input: {
                colorBgContainer: '#1a1f2e',
                colorBorder: '#2d3548',
                activeBorderColor: '#ef4444',
                hoverBorderColor: '#3d4658',
              },
              Select: {
                colorBgContainer: '#1a1f2e',
                colorBorder: '#2d3548',
                optionActiveBg: '#121621',
                optionSelectedBg: 'rgba(239, 68, 68, 0.12)',
              },
              DatePicker: {
                colorBgContainer: '#1a1f2e',
                colorBorder: '#2d3548',
                cellActiveWithRangeBg: 'rgba(239, 68, 68, 0.12)',
              },
              Statistic: {
                contentFontSize: 24,
                titleFontSize: 14,
              },
            },
          }}
          // Suppress Ant Design React 19 warning
          warning={{
            strict: false,
          }}
        >
          <AntdApp>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <App />
            </BrowserRouter>
          </AntdApp>
        </ConfigProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.StrictMode>
  )

  if (import.meta.env.DEV) {
    console.log('✅ React app rendered successfully!')
  }
} else {
  console.error('❌ Root element not found!')
}
