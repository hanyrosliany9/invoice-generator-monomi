import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Lead, LeadStage } from '@/services/crm';
import { LeadCard } from './LeadParts';
import { useCrmLabels } from './crmUtils';

const DraggableLead = ({
  lead, stages, onMove,
}: { lead: Lead; stages: LeadStage[]; onMove: (lead: Lead, stage: LeadStage) => void }) => {
  const { t } = useCrmLabels();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t('crm.board.dragHint', '{{name}}. Press space to pick up, arrow keys to move, or use the Move to menu.', { name: lead.name })}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a,button,[role="menuitem"]')) return;
        navigate(`/crm/leads/${lead.id}`);
      }}
      className={cn('cursor-grab touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing', isDragging && 'opacity-40')}
    >
      <LeadCard lead={lead} stages={stages} onMove={(s) => onMove(lead, s)} />
    </div>
  );
};

const Column = ({
  stage, leads, stages, onMove,
}: { stage: LeadStage; leads: Lead[]; stages: LeadStage[]; onMove: (lead: Lead, stage: LeadStage) => void }) => {
  const { stageLabel, t } = useCrmLabels();
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section
      ref={setNodeRef}
      aria-label={stageLabel(stage)}
      className={cn(
        'flex w-[272px] shrink-0 flex-col gap-2.5 rounded-xl border bg-bg-sunken p-3 transition-colors',
        isOver ? 'border-ring/60 bg-bg-raised' : 'border-border-subtle',
      )}
    >
      <header className="flex items-center justify-between px-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
          {stageLabel(stage)}
        </span>
        <span className="font-mono text-xs text-text-tertiary">{leads.length}</span>
      </header>
      <div className="flex min-h-16 flex-col gap-2.5">
        {leads.map((l) => <DraggableLead key={l.id} lead={l} stages={stages} onMove={onMove} />)}
        {leads.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-tertiary">
            {t('crm.board.emptyColumn', 'Drop a lead here')}
          </p>
        )}
      </div>
    </section>
  );
};

/** Kanban board: drag with mouse or touch (press and hold), or use each card's "Move to…" menu. */
export function LeadBoard({
  stages, leads, onMove,
}: { stages: LeadStage[]; leads: Lead[]; onMove: (lead: Lead, stage: LeadStage) => void }) {
  const [active, setActive] = useState<Lead | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => setActive((e.active.data.current?.lead as Lead) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    const lead = e.active.data.current?.lead as Lead | undefined;
    setActive(null);
    const overId = e.over?.id;
    if (!lead || !overId) return;
    const stage = stages.find((s) => s.id === overId);
    if (stage && stage.id !== lead.stageId) onMove(lead, stage);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {stages.map((s) => (
          <Column key={s.id} stage={s} stages={stages} onMove={onMove} leads={leads.filter((l) => l.stageId === s.id)} />
        ))}
      </div>
      <DragOverlay>{active ? <div className="w-[248px]"><LeadCard lead={active} stages={stages} onMove={() => undefined} dragging /></div> : null}</DragOverlay>
    </DndContext>
  );
}
