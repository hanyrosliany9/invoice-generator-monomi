import { Button, Modal, Form, Input, InputNumber, Select, Table, Space, Popconfirm, App, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { MealBreak } from '../../types/callSheet';
import type { CreateMealDto } from '../../types/callSheet';

const { Title } = Typography;

interface MealBreaksSectionProps {
  meals: MealBreak[];
  callSheetId: string;
  onAdd: (dto: CreateMealDto) => Promise<void>;
  onUpdate: (id: string, dto: Partial<CreateMealDto>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function MealBreaksSection({
  meals = [],
  callSheetId,
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
}: MealBreaksSectionProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async (values: CreateMealDto) => {
    try {
      await onAdd(values);
      message.success('Meal added');
      form.resetFields();
      setModalOpen(false);
    } catch (error) {
      message.error('Failed to add meal');
    }
  };

  const handleEdit = (meal: MealBreak) => {
    form.setFieldsValue(meal);
    setEditingId(meal.id);
    setModalOpen(true);
  };

  const handleUpdate = async (values: CreateMealDto) => {
    try {
      if (!editingId) return;
      await onUpdate(editingId, values);
      message.success('Meal updated');
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
    } catch (error) {
      message.error('Failed to update meal');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      message.success('Meal deleted');
    } catch (error) {
      message.error('Failed to delete meal');
    }
  };

  const onFinish = (values: CreateMealDto) => {
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
      dataIndex: 'mealType',
      key: 'mealType',
      width: 120,
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 100,
    },
    {
      title: 'Duration (min)',
      dataIndex: 'duration',
      key: 'duration',
      width: 130,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
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
      render: (_: any, record: MealBreak) => (
        <Space size="small">
          <EditOutlined
            onClick={() => handleEdit(record)}
            style={{ cursor: 'pointer', color: '#1890ff' }}
          />
          <Popconfirm
            title="Delete meal?"
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
        <Title level={4}>Meal Breaks</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          loading={loading}
        >
          Add Meal
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={meals}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'No meals scheduled' }}
      />

      <Modal
        title={editingId ? 'Edit Meal' : 'Add Meal Break'}
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
            name="mealType"
            label="Meal Type"
            rules={[{ required: true, message: 'Please select meal type' }]}
          >
            <Select
              options={[
                { label: 'Breakfast', value: 'BREAKFAST' },
                { label: 'Lunch', value: 'LUNCH' },
                { label: 'Second Meal', value: 'SECOND_MEAL' },
                { label: 'Craft Services', value: 'CRAFT_SERVICES' },
                { label: 'Catering', value: 'CATERING' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="time"
            label="Time"
            rules={[{ required: true, message: 'Please enter time' }]}
          >
            <Input type="time" />
          </Form.Item>

          <Form.Item
            name="duration"
            label="Duration (minutes)"
            initialValue={30}
          >
            <InputNumber min={5} max={180} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="location" label="Location">
            <Input placeholder="e.g., Craft Services Area, Dining Tent" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Any special meal notes" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
