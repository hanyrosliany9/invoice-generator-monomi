import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, Typography, Button, Space, Popconfirm, App, Input, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { schedulesApi } from '../../services/schedules';
import type { ShootDay } from '../../types/schedule';
import ScheduleStripComponent from './ScheduleStrip';

const { Text } = Typography;

interface Props {
  day: ShootDay;
  scheduleId: string;
  onAddStrip: () => void;
}

export default function ShootDayColumn({ day, scheduleId, onAddStrip }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] }),
    onError: () => {
      message.error('Failed to update day');
    },
  });

  // Calculate page total
  const totalPages = day.strips
    .filter((s) => s.stripType === 'SCENE')
    .reduce((sum, s) => sum + (s.pageCount || 0), 0);

  return (
    <Card
      ref={setNodeRef}
      style={{
        minWidth: 280,
        maxWidth: 320,
        background: isOver ? '#f0f5ff' : '#fff',
        transition: 'background 0.2s',
      }}
      title={
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text strong>Day {day.dayNumber}</Text>
            <Space size="small">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => setEditing(!editing)}
              />
              <Popconfirm
                title="Delete this day?"
                description="This will delete all strips in this day."
                onConfirm={() => deleteMutation.mutate()}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </Space>
          {day.shootDate && (
            <Text type="secondary">{dayjs(day.shootDate).format('ddd, MMM D')}</Text>
          )}
          <Text type="secondary">{totalPages.toFixed(1)} pages</Text>
        </Space>
      }
      extra={<Button size="small" icon={<PlusOutlined />} onClick={onAddStrip} />}
    >
      {editing && (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
          <DatePicker
            value={day.shootDate ? dayjs(day.shootDate) : null}
            onChange={(date) =>
              updateMutation.mutate({ shootDate: date?.toISOString() })
            }
            style={{ width: '100%' }}
            placeholder="Shoot date"
          />
          <Input
            value={day.location || ''}
            onChange={(e) => updateMutation.mutate({ location: e.target.value })}
            placeholder="Location"
          />
        </Space>
      )}

      <SortableContext
        items={day.strips.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100 }}>
          {day.strips.map((strip) => (
            <ScheduleStripComponent
              key={strip.id}
              strip={strip}
              scheduleId={scheduleId}
            />
          ))}
        </div>
      </SortableContext>
    </Card>
  );
}
