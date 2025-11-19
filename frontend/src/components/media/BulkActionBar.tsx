import React from 'react';
import { Button, Space, Select, Tag, Tooltip, theme } from 'antd';
import {
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStarRating?: (rating: number) => void;
  onBulkUpdateStatus?: (status: string) => void;
  onBulkDelete?: () => void;
  onBulkAddToCollection?: () => void;
  onBulkDownload?: () => void;
}

/**
 * BulkActionBar Component
 *
 * Provides bulk actions for multiple selected assets:
 * - Batch star rating (1-5)
 * - Batch status update (APPROVED, NEEDS_CHANGES, etc.)
 * - Batch delete
 * - Add to collection
 * - Bulk download
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkStarRating,
  onBulkUpdateStatus,
  onBulkDelete,
  onBulkAddToCollection,
  onBulkDownload,
}) => {
  const { token } = theme.useToken();

  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: token.colorPrimary,
        padding: '16px 24px',
        borderRadius: token.borderRadius,
        boxShadow: token.boxShadowSecondary,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Selection Info */}
      <Tag color="default" style={{ color: token.colorPrimary, fontWeight: 600, fontSize: '14px', backgroundColor: token.colorBgContainer }}>
        {selectedCount} Selected
      </Tag>

      {/* Star Rating */}
      {onBulkStarRating && (
        <Select
          placeholder="Set Rating"
          style={{ width: 150 }}
          onChange={onBulkStarRating}
          options={[
            { label: '⭐⭐⭐⭐⭐ 5 Stars', value: 5 },
            { label: '⭐⭐⭐⭐ 4 Stars', value: 4 },
            { label: '⭐⭐⭐ 3 Stars', value: 3 },
            { label: '⭐⭐ 2 Stars', value: 2 },
            { label: '⭐ 1 Star', value: 1 },
            { label: 'Clear Rating', value: 0 },
          ]}
        />
      )}

      {/* Status Update */}
      {onBulkUpdateStatus && (
        <Select
          placeholder="Update Status"
          style={{ width: 180 }}
          onChange={onBulkUpdateStatus}
          options={[
            { label: '✅ Approved', value: 'APPROVED' },
            { label: '📝 In Review', value: 'IN_REVIEW' },
            { label: '🔄 Needs Changes', value: 'NEEDS_CHANGES' },
            { label: '📦 Archived', value: 'ARCHIVED' },
            { label: '📄 Draft', value: 'DRAFT' },
          ]}
        />
      )}

      {/* Actions */}
      <Space>
        {onBulkAddToCollection && (
          <Tooltip title="Add to Collection">
            <Button
              icon={<FolderAddOutlined />}
              onClick={onBulkAddToCollection}
            >
              Add to Collection
            </Button>
          </Tooltip>
        )}

        {onBulkDownload && (
          <Tooltip title="Download All">
            <Button
              icon={<DownloadOutlined />}
              onClick={onBulkDownload}
            />
          </Tooltip>
        )}

        {onBulkDelete && (
          <Tooltip title="Delete Selected">
            <Button
              icon={<DeleteOutlined />}
              onClick={onBulkDelete}
              danger
            />
          </Tooltip>
        )}

        <Button onClick={onClearSelection}>
          Clear Selection
        </Button>
      </Space>
    </div>
  );
};
