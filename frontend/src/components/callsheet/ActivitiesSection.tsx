import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  TimePicker,
  Switch,
  Popconfirm,
  App,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DragOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import type { CallSheetActivity, CreateActivityDto, ActivityType } from '../../types/callSheet';

interface ActivitiesSectionProps {
  activities: CallSheetActivity[];
  callSheetId: string;
  theme: any;
}

const ACTIVITY_TYPE_OPTIONS: { label: string; value: ActivityType }[] = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Preparation', value: 'PREPARATION' },
  { label: 'Standby', value: 'STANDBY' },
  { label: 'Briefing', value: 'BRIEFING' },
  { label: 'Rehearsal', value: 'REHEARSAL' },
  { label: 'Transport', value: 'TRANSPORT' },
  { label: 'Technical', value: 'TECHNICAL' },
  { label: 'Custom', value: 'CUSTOM' },
];

const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  GENERAL: '#8c8c8c',
  PREPARATION: '#1890ff',
  STANDBY: '#faad14',
  BRIEFING: '#52c41a',
  REHEARSAL: '#722ed1',
  TRANSPORT: '#13c2c2',
  TECHNICAL: '#eb2f96',
  CUSTOM: '#595959',
};

export function ActivitiesSection({ activities, callSheetId, theme }: ActivitiesSectionProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CallSheetActivity | null>(null);
  const [form] = Form.useForm();

  const addMutation = useMutation({
    mutationFn: (dto: CreateActivityDto) => callSheetsApi.addActivity(callSheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Activity added');
      handleCloseModal();
    },
    onError: () => message.error('Failed to add activity'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateActivityDto> }) =>
      callSheetsApi.updateActivity(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Activity updated');
      handleCloseModal();
    },
    onError: () => message.error('Failed to update activity'),
  });

  const deleteMutation = useMutation({
    mutationFn: callSheetsApi.removeActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Activity removed');
    },
    onError: () => message.error('Failed to remove activity'),
  });

  const handleOpenModal = (activity?: CallSheetActivity) => {
    if (activity) {
      setEditingActivity(activity);
      form.setFieldsValue({
        ...activity,
        startTime: activity.startTime ? dayjs(activity.startTime, 'HH:mm') : null,
        endTime: activity.endTime ? dayjs(activity.endTime, 'HH:mm') : null,
      });
    } else {
      setEditingActivity(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingActivity(null);
    form.resetFields();
  };

  // Calculate duration from start and end time
  const calculateDuration = (startTime: any, endTime: any): number | undefined => {
    if (!startTime || !endTime) return undefined;
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    const diffMinutes = end.diff(start, 'minute');
    return diffMinutes > 0 ? diffMinutes : undefined;
  };

  // Watch for time changes to update duration display
  const startTimeValue = Form.useWatch('startTime', form);
  const endTimeValue = Form.useWatch('endTime', form);
  const calculatedDuration = calculateDuration(startTimeValue, endTimeValue);

  const handleSubmit = (values: any) => {
    // Auto-calculate duration from times
    const duration = calculateDuration(values.startTime, values.endTime);

    const dto: CreateActivityDto = {
      activityType: values.activityType || 'GENERAL',
      activityName: values.activityName,
      description: values.description,
      startTime: values.startTime ? values.startTime.format('HH:mm') : '',
      endTime: values.endTime ? values.endTime.format('HH:mm') : undefined,
      duration,
      location: values.location,
      personnel: values.personnel,
      responsibleParty: values.responsibleParty,
      technicalNotes: values.technicalNotes,
      notes: values.notes,
      isHighlighted: values.isHighlighted || false,
    };

    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity.id, dto });
    } else {
      addMutation.mutate(dto);
    }
  };

  const sortedActivities = [...activities].sort((a, b) => {
    // Sort by startTime, then by order
    if (a.startTime && b.startTime) {
      const timeCompare = a.startTime.localeCompare(b.startTime);
      if (timeCompare !== 0) return timeCompare;
    }
    return a.order - b.order;
  });

  return (
    <div>
      {/* Add Button */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          style={{ width: '100%' }}
        >
          Add Activity
        </Button>
      </div>

      {/* Activities List */}
      {sortedActivities.length === 0 ? (
        <Empty
          description="No activities scheduled. Add prep, standby, briefings, etc."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedActivities.map((activity) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                background: activity.isHighlighted
                  ? `${ACTIVITY_TYPE_COLORS[activity.activityType]}15`
                  : theme.colors.background.secondary,
                borderRadius: 8,
                border: `1px solid ${activity.isHighlighted ? ACTIVITY_TYPE_COLORS[activity.activityType] : theme.colors.border.default}`,
                borderLeft: `4px solid ${ACTIVITY_TYPE_COLORS[activity.activityType]}`,
              }}
            >
              {/* Drag Handle */}
              <DragOutlined
                style={{
                  color: theme.colors.text.tertiary,
                  marginRight: 12,
                  cursor: 'grab',
                }}
              />

              {/* Time */}
              <div
                style={{
                  width: 120,
                  fontWeight: 700,
                  fontSize: 14,
                  color: ACTIVITY_TYPE_COLORS[activity.activityType],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClockCircleOutlined style={{ fontSize: 12 }} />
                  {activity.startTime}
                  {activity.endTime && ` - ${activity.endTime}`}
                </div>
                {activity.duration && (
                  <div style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>
                    ({activity.duration} min)
                  </div>
                )}
              </div>

              {/* Activity Name & Type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: theme.colors.text.primary,
                    fontSize: 14,
                  }}
                >
                  {activity.activityName}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${ACTIVITY_TYPE_COLORS[activity.activityType]}20`,
                      color: ACTIVITY_TYPE_COLORS[activity.activityType],
                      textTransform: 'uppercase',
                      fontWeight: 500,
                    }}
                  >
                    {activity.activityType}
                  </span>
                </div>
                {activity.description && (
                  <div
                    style={{
                      fontSize: 12,
                      color: theme.colors.text.secondary,
                      marginTop: 2,
                    }}
                  >
                    {activity.description}
                  </div>
                )}
              </div>

              {/* Location */}
              {activity.location && (
                <div
                  style={{
                    width: 150,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: theme.colors.text.secondary,
                    fontSize: 13,
                  }}
                >
                  <EnvironmentOutlined style={{ fontSize: 12 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activity.location}
                  </span>
                </div>
              )}

              {/* Personnel */}
              {activity.personnel && (
                <div
                  style={{
                    width: 150,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: theme.colors.text.secondary,
                    fontSize: 13,
                  }}
                >
                  <UserOutlined style={{ fontSize: 12 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activity.personnel}
                  </span>
                </div>
              )}

              {/* Actions */}
              <Space size="small">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleOpenModal(activity)}
                />
                <Popconfirm
                  title="Delete this activity?"
                  onConfirm={() => deleteMutation.mutate(activity.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button icon={<DeleteOutlined />} size="small" danger />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingActivity ? 'Edit Activity' : 'Add Activity'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ activityType: 'GENERAL' }}
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="activityType"
              label="Type"
              style={{ width: 150 }}
            >
              <Select options={ACTIVITY_TYPE_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="activityName"
              label="Activity Name"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g., Preparation, Model Standby, Safety Briefing" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Detailed instructions..." />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <Form.Item
              name="startTime"
              label="Start Time"
              rules={[{ required: true, message: 'Required' }]}
              style={{ width: 150 }}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} needConfirm={false} />
            </Form.Item>

            <Form.Item name="endTime" label="End Time" style={{ width: 150 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} needConfirm={false} />
            </Form.Item>

            <div style={{
              width: 120,
              marginBottom: 24,
              padding: '4px 11px',
              background: '#f5f5f5',
              borderRadius: 6,
              border: '1px solid #d9d9d9',
              height: 32,
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{ color: '#666', fontSize: 13 }}>
                {calculatedDuration ? `${calculatedDuration} min` : '— min'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="location" label="Location" style={{ flex: 1 }}>
              <Input placeholder="e.g., At location, Backstage, Studio A" />
            </Form.Item>

            <Form.Item name="personnel" label="Personnel" style={{ flex: 1 }}>
              <Input placeholder="e.g., Model A, Model B, All Crew" />
            </Form.Item>
          </div>

          <Form.Item name="responsibleParty" label="Responsible Party">
            <Input placeholder="Who is in charge of this activity?" />
          </Form.Item>

          <Form.Item name="technicalNotes" label="Technical Notes">
            <Input.TextArea rows={2} placeholder="AV, equipment, setup requirements..." />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>

          <Form.Item name="isHighlighted" label="Highlight" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={addMutation.isPending || updateMutation.isPending}
              >
                {editingActivity ? 'Update' : 'Add'} Activity
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
