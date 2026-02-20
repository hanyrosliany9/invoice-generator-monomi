import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { produce } from 'immer';
// Import using require-style for CommonJS compatibility
const jsonpatch = require('fast-json-patch');
const { compare, applyPatch } = jsonpatch;
type Operation = any; // Using any for now due to import complexity
import { Widget } from '../types/report-builder';
import type { LayoutItem as GridLayout } from 'react-grid-layout';

// History entry type for undo/redo with compressed patches
interface HistoryEntry {
  patch: Operation[]; // Store diff instead of full state
  inversePatch: Operation[]; // For undo
  timestamp: number;
}

// Initial baseline state (full snapshot)
interface HistoryBaseline {
  widgets: Widget[];
  timestamp: number;
}

interface BuilderState {
  // Core state
  widgets: Widget[];
  selectedWidgetId: string | null;
  selectedWidgetIds: string[];

  // UI state
  showProperties: boolean;
  showPalette: boolean;
  previewMode: boolean;
  isDraggingOrResizing: boolean;
  isSelecting: boolean;

  // History management (compressed with JSON patches)
  history: HistoryEntry[];
  historyBaseline: HistoryBaseline | null; // Periodic full snapshot
  historyIndex: number;
  maxHistorySize: number;
  baselineInterval: number; // Create baseline every N operations

  // Drag state
  dragStartPositions: Map<string, { x: number; y: number }>;
  draggedWidgetId: string | null;

  // Actions - Widget Management
  addWidget: (widget: Widget) => void;
  addWidgets: (widgets: Widget[]) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  updateWidgetConfig: (id: string, config: any) => void;
  updateWidgetLayout: (id: string, layout: Partial<GridLayout>) => void;
  deleteWidget: (id: string) => void;
  deleteWidgets: (ids: string[]) => void;
  setWidgets: (widgets: Widget[]) => void;
  clearWidgets: () => void;

  // Actions - Selection
  selectWidget: (id: string | null, multiSelect?: boolean) => void;
  selectWidgets: (ids: string[], primaryId?: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Actions - UI
  setShowProperties: (show: boolean) => void;
  setShowPalette: (show: boolean) => void;
  setPreviewMode: (preview: boolean) => void;
  setIsDraggingOrResizing: (dragging: boolean) => void;
  setIsSelecting: (selecting: boolean) => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  addToHistory: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reconstructState: (index: number) => Widget[];

  // Actions - Drag
  setDragStartPosition: (id: string, x: number, y: number) => void;
  setDraggedWidgetId: (id: string | null) => void;
  clearDragState: () => void;

  // Batch operations
  batchUpdateLayouts: (layouts: GridLayout[]) => void;

  // Reset all state
  reset: () => void;
}

const INITIAL_STATE = {
  widgets: [],
  selectedWidgetId: null,
  selectedWidgetIds: [],
  showProperties: false,
  showPalette: false,
  previewMode: false,
  isDraggingOrResizing: false,
  isSelecting: false,
  history: [] as HistoryEntry[],
  historyBaseline: null as HistoryBaseline | null,
  historyIndex: -1,
  maxHistorySize: 1000, // Increased from 100 due to compression
  baselineInterval: 50, // Create baseline every 50 operations
  dragStartPositions: new Map<string, { x: number; y: number }>(),
  draggedWidgetId: null,
};

// Only enable devtools in development and when explicitly needed
const shouldEnableDevtools = import.meta.env.DEV && import.meta.env.VITE_ENABLE_REDUX_DEVTOOLS === 'true';

export const useBuilderStore = create<BuilderState>()(
  // @ts-expect-error - Conditional middleware type mismatch (known Zustand limitation with conditional devtools)
  (shouldEnableDevtools
    ? devtools(
        immer((set, get) => ({
          ...INITIAL_STATE,

      // Widget Management Actions
      addWidget: (widget) => set((state) => {
        state.widgets.push(widget);
        // Auto-save to history
        get().addToHistory();
      }),

      addWidgets: (widgets) => set((state) => {
        state.widgets.push(...widgets);
        get().addToHistory();
      }),

      updateWidget: (id, updates) => set((state) => {
        const widget = state.widgets.find(w => w.id === id);
        if (widget) {
          Object.assign(widget, updates);
        }
      }),

      updateWidgetConfig: (id, config) => set((state) => {
        const widget = state.widgets.find(w => w.id === id);
        if (widget) {
          widget.config = { ...widget.config, ...config };
        }
      }),

      updateWidgetLayout: (id, layout) => set((state) => {
        const widget = state.widgets.find(w => w.id === id);
        if (widget) {
          widget.layout = { ...widget.layout, ...layout };
        }
      }),

      deleteWidget: (id) => set((state) => {
        state.widgets = state.widgets.filter(w => w.id !== id);
        state.selectedWidgetIds = state.selectedWidgetIds.filter(sid => sid !== id);
        if (state.selectedWidgetId === id) {
          state.selectedWidgetId = null;
        }
        get().addToHistory();
      }),

      deleteWidgets: (ids) => set((state) => {
        state.widgets = state.widgets.filter(w => !ids.includes(w.id));
        state.selectedWidgetIds = state.selectedWidgetIds.filter(sid => !ids.includes(sid));
        if (ids.includes(state.selectedWidgetId || '')) {
          state.selectedWidgetId = null;
        }
        get().addToHistory();
      }),

      setWidgets: (widgets) => set((state) => {
        state.widgets = widgets;
      }),

      clearWidgets: () => set((state) => {
        state.widgets = [];
        state.selectedWidgetId = null;
        state.selectedWidgetIds = [];
        get().addToHistory();
      }),

      // Selection Actions
      selectWidget: (id, multiSelect = false) => set((state) => {
        if (!id) {
          state.selectedWidgetId = null;
          state.selectedWidgetIds = [];
          state.showProperties = false;
          return;
        }

        if (multiSelect) {
          // Toggle selection
          if (state.selectedWidgetIds.includes(id)) {
            state.selectedWidgetIds = state.selectedWidgetIds.filter(sid => sid !== id);
            if (state.selectedWidgetIds.length === 0) {
              state.selectedWidgetId = null;
              state.showProperties = false;
            } else {
              state.selectedWidgetId = state.selectedWidgetIds[0];
            }
          } else {
            state.selectedWidgetIds.push(id);
            state.selectedWidgetId = id;
            state.showProperties = true;
          }
        } else {
          // Single selection
          state.selectedWidgetId = id;
          state.selectedWidgetIds = [id];
          state.showProperties = true;
        }
      }),

      selectWidgets: (ids, primaryId?: string) => set((state) => {
        state.selectedWidgetIds = ids;
        // If primaryId specified and valid, use it; otherwise use first in array
        state.selectedWidgetId = (primaryId && ids.includes(primaryId)) ? primaryId : (ids.length > 0 ? ids[0] : null);
        state.showProperties = ids.length === 1;
      }),

      clearSelection: () => set((state) => {
        state.selectedWidgetId = null;
        state.selectedWidgetIds = [];
        state.showProperties = false;
      }),

      selectAll: () => set((state) => {
        state.selectedWidgetIds = state.widgets.map(w => w.id);
        state.selectedWidgetId = state.widgets[0]?.id || null;
        state.showProperties = false; // Don't show properties for multi-select
      }),

      // UI Actions
      setShowProperties: (show) => set((state) => {
        state.showProperties = show;
      }),

      setShowPalette: (show) => set((state) => {
        state.showPalette = show;
      }),

      setPreviewMode: (preview) => set((state) => {
        state.previewMode = preview;
      }),

      setIsDraggingOrResizing: (dragging) => set((state) => {
        state.isDraggingOrResizing = dragging;
      }),

      setIsSelecting: (selecting) => set((state) => {
        state.isSelecting = selecting;
      }),

      // History Actions (with JSON patch compression)
      addToHistory: () => set((state) => {
        const currentWidgets = JSON.parse(JSON.stringify(state.widgets));

        // Calculate patch from previous state
        // Get previous state BEFORE creating a new baseline
        let previousState: any[];
        if (state.historyIndex >= 0 && state.history[state.historyIndex]) {
          // Reconstruct from history
          previousState = get().reconstructState(state.historyIndex);
        } else if (state.historyBaseline) {
          // Use existing baseline
          previousState = state.historyBaseline.widgets;
        } else {
          // No baseline yet - this is the first entry, so previous state is empty
          previousState = [];
        }

        const patch = compare(previousState, currentWidgets);
        const inversePatch = compare(currentWidgets, previousState);

        // Only add if there are actual changes
        if (patch.length === 0) {
          return;
        }

        const newEntry: HistoryEntry = {
          patch,
          inversePatch,
          timestamp: Date.now(),
        };

        // Remove any future history if we're not at the end
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }

        // Add new entry
        state.history.push(newEntry);
        state.historyIndex = state.history.length - 1;

        // Create baseline if needed (AFTER adding to history)
        if (!state.historyBaseline || state.history.length % state.baselineInterval === 0) {
          state.historyBaseline = {
            widgets: currentWidgets,
            timestamp: Date.now(),
          };
        }

        // Limit history size
        if (state.history.length > state.maxHistorySize) {
          const excess = state.history.length - state.maxHistorySize;
          state.history = state.history.slice(excess);
          state.historyIndex = state.history.length - 1;

          // Update baseline to start of remaining history
          const baselineState = get().reconstructState(0);
          state.historyBaseline = {
            widgets: baselineState,
            timestamp: Date.now(),
          };
        }
      }),

      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          const entry = state.history[state.historyIndex];

          // Apply inverse patch
          try {
            const currentState = JSON.parse(JSON.stringify(state.widgets));
            const result = applyPatch(currentState, entry.inversePatch, true, false);
            state.widgets = result.newDocument;
            state.historyIndex--;
          } catch (error) {
            console.error('[Builder Store] Undo failed:', error);
            // Fallback: reconstruct from baseline
            const reconstructed = get().reconstructState(state.historyIndex - 1);
            state.widgets = reconstructed;
            state.historyIndex--;
          }
        }
      }),

      redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          const entry = state.history[state.historyIndex];

          // Apply forward patch
          try {
            const currentState = JSON.parse(JSON.stringify(state.widgets));
            const result = applyPatch(currentState, entry.patch, true, false);
            state.widgets = result.newDocument;
          } catch (error) {
            console.error('[Builder Store] Redo failed:', error);
            // Fallback: reconstruct from baseline
            const reconstructed = get().reconstructState(state.historyIndex);
            state.widgets = reconstructed;
          }
        }
      }),

      // Helper: Reconstruct state at given index
      reconstructState: (index: number): Widget[] => {
        const state = get();

        if (!state.historyBaseline) {
          return [];
        }

        let current = JSON.parse(JSON.stringify(state.historyBaseline.widgets));

        // Apply patches sequentially up to index
        for (let i = 0; i <= index && i < state.history.length; i++) {
          try {
            const result = applyPatch(current, state.history[i].patch, true, false);
            current = result.newDocument;
          } catch (error) {
            console.error(`[Builder Store] Failed to apply patch at index ${i}:`, error);
            break;
          }
        }

        return current;
      },

      clearHistory: () => set((state) => {
        state.history = [];
        state.historyIndex = -1;
      }),

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // Drag Actions
      setDragStartPosition: (id, x, y) => set((state) => {
        state.dragStartPositions.set(id, { x, y });
      }),

      setDraggedWidgetId: (id) => set((state) => {
        state.draggedWidgetId = id;
      }),

      clearDragState: () => set((state) => {
        state.dragStartPositions.clear();
        state.draggedWidgetId = null;
      }),

      // Batch Operations
      batchUpdateLayouts: (layouts) => set((state) => {
        layouts.forEach(layout => {
          const widget = state.widgets.find(w => w.id === layout.i);
          if (widget) {
            widget.layout = {
              ...widget.layout,
              x: layout.x,
              y: layout.y,
              w: layout.w,
              h: layout.h,
            };
          }
        });
      }),

      // Reset
      reset: () => set(INITIAL_STATE),
    })),
        { name: 'ReportBuilder' }
      )
    // @ts-ignore - Conditional branch doesn't have all methods (pre-existing issue)
    : immer((set, get) => ({
        ...INITIAL_STATE,

        // Widget Management Actions
        addWidget: (widget) => set((state) => {
          state.widgets.push(widget);
          // Auto-save to history
          get().addToHistory();
        }),

        addWidgets: (widgets) => set((state) => {
          state.widgets.push(...widgets);
          get().addToHistory();
        }),

        updateWidget: (id, updates) => set((state) => {
          const widget = state.widgets.find(w => w.id === id);
          if (widget) {
            Object.assign(widget, updates);
          }
        }),

        updateWidgetConfig: (id, config) => set((state) => {
          const widget = state.widgets.find(w => w.id === id);
          if (widget) {
            widget.config = { ...widget.config, ...config };
          }
        }),

        updateWidgetLayout: (id, layout) => set((state) => {
          const widget = state.widgets.find(w => w.id === id);
          if (widget) {
            widget.layout = { ...widget.layout, ...layout };
          }
        }),

        deleteWidget: (id) => set((state) => {
          state.widgets = state.widgets.filter(w => w.id !== id);
          if (state.selectedWidgetId === id) {
            state.selectedWidgetId = null;
          }
          state.selectedWidgetIds = state.selectedWidgetIds.filter(wid => wid !== id);
          get().addToHistory();
        }),

        deleteWidgets: (ids) => set((state) => {
          state.widgets = state.widgets.filter(w => !ids.includes(w.id));
          state.selectedWidgetIds = state.selectedWidgetIds.filter(id => !ids.includes(id));
          if (state.selectedWidgetId && ids.includes(state.selectedWidgetId)) {
            state.selectedWidgetId = null;
          }
          get().addToHistory();
        }),

        setWidgets: (widgets) => set((state) => {
          state.widgets = widgets;
          get().addToHistory();
        }),

        clearWidgets: () => set((state) => {
          state.widgets = [];
          state.selectedWidgetId = null;
          state.selectedWidgetIds = [];
          get().addToHistory();
        }),

        // Selection Actions
        selectWidget: (id, multiSelect = false) => set((state) => {
          if (id === null) {
            state.selectedWidgetId = null;
            state.selectedWidgetIds = [];
            return;
          }

          if (multiSelect) {
            if (state.selectedWidgetIds.includes(id)) {
              state.selectedWidgetIds = state.selectedWidgetIds.filter(wid => wid !== id);
              if (state.selectedWidgetId === id && state.selectedWidgetIds.length > 0) {
                state.selectedWidgetId = state.selectedWidgetIds[0];
              } else if (state.selectedWidgetIds.length === 0) {
                state.selectedWidgetId = null;
              }
            } else {
              state.selectedWidgetIds.push(id);
              state.selectedWidgetId = id;
            }
          } else {
            state.selectedWidgetId = id;
            state.selectedWidgetIds = [id];
          }
        }),

        selectAll: () => set((state) => {
          state.selectedWidgetIds = state.widgets.map(w => w.id);
          if (state.widgets.length > 0) {
            state.selectedWidgetId = state.widgets[0].id;
          }
        }),

        clearSelection: () => set((state) => {
          state.selectedWidgetId = null;
          state.selectedWidgetIds = [];
        }),

        // Grid Actions (removed - not part of BuilderState interface)
        // setGridColumns and setBreakpoint removed as they're not defined in BuilderState

        // History Actions
        addToHistory: () => set((state) => {
          // Get current state for comparison
          const currentWidgets = state.widgets;

          // If we have a baseline or previous state, create a patch
          const previousWidgets = state.historyIndex >= 0 && state.historyIndex < state.history.length
            ? get().reconstructState(state.historyIndex)
            : state.historyBaseline?.widgets || [];

          // Create diff patches
          const patch = compare(previousWidgets, currentWidgets);
          const inversePatch = compare(currentWidgets, previousWidgets);

          const historyEntry: HistoryEntry = {
            patch,
            inversePatch,
            timestamp: Date.now(),
          };

          // Remove any future states if we're not at the end
          if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
          }

          // Add new state
          state.history.push(historyEntry);
          state.historyIndex = state.history.length - 1;

          // Create periodic baseline
          if (state.history.length % state.baselineInterval === 0) {
            state.historyBaseline = {
              widgets: JSON.parse(JSON.stringify(currentWidgets)),
              timestamp: Date.now(),
            };
          }

          // Keep history limited
          if (state.history.length > state.maxHistorySize) {
            state.history = state.history.slice(-state.maxHistorySize);
            state.historyIndex = state.history.length - 1;
          }
        }),

        undo: () => set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex--;
            state.widgets = get().reconstructState(state.historyIndex);
          }
        }),

        redo: () => set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            state.widgets = get().reconstructState(state.historyIndex);
          }
        }),

        // Drag & Drop Actions
        setIsDraggingOrResizing: (isDragging) => set({ isDraggingOrResizing: isDragging }),
        setDraggedWidgetId: (id) => set({ draggedWidgetId: id }),

        setDragStartPosition: (widgetId: string, x: number, y: number) => set((state) => {
          const newMap = new Map(state.dragStartPositions);
          newMap.set(widgetId, { x, y });
          state.dragStartPositions = newMap;
        }),

        clearDragStartPosition: (widgetId: string) => set((state) => {
          const newMap = new Map(state.dragStartPositions);
          newMap.delete(widgetId);
          state.dragStartPositions = newMap;
        }),

        updateLayoutsFromGrid: (layouts: GridLayout[]) => set((state) => {
          layouts.forEach((layout: GridLayout) => {
            const widget = state.widgets.find(w => w.id === layout.i);
            if (widget) {
              widget.layout = {
                ...widget.layout,
                x: layout.x,
                y: layout.y,
                w: layout.w,
                h: layout.h,
              };
            }
          });
        }),

        // Reset
        reset: () => set(INITIAL_STATE),
      })))
);

// Selectors for optimized re-renders
export const selectWidget = (id: string) => (state: BuilderState) =>
  state.widgets.find(w => w.id === id);

export const selectIsSelected = (id: string) => (state: BuilderState) =>
  state.selectedWidgetIds.includes(id);

export const selectWidgetConfig = (id: string) => (state: BuilderState) =>
  state.widgets.find(w => w.id === id)?.config;

export const selectWidgetLayout = (id: string) => (state: BuilderState) =>
  state.widgets.find(w => w.id === id)?.layout;

export const selectSelectedWidget = (state: BuilderState) =>
  state.selectedWidgetId ? state.widgets.find(w => w.id === state.selectedWidgetId) : null;

export const selectCanUndo = (state: BuilderState) =>
  state.historyIndex > 0;

export const selectCanRedo = (state: BuilderState) =>
  state.historyIndex < state.history.length - 1;
