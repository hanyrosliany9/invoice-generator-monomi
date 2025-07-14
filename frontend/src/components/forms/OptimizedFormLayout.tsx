import React, { memo, useMemo } from 'react'
import { Layout } from 'antd'
import { EntityFormLayout } from './EntityFormLayout'
import { EnhancedFormWrapper } from './EnhancedFormWrapper'
import { useMobileOptimized } from '../../hooks/useMobileOptimized'
import ErrorBoundary from '../ErrorBoundary'

const { Content } = Layout

interface OptimizedFormLayoutProps {
  hero: React.ReactNode
  sidebar?: React.ReactNode
  preview?: React.ReactNode
  children: React.ReactNode
  loading?: boolean
}

export const OptimizedFormLayout: React.FC<OptimizedFormLayoutProps> = memo(
  ({ hero, sidebar, preview, children, loading = false }) => {
    const mobile = useMobileOptimized()
    const performanceSettings = mobile.getPerformanceSettings()

    // Optimize layout based on device and connection
    const optimizedProps = useMemo(() => {
      // On mobile or slow connections, show sidebar and preview collapsed by default
      if (mobile.shouldOptimizeForMobile) {
        return {
          collapseSidebar: true,
          collapsePreview: true,
          enableVirtualScrolling: true,
        }
      }

      return {
        collapseSidebar: false,
        collapsePreview: false,
        enableVirtualScrolling: false,
      }
    }, [mobile.shouldOptimizeForMobile])

    // Apply mobile-specific styles
    const containerStyles = useMemo(() => {
      return mobile.getMobileStyles({
        minHeight: mobile.keyboardOpen ? '50vh' : '100vh',
        // Reduce padding on mobile for more screen real estate
        padding: mobile.isMobile ? '8px' : '16px',
      })
    }, [mobile])

    // Wrap sidebar and preview in error boundaries for better resilience
    const wrappedSidebar = useMemo(() => {
      if (!sidebar) return undefined

      return <ErrorBoundary level='component'>{sidebar}</ErrorBoundary>
    }, [sidebar])

    const wrappedPreview = useMemo(() => {
      if (!preview) return undefined

      // Skip preview on very slow connections to improve performance
      if (
        performanceSettings.reduceMotion &&
        mobile.connectionType === 'slow'
      ) {
        return null
      }

      return <ErrorBoundary level='component'>{preview}</ErrorBoundary>
    }, [preview, performanceSettings.reduceMotion, mobile.connectionType])

    // Main form content with enhanced error boundary
    const wrappedChildren = useMemo(
      () => (
        <EnhancedFormWrapper
          title='Form'
          onError={error => console.error('Form error:', error)}
          showErrorDetails={import.meta.env.MODE === 'development'}
        >
          <div style={containerStyles}>{children}</div>
        </EnhancedFormWrapper>
      ),
      [children, containerStyles]
    )

    return (
      <EntityFormLayout
        hero={hero}
        sidebar={wrappedSidebar}
        preview={wrappedPreview}
        {...optimizedProps}
      >
        {wrappedChildren}
      </EntityFormLayout>
    )
  }
)

OptimizedFormLayout.displayName = 'OptimizedFormLayout'

export default OptimizedFormLayout
