import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callSheetsApi } from '../../services/callSheets';
import type { CallSheetModel, CreateModelDto, ModelArrivalType } from '../../types/callSheet';

interface ModelsSectionProps {
  callSheetId: string;
  models?: CallSheetModel[];
  theme: any;
  onDataChange?: () => void;
}

const ARRIVAL_TYPE_COLORS = {
  CAMERA_READY: 'blue',
  STYLED: 'green',
};

export function ModelsSection({ callSheetId, models = [], theme, onDataChange }: ModelsSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const addMutation = useMutation({
    mutationFn: (dto: CreateModelDto) => callSheetsApi.addModel(callSheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      onDataChange?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateModelDto> }) =>
      callSheetsApi.updateModel(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSheet', callSheetId] });
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
      onDataChange?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => callSheetsApi.removeModel(id),
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

  const handleEdit = (model: CallSheetModel) => {
    setEditingId(model.id);
    form.setFieldsValue({
      modelName: model.modelName,
      modelNumber: model.modelNumber,
      agencyName: model.agencyName,
      arrivalType: model.arrivalType,
      arrivalTime: model.arrivalTime,
      hmuStartTime: model.hmuStartTime,
      cameraReadyTime: model.cameraReadyTime,
      hmuArtist: model.hmuArtist,
      hmuDuration: model.hmuDuration,
      wardrobeSizes: model.wardrobeSizes,
      shotNumbers: model.shotNumbers,
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
      title: '#',
      dataIndex: 'modelNumber',
      width: 60,
      render: (num: string) => num || '-',
    },
    {
      title: 'Model Name',
      dataIndex: 'modelName',
      render: (text: string, record: CallSheetModel) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.agencyName && <span style={{ fontSize: 12, color: '#999' }}>{record.agencyName}</span>}
        </Space>
      ),
    },
    {
      title: 'Arrival Type',
      dataIndex: 'arrivalType',
      width: 120,
      render: (type: ModelArrivalType) => (
        <Tag color={ARRIVAL_TYPE_COLORS[type]}>
          {type === 'CAMERA_READY' ? 'Camera Ready' : 'Styled On-Set'}
        </Tag>
      ),
    },
    {
      title: 'Arrival Time',
      dataIndex: 'arrivalTime',
      width: 100,
    },
    {
      title: 'HMU Start',
      dataIndex: 'hmuStartTime',
      width: 100,
      render: (time: string) => time || '-',
    },
    {
      title: 'Camera Ready By',
      dataIndex: 'cameraReadyTime',
      width: 120,
      render: (time: string) => time || '-',
    },
    {
      title: 'H&MU Artist',
      dataIndex: 'hmuArtist',
      width: 120,
      render: (artist: string) => artist || '-',
    },
    {
      title: 'Actions',
      width: 100,
      render: (_: any, record: CallSheetModel) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Model"
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
          Add Model
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={models}
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
        title={editingId ? 'Edit Model' : 'Add Model/Talent'}
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
            name="modelName"
            label="Model Name"
            rules={[{ required: true, message: 'Model name is required' }]}
          >
            <Input placeholder="Sarah Johnson" />
          </Form.Item>
          <Form.Item name="modelNumber" label="Model Number (e.g., #1)">
            <Input placeholder="#1" />
          </Form.Item>
          <Form.Item name="agencyName" label="Agency Name">
            <Input placeholder="Elite Modeling Agency" />
          </Form.Item>
          <Form.Item
            name="arrivalType"
            label="Arrival Type"
            rules={[{ required: true, message: 'Arrival type is required' }]}
          >
            <Select
              options={[
                { label: 'Camera Ready', value: 'CAMERA_READY' },
                { label: 'Styled On-Set', value: 'STYLED' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="arrivalTime"
            label="Arrival Time"
            rules={[{ required: true, message: 'Arrival time is required' }]}
          >
            <Input placeholder="08:00 AM" />
          </Form.Item>
          <Form.Item name="hmuStartTime" label="H&MU Start Time">
            <Input placeholder="08:15 AM" />
          </Form.Item>
          <Form.Item name="cameraReadyTime" label="Camera Ready By">
            <Input placeholder="09:30 AM" />
          </Form.Item>
          <Form.Item name="hmuArtist" label="Assigned H&MU Artist">
            <Input placeholder="Jennifer" />
          </Form.Item>
          <Form.Item name="hmuDuration" label="H&MU Duration (minutes)">
            <Input placeholder="60" />
          </Form.Item>
          <Form.Item name="wardrobeSizes" label="Wardrobe Sizes">
            <Input placeholder="XS/6" />
          </Form.Item>
          <Form.Item name="shotNumbers" label="Shot Numbers (comma-separated)">
            <Input placeholder="1, 2, 3" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
