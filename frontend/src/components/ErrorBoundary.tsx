import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Space, Typography, Card } from 'antd'
import { ExclamationCircleOutlined, ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons'

const { Paragraph, Text } = Typography

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' // Different error levels for different UI treatment
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
    }))

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Track error for analytics (would integrate with monitoring service)
    this.trackError(error, errorInfo)
  }

  private trackError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, this would send to error tracking service like Sentry
    console.log('Error tracked:', { 
      message: error.message, 
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      level: this.props.level || 'component'
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    })
  }

  public override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isPageLevel = this.props.level === 'page'
      const { retryCount } = this.state

      // Page-level error (full screen)
      if (isPageLevel) {
        return (
          <div 
            style={{ 
              padding: '48px 24px',
              minHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
            role="alert"
            aria-live="assertive"
            aria-labelledby="error-title"
            aria-describedby="error-description"
          >
            <Card 
              style={{ 
                maxWidth: '500px', 
                width: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' 
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <div>
                  <ExclamationCircleOutlined 
                    style={{ 
                      fontSize: '48px', 
                      color: '#ff4d4f',
                      marginBottom: '16px' 
                    }} 
                  />
                  <Typography.Title level={3} id="error-title" style={{ margin: 0 }}>
                    Oops! Something went wrong
                  </Typography.Title>
                </div>

                <Paragraph id="error-description" style={{ color: '#666', fontSize: '16px' }}>
                  We encountered an unexpected error. Don't worry, our team has been notified.
                  {retryCount > 0 && (
                    <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                      Retry attempts: {retryCount}
                    </Text>
                  )}
                </Paragraph>

                <Space size="middle" wrap>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<HomeOutlined />} 
                    onClick={this.handleGoHome}
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    size="large"
                    icon={<ReloadOutlined />} 
                    onClick={this.handleReload}
                  >
                    Reload Page
                  </Button>
                  {retryCount < 3 && (
                    <Button 
                      size="large"
                      onClick={this.handleReset}
                    >
                      Try Again
                    </Button>
                  )}
                </Space>

                {process.env['NODE_ENV'] === 'development' && this.state.error && (
                  <details style={{ width: '100%', textAlign: 'left' }}>
                    <summary 
                      style={{ 
                        cursor: 'pointer', 
                        fontSize: '14px',
                        padding: '8px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }}
                    >
                      <BugOutlined style={{ marginRight: '8px' }} />
                      Development Error Details
                    </summary>
                    <pre style={{ 
                      marginTop: '8px', 
                      padding: '12px', 
                      background: '#f5f5f5', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflowX: 'auto',
                      border: '1px solid #d9d9d9'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </Space>
            </Card>
          </div>
        )
      }

      // Component-level error (inline)
      return (
        <Alert
          message="Component Error"
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text>This component encountered an error and couldn't load properly.</Text>
              <Space size="small">
                <Button 
                  size="small"
                  icon={<ReloadOutlined />} 
                  onClick={this.handleReset}
                  disabled={retryCount >= 3}
                >
                  {retryCount >= 3 ? 'Max retries reached' : 'Retry'}
                </Button>
              </Space>
            </Space>
          }
          type="error"
          showIcon
          style={{ margin: '8px 0' }}
          role="alert"
          aria-live="polite"
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary