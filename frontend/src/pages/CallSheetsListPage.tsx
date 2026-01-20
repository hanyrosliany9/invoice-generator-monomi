import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Button,
  Space,
  Spin,
  Typography,
  App,
  Empty,
  Modal,
  Form,
  Input,
  DatePicker,
  Tag,
  Popconfirm,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  EyeOutlined,
  CalendarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  CameraOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../theme';
import { callSheetsApi } from '../services/callSheets';
import { exportPdfWithAuth } from '../utils/exportPdfWithAuth';
import type { CallSheet, CallSheetType } from '../types/callSheet';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function CallSheetsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch all call sheets
  const { data: callSheets = [], isLoading } = useQuery({
    queryKey: ['call-sheets'],
    queryFn: async () => {
      try {
        const result = await callSheetsApi.getAll();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Failed to fetch call sheets:', error);
        return [];
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: callSheetsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheets'] });
      message.success('Call sheet deleted');
    },
    onError: () => {
      message.error('Failed to delete call sheet');
    },
  });

  const createMutation = useMutation({
    mutationFn: callSheetsApi.create,
    onSuccess: (newCallSheet) => {
      queryClient.invalidateQueries({ queryKey: ['call-sheets'] });
      message.success('Call sheet created!');
      setCreateModalOpen(false);
      form.resetFields();
      // Navigate to the new call sheet editor
      navigate(`/call-sheets/${newCallSheet.id}`);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to create call sheet';
      message.error(errorMessage);
    },
  });

  const handleCreateCallSheet = (values: any) => {
    createMutation.mutate({
      callSheetType: values.callSheetType || 'PHOTO',
      productionName: values.productionName,
      shootDate: values.shootDate.toISOString(),
      dayNumber: values.dayNumber || 1,
      totalDays: values.totalDays || 1,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return theme.colors.text.secondary;
      case 'READY': return theme.colors.status.info;
      case 'SENT': return theme.colors.status.success;
      case 'UPDATED': return theme.colors.status.warning;
      default: return theme.colors.text.secondary;
    }
  };

  const getTypeIcon = (type?: CallSheetType) => {
    return type === 'FILM' ? <CameraOutlined /> : <PictureOutlined />;
  };

  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
        <Header style={{ background: theme.colors.card.background, padding: '0 24px', borderBottom: `1px solid ${theme.colors.border.light}` }}>
          <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>
            Call Sheets
          </Title>
        </Header>
        <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Spin size="large" />
          </div>
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
          Call Sheets
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Call Sheet
        </Button>
      </Header>

      <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
        {/* Call Sheets List - Full Width Table Style */}
        <div
          style={{
            background: theme.colors.card.background,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border.light}`,
            overflow: 'hidden',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              background: theme.colors.background.tertiary,
              borderBottom: `2px solid ${theme.colors.accent.primary}`,
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              color: theme.colors.text.secondary,
              letterSpacing: 1,
            }}
          >
            <div style={{ width: 60, textAlign: 'center' }}>Type</div>
            <div style={{ width: 80, textAlign: 'center' }}>Day</div>
            <div style={{ flex: 1 }}>Production</div>
            <div style={{ width: 160 }}>Shoot Date</div>
            <div style={{ width: 180 }}>Location</div>
            <div style={{ width: 80, textAlign: 'center' }}>Cast</div>
            <div style={{ width: 80, textAlign: 'center' }}>Crew</div>
            <div style={{ width: 100, textAlign: 'center' }}>Status</div>
            <div style={{ width: 160, textAlign: 'center' }}>Actions</div>
          </div>

          {/* Table Body */}
          {!callSheets || callSheets.length === 0 ? (
            <Empty
              description="No call sheets found. Create one to get started."
              style={{ margin: '60px 0', color: theme.colors.text.tertiary }}
            />
          ) : (
            (callSheets as CallSheet[]).map((callSheet) => (
              <div
                key={callSheet.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  borderBottom: `1px solid ${theme.colors.border.default}`,
                  background: theme.colors.background.primary,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onClick={() => navigate(`/call-sheets/${callSheet.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.background.secondary}
                onMouseLeave={(e) => e.currentTarget.style.background = theme.colors.background.primary}
              >
                {/* Type Icon */}
                <div style={{ width: 60, textAlign: 'center', fontSize: 18, color: theme.colors.accent.primary }}>
                  {getTypeIcon(callSheet.callSheetType)}
                </div>

                {/* Day Number */}
                <div style={{ width: 80, textAlign: 'center' }}>
                  <span
                    style={{
                      background: theme.colors.accent.primary,
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {callSheet.dayNumber || callSheet.callSheetNumber || 1}
                  </span>
                </div>

                {/* Production Name */}
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: theme.colors.text.primary, fontSize: 15 }}>
                    {callSheet.productionName || 'Untitled Production'}
                  </Text>
                </div>

                {/* Shoot Date */}
                <div style={{ width: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarOutlined style={{ color: theme.colors.accent.primary }} />
                    <span style={{ color: theme.colors.text.primary }}>
                      {callSheet.shootDate
                        ? dayjs(callSheet.shootDate).format('ddd, DD MMM YYYY')
                        : 'No date'}
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div style={{ width: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <EnvironmentOutlined style={{ color: theme.colors.status.success }} />
                    <Text
                      ellipsis
                      style={{ color: theme.colors.text.secondary, maxWidth: 150 }}
                    >
                      {callSheet.locationName || 'TBD'}
                    </Text>
                  </div>
                </div>

                {/* Cast Count */}
                <div style={{ width: 80, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <TeamOutlined style={{ color: theme.colors.status.info }} />
                    <span style={{ fontWeight: 600, color: theme.colors.text.primary }}>
                      {callSheet.castCalls?.length || callSheet.models?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Crew Count */}
                <div style={{ width: 80, textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: theme.colors.text.primary }}>
                    {callSheet.crewCalls?.length || 0}
                  </span>
                </div>

                {/* Status */}
                <div style={{ width: 100, textAlign: 'center' }}>
                  <Tag color={getStatusColor(callSheet.status)} style={{ margin: 0 }}>
                    {callSheet.status}
                  </Tag>
                </div>

                {/* Actions */}
                <div style={{ width: 160, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Space size="small">
                    <Button
                      icon={<EyeOutlined />}
                      size="small"
                      onClick={() => navigate(`/call-sheets/${callSheet.id}/view`)}
                    />
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => navigate(`/call-sheets/${callSheet.id}`)}
                    />
                    <Button
                      icon={<FilePdfOutlined />}
                      size="small"
                      onClick={() => exportPdfWithAuth(`/call-sheets/${callSheet.id}/export/pdf`, `call-sheet-${callSheet.productionName || callSheet.id}.pdf`)}
                    />
                    <Popconfirm
                      title="Delete Call Sheet"
                      description="Are you sure you want to delete this call sheet?"
                      onConfirm={() => deleteMutation.mutate(callSheet.id)}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        icon={<DeleteOutlined />}
                        danger
                        size="small"
                      />
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ))
          )}
        </div>
      </Content>

      {/* Create Call Sheet Modal */}
      <Modal
        title="Create Call Sheet"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCallSheet}
          initialValues={{
            callSheetType: 'PHOTO',
            dayNumber: 1,
            totalDays: 1,
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="callSheetType"
            label="Type"
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select
              options={[
                { label: '📸 Photo Shoot', value: 'PHOTO' },
                { label: '🎬 Film Production', value: 'FILM' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="productionName"
            label="Production Name"
            rules={[{ required: true, message: 'Please enter production name' }]}
          >
            <Input placeholder="e.g., Brand Campaign 2026" />
          </Form.Item>

          <Form.Item
            name="shootDate"
            label="Shoot Date"
            rules={[{ required: true, message: 'Please select shoot date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="dayNumber"
              label="Day Number"
              style={{ flex: 1 }}
            >
              <Input type="number" min={1} placeholder="1" />
            </Form.Item>

            <Form.Item
              name="totalDays"
              label="Total Days"
              style={{ flex: 1 }}
            >
              <Input type="number" min={1} placeholder="1" />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Call Sheet
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
