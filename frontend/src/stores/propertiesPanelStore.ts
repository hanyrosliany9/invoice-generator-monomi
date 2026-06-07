import { create } from 'zustand';
import type { FabricObject } from 'fabric';

export type ElementType = 'text' | 'shape' | 'image' | 'line' | 'group' | 'multiple' | null;

interface PropertiesPanelState {
  // Panel visibility
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Selected element info
  selectedObject: FabricObject | null;
  elementType: ElementType;
  setSelectedObject: (obj: FabricObject | null) => void;

  // Multi-select info
  selectedCount: number;
  setSelectedCount: (count: number) => void;
}

export const usePropertiesPanelStore = create<PropertiesPanelState>((set) => ({
  // Panel visibility
  isOpen: true, // Open by default
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  // Selected element
  selectedObject: null,
  elementType: null,
  setSelectedObject: (obj) => {
    if (!obj) {
      set({ selectedObject: null, elementType: null, selectedCount: 0 });
      return;
    }

    // Determine element type
    let type: ElementType = null;
    const objType = obj.type;

    if (objType === 'i-text' || objType === 'text' || objType === 'textbox') {
      type = 'text';
    } else if (objType === 'image') {
      type = 'image';
    } else if (objType === 'line') {
      type = 'line';
    } else if (objType === 'activeSelection') {
      type = 'multiple';
    } else if (objType === 'group') {
      type = 'group';
    } else if (['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path'].includes(objType || '')) {
      type = 'shape';
    }

    set({ selectedObject: obj, elementType: type });
  },

  // Multi-select
  selectedCount: 0,
  setSelectedCount: (count) => set({ selectedCount: count }),
}));
