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
              colorPrimary: '#dc2626', // Red primary for dark theme
              colorBgBase: '#0f172a', // Dark slate background
              colorBgContainer: '#1e293b', // Darker slate containers
              colorBgElevated: '#334155', // Elevated surfaces
              colorBorder: '#475569', // Border color
              colorText: '#f1f5f9', // Light text
              colorTextSecondary: '#cbd5e1', // Secondary text
              colorTextTertiary: '#94a3b8', // Tertiary text
              borderRadius: 12,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 14,
              wireframe: false,
            },
            components: {
              Layout: {
                bodyBg: '#0f172a', // Dark slate body
                headerBg: '#1e293b', // Darker slate header
                siderBg: '#1e293b', // Darker slate sidebar
                triggerBg: '#334155', // Trigger background
              },
              Menu: {
                itemBg: 'transparent',
                itemSelectedBg: '#dc262620', // Red selected with transparency
                itemSelectedColor: '#dc2626', // Red selected text
                itemHoverBg: '#334155', // Hover background
                itemActiveBg: '#dc262630', // Active background
                darkItemBg: 'transparent',
                darkItemSelectedBg: '#dc262620',
                darkItemHoverBg: '#334155',
              },
              Card: {
                borderRadiusLG: 16,
                boxShadowTertiary: '0 4px 12px rgba(0, 0, 0, 0.3)',
                colorBgContainer: '#1e293b',
              },
              Table: {
                headerBg: '#334155',
                rowHoverBg: '#334155',
              },
              Button: {
                colorPrimaryHover: '#b91c1c',
                colorPrimaryActive: '#991b1b',
              },
              Input: {
                colorBgContainer: '#334155',
                colorBorder: '#475569',
              },
              Select: {
                colorBgContainer: '#334155',
                colorBorder: '#475569',
              },
              DatePicker: {
                colorBgContainer: '#334155',
                colorBorder: '#475569',
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
