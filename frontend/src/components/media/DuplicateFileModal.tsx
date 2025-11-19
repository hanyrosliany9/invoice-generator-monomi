import React from 'react';
import { Modal, Radio, Space, Typography, Alert, Table } from 'antd';
import { FileOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export type ConflictResolution = 'skip' | 'replace' | 'keep-both';

export interface DuplicateFile {
  file: File;
  existingAsset: {
    id: string;
    originalName: string;
    size: string;
    uploadedAt: string;
    uploadedBy: string;
    url: string;
  };
}

interface DuplicateFileModalProps {
  visible: boolean;
  duplicates: DuplicateFile[];
  onResolve: (resolution: ConflictResolution, applyToAll: boolean) => void;
  onCancel: () => void;
}

/**
 * DuplicateFileModal
 *
 * Professional conflict resolution UI for duplicate file uploads.
 * Similar to Google Drive, Dropbox, and Frame.io handling.
 *
 * Options:
 * - Skip: Don't upload this file
 * - Replace: Delete old file and upload new one
 * - Keep Both: Rename new file (append timestamp)
 * - Create Version: Keep both as versions (future feature)
 */
export const DuplicateFileModal: React.FC<DuplicateFileModalProps> = ({
  visible,
  duplicates,
  onResolve,
  onCancel,
}) => {
  const [resolution, setResolution] = React.useState<ConflictResolution>('keep-both');
  const [applyToAll, setApplyToAll] = React.useState(false);

  const firstDuplicate = duplicates[0];
  const hasMultipleDuplicates = duplicates.length > 1;

  if (!firstDuplicate) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      title: '',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Text strong style={{ color: type === 'Existing' ? '#ff4d4f' : '#52c41a' }}>
          {type}
        </Text>
      ),
    },
    {
      title: 'File Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <FileOutlined />
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Uploaded By',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
    },
  ];

  const comparisonData = [
    {
      key: 'existing',
      type: 'Existing',
      name: firstDuplicate.existingAsset.originalName,
      size: firstDuplicate.existingAsset.size,
      date: formatDate(firstDuplicate.existingAsset.uploadedAt),
      uploadedBy: firstDuplicate.existingAsset.uploadedBy,
    },
    {
      key: 'new',
      type: 'New',
      name: firstDuplicate.file.name,
      size: formatFileSize(firstDuplicate.file.size),
      date: 'Now',
      uploadedBy: 'You',
    },
  ];

  const handleOk = () => {
    onResolve(resolution, applyToAll);
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
          <span>
            {hasMultipleDuplicates
              ? `${duplicates.length} Duplicate Files Found`
              : 'Duplicate File Found'}
          </span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={800}
      okText="Continue"
      cancelText="Cancel Upload"
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {hasMultipleDuplicates ? (
          <Alert
            message={`${duplicates.length} files already exist in this project`}
            description="Choose how to handle these conflicts. You can apply the same action to all duplicate files."
            type="warning"
            showIcon
          />
        ) : (
          <Alert
            message={`"${firstDuplicate.file.name}" already exists`}
            description="A file with this name already exists in this project. Choose how to handle this conflict."
            type="warning"
            showIcon
          />
        )}

        {/* File comparison table */}
        {!hasMultipleDuplicates && (
          <Table
            columns={columns}
            dataSource={comparisonData}
            pagination={false}
            size="small"
            bordered
          />
        )}

        {/* Conflict resolution options */}
        <div>
          <Title level={5}>Choose an action:</Title>
          <Radio.Group
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Radio value="keep-both">
                <div>
                  <Text strong>Keep Both Files</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Upload new file with a timestamp suffix (e.g., "video_20251119_143022.mp4")
                  </Text>
                </div>
              </Radio>

              <Radio value="replace">
                <div>
                  <Text strong>Replace Existing File</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Delete the old file and upload the new one (cannot be undone)
                  </Text>
                </div>
              </Radio>

              <Radio value="skip">
                <div>
                  <Text strong>Skip This File</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Don't upload this file, keep the existing one
                  </Text>
                </div>
              </Radio>

              {/* Future feature */}
              {/* <Radio value="version" disabled>
                <div>
                  <Text strong>Create New Version</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Keep both files linked as versions (Coming soon)
                  </Text>
                </div>
              </Radio> */}
            </Space>
          </Radio.Group>
        </div>

        {/* Apply to all option */}
        {hasMultipleDuplicates && (
          <div style={{
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '4px',
            marginTop: 8
          }}>
            <Radio
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
            >
              <Text strong>Apply this action to all {duplicates.length} duplicate files</Text>
            </Radio>
          </div>
        )}

        {hasMultipleDuplicates && !applyToAll && (
          <Alert
            message="You'll be asked to resolve each conflict individually"
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </Space>
    </Modal>
  );
};

export default DuplicateFileModal;
