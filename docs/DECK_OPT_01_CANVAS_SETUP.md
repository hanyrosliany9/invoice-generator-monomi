# Phase 1: Canvas Setup with Fabric.js

> **File**: `DECK_OPT_01_CANVAS_SETUP.md`
> **Executor**: Haiku 4.5
> **Prerequisites**: None
> **Estimated Steps**: 8

## Objective

Replace `react-grid-layout` with `fabric.js` for free-form canvas editing.

---

## Step 1: Install Dependencies

Run on HOST machine (frontend runs outside Docker):

```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/frontend
npm install fabric@6 @types/fabric
```

**Verify**: Check `package.json` has `"fabric": "^6.x.x"`

---

## Step 2: Remove Old Dependencies

The grid layout is no longer needed:

```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/frontend
npm uninstall react-grid-layout @types/react-grid-layout
```

---

## Step 3: Create Canvas Store

**File**: `frontend/src/stores/deckCanvasStore.ts`

```typescript
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
```

---

## Step 4: Create Fabric Canvas Component

**File**: `frontend/src/components/deck/DeckCanvas.tsx`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface DeckCanvasProps {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImage?: string;
  onSelectionChange?: (objectIds: string[]) => void;
  onCanvasReady?: (canvas: FabricCanvas) => void;
  onObjectModified?: (object: FabricObject) => void;
}

export default function DeckCanvas({
  width,
  height,
  backgroundColor = '#ffffff',
  backgroundImage,
  onSelectionChange,
  onCanvasReady,
  onObjectModified,
}: DeckCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const { setCanvas, pushHistory, setSelectedObjectIds } = useDeckCanvasStore();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricRef.current = canvas;
    setCanvas(canvas);

    // Selection events
    canvas.on('selection:created', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChange?.(ids);
    });

    canvas.on('selection:updated', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChange?.(ids);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObjectIds([]);
      onSelectionChange?.([]);
    });

    // Object modified (move, resize, rotate)
    canvas.on('object:modified', (e) => {
      if (e.target) {
        onObjectModified?.(e.target);
        // Save to history
        pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
      }
    });

    // Initial history entry
    pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));

    onCanvasReady?.(canvas);

    return () => {
      canvas.dispose();
      setCanvas(null);
    };
  }, []);

  // Update dimensions
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width, height });
    }
  }, [width, height]);

  // Update background color
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = backgroundColor;
      fabricRef.current.renderAll();
    }
  }, [backgroundColor]);

  // Update background image
  useEffect(() => {
    if (fabricRef.current && backgroundImage) {
      FabricCanvas.Image.fromURL(backgroundImage).then((img) => {
        if (fabricRef.current) {
          img.scaleToWidth(width);
          fabricRef.current.backgroundImage = img;
          fabricRef.current.renderAll();
        }
      });
    } else if (fabricRef.current) {
      fabricRef.current.backgroundImage = undefined;
      fabricRef.current.renderAll();
    }
  }, [backgroundImage, width]);

  return (
    <div
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'inline-block',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
```

---

## Step 5: Create Canvas Utilities

**File**: `frontend/src/utils/deckCanvasUtils.ts`

```typescript
import {
  Canvas as FabricCanvas,
  FabricText,
  Rect,
  Circle,
  FabricImage,
  FabricObject,
  Triangle,
  Line,
  Polygon,
} from 'fabric';
import type { DeckSlideElement } from '../types/deck';

// Generate unique ID
export const generateElementId = (): string => {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Convert percentage to canvas pixels
export const percentToPixel = (percent: number, total: number): number => {
  return (percent / 100) * total;
};

// Convert canvas pixels to percentage
export const pixelToPercent = (pixel: number, total: number): number => {
  return (pixel / total) * 100;
};

// Create text object
export const createTextObject = (
  text: string,
  options: Partial<FabricText> & { id?: string } = {}
): FabricText => {
  const textObj = new FabricText(text, {
    left: 100,
    top: 100,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#000000',
    ...options,
  });
  textObj.set('id', options.id || generateElementId());
  textObj.set('elementType', 'TEXT');
  return textObj;
};

// Create rectangle
export const createRectObject = (
  options: Partial<Rect> & { id?: string } = {}
): Rect => {
  const rect = new Rect({
    left: 100,
    top: 100,
    width: 200,
    height: 100,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    ...options,
  });
  rect.set('id', options.id || generateElementId());
  rect.set('elementType', 'SHAPE');
  return rect;
};

// Create circle
export const createCircleObject = (
  options: Partial<Circle> & { id?: string } = {}
): Circle => {
  const circle = new Circle({
    left: 100,
    top: 100,
    radius: 50,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  circle.set('id', options.id || generateElementId());
  circle.set('elementType', 'SHAPE');
  return circle;
};

// Create triangle
export const createTriangleObject = (
  options: Partial<Triangle> & { id?: string } = {}
): Triangle => {
  const triangle = new Triangle({
    left: 100,
    top: 100,
    width: 100,
    height: 100,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  triangle.set('id', options.id || generateElementId());
  triangle.set('elementType', 'SHAPE');
  return triangle;
};

// Create line
export const createLineObject = (
  points: [number, number, number, number] = [0, 0, 200, 0],
  options: Partial<Line> & { id?: string } = {}
): Line => {
  const line = new Line(points, {
    stroke: '#333333',
    strokeWidth: 3,
    ...options,
  });
  line.set('id', options.id || generateElementId());
  line.set('elementType', 'SHAPE');
  return line;
};

// Create image from URL
export const createImageObject = async (
  url: string,
  options: { id?: string; maxWidth?: number; maxHeight?: number } = {}
): Promise<FabricImage> => {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

  // Scale to fit max dimensions
  if (options.maxWidth && img.width && img.width > options.maxWidth) {
    img.scaleToWidth(options.maxWidth);
  }
  if (options.maxHeight && img.height && img.height > options.maxHeight) {
    img.scaleToHeight(options.maxHeight);
  }

  img.set('id', options.id || generateElementId());
  img.set('elementType', 'IMAGE');
  img.set('left', 100);
  img.set('top', 100);

  return img;
};

// Convert Fabric object to DeckSlideElement for saving
export const fabricObjectToElement = (
  obj: FabricObject,
  slideId: string,
  canvasWidth: number,
  canvasHeight: number
): Partial<DeckSlideElement> => {
  const left = obj.left || 0;
  const top = obj.top || 0;
  const width = obj.getScaledWidth();
  const height = obj.getScaledHeight();
  const angle = obj.angle || 0;

  const base = {
    slideId,
    x: pixelToPercent(left, canvasWidth),
    y: pixelToPercent(top, canvasHeight),
    width: pixelToPercent(width, canvasWidth),
    height: pixelToPercent(height, canvasHeight),
    rotation: angle,
    zIndex: obj.get('zIndex') || 0,
  };

  const elementType = obj.get('elementType') as string;

  if (elementType === 'TEXT' && obj instanceof FabricText) {
    return {
      ...base,
      type: 'TEXT',
      content: {
        text: obj.text,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        fill: obj.fill,
        textAlign: obj.textAlign,
      },
    };
  }

  if (elementType === 'IMAGE' && obj instanceof FabricImage) {
    return {
      ...base,
      type: 'IMAGE',
      content: {
        url: obj.getSrc(),
      },
    };
  }

  if (elementType === 'SHAPE') {
    let shapeType = 'RECT';
    if (obj instanceof Circle) shapeType = 'CIRCLE';
    if (obj instanceof Triangle) shapeType = 'TRIANGLE';
    if (obj instanceof Line) shapeType = 'LINE';

    return {
      ...base,
      type: 'SHAPE',
      content: {
        shapeType,
        fill: obj.get('fill'),
        stroke: obj.get('stroke'),
        strokeWidth: obj.get('strokeWidth'),
      },
    };
  }

  return base;
};

// Load DeckSlideElement to Fabric object
export const elementToFabricObject = async (
  element: DeckSlideElement,
  canvasWidth: number,
  canvasHeight: number
): Promise<FabricObject | null> => {
  const left = percentToPixel(element.x, canvasWidth);
  const top = percentToPixel(element.y, canvasHeight);
  const width = percentToPixel(element.width, canvasWidth);
  const height = percentToPixel(element.height, canvasHeight);

  const baseOptions = {
    id: element.id,
    left,
    top,
    angle: element.rotation || 0,
  };

  if (element.type === 'TEXT') {
    const content = element.content as any;
    const text = createTextObject(content.text || 'Text', {
      ...baseOptions,
      fontSize: content.fontSize || 24,
      fontFamily: content.fontFamily || 'Inter, sans-serif',
      fontWeight: content.fontWeight || 'normal',
      fontStyle: content.fontStyle || 'normal',
      fill: content.fill || '#000000',
      textAlign: content.textAlign || 'left',
    });
    return text;
  }

  if (element.type === 'IMAGE') {
    const content = element.content as any;
    if (content.url) {
      try {
        const img = await createImageObject(content.url, { id: element.id });
        img.set('left', left);
        img.set('top', top);
        img.scaleToWidth(width);
        return img;
      } catch (e) {
        console.error('Failed to load image:', e);
        return null;
      }
    }
    return null;
  }

  if (element.type === 'SHAPE') {
    const content = element.content as any;
    const shapeType = content.shapeType || 'RECT';
    const shapeOptions = {
      ...baseOptions,
      fill: content.fill || '#e0e0e0',
      stroke: content.stroke || '#333333',
      strokeWidth: content.strokeWidth || 2,
    };

    if (shapeType === 'CIRCLE') {
      const circle = createCircleObject({ ...shapeOptions, radius: width / 2 });
      return circle;
    }
    if (shapeType === 'TRIANGLE') {
      const triangle = createTriangleObject({ ...shapeOptions, width, height });
      return triangle;
    }
    // Default to rectangle
    const rect = createRectObject({ ...shapeOptions, width, height });
    return rect;
  }

  return null;
};
```

---

## Step 6: Create Canvas Wrapper Component

**File**: `frontend/src/components/deck/SlideCanvas.tsx`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';
import DeckCanvas from './DeckCanvas';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';
import {
  fabricObjectToElement,
  elementToFabricObject,
} from '../../utils/deckCanvasUtils';
import type { DeckSlide, DeckSlideElement } from '../../types/deck';

interface SlideCanvasProps {
  slide: DeckSlide;
  deckWidth: number;
  deckHeight: number;
  scale?: number;
  onElementUpdate?: (elementId: string, data: Partial<DeckSlideElement>) => void;
  onElementCreate?: (element: Partial<DeckSlideElement>) => void;
}

export default function SlideCanvas({
  slide,
  deckWidth,
  deckHeight,
  scale = 0.5,
  onElementUpdate,
  onElementCreate,
}: SlideCanvasProps) {
  const { canvas } = useDeckCanvasStore();
  const [isLoading, setIsLoading] = useState(true);

  const canvasWidth = deckWidth * scale;
  const canvasHeight = deckHeight * scale;

  // Load elements when slide changes
  useEffect(() => {
    if (!canvas || !slide) return;

    const loadElements = async () => {
      setIsLoading(true);

      // Clear existing objects (except background)
      canvas.getObjects().forEach((obj) => {
        canvas.remove(obj);
      });

      // Load elements
      for (const element of slide.elements || []) {
        const fabricObj = await elementToFabricObject(
          element,
          canvasWidth,
          canvasHeight
        );
        if (fabricObj) {
          canvas.add(fabricObj);
        }
      }

      canvas.renderAll();
      setIsLoading(false);
    };

    loadElements();
  }, [canvas, slide?.id, canvasWidth, canvasHeight]);

  // Handle object modification
  const handleObjectModified = useCallback(
    (obj: FabricObject) => {
      const elementId = obj.get('id') as string;
      if (elementId && onElementUpdate) {
        const elementData = fabricObjectToElement(
          obj,
          slide.id,
          canvasWidth,
          canvasHeight
        );
        onElementUpdate(elementId, elementData);
      }
    },
    [slide?.id, canvasWidth, canvasHeight, onElementUpdate]
  );

  return (
    <div style={{ position: 'relative' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 10,
          }}
        >
          Loading...
        </div>
      )}
      <DeckCanvas
        width={canvasWidth}
        height={canvasHeight}
        backgroundColor={slide?.backgroundColor || '#ffffff'}
        backgroundImage={slide?.backgroundImage}
        onObjectModified={handleObjectModified}
      />
    </div>
  );
}
```

---

## Step 7: Update DeckEditorPage to Use New Canvas

**File**: `frontend/src/pages/DeckEditorPage.tsx`

Replace the entire file with this updated version that uses fabric.js:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Card,
  Button,
  Space,
  Spin,
  App,
  Typography,
  Dropdown,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  LeftOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import { useTheme } from '../theme';
import { decksApi, slidesApi, elementsApi } from '../services/decks';
import SlideCanvas from '../components/deck/SlideCanvas';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';
import {
  createTextObject,
  createRectObject,
  generateElementId,
} from '../utils/deckCanvasUtils';
import type { Deck, DeckSlide, SlideTemplate, DeckSlideElement } from '../types/deck';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DeckEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const { theme: themeConfig } = useTheme();

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const { canvas, canUndo, canRedo, undo, redo, selectedObjectIds } = useDeckCanvasStore();

  // Fetch deck
  const { data: deck, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: () => decksApi.getById(id!),
    enabled: !!id,
  });

  // Set initial selected slide
  useEffect(() => {
    if (deck?.slides?.length && !selectedSlideId) {
      setSelectedSlideId(deck.slides[0].id);
    }
  }, [deck, selectedSlideId]);

  // Mutations
  const addSlideMutation = useMutation({
    mutationFn: (template: SlideTemplate) =>
      slidesApi.create({ deckId: id!, template }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      setSelectedSlideId(res.id);
      message.success('Slide added');
    },
  });

  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => slidesApi.delete(slideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      setSelectedSlideId(null);
      message.success('Slide deleted');
    },
  });

  const updateElementMutation = useMutation({
    mutationFn: ({ elementId, data }: { elementId: string; data: any }) =>
      elementsApi.update(elementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
    },
  });

  const createElementMutation = useMutation({
    mutationFn: (data: any) => elementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      message.success('Element added');
    },
  });

  const deleteElementMutation = useMutation({
    mutationFn: (elementId: string) => elementsApi.delete(elementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      message.success('Element deleted');
    },
  });

  const selectedSlide = deck?.slides?.find((s) => s.id === selectedSlideId);

  // Add text to canvas
  const handleAddText = useCallback(() => {
    if (!canvas || !selectedSlide) {
      message.warning('Please select a slide first');
      return;
    }
    const text = createTextObject('Double-click to edit');
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    // Save to backend
    createElementMutation.mutate({
      slideId: selectedSlide.id,
      type: 'TEXT',
      x: 10,
      y: 10,
      width: 30,
      height: 10,
      content: { text: 'Double-click to edit', fontSize: 24, fill: '#000000' },
    });
  }, [canvas, selectedSlide, createElementMutation]);

  // Add shape to canvas
  const handleAddShape = useCallback(() => {
    if (!canvas || !selectedSlide) {
      message.warning('Please select a slide first');
      return;
    }
    const rect = createRectObject();
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();

    createElementMutation.mutate({
      slideId: selectedSlide.id,
      type: 'SHAPE',
      x: 10,
      y: 10,
      width: 20,
      height: 15,
      content: { shapeType: 'RECT', fill: '#e0e0e0', stroke: '#333333' },
    });
  }, [canvas, selectedSlide, createElementMutation]);

  // Delete selected objects
  const handleDelete = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => {
      const elementId = obj.get('id') as string;
      if (elementId) {
        deleteElementMutation.mutate(elementId);
      }
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas, deleteElementMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectIds.length > 0) {
          handleDelete();
        }
      }
      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, handleDelete, canUndo, canRedo, undo, redo]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!deck) {
    return <div>Deck not found</div>;
  }

  const slideTemplates: SlideTemplate[] = [
    'TITLE', 'TITLE_CONTENT', 'TWO_COLUMN', 'FULL_MEDIA',
    'MOOD_BOARD', 'CHARACTER', 'SHOT_LIST', 'SCHEDULE', 'COMPARISON', 'BLANK',
  ];

  return (
    <Layout style={{ height: '100vh', background: themeConfig.colors.background.primary }}>
      {/* Top Toolbar */}
      <Header
        style={{
          background: themeConfig.colors.background.secondary,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${themeConfig.colors.border.default}`,
          height: 48,
        }}
      >
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/decks')}>
            Back
          </Button>
          <span style={{ fontWeight: 600, fontSize: 16, color: themeConfig.colors.text.primary }}>
            {deck.title}
          </span>
        </Space>

        {/* Center toolbar */}
        <Space>
          <Tooltip title="Add Text (T)">
            <Button icon={<FontSizeOutlined />} onClick={handleAddText}>
              Text
            </Button>
          </Tooltip>
          <Tooltip title="Add Shape">
            <Button icon={<BorderOutlined />} onClick={handleAddShape}>
              Shape
            </Button>
          </Tooltip>
          <Tooltip title="Add Image">
            <Button icon={<PictureOutlined />}>
              Image
            </Button>
          </Tooltip>
          <div style={{ width: 1, height: 24, background: themeConfig.colors.border.default, margin: '0 8px' }} />
          <Tooltip title="Undo (Ctrl+Z)">
            <Button icon={<UndoOutlined />} disabled={!canUndo()} onClick={undo} />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button icon={<RedoOutlined />} disabled={!canRedo()} onClick={redo} />
          </Tooltip>
        </Space>

        <Space>
          <Button icon={<SaveOutlined />}>Save</Button>
          <Button icon={<ShareAltOutlined />}>Share</Button>
          <Button type="primary" icon={<PlayCircleOutlined />}>
            Present
          </Button>
        </Space>
      </Header>

      <Layout>
        {/* Slide Thumbnails */}
        <Sider
          width={180}
          style={{
            background: themeConfig.colors.background.secondary,
            padding: 8,
            overflowY: 'auto',
            borderRight: `1px solid ${themeConfig.colors.border.default}`,
          }}
        >
          {deck.slides?.map((slide, index) => (
            <Card
              key={slide.id}
              size="small"
              onClick={() => setSelectedSlideId(slide.id)}
              style={{
                marginBottom: 8,
                cursor: 'pointer',
                border:
                  selectedSlideId === slide.id
                    ? `2px solid ${themeConfig.colors.accent.primary}`
                    : `1px solid ${themeConfig.colors.border.default}`,
                background: themeConfig.colors.background.primary,
                aspectRatio: '16/9',
              }}
              bodyStyle={{ padding: 8 }}
            >
              <div style={{ fontSize: 11, color: themeConfig.colors.text.secondary }}>
                {index + 1}
              </div>
            </Card>
          ))}

          <Dropdown
            menu={{
              items: slideTemplates.map((t) => ({ key: t, label: t.replace('_', ' ') })),
              onClick: ({ key }) => addSlideMutation.mutate(key as SlideTemplate),
            }}
            trigger={['click']}
          >
            <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
              Add Slide
            </Button>
          </Dropdown>
        </Sider>

        {/* Main Canvas */}
        <Content
          style={{
            padding: 24,
            background: themeConfig.colors.background.tertiary,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {selectedSlide ? (
            <SlideCanvas
              slide={selectedSlide}
              deckWidth={deck.slideWidth}
              deckHeight={deck.slideHeight}
              scale={0.5}
              onElementUpdate={(elementId, data) => {
                updateElementMutation.mutate({ elementId, data });
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', marginTop: 100, color: themeConfig.colors.text.secondary }}>
              <Text>Select a slide to start editing</Text>
            </div>
          )}
        </Content>

        {/* Properties Panel */}
        <Sider
          width={260}
          style={{
            background: themeConfig.colors.background.secondary,
            padding: 16,
            borderLeft: `1px solid ${themeConfig.colors.border.default}`,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 16, color: themeConfig.colors.text.primary }}>
            {selectedObjectIds.length > 0 ? 'Element Properties' : 'Slide Properties'}
          </div>

          {selectedObjectIds.length > 0 ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedObjectIds.length} element(s) selected
              </Text>
              <Button
                danger
                block
                icon={<DeleteOutlined />}
                style={{ marginTop: 16 }}
                onClick={handleDelete}
              >
                Delete Selected
              </Button>
            </div>
          ) : selectedSlide ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Template</Text>
                <div>{selectedSlide.template}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Elements</Text>
                <div>{selectedSlide.elements?.length || 0}</div>
              </div>
              <Button
                danger
                block
                icon={<DeleteOutlined />}
                onClick={() => {
                  modal.confirm({
                    title: 'Delete this slide?',
                    onOk: () => deleteSlideMutation.mutate(selectedSlide.id),
                  });
                }}
              >
                Delete Slide
              </Button>
            </div>
          ) : null}
        </Sider>
      </Layout>
    </Layout>
  );
}
```

---

## Step 8: Verify Installation

1. **Start frontend dev server**:
```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/frontend
npm run dev
```

2. **Check for TypeScript errors**:
```bash
npm run typecheck
# or
npx tsc --noEmit
```

3. **Test in browser**:
- Navigate to `http://localhost:3001/decks`
- Create or open a deck
- Verify canvas loads
- Try adding text/shape
- Verify drag/resize works

---

## Completion Checklist

- [ ] `fabric` installed
- [ ] `react-grid-layout` removed
- [ ] `deckCanvasStore.ts` created
- [ ] `DeckCanvas.tsx` created
- [ ] `deckCanvasUtils.ts` created
- [ ] `SlideCanvas.tsx` created
- [ ] `DeckEditorPage.tsx` updated
- [ ] No TypeScript errors
- [ ] Canvas renders in browser
- [ ] Elements can be dragged/resized

---

## Next File

After completing this file, proceed to: `DECK_OPT_02_CANVAS_ELEMENTS.md`
