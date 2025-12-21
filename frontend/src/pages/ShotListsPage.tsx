import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Space, Spin, App, Empty, Input, Modal, Form, Select, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { Layout, Typography } from 'antd';
import { useTheme } from '../theme';
import { shotListsApi } from '../services/shotLists';
import { apiClient } from '../config/api';
import type { ShotList } from '../types/shotList';

const { Header, Content } = Layout;
const { Title } = Typography;

interface Project {
  id: string;
  number: string;
  description?: string;
}

export default function ShotListsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch all projects for the dropdown
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-shotlists'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/projects');
        return res.data.data || [];
      } catch (error) {
        message.error('Failed to load projects');
        return [];
      }
    },
  });

  // Fetch all shot lists (across all projects)
  const { data: allShotLists = [], isLoading, refetch } = useQuery({
    queryKey: ['all-shot-lists'],
    queryFn: async () => {
      try {
        // Fetch all shot lists by querying each project
        const shotLists: ShotList[] = [];
        for (const project of projects) {
          const res = await apiClient.get('/shot-lists', { params: { projectId: project.id } });
          if (res.data.data && Array.isArray(res.data.data)) {
            shotLists.push(...res.data.data);
          }
        }
        return shotLists;
      } catch (error) {
        return [];
      }
    },
    enabled: projects.length > 0,
  });

  // Create shot list mutation
  const createMutation = useMutation({
    mutationFn: shotListsApi.create,
    onSuccess: (newShotList) => {
      queryClient.invalidateQueries({ queryKey: ['all-shot-lists'] });
      message.success('Shot list created successfully');
      form.resetFields();
      setCreateModalOpen(false);
      // Navigate to the new shot list editor
      setTimeout(() => {
        navigate(`/shot-lists/${newShotList.id}`);
      }, 500);
    },
    onError: () => {
      message.error('Failed to create shot list');
    },
  });

  // Delete shot list mutation
  const deleteMutation = useMutation({
    mutationFn: shotListsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-shot-lists'] });
      message.success('Shot list deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete shot list');
    },
  });

  // Filter shot lists based on search term
  const filteredShotLists = allShotLists.filter(
    (sl) =>
      sl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sl.project?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (text: string, record: ShotList) => (
        <a onClick={() => navigate(`/shot-lists/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'number'],
      key: 'project',
      width: '20%',
      render: (text: string, record: ShotList) => record.project?.description || text || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '25%',
      render: (text: string) => text || '-',
    },
    {
      title: 'Scenes',
      dataIndex: 'scenes',
      key: 'sceneCount',
      width: '10%',
      align: 'center' as const,
      render: (scenes: any[]) => scenes?.length || 0,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_: any, record: ShotList) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/shot-lists/${record.id}`)}
            title="Edit shot list"
          />
          <Popconfirm
            title="Delete shot list?"
            description="This action cannot be undone. All scenes and shots will be deleted."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              title="Delete shot list"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCreateShotList = async (values: any) => {
    createMutation.mutate({
      name: values.name,
      projectId: values.projectId,
      description: values.description,
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
      <Header
        style={{
          background: theme.colors.card.background,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.colors.border.light}`,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>
            Shot Lists
          </Title>
          <p style={{ margin: '4px 0 0 0', color: theme.colors.text.secondary, fontSize: '12px' }}>
            Film production shot lists for all projects
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          New Shot List
        </Button>
      </Header>

      <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
        <div
          style={{
            background: theme.colors.card.background,
            padding: 24,
            borderRadius: '8px',
            marginBottom: 24,
            border: `1px solid ${theme.colors.border.light}`,
          }}
        >
          <Space>
            <Input
              placeholder="Search by name or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
            />
          </Space>
        </div>

        <div
          style={{
            background: theme.colors.card.background,
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border.light}`,
            overflow: 'hidden',
          }}
        >
          {isLoading || projectsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            </div>
          ) : filteredShotLists.length === 0 ? (
            <Empty
              description={searchTerm ? 'No shot lists found' : 'No shot lists yet'}
              style={{ marginTop: 48, marginBottom: 48 }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                Create First Shot List
              </Button>
            </Empty>
          ) : (
            <Table
              dataSource={filteredShotLists}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `${total} shot lists`,
              }}
              style={{ background: theme.colors.card.background }}
            />
          )}
        </div>
      </Content>

      {/* Create Shot List Modal */}
      <Modal
        title="Create New Shot List"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateShotList}>
          <Form.Item
            name="name"
            label="Shot List Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Scene 1-5 Shots" />
          </Form.Item>

          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Please select a project' }]}
          >
            <Select
              placeholder="Select a project"
              loading={projectsLoading}
              options={projects.map((p: Project) => ({
                value: p.id,
                label: `${p.number} - ${p.description || 'Untitled'}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={3} placeholder="Describe this shot list..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
