import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Popconfirm, App, Modal, Form, DatePicker, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { schedulesApi } from '../../services/schedules';
import type { ShootDay, ScheduleStrip } from '../../types/schedule';
import ScheduleStripComponent from './ScheduleStrip';

interface Props {
  day: ShootDay;
  scheduleId: string;
  onAddStrip: () => void;
  onEditStrip?: (strip: ScheduleStrip) => void;
}

export default function ShootDayColumn({ day, scheduleId, onAddStrip, onEditStrip }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form] = Form.useForm();

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.id}`,
    data: { dayId: day.id },
  });

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
  const sceneStrips = (day.strips || []).filter((s) => s.stripType === 'SCENE');
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
        ref={setNodeRef}
        style={{
          width: 420,
          minWidth: 420,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: isOver ? 'rgba(24, 144, 255, 0.08)' : '#1e1e1e',
          borderRadius: 8,
          overflow: 'hidden',
          border: isOver ? '2px solid #1890ff' : '1px solid #333',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Day Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
            padding: '14px 16px',
            borderBottom: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left: Day badge + Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}>
                DAY {day.dayNumber}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {day.shootDate ? (
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    {dayjs(day.shootDate).format('ddd, MMM D, YYYY')}
                  </span>
                ) : (
                  <span style={{ color: '#666', fontSize: 12, fontStyle: 'italic' }}>No date set</span>
                )}
                {day.location && (
                  <span style={{ color: '#888', fontSize: 11 }}>
                    📍 {day.location}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Stats + Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{sceneStrips.length}</div>
                  <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>Scenes</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{totalPages.toFixed(1)}</div>
                  <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>Pages</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  size="small"
                  type="text"
                  icon={<SettingOutlined />}
                  onClick={handleOpenSettings}
                  style={{ color: '#888' }}
                />
                <Popconfirm
                  title="Delete this day?"
                  description="All strips will be deleted."
                  onConfirm={() => deleteMutation.mutate()}
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          </div>
        </div>

        {/* Strips Container */}
        <SortableContext
          items={(day.strips || []).map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            style={{
              flex: 1,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 300,
              overflowY: 'auto',
            }}
          >
            {(day.strips || []).length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#555',
                padding: 40,
                border: '2px dashed #333',
                borderRadius: 8,
                margin: 8,
              }}>
                <div style={{ fontSize: 14, marginBottom: 16 }}>No scenes scheduled for this day</div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onAddStrip}
                >
                  Add First Scene
                </Button>
              </div>
            ) : (
              (day.strips || []).map((strip) => (
                <ScheduleStripComponent
                  key={strip.id}
                  strip={strip}
                  scheduleId={scheduleId}
                  onEdit={onEditStrip}
                />
              ))
            )}
          </div>
        </SortableContext>

        {/* Add Strip Button */}
        {(day.strips || []).length > 0 && (
          <div style={{ padding: '12px', borderTop: '1px solid #333' }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onAddStrip}
              style={{ width: '100%' }}
            >
              Add Scene / Banner
            </Button>
          </div>
        )}
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
            <Input prefix={<EnvironmentOutlined />} placeholder="Main shooting location" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Any notes for this shoot day..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
