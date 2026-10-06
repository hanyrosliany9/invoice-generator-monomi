import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Check, MessageCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Lead, LeadStage } from '@/services/crm';
import { displayPhone, idr, sourceTone, toNumber, useCrmLabels } from './crmUtils';
import { getInitials } from '@/utils/initials';

export const StageBadge = ({ stage, className }: { stage: LeadStage; className?: string }) => {
  const { stageLabel } = useCrmLabels();
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-text-primary', className)}>
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
      {stageLabel(stage)}
    </span>
  );
};

export const SourceBadge = ({ source, className }: { source: Lead['source']; className?: string }) => {
  const { sourceLabel } = useCrmLabels();
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', sourceTone(source), className)}>
      {sourceLabel(source)}
    </span>
  );
};

export const CodeBadge = ({ code }: { code: string }) => (
  <span className="inline-flex items-center rounded-md bg-bg-sunken px-2 py-0.5 font-mono text-[11px] text-text-secondary">{code}</span>
);

/** Amber pill "22 min" for unanswered leads, quiet text otherwise. */
export const WaitPill = ({ lead }: { lead: Lead }) => {
  const { formatWait, t } = useCrmLabels();
  if (lead.waitingMinutes === null) return null;
  return (
    <span
      title={lead.isUncontacted ? t('crm.lead.unansweredTitle', 'Waiting for a first reply') : undefined}
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
        lead.isUncontacted ? 'bg-warning/15 text-warning' : 'text-text-tertiary',
      )}
    >
      {formatWait(lead.waitingMinutes)}
    </span>
  );
};

/** Dropdown listing every stage: the keyboard / screen-reader alternative to dragging. */
export const MoveStageMenu = ({
  stages, currentStageId, onMove, trigger, align = 'end',
}: {
  stages: LeadStage[];
  currentStageId: string;
  onMove: (stage: LeadStage) => void;
  trigger: ReactNode;
  align?: 'start' | 'end';
}) => {
  const { t, stageLabel } = useCrmLabels();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-48 bg-bg-raised border-border-subtle text-text-primary">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          {t('crm.lead.moveTo', 'Move to…')}
        </DropdownMenuLabel>
        {stages.map((s) => (
          <DropdownMenuItem
            key={s.id}
            disabled={s.id === currentStageId}
            onSelect={() => onMove(s)}
            className="cursor-pointer gap-2 focus:bg-bg-sunken"
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="flex-1">{stageLabel(s)}</span>
            {s.id === currentStageId && <Check className="h-3.5 w-3.5 text-text-tertiary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const MoveButton = forwardRef<HTMLButtonElement, { label: string } & ComponentProps<'button'>>(
  ({ label, ...props }, ref) => (
    <Button ref={ref} type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} className="shrink-0 text-text-tertiary" {...props}>
      <ArrowRightLeft />
    </Button>
  ),
);
MoveButton.displayName = 'MoveButton';

/** Lead card shared by the desktop board and the mobile list. */
export const LeadCard = ({
  lead, stages, onMove, dragging = false, compact = false,
}: {
  lead: Lead;
  stages: LeadStage[];
  onMove: (stage: LeadStage) => void;
  dragging?: boolean;
  compact?: boolean;
}) => {
  const { t, formatDateTime } = useCrmLabels();
  const value = toNumber(lead.estimatedValue);
  const followUpOverdue = lead.followUpAt && new Date(lead.followUpAt).getTime() < Date.now();
  return (
    <article
      className={cn(
        'group rounded-lg border bg-bg-raised p-3 text-left transition-colors',
        lead.isUncontacted ? 'border-warning/50' : 'border-border-subtle hover:border-border-default',
        dragging && 'shadow-2xl ring-2 ring-ring/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/crm/leads/${lead.id}`}
          className="min-w-0 truncate text-sm font-semibold text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {lead.name}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <WaitPill lead={lead} />
          <div onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <MoveStageMenu
              stages={stages}
              currentStageId={lead.stageId}
              onMove={onMove}
              trigger={<MoveButton label={t('crm.lead.moveTo', 'Move to…')} />}
            />
          </div>
        </div>
      </div>
      {lead.phone && <div className="mt-1 font-mono text-xs text-text-secondary">{displayPhone(lead.phone)}</div>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <SourceBadge source={lead.source} />
        {lead.campaignCode && <CodeBadge code={lead.campaignCode} />}
      </div>
      {!compact && lead.firstMessage && (
        <p className="mt-2 line-clamp-2 text-xs text-text-tertiary">“{lead.firstMessage}”</p>
      )}
      {(value > 0 || lead.followUpAt || lead.assignedTo) && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 truncate">
            {lead.followUpAt ? (
              <span className={cn('inline-flex items-center gap-1', followUpOverdue ? 'text-warning' : 'text-text-secondary')}>
                <MessageCircle className="h-3 w-3" />
                {formatDateTime(lead.followUpAt)}
              </span>
            ) : value > 0 ? (
              <span className="font-mono text-text-secondary">{idr(value)}</span>
            ) : null}
          </div>
          {lead.assignedTo && (
            <span
              title={lead.assignedTo.name}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-sunken text-[10px] font-medium text-text-secondary"
            >
              {getInitials(lead.assignedTo.name)}
            </span>
          )}
        </div>
      )}
    </article>
  );
};

const LOST_PRESETS: Array<[string, string]> = [
  ['crm.lost.expensive', 'Too expensive'],
  ['crm.lost.noResponse', 'No response'],
  ['crm.lost.competitor', 'Chose a competitor'],
  ['crm.lost.notFit', 'Not a fit'],
];

/** Asks for the reason before a lead is marked lost. */
export const LostDialog = ({
  open, leadName, busy, onCancel, onConfirm,
}: {
  open: boolean;
  leadName?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) => {
  const { t } = useCrmLabels();
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(''); onCancel(); } }}>
      <DialogContent className="max-w-md" srTitle={t('crm.lost.title', 'Mark as lost')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-danger" />{t('crm.lost.title', 'Mark as lost')}</DialogTitle>
          <DialogDescription>
            {t('crm.lost.desc', 'Why did {{name}} not continue? This helps you see where deals drop off.', { name: leadName ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {LOST_PRESETS.map(([k, fb]) => (
            <button
              key={k}
              type="button"
              onClick={() => setReason(t(k, fb))}
              className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary hover:border-border-default hover:text-text-primary"
            >
              {t(k, fb)}
            </button>
          ))}
        </div>
        <Input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          placeholder={t('crm.lost.placeholder', 'Reason')}
          aria-label={t('crm.lost.placeholder', 'Reason')}
          onKeyDown={(e) => { if (e.key === 'Enter' && reason.trim()) onConfirm(reason.trim()); }}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => { setReason(''); onCancel(); }}>{t('crm.common.cancel', 'Cancel')}</Button>
          <Button type="button" variant="destructive" disabled={!reason.trim() || busy} onClick={() => onConfirm(reason.trim())}>
            {t('crm.lost.confirm', 'Mark as lost')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
