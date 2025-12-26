import { Button, Modal, Form, Input, InputNumber, Table, Space, Popconfirm, App, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { BackgroundCall } from '../../types/callSheet';
import type { CreateBackgroundDto } from '../../types/callSheet';

const { Title } = Typography;

interface BackgroundCallsSectionProps {
  backgroundCalls: BackgroundCall[];
  callSheetId: string;
  onAdd: (dto: CreateBackgroundDto) => Promise<void>;
  onUpdate: (id: string, dto: Partial<CreateBackgroundDto>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function BackgroundCallsSection({
  backgroundCalls = [],
  callSheetId,
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
}: BackgroundCallsSectionProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async (values: CreateBackgroundDto) => {
    try {
      await onAdd(values);
      message.success('Background call added');
      form.resetFields();
      setModalOpen(false);
    } catch (error) {
      message.error('Failed to add background call');
    }
  };

  const handleEdit = (bg: BackgroundCall) => {
    form.setFieldsValue(bg);
    setEditingId(bg.id);
    setModalOpen(true);
  };

  const handleUpdate = async (values: CreateBackgroundDto) => {
    try {
      if (!editingId) return;
      await onUpdate(editingId, values);
      message.success('Background call updated');
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
    } catch (error) {
      message.error('Failed to update background call');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      message.success('Background call deleted');
    } catch (error) {
      message.error('Failed to delete background call');
    }
  };

  const onFinish = (values: CreateBackgroundDto) => {
    if (editingId) {
      handleUpdate(values);
    } else {
      handleAdd(values);
    }
  };

  const closeModal = () => {
    form.resetFields();
    setEditingId(null);
    setModalOpen(false);
  };

  const columns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Call Time',
      dataIndex: 'callTime',
      key: 'callTime',
      width: 100,
    },
    {
      title: 'Report To',
      dataIndex: 'reportLocation',
      key: 'reportLocation',
      ellipsis: true,
    },
    {
      title: 'Wardrobe',
      dataIndex: 'wardrobeNotes',
      key: 'wardrobeNotes',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: BackgroundCall) => (
        <Space size="small">
          <EditOutlined
            onClick={() => handleEdit(record)}
            style={{ cursor: 'pointer', color: '#1890ff' }}
          />
          <Popconfirm
            title="Delete background call?"
            onConfirm={() => handleDelete(record.id)}
          >
            <DeleteOutlined style={{ cursor: 'pointer', color: '#ff4d4f' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>Background / Extras</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          loading={loading}
        >
          Add Background
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={backgroundCalls}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'No background extras' }}
      />

      <Modal
        title={editingId ? 'Edit Background Call' : 'Add Background / Extras'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        loading={loading}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please describe the background group' }]}
          >
            <Input placeholder="e.g., 20 Office Workers, Crowd of 50, Party Guests" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Quantity"
            initialValue={1}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="callTime"
            label="Call Time"
            rules={[{ required: true, message: 'Please enter call time' }]}
          >
            <Input type="time" />
          </Form.Item>

          <Form.Item name="reportLocation" label="Report Location">
            <Input placeholder="e.g., Stage Door, Loading Dock, Makeup Trailer" />
          </Form.Item>

          <Form.Item name="wardrobeNotes" label="Wardrobe Notes">
            <Input placeholder="e.g., Business casual provided, or Bring own 1920s attire" />
          </Form.Item>

          <Form.Item name="scenes" label="Applies to Scenes">
            <Input placeholder="e.g., 5, 12-15 or All" />
          </Form.Item>

          <Form.Item name="notes" label="Additional Notes">
            <Input.TextArea rows={2} placeholder="Any special requirements or notes" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
