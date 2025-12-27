import { useCallback, useState } from 'react';
import { Modal, Button, Upload, Empty, Space, App, Alert } from 'antd';
import { UploadOutlined, CheckOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useAssetBrowserStore, MediaAsset } from '../../stores/assetBrowserStore';
import { uploadAsset } from '../../services/assetBrowserApi';

interface AssetBrowserModalProps {
  projectId?: string; // Optional filter by project
}

export default function AssetBrowserModal({ projectId }: AssetBrowserModalProps) {
  const { message } = App.useApp();
  const {
    isOpen,
    closeModal,
    onAssetSelect,
  } = useAssetBrowserStore();

  const [uploadedAsset, setUploadedAsset] = useState<MediaAsset | null>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAsset(file, projectId),
    onSuccess: (asset) => {
      console.log('Upload successful, asset:', asset);
      message.success('Image uploaded successfully');
      setUploadedAsset(asset);
      // Auto-insert if there's a callback
      if (onAssetSelect) {
        console.log('Calling onAssetSelect callback with asset:', asset);
        setTimeout(() => {
          onAssetSelect(asset);
          handleClose();
        }, 800); // Brief delay so user sees success message
      } else {
        console.warn('No onAssetSelect callback available');
      }
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      message.error(error?.message || 'Failed to upload image');
    },
  });

  // Handle file upload
  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      message.error('Only image and video files are allowed');
      return false;
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      message.error('File size must be less than 100MB');
      return false;
    }
    uploadMutation.mutate(file);
    return false; // Prevent default upload behavior
  }, [uploadMutation, message]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setUploadedAsset(null);
    closeModal();
  }, [closeModal]);

  // Handle insert button
  const handleInsert = useCallback(() => {
    if (uploadedAsset && onAssetSelect) {
      onAssetSelect(uploadedAsset);
      handleClose();
    }
  }, [uploadedAsset, onAssetSelect, handleClose]);

  return (
    <Modal
      title="Upload Image or Video"
      open={isOpen}
      onCancel={handleClose}
      width={600}
      footer={
        uploadedAsset ? [
          <Button key="cancel" onClick={handleClose}>
            Close
          </Button>,
          <Button
            key="insert"
            type="primary"
            onClick={handleInsert}
            icon={<CheckOutlined />}
          >
            Insert & Close
          </Button>,
        ] : [
          <Button key="cancel" onClick={handleClose}>
            Cancel
          </Button>,
        ]
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 200 }}>
        {/* Info Alert */}
        <Alert
          message="Simple Upload Mode"
          description="Upload an image or video file directly. The file will be added to your canvas after upload."
          type="info"
          showIcon
        />

        {/* Upload Area */}
        {!uploadedAsset && (
          <div style={{ textAlign: 'center' }}>
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
              accept="image/*,video/*"
              multiple={false}
            >
              <div style={{ padding: '40px 20px' }}>
                {uploadMutation.isPending ? (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
                    <p>Uploading...</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<UploadOutlined />}
                    >
                      Click to Upload
                    </Button>
                    <p style={{ marginTop: 16, color: '#666' }}>
                      or drag and drop your file here
                    </p>
                    <p style={{ fontSize: 12, color: '#999' }}>
                      Supported: JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM (max 100MB)
                    </p>
                  </>
                )}
              </div>
            </Upload>
          </div>
        )}

        {/* Success State */}
        {uploadedAsset && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3>Upload Successful!</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              File: {uploadedAsset.filename}
            </p>
            {uploadedAsset.url && (
              <div style={{
                maxHeight: 200,
                overflow: 'hidden',
                borderRadius: 8,
                marginBottom: 16,
              }}>
                {uploadedAsset.mimeType.startsWith('image/') ? (
                  <img
                    src={uploadedAsset.url}
                    alt={uploadedAsset.filename}
                    style={{ maxWidth: '100%', maxHeight: 200 }}
                  />
                ) : (
                  <div style={{
                    background: '#f0f0f0',
                    padding: 20,
                    borderRadius: 8,
                    textAlign: 'center',
                  }}>
                    <p>🎬 Video uploaded successfully</p>
                  </div>
                )}
              </div>
            )}
            <Space>
              <Button onClick={() => setUploadedAsset(null)}>
                Upload Another
              </Button>
              <Button type="primary" onClick={handleInsert}>
                Insert to Canvas
              </Button>
            </Space>
          </div>
        )}
      </div>
    </Modal>
  );
}
