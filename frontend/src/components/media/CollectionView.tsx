import React, { useState, useMemo } from 'react';
import { Card, Button, Space, Empty, App, theme, Typography, Spin, Tag, Modal, Select, Checkbox } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  FilterOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaCollection, MediaAsset } from '../../services/media-collab';
import { MediaLibrary } from './MediaLibrary';
import { getErrorMessage } from '../../utils/errorHandlers';

const { Text, Title } = Typography;

interface CollectionViewProps {
  collectionId: string;
  projectId: string;
  onBack: () => void;
  mediaToken: string | null;
}

/**
 * CollectionView Component
 *
 * Displays the contents of a single collection:
 * - Shows collection details (name, description, type)
 * - Lists all assets in the collection
 * - For Manual collections: Add/Remove assets
 * - For Smart collections: Display active filters (read-only)
 */
export const CollectionView: React.FC<CollectionViewProps> = ({
  collectionId,
  projectId,
  onBack,
  mediaToken,
}) => {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [addAssetsModalVisible, setAddAssetsModalVisible] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetsToAdd, setAssetsToAdd] = useState<string[]>([]);

  // Fetch collection details
  const { data: collection, isLoading: collectionLoading } = useQuery<MediaCollection>({
    queryKey: ['collection', collectionId],
    queryFn: () => mediaCollabService.getCollection(collectionId),
    enabled: !!collectionId,
  });

  // Fetch collection assets
  const { data: collectionAssets, isLoading: assetsLoading } = useQuery<MediaAsset[]>({
    queryKey: ['collection-assets', collectionId],
    queryFn: () => mediaCollabService.getCollectionAssets(collectionId),
    enabled: !!collectionId,
  });

  // Fetch all project assets (for adding to manual collections)
  const { data: allProjectAssets } = useQuery<MediaAsset[]>({
    queryKey: ['assets', projectId],
    queryFn: () => mediaCollabService.getAssets(projectId),
    enabled: !!projectId && collection?.type === 'MANUAL',
  });

  // Available assets to add (not already in collection)
  const availableAssets = useMemo(() => {
    if (!allProjectAssets || !collectionAssets) return [];
    const collectionAssetIds = new Set(collectionAssets.map((a) => a.id));
    return allProjectAssets.filter((asset) => !collectionAssetIds.has(asset.id));
  }, [allProjectAssets, collectionAssets]);

  // Add assets to collection mutation
  const addAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) =>
      mediaCollabService.addAssetsToCollection(collectionId, assetIds),
    onSuccess: () => {
      message.success('Assets added to collection');
      queryClient.invalidateQueries({ queryKey: ['collection-assets', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections', projectId] });
      setAddAssetsModalVisible(false);
      setAssetsToAdd([]);
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to add assets to collection'));
    },
  });

  // Remove assets from collection mutation
  const removeAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) =>
      mediaCollabService.removeAssetsFromCollection(collectionId, assetIds),
    onSuccess: () => {
      message.success('Assets removed from collection');
      queryClient.invalidateQueries({ queryKey: ['collection-assets', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections', projectId] });
      setSelectedAssetIds([]);
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to remove assets from collection'));
    },
  });

  const handleRemoveAssets = () => {
    if (selectedAssetIds.length === 0) {
      message.warning('Please select assets to remove');
      return;
    }

    modal.confirm({
      title: 'Remove Assets',
      content: `Remove ${selectedAssetIds.length} asset${selectedAssetIds.length !== 1 ? 's' : ''} from this collection? The assets will not be deleted.`,
      okText: 'Remove',
      okType: 'danger',
      onOk: () => removeAssetsMutation.mutate(selectedAssetIds),
    });
  };

  const handleAddAssets = () => {
    if (assetsToAdd.length === 0) {
      message.warning('Please select assets to add');
      return;
    }

    addAssetsMutation.mutate(assetsToAdd);
  };

  const handleAssetSelection = (assetIds: string[]) => {
    setSelectedAssetIds(assetIds);
  };

  const getCriteriaDisplay = (criteria: Record<string, any>) => {
    const filters: string[] = [];

    if (criteria.mediaType) {
      filters.push(`Type: ${criteria.mediaType}`);
    }
    if (criteria.status) {
      filters.push(`Status: ${criteria.status}`);
    }
    if (criteria.minRating) {
      filters.push(`Rating: ${criteria.minRating}+ stars`);
    }

    return filters;
  };

  if (collectionLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!collection) {
    return (
      <Card style={{ margin: 24 }}>
        <Empty description="Collection not found">
          <Button onClick={onBack}>Go Back</Button>
        </Empty>
      </Card>
    );
  }

  const isSmartCollection = collection.type === 'SMART';

  return (
    <>
      <Card
        style={{ margin: 24 }}
        styles={{ body: { padding: '20px' } }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              style={{ marginBottom: 12, padding: '4px 8px' }}
            >
              Back to Collections
            </Button>

            <Space align="start" size="middle">
              {isSmartCollection ? (
                <ThunderboltOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
              ) : (
                <FolderOutlined style={{ fontSize: 24, color: token.colorTextSecondary }} />
              )}

              <div>
                <Space>
                  <Title level={3} style={{ margin: 0 }}>
                    {collection.name}
                  </Title>
                  {isSmartCollection && (
                    <Tag color="blue" icon={<ThunderboltOutlined />}>
                      Smart Collection
                    </Tag>
                  )}
                </Space>

                {collection.description && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                    {collection.description}
                  </Text>
                )}

                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {collectionAssets?.length || 0} asset
                    {collectionAssets?.length !== 1 ? 's' : ''}
                  </Text>
                </div>
              </div>
            </Space>
          </div>

          <Space>
            {!isSmartCollection && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddAssetsModalVisible(true)}
                  disabled={availableAssets.length === 0}
                >
                  Add Assets
                </Button>
                {selectedAssetIds.length > 0 && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveAssets}
                    loading={removeAssetsMutation.isPending}
                  >
                    Remove ({selectedAssetIds.length})
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>

        {/* Smart Collection Filters Display */}
        {isSmartCollection && collection.criteria && (
          <div
            style={{
              padding: 12,
              background: token.colorBgLayout,
              borderRadius: 8,
              marginBottom: 16,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Space size="small">
              <FilterOutlined style={{ color: token.colorTextTertiary }} />
              <Text strong style={{ fontSize: 13 }}>
                Active Filters:
              </Text>
              {getCriteriaDisplay(collection.criteria).map((filter, index) => (
                <Tag key={index} color="blue">
                  {filter}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {/* Assets Grid */}
        <Spin spinning={assetsLoading}>
          {!collectionAssets || collectionAssets.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size="small">
                  <Text type="secondary">
                    {isSmartCollection
                      ? 'No assets match the criteria'
                      : 'No assets in this collection yet'}
                  </Text>
                  {!isSmartCollection && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Click "Add Assets" to add files to this collection
                    </Text>
                  )}
                </Space>
              }
              style={{ marginTop: 40, marginBottom: 40 }}
            >
              {!isSmartCollection && availableAssets.length > 0 && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddAssetsModalVisible(true)}
                >
                  Add Assets
                </Button>
              )}
            </Empty>
          ) : (
            <MediaLibrary
              assets={collectionAssets}
              onAssetClick={() => {}}
              onSelectionChange={!isSmartCollection ? handleAssetSelection : undefined}
              mediaToken={mediaToken}
            />
          )}
        </Spin>
      </Card>

      {/* Add Assets Modal */}
      <Modal
        title="Add Assets to Collection"
        open={addAssetsModalVisible}
        onCancel={() => {
          setAddAssetsModalVisible(false);
          setAssetsToAdd([]);
        }}
        onOk={handleAddAssets}
        confirmLoading={addAssetsMutation.isPending}
        width={800}
        okText={`Add ${assetsToAdd.length} Asset${assetsToAdd.length !== 1 ? 's' : ''}`}
        okButtonProps={{ disabled: assetsToAdd.length === 0 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Select assets from this project to add to the collection:
          </Text>
        </div>

        {availableAssets.length === 0 ? (
          <Empty description="All project assets are already in this collection" />
        ) : (
          <div
            style={{
              maxHeight: 500,
              overflowY: 'auto',
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <MediaLibrary
              assets={availableAssets}
              onAssetClick={() => {}}
              onSelectionChange={setAssetsToAdd}
              mediaToken={mediaToken}
            />
          </div>
        )}
      </Modal>
    </>
  );
};
