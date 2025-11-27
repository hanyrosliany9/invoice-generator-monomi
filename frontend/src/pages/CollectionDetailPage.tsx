import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Button,
  Space,
  Spin,
  App,
  Breadcrumb,
  theme,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Empty,
  Checkbox,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaAsset, MediaCollection } from '../services/media-collab';
import { MediaLibrary } from '../components/media/MediaLibrary';
import { getErrorMessage } from '../utils/errorHandlers';
import { useMediaToken } from '../hooks/useMediaToken';
import { getProxyUrl } from '../utils/mediaProxy';

const { Content } = Layout;
const { confirm } = Modal;

/**
 * CollectionDetailPage
 *
 * View and manage a single collection:
 * - View collection assets
 * - Add/remove assets from collection
 * - Edit collection name/description
 * - Delete collection
 * - For smart collections, shows read-only filtered view
 */
export const CollectionDetailPage: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mediaToken } = useMediaToken();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addAssetsModalVisible, setAddAssetsModalVisible] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [form] = Form.useForm();

  // Fetch collection details
  const { data: collection, isLoading: collectionLoading } = useQuery<MediaCollection>({
    queryKey: ['collection', collectionId],
    queryFn: () => mediaCollabService.getCollection(collectionId!),
    enabled: !!collectionId,
  });

  // Fetch collection assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery<MediaAsset[]>({
    queryKey: ['collection-assets', collectionId],
    queryFn: () => mediaCollabService.getCollectionAssets(collectionId!),
    enabled: !!collectionId,
  });

  // Fetch all project assets (for adding to collection)
  const { data: projectAssets = [] } = useQuery<MediaAsset[]>({
    queryKey: ['media-assets', collection?.projectId],
    queryFn: () => mediaCollabService.getAssets(collection!.projectId),
    enabled: !!collection?.projectId && addAssetsModalVisible,
  });

  // Update collection mutation
  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mediaCollabService.updateCollection(collectionId!, data),
    onSuccess: () => {
      message.success('Collection updated successfully');
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections', collection?.projectId] });
      setEditModalVisible(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to update collection'));
    },
  });

  // Delete collection mutation
  const deleteMutation = useMutation({
    mutationFn: () => mediaCollabService.deleteCollection(collectionId!),
    onSuccess: () => {
      message.success('Collection deleted successfully');
      navigate(`/media/project/${collection?.projectId}`);
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to delete collection'));
    },
  });

  // Add assets to collection mutation
  const addAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) =>
      mediaCollabService.addAssetsToCollection(collectionId!, assetIds),
    onSuccess: () => {
      message.success('Assets added to collection');
      queryClient.invalidateQueries({ queryKey: ['collection-assets', collectionId] });
      setAddAssetsModalVisible(false);
      setSelectedAssetIds([]);
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to add assets'));
    },
  });

  // Remove assets from collection mutation
  const removeAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) =>
      mediaCollabService.removeAssetsFromCollection(collectionId!, assetIds),
    onSuccess: () => {
      message.success('Assets removed from collection');
      queryClient.invalidateQueries({ queryKey: ['collection-assets', collectionId] });
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to remove assets'));
    },
  });

  const handleDeleteCollection = () => {
    confirm({
      title: 'Delete Collection?',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${collection?.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(),
    });
  };

  const handleEditCollection = () => {
    form.setFieldsValue({
      name: collection?.name,
      description: collection?.description,
    });
    setEditModalVisible(true);
  };

  const handleUpdateCollection = () => {
    form.validateFields().then((values) => {
      updateMutation.mutate(values);
    });
  };

  const handleAddAssets = () => {
    if (selectedAssetIds.length === 0) {
      message.warning('Please select at least one asset');
      return;
    }
    addAssetsMutation.mutate(selectedAssetIds);
  };

  const handleRemoveAsset = (assetId: string) => {
    confirm({
      title: 'Remove Asset from Collection?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will only remove it from this collection, not delete the asset.',
      okText: 'Remove',
      okType: 'danger',
      onOk: () => removeAssetsMutation.mutate([assetId]),
    });
  };

  const handleBulkRemove = (assetIds: string[]) => {
    confirm({
      title: `Remove ${assetIds.length} Assets?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This will only remove them from this collection, not delete the assets.',
      okText: 'Remove',
      okType: 'danger',
      onOk: () => removeAssetsMutation.mutate(assetIds),
    });
  };

  const isSmartCollection = collection?.isSmartCollection;

  // Filter out assets already in collection
  const availableAssets = projectAssets.filter(
    (asset) => !assets.find((a) => a.id === asset.id),
  );

  if (collectionLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="Collection not found" />
        <Button type="primary" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ padding: '24px' }}>
        {/* Breadcrumb */}
        <Breadcrumb style={{ marginBottom: '16px' }}>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/media')}>Media</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <a onClick={() => navigate(`/media/project/${collection.projectId}`)}>Project</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{collection.name}</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <Card
          style={{ marginBottom: '24px' }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/media/project/${collection.projectId}`)}
              >
                Back
              </Button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                    {collection.name}
                  </h2>
                  {isSmartCollection && (
                    <Tag color="purple">Smart Collection</Tag>
                  )}
                </div>
                {collection.description && (
                  <p style={{ margin: '8px 0 0 32px', color: token.colorTextSecondary }}>
                    {collection.description}
                  </p>
                )}
                <div style={{ marginTop: '8px', marginLeft: '32px', color: token.colorTextSecondary, fontSize: '14px' }}>
                  {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
                </div>
              </div>
            </div>

            <Space>
              {!isSmartCollection && (
                <>
                  <Button
                    type="default"
                    icon={<PlusOutlined />}
                    onClick={() => setAddAssetsModalVisible(true)}
                  >
                    Add Assets
                  </Button>
                  <Button
                    icon={<EditOutlined />}
                    onClick={handleEditCollection}
                  >
                    Edit
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteCollection}
                    loading={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </>
              )}
              {isSmartCollection && (
                <Tag color="blue">Auto-updated based on criteria</Tag>
              )}
            </Space>
          </div>
        </Card>

        {/* Assets Grid */}
        <Card
          title={`Assets (${assets.length})`}
          loading={assetsLoading}
        >
          {assets.length === 0 ? (
            <Empty
              description={
                isSmartCollection
                  ? 'No assets match the smart collection criteria'
                  : 'This collection is empty. Add assets to get started.'
              }
            >
              {!isSmartCollection && (
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
              assets={assets}
              onRemove={!isSmartCollection ? handleRemoveAsset : undefined}
              onBulkRemove={!isSmartCollection ? handleBulkRemove : undefined}
              removeButtonText="Remove from Collection"
              mediaToken={mediaToken}
            />
          )}
        </Card>

        {/* Edit Collection Modal */}
        <Modal
          title="Edit Collection"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            form.resetFields();
          }}
          onOk={handleUpdateCollection}
          confirmLoading={updateMutation.isPending}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Collection Name"
              rules={[{ required: true, message: 'Please enter collection name' }]}
            >
              <Input placeholder="e.g., Final Deliverables" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea
                rows={3}
                placeholder="Describe what this collection contains..."
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Assets Modal */}
        <Modal
          title="Add Assets to Collection"
          open={addAssetsModalVisible}
          onCancel={() => {
            setAddAssetsModalVisible(false);
            setSelectedAssetIds([]);
          }}
          onOk={handleAddAssets}
          confirmLoading={addAssetsMutation.isPending}
          width={800}
        >
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: token.colorTextSecondary }}>
              Select assets to add to this collection. Assets already in the collection are hidden.
            </p>
            <div style={{ marginTop: '8px' }}>
              <strong>{selectedAssetIds.length}</strong> assets selected
            </div>
          </div>

          {availableAssets.length === 0 ? (
            <Empty description="All project assets are already in this collection" />
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Checkbox.Group
                value={selectedAssetIds}
                onChange={(values) => setSelectedAssetIds(values as string[])}
                style={{ width: '100%' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {availableAssets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: token.borderRadius,
                        padding: '8px',
                        cursor: 'pointer',
                        background: selectedAssetIds.includes(asset.id)
                          ? token.colorPrimaryBg
                          : 'transparent',
                      }}
                      onClick={() => {
                        setSelectedAssetIds((prev) =>
                          prev.includes(asset.id)
                            ? prev.filter((id) => id !== asset.id)
                            : [...prev, asset.id],
                        );
                      }}
                    >
                      <Checkbox value={asset.id} style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>
                          {asset.filename}
                        </span>
                      </Checkbox>
                      {asset.thumbnailUrl && (
                        <img
                          src={getProxyUrl(asset.thumbnailUrl, mediaToken)}
                          alt={asset.filename}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: token.borderRadius,
                          }}
                        />
                      )}
                      <div style={{ marginTop: '4px', fontSize: '11px', color: token.colorTextSecondary }}>
                        {asset.mediaType}
                      </div>
                    </div>
                  ))}
                </div>
              </Checkbox.Group>
            </div>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};
