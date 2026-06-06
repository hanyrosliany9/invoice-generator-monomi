import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { safeUrl } from '@/utils/safeUrl';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Plus, Save, Trash2, ChevronUp, ChevronDown, Loader2, Image as ImageIcon,
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
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

import { useAuthStore } from '@/store/auth';
import { decksApi, slidesApi } from '@/services/decks';
import { projectService } from '@/services/projects';
import type { DeckStatus, SlideTemplate } from '@/types/deck';

/* ------------------------------------------------------------------ */
/*  Nav — consistent with the rest of v2                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Schema — v2 keeps slide editing structured (heading / body /       */
/*  image / layout / notes). Free-form canvas authoring is deferred to */
/*  the classic editor.                                                */
/* ------------------------------------------------------------------ */

// STATUS_OPTIONS labels resolved at render time via t()
const STATUS_OPTIONS: { value: DeckStatus; labelKey: string; labelFallback: string }[] = [
  { value: 'DRAFT',     labelKey: 'decks.statusDraft',     labelFallback: 'Draft' },
  { value: 'PUBLISHED', labelKey: 'decks.statusPublished', labelFallback: 'Published' },
  { value: 'ARCHIVED',  labelKey: 'decks.statusArchived',  labelFallback: 'Archived' },
];

// LAYOUT_OPTIONS labels resolved at render time via t()
const LAYOUT_OPTIONS: { value: SlideTemplate; labelKey: string; labelFallback: string }[] = [
  { value: 'TITLE',         labelKey: 'deckEditor.layoutTitle',        labelFallback: 'Title' },
  { value: 'TITLE_CONTENT', labelKey: 'deckEditor.layoutTitleContent', labelFallback: 'Title + Content' },
  { value: 'TWO_COLUMN',    labelKey: 'deckEditor.layoutTwoColumn',    labelFallback: 'Two Columns' },
  { value: 'FULL_MEDIA',    labelKey: 'deckEditor.layoutFullMedia',    labelFallback: 'Full Bleed' },
  { value: 'MOOD_BOARD',    labelKey: 'deckEditor.layoutMoodBoard',    labelFallback: 'Mood Board' },
  { value: 'BLANK',         labelKey: 'deckEditor.layoutBlank',        labelFallback: 'Blank' },
];

const slideSchema = z.object({
  id:              z.string().optional(),           // existing slide → string id; new slide → undefined
  template:        z.string().min(1),
  title:           z.string().optional(),
  subtitle:        z.string().optional(),
  backgroundImage: z.string().optional().refine(
    (v) => !v || !!safeUrl(v),
    { message: 'Background image URL must start with http:// or https://' },
  ),
  notes:           z.string().optional(),
});

const formSchema = z.object({
  title:       z.string().min(2, 'Deck title must be at least 2 characters'),
  description: z.string().optional(),
  status:      z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  projectId:   z.string().optional(),
  slides:      z.array(slideSchema),
});
type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DeckEditorPageV2() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillProjectId = searchParams.get('projectId') ?? '';
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: deck, isLoading, error, refetch } = useQuery({
    queryKey: ['deck', id],
    queryFn:  () => decksApi.getById(id!),
    enabled:  !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn:  projectService.getProjects,
  });

  /* ---------- defaults derived from server data ---------- */
  const defaultValues = useMemo<FormValues>(() => {
    if (!deck) {
      return { title: '', description: '', status: 'DRAFT', projectId: prefillProjectId, slides: [] };
    }
    return {
      title:       deck.title,
      description: deck.description ?? '',
      status:      deck.status,
      projectId:   deck.projectId ?? '',
      slides: [...(deck.slides ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id:              s.id,
          template:        s.template,
          title:           s.title ?? '',
          subtitle:        s.subtitle ?? '',
          backgroundImage: s.backgroundImage ?? '',
          notes:           s.notes ?? '',
        })),
    };
  }, [deck]);

  const {
    register, handleSubmit, control, reset, formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const { fields, append, remove, move } = useFieldArray({ control, name: 'slides' });

  /* ---------- save: diff against the original slide set ---------- */
  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!id || !deck) return;

      // 1. deck-level update
      await decksApi.update(id, {
        title:       values.title,
        description: values.description || undefined,
        status:      values.status,
        projectId:   values.projectId || undefined,
      });

      // 2. slide diff
      const originalIds = new Set((deck.slides ?? []).map((s) => s.id));
      const keptIds     = new Set(values.slides.map((s) => s.id).filter(Boolean) as string[]);

      // deletes — anything in original but no longer present
      const toDelete = [...originalIds].filter((sid) => !keptIds.has(sid));
      for (const sid of toDelete) {
        await slidesApi.delete(sid);
      }

      // upserts — index drives order
      for (let i = 0; i < values.slides.length; i++) {
        const s = values.slides[i];
        const payload = {
          template:        s.template as SlideTemplate,
          title:           s.title || undefined,
          subtitle:        s.subtitle ?? '',
          backgroundImage: s.backgroundImage || undefined,
          notes:           s.notes || undefined,
          order:           i,
        };
        if (s.id && originalIds.has(s.id)) {
          await slidesApi.update(s.id, payload);
        } else {
          await slidesApi.create({ deckId: id, ...payload });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success(t('deckEditor.saveSuccess', 'Deck changes saved'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('deckEditor.saveFailed', 'Failed to save deck'));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => saveMutation.mutateAsync(values);

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

  if (error || !deck) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={t('deckEditor.notFoundTitle', 'Deck not found')}
            description={
              error instanceof Error
                ? error.message
                : t('deckEditor.notFoundDesc', 'This deck may have been deleted or you don\'t have access.')
            }
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/decks')}>
                  <ArrowLeft className="h-4 w-4" />
                  {t('deckEditor.backToDecks', 'Back to Decks')}
                </Button>
                <Button size="sm" onClick={() => refetch()}>{t('decks.retry', 'Try Again')}</Button>
              </div>
            }
          />
        </PageContainer>
      </Shell>
    );
  }

  const isPending = isSubmitting || saveMutation.isPending;

  /* ---------- render ---------- */
  return (
    <Shell user={user}>
      <PageContainer>
        <div className="mb-4">
          <Link
            to="/decks"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('deckEditor.backToDecks', 'Back to Decks')}
          </Link>
        </div>

        <PageHeader
          title={t('deckEditor.title', 'Deck Editor')}
          description={t('deckEditor.description', 'Arrange presentation slides: title, content, image, and layout. Reorder via up/down buttons.')}
        />

        {/* Mobile notice — editing is best on tablet or desktop */}
        <div className="md:hidden mb-6 rounded-md border border-warning/30 bg-warning/[0.06] px-3.5 py-2.5 text-xs text-warning">
          {t('common.mobileNotice', 'Best editing experience on tablet or desktop. Some controls may be hidden on small screens.')}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ─────────────────────────────────────────────────────────
              Identity card — deck meta. Single panel so the page
              opens with a clear "this is the deck" reading.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow={t('deckEditor.eyebrowIdentity', 'Identity')}
            title={t('deckEditor.detailSectionTitle', 'Deck Details')}
            description={t('deckEditor.detailSectionDesc', 'The title appears in the deck list. Status controls visibility and the PUBLISHED badge.')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>{t('deckEditor.fieldDeckTitle', 'Deck Title')}</FieldLabel>
                <Input
                  placeholder={t('decks.titlePlaceholder', 'E.g. Q1 2026 Pitch')}
                  {...register('title')}
                  className="bg-bg-sunken border-border-default text-text-primary"
                  aria-invalid={!!errors.title}
                />
                <FieldError message={errors.title?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>{t('decks.fieldDescription', 'Description')}</FieldLabel>
                <textarea
                  rows={3}
                  placeholder={t('deckEditor.descriptionPlaceholder', 'Brief context about this deck (optional)')}
                  {...register('description')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t('deckEditor.fieldStatus', 'Status')}</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.labelFallback)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t('deckEditor.fieldProject', 'Project')}</FieldLabel>
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => {
                    const projectOptions = [
                      {
                        value: '__none__',
                        label: t('deckEditor.notLinked', 'Not linked'),
                        keywords: [],
                        node: <span className="text-text-tertiary italic">{t('deckEditor.notLinked', 'Not linked')}</span>,
                      },
                      ...projects.map((p) => ({
                        value: p.id,
                        label: p.description || p.number || p.id,
                        keywords: [p.number, p.description],
                        node: (
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-text-tertiary">{p.number || '—'}</span>
                            <span className="truncate">{p.description || t('common.noDescription', 'No description')}</span>
                          </span>
                        ),
                      })),
                    ];
                    return (
                      <Combobox
                        value={field.value || '__none__'}
                        onChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={projectOptions}
                        placeholder={t('deckEditor.notLinked', 'Not linked')}
                        searchPlaceholder={t('deckEditor.searchProject', 'Search by name or number…')}
                        emptyText={t('deckEditor.noProjectsFound', 'No projects found')}
                        className="w-full bg-bg-sunken border-border-default text-text-primary"
                      />
                    );
                  }}
                />
              </div>
            </div>
          </FormSection>

          {/* ─────────────────────────────────────────────────────────
              Slide stack — vertical list. Each slide is its own card
              with index pill, layout select, heading/body/image/notes,
              and reorder/delete chrome on the right rail.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow={t('deckEditor.eyebrowSlides', 'Slides')}
            title={t('deckEditor.slidesSectionTitle', 'Slides ({{count}})', { count: fields.length })}
            description={t('deckEditor.slidesSectionDesc', 'Organize content for each slide. Layout is a reference pattern — it can be changed at any time.')}
          >
            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-subtle bg-bg-sunken/40 py-10 text-center">
                <p className="text-sm text-text-tertiary">
                  {t('deckEditor.noSlides', 'This deck has no slides yet. Add the first slide to get started.')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <SlideRow
                    key={field.id}
                    index={idx}
                    total={fields.length}
                    register={register}
                    control={control}
                    onMoveUp={() => idx > 0 && move(idx, idx - 1)}
                    onMoveDown={() => idx < fields.length - 1 && move(idx, idx + 1)}
                    onRemove={() => remove(idx)}
                  />
                ))}
              </div>
            )}

            <div className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id:              undefined,
                    template:        'TITLE_CONTENT',
                    title:           '',
                    subtitle:        '',
                    backgroundImage: '',
                    notes:           '',
                  })
                }
                className="border-border-subtle text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('deckEditor.addSlide', 'Add Slide')}
              </Button>
            </div>
          </FormSection>

          {/* ─────────────────────────────────────────────────────────
              Sticky action bar — same shape as InvoiceForm. Save commits
              both deck meta and slide diff in one server pass.
             ───────────────────────────────────────────────────────── */}
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
                  variant="ghost"
                  onClick={() => navigate('/decks')}
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

        {/* Deferred-from-v1 callout — keeps the visual editor expectations
            honest. Authors who need canvas authoring still get the classic
            page until v2 grows that surface. */}
        <p className="mt-6 text-[11px] text-text-tertiary leading-relaxed">
          {t('deckEditor.footnote', 'Note: The free-canvas editor (drag elements, rich text, live presentation, real-time collaboration, PDF/PNG export, and asset upload) is still available in the classic view. The v2 view focuses on structured slide CRUD.')}
        </p>
      </PageContainer>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell helper — same pattern as DecksPage                           */
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
/*  SlideRow — one slide card. Right rail holds index + reorder +      */
/*  delete; left column carries the editable fields. Layout type and   */
/*  image url stay in a row of secondary fields below the heading so   */
/*  the reading order matches a slide preview.                         */
/* ------------------------------------------------------------------ */

function SlideRow({
  index, total, register, control, onMoveUp, onMoveDown, onRemove,
}: {
  index: number;
  total: number;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  control: ReturnType<typeof useForm<FormValues>>['control'];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-border-subtle bg-bg-sunken/40 p-4">
      <div className="grid grid-cols-1 md:grid-cols-[40px_1fr_56px] gap-4 items-start">
        {/* Mobile top-bar: index pill + action buttons side by side */}
        <div className="md:contents flex items-center justify-between gap-2">
          {/* index pill */}
          <div className="text-center pt-1 md:pt-1">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
              {t('deckEditor.slide', 'Slide')}
            </div>
            <div className="mt-1 font-display font-semibold text-text-primary tabular-nums text-lg leading-none">
              {String(index + 1).padStart(2, '0')}
            </div>
          </div>

          {/* right rail — reorder + delete (visible inline on mobile) */}
          <div className="flex md:hidden items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMoveUp}
              disabled={index === 0}
              className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
              aria-label={t('deckEditor.moveUp', 'Move up')}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
              aria-label={t('deckEditor.moveDown', 'Move down')}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              className="text-text-tertiary hover:text-danger"
              aria-label={t('deckEditor.removeSlide', 'Remove slide')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* fields */}
        <div className="space-y-3 min-w-0">
          <Input
            placeholder={t('deckEditor.slideTitlePlaceholder', 'Slide title (heading)')}
            {...register(`slides.${index}.title` as const)}
            className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-sm"
          />
          <textarea
            rows={3}
            placeholder={t('deckEditor.slideBodyPlaceholder', 'Slide body / content')}
            {...register(`slides.${index}.subtitle` as const)}
            className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/80 px-3 py-2 text-sm text-text-secondary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
          />

          <Separator className="bg-border-subtle" />

          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                {t('deckEditor.fieldLayout', 'Layout')}
              </Label>
              <Controller
                control={control}
                name={`slides.${index}.template` as const}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger size="sm" className="w-full bg-bg-sunken border-border-subtle text-text-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.labelFallback)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                {t('deckEditor.fieldBgImage', 'Background Image URL')}
              </Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                <Input
                  placeholder="https://… (opsional)"
                  {...register(`slides.${index}.backgroundImage` as const)}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-secondary placeholder:text-text-tertiary text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
              {t('deckEditor.fieldSpeakerNotes', 'Speaker Notes')}
            </Label>
            <textarea
              rows={2}
              placeholder={t('deckEditor.speakerNotesPlaceholder', 'Notes for the speaker (optional)')}
              {...register(`slides.${index}.notes` as const)}
              className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-1.5 text-xs text-text-tertiary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
            />
          </div>
        </div>

        {/* right rail — reorder + delete (desktop only; mobile handled above) */}
        <div className="hidden md:flex flex-col items-center gap-1 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
            aria-label={t('deckEditor.moveUp', 'Move up')}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
            aria-label={t('deckEditor.moveDown', 'Move down')}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-text-tertiary hover:text-danger mt-1"
            aria-label={t('deckEditor.removeSlide', 'Remove slide')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Local presentational helpers (mirroring InvoiceForm)               */
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
