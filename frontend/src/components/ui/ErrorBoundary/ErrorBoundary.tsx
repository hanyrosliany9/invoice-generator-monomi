import { Component, ReactNode, ErrorInfo } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons'

const { Text } = Typography

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Alert
            message="Something went wrong"
            description={
              <div>
                <Text>An unexpected error occurred. Please try refreshing the page.</Text>
                {import.meta.env.DEV && this.state.error && (
                  <details style={{ marginTop: '16px', textAlign: 'left' }}>
                    <summary>Error details (development only)</summary>
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            }
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={
              <Space>
                <Button size="small" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button size="small" icon={<ReloadOutlined />} onClick={this.handleReload}>
                  Reload Page
                </Button>
              </Space>
            }
          />
        </div>
      )
    }

    return this.props.children
  }
}