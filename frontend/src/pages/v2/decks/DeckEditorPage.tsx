import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { safeUrl } from '@/utils/safeUrl';
import {
  FileText,
  ArrowLeft, Save, Loader2, ChevronLeft, ChevronRight, Plus, Trash2,
  Copy, Settings, Maximize2, Check, CircleDashed, Share2, MessageSquare,
} from 'lucide-react';
import type { Canvas as FabricCanvas } from 'fabric';
import { App as AntdApp } from 'antd';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

import { useAuthStore } from '@/store/auth';
import { decksApi, slidesApi, elementsApi, commentsApi } from '@/services/decks';
import { projectService } from '@/services/projects';
import { fabricObjectToElement } from '@/utils/deckCanvasUtils';
import type { Deck, DeckSlide, DeckSlideElement, DeckStatus, SlideTemplate } from '@/types/deck';

import {
  SlideCanvas,
  PropertiesPanel,
  AlignmentTools,
  TextStylePicker,
  ShapePicker,
  LineTool,
  InsertImageButton,
  AssetBrowserModal,
  ExportButton,
  PresentButton,
  NewSlideButton,
  SlideContextMenu,
  CanvasContextMenu,
  KeyboardShortcutsModal,
  ShareDeckDialog,
} from '@/components/deck';
import { CommentsOverlay } from '@/components/deck/collaboration/CommentsOverlay';
import { CommentsPanel } from '@/components/deck/collaboration/CommentsPanel';
import { PresentationView } from '@/components/deck/presentation/PresentationView';
import { useDeckCanvasStore } from '@/stores/deckCanvasStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useCollaborationStore, mapApiComment } from '@/stores/collaborationStore';
import { useDeckKeyboardShortcuts } from '@/hooks/useDeckKeyboardShortcuts';
import { useSlideTemplates } from '@/hooks/useSlideTemplates';
import type { SlideTemplateType } from '@/templates/templateTypes';
import { PresenceIndicator } from '@/components/deck/collaboration/PresenceIndicator';
import { CollaboratorCursors } from '@/components/deck/collaboration/CollaboratorCursors';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

const STATUS_OPTIONS: { value: DeckStatus; labelKey: string; labelFallback: string }[] = [
  { value: 'DRAFT',     labelKey: 'decks.statusDraft',     labelFallback: 'Draft' },
  { value: 'PUBLISHED', labelKey: 'decks.statusPublished', labelFallback: 'Published' },
  { value: 'ARCHIVED',  labelKey: 'decks.statusArchived',  labelFallback: 'Archived' },
];

const metaSchema = z.object({
  title:       z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  status:      z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  projectId:   z.string().optional(),
});
type MetaValues = z.infer<typeof metaSchema>;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DeckEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const prefillProjectId = searchParams.get('projectId') ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  /* ---------- data ---------- */
  const { data: deck, isLoading, error, refetch } = useQuery({
    queryKey: ['deck', id],
    queryFn:  () => decksApi.getById(id!),
    enabled:  !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn:  projectService.getProjects,
  });

  /* ---------- local slide state ---------- */
  const [slides, setSlides] = useState<DeckSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showMeta, setShowMeta] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const canvasRef = useRef<FabricCanvas | null>(null);

  useEffect(() => {
    if (deck?.slides) {
      const sorted = [...deck.slides].sort((a, b) => a.order - b.order);
      setSlides(sorted);
      setActiveSlideIndex((prev) => Math.min(prev, Math.max(0, sorted.length - 1)));
    }
  }, [deck]);

  const activeSlide = slides[activeSlideIndex] ?? null;
  useEffect(() => { activeSlideIdRef.current = activeSlide?.id ?? null; }, [activeSlide?.id]);

  /* ---------- collaboration: keep the store's current slide in sync so
       CollaboratorCursors' slideId filter + comment loading target it ---------- */
  useEffect(() => {
    if (activeSlide?.id) {
      useCollaborationStore.getState().setCurrentSlide(activeSlide.id);
    }
  }, [activeSlide?.id]);

  /* ---------- comments: load the active slide's comments into the store ---------- */
  const setComments = useCollaborationStore((s) => s.setComments);
  const setAddingComment = useCollaborationStore((s) => s.setAddingComment);
  const isAddingComment = useCollaborationStore((s) => s.isAddingComment);

  useEffect(() => {
    if (!activeSlide?.id) return;
    let cancelled = false;
    commentsApi
      .getBySlide(activeSlide.id)
      .then((list) => {
        if (!cancelled) setComments(list.map(mapApiComment));
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => { cancelled = true; };
  }, [activeSlide?.id, setComments]);

  // Leaving comment mode whenever the panel closes keeps the canvas click
  // behaviour predictable.
  useEffect(() => {
    if (!showComments) setAddingComment(false);
  }, [showComments, setAddingComment]);

  /* ---------- stores ---------- */
  const canvas = useDeckCanvasStore((s) => s.canvas);
  const isDirty = useDeckCanvasStore((s) => s.isDirty);
  const setIsDirty = useDeckCanvasStore((s) => s.setIsDirty);
  const { isPresenting, startPresentation, endPresentation } = usePresentationStore();
  const { applyTemplate } = useSlideTemplates();

  /* ---------- save state ---------- */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Keep the active slide id in a ref so the debounced autosave always targets
  // the slide currently on the canvas (avoids stale closures).
  const activeSlideIdRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- collaboration ---------- */
  useEffect(() => {
    if (!id || !user?.id) return;
    useCollaborationStore.getState().connect(id, user.id);
    return () => {
      useCollaborationStore.getState().disconnect();
    };
  }, [id, user?.id]);

  /* ---------- real save (bulk-replace the active slide's elements) ---------- */
  const deckWidth = deck?.slideWidth || CANVAS_WIDTH;
  const deckHeight = deck?.slideHeight || CANVAS_HEIGHT;

  // Serialize every persistable object on the canvas and bulk-save it to the
  // active slide. Mirrors the dimensions SlideCanvas uses so percentages match.
  const saveSlide = useCallback(async (opts?: { silent?: boolean }) => {
    const slideId = activeSlideIdRef.current;
    if (!id || !slideId || !canvas) return;

    const scale = getCanvasScale(deckWidth);
    const canvasWidth = deckWidth * scale;
    const canvasHeight = deckHeight * scale;

    const elements: Partial<DeckSlideElement>[] = canvas
      .getObjects()
      .map((obj) => fabricObjectToElement(obj, slideId, canvasWidth, canvasHeight))
      // Only keep objects that serialized to a known element type — skip stray
      // helpers (temp lines, untyped objects) that have no `type`.
      .filter((el) => !!el.type);

    setSaveState('saving');
    try {
      await elementsApi.bulkSaveForSlide(slideId, elements);
      setIsDirty(false);
      setSaveState('saved');
      // Refresh the cached deck so reload/present/export see the saved elements,
      // but only after a manual save — autosave avoids churning the canvas.
      if (!opts?.silent) {
        queryClient.invalidateQueries({ queryKey: ['deck', id] });
      }
    } catch (err) {
      setSaveState('error');
      if (!opts?.silent) {
        toast.error(err instanceof Error ? err.message : t('deckEditor.saveError', 'Failed to save deck'));
      }
    }
  }, [id, canvas, deckWidth, deckHeight, queryClient, setIsDirty, t]);

  const handleSave = useCallback(() => {
    void saveSlide();
  }, [saveSlide]);

  // Flush any pending/unsaved edits to the DB (used before entering present mode
  // and on slide switches). Cancels the debounce and saves synchronously.
  const flushSave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (useDeckCanvasStore.getState().isDirty) {
      await saveSlide();
    }
  }, [saveSlide]);

  /* ---------- debounced autosave on canvas changes ---------- */
  useEffect(() => {
    if (!canvas) return;

    const scheduleAutosave = () => {
      // Skip while SlideCanvas is (re)loading elements — those programmatic
      // add/remove events must not trigger a save of the slide being loaded.
      if (useDeckCanvasStore.getState().isLoadingElements) return;
      setIsDirty(true);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        void saveSlide({ silent: true });
      }, 1200);
    };

    canvas.on('object:added', scheduleAutosave);
    canvas.on('object:modified', scheduleAutosave);
    canvas.on('object:removed', scheduleAutosave);
    canvas.on('text:editing:exited', scheduleAutosave);

    return () => {
      canvas.off('object:added', scheduleAutosave);
      canvas.off('object:modified', scheduleAutosave);
      canvas.off('object:removed', scheduleAutosave);
      canvas.off('text:editing:exited', scheduleAutosave);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [canvas, saveSlide, setIsDirty]);

  /* ---------- warn before leaving with unsaved changes ---------- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useDeckCanvasStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleDelete = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  useDeckKeyboardShortcuts({
    canvas: canvas ?? null,
    onSave: handleSave,
    onDelete: handleDelete,
  });

  // Switch the active slide, but first flush any pending/unsaved edits so the
  // current slide's changes aren't lost when SlideCanvas reloads the next slide
  // from the (possibly stale) cached deck.
  const selectSlide = useCallback((next: number | ((i: number) => number)) => {
    void (async () => {
      await flushSave();
      setActiveSlideIndex(next);
    })();
  }, [flushSave]);

  /* ---------- meta form ---------- */
  const defaultMeta = useMemo<MetaValues>(() => ({
    title:       deck?.title ?? '',
    description: deck?.description ?? '',
    status:      deck?.status ?? 'DRAFT',
    projectId:   deck?.projectId ?? prefillProjectId,
  }), [deck, prefillProjectId]);

  const { register: regMeta, handleSubmit: handleMetaSubmit, control: metaControl, reset: resetMeta } = useForm<MetaValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: defaultMeta,
  });

  useEffect(() => { resetMeta(defaultMeta); }, [defaultMeta, resetMeta]);

  const metaMutation = useMutation({
    mutationFn: (values: MetaValues) =>
      decksApi.update(id!, {
        title:       values.title,
        description: values.description || undefined,
        status:      values.status,
        projectId:   values.projectId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      toast.success(t('deckEditor.saveSuccess', 'Deck changes saved'));
      setShowMeta(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onMetaSubmit: SubmitHandler<MetaValues> = (values) => metaMutation.mutateAsync(values);

  /* ---------- slide operations ---------- */
  const addSlideMutation = useMutation({
    mutationFn: (templateType?: SlideTemplateType) =>
      slidesApi.create({
        deckId:   id!,
        template: (templateType ?? 'BLANK') as SlideTemplate,
        order:    slides.length,
      }),
    onSuccess: (newSlide) => {
      setSlides((prev) => [...prev, newSlide]);
      setActiveSlideIndex(slides.length);
      // Apply template to canvas if one was chosen
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateSlideMutation = useMutation({
    mutationFn: (slideId: string) => slidesApi.duplicate(slideId),
    onSuccess: (newSlide, _, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      toast.success(t('deckEditor.slideDuplicated', 'Slide duplicated'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => slidesApi.delete(slideId),
    onSuccess: (_, slideId) => {
      setSlides((prev) => {
        const next = prev.filter((s) => s.id !== slideId);
        setActiveSlideIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ---------- element persistence ---------- */
  const createElement = useCallback(async (element: Partial<DeckSlideElement>) => {
    if (!activeSlide) return;
    try {
      await elementsApi.create(element as any);
    } catch (err) {
      console.error('Failed to save element:', err);
    }
  }, [activeSlide]);

  const updateElement = useCallback(async (elementId: string, data: Partial<DeckSlideElement>) => {
    try {
      await elementsApi.update(elementId, data as any);
    } catch (err) {
      console.error('Failed to update element:', err);
    }
  }, []);

  /* ---------- comment persistence ---------- */
  const handleCreateComment = useCallback(
    async ({ content, x, y }: { content: string; x: number; y: number }) => {
      const slideId = activeSlideIdRef.current;
      if (!slideId) return;
      try {
        const created = await commentsApi.create({ slideId, content, positionX: x, positionY: y });
        const mapped = mapApiComment(created);
        useCollaborationStore.getState().addComment(mapped);
        // Broadcast so peers see it live (store listens for comment:add).
        useCollaborationStore.getState().socket?.emit('comment:add', mapped);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('deckEditor.commentError', 'Failed to add comment'));
      }
    },
    [t],
  );

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      try {
        await commentsApi.resolve(commentId);
        useCollaborationStore.getState().updateComment(commentId, { resolved: true });
        useCollaborationStore.getState().socket?.emit('comment:update', {
          id: commentId,
          updates: { resolved: true },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('deckEditor.commentResolveError', 'Failed to resolve comment'));
      }
    },
    [t],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await commentsApi.delete(commentId);
        useCollaborationStore.getState().removeComment(commentId);
        useCollaborationStore.getState().socket?.emit('comment:delete', commentId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('deckEditor.commentDeleteError', 'Failed to delete comment'));
      }
    },
    [t],
  );

  /* ---------- guards ---------- */
  if (isLoading) {
    return (
      <Shell user={user}>
        <div className="flex-1 flex flex-col gap-4 p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-[540px] rounded-lg" />
        </div>
      </Shell>
    );
  }

  if (error || !deck) {
    return (
      <Shell user={user}>
        <div className="p-8">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={t('deckEditor.notFoundTitle', 'Deck not found')}
            description={
              error instanceof Error
                ? error.message
                : t('deckEditor.notFoundDesc', "This deck may have been deleted or you don't have access.")
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
        </div>
      </Shell>
    );
  }

  /* ---------- presentation mode ---------- */
  if (isPresenting) {
    return (
      <PresentationView
        slides={slides}
        onExit={endPresentation}
      />
    );
  }

  /* ---------- main editor layout ---------- */
  return (
    <AntdApp>
      <Shell user={user}>
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-border-subtle bg-bg-base shrink-0">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/decks"
              className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('deckEditor.backToDecks', 'Back')}
            </Link>
            <span className="text-border-subtle select-none hidden sm:block">|</span>
            <span className="text-sm font-medium text-text-primary truncate hidden sm:block">{deck.title}</span>
            <button
              onClick={() => setShowMeta((v) => !v)}
              className="flex-shrink-0 p-1 rounded text-text-tertiary hover:text-text-secondary transition-colors"
              title={t('deckEditor.editMeta', 'Edit deck details')}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Center: toolbar */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canvas && (
              <>
                <TextStylePicker canvas={canvas} />
                <ShapePicker canvas={canvas} />
                <LineTool canvas={canvas} />
                <InsertImageButton />
                <AlignmentTools canvas={canvas} />
              </>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Save state indicator */}
            <SaveStateIndicator
              saveState={saveState}
              isDirty={isDirty}
              t={t}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="hidden sm:inline-flex"
              title={t('deckEditor.saveTooltip', 'Save slide (Ctrl+S)')}
            >
              {saveState === 'saving'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />}
              {t('common.save', 'Save')}
            </Button>
            {/* Comment-mode toggle */}
            <Button
              variant={showComments ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowComments((v) => !v)}
              className={showComments ? '' : 'text-text-tertiary hover:text-text-primary'}
              title={t('deckEditor.toggleComments', 'Comments')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t('deckEditor.comments', 'Comments')}</span>
            </Button>
            {showComments && (
              <Button
                variant={isAddingComment ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddingComment(!isAddingComment)}
                title={t('deckEditor.addCommentHint', 'Add comment (click on slide)')}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{t('deckEditor.addComment', 'Add comment')}</span>
              </Button>
            )}
            {/* Share */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShare(true)}
              title={t('deckShare.title', 'Share deck')}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('deckShare.share', 'Share')}</span>
            </Button>
            {/* Presence: show collaborators in the toolbar */}
            <div className="hidden sm:flex items-center mr-1">
              <PresenceIndicator />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(true)}
              className="text-text-tertiary hover:text-text-primary hidden md:inline-flex"
              title={t('deckEditor.shortcuts', 'Keyboard shortcuts')}
            >
              ?
            </Button>
            <ExportButton deckId={id!} currentSlideIndex={activeSlideIndex} />
            <PresentButton onBeforePresent={flushSave} />
          </div>
        </div>

        {/* ── Meta panel (collapsible) ─────────────────────────────── */}
        {showMeta && (
          <div className="border-b border-border-subtle bg-bg-sunken px-6 py-4">
            <form onSubmit={handleMetaSubmit(onMetaSubmit)} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                  {t('deckEditor.fieldDeckTitle', 'Title')}
                </label>
                <Input {...regMeta('title')} className="bg-bg-base border-border-default text-text-primary h-8 text-sm" />
              </div>
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                  {t('deckEditor.fieldStatus', 'Status')}
                </label>
                <Controller
                  control={metaControl}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-sm bg-bg-base border-border-default text-text-primary">
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
              <div className="flex-1 min-w-[180px] space-y-1">
                <label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                  {t('deckEditor.fieldProject', 'Project')}
                </label>
                <Controller
                  control={metaControl}
                  name="projectId"
                  render={({ field }) => {
                    const options = [
                      { value: '__none__', label: t('deckEditor.notLinked', 'Not linked'), keywords: [], node: <span className="text-text-tertiary italic">{t('deckEditor.notLinked', 'Not linked')}</span> },
                      ...projects.map((p) => ({
                        value: p.id,
                        label: p.description || p.number || p.id,
                        keywords: [p.number, p.description],
                        node: (
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-text-tertiary">{p.number || '—'}</span>
                            <span className="truncate">{p.description || '—'}</span>
                          </span>
                        ),
                      })),
                    ];
                    return (
                      <Combobox
                        value={field.value || '__none__'}
                        onChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        options={options}
                        placeholder={t('deckEditor.notLinked', 'Not linked')}
                        searchPlaceholder={t('deckEditor.searchProject', 'Search…')}
                        emptyText={t('deckEditor.noProjectsFound', 'No projects found')}
                        className="h-8 text-sm bg-bg-base border-border-default text-text-primary"
                      />
                    );
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowMeta(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={metaMutation.isPending} className="bg-brand-cream text-brand-black hover:bg-brand-cream/90">
                  {metaMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {t('common.save', 'Save')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Main editor area ─────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0">
          {/* Slides rail (left) */}
          <SlideRail
            slides={slides}
            activeIndex={activeSlideIndex}
            deckWidth={deck.slideWidth || CANVAS_WIDTH}
            deckHeight={deck.slideHeight || CANVAS_HEIGHT}
            onSelectSlide={selectSlide}
            onAddSlide={(templateType) => addSlideMutation.mutate(templateType)}
            onDuplicateSlide={(slideId) => duplicateSlideMutation.mutate(slideId)}
            onDeleteSlide={(slideId) => deleteSlideMutation.mutate(slideId)}
          />

          {/* Canvas center */}
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-sunken overflow-auto p-6 relative">
            {slides.length === 0 ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-text-tertiary">
                  {t('deckEditor.noSlides', 'No slides yet. Add a slide to start editing.')}
                </p>
                <Button size="sm" variant="outline" onClick={() => addSlideMutation.mutate(undefined)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t('deckEditor.addFirstSlide', 'Add first slide')}
                </Button>
              </div>
            ) : activeSlide ? (
              <>
                {/* Slide canvas */}
                <div className="shadow-2xl relative">
                  <CanvasContextMenu canvas={canvas ?? null}>
                    <SlideCanvas
                      slide={activeSlide}
                      deckWidth={deck.slideWidth || CANVAS_WIDTH}
                      deckHeight={deck.slideHeight || CANVAS_HEIGHT}
                      scale={getCanvasScale(deck.slideWidth || CANVAS_WIDTH)}
                      onElementUpdate={updateElement}
                      onElementCreate={createElement}
                    />
                  </CanvasContextMenu>
                  {/* Collaborator cursors — pointer-events-none overlay */}
                  <CollaboratorCursors currentSlideId={activeSlide.id} />
                  {/* Comment pins overlay (only interactive in comment mode) */}
                  {showComments && (
                    <CommentsOverlay slideId={activeSlide.id} onCreate={handleCreateComment} />
                  )}
                </div>

                {/* Slide nav dots */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => selectSlide((i) => Math.max(0, i - 1))}
                    disabled={activeSlideIndex === 0}
                    className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-text-tertiary tabular-nums">
                    {activeSlideIndex + 1} / {slides.length}
                  </span>
                  <button
                    onClick={() => selectSlide((i) => Math.min(slides.length - 1, i + 1))}
                    disabled={activeSlideIndex === slides.length - 1}
                    className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Properties panel (right) */}
          <div className="w-64 shrink-0 border-l border-border-subtle overflow-y-auto bg-bg-base">
            <PropertiesPanel />
          </div>

          {/* Comments panel (right-most, toggled) */}
          {showComments && activeSlide && (
            <CommentsPanel
              slideId={activeSlide.id}
              onClose={() => setShowComments(false)}
              onResolve={handleResolveComment}
              onDelete={handleDeleteComment}
            />
          )}
        </div>

        {/* Asset browser (global modal driven by store) */}
        <AssetBrowserModal />

        {/* Keyboard shortcuts modal */}
        <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Share & collaborators dialog */}
        <ShareDeckDialog deck={deck} open={showShare} onOpenChange={setShowShare} />
      </Shell>
    </AntdApp>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide rail                                                          */
/* ------------------------------------------------------------------ */

function SlideRail({
  slides, activeIndex, deckWidth, deckHeight,
  onSelectSlide, onAddSlide, onDuplicateSlide, onDeleteSlide,
}: {
  slides: DeckSlide[];
  activeIndex: number;
  deckWidth: number;
  deckHeight: number;
  onSelectSlide: (i: number) => void;
  onAddSlide: (templateType?: SlideTemplateType) => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
}) {
  const { t } = useTranslation();
  const THUMB_W = 128;
  const THUMB_H = Math.round(THUMB_W * (deckHeight / deckWidth));
  const scale = THUMB_W / deckWidth;

  return (
    <div className="w-44 shrink-0 border-r border-border-subtle bg-bg-base flex flex-col overflow-y-auto">
      <div className="flex-1 py-3 space-y-2 px-2">
        {slides.map((slide, idx) => (
          <SlideContextMenu
            key={slide.id}
            onDuplicate={() => onDuplicateSlide(slide.id)}
            onDelete={() => onDeleteSlide(slide.id)}
          >
            <button
              onClick={() => onSelectSlide(idx)}
              className={`w-full rounded border-2 transition-colors text-left ${
                idx === activeIndex
                  ? 'border-brand-cream'
                  : 'border-border-subtle hover:border-border-default'
              }`}
              style={{ height: THUMB_H + 20 }}
            >
              {/* Thumbnail area — colour from slide background */}
              <div
                style={{
                  width: '100%',
                  height: THUMB_H,
                  background: slide.backgroundColor || '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {slide.backgroundImage && (
                  <img
                    src={slide.backgroundImage}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 10, color: '#888', fontFamily: 'sans-serif' }}>
                    {slide.title || `Slide ${idx + 1}`}
                  </span>
                </div>
              </div>
              {/* Slide number */}
              <div className="flex items-center justify-center h-5 text-[10px] text-text-tertiary tabular-nums">
                {idx + 1}
              </div>
            </button>
          </SlideContextMenu>
        ))}
      </div>

      {/* Add slide */}
      <div className="px-2 py-3 border-t border-border-subtle">
        <NewSlideButton
          onAddSlide={(templateType) => onAddSlide(templateType)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getCanvasScale(deckWidth: number): number {
  const maxW = Math.min(
    typeof window !== 'undefined' ? window.innerWidth - 44 - 256 - 48 : 900,
    1200,
  );
  return Math.min(1, maxW / deckWidth);
}

/* ------------------------------------------------------------------ */
/*  Save-state indicator                                               */
/* ------------------------------------------------------------------ */

function SaveStateIndicator({
  saveState, isDirty, t,
}: {
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
  t: (key: string, fallback: string) => string;
}) {
  let icon: React.ReactNode;
  let label: string;
  let color: string;

  if (saveState === 'saving') {
    icon = <Loader2 className="h-3 w-3 animate-spin" />;
    label = t('deckEditor.saving', 'Saving…');
    color = 'text-text-tertiary';
  } else if (saveState === 'error') {
    icon = <CircleDashed className="h-3 w-3" />;
    label = t('deckEditor.saveFailed', 'Save failed');
    color = 'text-danger';
  } else if (isDirty) {
    icon = <CircleDashed className="h-3 w-3" />;
    label = t('deckEditor.unsaved', 'Unsaved changes');
    color = 'text-text-tertiary';
  } else if (saveState === 'saved') {
    icon = <Check className="h-3 w-3" />;
    label = t('deckEditor.saved', 'Saved');
    color = 'text-success';
  } else {
    icon = <Check className="h-3 w-3" />;
    label = t('deckEditor.saved', 'Saved');
    color = 'text-text-tertiary';
  }

  return (
    <span className={`hidden md:inline-flex items-center gap-1.5 text-xs ${color}`}>
      {icon}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell                                                               */
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
      <div className="flex flex-col h-full">
        {children}
      </div>
    </AppShell>
  );
}
