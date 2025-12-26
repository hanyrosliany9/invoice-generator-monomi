import { Button, Modal, Form, Input, Select, Table, Space, Popconfirm, App, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { SpecialRequirement, SpecialReqType } from '../../types/callSheet';
import type { CreateSpecialReqDto } from '../../types/callSheet';

const { Title } = Typography;

interface SpecialRequirementsSectionProps {
  requirements: SpecialRequirement[];
  callSheetId: string;
  onAdd: (dto: CreateSpecialReqDto) => Promise<void>;
  onUpdate: (id: string, dto: Partial<CreateSpecialReqDto>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

const REQ_TYPE_OPTIONS = [
  { label: 'Stunts', value: 'STUNTS' as SpecialReqType },
  { label: 'Minors', value: 'MINORS' as SpecialReqType },
  { label: 'Animals', value: 'ANIMALS' as SpecialReqType },
  { label: 'Vehicles', value: 'VEHICLES' as SpecialReqType },
  { label: 'SFX / Pyrotechnics', value: 'SFX_PYRO' as SpecialReqType },
  { label: 'Water Work', value: 'WATER_WORK' as SpecialReqType },
  { label: 'Aerial / Drone', value: 'AERIAL_DRONE' as SpecialReqType },
  { label: 'Weapons', value: 'WEAPONS' as SpecialReqType },
  { label: 'Nudity', value: 'NUDITY' as SpecialReqType },
  { label: 'Other', value: 'OTHER' as SpecialReqType },
];

export function SpecialRequirementsSection({
  requirements = [],
  callSheetId,
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
}: SpecialRequirementsSectionProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async (values: CreateSpecialReqDto) => {
    try {
      await onAdd(values);
      message.success('Special requirement added');
      form.resetFields();
      setModalOpen(false);
    } catch (error) {
      message.error('Failed to add special requirement');
    }
  };

  const handleEdit = (req: SpecialRequirement) => {
    form.setFieldsValue(req);
    setEditingId(req.id);
    setModalOpen(true);
  };

  const handleUpdate = async (values: CreateSpecialReqDto) => {
    try {
      if (!editingId) return;
      await onUpdate(editingId, values);
      message.success('Special requirement updated');
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
    } catch (error) {
      message.error('Failed to update special requirement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      message.success('Special requirement deleted');
    } catch (error) {
      message.error('Failed to delete special requirement');
    }
  };

  const onFinish = (values: CreateSpecialReqDto) => {
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
      title: 'Type',
      dataIndex: 'reqType',
      key: 'reqType',
      width: 130,
      render: (type: SpecialReqType) => {
        const typeLabel = REQ_TYPE_OPTIONS.find(opt => opt.value === type)?.label || type;
        return typeLabel;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Contact',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 150,
    },
    {
      title: 'Scenes',
      dataIndex: 'scenes',
      key: 'scenes',
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: SpecialRequirement) => (
        <Space size="small">
          <EditOutlined
            onClick={() => handleEdit(record)}
            style={{ cursor: 'pointer', color: '#1890ff' }}
          />
          <Popconfirm
            title="Delete requirement?"
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
        <Title level={4}>Special Requirements</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          loading={loading}
        >
          Add Requirement
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={requirements}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'No special requirements' }}
      />

      <Modal
        title={editingId ? 'Edit Special Requirement' : 'Add Special Requirement'}
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
            name="reqType"
            label="Requirement Type"
            rules={[{ required: true, message: 'Please select requirement type' }]}
          >
            <Select options={REQ_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please describe the requirement' }]}
          >
            <Input.TextArea rows={3} placeholder="Detailed description of the special requirement" />
          </Form.Item>

          <Form.Item name="contactName" label="Contact Name">
            <Input placeholder="e.g., Stunt Coordinator, Animal Handler" />
          </Form.Item>

          <Form.Item name="contactPhone" label="Contact Phone">
            <Input type="tel" placeholder="+1 (555) 000-0000" />
          </Form.Item>

          <Form.Item name="safetyNotes" label="Safety Notes">
            <Input.TextArea rows={2} placeholder="Important safety considerations" />
          </Form.Item>

          <Form.Item name="scenes" label="Applies to Scenes">
            <Input placeholder="e.g., 5, 12, 15 or All" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
