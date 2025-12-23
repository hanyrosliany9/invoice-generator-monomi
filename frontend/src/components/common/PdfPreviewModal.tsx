import React, { useState, useEffect } from 'react';
import { Modal, Spin, Button, Segmented, Space, message, Empty, Alert } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

export interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fetchPreview: (continuous: boolean) => Promise<Blob>;
  fetchDownload: (continuous: boolean) => Promise<Blob>;
  downloadFilename: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  open,
  onClose,
  title,
  fetchPreview,
  fetchDownload,
  downloadFilename,
}) => {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [continuous, setContinuous] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch PDF whenever continuous mode or open state changes
  useEffect(() => {
    if (!open) {
      return;
    }

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const blob = await fetchPreview(continuous);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF preview';
        setError(errorMessage);
        message.error(`Failed to load PDF: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    // Cleanup function to revoke URL when modal closes or PDF changes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, continuous, fetchPreview]);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const blob = await fetchDownload(continuous);

      // Create temporary link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${downloadFilename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('PDF downloaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF';
      message.error(`Failed to download PDF: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up PDF URL on close
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setError(null);
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      width="90%"
      style={{ maxWidth: '1200px' }}
      footer={null}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: '70vh',
          padding: '16px',
        },
      }}
    >
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>View Mode:</span>
          <Segmented
            value={continuous ? 'digital' : 'print'}
            onChange={(value) => setContinuous(value === 'digital')}
            options={[
              { label: 'Digital View', value: 'digital' },
              { label: 'Print Ready', value: 'print' },
            ]}
          />
        </div>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={loading}
        >
          Download
        </Button>
      </div>

      {/* PDF Display Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        border: '1px solid #f0f0f0',
        borderRadius: '4px',
        backgroundColor: '#fafafa',
        position: 'relative',
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 10,
          }}>
            <Spin size="large" tip="Loading PDF..." />
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '24px' }}>
            <Alert
              message="Failed to Load PDF"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          </div>
        )}

        {!pdfUrl && !loading && !error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}>
            <Empty description="No PDF loaded" />
          </div>
        )}

        {pdfUrl && !error && (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="PDF Preview"
          />
        )}
      </div>
    </Modal>
  );
};

export default PdfPreviewModal;
