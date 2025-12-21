import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, App, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, MenuOutlined } from '@ant-design/icons';
import { schedulesApi } from '../../services/schedules';
import { getStripColor } from '../../constants/scheduleSpecs';
import type { ScheduleStrip } from '../../types/schedule';

interface Props {
  strip: ScheduleStrip;
  scheduleId?: string;
  isDragging?: boolean;
  onEdit?: (strip: ScheduleStrip) => void;
}

export default function ScheduleStripComponent({
  strip,
  scheduleId,
  isDragging,
  onEdit,
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
  const isBanner = strip.stripType === 'BANNER';

  // Banner strip - full width colored bar
  if (isBanner) {
    const bannerIcons: Record<string, string> = {
      DAY_BREAK: '🌙',
      MEAL_BREAK: '🍽️',
      COMPANY_MOVE: '🚚',
      NOTE: '📝',
    };

    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          background: backgroundColor,
          borderRadius: 4,
          padding: '10px 12px',
          marginBottom: 2,
          cursor: 'grab',
          boxShadow: isSortableDragging ? '0 8px 20px rgba(0,0,0,0.4)' : 'none',
        }}
        {...attributes}
        {...listeners}
      >
        <MenuOutlined style={{ color: 'rgba(255,255,255,0.5)', marginRight: 12 }} />
        <span style={{
          flex: 1,
          color: '#fff',
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {bannerIcons[strip.bannerType || 'NOTE']} {strip.bannerText || strip.bannerType?.replace('_', ' ')}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {onEdit && (
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); onEdit(strip); }}
              style={{ color: 'rgba(255,255,255,0.7)' }}
            />
          )}
          <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate()} okButtonProps={{ danger: true }}>
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'rgba(255,255,255,0.7)' }}
            />
          </Popconfirm>
        </div>
      </div>
    );
  }

  // Scene strip - table-like row with columns
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'stretch',
        background: backgroundColor,
        borderRadius: 4,
        marginBottom: 2,
        cursor: 'grab',
        boxShadow: isSortableDragging ? '0 8px 20px rgba(0,0,0,0.4)' : 'none',
        border: '1px solid rgba(0,0,0,0.1)',
        minHeight: 52,
      }}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle + Scene Number */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        minWidth: 80,
        background: 'rgba(0,0,0,0.05)',
      }}>
        <MenuOutlined style={{ color: 'rgba(0,0,0,0.3)', marginRight: 8, fontSize: 12 }} />
        <span style={{
          fontWeight: 700,
          fontSize: 16,
          color: '#1a1a1a',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {strip.sceneNumber || '—'}
        </span>
      </div>

      {/* INT/EXT + DAY/NIGHT */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4px 10px',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        minWidth: 70,
        gap: 2,
      }}>
        <span style={{
          background: strip.intExt === 'EXT' ? '#16a34a' : strip.intExt === 'INT/EXT' ? '#ca8a04' : '#2563eb',
          color: '#fff',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          textAlign: 'center',
        }}>
          {strip.intExt || 'INT'}
        </span>
        <span style={{
          background: strip.dayNight === 'NIGHT' ? '#1e293b' : strip.dayNight === 'DAWN' ? '#ea580c' : strip.dayNight === 'DUSK' ? '#db2777' : '#eab308',
          color: strip.dayNight === 'DAY' ? '#1a1a1a' : '#fff',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          textAlign: 'center',
        }}>
          {strip.dayNight || 'DAY'}
        </span>
      </div>

      {/* Scene Description + Location */}
      <div style={{
        flex: 1,
        padding: '6px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#1a1a1a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {strip.sceneName || 'Untitled Scene'}
        </div>
        {strip.location && (
          <div style={{
            fontSize: 11,
            color: 'rgba(0,0,0,0.6)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 2,
          }}>
            📍 {strip.location}
          </div>
        )}
      </div>

      {/* Page Count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
        minWidth: 60,
        background: 'rgba(0,0,0,0.03)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
            {strip.pageCount?.toFixed(1) || '0'}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase' }}>
            pages
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
        background: 'rgba(0,0,0,0.03)',
        gap: 2,
      }}>
        {onEdit && (
          <Button
            size="small"
            type="text"
            icon={<EditOutlined style={{ fontSize: 12 }} />}
            onClick={(e) => { e.stopPropagation(); onEdit(strip); }}
            style={{ color: 'rgba(0,0,0,0.5)' }}
          />
        )}
        <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate()} okButtonProps={{ danger: true }}>
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined style={{ fontSize: 12 }} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      </div>
    </div>
  );
}
