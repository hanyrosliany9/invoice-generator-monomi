import React from 'react';
import { Modal, Progress, Typography, Space, Button, Result, theme, Alert } from 'antd';
import {
  DownloadOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { UseBulkDownloadState } from '../../hooks/useBulkDownload';

const { Text, Paragraph } = Typography;

interface BulkDownloadModalProps {
  open: boolean;
  onClose: () => void;
  state: UseBulkDownloadState;
  onCancel: () => void;
  onRetry?: () => void;
  onDownload: () => void;
}

/**
 * BulkDownloadModal Component
 *
 * Displays progress of an async bulk download job.
 * Shows:
 * - Progress bar with percentage
 * - Current file being processed
 * - Download button when complete
 * - Error state with retry option
 */
export const BulkDownloadModal: React.FC<BulkDownloadModalProps> = ({
  open,
  onClose,
  state,
  onCancel,
  onRetry,
  onDownload,
}) => {
  const { token } = theme.useToken();

  const {
    status,
    progress,
    processedFiles,
    totalFiles,
    currentFile,
    downloadUrl,
    expiresAt,
    error,
  } = state;

  const isProcessing = status === 'pending' || status === 'active';
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  // Format expiry time
  const formatExpiry = () => {
    if (!expiresAt) return '';
    const expiry = new Date(expiresAt);
    const now = new Date();
    const hoursRemaining = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    return `Link expires in ${hoursRemaining} hours`;
  };

  // Format file size
  const formatFileCount = () => {
    if (totalFiles === 0) return 'Preparing...';
    return `${processedFiles} of ${totalFiles} files`;
  };

  const renderContent = () => {
    if (isComplete) {
      return (
        <Result
          status="success"
          icon={<FileZipOutlined style={{ color: token.colorSuccess, fontSize: 64 }} />}
          title="Download Ready!"
          subTitle={
            <Space direction="vertical" size={4}>
              <Text>{totalFiles} files packaged successfully</Text>
              {expiresAt && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatExpiry()}
                </Text>
              )}
            </Space>
          }
          extra={
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={onDownload}
            >
              Download ZIP
            </Button>
          }
        />
      );
    }

    if (isFailed) {
      return (
        <Result
          status="error"
          title="Download Failed"
          subTitle={error || 'An unexpected error occurred'}
          extra={[
            onRetry && (
              <Button key="retry" type="primary" onClick={onRetry}>
                Try Again
              </Button>
            ),
            <Button key="close" onClick={onClose}>
              Close
            </Button>,
          ].filter(Boolean)}
        />
      );
    }

    if (isCancelled) {
      return (
        <Result
          status="info"
          title="Download Cancelled"
          subTitle="The download was cancelled"
          extra={
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          }
        />
      );
    }

    // Processing state
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Status Icon and Title */}
        <div style={{ textAlign: 'center' }}>
          <LoadingOutlined
            style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }}
            spin
          />
          <Paragraph style={{ margin: 0, fontSize: 16 }}>
            {status === 'pending' ? 'Preparing download...' : 'Creating ZIP archive...'}
          </Paragraph>
        </div>

        {/* Progress Bar */}
        <div>
          <Progress
            percent={progress}
            status="active"
            strokeColor={{
              '0%': token.colorPrimary,
              '100%': token.colorSuccess,
            }}
            format={(percent) => (
              <span style={{ fontSize: 14, fontWeight: 600 }}>{percent}%</span>
            )}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatFileCount()}
            </Text>
            {currentFile && (
              <Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: 200 }}>
                {currentFile}
              </Text>
            )}
          </div>
        </div>

        {/* Info Alert */}
        <Alert
          message="Your download is being prepared in the background"
          description="You can close this dialog - you'll be notified when it's ready. Large downloads may take several minutes."
          type="info"
          showIcon
        />

        {/* Cancel Button */}
        <div style={{ textAlign: 'center' }}>
          <Button onClick={onCancel}>Cancel Download</Button>
        </div>
      </Space>
    );
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          {isProcessing && <LoadingOutlined />}
          {isComplete && <CheckCircleOutlined style={{ color: token.colorSuccess }} />}
          {isFailed && <CloseCircleOutlined style={{ color: token.colorError }} />}
          <span>
            {isComplete
              ? 'Download Complete'
              : isFailed
              ? 'Download Failed'
              : 'Downloading Files'}
          </span>
        </Space>
      }
      footer={null}
      onCancel={isProcessing ? undefined : onClose}
      closable={!isProcessing}
      maskClosable={!isProcessing}
      width={480}
      centered
    >
      {renderContent()}
    </Modal>
  );
};

export default BulkDownloadModal;
