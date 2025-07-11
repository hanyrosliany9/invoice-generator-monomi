import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons'

const { Paragraph } = Typography

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
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

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
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
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <Alert
            message="Terjadi Kesalahan"
            description={
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Paragraph>
                  Maaf, terjadi kesalahan yang tidak terduga. Silakan coba muat ulang halaman.
                </Paragraph>
                
                <Space>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />} 
                    onClick={this.handleReload}
                  >
                    Muat Ulang Halaman
                  </Button>
                  <Button onClick={this.handleReset}>
                    Coba Lagi
                  </Button>
                </Space>

                {process.env['NODE_ENV'] === 'development' && this.state.error && (
                  <details style={{ marginTop: '16px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '14px' }}>
                      Detail Error (Development)
                    </summary>
                    <pre style={{ 
                      marginTop: '8px', 
                      padding: '12px', 
                      background: '#f5f5f5', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflowX: 'auto'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </Space>
            }
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary