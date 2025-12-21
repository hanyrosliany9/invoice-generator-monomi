import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Popconfirm, Button, App } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { schedulesApi } from '../../services/schedules';
import { getStripColor } from '../../constants/scheduleSpecs';
import type { ScheduleStrip } from '../../types/schedule';

const { Text } = Typography;

interface Props {
  strip: ScheduleStrip;
  scheduleId?: string;
  isDragging?: boolean;
}

export default function ScheduleStripComponent({
  strip,
  scheduleId,
  isDragging,
}: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: strip.id,
    data: { dayId: strip.shootDayId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.deleteStrip(strip.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      message.success('Strip deleted');
    },
    onError: () => {
      message.error('Failed to delete strip');
    },
  });

  const backgroundColor = getStripColor(strip);

  if (strip.stripType === 'BANNER') {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          padding: '8px 12px',
          background: backgroundColor,
          color: '#fff',
          borderRadius: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
        }}
        {...attributes}
        {...listeners}
      >
        <Text style={{ color: '#fff' }} strong>
          {strip.bannerText || strip.bannerType}
        </Text>
        <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate()}>
          <Button
            size="small"
            type="text"
            icon={<DeleteOutlined />}
            style={{ color: '#fff' }}
          />
        </Popconfirm>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '8px 12px',
        background: backgroundColor,
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        cursor: 'grab',
      }}
      {...attributes}
      {...listeners}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Text strong>{strip.sceneNumber}</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {strip.intExt} / {strip.dayNight}
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Text type="secondary">{strip.pageCount?.toFixed(1) || '0'}p</Text>
          <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate()}>
            <Button size="small" type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </div>
      </div>
      <Text ellipsis style={{ fontSize: 12 }}>
        {strip.sceneName}
      </Text>
      {strip.location && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
          {strip.location}
        </Text>
      )}
    </div>
  );
}
