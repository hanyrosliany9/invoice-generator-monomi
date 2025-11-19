/// <reference types="vite/client" />
import '@ant-design/v5-patch-for-react-19'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools' // DISABLED: Causes 3 dev tabs to reopen repeatedly
import { ThemeProvider } from './theme'
import App from './App.tsx'
import './i18n/config' // Initialize i18n
import './index.css'

// Fix for theme initialization order - v1.1

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

  // Disable React.StrictMode in development to prevent double-rendering issues
  // that can cause browser dev tools or tabs to open repeatedly
  const AppWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode;

  root.render(
    <AppWrapper>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='dark'>
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
        </ThemeProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </AppWrapper>
  )

  if (import.meta.env.DEV) {
    console.log('✅ React app rendered successfully!')
  }
} else {
  console.error('❌ Root element not found!')
}
