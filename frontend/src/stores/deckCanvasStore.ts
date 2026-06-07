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

  // History for undo/redo
  history: CanvasHistoryEntry[];
  historyIndex: number;
  pushHistory: (json: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Clipboard
  clipboard: FabricObject[] | null;
  setClipboard: (objects: FabricObject[] | null) => void;

  // Zoom
  zoom: number;
  setZoom: (zoom: number) => void;

  // Dirty state (unsaved changes)
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
}

export const useDeckCanvasStore = create<DeckCanvasState>((set, get) => ({
  // Canvas
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),

  // Selection
  selectedObjectIds: [],
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),

  // History
  history: [],
  historyIndex: -1,

  pushHistory: (json) => {
    const { history, historyIndex } = get();
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ json, timestamp: Date.now() });
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1, isDirty: true });
  },

  undo: () => {
    const { history, historyIndex, canvas } = get();
    if (historyIndex > 0 && canvas) {
      const newIndex = historyIndex - 1;
      const entry = history[newIndex];
      canvas.loadFromJSON(JSON.parse(entry.json)).then(() => {
        canvas.renderAll();
        set({ historyIndex: newIndex });
      });
    }
  },

  redo: () => {
    const { history, historyIndex, canvas } = get();
    if (historyIndex < history.length - 1 && canvas) {
      const newIndex = historyIndex + 1;
      const entry = history[newIndex];
      canvas.loadFromJSON(JSON.parse(entry.json)).then(() => {
        canvas.renderAll();
        set({ historyIndex: newIndex });
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Clipboard
  clipboard: null,
  setClipboard: (objects) => set({ clipboard: objects }),

  // Zoom
  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  // Dirty
  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}));
