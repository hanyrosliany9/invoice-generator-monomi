/// <reference types="vite/client" />
// Embed build time so every deploy produces a unique bundle hash.
// Without this, Rollup can assign the same hash to two different builds when
// only lazy-loaded chunks change (the entry point content is identical).
if (import.meta.env.VITE_BUILD_TIME) {
  (window as unknown as Record<string, unknown>).__BUILD_TIME__ = import.meta.env.VITE_BUILD_TIME;
}
import '@ant-design/v5-patch-for-react-19'
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools' // DISABLED: Causes 3 dev tabs to reopen repeatedly
import { ThemeProvider } from './theme'
import { getPortalMount } from './portal/mount'
import { queryClient } from './lib/queryClient'
import './i18n/config' // Initialize i18n
import './styles/tokens.css'
import './index.css'

// Fix for theme initialization order - v1.1

// Both apps are lazy so the portal host never evaluates the staff App module
// (its token refresh, date/time sync and auth-guard effects) and vice versa.
const App = lazy(() => import('./App.tsx'))
const PortalApp = lazy(() => import('./portal/PortalApp'))
const portalMount = getPortalMount()

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
        {/* Wrap antd's CSS-in-JS in `@layer antd` (order declared in index.css)
            so its unlayered-looking resets (`a`, etc.) cannot override
            Tailwind's layered utilities. */}
        <StyleProvider layer>
        <ThemeProvider defaultTheme='dark'>
          <AntdApp>
            <BrowserRouter
              basename={portalMount?.basename}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Suspense fallback={null}>
                {portalMount ? <PortalApp /> : <App />}
              </Suspense>
            </BrowserRouter>
          </AntdApp>
        </ThemeProvider>
        </StyleProvider>
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
