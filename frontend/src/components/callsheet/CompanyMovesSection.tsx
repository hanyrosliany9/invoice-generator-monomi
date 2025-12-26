import { Button, Modal, Form, Input, InputNumber, Table, Space, Popconfirm, App, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { CompanyMove } from '../../types/callSheet';
import type { CreateCompanyMoveDto } from '../../types/callSheet';

const { Title } = Typography;

interface CompanyMovesSectionProps {
  moves: CompanyMove[];
  callSheetId: string;
  onAdd: (dto: CreateCompanyMoveDto) => Promise<void>;
  onUpdate: (id: string, dto: Partial<CreateCompanyMoveDto>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function CompanyMovesSection({
  moves = [],
  callSheetId,
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
}: CompanyMovesSectionProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async (values: CreateCompanyMoveDto) => {
    try {
      await onAdd(values);
      message.success('Company move added');
      form.resetFields();
      setModalOpen(false);
    } catch (error) {
      message.error('Failed to add company move');
    }
  };

  const handleEdit = (move: CompanyMove) => {
    form.setFieldsValue(move);
    setEditingId(move.id);
    setModalOpen(true);
  };

  const handleUpdate = async (values: CreateCompanyMoveDto) => {
    try {
      if (!editingId) return;
      await onUpdate(editingId, values);
      message.success('Company move updated');
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
    } catch (error) {
      message.error('Failed to update company move');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      message.success('Company move deleted');
    } catch (error) {
      message.error('Failed to delete company move');
    }
  };

  const onFinish = (values: CreateCompanyMoveDto) => {
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
      title: 'Depart Time',
      dataIndex: 'departTime',
      key: 'departTime',
      width: 100,
    },
    {
      title: 'From',
      dataIndex: 'fromLocation',
      key: 'fromLocation',
    },
    {
      title: 'To',
      dataIndex: 'toLocation',
      key: 'toLocation',
    },
    {
      title: 'Travel Time (min)',
      dataIndex: 'travelTime',
      key: 'travelTime',
      width: 130,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: CompanyMove) => (
        <Space size="small">
          <EditOutlined
            onClick={() => handleEdit(record)}
            style={{ cursor: 'pointer', color: '#1890ff' }}
          />
          <Popconfirm
            title="Delete move?"
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
        <Title level={4}>Company Moves</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          loading={loading}
        >
          Add Move
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={moves}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'No company moves scheduled' }}
      />

      <Modal
        title={editingId ? 'Edit Company Move' : 'Add Company Move'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        loading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="departTime"
            label="Depart Time"
            rules={[{ required: true, message: 'Please enter depart time' }]}
          >
            <Input type="time" />
          </Form.Item>

          <Form.Item
            name="fromLocation"
            label="From Location"
            rules={[{ required: true, message: 'Please enter from location' }]}
          >
            <Input placeholder="e.g., Main Set, Location A" />
          </Form.Item>

          <Form.Item
            name="toLocation"
            label="To Location"
            rules={[{ required: true, message: 'Please enter to location' }]}
          >
            <Input placeholder="e.g., Secondary Location, Location B" />
          </Form.Item>

          <Form.Item
            name="travelTime"
            label="Estimated Travel Time (minutes)"
          >
            <InputNumber min={5} max={300} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Route directions, parking, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
