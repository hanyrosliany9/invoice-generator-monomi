/* ------------------------------------------------------------------ */
/*  Small shared pieces of the staff content planner: thumbnail, kind   */
/*  and overdue badges, the bulk-action bar and its dialogs, and the    */
/*  "mark as published" dialog.                                         */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, CalendarClock, Film, FileImage, Layers, Loader2, Rocket,
  SquareStack, Square, CircleDashed, Trash2, X, Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import type { ContentCalendarItem } from '@/services/content-calendar';
import { cn } from '@/lib/utils';
import {
  WIB_LABEL, combineWib, isPastWib, wibCalendarDate, wibTime,
} from '@/utils/wib';
import { formatKind, isOverdue, useContentThumb } from './contentPlannerUtils';

/* ----- thumbnail ----- */

export function ContentThumb({
  item, className, showCount = false,
}: { item: ContentCalendarItem; className?: string; showCount?: boolean }) {
  const resolve = useContentThumb();
  const thumb = resolve(item);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [thumb?.url]);
  if (!thumb) return null;
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-bg-sunken text-text-tertiary',
        className,
      )}
      data-testid="content-thumb"
    >
      {thumb.url && !broken ? (
        <img
          src={thumb.url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : thumb.isVideo ? (
        <Video className="h-3.5 w-3.5" />
      ) : (
        <FileImage className="h-3.5 w-3.5" />
      )}
      {thumb.isVideo && thumb.url && !broken && (
        <Video className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-white drop-shadow" />
      )}
      {showCount && thumb.count > 1 && (
        <span className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] leading-tight text-white tabular-nums">
          {thumb.count}
        </span>
      )}
    </span>
  );
}

/* ----- badges ----- */

const KIND_ICON = {
  POST: Square,
  CAROUSEL: SquareStack,
  REEL: Film,
  STORY: CircleDashed,
} as const;

export function KindBadge({
  item, className, compact = false,
}: { item: Pick<ContentCalendarItem, 'format' | 'media'>; className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const kind = formatKind(item);
  const Icon = KIND_ICON[kind];
  const label = {
    POST: t('content.planner.kind.post', 'Post'),
    CAROUSEL: t('content.planner.kind.carousel', 'Carousel'),
    REEL: t('content.planner.kind.reel', 'Reel'),
    STORY: t('content.planner.kind.story', 'Story'),
  }[kind];
  return (
    <Badge
      variant="outline"
      title={label}
      className={cn(
        'border-border-subtle bg-bg-sunken/60 text-text-tertiary text-[10px] px-1.5 py-0 gap-1 font-normal',
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {!compact && label}
    </Badge>
  );
}

export function OverdueBadge({
  item, className, compact = false,
}: { item: ContentCalendarItem; className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  if (!isOverdue(item)) return null;
  const label = t('content.planner.overdue', 'Terlambat');
  return (
    <Badge
      variant="outline"
      title={t('content.planner.overdueHint', 'Jadwal sudah lewat. Tandai terbit atau jadwalkan ulang.')}
      className={cn(
        'border-transparent bg-danger/10 text-danger text-[10px] px-1.5 py-0 gap-1 font-medium',
        className,
      )}
      data-testid="overdue-badge"
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {!compact && label}
    </Badge>
  );
}

/* ----- bulk bar ----- */

export type BulkStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export function BulkBar({
  count, total, busy, onClear, onSelectAll, onStatus, onShift, onDelete,
}: {
  count: number;
  total: number;
  busy: boolean;
  onClear: () => void;
  onSelectAll: () => void;
  onStatus: (s: BulkStatus) => void;
  onShift: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const statuses: { s: BulkStatus; label: string }[] = [
    { s: 'DRAFT', label: t('calendar.contentCalendar.statusDraft', 'Draft') },
    { s: 'SCHEDULED', label: t('calendar.contentCalendar.statusScheduled', 'Scheduled') },
    { s: 'PUBLISHED', label: t('calendar.contentCalendar.statusPublished', 'Published') },
    { s: 'ARCHIVED', label: t('calendar.contentCalendar.statusArchived', 'Archived') },
  ];
  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border-subtle bg-accent-navy-wash px-4 py-2.5 backdrop-blur"
      data-testid="bulk-bar"
    >
      <span className="text-sm font-medium text-text-primary tabular-nums">
        {t('content.planner.bulk.selected', '{{n}} dipilih', { n: count })}
      </span>
      {count < total && (
        <button type="button" onClick={onSelectAll} className="text-xs text-text-primary hover:underline">
          {t('content.planner.bulk.selectAll', 'Pilih semua ({{n}})', { n: total })}
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy}>
              <Layers className="h-3.5 w-3.5" />
              {t('content.planner.bulk.setStatus', 'Ubah status')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statuses.map((o) => (
              <DropdownMenuItem key={o.s} onClick={() => onStatus(o.s)}>{o.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" disabled={busy} onClick={onShift}>
          <CalendarClock className="h-3.5 w-3.5" />
          {t('content.planner.bulk.shift', 'Geser jadwal')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onDelete}
          className="text-danger hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('common.delete', 'Delete')}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label={t('content.planner.bulk.clear', 'Batal pilih')}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ShiftDialog({
  open, count, busy, onOpenChange, onConfirm,
}: {
  open: boolean;
  count: number;
  busy: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (days: number) => void;
}) {
  const { t } = useTranslation();
  const [days, setDays] = useState(1);
  useEffect(() => { if (open) setDays(1); }, [open]);
  const valid = Number.isInteger(days) && days !== 0 && Math.abs(days) <= 365;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            {t('content.planner.bulk.shiftTitle', 'Geser jadwal {{n}} konten', { n: count })}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            {t('content.planner.bulk.shiftDesc', 'Jam tayang (WIB) tetap sama. Angka negatif memajukan jadwal. Konten tanpa jadwal dilewati.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={Number.isNaN(days) ? '' : days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              min={-365}
              max={365}
              className="w-24 bg-bg-sunken border-border-subtle tabular-nums"
              aria-label={t('content.planner.bulk.days', 'Hari')}
            />
            <span className="text-sm text-text-secondary">{t('content.planner.bulk.days', 'hari')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[-7, -1, 1, 3, 7, 14].map((d) => (
              <Button key={d} type="button" variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
                {d > 0 ? `+${d}` : d}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button size="sm" disabled={!valid || busy} onClick={() => onConfirm(days)}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('content.planner.bulk.apply', 'Terapkan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkDeleteDialog({
  open, count, busy, onOpenChange, onConfirm,
}: {
  open: boolean;
  count: number;
  busy: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            {t('content.planner.bulk.deleteTitle', 'Hapus {{n}} konten?', { n: count })}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            {t('content.planner.bulk.deleteDesc', 'Tindakan ini tidak dapat dibatalkan. File media yang masih dipakai konten lain tidak ikut terhapus.')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('common.delete', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----- mark as published ----- */

export function PublishDialog({
  item, busy, onOpenChange, onConfirm,
}: {
  item: ContentCalendarItem | null;
  busy: boolean;
  onOpenChange: (v: boolean) => void;
  /** ISO instant of the real post time. */
  onConfirm: (publishedAtIso: string) => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    if (!item) return;
    // Real post time: the scheduled time when it already passed, else now.
    const sched = item.scheduledAt ? new Date(item.scheduledAt) : null;
    const base = sched && sched.getTime() < Date.now() ? sched : new Date();
    setDate(wibCalendarDate(base));
    setTime(wibTime(base));
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const future = !!date && !isPastWib(date, time, new Date(Date.now() + 5 * 60 * 1000));
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            {t('content.planner.publish.title', 'Tandai sudah terbit')}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            {t('content.planner.publish.desc', 'Kapan konten ini benar-benar tayang? Tanggal ini dipakai di kalender dan laporan.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
          <MonomiDatePicker value={date} onChange={setDate} />
          <div className="relative">
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-bg-sunken border-border-subtle pr-12"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-tertiary">
              {WIB_LABEL}
            </span>
          </div>
        </div>
        {future && (
          <p className="text-xs text-danger">
            {t('content.planner.publish.future', 'Waktu terbit tidak boleh di masa depan.')}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button
            size="sm"
            disabled={!date || future || busy}
            onClick={() => date && onConfirm(combineWib(date, time))}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('content.planner.publish.confirm', 'Tandai terbit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
