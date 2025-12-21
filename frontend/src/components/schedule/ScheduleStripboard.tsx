import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { App } from 'antd';
import { schedulesApi } from '../../services/schedules';
import type { ShootingSchedule, ScheduleStrip } from '../../types/schedule';
import ShootDayColumn from './ShootDayColumn';
import ScheduleStripComponent from './ScheduleStrip';

interface Props {
  schedule: ShootingSchedule;
  onAddStrip: (dayId: string) => void;
}

export default function ScheduleStripboard({ schedule, onAddStrip }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [activeStrip, setActiveStrip] = useState<ScheduleStrip | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const reorderMutation = useMutation({
    mutationFn: schedulesApi.reorderStrips,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', schedule.id] });
      message.success('Order updated');
    },
    onError: () => {
      message.error('Failed to reorder');
    },
  });

  const handleDragStart = (event: any) => {
    const { active } = event;
    const strip = schedule.shootDays
      .flatMap((d) => d.strips)
      .find((s) => s.id === active.id);
    setActiveStrip(strip || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStrip(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Build reorder request
    const allStrips = schedule.shootDays.flatMap((d) =>
      d.strips.map((s) => ({ stripId: s.id, shootDayId: s.shootDayId, order: s.order }))
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', minHeight: 400 }}>
        {schedule.shootDays.map((day) => (
          <ShootDayColumn
            key={day.id}
            day={day}
            scheduleId={schedule.id}
            onAddStrip={() => onAddStrip(day.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeStrip && <ScheduleStripComponent strip={activeStrip} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
