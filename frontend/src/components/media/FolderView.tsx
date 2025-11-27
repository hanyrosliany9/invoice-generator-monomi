import React, { useState } from 'react';
import { Card, Empty, Spin, Space, Button, Row, Col, Checkbox, theme, message, Modal, Dropdown } from 'antd';
import {
  FolderOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  ExclamationCircleOutlined,
  FolderAddOutlined,
  MoreOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { MediaFolder, MediaAsset } from '../../services/media-collab';
import { getProxyUrl } from '../../utils/mediaProxy';

interface FolderViewProps {
  currentFolder: MediaFolder | null;
  currentFolderId?: string | null;
  loading?: boolean;
  onFolderDoubleClick: (folderId: string) => void;
  onAssetClick: (asset: MediaAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onMoveAssets?: (assetIds: string[], targetFolderId: string | null) => void;
  selectionMode?: boolean;
  mediaToken?: string | null;
}

export const FolderView: React.FC<FolderViewProps> = ({
  currentFolder,
  currentFolderId = null,
  loading = false,
  onFolderDoubleClick,
  onAssetClick,
  onDeleteAsset,
  onDeleteFolder,
  onCreateFolder,
  onRenameFolder,
  onMoveAssets,
  selectionMode = false,
  mediaToken,
}) => {
  const { token } = theme.useToken();
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssetIds([...selectedAssetIds, assetId]);
    } else {
      setSelectedAssetIds(selectedAssetIds.filter((id) => id !== assetId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && currentFolder?.assets) {
      setSelectedAssetIds(currentFolder.assets.map((a) => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const handleDeleteAsset = (assetId: string, assetName: string) => {
    Modal.confirm({
      title: 'Delete Asset',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDeleteAsset(assetId),
    });
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (!onDeleteFolder) return;
    Modal.confirm({
      title: 'Delete Folder',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${folderName}"? This will delete all subfolders and assets inside it. This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDeleteFolder(folderId),
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const folders = currentFolder?.children || [];
  const assets = currentFolder?.assets || [];
  const isEmpty = folders.length === 0 && assets.length === 0;

  if (isEmpty) {
    return (
      <div>
        {/* Action toolbar */}
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: token.colorBgContainer,
            borderRadius: 8,
            border: `1px solid ${token.colorBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Button
              type="primary"
              icon={<FolderAddOutlined />}
              onClick={() => onCreateFolder(currentFolderId)}
            >
              New Folder
            </Button>
          </Space>
        </div>

        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="This folder is empty"
          style={{ padding: '60px 0' }}
        >
          <Button
            type="primary"
            icon={<FolderAddOutlined />}
            onClick={() => onCreateFolder(currentFolderId)}
          >
            Create First Folder
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      {/* Action toolbar */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: token.colorBgContainer,
          borderRadius: 8,
          border: `1px solid ${token.colorBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Button
            type="primary"
            icon={<FolderAddOutlined />}
            onClick={() => onCreateFolder(currentFolderId)}
          >
            New Folder
          </Button>
        </Space>
      </div>

      {/* Selection toolbar */}
      {selectionMode && assets.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: token.colorBgContainer,
            borderRadius: 8,
            border: `1px solid ${token.colorBorder}`,
          }}
        >
          <Space>
            <Checkbox
              checked={selectedAssetIds.length === assets.length}
              indeterminate={selectedAssetIds.length > 0 && selectedAssetIds.length < assets.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              Select All ({selectedAssetIds.length} selected)
            </Checkbox>
            {selectedAssetIds.length > 0 && onMoveAssets && (
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  // This would open a folder picker modal
                  message.info('Move functionality - implement folder picker modal');
                }}
              >
                Move Selected
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* Folders section */}
      {folders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, fontSize: 14, color: token.colorTextSecondary }}>
            Folders
          </h3>
          <Row gutter={[16, 16]}>
            {folders.map((folder) => (
              <Col key={folder.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={() => onFolderDoubleClick(folder.id)}
                  bodyStyle={{ padding: 16 }}
                  extra={
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'rename',
                            label: 'Rename',
                            icon: <EditOutlined />,
                            onClick: () => {
                              if (onRenameFolder) {
                                const newName = prompt('Enter new folder name:', folder.name);
                                if (newName && newName.trim()) {
                                  onRenameFolder(folder.id, newName.trim());
                                }
                              }
                            },
                          },
                          {
                            type: 'divider',
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <DeleteOutlined />,
                            danger: true,
                            onClick: () => handleDeleteFolder(folder.id, folder.name),
                          },
                        ],
                      }}
                      trigger={['click']}
                    >
                      <MoreOutlined
                        style={{ fontSize: 16, cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FolderOpenOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {folder.name}
                      </div>
                      <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                        {folder._count?.assets || 0} items
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Assets section */}
      {assets.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 14, color: token.colorTextSecondary }}>
            Files
          </h3>
          <Row gutter={[16, 16]}>
            {assets.map((asset) => {
              const isSelected = selectedAssetIds.includes(asset.id);
              return (
                <Col key={asset.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? `2px solid ${token.colorPrimary}` : undefined,
                    }}
                    bodyStyle={{ padding: 0 }}
                    cover={
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '1 / 1',
                          background: token.colorBgContainer,
                          overflow: 'hidden',
                          borderRadius: '8px 8px 0 0',
                        }}
                      >
                        {/* Selection checkbox */}
                        {selectionMode && (
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectAsset(asset.id, e.target.checked)}
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              zIndex: 2,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        {/* Thumbnail or icon */}
                        {asset.thumbnailUrl ? (
                          <img
                            src={getProxyUrl(asset.thumbnailUrl, mediaToken)}
                            alt={`${asset.mediaType} - ${asset.originalName}`}
                            onClick={() => onAssetClick(asset)}
                            loading="lazy"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center',
                              transition: 'transform 0.2s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        ) : (
                          <div
                            onClick={() => onAssetClick(asset)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: token.colorBgContainer,
                            }}
                          >
                            {asset.mediaType === 'VIDEO' ? (
                              <VideoCameraOutlined style={{ fontSize: 48, color: token.colorTextTertiary }} />
                            ) : (
                              <FileImageOutlined style={{ fontSize: 48, color: token.colorTextTertiary }} />
                            )}
                          </div>
                        )}

                        {/* Media type badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: token.colorBgMask,
                            color: token.colorTextLightSolid,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          {asset.mediaType}
                        </div>
                      </div>
                    }
                  >
                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={asset.originalName}
                      >
                        {asset.originalName}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: token.colorTextSecondary,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{formatFileSize(asset.size)}</span>
                        <Space size={4}>
                          <Button
                            type="text"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(getProxyUrl(asset.url, mediaToken), '_blank');
                            }}
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAsset(asset.id, asset.originalName);
                            }}
                          />
                        </Space>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}
    </div>
  );
};

// Helper function for file size formatting
function formatFileSize(bytes: string | number): string {
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
