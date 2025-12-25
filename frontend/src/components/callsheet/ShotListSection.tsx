import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callSheetsApi } from '../../services/callSheets';
import type { CallSheetShot, CreateShotDto } from '../../types/callSheet';

interface ShotListSectionProps {
  callSheetId: string;
  shots?: CallSheetShot[];
  theme: any;
  onDataChange?: () => void;
}

export function ShotListSection({ callSheetId, shots = [], theme, onDataChange }: ShotListSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const addMutation = useMutation({
    mutationFn: (dto: CreateShotDto) => callSheetsApi.addShot(callSheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      onDataChange?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateShotDto> }) =>
      callSheetsApi.updateShot(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
      onDataChange?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => callSheetsApi.removeShot(id),
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

  const handleEdit = (shot: CallSheetShot) => {
    setEditingId(shot.id);
    form.setFieldsValue({
      shotNumber: shot.shotNumber,
      shotName: shot.shotName,
      lookReference: shot.lookReference,
      description: shot.description,
      setupLocation: shot.setupLocation,
      estStartTime: shot.estStartTime,
      estDuration: shot.estDuration,
      wardrobeNotes: shot.wardrobeNotes,
      hmuNotes: shot.hmuNotes,
      modelIds: shot.modelIds,
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
      title: 'Shot #',
      dataIndex: 'shotNumber',
      width: 80,
      sorter: (a: CallSheetShot, b: CallSheetShot) => a.shotNumber - b.shotNumber,
    },
    {
      title: 'Name/Look',
      dataIndex: 'shotName',
      render: (text: string, record: CallSheetShot) =>
        record.lookReference ? `${text} (${record.lookReference})` : text || record.lookReference,
    },
    {
      title: 'Location',
      dataIndex: 'setupLocation',
      width: 150,
    },
    {
      title: 'Est. Time',
      dataIndex: 'estStartTime',
      width: 100,
    },
    {
      title: 'Duration (min)',
      dataIndex: 'estDuration',
      width: 120,
      render: (duration: number) => duration ? `${duration}m` : '-',
    },
    {
      title: 'Models',
      dataIndex: 'modelIds',
      width: 150,
      render: (ids: string) => ids ? ids.split(',').length + ' models' : '-',
    },
    {
      title: 'Actions',
      width: 100,
      render: (_: any, record: CallSheetShot) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Shot"
            description="Are you sure you want to delete this shot?"
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
          Add Shot/Look
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={shots}
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
        title={editingId ? 'Edit Shot' : 'Add Shot/Look'}
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
            name="shotNumber"
            label="Shot Number"
            rules={[{ required: true, message: 'Shot number is required' }]}
          >
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="shotName" label="Shot Name (e.g., Hero Shot, Lifestyle)">
            <Input placeholder="Hero Shot" />
          </Form.Item>
          <Form.Item name="lookReference" label="Look Reference (e.g., Look A)">
            <Input placeholder="Look A" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Shot description" />
          </Form.Item>
          <Form.Item name="setupLocation" label="Setup Location">
            <Input placeholder="Studio A" />
          </Form.Item>
          <Form.Item name="estStartTime" label="Estimated Start Time">
            <Input placeholder="10:00 AM" />
          </Form.Item>
          <Form.Item name="estDuration" label="Est. Duration (minutes)">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="wardrobeNotes" label="Wardrobe Notes">
            <Input.TextArea rows={2} placeholder="Blue dress, heels" />
          </Form.Item>
          <Form.Item name="hmuNotes" label="H&MU Notes">
            <Input.TextArea rows={2} placeholder="Hair in updo, natural makeup" />
          </Form.Item>
          <Form.Item name="modelIds" label="Model IDs (comma-separated)">
            <Input placeholder="1, 2, 3" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
