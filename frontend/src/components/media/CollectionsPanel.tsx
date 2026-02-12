import React, { useState } from 'react';
import { Drawer, Card, Button, Space, Empty, Modal, Form, Input, Radio, App, theme, Typography, Spin, Dropdown } from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  MoreOutlined,
  FilterOutlined,
  StarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaCollection, CreateCollectionDto } from '../../services/media-collab';
import { getErrorMessage } from '../../utils/errorHandlers';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface CollectionsPanelProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
  onViewCollection?: (collectionId: string) => void;
}

/**
 * CollectionsPanel Component
 *
 * Displays and manages collections for a media project:
 * - Lists all collections (Manual and Smart)
 * - Create new collections with type selection
 * - Edit/Delete collections
 * - View collection contents
 */
export const CollectionsPanel: React.FC<CollectionsPanelProps> = ({
  projectId,
  visible,
  onClose,
  onViewCollection,
}) => {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MediaCollection | null>(null);
  const [form] = Form.useForm();

  // Fetch collections
  const { data: collections, isLoading } = useQuery<MediaCollection[]>({
    queryKey: ['collections', projectId],
    queryFn: () => mediaCollabService.getCollections(projectId),
    enabled: visible && !!projectId,
  });

  // Create collection mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCollectionDto) =>
      mediaCollabService.createCollection(projectId, data),
    onSuccess: () => {
      message.success('Collection created successfully');
      queryClient.invalidateQueries({ queryKey: ['collections', projectId] });
      setCreateModalVisible(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to create collection'));
    },
  });

  // Update collection mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCollectionDto> }) =>
      mediaCollabService.updateCollection(id, data),
    onSuccess: () => {
      message.success('Collection updated successfully');
      queryClient.invalidateQueries({ queryKey: ['collections', projectId] });
      setEditingCollection(null);
      form.resetFields();
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to update collection'));
    },
  });

  // Delete collection mutation
  const deleteMutation = useMutation({
    mutationFn: (collectionId: string) =>
      mediaCollabService.deleteCollection(collectionId),
    onSuccess: () => {
      message.success('Collection deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['collections', projectId] });
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to delete collection'));
    },
  });

  const handleCreateCollection = () => {
    setEditingCollection(null);
    form.resetFields();
    form.setFieldsValue({ type: 'MANUAL' });
    setCreateModalVisible(true);
  };

  const handleEditCollection = (collection: MediaCollection) => {
    setEditingCollection(collection);
    form.setFieldsValue({
      name: collection.name,
      description: collection.description,
      type: collection.type,
      criteria: collection.criteria,
    });
    setCreateModalVisible(true);
  };

  const handleDeleteCollection = (collection: MediaCollection) => {
    modal.confirm({
      title: 'Delete Collection',
      content: `Are you sure you want to delete "${collection.name}"? This will not delete the assets.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(collection.id),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateCollectionDto = {
        name: values.name,
        type: values.type,
        criteria: values.type === 'SMART' ? values.criteria : undefined,
      };

      if (editingCollection) {
        updateMutation.mutate({ id: editingCollection.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleViewCollection = (collection: MediaCollection) => {
    if (onViewCollection) {
      onViewCollection(collection.id);
      onClose();
    }
  };

  const collectionType = Form.useWatch('type', form);

  const getCollectionIcon = (type: string) => {
    return type === 'SMART' ? (
      <ThunderboltOutlined style={{ color: token.colorPrimary }} />
    ) : (
      <FolderOutlined style={{ color: token.colorTextSecondary }} />
    );
  };

  const getCollectionMenuItems = (collection: MediaCollection) => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View Contents',
      onClick: () => handleViewCollection(collection),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEditCollection(collection),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDeleteCollection(collection),
    },
  ];

  return (
    <>
      <Drawer
        title={
          <Space>
            <AppstoreOutlined />
            <span>Collections</span>
          </Space>
        }
        placement="right"
        width={480}
        open={visible}
        onClose={onClose}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateCollection}
            size="middle"
          >
            New Collection
          </Button>
        }
      >
        <Spin spinning={isLoading}>
          {!collections || collections.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size="small">
                  <Text type="secondary">No collections yet</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Create collections to organize and group your assets
                  </Text>
                </Space>
              }
              style={{ marginTop: 60 }}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateCollection}
              >
                Create First Collection
              </Button>
            </Empty>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {collections.map((collection) => (
                <Card
                  key={collection.id}
                  hoverable
                  onClick={() => handleViewCollection(collection)}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    cursor: 'pointer',
                  }}
                  styles={{
                    body: { padding: '16px' },
                  }}
                  extra={
                    <Dropdown
                      menu={{ items: getCollectionMenuItems(collection) }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      {getCollectionIcon(collection.type)}
                      <Title level={5} style={{ margin: 0 }}>
                        {collection.name}
                      </Title>
                      {collection.type === 'SMART' && (
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            background: token.colorPrimaryBg,
                            color: token.colorPrimary,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          Smart
                        </Text>
                      )}
                    </Space>

                    {collection.description && (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {collection.description}
                      </Text>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {collection._count?.assets || 0} asset
                        {collection._count?.assets !== 1 ? 's' : ''}
                      </Text>

                      {collection.type === 'SMART' && collection.criteria && (
                        <Space size={4}>
                          {(collection.criteria as any)?.mediaType && (
                            <Text
                              style={{
                                fontSize: 11,
                                background: token.colorBgLayout,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {String((collection.criteria as any).mediaType)}
                            </Text>
                          )}
                          {(collection.criteria as any)?.status && (
                            <Text
                              style={{
                                fontSize: 11,
                                background: token.colorBgLayout,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {String((collection.criteria as any).status)}
                            </Text>
                          )}
                          {(collection.criteria as any)?.minRating && (
                            <Text
                              style={{
                                fontSize: 11,
                                background: token.colorBgLayout,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              ⭐ {String((collection.criteria as any).minRating)}+
                            </Text>
                          )}
                        </Space>
                      )}
                    </div>
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Spin>
      </Drawer>

      {/* Create/Edit Collection Modal */}
      <Modal
        title={editingCollection ? 'Edit Collection' : 'Create Collection'}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setEditingCollection(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'MANUAL' }}
        >
          <Form.Item
            name="name"
            label="Collection Name"
            rules={[{ required: true, message: 'Please enter a collection name' }]}
          >
            <Input placeholder="e.g., Final Deliverables" />
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <TextArea
              rows={3}
              placeholder="Describe what this collection contains..."
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Collection Type"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="MANUAL">
                  <Space>
                    <FolderOutlined />
                    <div>
                      <div>Manual Collection</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Manually add or remove assets
                      </Text>
                    </div>
                  </Space>
                </Radio>
                <Radio value="SMART">
                  <Space>
                    <ThunderboltOutlined />
                    <div>
                      <div>Smart Collection</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Automatically includes assets matching criteria
                      </Text>
                    </div>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {collectionType === 'SMART' && (
            <>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                Define criteria for assets to be automatically included:
              </Text>

              <Form.Item
                name={['criteria', 'mediaType']}
                label="Media Type"
              >
                <Radio.Group>
                  <Radio value={undefined}>All Types</Radio>
                  <Radio value="IMAGE">Images Only</Radio>
                  <Radio value="VIDEO">Videos Only</Radio>
                  <Radio value="RAW_IMAGE">RAW Images Only</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name={['criteria', 'status']}
                label="Status"
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value={undefined}>All Statuses</Radio>
                    <Radio value="APPROVED">
                      <Space>
                        <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                        Approved Only
                      </Space>
                    </Radio>
                    <Radio value="IN_REVIEW">In Review</Radio>
                    <Radio value="NEEDS_CHANGES">Needs Changes</Radio>
                    <Radio value="DRAFT">Draft</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name={['criteria', 'minRating']}
                label="Minimum Star Rating"
              >
                <Radio.Group>
                  <Radio value={undefined}>Any Rating</Radio>
                  <Radio value={3}>
                    <Space>
                      <StarOutlined />
                      3+ Stars
                    </Space>
                  </Radio>
                  <Radio value={4}>
                    <Space>
                      <StarOutlined />
                      4+ Stars
                    </Space>
                  </Radio>
                  <Radio value={5}>
                    <Space>
                      <StarOutlined />
                      5 Stars Only
                    </Space>
                  </Radio>
                </Radio.Group>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
};
