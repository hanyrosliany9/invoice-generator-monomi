import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Table, Spin, Typography, App, Empty, Modal, Form, Input, Select, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../theme';
import { schedulesApi } from '../services/schedules';
import { apiClient } from '../config/api';
import type { ShootingSchedule, CreateScheduleDto } from '../types/schedule';

const { Header, Content } = Layout;
const { Title } = Typography;

interface Project {
  id: string;
  number: string;
  description?: string;
}

export default function SchedulesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch all projects for the dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-schedules'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/projects');
        return res.data.data || [];
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
      }
    },
  });

  const { data: schedules = [], isLoading, refetch } = useQuery({
    queryKey: ['schedules', filterProjectId],
    queryFn: async () => {
      try {
        const result = await schedulesApi.getByProject('all');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
        return [];
      }
    },
  });

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: (dto: CreateScheduleDto) => schedulesApi.create(dto),
    onSuccess: (newSchedule) => {
      console.log('[SchedulesList] Create mutation success:', newSchedule);
      console.log('[SchedulesList] Schedule ID:', newSchedule?.id);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      message.success('Schedule created successfully');
      form.resetFields();
      setCreateModalOpen(false);
      // Navigate to the new schedule
      if (newSchedule?.id) {
        setTimeout(() => {
          navigate(`/schedules/${newSchedule.id}`);
        }, 500);
      } else {
        console.error('[SchedulesList] No schedule ID returned!', newSchedule);
        message.error('Schedule created but ID not returned');
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create schedule';
      console.error('Schedule creation error:', error);
      message.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: schedulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      message.success('Schedule deleted');
    },
    onError: () => {
      message.error('Failed to delete schedule');
    },
  });

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Schedule',
      content: 'Are you sure you want to delete this shooting schedule?',
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleCreateSchedule = async (values: any) => {
    const payload: any = {
      name: values.name,
      projectId: values.projectId,
    };

    // Only include optional fields if they have values
    if (values.description) {
      payload.description = values.description;
    }

    if (values.pagesPerDay !== undefined && values.pagesPerDay !== null) {
      payload.pagesPerDay = values.pagesPerDay;
    }

    createMutation.mutate(payload);
  };

  const columns = [
    {
      title: 'Schedule Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ShootingSchedule) => (
        <a onClick={() => navigate(`/schedules/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'project',
    },
    {
      title: 'Days',
      dataIndex: 'shootDays',
      key: 'days',
      render: (days: any[]) => days?.length || 0,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ShootingSchedule) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/schedules/${record.id}`)}
          />
          <Button
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => window.open(`/api/schedules/${record.id}/export/pdf`, '_blank')}
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            size="small"
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
        <Header style={{ background: theme.colors.card.background, padding: '0 24px', borderBottom: `1px solid ${theme.colors.border.light}` }}>
          <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>
            Shooting Schedules
          </Title>
        </Header>
        <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
          <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />
        </Content>
      </Layout>
    );
  }

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
        <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>
          Shooting Schedules
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          New Schedule
        </Button>
      </Header>

      <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
        <div style={{ background: theme.colors.card.background, borderRadius: 8, border: `1px solid ${theme.colors.border.light}`, overflow: 'hidden' }}>
          {!schedules || schedules.length === 0 ? (
            <Empty description="No shooting schedules found. Create one from a project page." style={{ marginTop: 48, marginBottom: 48 }} />
          ) : (
            <Table
              dataSource={schedules as any[]}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ background: theme.colors.card.background }}
            />
          )}
        </div>
      </Content>

      {/* Create Schedule Modal */}
      <Modal
        title="Create New Shooting Schedule"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSchedule}>
          <Form.Item
            name="name"
            label="Schedule Name"
            rules={[{ required: true, message: 'Please enter a schedule name' }]}
          >
            <Input placeholder="e.g., Main Production Schedule" />
          </Form.Item>

          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Please select a project' }]}
          >
            <Select
              placeholder="Select a project"
              options={projects.map((p: Project) => ({
                value: p.id,
                label: `${p.number} - ${p.description || 'Untitled'}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea rows={3} placeholder="Describe this schedule..." />
          </Form.Item>

          <Form.Item
            name="pagesPerDay"
            label="Pages Per Day (Default: 8)"
          >
            <InputNumber min={1} max={20} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
