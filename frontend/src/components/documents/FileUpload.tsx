import React, { useState, useCallback } from 'react';
import { Upload, Button, List, Typography, Tag, Space, Popconfirm, Modal, App } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text } = Typography;

interface Document {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  uploadedAt: string;
}

interface FileUploadProps {
  invoiceId?: string;
  quotationId?: string;
  projectId?: string;
  documents: Document[];
  onDocumentsChange: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  invoiceId,
  quotationId,
  projectId,
  documents,
  onDocumentsChange,
}) => {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '=�';
    if (mimeType.includes('image')) return '=�';
    if (mimeType.includes('word')) return '=�';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '=�';
    return '=�';
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file as File);
      formData.append('uploadedBy', 'current-user-id'); // Replace with actual user ID
      
      if (invoiceId) {
        formData.append('invoiceId', invoiceId);
      }
      if (quotationId) {
        formData.append('quotationId', quotationId);
      }
      if (projectId) {
        formData.append('projectId', projectId);
      }
      
      try {
        const response = await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        message.success(`${(file as File).name} file uploaded successfully`);
        onSuccess?.(result);
        onDocumentsChange();
      } catch (error) {
        console.error('Upload error:', error);
        message.error(`${(file as File).name} file upload failed.`);
        onError?.(error as Error);
      } finally {
        setUploading(false);
      }
    },
    onChange: (info) => {
      console.log('Upload onChange:', info);
    },
    accept: '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx',
    beforeUpload: (file) => {
      const isValidType = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ].includes(file.type);

      if (!isValidType) {
        message.error('You can only upload PDF, Image, Word, or Excel files!');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }

      return true;
    },
  };

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/v1/documents/download/${documentId}`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Download failed');
    }
  };

  const handlePreview = (document: Document) => {
    setPreviewDocument(document);
    setPreviewVisible(true);
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/v1/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      message.success('Document deleted successfully');
      onDocumentsChange();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const renderPreviewContent = () => {
    if (!previewDocument) return null;

    const previewUrl = `/api/v1/documents/preview/${previewDocument.id}`;
    const { mimeType } = previewDocument;

    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={previewDocument.originalFileName}
        />
      );
    }

    if (mimeType.startsWith('image/')) {
      return (
        <div style={{ textAlign: 'center', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={previewUrl}
            alt={previewDocument.originalFileName}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    }

    // For other file types (Word, Excel, etc.)
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <FileOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <p>Preview not available for this file type.</p>
        <p>You can download the file to view it.</p>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(previewDocument.id, previewDocument.originalFileName)}
        >
          Download File
        </Button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            Click to Upload File
          </Button>
        </Upload>
        <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
          Support for PDF, Images, Word, and Excel files. Maximum file size: 10MB
        </div>
      </div>
      
      <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">Or drag file to this area to upload</p>
        <p className="ant-upload-hint">
          Support for PDF, Images, Word, and Excel files. Maximum file size: 10MB
        </p>
      </Upload.Dragger>

      {documents.length > 0 && (
        <List
          header={<div>Uploaded Documents ({documents.length})</div>}
          bordered
          dataSource={documents}
          renderItem={(doc) => (
            <List.Item
              actions={[
                <Button
                  key="preview"
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(doc)}
                  title="Preview"
                />,
                <Button
                  key="download"
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(doc.id, doc.originalFileName)}
                  title="Download"
                />,
                <Popconfirm
                  key="delete"
                  title="Are you sure you want to delete this document?"
                  onConfirm={() => handleDelete(doc.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    title="Delete"
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<span style={{ fontSize: '24px' }}>{getFileIcon(doc.mimeType)}</span>}
                title={
                  <Space>
                    <Text strong>{doc.originalFileName}</Text>
                    <Tag color="blue">{doc.category}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">{formatFileSize(doc.fileSize)}</Text>
                    <Text type="secondary">
                      Uploaded: {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                    </Text>
                    {doc.description && (
                      <Text type="secondary">{doc.description}</Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      {documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <FileOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <p>No documents uploaded yet</p>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        title={previewDocument ? `Preview: ${previewDocument.originalFileName}` : 'Preview'}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewDocument(null);
        }}
        width="95vw"
        style={{ 
          top: 20,
          paddingBottom: 0,
          maxWidth: 'none'
        }}
        styles={{
          body: {
            height: '85vh',
            padding: 0,
            overflow: 'hidden'
          }
        }}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => {
            if (previewDocument) {
              handleDownload(previewDocument.id, previewDocument.originalFileName);
            }
          }}>
            Download
          </Button>,
          <Button key="close" onClick={() => {
            setPreviewVisible(false);
            setPreviewDocument(null);
          }}>
            Close
          </Button>,
        ]}
      >
        {renderPreviewContent()}
      </Modal>
    </div>
  );
};