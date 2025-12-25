import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { App, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import { schedulesApi } from '../../services/schedules';
import type { ShootingSchedule, ScheduleStrip, ShootDay } from '../../types/schedule';
import ScheduleStripRow from './ScheduleStripRow';
import DayHeaderRow from './DayHeaderRow';

interface Props {
  schedule: ShootingSchedule;
  onAddStrip: (dayId: string) => void;
  onEditStrip?: (strip: ScheduleStrip) => void;
  onAddDay?: () => void;
  onInsertMeal?: (stripId: string) => void;
  onInsertMove?: (stripId: string) => void;
}

export default function ScheduleStripboard({
  schedule,
  onAddStrip,
  onEditStrip,
  onAddDay,
  onInsertMeal,
  onInsertMove,
}: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();
  const [activeStrip, setActiveStrip] = useState<ScheduleStrip | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const reorderMutation = useMutation({
    mutationFn: schedulesApi.reorderStrips,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', schedule.id] });
    },
    onError: () => {
      message.error('Failed to reorder');
    },
  });

  const handleDragStart = (event: any) => {
    const { active } = event;
    const shootDays = schedule.shootDays || [];
    const strip = shootDays
      .flatMap((d) => d.strips || [])
      .find((s) => s.id === active.id);
    setActiveStrip(strip || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStrip(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Build reorder request
    const shootDays = schedule.shootDays || [];
    const allStrips = shootDays.flatMap((d) =>
      (d.strips || []).map((s) => ({ stripId: s.id, shootDayId: s.shootDayId, order: s.order }))
    );

    // Find target day and recalculate orders
    const targetDayId = over.data.current?.dayId || active.data.current?.dayId;
    const newOrder = allStrips
      .filter((s) => s.shootDayId === targetDayId)
      .map((s, idx) => ({ ...s, order: idx }));

    if (newOrder.length > 0) {
      reorderMutation.mutate({ strips: newOrder });
    }
  };

  const shootDays = schedule.shootDays || [];

  // Flatten all strips with day info for the sortable context
  const allStripIds = shootDays.flatMap((d) => (d.strips || []).map((s) => s.id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          minHeight: 'calc(100vh - 180px)',
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            background: theme.colors.background.tertiary,
            borderRadius: '8px 8px 0 0',
            borderBottom: `2px solid ${theme.colors.accent.primary}`,
            fontWeight: 600,
            fontSize: 11,
            textTransform: 'uppercase',
            color: theme.colors.text.secondary,
            letterSpacing: 1,
          }}
        >
          <div style={{ width: 40 }}></div>
          <div style={{ width: 80, textAlign: 'center' }}>Scene</div>
          <div style={{ width: 70, textAlign: 'center' }}>I/E</div>
          <div style={{ width: 70, textAlign: 'center' }}>D/N</div>
          <div style={{ flex: 1, paddingLeft: 12 }}>Description / Set</div>
          <div style={{ width: 120, textAlign: 'center' }}>Location</div>
          <div style={{ width: 60, textAlign: 'center' }}>Pages</div>
          <div style={{ width: 80, textAlign: 'center' }}>Actions</div>
        </div>

        {/* Stripboard Content */}
        <SortableContext items={allStripIds} strategy={verticalListSortingStrategy}>
          <div
            style={{
              flex: 1,
              background: theme.colors.background.primary,
              borderRadius: '0 0 8px 8px',
              overflow: 'hidden',
              border: `1px solid ${theme.colors.border.default}`,
              borderTop: 'none',
            }}
          >
            {shootDays.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 60,
                  color: theme.colors.text.tertiary,
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 20 }}>
                  No shoot days scheduled yet
                </div>
                {onAddDay && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={onAddDay}>
                    Add First Shoot Day
                  </Button>
                )}
              </div>
            ) : (
              shootDays.map((day) => (
                <DaySection
                  key={day.id}
                  day={day}
                  scheduleId={schedule.id}
                  onAddStrip={() => onAddStrip(day.id)}
                  onEditStrip={onEditStrip}
                  onInsertMeal={onInsertMeal}
                  onInsertMove={onInsertMove}
                />
              ))
            )}

            {/* Add Day Button at Bottom */}
            {shootDays.length > 0 && onAddDay && (
              <div
                style={{
                  padding: '16px',
                  borderTop: `1px solid ${theme.colors.border.default}`,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Button type="dashed" icon={<PlusOutlined />} onClick={onAddDay}>
                  Add Shoot Day
                </Button>
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      <DragOverlay>
        {activeStrip && (
          <div style={{ opacity: 0.9 }}>
            <ScheduleStripRow strip={activeStrip} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Day section component with header and strips
interface DaySectionProps {
  day: ShootDay;
  scheduleId: string;
  onAddStrip: () => void;
  onEditStrip?: (strip: ScheduleStrip) => void;
  onInsertMeal?: (stripId: string) => void;
  onInsertMove?: (stripId: string) => void;
}

function DaySection({
  day,
  scheduleId,
  onAddStrip,
  onEditStrip,
  onInsertMeal,
  onInsertMove,
}: DaySectionProps) {
  const { theme } = useTheme();
  const strips = day.strips || [];

  return (
    <div>
      {/* Day Header Row */}
      <DayHeaderRow day={day} scheduleId={scheduleId} onAddStrip={onAddStrip} />

      {/* Strips */}
      {strips.length === 0 ? (
        <div
          style={{
            padding: '20px 12px',
            textAlign: 'center',
            color: theme.colors.text.tertiary,
            background: theme.colors.background.secondary,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <span style={{ marginRight: 12 }}>No scenes scheduled</span>
          <Button size="small" type="primary" ghost onClick={onAddStrip}>
            Add Scene
          </Button>
        </div>
      ) : (
        strips.map((strip) => (
          <ScheduleStripRow
            key={strip.id}
            strip={strip}
            scheduleId={scheduleId}
            onEdit={onEditStrip}
            onInsertMeal={onInsertMeal}
            onInsertMove={onInsertMove}
          />
        ))
      )}
    </div>
  );
}
