/// <reference types="vite/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp, ConfigProvider } from 'antd'
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
            token: {
              colorPrimary: '#1e40af', // Finance blue primary
              colorBgBase: '#f8fafc', // Light background
              colorBgContainer: '#ffffff', // White containers
              borderRadius: 12,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 14,
              wireframe: false,
            },
            components: {
              Layout: {
                bodyBg: '#f8fafc',
                headerBg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
                siderBg: '#ffffff',
              },
              Menu: {
                itemBg: 'transparent',
                itemSelectedBg: '#f1f5f9',
                itemHoverBg: '#f8fafc',
              },
              Card: {
                borderRadiusLG: 16,
                boxShadowTertiary: '0 4px 12px rgba(0, 0, 0, 0.05)',
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
    </React.StrictMode>,
  )
  
  if (import.meta.env.DEV) {
    console.log('✅ React app rendered successfully!')
  }
} else {
  console.error('❌ Root element not found!')
}