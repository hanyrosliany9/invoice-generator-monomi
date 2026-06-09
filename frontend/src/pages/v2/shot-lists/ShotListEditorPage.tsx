import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Plus, Save, Trash2, Loader2, Film, Download, Copy, ChevronUp, ChevronDown,
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

import { useAuthStore } from '@/store/auth';
import { shotListsApi } from '@/services/shotLists';
import type { Shot } from '@/types/shotList';

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Schema — flattened, single-scene model for v2.                     */
/*  Multi-scene authoring (scene grouping, INT/EXT/Day/Night metadata) */
/*  remains in the classic editor.                                     */
/* ------------------------------------------------------------------ */

const shotRowSchema = z.object({
  id:             z.string().optional(),
  // sceneId tracks which scene this shot belongs to so multi-scene lists
  // are preserved on save. Undefined only for brand-new shots (fallback to
  // scenes[0] or a freshly created scene).
  sceneId:        z.string().optional(),
  shotNumber:     z.string().min(1, 'Required'),
  description:    z.string().optional(),
  shotType:       z.string().optional(), // e.g. CU / WS / MS
  cameraMovement: z.string().optional(), // e.g. Pan / Track / Static
  camera:         z.string().optional(),
  estimatedTime:  z.coerce.number().min(0).optional(), // seconds (shot durations are short)
  notes:          z.string().optional(),
});

const formSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  shots:       z.array(shotRowSchema),
});
type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// Returns all shots across all scenes, each annotated with its owning sceneId
// so the save loop can upsert each shot back into the correct scene.
const flattenShots = (scenes: Array<{ id: string; shots?: Shot[] }> | undefined): (Shot & { sceneId: string })[] => {
  if (!scenes?.length) return [];
  return scenes.flatMap((sc) => (sc.shots ?? []).map((s) => ({ ...s, sceneId: sc.id })));
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ShotListEditorPageV2() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: shotList, isLoading, error, refetch } = useQuery({
    queryKey: ['shot-list', id],
    queryFn:  () => shotListsApi.getById(id!),
    enabled:  !!id,
  });

  /* ---------- defaults ---------- */
  const defaultValues = useMemo<FormValues>(() => {
    if (!shotList) {
      return { name: '', description: '', shots: [] };
    }
    return {
      name:        shotList.name,
      description: shotList.description ?? '',
      shots: flattenShots(shotList.scenes)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id:             s.id,
          sceneId:        s.sceneId,   // preserved so save loop targets correct scene
          shotNumber:     s.shotNumber,
          description:    s.description ?? '',
          shotType:       s.shotType ?? '',
          cameraMovement: s.cameraMovement ?? '',
          camera:         s.camera ?? '',
          estimatedTime:  s.estimatedTime ?? undefined,
          notes:          s.notes ?? '',
        })),
    };
  }, [shotList]);

  const {
    register, handleSubmit, control, reset, getValues, formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const { fields, append, remove, insert, move } = useFieldArray({ control, name: 'shots' });

  /* ---------- row helpers: add / duplicate / reorder ----------
     Save is a batch diff that writes `order: i` from the array position, so
     reorder + duplicate are pure client-side field-array ops — no extra API
     round-trips, persisted on the next Save. */
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from');

  // After adding/duplicating a row, focus its shot-number input.
  const focusRowRef = useRef<number | null>(null);
  useEffect(() => {
    if (focusRowRef.current === null) return;
    const el = document.querySelector<HTMLInputElement>(`[data-shot-row="${focusRowRef.current}"]`);
    el?.focus();
    focusRowRef.current = null;
  }, [fields.length]);

  const addRow = () => {
    focusRowRef.current = fields.length; // index of the row about to be appended
    append({
      id:             undefined,
      sceneId:        undefined, // new shots fall back to fallbackSceneId on save
      shotNumber:     String(fields.length + 1),
      description:    '',
      shotType:       '',
      cameraMovement: '',
      camera:         '',
      estimatedTime:  undefined,
      notes:          '',
    });
  };

  const duplicateRow = (idx: number) => {
    const row = getValues(`shots.${idx}`);
    insert(idx + 1, {
      ...row,
      id: undefined, // copy persisted as a new shot on save
      // suffix so the copy doesn't silently share the source's shot number
      shotNumber: row.shotNumber ? `${row.shotNumber}-copy` : '',
    });
    focusRowRef.current = idx + 1;
  };

  const moveRow = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    move(idx, target);
  };

  // Enter advances to the next row (or appends one from the last row) for fast
  // keyboard entry; textareas keep their normal newline behaviour, and the
  // stray implicit form-submit is suppressed.
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const tag = (e.target as HTMLElement).tagName;
    // Textareas keep newlines; buttons keep their own activation.
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    e.preventDefault();
    if (idx === fields.length - 1) addRow();
    else document.querySelector<HTMLInputElement>(`[data-shot-row="${idx + 1}"]`)?.focus();
  };

  /* ---------- unsaved-changes guard ---------- */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* ---------- back navigation: prefer the originating project ----------
     Shot lists are project-scoped, so the natural "back" is the project the
     list belongs to (or an explicit ?from= origin), never the global list. */
  const backProjectId = shotList?.project?.id ?? shotList?.projectId;
  // Only honour an in-app, non-protocol-relative ?from= (guards against
  // navigate() being pointed off-site via a crafted/bookmarked URL).
  const safeFrom = fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//') ? fromParam : null;
  const backTarget = safeFrom || (backProjectId ? `/projects/${backProjectId}` : '/shot-lists');
  const backIsProject = backTarget.startsWith('/projects/');
  const backLabel = backIsProject
    ? t('shotListEditor.backToProject', 'Back to Project')
    : t('shotListEditor.backToShotLists', 'Back to Shot Lists');
  const confirmLeave = () =>
    !isDirty || window.confirm(t('common.confirmDiscard', 'You have unsaved changes. Leave without saving?'));
  const handleBack = () => { if (confirmLeave()) navigate(backTarget); };

  /* ---------- save ----------
     One atomic request: the backend diffs the desired set against what's
     stored (delete missing / update existing / create new) inside a single
     transaction, and numbers order per-scene. No partial-save risk. */
  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!id) return;
      await shotListsApi.bulkSaveShots(id, {
        name:        values.name,
        description: values.description || undefined,
        shots: values.shots.map((s) => ({
          id:             s.id,
          sceneId:        s.sceneId,
          shotNumber:     s.shotNumber,
          description:    s.description || undefined,
          shotType:       s.shotType || undefined,
          cameraMovement: s.cameraMovement || undefined,
          camera:         s.camera || undefined,
          // backend validates estimatedTime as an integer; round + drop NaN
          // (empty number input) so a stray decimal can't reject the save.
          estimatedTime:  Number.isFinite(s.estimatedTime) ? Math.round(s.estimatedTime as number) : undefined,
          notes:          s.notes || undefined,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', id] });
      queryClient.invalidateQueries({ queryKey: ['shot-lists'] });
      toast.success(t('shotListEditor.saveSuccess', 'Shot list saved'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('shotListEditor.saveFailed', 'Failed to save shot list'));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => saveMutation.mutateAsync(values);

  /* ---------- PDF download ---------- */
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await shotListsApi.generatePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shot-list-${shotList?.name ?? id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('shotListEditor.pdfDownloaded', 'PDF downloaded'));
    } catch {
      toast.error(t('shotListEditor.pdfFailed', 'Failed to generate PDF'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /* ---------- loading / error guards ---------- */
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

  if (error || !shotList) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<Film className="h-12 w-12" />}
            title={t('shotListEditor.notFoundTitle', 'Shot list not found')}
            description={
              error instanceof Error
                ? error.message
                : t('shotListEditor.notFoundDesc', 'This shot list may have been deleted or you don\'t have access.')
            }
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
                <Button size="sm" onClick={() => refetch()}>{t('shotLists.retry', 'Try Again')}</Button>
              </div>
            }
          />
        </PageContainer>
      </Shell>
    );
  }

  const isPending = isSubmitting || saveMutation.isPending;
  // Projects are identified by number + description (there is no `name` field),
  // so build the label from those — mirrors the schedule editor.
  const projectLabel = shotList.project
    ? [shotList.project.number, shotList.project.description ?? shotList.project.name]
        .filter(Boolean)
        .join(' — ') || '—'
    : '—';

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
          title={t('shotListEditor.title', 'Shot List Editor')}
          description={t('shotListEditor.description', 'Arrange shots for a production project. Each row is one take.')}
        />

        {/* Mobile notice — editing is best on tablet or desktop */}
        <div className="md:hidden mb-6 rounded-md border border-warning/30 bg-warning/[0.06] px-3.5 py-2.5 text-xs text-warning">
          {t('common.mobileNotice', 'Best editing experience on tablet or desktop. Some controls may be hidden on small screens.')}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ─────────────────────────────────────────────────────────
              Identity header — name + read-only project context. We do
              not allow re-binding the project from here; that's a
              destructive edit deferred to the classic flow.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow={t('shotListEditor.eyebrowIdentity', 'Identity')}
            title={t('shotListEditor.detailSectionTitle', 'Shot List Details')}
            description={t('shotListEditor.detailSectionDesc', 'Name and description appear in the list. The linked project cannot be changed here.')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>{t('shotListEditor.fieldName', 'Name')}</FieldLabel>
                <Input
                  placeholder={t('shotListEditor.namePlaceholder', 'E.g. Day 1 — Exterior')}
                  {...register('name')}
                  className="bg-bg-sunken border-border-default text-text-primary"
                  aria-invalid={!!errors.name}
                />
                <FieldError message={errors.name?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>{t('shotListEditor.fieldDescription', 'Description')}</FieldLabel>
                <textarea
                  rows={2}
                  placeholder={t('shotListEditor.descriptionPlaceholder', 'Brief context (optional)')}
                  {...register('description')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t('shotListEditor.fieldProject', 'Project')}</FieldLabel>
                <div className="h-9 px-3 flex items-center rounded-md border border-border-subtle bg-bg-sunken/60 text-sm text-text-secondary">
                  {projectLabel}
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t('shotListEditor.fieldShotCount', 'Shot Count')}</FieldLabel>
                <div className="h-9 px-3 flex items-center rounded-md border border-border-subtle bg-bg-sunken/60 text-sm font-mono tabular-nums text-text-secondary">
                  {fields.length}
                </div>
              </div>
            </div>
          </FormSection>

          {/* ─────────────────────────────────────────────────────────
              Shot table — column rhythm: # → location/desc → type →
              camera/movement → duration → notes → remove. Header row
              uses the eyebrow uppercase tracking pattern from
              InvoiceForm line items so the editorial voice stays one.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow={t('shotListEditor.eyebrowShots', 'Shots')}
            title={t('shotListEditor.shotsSectionTitle', 'Shot Rows ({{count}})', { count: fields.length })}
            description={t('shotListEditor.shotsSectionDesc', 'Add shots one by one. Shot numbers follow your team\'s convention (e.g. 1A, 12B).')}
          >
            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-subtle bg-bg-sunken/40 py-10 text-center">
                <p className="text-sm text-text-tertiary">
                  {t('shotListEditor.noShots', 'No shots yet. Add the first row to start planning.')}
                </p>
              </div>
            ) : (
              <>
                {/* Header — desktop only */}
                <div className="hidden lg:grid grid-cols-[60px_1fr_100px_140px_90px_1fr_132px] gap-3 px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <div>{t('shotListEditor.colNumber', '#')}</div>
                  <div>{t('shotListEditor.colDescription', 'Description')}</div>
                  <div>{t('shotListEditor.colType', 'Type')}</div>
                  <div>{t('shotListEditor.colCameraMove', 'Camera / Move')}</div>
                  <div className="text-right">{t('shotListEditor.colDuration', 'Duration (s)')}</div>
                  <div>{t('shotListEditor.colNotes', 'Notes')}</div>
                  <div className="text-right">{t('shotListEditor.colActions', 'Actions')}</div>
                </div>

                <div className="divide-y divide-border-subtle">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      onKeyDown={(e) => handleRowKeyDown(e, idx)}
                      className="grid grid-cols-1 lg:grid-cols-[60px_1fr_100px_140px_90px_1fr_132px] gap-3 py-3 items-start"
                    >
                      {/* shot number */}
                      <div className="space-y-1">
                        <Input
                          data-shot-row={idx}
                          placeholder={t('shotListEditor.shotNumberPlaceholder', '1A')}
                          {...register(`shots.${idx}.shotNumber` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-primary text-sm font-mono tabular-nums"
                          aria-invalid={!!errors.shots?.[idx]?.shotNumber}
                        />
                        <FieldError message={errors.shots?.[idx]?.shotNumber?.message} />
                      </div>

                      {/* description */}
                      <div className="space-y-1 min-w-0">
                        <Input
                          placeholder={t('shotListEditor.descriptionShotPlaceholder', 'Action / location / subject')}
                          {...register(`shots.${idx}.description` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-primary text-sm placeholder:text-text-tertiary"
                        />
                      </div>

                      {/* shot type (CU, WS, MS) */}
                      <div>
                        <Input
                          placeholder={t('shotListEditor.shotTypePlaceholder', 'WS / CU')}
                          {...register(`shots.${idx}.shotType` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-secondary text-sm uppercase tracking-wider"
                        />
                      </div>

                      {/* camera + movement combined */}
                      <div className="space-y-1.5">
                        <Input
                          placeholder={t('shotListEditor.cameraPlaceholder', 'Camera')}
                          {...register(`shots.${idx}.camera` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-secondary text-xs h-8"
                        />
                        <Input
                          placeholder={t('shotListEditor.movementPlaceholder', 'Move (Pan / Track)')}
                          {...register(`shots.${idx}.cameraMovement` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-tertiary text-xs h-8"
                        />
                      </div>

                      {/* estimated time (seconds) — shot durations are short */}
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder={t('shotListEditor.durationPlaceholder', 'sec')}
                          {...register(`shots.${idx}.estimatedTime` as const, { valueAsNumber: true })}
                          className="bg-bg-sunken border-border-subtle text-right font-mono tabular-nums text-text-primary text-sm"
                        />
                      </div>

                      {/* notes */}
                      <div>
                        <textarea
                          rows={2}
                          placeholder={t('shotListEditor.notesPlaceholder', 'Crew / props / lens notes')}
                          {...register(`shots.${idx}.notes` as const)}
                          className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-1.5 text-xs text-text-secondary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                        />
                      </div>

                      {/* row actions: reorder / duplicate / remove */}
                      <div className="flex items-center justify-end gap-0.5 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => moveRow(idx, -1)}
                          disabled={idx === 0}
                          className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
                          aria-label={t('shotListEditor.moveUp', 'Move up')}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => moveRow(idx, 1)}
                          disabled={idx === fields.length - 1}
                          className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
                          aria-label={t('shotListEditor.moveDown', 'Move down')}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => duplicateRow(idx)}
                          className="text-text-tertiary hover:text-text-primary"
                          aria-label={t('shotListEditor.duplicateShot', 'Duplicate shot')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(idx)}
                          className="text-text-tertiary hover:text-danger"
                          aria-label={t('shotListEditor.removeShot', 'Remove shot')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="border-border-subtle text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('shotListEditor.addShot', 'Add Shot')}
              </Button>
              <span className="ml-3 text-[11px] text-text-tertiary">
                {t('shotListEditor.addShotHint', 'Tip: press Enter in a row to add the next shot.')}
              </span>
            </div>
          </FormSection>

          {/* sticky action bar */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-text-tertiary">
                {isDirty
                  ? t('common.unsavedChanges', 'You have unsaved changes.')
                  : t('common.noPendingChanges', 'No pending changes.')}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf || isPending}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t('shotListEditor.downloadPdf', 'Download PDF')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isPending}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium min-w-[120px]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common.saving', 'Saving…')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t('common.save', 'Save')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Deferred-feature callout — keeps expectations honest. */}
        <p className="mt-6 text-[11px] text-text-tertiary leading-relaxed">
          {t('shotListEditor.footnote', 'Tip: press Enter to add the next shot, use the arrows to reorder, and the copy icon to duplicate a row. Scene grouping (INT/EXT, Day/Night, location), storyboard uploads, and shot status (planned/shot/wrapped) are managed in the classic view.')}
        </p>
      </PageContainer>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell helper                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Local presentational helpers                                       */
/* ------------------------------------------------------------------ */

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
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
        {eyebrow}
      </div>
      <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">
          {description}
        </p>
      )}
    </div>
    {children}
  </GlassPanel>
);

const FieldLabel = ({
  children, required,
}: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
    {children}
    {required && <span className="text-text-tertiary ml-1">*</span>}
  </Label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1">{message}</p> : null;
