import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, App, Popconfirm, Dropdown } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined, PlusOutlined, DownOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import { schedulesApi } from '../../services/schedules';
import { getStripColor } from '../../constants/scheduleSpecs';
import type { ScheduleStrip } from '../../types/schedule';

interface Props {
  strip: ScheduleStrip;
  scheduleId?: string;
  isDragging?: boolean;
  onEdit?: (strip: ScheduleStrip) => void;
  onInsertMeal?: (stripId: string) => void;
  onInsertMove?: (stripId: string) => void;
}

export default function ScheduleStripRow({
  strip,
  scheduleId,
  isDragging,
  onEdit,
  onInsertMeal,
  onInsertMove,
}: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

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
          padding: '10px 16px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          cursor: 'grab',
          boxShadow: isSortableDragging ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        }}
        {...attributes}
        {...listeners}
      >
        <HolderOutlined style={{ color: 'rgba(255,255,255,0.5)', marginRight: 16, fontSize: 14 }} />
        <span
          style={{
            flex: 1,
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {bannerIcons[strip.bannerType || 'NOTE']}{' '}
          {strip.bannerText || strip.bannerType?.replace('_', ' ')}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {onEdit && (
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(strip);
              }}
              style={{ color: 'rgba(255,255,255,0.7)' }}
            />
          )}
          <Popconfirm
            title="Delete?"
            onConfirm={() => deleteMutation.mutate()}
            okButtonProps={{ danger: true }}
          >
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

  // Scene strip - full width row with columns
  // Note: Scene strips use industry-standard colors (INT_DAY=white, EXT_DAY=green, etc.)
  // These colors are intentionally hardcoded to match film production standards
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'stretch',
        background: backgroundColor,
        borderBottom: `1px solid ${theme.colors.border.default}`,
        cursor: 'grab',
        boxShadow: isSortableDragging ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        minHeight: 48,
      }}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div
        style={{
          width: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.05)',
          borderRight: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <HolderOutlined style={{ color: 'rgba(0,0,0,0.3)', fontSize: 14 }} />
      </div>

      {/* Scene Number */}
      <div
        style={{
          width: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(0,0,0,0.03)',
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: '#1a1a1a',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          }}
        >
          {strip.sceneNumber || '—'}
        </span>
      </div>

      {/* INT/EXT */}
      <div
        style={{
          width: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          padding: '4px',
        }}
      >
        <span
          style={{
            background:
              strip.intExt === 'EXT'
                ? theme.colors.status.success
                : strip.intExt === 'INT/EXT'
                  ? theme.colors.status.warning
                  : theme.colors.status.info,
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {strip.intExt || 'INT'}
        </span>
      </div>

      {/* DAY/NIGHT */}
      <div
        style={{
          width: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          padding: '4px',
        }}
      >
        <span
          style={{
            background:
              strip.dayNight === 'NIGHT'
                ? '#1e293b'
                : strip.dayNight === 'DAWN'
                  ? '#ea580c'
                  : strip.dayNight === 'DUSK'
                    ? '#db2777'
                    : '#eab308',
            color: strip.dayNight === 'DAY' ? '#1a1a1a' : '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {strip.dayNight || 'DAY'}
        </span>
      </div>

      {/* Description / Set */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#1a1a1a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {strip.sceneName || 'Untitled Scene'}
        </div>
        {strip.description && (
          <div
            style={{
              fontSize: 12,
              color: 'rgba(0,0,0,0.6)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}
          >
            {strip.description}
          </div>
        )}
      </div>

      {/* Location */}
      <div
        style={{
          width: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {strip.location ? (
          <span
            style={{
              fontSize: 12,
              color: 'rgba(0,0,0,0.7)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {strip.location}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>—</span>
        )}
      </div>

      {/* Page Count */}
      <div
        style={{
          width: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(0,0,0,0.03)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
          {strip.pageCount?.toFixed(1) || '0'}
        </span>
      </div>

      {/* Actions */}
      <div
        style={{
          width: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: 'rgba(0,0,0,0.03)',
        }}
      >
        {onEdit && (
          <Button
            size="small"
            type="text"
            icon={<EditOutlined style={{ fontSize: 13 }} />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(strip);
            }}
            style={{ color: 'rgba(0,0,0,0.5)' }}
          />
        )}

        {/* Insert Meal/Move Dropdown */}
        {(onInsertMeal || onInsertMove) && (
          <Dropdown
            menu={{
              items: [
                ...(onInsertMeal
                  ? [
                      {
                        key: 'meal',
                        icon: '🍽️',
                        label: 'Insert Meal Break',
                        onClick: (e) => {
                          e.domEvent.stopPropagation();
                          onInsertMeal(strip.id);
                        },
                      },
                    ]
                  : []),
                ...(onInsertMove
                  ? [
                      {
                        key: 'move',
                        icon: '🚚',
                        label: 'Insert Company Move',
                        onClick: (e) => {
                          e.domEvent.stopPropagation();
                          onInsertMove(strip.id);
                        },
                      },
                    ]
                  : []),
              ],
            }}
            trigger={['click']}
          >
            <Button
              size="small"
              type="text"
              icon={<PlusOutlined style={{ fontSize: 13 }} />}
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'rgba(0,0,0,0.5)' }}
            />
          </Dropdown>
        )}

        <Popconfirm
          title="Delete?"
          onConfirm={() => deleteMutation.mutate()}
          okButtonProps={{ danger: true }}
        >
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined style={{ fontSize: 13 }} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      </div>
    </div>
  );
}
