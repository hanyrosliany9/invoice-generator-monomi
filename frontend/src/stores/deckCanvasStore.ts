import { create } from 'zustand';
import type { Canvas as FabricCanvas, FabricObject } from 'fabric';

interface CanvasHistoryEntry {
  json: string;
  timestamp: number;
}

interface DeckCanvasState {
  // Canvas instance
  canvas: FabricCanvas | null;
  setCanvas: (canvas: FabricCanvas | null) => void;

  // Selection
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[]) => void;

  // History for undo/redo — partitioned per slide so an undo can never load
  // one slide's snapshot onto another slide's canvas. `activeHistorySlideId`
  // is the slide all pushHistory/undo/redo calls currently target; SlideCanvas
  // sets it (via ensureSlideHistory) whenever it finishes loading a slide.
  historyBySlide: Record<string, CanvasHistoryEntry[]>;
  historyIndexBySlide: Record<string, number>;
  activeHistorySlideId: string | null;
  // Point history at a slide, seeding a baseline snapshot the first time.
  ensureSlideHistory: (slideId: string, json: string) => void;
  pushHistory: (json: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Clipboard
  clipboard: FabricObject[] | null;
  setClipboard: (objects: FabricObject[] | null) => void;

  // Zoom — the toolbar drives these; DeckCanvas subscribes to `zoom` and applies
  // it to the fabric canvas (setZoom + viewportTransform recentre). zoomToFit is
  // resolved inside DeckCanvas (it needs the live viewport size), so the store
  // just flips a request flag the canvas observes.
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  // Bumped by zoomToFit(); DeckCanvas watches it to run a fit pass with the real
  // available viewport (which only the component knows).
  fitRequest: number;

  // Dirty state (unsaved changes)
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;

  // True while SlideCanvas is programmatically (re)loading elements. Used to
  // suppress autosave so loading a slide doesn't trigger a save of itself.
  isLoadingElements: boolean;
  setIsLoadingElements: (loading: boolean) => void;

  // True while applying an incoming remote canvas snapshot. Suppresses autosave
  // so a receiver doesn't persist (and race on) a change another editor made.
  isApplyingRemote: boolean;
  setIsApplyingRemote: (applying: boolean) => void;
}

export const useDeckCanvasStore = create<DeckCanvasState>((set, get) => ({
  // Canvas
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),

  // Selection
  selectedObjectIds: [],
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),

  // History (per-slide)
  historyBySlide: {},
  historyIndexBySlide: {},
  activeHistorySlideId: null,

  ensureSlideHistory: (slideId, json) => {
    const { historyBySlide, historyIndexBySlide } = get();
    if (historyBySlide[slideId]) {
      // Slide already has a stack — just retarget history to it.
      set({ activeHistorySlideId: slideId });
      return;
    }
    set({
      activeHistorySlideId: slideId,
      historyBySlide: {
        ...historyBySlide,
        [slideId]: [{ json, timestamp: Date.now() }],
      },
      historyIndexBySlide: { ...historyIndexBySlide, [slideId]: 0 },
    });
  },

  pushHistory: (json) => {
    const { historyBySlide, historyIndexBySlide, activeHistorySlideId } = get();
    // No active slide yet (e.g. canvas init before the first slide loads) —
    // ignore so we don't pollute a slide's stack with an empty canvas.
    if (!activeHistorySlideId) return;
    const history = historyBySlide[activeHistorySlideId] || [];
    const index = historyIndexBySlide[activeHistorySlideId] ?? -1;
    // Drop any redo branch, then append.
    const newHistory = history.slice(0, index + 1);
    newHistory.push({ json, timestamp: Date.now() });
    // Limit history to 50 entries per slide.
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({
      historyBySlide: { ...historyBySlide, [activeHistorySlideId]: newHistory },
      historyIndexBySlide: {
        ...historyIndexBySlide,
        [activeHistorySlideId]: newHistory.length - 1,
      },
      isDirty: true,
    });
  },

  undo: () => {
    const { historyBySlide, historyIndexBySlide, activeHistorySlideId, canvas } = get();
    if (!activeHistorySlideId || !canvas) return;
    const history = historyBySlide[activeHistorySlideId] || [];
    const index = historyIndexBySlide[activeHistorySlideId] ?? -1;
    if (index > 0) {
      const newIndex = index - 1;
      const entry = history[newIndex];
      canvas.loadFromJSON(JSON.parse(entry.json)).then(() => {
        canvas.renderAll();
        set({
          historyIndexBySlide: {
            ...get().historyIndexBySlide,
            [activeHistorySlideId]: newIndex,
          },
        });
      });
    }
  },

  redo: () => {
    const { historyBySlide, historyIndexBySlide, activeHistorySlideId, canvas } = get();
    if (!activeHistorySlideId || !canvas) return;
    const history = historyBySlide[activeHistorySlideId] || [];
    const index = historyIndexBySlide[activeHistorySlideId] ?? -1;
    if (index < history.length - 1) {
      const newIndex = index + 1;
      const entry = history[newIndex];
      canvas.loadFromJSON(JSON.parse(entry.json)).then(() => {
        canvas.renderAll();
        set({
          historyIndexBySlide: {
            ...get().historyIndexBySlide,
            [activeHistorySlideId]: newIndex,
          },
        });
      });
    }
  },

  canUndo: () => {
    const { historyIndexBySlide, activeHistorySlideId } = get();
    if (!activeHistorySlideId) return false;
    return (historyIndexBySlide[activeHistorySlideId] ?? -1) > 0;
  },
  canRedo: () => {
    const { historyBySlide, historyIndexBySlide, activeHistorySlideId } = get();
    if (!activeHistorySlideId) return false;
    const history = historyBySlide[activeHistorySlideId] || [];
    return (historyIndexBySlide[activeHistorySlideId] ?? -1) < history.length - 1;
  },

  // Clipboard
  clipboard: null,
  setClipboard: (objects) => set({ clipboard: objects }),

  // Zoom — clamp to the same 0.1–5 range DeckCanvas enforces so the displayed
  // value and the applied transform never diverge.
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.min(5, Math.max(0.1, zoom)) }),
  zoomIn: () => set({ zoom: Math.min(5, get().zoom * 1.2) }),
  zoomOut: () => set({ zoom: Math.max(0.1, get().zoom / 1.2) }),
  zoomToFit: () => set({ fitRequest: get().fitRequest + 1 }),
  resetZoom: () => set({ zoom: 1 }),
  fitRequest: 0,

  // Dirty
  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),

  // Loading guard
  isLoadingElements: false,
  setIsLoadingElements: (loading) => set({ isLoadingElements: loading }),

  // Remote-apply guard
  isApplyingRemote: false,
  setIsApplyingRemote: (applying) => set({ isApplyingRemote: applying }),
}));
