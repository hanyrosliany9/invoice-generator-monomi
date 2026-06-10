import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  FileText,
  ArrowLeft, Save, Loader2, ChevronLeft, ChevronRight, Plus,
  Settings, Check, CircleDashed, Share2, MessageSquare,
  FileText as NotesIcon, Search,
} from 'lucide-react';
import type { Canvas as FabricCanvas } from 'fabric';
import { App as AntdApp } from 'antd';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
import {
  fabricObjectToElement,
  generateElementId,
  buildTableObject,
  buildChartObject,
  buildIconObject,
} from '@/utils/deckCanvasUtils';
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
  SlideThumbnail,
  SpeakerNotesPanel,
  ZoomControls,
  FindReplacePanel,
} from '@/components/deck';
import IconPicker from '@/components/deck/IconPicker';
import { CommentsOverlay } from '@/components/deck/collaboration/CommentsOverlay';
import { CommentsPanel } from '@/components/deck/collaboration/CommentsPanel';
import { PresentationView } from '@/components/deck/presentation/PresentationView';
import { useDeckCanvasStore } from '@/stores/deckCanvasStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useCollaborationStore, mapApiComment } from '@/stores/collaborationStore';
import { useDeckKeyboardShortcuts } from '@/hooks/useDeckKeyboardShortcuts';
import { getTemplate } from '@/templates/templateDefinitions';
import { templateToElements } from '@/utils/templateToElements';
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

const TRANSITION_OPTIONS = [
  { value: 'none',       label: 'None' },
  { value: 'fade',       label: 'Fade' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right','label': 'Slide Right' },
  { value: 'zoom',       label: 'Zoom' },
] as const;
type TransitionType = typeof TRANSITION_OPTIONS[number]['value'];

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
  const [showNotes, setShowNotes] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find');
  const [showIconPicker, setShowIconPicker] = useState(false);
  // Inline title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [inlineTitleValue, setInlineTitleValue] = useState('');
  const inlineTitleInputRef = useRef<HTMLInputElement | null>(null);
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
  const pushHistory = useDeckCanvasStore((s) => s.pushHistory);
  const { isPresenting, startPresentation, endPresentation } = usePresentationStore();

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
      const savedSlide = await elementsApi.bulkSaveForSlide(slideId, elements);
      setIsDirty(false);
      setSaveState('saved');
      // Write the saved elements back into local slides state so that switching
      // away and back to this slide doesn't reload stale page-load data.
      // Because SlideCanvas keys its element-loading effect on slide.id (not
      // elements), updating elements here will NOT trigger a canvas reload —
      // safe to do for both silent autosave and manual save.
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slideId
            ? { ...s, elements: savedSlide.elements ?? s.elements }
            : s,
        ),
      );
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
      // Skip while SlideCanvas is (re)loading elements or while applying a
      // remote snapshot — those programmatic add/remove events must not trigger
      // a save of the slide being loaded / received.
      const cs = useDeckCanvasStore.getState();
      if (cs.isLoadingElements || cs.isApplyingRemote) return;
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

  // NOTE: in-app navigation flushing intentionally NOT done via useBlocker —
  // this app uses a declarative BrowserRouter, not a data router, so useBlocker
  // throws ("must be used within a data router"). The main data-loss paths
  // (slide switch / add / duplicate / delete) already flush the pending save
  // before changing slides, and beforeunload covers tab close/refresh.

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

  /* ---------- Find / Replace keyboard shortcuts (Ctrl+F, Ctrl+H) ---------- */
  useEffect(() => {
    const handleFindReplaceKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      const key = e.key.toLowerCase();

      if (key === 'f') {
        e.preventDefault();
        setFindReplaceMode('find');
        setShowFindReplace(true);
      } else if (key === 'h') {
        e.preventDefault();
        setFindReplaceMode('replace');
        setShowFindReplace(true);
      }
    };

    window.addEventListener('keydown', handleFindReplaceKey);
    return () => window.removeEventListener('keydown', handleFindReplaceKey);
  }, []);

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
    // Create the slide, then scaffold the template's predefined elements
    // through the bulk-save API (percent-based, same conventions the canvas
    // saves with). Persisting data directly — rather than painting the fabric
    // canvas and waiting for autosave — avoids racing SlideCanvas's async
    // slide-load, which clears the canvas when the active slide switches.
    mutationFn: async (templateType?: SlideTemplateType) => {
      // Flush any pending edits on the current slide BEFORE creating the new
      // one so the debounce timer can't fire against the wrong slide later.
      await flushSave();

      const created = await slidesApi.create({
        deckId:   id!,
        template: (templateType ?? 'BLANK') as SlideTemplate,
        order:    slides.length,
      });

      const def = getTemplate(templateType ?? 'BLANK');
      if (!def) return created;

      let slide = created;
      if (def.elements.length > 0) {
        const canvasWidth = deckWidth * getCanvasScale(deckWidth);
        const withElements = await elementsApi.bulkSaveForSlide(
          created.id,
          templateToElements(def, canvasWidth),
        );
        slide = { ...slide, elements: withElements.elements ?? [] };
      }
      if (
        def.backgroundColor &&
        def.backgroundColor.toLowerCase() !== (created.backgroundColor ?? '#ffffff').toLowerCase()
      ) {
        await slidesApi.update(created.id, { backgroundColor: def.backgroundColor });
        slide = { ...slide, backgroundColor: def.backgroundColor };
      }
      return slide;
    },
    onSuccess: (newSlide) => {
      setSlides((prev) => [...prev, newSlide]);
      setActiveSlideIndex(slides.length);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      // Flush pending edits so the duplicated slide gets the latest content.
      await flushSave();
      return slidesApi.duplicate(slideId);
    },
    onSuccess: (newSlide) => {
      // Insert the duplicated slide immediately after the original in local
      // state and switch to it, instead of doing a full deck invalidation
      // (which would clobber any canvas state that's already been written back).
      setSlides((prev) => {
        const srcIdx = prev.findIndex((s) => s.id === newSlide.id.replace(/-copy$/, '') /* best-effort */);
        const insertAt = srcIdx >= 0 ? srcIdx + 1 : prev.length;
        const next = [...prev];
        next.splice(insertAt, 0, newSlide);
        return next;
      });
      // Fall back to query invalidation so the order + IDs are always correct.
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      toast.success(t('deckEditor.slideDuplicated', 'Slide duplicated'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      // Flush any pending edits on the current slide first. If the slide being
      // deleted IS the active slide the save is a no-op once the slide is gone,
      // but for adjacent slides we must not lose the in-flight timer data.
      await flushSave();
      return slidesApi.delete(slideId);
    },
    onSuccess: (_, slideId) => {
      setSlides((prev) => {
        const next = prev.filter((s) => s.id !== slideId);
        setActiveSlideIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ---------- slide reorder (drag-and-drop) ---------- */
  const reorderSlides = useCallback(async (newOrder: DeckSlide[]) => {
    // Flush pending autosave so the API isn't racing the reorder.
    await flushSave();
    // Optimistically update local state immediately.
    setSlides(newOrder);
    // Fix the active index to point at the same slide after reorder.
    const currentId = slides[activeSlideIndex]?.id;
    if (currentId) {
      const newIdx = newOrder.findIndex((s) => s.id === currentId);
      if (newIdx >= 0) setActiveSlideIndex(newIdx);
    }
    try {
      await slidesApi.reorder(id!, newOrder.map((s) => s.id));
    } catch (err) {
      // Rollback to server state on error
      toast.error(err instanceof Error ? err.message : t('deckEditor.reorderError', 'Failed to reorder slides'));
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
    }
  }, [flushSave, slides, activeSlideIndex, id, queryClient, t]);

  /* ---------- per-slide notes (speaker notes debounce-save) ---------- */
  const handleSlideNotesChange = useCallback((slideId: string, notes: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, notes } : s)),
    );
  }, []);

  /* ---------- per-slide transition ---------- */
  const handleTransitionChange = useCallback(
    async (slideId: string, transition: string, transitionDuration?: number) => {
      // Optimistic local update
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slideId
            ? { ...s, transition, transitionDuration: transitionDuration ?? s.transitionDuration }
            : s,
        ),
      );
      try {
        await slidesApi.update(slideId, {
          transition,
          ...(transitionDuration !== undefined ? { transitionDuration } : {}),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('deckEditor.transitionError', 'Failed to save transition'));
      }
    },
    [t],
  );

  /* ---------- inline deck title editing ---------- */
  const startEditingTitle = useCallback(() => {
    setInlineTitleValue(deck?.title ?? '');
    setIsEditingTitle(true);
  }, [deck?.title]);

  const commitTitleEdit = useCallback(async () => {
    setIsEditingTitle(false);
    const trimmed = inlineTitleValue.trim();
    if (!trimmed || trimmed === deck?.title) return;
    try {
      await decksApi.update(id!, { title: trimmed });
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      toast.success(t('deckEditor.titleUpdated', 'Deck title updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deckEditor.titleUpdateError', 'Failed to update title'));
    }
  }, [inlineTitleValue, deck?.title, id, queryClient, t]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commitTitleEdit();
      } else if (e.key === 'Escape') {
        setIsEditingTitle(false);
      }
    },
    [commitTitleEdit],
  );

  // Focus the input as soon as it appears
  useEffect(() => {
    if (isEditingTitle && inlineTitleInputRef.current) {
      inlineTitleInputRef.current.select();
    }
  }, [isEditingTitle]);

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

  /* ---------- insert: Table, Chart, Icon ---------- */

  // Helpers: compute the canvas dimensions at the current scale (same formula
  // saveSlide uses so percent ↔ pixel conversion is consistent).
  const insertCanvasWidth = deckWidth * getCanvasScale(deckWidth);
  const insertCanvasHeight = deckHeight * getCanvasScale(deckWidth);

  const handleInsertTable = useCallback(async () => {
    if (!canvas) return;
    const defaultWidthPx = Math.round(insertCanvasWidth * 0.5);
    const defaultHeightPx = Math.round(insertCanvasHeight * 0.35);
    const content = {
      rows: 3,
      cols: 3,
      cells: [
        ['Header 1', 'Header 2', 'Header 3'],
        ['Cell A',   'Cell B',   'Cell C'],
        ['Cell D',   'Cell E',   'Cell F'],
      ],
      headerRow: true,
      borderColor: '#d1d5db',
      headerBg: '#374151',
      textColor: '#111827',
      fontSize: 14,
    };
    const obj = await buildTableObject(content, defaultWidthPx, defaultHeightPx, {});
    const center = canvas.getCenter();
    obj.set({
      left: center.left,
      top: center.top,
      originX: 'center',
      originY: 'center',
    });
    obj.set('id', generateElementId());
    obj.set('elementType', 'TABLE');
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementType'])));
  }, [canvas, insertCanvasWidth, insertCanvasHeight, pushHistory]);

  const handleInsertChart = useCallback(async () => {
    if (!canvas) return;
    const defaultWidthPx = Math.round(insertCanvasWidth * 0.55);
    const defaultHeightPx = Math.round(insertCanvasHeight * 0.45);
    const content = {
      chartType: 'bar' as const,
      labels: ['Jan', 'Feb', 'Mar'],
      series: [
        { name: 'Series 1', color: '#6366f1', values: [30, 55, 40] },
      ],
      title: 'Chart Title',
      showLegend: true,
    };
    const obj = await buildChartObject(content, defaultWidthPx, defaultHeightPx, {});
    const center = canvas.getCenter();
    obj.set({
      left: center.left,
      top: center.top,
      originX: 'center',
      originY: 'center',
    });
    obj.set('id', generateElementId());
    obj.set('elementType', 'CHART');
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementType'])));
  }, [canvas, insertCanvasWidth, insertCanvasHeight, pushHistory]);

  const handleInsertIcon = useCallback(async (iconData: { svg: string; name?: string }) => {
    if (!canvas) return;
    const defaultWidthPx = 80;
    const defaultHeightPx = 80;
    const content = {
      svg: iconData.svg,
      name: iconData.name,
      color: '#374151',
    };
    const obj = await buildIconObject(content, defaultWidthPx, defaultHeightPx, {});
    const center = canvas.getCenter();
    obj.set({
      left: center.left,
      top: center.top,
      originX: 'center',
      originY: 'center',
    });
    obj.set('id', generateElementId());
    obj.set('elementType', 'ICON');
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementType'])));
    setShowIconPicker(false);
  }, [canvas, pushHistory]);

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
          {/* Left: back + inline-editable title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/decks"
              className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('deckEditor.backToDecks', 'Back')}
            </Link>
            <span className="text-border-subtle select-none hidden sm:block">|</span>
            {/* Inline title: click to edit, Enter/blur to save, Escape to cancel */}
            {isEditingTitle ? (
              <input
                ref={inlineTitleInputRef}
                value={inlineTitleValue}
                onChange={(e) => setInlineTitleValue(e.target.value)}
                onBlur={() => void commitTitleEdit()}
                onKeyDown={handleTitleKeyDown}
                className="text-sm font-medium bg-bg-sunken border border-brand-cream rounded px-2 h-7 text-text-primary focus:outline-none hidden sm:block"
                style={{ minWidth: 120, maxWidth: 260 }}
              />
            ) : (
              <button
                onClick={startEditingTitle}
                className="text-sm font-medium text-text-primary truncate hidden sm:block hover:text-text-secondary transition-colors max-w-[200px]"
                title={t('deckEditor.clickToRename', 'Click to rename')}
              >
                {deck.title}
              </button>
            )}
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
                {/* ── Table insert ── */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-tertiary hover:text-text-primary"
                  title={t('deckEditor.insertTable', 'Insert Table')}
                  onClick={() => void handleInsertTable()}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="1" width="14" height="14" rx="1" />
                    <line x1="1" y1="5.5" x2="15" y2="5.5" />
                    <line x1="1" y1="10.5" x2="15" y2="10.5" />
                    <line x1="5.5" y1="1" x2="5.5" y2="15" />
                    <line x1="10.5" y1="1" x2="10.5" y2="15" />
                  </svg>
                  <span className="hidden lg:inline">{t('deckEditor.table', 'Table')}</span>
                </Button>
                {/* ── Chart insert ── */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-tertiary hover:text-text-primary"
                  title={t('deckEditor.insertChart', 'Insert Chart')}
                  onClick={() => void handleInsertChart()}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="15" x2="1" y2="1" />
                    <line x1="1" y1="15" x2="15" y2="15" />
                    <rect x="3" y="9" width="2.5" height="6" fill="currentColor" stroke="none" />
                    <rect x="6.75" y="5" width="2.5" height="10" fill="currentColor" stroke="none" />
                    <rect x="10.5" y="7" width="2.5" height="8" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="hidden lg:inline">{t('deckEditor.chart', 'Chart')}</span>
                </Button>
                {/* ── Icon insert ── */}
                <div className="relative">
                  <Button
                    variant={showIconPicker ? 'default' : 'ghost'}
                    size="sm"
                    className={showIconPicker ? '' : 'text-text-tertiary hover:text-text-primary'}
                    title={t('deckEditor.insertIcon', 'Insert Icon')}
                    onClick={() => setShowIconPicker((v) => !v)}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden lg:inline">{t('deckEditor.icon', 'Icon')}</span>
                  </Button>
                  {showIconPicker && (
                    <div className="absolute top-full left-0 mt-1 z-50">
                      <IconPicker
                        onSelect={(icon: { svg: string; name?: string }) => void handleInsertIcon(icon)}
                        onClose={() => setShowIconPicker(false)}
                      />
                    </div>
                  )}
                </div>
                <AlignmentTools canvas={canvas} />
              </>
            )}
            {/* Find & Replace toggle */}
            <Button
              variant={showFindReplace ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                if (showFindReplace) {
                  setShowFindReplace(false);
                } else {
                  setFindReplaceMode('find');
                  setShowFindReplace(true);
                }
              }}
              className={showFindReplace ? '' : 'text-text-tertiary hover:text-text-primary'}
              title={t('deckEditor.findReplace', 'Find & Replace (Ctrl+F / Ctrl+H)')}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
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
            {/* Speaker notes toggle */}
            <Button
              variant={showNotes ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
              className={showNotes ? '' : 'text-text-tertiary hover:text-text-primary'}
              title={t('deckEditor.toggleNotes', 'Speaker Notes')}
            >
              <NotesIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t('deckEditor.speakerNotes', 'Notes')}</span>
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
        <div className="flex-1 flex min-h-0 flex-col">
          <div className="flex-1 flex min-h-0">
            {/* Slides rail (left) */}
            <SlideRail
              slides={slides}
              activeIndex={activeSlideIndex}
              deckId={id!}
              deckWidth={deck.slideWidth || CANVAS_WIDTH}
              deckHeight={deck.slideHeight || CANVAS_HEIGHT}
              onSelectSlide={selectSlide}
              onAddSlide={(templateType) => addSlideMutation.mutate(templateType)}
              onDuplicateSlide={(slideId) => duplicateSlideMutation.mutate(slideId)}
              onDeleteSlide={(slideId) => deleteSlideMutation.mutate(slideId)}
              onReorderSlides={reorderSlides}
            />

            {/* Canvas center */}
            <div className="flex-1 flex flex-col items-center justify-start bg-bg-sunken overflow-auto p-6 relative">
              {slides.length === 0 ? (
                <div className="text-center space-y-3 mt-20">
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
                  {/* Per-slide transition selector */}
                  <div className="flex items-center gap-2 mb-3 w-full max-w-[800px]">
                    <span className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium">
                      {t('deckEditor.transition', 'Transition')}
                    </span>
                    <select
                      value={activeSlide.transition ?? 'none'}
                      onChange={(e) =>
                        void handleTransitionChange(activeSlide.id, e.target.value as TransitionType)
                      }
                      className="text-xs h-6 rounded border border-border-subtle bg-bg-base text-text-secondary px-1.5 focus:outline-none focus:ring-1 focus:ring-brand-cream"
                    >
                      {TRANSITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {activeSlide.transition && activeSlide.transition !== 'none' && (
                      <>
                        <span className="text-[10px] text-text-tertiary">
                          {t('deckEditor.duration', 'Duration')}
                        </span>
                        <input
                          type="number"
                          min={100}
                          max={2000}
                          step={100}
                          value={activeSlide.transitionDuration ?? 500}
                          onChange={(e) =>
                            void handleTransitionChange(
                              activeSlide.id,
                              activeSlide.transition ?? 'none',
                              parseInt(e.target.value, 10),
                            )
                          }
                          className="text-xs h-6 rounded border border-border-subtle bg-bg-base text-text-secondary px-1.5 w-16 focus:outline-none focus:ring-1 focus:ring-brand-cream"
                        />
                        <span className="text-[10px] text-text-tertiary">ms</span>
                      </>
                    )}
                  </div>

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

                  {/* Bottom bar: slide nav + zoom controls */}
                  <div className="flex items-center gap-4 mt-4">
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

                    {/* Zoom controls */}
                    <ZoomControls className="ml-2" />
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

          {/* Speaker notes panel — below the canvas row, collapsible */}
          <SpeakerNotesPanel
            activeSlide={activeSlide}
            onNotesChange={handleSlideNotesChange}
            open={showNotes}
            onToggle={() => setShowNotes((v) => !v)}
          />
        </div>

        {/* Asset browser (global modal driven by store) */}
        <AssetBrowserModal />

        {/* Keyboard shortcuts modal */}
        <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Share & collaborators dialog */}
        <ShareDeckDialog deck={deck} open={showShare} onOpenChange={setShowShare} />

        {/* Find & Replace panel */}
        <FindReplacePanel
          open={showFindReplace}
          mode={findReplaceMode}
          slides={slides}
          setSlides={setSlides}
          activeSlideIndex={activeSlideIndex}
          canvas={canvas ?? null}
          onSelectSlide={selectSlide}
          onClose={() => setShowFindReplace(false)}
        />
      </Shell>
    </AntdApp>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide rail — with drag-to-reorder (@dnd-kit) + real thumbnails     */
/* ------------------------------------------------------------------ */

interface SlideRailProps {
  slides: DeckSlide[];
  activeIndex: number;
  deckId: string;
  deckWidth: number;
  deckHeight: number;
  onSelectSlide: (i: number) => void;
  onAddSlide: (templateType?: SlideTemplateType) => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onReorderSlides: (newOrder: DeckSlide[]) => Promise<void>;
}

function SlideRail({
  slides, activeIndex, deckWidth, deckHeight,
  onSelectSlide, onAddSlide, onDuplicateSlide, onDeleteSlide, onReorderSlides,
}: SlideRailProps) {
  const THUMB_W = 128;
  const THUMB_H = Math.round(THUMB_W * (deckHeight / deckWidth));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 6px movement before activating drag, so clicks still select.
        distance: 6,
      },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(slides, oldIndex, newIndex);
      void onReorderSlides(reordered);
    },
    [slides, onReorderSlides],
  );

  return (
    <div className="w-44 shrink-0 border-r border-border-subtle bg-bg-base flex flex-col overflow-y-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 py-3 space-y-2 px-2">
            {slides.map((slide, idx) => (
              <SortableSlideThumbnailItem
                key={slide.id}
                slide={slide}
                index={idx}
                isActive={idx === activeIndex}
                thumbW={THUMB_W}
                thumbH={THUMB_H}
                deckWidth={deckWidth}
                deckHeight={deckHeight}
                onSelect={() => onSelectSlide(idx)}
                onDuplicate={() => onDuplicateSlide(slide.id)}
                onDelete={() => onDeleteSlide(slide.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
/*  Single sortable item in the slide rail                              */
/* ------------------------------------------------------------------ */

interface SortableSlideThumbnailItemProps {
  slide: DeckSlide;
  index: number;
  isActive: boolean;
  thumbW: number;
  thumbH: number;
  deckWidth: number;
  deckHeight: number;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableSlideThumbnailItem({
  slide, index, isActive,
  thumbW, thumbH, deckWidth, deckHeight,
  onSelect, onDuplicate, onDelete,
}: SortableSlideThumbnailItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: dndTransition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: dndTransition ?? undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SlideContextMenu
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      >
        <button
          onClick={onSelect}
          className={`w-full rounded border-2 transition-colors text-left focus:outline-none ${
            isActive
              ? 'border-brand-cream'
              : 'border-border-subtle hover:border-border-default'
          }`}
          style={{ height: thumbH + 20, cursor: isDragging ? 'grabbing' : undefined }}
        >
          {/* Real slide thumbnail */}
          <SlideThumbnail
            slide={slide}
            width={thumbW}
            height={thumbH}
            deckWidth={deckWidth}
            deckHeight={deckHeight}
          />
          {/* Slide number */}
          <div className="flex items-center justify-center h-5 text-[10px] text-text-tertiary tabular-nums">
            {index + 1}
          </div>
        </button>
      </SlideContextMenu>
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
      topbar={{}}
    >
      <div className="flex flex-col h-full">
        {children}
      </div>
    </AppShell>
  );
}
