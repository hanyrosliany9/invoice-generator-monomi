import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Table, Spin, Typography, App, Empty, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../theme';
import { callSheetsApi } from '../services/callSheets';
import type { CallSheet } from '../types/callSheet';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function CallSheetsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

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

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Call Sheet',
      content: 'Are you sure you want to delete this call sheet?',
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        deleteMutation.mutate(id);
      },
    });
  };

  const columns = [
    {
      title: 'Call Sheet #',
      dataIndex: 'callSheetNumber',
      key: 'callSheetNumber',
      render: (num: number, record: CallSheet) => (
        <a onClick={() => navigate(`/call-sheets/${record.id}`)}>{num}</a>
      ),
    },
    {
      title: 'Production',
      dataIndex: 'productionName',
      key: 'productionName',
    },
    {
      title: 'Shoot Date',
      dataIndex: 'shootDate',
      key: 'shootDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
    {
      title: 'Location',
      dataIndex: 'locationName',
      key: 'locationName',
    },
    {
      title: 'Cast',
      dataIndex: 'castCalls',
      key: 'castCalls',
      render: (calls: any[]) => calls?.length || 0,
    },
    {
      title: 'Crew',
      dataIndex: 'crewCalls',
      key: 'crewCalls',
      render: (calls: any[]) => calls?.length || 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CallSheet) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/call-sheets/${record.id}/view`)}
          />
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/call-sheets/${record.id}`)}
          />
          <Button
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => window.open(`/api/call-sheets/${record.id}/export/pdf`, '_blank')}
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
            Call Sheets
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
          Call Sheets
        </Title>
        <Button
          type="primary"
          onClick={() => navigate('/schedules')}
        >
          Create from Schedule
        </Button>
      </Header>

      <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
        <div style={{ background: theme.colors.card.background, borderRadius: 8, border: `1px solid ${theme.colors.border.light}`, overflow: 'hidden' }}>
          {!callSheets || callSheets.length === 0 ? (
            <Empty description="No call sheets found. Create one from a shooting schedule." style={{ marginTop: 48, marginBottom: 48 }} />
          ) : (
            <Table
              dataSource={callSheets as any[]}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ background: theme.colors.card.background }}
            />
          )}
        </div>
      </Content>
    </Layout>
  );
}
