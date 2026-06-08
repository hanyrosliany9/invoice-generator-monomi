import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Save, Trash2, Loader2, CalendarRange, Download,
  ChevronUp, ChevronDown, Wand2, Utensils, Truck, Pencil,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/store/auth';
import {
  schedulesApi, shootDaysApi, stripsApi,
  type Schedule, type ShootDay, type ScheduleStrip,
  type AutoScheduleGroupBy,
} from '@/services/schedules';

/* ------------------------------------------------------------------ */
/*  Meta form                                                          */
/* ------------------------------------------------------------------ */

const metaSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  startDate:   z.string().optional(),
  pagesPerDay: z.coerce.number().positive().optional(),
});
type MetaValues = z.infer<typeof metaSchema>;

const INT_EXT = ['INT', 'EXT', 'INT/EXT'];
const DAY_NIGHT = ['DAY', 'NIGHT', 'DAWN', 'DUSK'];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ScheduleEditorPageV2() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from');

  const { data: schedule, isLoading, error, refetch } = useQuery({
    queryKey: ['schedule', id],
    queryFn:  () => schedulesApi.getById(id!),
    enabled:  !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['schedule', id] });
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
  };

  /* ---------- meta form ---------- */
  const defaultMeta = useMemo<MetaValues>(() => ({
    name:        schedule?.name ?? '',
    description: schedule?.description ?? '',
    startDate:   schedule?.startDate ? schedule.startDate.slice(0, 10) : '',
    pagesPerDay: schedule?.pagesPerDay ?? 5,
  }), [schedule]);

  const {
    register, handleSubmit, reset, formState: { errors, isDirty },
  } = useForm<MetaValues>({ resolver: zodResolver(metaSchema), defaultValues: defaultMeta });

  useEffect(() => { reset(defaultMeta); }, [defaultMeta, reset]);

  const saveMeta = useMutation({
    mutationFn: (values: MetaValues) => schedulesApi.update(id!, {
      name:        values.name,
      description: values.description || undefined,
      startDate:   values.startDate ? new Date(values.startDate).toISOString() : undefined,
      pagesPerDay: values.pagesPerDay,
    }),
    onSuccess: () => { invalidate(); toast.success(t('scheduleEditor.metaSaved', 'Schedule details saved')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.metaSaveFailed', 'Failed to save details')),
  });

  /* ---------- shoot day mutations ---------- */
  const addDay = useMutation({
    mutationFn: () => shootDaysApi.create({
      scheduleId: id!,
      dayNumber: (schedule?.shootDays?.length ?? 0) + 1,
      order: schedule?.shootDays?.length ?? 0,
    }),
    onSuccess: () => { invalidate(); toast.success(t('scheduleEditor.dayAdded', 'Shoot day added')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.dayAddFailed', 'Failed to add shoot day')),
  });

  const deleteDay = useMutation({
    mutationFn: (dayId: string) => shootDaysApi.delete(dayId),
    onSuccess: () => { invalidate(); toast.success(t('scheduleEditor.dayDeleted', 'Shoot day deleted')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.dayDeleteFailed', 'Failed to delete shoot day')),
  });

  /* ---------- auto-schedule ---------- */
  const [autoBy, setAutoBy] = useState<AutoScheduleGroupBy>('location');
  const autoSchedule = useMutation({
    mutationFn: () => schedulesApi.autoSchedule(id!, autoBy),
    onSuccess: () => { invalidate(); toast.success(t('scheduleEditor.autoScheduled', 'Scenes redistributed across shoot days')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.autoScheduleFailed', 'Auto-schedule failed')),
  });

  /* ---------- PDF ---------- */
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await schedulesApi.generatePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-${schedule?.name ?? id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('scheduleEditor.pdfDownloaded', 'PDF downloaded'));
    } catch {
      toast.error(t('scheduleEditor.pdfFailed', 'Failed to generate PDF'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /* ---------- back navigation ---------- */
  const backProjectId = schedule?.project?.id ?? schedule?.projectId;
  const safeFrom = fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//') ? fromParam : null;
  const backTarget = safeFrom || (backProjectId ? `/projects/${backProjectId}` : '/schedules');
  const backIsProject = backTarget.startsWith('/projects/');
  const backLabel = backIsProject
    ? t('scheduleEditor.backToProject', 'Back to Project')
    : t('scheduleEditor.backToSchedules', 'Back to Schedules');
  const confirmLeave = () =>
    !isDirty || window.confirm(t('common.confirmDiscard', 'You have unsaved changes. Leave without saving?'));
  const handleBack = () => { if (confirmLeave()) navigate(backTarget); };

  /* ---------- unsaved-changes guard (meta only) ---------- */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* ---------- loading / error ---------- */
  if (isLoading) {
    return (
      <Shell user={user}>
        <PageContainer>
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
          <Skeleton className="h-40 rounded-lg mb-4" />
          <Skeleton className="h-64 rounded-lg" />
        </PageContainer>
      </Shell>
    );
  }

  if (error || !schedule) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<CalendarRange className="h-12 w-12" />}
            title={t('scheduleEditor.notFoundTitle', 'Schedule not found')}
            description={
              error instanceof Error
                ? error.message
                : t('scheduleEditor.notFoundDesc', 'This schedule may have been deleted or you don\'t have access.')
            }
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
                <Button size="sm" onClick={() => refetch()}>{t('schedules.retry', 'Try Again')}</Button>
              </div>
            }
          />
        </PageContainer>
      </Shell>
    );
  }

  const shootDays = (schedule.shootDays ?? []).slice().sort((a, b) => a.order - b.order);
  const totalScenes = shootDays.reduce(
    (sum, d) => sum + (d.strips?.filter((s) => s.stripType === 'SCENE').length ?? 0), 0);
  const totalPages = shootDays.reduce(
    (sum, d) => sum + (d.strips?.filter((s) => s.stripType === 'SCENE')
      .reduce((p, s) => p + (s.pageCount ?? 0), 0) ?? 0), 0);
  const isAnyPending = saveMeta.isPending || addDay.isPending || autoSchedule.isPending;

  /* ---------- render ---------- */
  return (
    <Shell user={user}>
      <PageContainer>
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </button>
        </div>

        <PageHeader
          title={schedule.name}
          description={t('scheduleEditor.description', 'Organize scenes into shoot days. Reorder strips, add meal breaks and company moves, or auto-schedule from a shot list.')}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="border-border-subtle text-text-secondary hover:text-text-primary"
            >
              {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('scheduleEditor.downloadPdf', 'Download PDF')}
            </Button>
          }
        />

        {/* stat strip */}
        <div className="flex flex-wrap gap-3 mb-6">
          <StatChip label={t('scheduleEditor.statDays', 'Shoot Days')} value={shootDays.length} />
          <StatChip label={t('scheduleEditor.statScenes', 'Scenes')} value={totalScenes} />
          <StatChip label={t('scheduleEditor.statPages', 'Pages')} value={totalPages.toFixed(1)} />
        </div>

        {/* ─────────────────────────── Meta ─────────────────────────── */}
        <form onSubmit={handleSubmit((v) => saveMeta.mutate(v))} className="mb-6">
          <FormSection
            eyebrow={t('scheduleEditor.eyebrowIdentity', 'Identity')}
            title={t('scheduleEditor.detailSectionTitle', 'Schedule Details')}
            description={t('scheduleEditor.detailSectionDesc', 'Name, dates, and the page target used by auto-schedule.')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>{t('scheduleEditor.fieldName', 'Name')}</FieldLabel>
                <Input
                  {...register('name')}
                  className="bg-bg-sunken border-border-default text-text-primary"
                  aria-invalid={!!errors.name}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>{t('scheduleEditor.fieldDescription', 'Description')}</FieldLabel>
                <textarea
                  rows={2}
                  {...register('description')}
                  placeholder={t('scheduleEditor.descriptionPlaceholder', 'Brief context (optional)')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldStartDate', 'Start Date')}</FieldLabel>
                <Input type="date" {...register('startDate')} className="bg-bg-sunken border-border-default text-text-primary" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldPagesPerDay', 'Pages / Day')}</FieldLabel>
                <Input
                  type="number" min="0" step="0.5"
                  {...register('pagesPerDay', { valueAsNumber: true })}
                  className="bg-bg-sunken border-border-default text-text-primary text-right font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" size="sm" disabled={saveMeta.isPending || !isDirty}>
                {saveMeta.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('common.save', 'Save')}
              </Button>
              <span className="text-[11px] text-text-tertiary">
                {isDirty ? t('common.unsavedChanges', 'You have unsaved changes.') : t('common.noPendingChanges', 'No pending changes.')}
              </span>
            </div>
          </FormSection>
        </form>

        {/* ───────────────────── Auto-schedule ───────────────────── */}
        <GlassPanel surface="glass" padding="lg" className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('scheduleEditor.eyebrowAuto', 'Automation')}
              </div>
              <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">
                {t('scheduleEditor.autoTitle', 'Auto-schedule')}
              </h2>
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">
                {t('scheduleEditor.autoDesc', 'Group existing scene strips by a field and pack them across shoot days up to the pages-per-day target. Add shoot days first; scenes only fill the days you create.')}
              </p>
            </div>
            <div className="flex items-end gap-2 shrink-0">
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.groupBy', 'Group By')}</FieldLabel>
                <Select value={autoBy} onValueChange={(v) => setAutoBy(v as AutoScheduleGroupBy)}>
                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="location">{t('scheduleEditor.groupLocation', 'Location')}</SelectItem>
                    <SelectItem value="intExt">{t('scheduleEditor.groupIntExt', 'INT / EXT')}</SelectItem>
                    <SelectItem value="dayNight">{t('scheduleEditor.groupDayNight', 'Day / Night')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => autoSchedule.mutate()}
                disabled={autoSchedule.isPending || shootDays.length === 0}
              >
                {autoSchedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {t('scheduleEditor.runAuto', 'Auto-schedule')}
              </Button>
            </div>
          </div>
        </GlassPanel>

        {/* ───────────────────── Shoot days ───────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-medium text-text-primary tracking-tight">
            {t('scheduleEditor.daysTitle', 'Shoot Days')}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addDay.mutate()}
            disabled={isAnyPending}
            className="border-border-subtle text-text-secondary hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('scheduleEditor.addDay', 'Add Shoot Day')}
          </Button>
        </div>

        {shootDays.length === 0 ? (
          <GlassPanel surface="glass" padding="lg">
            <div className="rounded-md border border-dashed border-border-subtle bg-bg-sunken/40 py-10 text-center">
              <p className="text-sm text-text-tertiary">
                {t('scheduleEditor.noDays', 'No shoot days yet. Add a day to start placing scenes.')}
              </p>
            </div>
          </GlassPanel>
        ) : (
          <div className="space-y-4">
            {shootDays.map((day) => (
              <ShootDayCard
                key={day.id}
                day={day}
                onChanged={invalidate}
                onDelete={() => {
                  if (confirm(t('scheduleEditor.confirmDeleteDay', 'Delete Day {{n}}? All its strips will be removed.', { n: day.dayNumber }))) {
                    deleteDay.mutate(day.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </Shell>
  );
}

/* ================================================================== */
/*  Shoot Day card                                                     */
/* ================================================================== */

function ShootDayCard({
  day, onChanged, onDelete,
}: {
  day: ShootDay;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState(false);
  const [stripDialog, setStripDialog] = useState<{ mode: 'create' | 'edit'; strip?: ScheduleStrip } | null>(null);
  const [bannerDialog, setBannerDialog] = useState<{ kind: 'meal' | 'move'; afterStripId: string } | null>(null);

  const strips = (day.strips ?? []).slice().sort((a, b) => a.order - b.order);
  const sceneStrips = strips.filter((s) => s.stripType === 'SCENE');
  const dayPages = sceneStrips.reduce((p, s) => p + (s.pageCount ?? 0), 0);

  const refresh = () => onChanged();

  /* ----- day meta inline edit ----- */
  const { register, handleSubmit, reset } = useForm<{ dayNumber: number; shootDate?: string; location?: string; notes?: string }>({
    defaultValues: {
      dayNumber: day.dayNumber,
      shootDate: day.shootDate ? day.shootDate.slice(0, 10) : '',
      location: day.location ?? '',
      notes: day.notes ?? '',
    },
  });
  useEffect(() => {
    reset({
      dayNumber: day.dayNumber,
      shootDate: day.shootDate ? day.shootDate.slice(0, 10) : '',
      location: day.location ?? '',
      notes: day.notes ?? '',
    });
  }, [day, reset]);

  const saveDay = useMutation({
    mutationFn: (v: { dayNumber: number; shootDate?: string; location?: string; notes?: string }) =>
      shootDaysApi.update(day.id, {
        dayNumber: Number(v.dayNumber),
        shootDate: v.shootDate ? new Date(v.shootDate).toISOString() : undefined,
        location: v.location || undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: () => { refresh(); setEditingDay(false); toast.success(t('scheduleEditor.daySaved', 'Shoot day saved')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.dayAddFailed', 'Failed to add shoot day')),
  });

  /* ----- strip mutations ----- */
  const deleteStrip = useMutation({
    mutationFn: (stripId: string) => stripsApi.delete(stripId),
    onSuccess: () => { refresh(); toast.success(t('scheduleEditor.stripDeleted', 'Strip deleted')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.stripDeleteFailed', 'Failed to delete strip')),
  });

  const reorder = useMutation({
    mutationFn: (next: ScheduleStrip[]) =>
      stripsApi.reorder(next.map((s, i) => ({ stripId: s.id, shootDayId: day.id, order: i }))),
    onSuccess: () => refresh(),
    onError: (e: Error) => {
      toast.error(e.message || t('scheduleEditor.reorderFailed', 'Failed to reorder strips'));
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const moveStrip = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= strips.length) return;
    const next = strips.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    reorder.mutate(next);
  };

  return (
    <GlassPanel surface="glass" padding="none" className="overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-subtle bg-bg-sunken/40">
        <div className="min-w-0 flex items-center gap-3">
          <span className="shrink-0 rounded-md bg-bg-raised border border-border-subtle px-2.5 py-1 text-xs font-medium tracking-wide text-text-primary">
            {t('scheduleEditor.dayLabel', 'DAY {{n}}', { n: day.dayNumber })}
          </span>
          <div className="min-w-0">
            <div className="text-sm text-text-primary truncate">
              {day.shootDate ? new Date(day.shootDate).toLocaleDateString() : t('scheduleEditor.noDate', 'No date set')}
            </div>
            {day.location && <div className="text-xs text-text-tertiary truncate">📍 {day.location}</div>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <span className="text-xs text-text-tertiary tabular-nums">
            {t('scheduleEditor.dayPagesSummary', '{{scenes}} scenes · {{pages}} pages', { scenes: sceneStrips.length, pages: dayPages.toFixed(1) })}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary" aria-label={t('scheduleEditor.dayActions', 'Shoot day actions')}>
                <Pencil className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditingDay((v) => !v)}>
                <Pencil className="h-3.5 w-3.5" /> {t('scheduleEditor.editDay', 'Edit day')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStripDialog({ mode: 'create' })}>
                <Plus className="h-3.5 w-3.5" /> {t('scheduleEditor.addScene', 'Add scene')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-danger focus:text-danger">
                <Trash2 className="h-3.5 w-3.5" /> {t('scheduleEditor.deleteDay', 'Delete day')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Inline day edit */}
      {editingDay && (
        <form
          onSubmit={handleSubmit((v) => saveDay.mutate(v))}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 px-5 py-4 border-b border-border-subtle bg-bg-sunken/20"
        >
          <div className="space-y-1.5">
            <FieldLabel>{t('scheduleEditor.fieldDayNumber', 'Day #')}</FieldLabel>
            <Input type="number" min="1" {...register('dayNumber', { valueAsNumber: true })} className="bg-bg-sunken border-border-subtle text-text-primary" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>{t('scheduleEditor.fieldDate', 'Date')}</FieldLabel>
            <Input type="date" {...register('shootDate')} className="bg-bg-sunken border-border-subtle text-text-primary" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <FieldLabel>{t('scheduleEditor.fieldLocation', 'Location')}</FieldLabel>
            <Input {...register('location')} placeholder={t('scheduleEditor.locationPlaceholder', 'Main location for the day')} className="bg-bg-sunken border-border-subtle text-text-primary" />
          </div>
          <div className="space-y-1.5 sm:col-span-4">
            <FieldLabel>{t('scheduleEditor.fieldNotes', 'Notes')}</FieldLabel>
            <Input {...register('notes')} placeholder={t('scheduleEditor.notesPlaceholder', 'Notes (optional)')} className="bg-bg-sunken border-border-subtle text-text-primary" />
          </div>
          <div className="sm:col-span-4 flex items-center gap-2">
            <Button type="submit" size="sm" disabled={saveDay.isPending}>
              {saveDay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save', 'Save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDay(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </form>
      )}

      {/* Strips */}
      {strips.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-text-tertiary mb-3">{t('scheduleEditor.noStrips', 'No strips on this day yet.')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setStripDialog({ mode: 'create' })} className="border-border-subtle text-text-secondary hover:text-text-primary">
            <Plus className="h-3.5 w-3.5" />
            {t('scheduleEditor.addScene', 'Add scene')}
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {strips.map((strip, idx) => (
            <StripRow
              key={strip.id}
              strip={strip}
              isFirst={idx === 0}
              isLast={idx === strips.length - 1}
              onMoveUp={() => moveStrip(idx, -1)}
              onMoveDown={() => moveStrip(idx, 1)}
              onEdit={() => setStripDialog({ mode: 'edit', strip })}
              onDelete={() => {
                if (confirm(t('scheduleEditor.confirmDeleteStrip', 'Delete this strip?'))) deleteStrip.mutate(strip.id);
              }}
              onInsertMeal={() => setBannerDialog({ kind: 'meal', afterStripId: strip.id })}
              onInsertMove={() => setBannerDialog({ kind: 'move', afterStripId: strip.id })}
            />
          ))}
        </div>
      )}

      {strips.length > 0 && (
        <div className="px-5 py-3 border-t border-border-subtle">
          <Button type="button" variant="ghost" size="sm" onClick={() => setStripDialog({ mode: 'create' })} className="text-text-secondary hover:text-text-primary">
            <Plus className="h-3.5 w-3.5" />
            {t('scheduleEditor.addScene', 'Add scene')}
          </Button>
        </div>
      )}

      {/* Strip create/edit dialog */}
      {stripDialog && (
        <StripDialog
          open
          mode={stripDialog.mode}
          shootDayId={day.id}
          strip={stripDialog.strip}
          onOpenChange={(o) => { if (!o) setStripDialog(null); }}
          onSaved={() => { setStripDialog(null); refresh(); }}
        />
      )}

      {/* Banner (meal / move) dialog */}
      {bannerDialog && (
        <BannerDialog
          open
          kind={bannerDialog.kind}
          afterStripId={bannerDialog.afterStripId}
          onOpenChange={(o) => { if (!o) setBannerDialog(null); }}
          onSaved={() => { setBannerDialog(null); refresh(); }}
        />
      )}
    </GlassPanel>
  );
}

/* ================================================================== */
/*  Strip row                                                          */
/* ================================================================== */

function StripRow({
  strip, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete, onInsertMeal, onInsertMove,
}: {
  strip: ScheduleStrip;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInsertMeal: () => void;
  onInsertMove: () => void;
}) {
  const { t } = useTranslation();

  const reorderControls = (
    <div className="flex items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={isFirst} className="text-text-tertiary hover:text-text-primary disabled:opacity-30" aria-label={t('scheduleEditor.moveUp', 'Move up')}>
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={isLast} className="text-text-tertiary hover:text-text-primary disabled:opacity-30" aria-label={t('scheduleEditor.moveDown', 'Move down')}>
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  if (strip.stripType === 'BANNER') {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-accent-navy/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          {strip.bannerType === 'MEAL_BREAK' ? <Utensils className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            : strip.bannerType === 'COMPANY_MOVE' ? <Truck className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            : null}
          <span className="text-xs uppercase tracking-wider text-text-secondary truncate">
            {strip.bannerText || strip.bannerType?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {reorderControls}
          <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} className="text-text-tertiary hover:text-danger" aria-label={t('scheduleEditor.deleteStrip', 'Delete strip')}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <div className="w-12 shrink-0 text-center font-mono text-sm text-text-primary tabular-nums">
        {strip.sceneNumber || '—'}
      </div>
      <div className="w-14 shrink-0 flex flex-col gap-0.5 text-[10px]">
        <Tag>{strip.intExt || 'INT'}</Tag>
        <Tag>{strip.dayNight || 'DAY'}</Tag>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-primary truncate">{strip.sceneName || t('scheduleEditor.untitledScene', 'Untitled scene')}</div>
        {strip.location && <div className="text-xs text-text-tertiary truncate">{strip.location}</div>}
      </div>
      <div className="w-16 shrink-0 text-right tabular-nums text-sm text-text-secondary">
        {(strip.pageCount ?? 0).toFixed(1)}
      </div>
      <div className="shrink-0 flex items-center gap-0.5">
        {reorderControls}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary" aria-label={t('scheduleEditor.stripActions', 'Strip actions')}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> {t('scheduleEditor.editStrip', 'Edit scene')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertMeal}>
              <Utensils className="h-3.5 w-3.5" /> {t('scheduleEditor.insertMeal', 'Insert meal break')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertMove}>
              <Truck className="h-3.5 w-3.5" /> {t('scheduleEditor.insertMove', 'Insert company move')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-danger focus:text-danger">
              <Trash2 className="h-3.5 w-3.5" /> {t('common.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Strip create/edit dialog                                          */
/* ================================================================== */

const stripSchema = z.object({
  sceneNumber:   z.string().optional(),
  sceneName:     z.string().optional(),
  intExt:        z.string().optional(),
  dayNight:      z.string().optional(),
  location:      z.string().optional(),
  pageCount:     z.coerce.number().min(0).optional(),
  estimatedTime: z.coerce.number().min(0).optional(),
});
type StripValues = z.infer<typeof stripSchema>;

function StripDialog({
  open, mode, shootDayId, strip, onOpenChange, onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  shootDayId: string;
  strip?: ScheduleStrip;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<StripValues>({
    resolver: zodResolver(stripSchema),
    defaultValues: {
      sceneNumber:   strip?.sceneNumber ?? '',
      sceneName:     strip?.sceneName ?? '',
      intExt:        strip?.intExt ?? 'INT',
      dayNight:      strip?.dayNight ?? 'DAY',
      location:      strip?.location ?? '',
      pageCount:     strip?.pageCount ?? undefined,
      estimatedTime: strip?.estimatedTime ?? undefined,
    },
  });

  const save = useMutation({
    mutationFn: (v: StripValues) => {
      const payload = {
        sceneNumber:   v.sceneNumber || undefined,
        sceneName:     v.sceneName || undefined,
        intExt:        v.intExt || undefined,
        dayNight:      v.dayNight || undefined,
        location:      v.location || undefined,
        pageCount:     Number.isFinite(v.pageCount) ? v.pageCount : undefined,
        estimatedTime: Number.isFinite(v.estimatedTime) ? Math.round(v.estimatedTime as number) : undefined,
      };
      return mode === 'create'
        ? stripsApi.create({ shootDayId, stripType: 'SCENE', ...payload })
        : stripsApi.update(strip!.id, payload);
    },
    onSuccess: () => { toast.success(mode === 'create' ? t('scheduleEditor.stripCreated', 'Scene added') : t('scheduleEditor.stripUpdated', 'Scene updated')); onSaved(); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.stripSaveFailed', 'Failed to save scene')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('scheduleEditor.addSceneTitle', 'Add Scene Strip') : t('scheduleEditor.editSceneTitle', 'Edit Scene Strip')}
          </DialogTitle>
          <DialogDescription>{t('scheduleEditor.sceneDialogDesc', 'A scene strip on the stripboard.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldSceneNumber', 'Scene #')}</FieldLabel>
              <Input {...register('sceneNumber')} placeholder="12A" className="bg-bg-sunken border-border-default text-text-primary font-mono" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldPageCount', 'Pages')}</FieldLabel>
              <Input type="number" min="0" step="0.125" {...register('pageCount', { valueAsNumber: true })} className="bg-bg-sunken border-border-default text-text-primary text-right font-mono tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>{t('scheduleEditor.fieldSceneName', 'Scene / Set')}</FieldLabel>
            <Input {...register('sceneName')} placeholder={t('scheduleEditor.sceneNamePlaceholder', 'E.g. Office — Confrontation')} className="bg-bg-sunken border-border-default text-text-primary" aria-invalid={!!errors.sceneName} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldIntExt', 'INT / EXT')}</FieldLabel>
              <Select value={watch('intExt')} onValueChange={(v) => setValue('intExt', v)}>
                <SelectTrigger className="bg-bg-sunken border-border-default text-text-primary"><SelectValue /></SelectTrigger>
                <SelectContent>{INT_EXT.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldDayNight', 'Day / Night')}</FieldLabel>
              <Select value={watch('dayNight')} onValueChange={(v) => setValue('dayNight', v)}>
                <SelectTrigger className="bg-bg-sunken border-border-default text-text-primary"><SelectValue /></SelectTrigger>
                <SelectContent>{DAY_NIGHT.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldLocation', 'Location')}</FieldLabel>
              <Input {...register('location')} className="bg-bg-sunken border-border-default text-text-primary" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldEstTime', 'Est. Time (min)')}</FieldLabel>
              <Input type="number" min="0" step="1" {...register('estimatedTime', { valueAsNumber: true })} className="bg-bg-sunken border-border-default text-text-primary text-right font-mono tabular-nums" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Banner (meal / move) dialog                                       */
/* ================================================================== */

function BannerDialog({
  open, kind, afterStripId, onOpenChange, onSaved,
}: {
  open: boolean;
  kind: 'meal' | 'move';
  afterStripId: string;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const meal = useForm<{ mealType: string; mealTime: string; mealDuration?: number; mealLocation?: string }>({
    defaultValues: { mealType: 'LUNCH', mealTime: '', mealDuration: 30, mealLocation: '' },
  });
  const move = useForm<{ moveTime: string; moveFromLocation: string; moveToLocation: string; moveTravelTime?: number; moveNotes?: string }>({
    defaultValues: { moveTime: '', moveFromLocation: '', moveToLocation: '', moveTravelTime: undefined, moveNotes: '' },
  });

  const insertMeal = useMutation({
    mutationFn: (v: { mealType: string; mealTime: string; mealDuration?: number; mealLocation?: string }) =>
      stripsApi.insertMeal(afterStripId, {
        mealType: v.mealType,
        mealTime: v.mealTime,
        mealDuration: v.mealDuration ? Number(v.mealDuration) : undefined,
        mealLocation: v.mealLocation || undefined,
      }),
    onSuccess: () => { toast.success(t('scheduleEditor.mealInserted', 'Meal break inserted')); onSaved(); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.bannerFailed', 'Failed to insert')),
  });

  const insertMove = useMutation({
    mutationFn: (v: { moveTime: string; moveFromLocation: string; moveToLocation: string; moveTravelTime?: number; moveNotes?: string }) =>
      stripsApi.insertMove(afterStripId, {
        moveTime: v.moveTime,
        moveFromLocation: v.moveFromLocation,
        moveToLocation: v.moveToLocation,
        moveTravelTime: v.moveTravelTime ? Number(v.moveTravelTime) : undefined,
        moveNotes: v.moveNotes || undefined,
      }),
    onSuccess: () => { toast.success(t('scheduleEditor.moveInserted', 'Company move inserted')); onSaved(); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.bannerFailed', 'Failed to insert')),
  });

  const isPending = insertMeal.isPending || insertMove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {kind === 'meal' ? t('scheduleEditor.mealTitle', 'Insert Meal Break') : t('scheduleEditor.moveTitle', 'Insert Company Move')}
          </DialogTitle>
          <DialogDescription>
            {kind === 'meal'
              ? t('scheduleEditor.mealDesc', 'A meal-break banner is added directly after this strip.')
              : t('scheduleEditor.moveDesc', 'A company-move banner is added directly after this strip.')}
          </DialogDescription>
        </DialogHeader>

        {kind === 'meal' ? (
          <form onSubmit={meal.handleSubmit((v) => insertMeal.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMealType', 'Meal')}</FieldLabel>
                <Select value={meal.watch('mealType')} onValueChange={(v) => meal.setValue('mealType', v)}>
                  <SelectTrigger className="bg-bg-sunken border-border-default text-text-primary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKFAST">{t('scheduleEditor.mealBreakfast', 'Breakfast')}</SelectItem>
                    <SelectItem value="LUNCH">{t('scheduleEditor.mealLunch', 'Lunch')}</SelectItem>
                    <SelectItem value="SECOND_MEAL">{t('scheduleEditor.mealSecond', 'Second Meal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMealTime', 'Time')}</FieldLabel>
                <Input {...meal.register('mealTime')} placeholder="12:00 PM" className="bg-bg-sunken border-border-default text-text-primary" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMealDuration', 'Duration (min)')}</FieldLabel>
                <Input type="number" min="0" {...meal.register('mealDuration', { valueAsNumber: true })} className="bg-bg-sunken border-border-default text-text-primary text-right font-mono tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMealLocation', 'Location')}</FieldLabel>
                <Input {...meal.register('mealLocation')} placeholder={t('scheduleEditor.mealLocationPlaceholder', 'Craft services')} className="bg-bg-sunken border-border-default text-text-primary" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
                {t('scheduleEditor.insertMeal', 'Insert meal break')}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={move.handleSubmit((v) => insertMove.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <FieldLabel>{t('scheduleEditor.fieldMoveTime', 'Move Time')}</FieldLabel>
              <Input {...move.register('moveTime')} placeholder="2:00 PM" className="bg-bg-sunken border-border-default text-text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMoveFrom', 'From')}</FieldLabel>
                <Input {...move.register('moveFromLocation')} className="bg-bg-sunken border-border-default text-text-primary" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMoveTo', 'To')}</FieldLabel>
                <Input {...move.register('moveToLocation')} className="bg-bg-sunken border-border-default text-text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMoveTravel', 'Travel (min)')}</FieldLabel>
                <Input type="number" min="0" {...move.register('moveTravelTime', { valueAsNumber: true })} className="bg-bg-sunken border-border-default text-text-primary text-right font-mono tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>{t('scheduleEditor.fieldMoveNotes', 'Notes')}</FieldLabel>
                <Input {...move.register('moveNotes')} className="bg-bg-sunken border-border-default text-text-primary" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                {t('scheduleEditor.insertMove', 'Insert company move')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Shell + presentational helpers                                    */
/* ================================================================== */

function Shell({
  user, children,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      {children}
    </AppShell>
  );
}

const StatChip = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-md border border-border-subtle bg-bg-sunken/40 px-4 py-2">
    <div className="text-lg font-display font-medium text-text-primary tabular-nums leading-tight">{value}</div>
    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{label}</div>
  </div>
);

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex justify-center rounded bg-bg-raised border border-border-subtle px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
    {children}
  </span>
);

const FormSection = ({
  eyebrow, title, description, children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <GlassPanel surface="glass" padding="lg">
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">{eyebrow}</div>
      <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">{title}</h2>
      {description && <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">{description}</p>}
    </div>
    {children}
  </GlassPanel>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
    {children}
    {required && <span className="text-text-tertiary ml-1">*</span>}
  </Label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1">{message}</p> : null;
