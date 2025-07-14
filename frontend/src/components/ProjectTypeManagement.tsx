import React, { useState } from 'react';
import {
  App,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  ColorPicker,
  Switch,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Badge,
  InputNumber,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectTypesApi, ProjectType, CreateProjectTypeDto, UpdateProjectTypeDto } from '../services/project-types';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;

export const ProjectTypeManagement: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProjectType | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Queries
  const { data: projectTypes, isLoading, error: projectTypesError } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectTypesApi.getAll,
  });

  const { data: projectTypeStats, error: statsError } = useQuery({
    queryKey: ['project-type-stats'],
    queryFn: projectTypesApi.getStats,
  });


  // Mutations
  const createMutation = useMutation({
    mutationFn: projectTypesApi.create,
    onSuccess: () => {
      message.success(t('settings.projectType.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      queryClient.invalidateQueries({ queryKey: ['project-type-stats'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('settings.projectType.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectTypeDto }) =>
      projectTypesApi.update(id, data),
    onSuccess: () => {
      message.success(t('settings.projectType.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      queryClient.invalidateQueries({ queryKey: ['project-type-stats'] });
      setIsModalOpen(false);
      setEditingType(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('settings.projectType.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectTypesApi.delete,
    onSuccess: () => {
      message.success(t('settings.projectType.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      queryClient.invalidateQueries({ queryKey: ['project-type-stats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('settings.projectType.deleteError'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: projectTypesApi.toggleActive,
    onSuccess: () => {
      message.success(t('settings.projectType.toggleSuccess'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('settings.projectType.toggleError'));
    },
  });

  // Event handlers
  const handleCreate = () => {
    setEditingType(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (type: ProjectType) => {
    setEditingType(type);
    form.setFieldsValue({
      code: type.code,
      name: type.name,
      description: type.description,
      prefix: type.prefix,
      color: type.color,
      isDefault: type.isDefault,
      sortOrder: type.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (id: string) => {
    toggleActiveMutation.mutate(id);
  };

  const columns = [
    {
      title: t('settings.projectType.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: ProjectType) => (
        <Space>
          <Tag color={record.color}>{code}</Tag>
          {record.isDefault && <Badge color="gold" text={t('settings.projectType.default')} />}
        </Space>
      ),
    },
    {
      title: t('settings.projectType.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ProjectType) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: record.color,
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          {name}
        </Space>
      ),
    },
    {
      title: t('settings.projectType.prefix'),
      dataIndex: 'prefix',
      key: 'prefix',
      render: (prefix: string) => <Tag>{prefix}</Tag>,
    },
    {
      title: t('settings.projectType.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('settings.projectType.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: ProjectType) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record.id)}
          loading={toggleActiveMutation.isPending}
        />
      ),
    },
    {
      title: t('settings.projectType.sortOrder'),
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record: ProjectType) => (
        <Space>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('settings.projectType.deleteConfirm')}
            onConfirm={() => handleDelete(record.id)}
            disabled={deleteMutation.isPending}
          >
            <Tooltip title={t('common.delete')}>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                loading={deleteMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          {t('settings.projectType.title')}
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setIsStatsModalOpen(true)}
          >
            {t('settings.projectType.viewStats')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            {t('settings.projectType.add')}
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={projectTypes?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingType ? t('settings.projectType.editTitle') : t('settings.projectType.createTitle')}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingType(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            color: '#1890ff',
            isDefault: false,
            sortOrder: 0,
          }}
        >
          <Form.Item
            label={t('settings.projectType.code')}
            name="code"
            rules={[
              { required: true, message: t('settings.projectType.codeRequired') },
              { pattern: /^[A-Z_]+$/, message: t('settings.projectType.codePattern') },
            ]}
          >
            <Input placeholder="PRODUCTION" />
          </Form.Item>

          <Form.Item
            label={t('settings.projectType.name')}
            name="name"
            rules={[{ required: true, message: t('settings.projectType.nameRequired') }]}
          >
            <Input placeholder="Production Work" />
          </Form.Item>

          <Form.Item
            label={t('settings.projectType.prefix')}
            name="prefix"
            rules={[
              { required: true, message: t('settings.projectType.prefixRequired') },
              { max: 3, message: t('settings.projectType.prefixLength') },
            ]}
          >
            <Input placeholder="PH" />
          </Form.Item>

          <Form.Item
            label={t('settings.projectType.description')}
            name="description"
          >
            <TextArea rows={3} placeholder={t('settings.projectType.descriptionPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('settings.projectType.color')}
            name="color"
          >
            <ColorPicker format="hex" />
          </Form.Item>

          <Form.Item
            label={t('settings.projectType.sortOrder')}
            name="sortOrder"
          >
            <InputNumber min={0} max={100} />
          </Form.Item>

          <Form.Item
            name="isDefault"
            valuePropName="checked"
          >
            <div>
              <Switch />
              <span style={{ marginLeft: 8 }}>{t('settings.projectType.setAsDefault')}</span>
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingType ? t('common.update') : t('common.create')}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Statistics Modal */}
      <Modal
        title={t('settings.projectType.statistics')}
        open={isStatsModalOpen}
        onCancel={() => setIsStatsModalOpen(false)}
        footer={null}
        width={800}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {Array.isArray(projectTypeStats?.data) && projectTypeStats.data.map((stat) => (
            <Card key={stat.id} size="small" style={{ borderLeft: `4px solid ${stat.color}` }}>
              <div style={{ textAlign: 'center' }}>
                <h4>{stat.name}</h4>
                <p><strong>{stat.totalProjects}</strong> {t('settings.projectType.totalProjects')}</p>
                <p><strong>{stat.activeProjects}</strong> {t('settings.projectType.activeProjects')}</p>
                <p><strong>{stat.completedProjects}</strong> {t('settings.projectType.completedProjects')}</p>
                <p><strong>IDR {stat.totalRevenue.toLocaleString()}</strong> {t('settings.projectType.totalRevenue')}</p>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </Card>
  );
};