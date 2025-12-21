import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Popconfirm, App, Modal, Form, DatePicker, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useTheme } from '../../theme';
import { schedulesApi } from '../../services/schedules';
import type { ShootDay } from '../../types/schedule';

interface Props {
  day: ShootDay;
  scheduleId: string;
  onAddStrip: () => void;
}

export default function DayHeaderRow({ day, scheduleId, onAddStrip }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form] = Form.useForm();

  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.deleteDay(day.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      message.success('Day deleted');
    },
    onError: () => {
      message.error('Failed to delete day');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ShootDay>) => schedulesApi.updateDay(day.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      setSettingsOpen(false);
      message.success('Day updated');
    },
    onError: () => {
      message.error('Failed to update day');
    },
  });

  // Calculate statistics
  const strips = day.strips || [];
  const sceneStrips = strips.filter((s) => s.stripType === 'SCENE');
  const totalPages = sceneStrips.reduce((sum, s) => sum + (s.pageCount || 0), 0);

  const handleOpenSettings = () => {
    form.setFieldsValue({
      shootDate: day.shootDate ? dayjs(day.shootDate) : null,
      location: day.location || '',
      notes: day.notes || '',
    });
    setSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    form.validateFields().then((values) => {
      updateMutation.mutate({
        shootDate: values.shootDate?.toISOString(),
        location: values.location,
        notes: values.notes,
      });
    });
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          background: `linear-gradient(90deg, ${theme.colors.accent.primary} 0%, ${theme.colors.accent.secondary} 100%)`,
          borderBottom: `1px solid ${theme.colors.border.strong}`,
        }}
      >
        {/* Day Badge */}
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 1,
            marginRight: 20,
          }}
        >
          DAY {day.dayNumber}
        </div>

        {/* Date */}
        <div style={{ marginRight: 24 }}>
          {day.shootDate ? (
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
              {dayjs(day.shootDate).format('dddd, MMMM D, YYYY')}
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontStyle: 'italic' }}>
              No date set
            </span>
          )}
        </div>

        {/* Location */}
        {day.location && (
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              marginRight: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📍</span>
            <span>{day.location}</span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, marginRight: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{sceneStrips.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
              Scenes
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{totalPages.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
              Pages
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddStrip}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
            }}
          >
            Add Scene
          </Button>
          <Button
            size="small"
            type="text"
            icon={<SettingOutlined />}
            onClick={handleOpenSettings}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <Popconfirm
            title="Delete this day?"
            description="All strips will be deleted."
            onConfirm={() => deleteMutation.mutate()}
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              style={{ color: 'rgba(255,255,255,0.8)' }}
            />
          </Popconfirm>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        title={`Day ${day.dayNumber} Settings`}
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={handleSaveSettings}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="shootDate" label="Shoot Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="Primary Location">
            <Input placeholder="Main shooting location" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Any notes for this shoot day..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
