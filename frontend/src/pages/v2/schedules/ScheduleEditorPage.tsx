import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Save, Trash2, Loader2, CalendarRange, Download,
  Wand2, Utensils, Truck, Pencil, GripVertical, Copy, ListChecks,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  type AutoScheduleGroupBy, type CreateStripDto,
} from '@/services/schedules';
import { shotListsApi } from '@/services/shotLists';
import type { ShotList } from '@/types/shotList';

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
          description={t('scheduleEditor.description', 'Organize scenes into shoot days. Type a scene and press Enter to add the next, drag strips to reorder, or import scenes from a shot list.')}
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
                projectId={schedule.projectId}
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
  day, projectId, onChanged, onDelete,
}: {
  day: ShootDay;
  projectId: string;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState(false);
  const [bannerDialog, setBannerDialog] = useState<{ kind: 'meal' | 'move'; afterStripId: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const strips = (day.strips ?? []).slice().sort((a, b) => a.order - b.order);
  const sceneStrips = strips.filter((s) => s.stripType === 'SCENE');
  const dayPages = sceneStrips.reduce((p, s) => p + (s.pageCount ?? 0), 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    onSuccess: () => { onChanged(); setEditingDay(false); toast.success(t('scheduleEditor.daySaved', 'Shoot day saved')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.dayAddFailed', 'Failed to add shoot day')),
  });

  /* ----- strip mutations ----- */
  const deleteStrip = useMutation({
    mutationFn: (stripId: string) => stripsApi.delete(stripId),
    onSuccess: () => { onChanged(); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.stripDeleteFailed', 'Failed to delete strip')),
  });

  const duplicateStrip = useMutation({
    mutationFn: (strip: ScheduleStrip) => {
      const payload: CreateStripDto = {
        shootDayId: day.id,
        stripType: 'SCENE',
        sceneNumber: strip.sceneNumber ?? undefined,
        sceneName: strip.sceneName ?? undefined,
        intExt: strip.intExt ?? undefined,
        dayNight: strip.dayNight ?? undefined,
        location: strip.location ?? undefined,
        pageCount: strip.pageCount ?? undefined,
        estimatedTime: strip.estimatedTime ?? undefined,
      };
      return stripsApi.create(payload);
    },
    onSuccess: () => { onChanged(); toast.success(t('scheduleEditor.stripDuplicated', 'Scene duplicated')); },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.stripSaveFailed', 'Failed to save scene')),
  });

  const reorder = useMutation({
    mutationFn: (next: ScheduleStrip[]) =>
      stripsApi.reorder(next.map((s, i) => ({ stripId: s.id, shootDayId: day.id, order: i }))),
    onSuccess: () => onChanged(),
    onError: (e: Error) => {
      toast.error(e.message || t('scheduleEditor.reorderFailed', 'Failed to reorder strips'));
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = strips.findIndex((s) => s.id === active.id);
    const newIndex = strips.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder.mutate(arrayMove(strips, oldIndex, newIndex));
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setEditingDay((v) => !v)}>
                <Pencil className="h-3.5 w-3.5" /> {t('scheduleEditor.editDay', 'Edit day')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <ListChecks className="h-3.5 w-3.5" /> {t('scheduleEditor.importFromShotList', 'Import from shot list')}
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

      {/* Column hints */}
      {strips.length > 0 && (
        <div className="hidden sm:flex items-center gap-3 px-5 py-2 border-b border-border-subtle bg-bg-sunken/20 text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
          <span className="w-4 shrink-0" />
          <span className="w-14 shrink-0">{t('scheduleEditor.colScene', 'Scene')}</span>
          <span className="w-[76px] shrink-0">{t('scheduleEditor.colIntExt', 'I/E')}</span>
          <span className="w-[76px] shrink-0">{t('scheduleEditor.colDayNight', 'D/N')}</span>
          <span className="flex-1">{t('scheduleEditor.colDescription', 'Description / Set')}</span>
          <span className="w-32 shrink-0">{t('scheduleEditor.colLocation', 'Location')}</span>
          <span className="w-14 shrink-0 text-right">{t('scheduleEditor.colPages', 'Pages')}</span>
          <span className="w-8 shrink-0" />
        </div>
      )}

      {/* Strips */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={strips.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border-subtle">
            {strips.map((strip) => (
              <SortableStripRow
                key={strip.id}
                strip={strip}
                onChanged={onChanged}
                onDelete={() => deleteStrip.mutate(strip.id)}
                onDuplicate={() => duplicateStrip.mutate(strip)}
                onInsertMeal={() => setBannerDialog({ kind: 'meal', afterStripId: strip.id })}
                onInsertMove={() => setBannerDialog({ kind: 'move', afterStripId: strip.id })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Quick-add row — the primary way to add scenes fast */}
      <QuickAddRow dayId={day.id} onChanged={onChanged} />

      {/* Banner (meal / move) dialog */}
      {bannerDialog && (
        <BannerDialog
          open
          kind={bannerDialog.kind}
          afterStripId={bannerDialog.afterStripId}
          onOpenChange={(o) => { if (!o) setBannerDialog(null); }}
          onSaved={() => { setBannerDialog(null); onChanged(); }}
        />
      )}

      {/* Import-from-shot-list dialog */}
      {importOpen && (
        <ImportFromShotListDialog
          open
          scheduleId={day.scheduleId}
          projectId={projectId}
          shootDayId={day.id}
          dayNumber={day.dayNumber}
          onOpenChange={(o) => { if (!o) setImportOpen(false); }}
          onImported={() => { setImportOpen(false); onChanged(); }}
        />
      )}
    </GlassPanel>
  );
}

/* ================================================================== */
/*  Sortable strip row (scene = inline editable, banner = display)     */
/* ================================================================== */

function SortableStripRow(props: {
  strip: ScheduleStrip;
  onChanged: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onInsertMeal: () => void;
  onInsertMove: () => void;
}) {
  const { strip } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: strip.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dragHandle = (
    <button
      type="button"
      className="shrink-0 cursor-grab touch-none text-text-tertiary hover:text-text-secondary active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className="bg-bg-base">
      {strip.stripType === 'BANNER'
        ? <BannerStripRow {...props} dragHandle={dragHandle} />
        : <SceneStripRow {...props} dragHandle={dragHandle} />}
    </div>
  );
}

/* ----- editable scene row ----- */

function SceneStripRow({
  strip, onChanged, onDelete, onDuplicate, onInsertMeal, onInsertMove, dragHandle,
}: {
  strip: ScheduleStrip;
  onChanged: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onInsertMeal: () => void;
  onInsertMove: () => void;
  dragHandle: React.ReactNode;
}) {
  const { t } = useTranslation();

  // Local editable state, re-synced when the strip identity changes.
  const [sceneNumber, setSceneNumber] = useState(strip.sceneNumber ?? '');
  const [sceneName, setSceneName] = useState(strip.sceneName ?? '');
  const [location, setLocation] = useState(strip.location ?? '');
  const [pageCount, setPageCount] = useState(strip.pageCount != null ? String(strip.pageCount) : '');
  useEffect(() => {
    setSceneNumber(strip.sceneNumber ?? '');
    setSceneName(strip.sceneName ?? '');
    setLocation(strip.location ?? '');
    setPageCount(strip.pageCount != null ? String(strip.pageCount) : '');
  }, [strip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useMutation({
    mutationFn: (patch: Partial<CreateStripDto>) => stripsApi.update(strip.id, patch),
    onSuccess: () => onChanged(),
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.stripSaveFailed', 'Failed to save scene')),
  });

  // Save a field only when it actually differs from the server value.
  const saveText = (field: 'sceneNumber' | 'sceneName' | 'location', value: string) => {
    if ((strip[field] ?? '') !== value) update.mutate({ [field]: value || undefined });
  };
  const savePages = () => {
    const num = pageCount === '' ? undefined : Number(pageCount);
    if ((strip.pageCount ?? undefined) !== num) update.mutate({ pageCount: num });
  };
  const saveSelect = (field: 'intExt' | 'dayNight', value: string) => {
    if ((strip[field] ?? '') !== value) update.mutate({ [field]: value });
  };

  const cell = 'h-8 bg-bg-sunken/60 border-border-subtle text-text-primary focus-visible:bg-bg-sunken';

  return (
    <div className="flex items-center gap-3 px-5 py-1.5">
      {dragHandle}
      <Input
        value={sceneNumber}
        onChange={(e) => setSceneNumber(e.target.value)}
        onBlur={() => saveText('sceneNumber', sceneNumber)}
        placeholder="12A"
        aria-label={t('scheduleEditor.fieldSceneNumber', 'Scene #')}
        className={`w-14 shrink-0 font-mono text-sm ${cell}`}
      />
      <div className="w-[76px] shrink-0">
        <Select value={strip.intExt ?? 'INT'} onValueChange={(v) => saveSelect('intExt', v)}>
          <SelectTrigger size="sm" className={cell}><SelectValue /></SelectTrigger>
          <SelectContent>{INT_EXT.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="w-[76px] shrink-0">
        <Select value={strip.dayNight ?? 'DAY'} onValueChange={(v) => saveSelect('dayNight', v)}>
          <SelectTrigger size="sm" className={cell}><SelectValue /></SelectTrigger>
          <SelectContent>{DAY_NIGHT.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Input
        value={sceneName}
        onChange={(e) => setSceneName(e.target.value)}
        onBlur={() => saveText('sceneName', sceneName)}
        placeholder={t('scheduleEditor.sceneNamePlaceholder', 'E.g. Office — Confrontation')}
        aria-label={t('scheduleEditor.fieldSceneName', 'Scene / Set')}
        className={`flex-1 min-w-0 text-sm ${cell}`}
      />
      <Input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onBlur={() => saveText('location', location)}
        placeholder={t('scheduleEditor.fieldLocation', 'Location')}
        aria-label={t('scheduleEditor.fieldLocation', 'Location')}
        className={`w-32 shrink-0 text-sm hidden sm:block ${cell}`}
      />
      <Input
        type="number" min="0" step="0.125"
        value={pageCount}
        onChange={(e) => setPageCount(e.target.value)}
        onBlur={savePages}
        placeholder="0"
        aria-label={t('scheduleEditor.fieldPageCount', 'Pages')}
        className={`w-14 shrink-0 text-right font-mono tabular-nums text-sm ${cell}`}
      />
      <div className="w-8 shrink-0 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary" aria-label={t('scheduleEditor.stripActions', 'Strip actions')}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" /> {t('scheduleEditor.duplicateScene', 'Duplicate scene')}
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

/* ----- banner row (display + delete) ----- */

function BannerStripRow({
  strip, onDelete, dragHandle,
}: {
  strip: ScheduleStrip;
  onDelete: () => void;
  dragHandle: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-bg-sunken/60">
      <div className="flex items-center gap-2 min-w-0">
        {dragHandle}
        {strip.bannerType === 'MEAL_BREAK' ? <Utensils className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
          : strip.bannerType === 'COMPANY_MOVE' ? <Truck className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
          : null}
        <span className="text-xs uppercase tracking-wider text-text-secondary truncate">
          {strip.bannerText || strip.bannerType?.replace('_', ' ')}
        </span>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} className="text-text-tertiary hover:text-danger shrink-0" aria-label={t('scheduleEditor.deleteStrip', 'Delete strip')}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ================================================================== */
/*  Quick-add row — type and press Enter to add the next scene         */
/* ================================================================== */

function QuickAddRow({ dayId, onChanged }: { dayId: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const blank = { sceneNumber: '', intExt: 'INT', dayNight: 'DAY', sceneName: '', location: '', pageCount: '' };
  const [v, setV] = useState(blank);
  const sceneNumberRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: () => stripsApi.create({
      shootDayId: dayId,
      stripType: 'SCENE',
      sceneNumber: v.sceneNumber || undefined,
      sceneName: v.sceneName || undefined,
      intExt: v.intExt,
      dayNight: v.dayNight,
      location: v.location || undefined,
      pageCount: v.pageCount === '' ? undefined : Number(v.pageCount),
    }),
    onSuccess: () => {
      setV(blank);
      onChanged();
      // Refocus for rapid sequential entry.
      requestAnimationFrame(() => sceneNumberRef.current?.focus());
    },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.stripSaveFailed', 'Failed to save scene')),
  });

  const submit = () => {
    if (!v.sceneNumber.trim() && !v.sceneName.trim()) return;
    create.mutate();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  const cell = 'h-8 bg-bg-sunken/40 border-dashed border-border-subtle text-text-primary focus-visible:bg-bg-sunken';

  return (
    <div className="flex items-center gap-3 px-5 py-2 border-t border-border-subtle bg-bg-sunken/20">
      <span className="shrink-0 text-text-tertiary"><Plus className="h-4 w-4" /></span>
      <Input
        ref={sceneNumberRef}
        value={v.sceneNumber}
        onChange={(e) => setV({ ...v, sceneNumber: e.target.value })}
        onKeyDown={onKeyDown}
        placeholder="12A"
        aria-label={t('scheduleEditor.fieldSceneNumber', 'Scene #')}
        className={`w-14 shrink-0 font-mono text-sm ${cell}`}
      />
      <div className="w-[76px] shrink-0">
        <Select value={v.intExt} onValueChange={(val) => setV({ ...v, intExt: val })}>
          <SelectTrigger size="sm" className={cell}><SelectValue /></SelectTrigger>
          <SelectContent>{INT_EXT.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="w-[76px] shrink-0">
        <Select value={v.dayNight} onValueChange={(val) => setV({ ...v, dayNight: val })}>
          <SelectTrigger size="sm" className={cell}><SelectValue /></SelectTrigger>
          <SelectContent>{DAY_NIGHT.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Input
        value={v.sceneName}
        onChange={(e) => setV({ ...v, sceneName: e.target.value })}
        onKeyDown={onKeyDown}
        placeholder={t('scheduleEditor.quickAddHint', 'Type a scene and press Enter to add the next')}
        aria-label={t('scheduleEditor.fieldSceneName', 'Scene / Set')}
        className={`flex-1 min-w-0 text-sm ${cell}`}
      />
      <Input
        value={v.location}
        onChange={(e) => setV({ ...v, location: e.target.value })}
        onKeyDown={onKeyDown}
        placeholder={t('scheduleEditor.fieldLocation', 'Location')}
        aria-label={t('scheduleEditor.fieldLocation', 'Location')}
        className={`w-32 shrink-0 text-sm hidden sm:block ${cell}`}
      />
      <Input
        type="number" min="0" step="0.125"
        value={v.pageCount}
        onChange={(e) => setV({ ...v, pageCount: e.target.value })}
        onKeyDown={onKeyDown}
        placeholder="0"
        aria-label={t('scheduleEditor.fieldPageCount', 'Pages')}
        className={`w-14 shrink-0 text-right font-mono tabular-nums text-sm ${cell}`}
      />
      <div className="w-8 shrink-0 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={submit}
          disabled={create.isPending}
          aria-label={t('scheduleEditor.addScene', 'Add scene')}
          className="text-text-tertiary hover:text-text-primary"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Import from shot list dialog                                       */
/* ================================================================== */

function ImportFromShotListDialog({
  open, scheduleId, projectId, shootDayId, dayNumber, onOpenChange, onImported,
}: {
  open: boolean;
  scheduleId: string;
  projectId: string;
  shootDayId: string;
  dayNumber: number;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>('');

  const { data: shotLists, isLoading } = useQuery({
    queryKey: ['shotLists', projectId],
    queryFn: () => shotListsApi.getByProject(projectId),
    enabled: open && !!projectId,
  });

  const importMutation = useMutation({
    mutationFn: () => schedulesApi.importFromShotList(scheduleId, selectedId, shootDayId),
    onSuccess: (schedule) => {
      const count = schedule.shootDays?.find((d) => d.id === shootDayId)
        ?.strips?.filter((s) => s.stripType === 'SCENE').length;
      toast.success(t('scheduleEditor.importSuccess', 'Scenes imported into Day {{n}}', { n: dayNumber, count }));
      onImported();
    },
    onError: (e: Error) => toast.error(e.message || t('scheduleEditor.importFailed', 'Failed to import scenes')),
  });

  const lists: ShotList[] = shotLists ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduleEditor.importTitle', 'Import scenes from a shot list')}</DialogTitle>
          <DialogDescription>
            {t('scheduleEditor.importDesc', 'Every scene from the selected shot list is added to Day {{n}} as strips. You can reorder or auto-schedule them afterwards.', { n: dayNumber })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-tertiary" /></div>
        ) : lists.length === 0 ? (
          <p className="py-6 text-sm text-text-tertiary text-center">
            {t('scheduleEditor.importNoLists', 'No shot lists found for this project.')}
          </p>
        ) : (
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {lists.map((list) => {
              const sceneCount = list.scenes?.length ?? 0;
              const active = selectedId === list.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedId(list.id)}
                  className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${
                    active
                      ? 'border-accent-navy-ring bg-accent-navy/[0.06]'
                      : 'border-border-subtle bg-bg-sunken/40 hover:border-border-default'
                  }`}
                >
                  <div className="text-sm text-text-primary truncate">{list.name}</div>
                  <div className="text-xs text-text-tertiary">
                    {t('scheduleEditor.importSceneCount', '{{count}} scenes', { count: sceneCount })}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={!selectedId || importMutation.isPending}
          >
            {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
            {t('scheduleEditor.importButton', 'Import scenes')}
          </Button>
        </DialogFooter>
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
      topbar={{}}
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
