import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Typography } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced error boundary for chart components
 * Prevents entire page crashes when chart rendering fails
 * Provides user-friendly error UI with retry functionality
 *
 * @example
 * <ChartErrorBoundary>
 *   <ChartRenderer config={config} data={data} />
 * </ChartErrorBoundary>
 */
export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Chart Error Boundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Alert
          message="Chart Rendering Error"
          description={
            <div>
              <Paragraph>
                <BugOutlined /> This chart encountered an error and could not be displayed.
              </Paragraph>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Paragraph>
                  <Text code>{this.state.error.message}</Text>
                </Paragraph>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
                size="small"
                type="primary"
              >
                Try Again
              </Button>
            </div>
          }
          type="error"
          showIcon
          style={{ margin: '16px 0' }}
        />
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
