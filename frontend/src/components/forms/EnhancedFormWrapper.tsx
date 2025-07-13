import React, { useState, useCallback } from 'react'
import { Card, Alert, Button, Space, Typography } from 'antd'
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import ErrorBoundary from '../ErrorBoundary'
import { useMobileOptimized } from '../../hooks/useMobileOptimized'

const { Text } = Typography

interface EnhancedFormWrapperProps {
  children: React.ReactNode
  title?: string
  onError?: (error: Error) => void
  showErrorDetails?: boolean
}

export const EnhancedFormWrapper: React.FC<EnhancedFormWrapperProps> = ({
  children,
  title = 'Form',
  onError,
  showErrorDetails = false
}) => {
  const [errorCount, setErrorCount] = useState(0)
  const mobile = useMobileOptimized()

  const handleError = useCallback((error: Error, errorInfo: any) => {
    setErrorCount(prev => prev + 1)
    
    // Log error for debugging
    console.error(`${title} Form Error:`, error, errorInfo)
    
    // Call custom error handler
    if (onError) {
      onError(error)
    }
    
    // Track error for analytics (would integrate with monitoring service)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: `${title}: ${error.message}`,
        fatal: false
      })
    }
  }, [title, onError])

  const handleReset = useCallback(() => {
    setErrorCount(0)
    window.location.reload()
  }, [])

  // Enhanced error fallback for forms
  const FormErrorFallback = useCallback(({ error }: { error: Error }) => (
    <Card style={{ margin: '16px 0' }}>
      <Alert
        message="Form Error"
        description={
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text>
              The {title.toLowerCase()} form encountered an error and couldn't load properly. 
              Your data may have been auto-saved.
            </Text>
            
            {showErrorDetails && error && (
              <details style={{ 
                marginTop: '12px',
                padding: '8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  Error Details
                </summary>
                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                </pre>
              </details>
            )}

            <Space size="small">
              <Button 
                size="small"
                icon={<ReloadOutlined />} 
                onClick={handleReset}
              >
                Reload Form
              </Button>
              <Button 
                size="small"
                type="link"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </Space>

            {errorCount > 0 && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Error count: {errorCount}
              </Text>
            )}
          </Space>
        }
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        style={{ 
          borderRadius: mobile.isMobile ? '8px' : '6px',
          ...mobile.getMobileStyles()
        }}
      />
    </Card>
  ), [title, showErrorDetails, errorCount, mobile, handleReset])

  return (
    <ErrorBoundary 
      level="component"
      onError={handleError}
      fallback={<FormErrorFallback error={new Error('Form error')} />}
    >
      {children}
    </ErrorBoundary>
  )
}

export default EnhancedFormWrapper