import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Space } from 'antd'
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons'

interface Props {
  children: ReactNode
  formTitle?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

class FormErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FormErrorBoundary caught an error:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px' }}>
          <Alert
            message={`Kesalahan pada Form ${this.props.formTitle || ''}`}
            description={
              <Space direction='vertical' size='small'>
                <div>
                  Terjadi kesalahan saat memuat form. Data yang sudah dimasukkan
                  mungkin hilang.
                </div>
                <div>
                  <Button
                    type='primary'
                    icon={<ReloadOutlined />}
                    onClick={this.handleReset}
                    size='small'
                  >
                    Muat Ulang Form
                  </Button>
                </div>
              </Space>
            }
            type='error'
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        </div>
      )
    }

    return this.props.children
  }
}

export default FormErrorBoundary
