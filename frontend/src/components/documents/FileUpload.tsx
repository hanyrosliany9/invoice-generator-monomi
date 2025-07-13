import React, { useState, useCallback } from 'react';
import { Upload, Button, message, List, Typography, Tag, Space, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined, FileOutlined } from '@ant-design/icons';
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
  documents: Document[];
  onDocumentsChange: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  invoiceId,
  quotationId,
  documents,
  onDocumentsChange,
}) => {
  const [uploading, setUploading] = useState(false);

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
      
      try {
        const response = await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        console.log('Upload success response:', result);
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
    onDrop: (e) => {
      console.log('Dropped files', e.dataTransfer.files);
      console.log('Drop event:', e);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
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
    </div>
  );
};