import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Progress, Button, Alert, Typography, Space } from 'antd';
import {
  DownloadOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../theme';
import {
  ExportJobStatus,
  getExportStatus,
  downloadPdf,
} from '../../services/exportApi';

const { Text } = Typography;

interface ExportProgressModalProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  jobId: string | null;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  open,
  onClose,
  deckId,
  jobId,
}) => {
  const { t } = useTranslation();
  const { theme: themeConfig } = useTheme();
  const [status, setStatus] = useState<ExportJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!open || !jobId) return;

    const pollStatus = async () => {
      try {
        const result = await getExportStatus(deckId, jobId);
        setStatus(result);

        if (result.status === 'completed' || result.status === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          if (result.status === 'failed') {
            setError(result.error || t('deckEditor.exportFailed', 'Export failed'));
          }
        }
      } catch (err) {
        console.error('Failed to get export status:', err);
        setError(t('deckEditor.exportStatusError', 'Failed to check export status'));
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Initial poll
    pollStatus();

    // Start polling
    pollingRef.current = setInterval(pollStatus, 1000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, jobId, deckId, t]);

  const handleDownload = () => {
    if (jobId) {
      downloadPdf(deckId, jobId);
    }
  };

  const handleClose = () => {
    setStatus(null);
    setError(null);
    onClose();
  };

  const getStatusIcon = () => {
    if (!status) return <LoadingOutlined />;

    switch (status.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: themeConfig.colors.status.success }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: themeConfig.colors.status.error }} />;
      default:
        return <LoadingOutlined />;
    }
  };

  const getStatusText = () => {
    if (!status) return t('deckEditor.exportStarting', 'Starting export...');

    switch (status.status) {
      case 'pending':
        return t('deckEditor.exportPreparing', 'Preparing export...');
      case 'processing':
        return t('deckEditor.exportRendering', 'Rendering slide {{current}} of {{total}}...', {
          current: status.currentSlide,
          total: status.totalSlides,
        });
      case 'completed':
        return t('deckEditor.exportComplete', 'Export complete!');
      case 'failed':
        return t('deckEditor.exportFailed', 'Export failed');
      default:
        return t('deckEditor.exportProcessing', 'Processing...');
    }
  };

  return (
    <Modal
      title={t('deckEditor.exportToPdf', 'Export to PDF')}
      open={open}
      onCancel={handleClose}
      footer={null}
      closable={status?.status === 'completed' || status?.status === 'failed' || !!error}
      maskClosable={false}
    >
      <div className="py-6">
        <Space direction="vertical" size="large" className="w-full">
          {/* Status icon and text */}
          <div className="text-center">
            <div className="text-4xl mb-4">{getStatusIcon()}</div>
            <Text strong>{getStatusText()}</Text>
          </div>

          {/* Progress bar */}
          <Progress
            percent={status?.progress || 0}
            status={
              status?.status === 'failed'
                ? 'exception'
                : status?.status === 'completed'
                ? 'success'
                : 'active'
            }
            showInfo={true}
          />

          {/* Error message */}
          {error && (
            <Alert
              type="error"
              message={t('deckEditor.exportErrorTitle', 'Export Error')}
              description={error}
              showIcon
            />
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-4 mt-4">
            {status?.status === 'completed' && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                size="large"
              >
                {t('deckEditor.downloadPdf', 'Download PDF')}
              </Button>
            )}

            {(status?.status === 'completed' || status?.status === 'failed' || error) && (
              <Button onClick={handleClose}>
                {t('common.close', 'Close')}
              </Button>
            )}
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default ExportProgressModal;
