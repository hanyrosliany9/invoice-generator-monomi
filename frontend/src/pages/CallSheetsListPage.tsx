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
  Select,
  Form,
  Tag,
  Popconfirm,
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../theme';
import { callSheetsApi } from '../services/callSheets';
import { schedulesApi } from '../services/schedules';
import { exportPdfWithAuth } from '../utils/exportPdfWithAuth';
import type { CallSheet } from '../types/callSheet';
import type { ShootingSchedule, ShootDay } from '../types/schedule';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function CallSheetsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedShootDay, setSelectedShootDay] = useState<ShootDay | null>(null);
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

  // Fetch all schedules for the create modal
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', 'all'],
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

  // Get selected schedule details
  const selectedSchedule = schedules.find((s: ShootingSchedule) => s.id === selectedScheduleId);

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
      setSelectedScheduleId(null);
      setSelectedShootDay(null);
      form.resetFields();
      // Navigate to the new call sheet editor
      navigate(`/call-sheets/${newCallSheet.id}`);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to create call sheet';
      message.error(errorMessage);
    },
  });

  const handleCreateCallSheet = () => {
    if (!selectedScheduleId || !selectedShootDay) {
      message.warning('Please select a schedule and shoot day');
      return;
    }

    createMutation.mutate({
      scheduleId: selectedScheduleId,
      shootDayId: selectedShootDay.id,
      shootDate: selectedShootDay.shootDate || new Date().toISOString(),
      productionName: selectedSchedule?.name || 'Production',
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

  // Get shoot days that already have call sheets
  const existingCallSheetDayIds = callSheets.map((cs: CallSheet) => cs.shootDayId);

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
            <div style={{ width: 80, textAlign: 'center' }}>#</div>
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
              description="No call sheets found. Create one from a shooting schedule."
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
                {/* Call Sheet Number */}
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
                    {callSheet.callSheetNumber}
                  </span>
                </div>

                {/* Production Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: theme.colors.text.primary, fontSize: 14 }}>
                    {callSheet.productionName || 'Untitled Production'}
                  </div>
                  {callSheet.director && (
                    <div style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 }}>
                      Dir: {callSheet.director}
                    </div>
                  )}
                </div>

                {/* Shoot Date */}
                <div style={{ width: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.text.primary }}>
                    <CalendarOutlined style={{ color: theme.colors.accent.primary }} />
                    <span style={{ fontWeight: 500 }}>
                      {dayjs(callSheet.shootDate).format('ddd, MMM D, YYYY')}
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div style={{ width: 180 }}>
                  {callSheet.locationName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.text.secondary }}>
                      <EnvironmentOutlined style={{ color: theme.colors.status.success }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {callSheet.locationName}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: theme.colors.text.tertiary }}>—</span>
                  )}
                </div>

                {/* Cast Count */}
                <div style={{ width: 80, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <TeamOutlined style={{ color: theme.colors.status.info }} />
                    <span style={{ fontWeight: 600, color: theme.colors.text.primary }}>
                      {callSheet.castCalls?.length || 0}
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
                      onClick={() => exportPdfWithAuth(`/call-sheets/${callSheet.id}/export/pdf`, `call-sheet-${callSheet.title || callSheet.id}.pdf`)}
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
          setSelectedScheduleId(null);
          setSelectedShootDay(null);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            loading={createMutation.isPending}
            disabled={!selectedScheduleId || !selectedShootDay}
            onClick={handleCreateCallSheet}
          >
            Create Call Sheet
          </Button>,
        ]}
        width={600}
      >
        <div style={{ padding: '16px 0' }}>
          {/* Step 1: Select Schedule */}
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: theme.colors.text.primary }}>
              1. Select Shooting Schedule
            </Text>
            <Select
              placeholder="Choose a schedule..."
              style={{ width: '100%' }}
              value={selectedScheduleId}
              onChange={(value) => {
                setSelectedScheduleId(value);
                setSelectedShootDay(null);
              }}
              options={schedules.map((schedule: ShootingSchedule) => ({
                label: `${schedule.name} (${schedule.shootDays?.length || 0} days)`,
                value: schedule.id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </div>

          {/* Step 2: Select Shoot Day */}
          {selectedSchedule && (
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: theme.colors.text.primary }}>
                2. Select Shoot Day
              </Text>
              {selectedSchedule.shootDays && selectedSchedule.shootDays.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedSchedule.shootDays.map((day: ShootDay) => {
                    const hasCallSheet = existingCallSheetDayIds.includes(day.id);
                    const isSelected = selectedShootDay?.id === day.id;

                    return (
                      <div
                        key={day.id}
                        onClick={() => !hasCallSheet && setSelectedShootDay(day)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: isSelected
                            ? theme.colors.accent.primary
                            : hasCallSheet
                              ? theme.colors.background.tertiary
                              : theme.colors.background.secondary,
                          borderRadius: 8,
                          cursor: hasCallSheet ? 'not-allowed' : 'pointer',
                          opacity: hasCallSheet ? 0.6 : 1,
                          border: isSelected
                            ? `2px solid ${theme.colors.accent.primary}`
                            : `1px solid ${theme.colors.border.default}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: isSelected ? '#fff' : theme.colors.text.primary,
                            }}
                          >
                            Day {day.dayNumber}
                          </div>
                          {day.shootDate && (
                            <div
                              style={{
                                fontSize: 12,
                                color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.text.secondary,
                                marginTop: 2,
                              }}
                            >
                              {dayjs(day.shootDate).format('dddd, MMMM D, YYYY')}
                            </div>
                          )}
                          {day.location && (
                            <div
                              style={{
                                fontSize: 12,
                                color: isSelected ? 'rgba(255,255,255,0.7)' : theme.colors.text.tertiary,
                                marginTop: 2,
                              }}
                            >
                              📍 {day.location}
                            </div>
                          )}
                        </div>
                        <div>
                          {hasCallSheet ? (
                            <Tag color="green">Has Call Sheet</Tag>
                          ) : (
                            <Tag color={isSelected ? 'blue' : 'default'}>
                              {(day.strips?.length || 0)} scenes
                            </Tag>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  description="No shoot days in this schedule. Add shoot days first."
                  style={{ padding: 24 }}
                />
              )}
            </div>
          )}

          {/* Selected Summary */}
          {selectedShootDay && (
            <div
              style={{
                padding: 16,
                background: `linear-gradient(135deg, ${theme.colors.accent.primary}15, ${theme.colors.accent.secondary}15)`,
                borderRadius: 8,
                border: `1px solid ${theme.colors.accent.primary}`,
              }}
            >
              <Text strong style={{ color: theme.colors.text.primary }}>
                Creating call sheet for:
              </Text>
              <div style={{ marginTop: 8, color: theme.colors.text.secondary }}>
                <strong>{selectedSchedule?.name}</strong> - Day {selectedShootDay.dayNumber}
                {selectedShootDay.shootDate && (
                  <span> ({dayjs(selectedShootDay.shootDate).format('MMM D, YYYY')})</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
