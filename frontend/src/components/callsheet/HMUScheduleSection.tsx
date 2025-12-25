import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callSheetsApi } from '../../services/callSheets';
import type { CallSheetHMU, CreateHmuDto, HMURole } from '../../types/callSheet';

interface HMUScheduleSectionProps {
  callSheetId: string;
  hmuSchedule?: CallSheetHMU[];
  theme: any;
  onDataChange?: () => void;
}

const ROLE_COLORS: Record<HMURole, string> = {
  HAIR: 'blue',
  MAKEUP: 'magenta',
  BOTH: 'purple',
  KEY_STYLIST: 'gold',
};

export function HMUScheduleSection({
  callSheetId,
  hmuSchedule = [],
  theme,
  onDataChange,
}: HMUScheduleSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const addMutation = useMutation({
    mutationFn: (dto: CreateHmuDto) => callSheetsApi.addHmu(callSheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      onDataChange?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateHmuDto> }) =>
      callSheetsApi.updateHmu(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
      onDataChange?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => callSheetsApi.removeHmu(id),
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

  const handleEdit = (hmu: CallSheetHMU) => {
    setEditingId(hmu.id);
    form.setFieldsValue({
      artistName: hmu.artistName,
      artistRole: hmu.artistRole,
      stationNumber: hmu.stationNumber,
      callTime: hmu.callTime,
      availableFrom: hmu.availableFrom,
      availableUntil: hmu.availableUntil,
      assignedModels: hmu.assignedModels,
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
      title: 'Station',
      dataIndex: 'stationNumber',
      width: 80,
      render: (num: number) => num ? `Station ${num}` : '-',
    },
    {
      title: 'Artist Name',
      dataIndex: 'artistName',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'artistRole',
      width: 120,
      render: (role: HMURole) => (
        <Tag color={ROLE_COLORS[role]}>
          {role === 'KEY_STYLIST' ? 'Key Stylist' : role.charAt(0) + role.slice(1).toLowerCase()}
        </Tag>
      ),
    },
    {
      title: 'Call Time',
      dataIndex: 'callTime',
      width: 100,
    },
    {
      title: 'Available',
      width: 180,
      render: (_: any, record: CallSheetHMU) =>
        record.availableFrom && record.availableUntil
          ? `${record.availableFrom} - ${record.availableUntil}`
          : '-',
    },
    {
      title: 'Assigned Models',
      dataIndex: 'assignedModels',
      render: (models: string) =>
        models ? (
          <Tag color="blue">{models.split(',').length} models</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_: any, record: CallSheetHMU) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Artist"
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
          Add H&MU Artist
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={hmuSchedule}
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
        title={editingId ? 'Edit H&MU Artist' : 'Add H&MU Artist'}
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
            name="artistName"
            label="Artist Name"
            rules={[{ required: true, message: 'Artist name is required' }]}
          >
            <Input placeholder="Sarah" />
          </Form.Item>
          <Form.Item
            name="artistRole"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select
              options={[
                { label: 'Hair', value: 'HAIR' },
                { label: 'Makeup', value: 'MAKEUP' },
                { label: 'Both', value: 'BOTH' },
                { label: 'Key Stylist', value: 'KEY_STYLIST' },
              ]}
            />
          </Form.Item>
          <Form.Item name="stationNumber" label="Station Number">
            <InputNumber min={1} placeholder="1" />
          </Form.Item>
          <Form.Item
            name="callTime"
            label="Call Time"
            rules={[{ required: true, message: 'Call time is required' }]}
          >
            <Input placeholder="07:00 AM" />
          </Form.Item>
          <Form.Item name="availableFrom" label="Available From">
            <Input placeholder="07:15 AM" />
          </Form.Item>
          <Form.Item name="availableUntil" label="Available Until">
            <Input placeholder="05:00 PM" />
          </Form.Item>
          <Form.Item name="assignedModels" label="Assigned Models (comma-separated)">
            <Input placeholder="Sarah Johnson, Emma Smith" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
