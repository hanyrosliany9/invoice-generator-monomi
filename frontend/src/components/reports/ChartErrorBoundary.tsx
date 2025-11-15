import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Alert, Button, Typography } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  chartTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('Chart rendering error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { chartTitle } = this.props;
      const { error } = this.state;

      return (
        <Card
          title={
            <span>
              <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
              {chartTitle || 'Chart Error'}
            </span>
          }
          style={{ marginBottom: '24px', borderColor: '#ff4d4f' }}
        >
          <Alert
            message="Failed to Render Chart"
            description={
              <div>
                <Paragraph>
                  <Text strong>Error:</Text> {error?.message || 'Unknown error occurred'}
                </Paragraph>
                <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                  This chart could not be displayed due to a configuration or data issue.
                  Common causes:
                </Paragraph>
                <ul style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>
                  <li>Missing required columns in data</li>
                  <li>Invalid data types (e.g., text in numeric fields)</li>
                  <li>Empty or malformed data</li>
                  <li>Incompatible chart configuration</li>
                </ul>
                <Button
                  type="primary"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReset}
                  style={{ marginTop: 8 }}
                >
                  Try Again
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
