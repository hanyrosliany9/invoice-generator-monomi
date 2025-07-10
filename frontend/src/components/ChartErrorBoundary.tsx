import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Empty } from 'antd'
import { ReloadOutlined, BarChartOutlined } from '@ant-design/icons'

interface Props {
  children: ReactNode
  chartType?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

class ChartErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChartErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '24px', 
          textAlign: 'center', 
          height: '300px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '1px dashed #d9d9d9',
          borderRadius: '8px',
          backgroundColor: '#fafafa'
        }}>
          <Empty
            image={<BarChartOutlined style={{ fontSize: '48px', color: '#8c8c8c' }} />}
            description={
              <div>
                <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Grafik {this.props.chartType || 'Tidak'} Dapat Dimuat
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Terjadi kesalahan saat memuat grafik
                </div>
              </div>
            }
          >
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={this.handleRetry}
              size="small"
            >
              Coba Lagi
            </Button>
          </Empty>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChartErrorBoundary