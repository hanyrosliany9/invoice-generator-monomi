import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callSheetsApi } from '../../services/callSheets';
import type { CallSheetWardrobe, CreateWardrobeDto, WardrobeStatus } from '../../types/callSheet';

interface WardrobeSectionProps {
  callSheetId: string;
  wardrobe?: CallSheetWardrobe[];
  theme: any;
  onDataChange?: () => void;
}

const STATUS_COLORS: Record<WardrobeStatus, string> = {
  PENDING: 'orange',
  CONFIRMED: 'blue',
  ON_SET: 'cyan',
  IN_USE: 'green',
  WRAPPED: 'gray',
};

export function WardrobeSection({ callSheetId, wardrobe = [], theme, onDataChange }: WardrobeSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const addMutation = useMutation({
    mutationFn: (dto: CreateWardrobeDto) => callSheetsApi.addWardrobe(callSheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      onDataChange?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateWardrobeDto> }) =>
      callSheetsApi.updateWardrobe(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
      onDataChange?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => callSheetsApi.removeWardrobe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      onDataChange?.();
    },
  });

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (item: CallSheetWardrobe) => {
    setEditingId(item.id);
    form.setFieldsValue({
      itemName: item.itemName,
      brand: item.brand,
      size: item.size,
      color: item.color,
      providedBy: item.providedBy,
      forModel: item.forModel,
      forShot: item.forShot,
      status: item.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, dto: values });
    } else {
      await addMutation.mutateAsync(values);
    }
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'itemName',
      render: (text: string, record: CallSheetWardrobe) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.brand && <span style={{ fontSize: 12, color: '#999' }}>{record.brand}</span>}
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      width: 80,
      render: (size: string) => size || '-',
    },
    {
      title: 'Color',
      dataIndex: 'color',
      width: 100,
      render: (color: string) => color || '-',
    },
    {
      title: 'For Model',
      dataIndex: 'forModel',
      width: 120,
      render: (model: string) => model || '-',
    },
    {
      title: 'For Shot',
      dataIndex: 'forShot',
      width: 100,
      render: (shot: string) => shot || '-',
    },
    {
      title: 'Provided By',
      dataIndex: 'providedBy',
      width: 100,
      render: (provider: string) => provider || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (status: WardrobeStatus) => (
        <Tag color={STATUS_COLORS[status]}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_: any, record: CallSheetWardrobe) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Item"
            description="Are you sure?"
            onConfirm={() => removeMutation.mutate(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ background: theme.colors.accent.primary }}
        >
          Add Wardrobe Item
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={wardrobe}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        size="small"
        style={{
          background: theme.colors.background.secondary,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      />

      <Modal
        title={editingId ? 'Edit Wardrobe Item' : 'Add Wardrobe Item'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="itemName"
            label="Item Name"
            rules={[{ required: true, message: 'Item name is required' }]}
          >
            <Input placeholder="Blue Dress" />
          </Form.Item>
          <Form.Item name="brand" label="Brand">
            <Input placeholder="Designer Name" />
          </Form.Item>
          <Form.Item name="size" label="Size">
            <Input placeholder="XS/6" />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <Input placeholder="Blue" />
          </Form.Item>
          <Form.Item name="providedBy" label="Provided By">
            <Input placeholder="Client / Stylist / Model" />
          </Form.Item>
          <Form.Item name="forModel" label="For Model">
            <Input placeholder="Model name or #" />
          </Form.Item>
          <Form.Item name="forShot" label="For Shot/Look">
            <Input placeholder="Shot number or look reference" />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            initialValue="PENDING"
          >
            <Select
              options={[
                { label: 'Pending', value: 'PENDING' },
                { label: 'Confirmed', value: 'CONFIRMED' },
                { label: 'On Set', value: 'ON_SET' },
                { label: 'In Use', value: 'IN_USE' },
                { label: 'Wrapped', value: 'WRAPPED' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
