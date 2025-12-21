import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Dropdown,
  Typography,
  Empty,
  App,
} from 'antd';
import { useTheme } from '../theme';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ShareAltOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { decksApi } from '../services/decks';
import type { Deck, CreateDeckDto } from '../types/deck';

const { Title } = Typography;

export default function DecksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { theme } = useTheme();
  const { message, modal } = App.useApp();

  // Fetch decks
  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: () => decksApi.getAll(),
  });

  // Create deck mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateDeckDto) => decksApi.create(data),
    onSuccess: (res) => {
      message.success('Deck created');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setIsCreateModalOpen(false);
      form.resetFields();
      navigate(`/decks/${res.id}`);
    },
    onError: () => message.error('Failed to create deck'),
  });

  // Delete deck mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksApi.delete(id),
    onSuccess: () => {
      message.success('Deck deleted');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
    onError: () => message.error('Failed to delete deck'),
  });

  // Duplicate deck mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => decksApi.duplicate(id),
    onSuccess: (res) => {
      message.success('Deck duplicated');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      navigate(`/decks/${res.id}`);
    },
    onError: () => message.error('Failed to duplicate deck'),
  });

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Deck) => (
        <a onClick={() => navigate(`/decks/${record.id}`)}>{title}</a>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'PUBLISHED' ? 'green' : status === 'ARCHIVED' ? 'default' : 'blue'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Slides',
      dataIndex: ['_count', 'slides'],
      key: 'slides',
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
    },
    {
      title: 'Project',
      dataIndex: ['project', 'number'],
      key: 'project',
    },
    {
      title: 'Shared',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic: boolean) =>
        isPublic ? <Tag color="purple">Public</Tag> : null,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Deck) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'View',
                onClick: () => navigate(`/decks/${record.id}`),
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => navigate(`/decks/${record.id}/edit`),
              },
              {
                key: 'duplicate',
                icon: <CopyOutlined />,
                label: 'Duplicate',
                onClick: () => duplicateMutation.mutate(record.id),
              },
              {
                key: 'share',
                icon: <ShareAltOutlined />,
                label: 'Share Settings',
                onClick: () => navigate(`/decks/${record.id}?tab=share`),
              },
              { type: 'divider' },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
                onClick: () => {
                  modal.confirm({
                    title: 'Delete Deck?',
                    content: 'This action cannot be undone.',
                    okText: 'Delete',
                    okType: 'danger',
                    onOk: () => deleteMutation.mutate(record.id),
                  });
                },
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ background: theme.colors.background.primary, borderColor: theme.colors.border.default }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>Presentation Decks</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Deck
          </Button>
        </div>

        {decks?.length === 0 ? (
          <Empty
            description="No decks yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create Your First Deck
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={decks}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title="Create New Deck"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="My Presentation" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description..." />
          </Form.Item>
          <Form.Item name="slideWidth" label="Slide Width" initialValue={1920}>
            <Select>
              <Select.Option value={1920}>1920 (16:9 HD)</Select.Option>
              <Select.Option value={1280}>1280 (16:9 SD)</Select.Option>
              <Select.Option value={1080}>1080 (Square)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
