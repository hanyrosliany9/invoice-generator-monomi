# Phase 5: Shape Library & Icons

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_03_CANVAS_CONTROLS.md` first
> **Estimated Complexity**: Medium

## Overview

Add a comprehensive shape library with production-ready icons, arrows, and basic shapes that can be added to slides.

---

## Step 1: Create Shape Definitions

**File**: `frontend/src/features/deck-editor/shapes/shapeDefinitions.ts`

```typescript
import { fabric } from 'fabric';

// Shape category types
export type ShapeCategory = 'basic' | 'arrows' | 'callouts' | 'production' | 'flowchart';

export interface ShapeDefinition {
  id: string;
  name: string;
  category: ShapeCategory;
  icon: string; // SVG path or emoji for picker display
  create: (options?: fabric.IObjectOptions) => fabric.Object;
}

// Basic shape creators
const createRect = (options?: fabric.IObjectOptions): fabric.Object => {
  return new fabric.Rect({
    width: 150,
    height: 100,
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    ...options,
  });
};

const createCircle = (options?: fabric.IObjectOptions): fabric.Object => {
  return new fabric.Circle({
    radius: 50,
    fill: '#10b981',
    stroke: '#047857',
    strokeWidth: 2,
    ...options,
  });
};

const createTriangle = (options?: fabric.IObjectOptions): fabric.Object => {
  return new fabric.Triangle({
    width: 100,
    height: 100,
    fill: '#f59e0b',
    stroke: '#d97706',
    strokeWidth: 2,
    ...options,
  });
};

const createEllipse = (options?: fabric.IObjectOptions): fabric.Object => {
  return new fabric.Ellipse({
    rx: 75,
    ry: 50,
    fill: '#8b5cf6',
    stroke: '#6d28d9',
    strokeWidth: 2,
    ...options,
  });
};

const createLine = (options?: fabric.IObjectOptions): fabric.Object => {
  return new fabric.Line([0, 0, 150, 0], {
    stroke: '#374151',
    strokeWidth: 3,
    ...options,
  });
};

// Arrow creator using fabric.Path
const createArrow = (options?: fabric.IObjectOptions): fabric.Object => {
  // Arrow pointing right
  const arrowPath = 'M 0 10 L 100 10 L 100 0 L 130 15 L 100 30 L 100 20 L 0 20 Z';
  return new fabric.Path(arrowPath, {
    fill: '#374151',
    stroke: '#1f2937',
    strokeWidth: 1,
    ...options,
  });
};

const createDoubleArrow = (options?: fabric.IObjectOptions): fabric.Object => {
  const path = 'M 30 0 L 0 15 L 30 30 L 30 20 L 100 20 L 100 30 L 130 15 L 100 0 L 100 10 L 30 10 Z';
  return new fabric.Path(path, {
    fill: '#374151',
    stroke: '#1f2937',
    strokeWidth: 1,
    ...options,
  });
};

// Callout shapes
const createCalloutRect = (options?: fabric.IObjectOptions): fabric.Object => {
  const path = 'M 0 0 L 150 0 L 150 80 L 40 80 L 20 100 L 30 80 L 0 80 Z';
  return new fabric.Path(path, {
    fill: '#fef3c7',
    stroke: '#f59e0b',
    strokeWidth: 2,
    ...options,
  });
};

const createCalloutCloud = (options?: fabric.IObjectOptions): fabric.Object => {
  // Simplified cloud callout
  const path = 'M 25 60 Q 0 60 0 40 Q 0 20 25 20 Q 25 0 50 0 Q 75 0 100 0 Q 125 0 125 20 Q 150 20 150 40 Q 150 60 125 60 L 40 60 L 20 80 L 35 60 Z';
  return new fabric.Path(path, {
    fill: '#ffffff',
    stroke: '#9ca3af',
    strokeWidth: 2,
    ...options,
  });
};

// Production-specific shapes
const createCameraIcon = (options?: fabric.IObjectOptions): fabric.Object => {
  const path = 'M 23 20 L 17 8 L 7 8 L 1 20 L 1 35 L 23 35 Z M 12 28 A 5 5 0 1 0 12 18 A 5 5 0 1 0 12 28';
  return new fabric.Path(path, {
    fill: '#1f2937',
    stroke: '#000000',
    strokeWidth: 1,
    scaleX: 4,
    scaleY: 4,
    ...options,
  });
};

const createMicIcon = (options?: fabric.IObjectOptions): fabric.Object => {
  const path = 'M 12 1 A 4 4 0 0 1 16 5 L 16 12 A 4 4 0 0 1 8 12 L 8 5 A 4 4 0 0 1 12 1 M 5 10 L 5 12 A 7 7 0 0 0 19 12 L 19 10 M 12 19 L 12 23 M 8 23 L 16 23';
  return new fabric.Path(path, {
    fill: 'transparent',
    stroke: '#1f2937',
    strokeWidth: 2,
    scaleX: 4,
    scaleY: 4,
    ...options,
  });
};

const createLightIcon = (options?: fabric.IObjectOptions): fabric.Object => {
  // Light/spotlight icon
  const path = 'M 12 2 L 12 4 M 4.93 4.93 L 6.34 6.34 M 2 12 L 4 12 M 4.93 19.07 L 6.34 17.66 M 12 20 L 12 22 M 17.66 17.66 L 19.07 19.07 M 20 12 L 22 12 M 17.66 6.34 L 19.07 4.93 M 12 6 A 6 6 0 1 0 12 18 A 6 6 0 1 0 12 6';
  return new fabric.Path(path, {
    fill: '#fbbf24',
    stroke: '#f59e0b',
    strokeWidth: 1,
    scaleX: 4,
    scaleY: 4,
    ...options,
  });
};

// Flowchart shapes
const createDiamond = (options?: fabric.IObjectOptions): fabric.Object => {
  const path = 'M 75 0 L 150 50 L 75 100 L 0 50 Z';
  return new fabric.Path(path, {
    fill: '#e0f2fe',
    stroke: '#0284c7',
    strokeWidth: 2,
    ...options,
  });
};

const createParallelogram = (options?: fabric.IObjectOptions): fabric.Object => {
  const path = 'M 30 0 L 150 0 L 120 80 L 0 80 Z';
  return new fabric.Path(path, {
    fill: '#fce7f3',
    stroke: '#db2777',
    strokeWidth: 2,
    ...options,
  });
};

// Star shape
const createStar = (options?: fabric.IObjectOptions): fabric.Object => {
  const points = [];
  const outerRadius = 50;
  const innerRadius = 25;

  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push({
      x: Math.cos(angle) * radius + 50,
      y: Math.sin(angle) * radius + 50,
    });
  }

  return new fabric.Polygon(points, {
    fill: '#fbbf24',
    stroke: '#f59e0b',
    strokeWidth: 2,
    ...options,
  });
};

// All shape definitions
export const shapeDefinitions: ShapeDefinition[] = [
  // Basic shapes
  { id: 'rect', name: 'Rectangle', category: 'basic', icon: '▭', create: createRect },
  { id: 'circle', name: 'Circle', category: 'basic', icon: '○', create: createCircle },
  { id: 'triangle', name: 'Triangle', category: 'basic', icon: '△', create: createTriangle },
  { id: 'ellipse', name: 'Ellipse', category: 'basic', icon: '⬭', create: createEllipse },
  { id: 'line', name: 'Line', category: 'basic', icon: '─', create: createLine },
  { id: 'star', name: 'Star', category: 'basic', icon: '★', create: createStar },

  // Arrows
  { id: 'arrow', name: 'Arrow', category: 'arrows', icon: '→', create: createArrow },
  { id: 'double-arrow', name: 'Double Arrow', category: 'arrows', icon: '↔', create: createDoubleArrow },

  // Callouts
  { id: 'callout-rect', name: 'Callout', category: 'callouts', icon: '💬', create: createCalloutRect },
  { id: 'callout-cloud', name: 'Cloud', category: 'callouts', icon: '☁', create: createCalloutCloud },

  // Production icons
  { id: 'camera', name: 'Camera', category: 'production', icon: '📷', create: createCameraIcon },
  { id: 'mic', name: 'Microphone', category: 'production', icon: '🎤', create: createMicIcon },
  { id: 'light', name: 'Light', category: 'production', icon: '💡', create: createLightIcon },

  // Flowchart
  { id: 'diamond', name: 'Decision', category: 'flowchart', icon: '◇', create: createDiamond },
  { id: 'parallelogram', name: 'Input/Output', category: 'flowchart', icon: '▱', create: createParallelogram },
];

// Get shapes by category
export const getShapesByCategory = (category: ShapeCategory): ShapeDefinition[] => {
  return shapeDefinitions.filter(s => s.category === category);
};

// Get all categories
export const shapeCategories: { id: ShapeCategory; name: string }[] = [
  { id: 'basic', name: 'Basic Shapes' },
  { id: 'arrows', name: 'Arrows' },
  { id: 'callouts', name: 'Callouts' },
  { id: 'production', name: 'Production' },
  { id: 'flowchart', name: 'Flowchart' },
];
```

---

## Step 2: Create Shape Picker Component

**File**: `frontend/src/features/deck-editor/components/ShapePicker.tsx`

```tsx
import React, { useState } from 'react';
import { Button, Popover, Tabs, Tooltip } from 'antd';
import {
  BorderOutlined,
  StarOutlined,
  RightOutlined,
  MessageOutlined,
  VideoCameraOutlined,
  ApartmentOutlined
} from '@ant-design/icons';
import {
  shapeDefinitions,
  shapeCategories,
  getShapesByCategory,
  ShapeDefinition,
  ShapeCategory
} from '../shapes/shapeDefinitions';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

const categoryIcons: Record<ShapeCategory, React.ReactNode> = {
  basic: <BorderOutlined />,
  arrows: <RightOutlined />,
  callouts: <MessageOutlined />,
  production: <VideoCameraOutlined />,
  flowchart: <ApartmentOutlined />,
};

interface ShapePickerProps {
  disabled?: boolean;
}

export const ShapePicker: React.FC<ShapePickerProps> = ({ disabled }) => {
  const [open, setOpen] = useState(false);
  const { canvas, saveHistory } = useDeckCanvasStore();

  const handleShapeClick = (shape: ShapeDefinition) => {
    if (!canvas) return;

    // Create shape at center of visible canvas
    const center = canvas.getCenter();
    const fabricObj = shape.create({
      left: center.left,
      top: center.top,
      originX: 'center',
      originY: 'center',
    });

    // Add custom data for serialization
    (fabricObj as any).shapeId = shape.id;
    (fabricObj as any).elementType = 'shape';

    canvas.add(fabricObj);
    canvas.setActiveObject(fabricObj);
    canvas.renderAll();
    saveHistory();

    setOpen(false);
  };

  const renderShapeGrid = (shapes: ShapeDefinition[]) => (
    <div className="grid grid-cols-4 gap-2">
      {shapes.map((shape) => (
        <Tooltip key={shape.id} title={shape.name}>
          <button
            className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-2xl"
            onClick={() => handleShapeClick(shape)}
          >
            {shape.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );

  const tabItems = shapeCategories.map((cat) => ({
    key: cat.id,
    label: (
      <span className="flex items-center gap-1">
        {categoryIcons[cat.id]}
        <span className="hidden sm:inline">{cat.name}</span>
      </span>
    ),
    children: renderShapeGrid(getShapesByCategory(cat.id)),
  }));

  const content = (
    <div className="w-[280px]">
      <Tabs
        defaultActiveKey="basic"
        items={tabItems}
        size="small"
        className="shape-picker-tabs"
      />
    </div>
  );

  return (
    <Popover
      content={content}
      title="Insert Shape"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
    >
      <Button
        icon={<StarOutlined />}
        disabled={disabled}
      >
        Shapes
      </Button>
    </Popover>
  );
};

export default ShapePicker;
```

---

## Step 3: Create Line/Connector Tool

**File**: `frontend/src/features/deck-editor/components/LineTool.tsx`

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Button, Dropdown, ColorPicker, InputNumber, Space } from 'antd';
import type { MenuProps } from 'antd';
import { LineOutlined } from '@ant-design/icons';
import { fabric } from 'fabric';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

type LineStyle = 'solid' | 'dashed' | 'dotted';
type ArrowStyle = 'none' | 'start' | 'end' | 'both';

interface LineToolProps {
  disabled?: boolean;
}

export const LineTool: React.FC<LineToolProps> = ({ disabled }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [arrowStyle, setArrowStyle] = useState<ArrowStyle>('none');
  const [strokeColor, setStrokeColor] = useState('#374151');
  const [strokeWidth, setStrokeWidth] = useState(2);

  const { canvas, saveHistory } = useDeckCanvasStore();

  const getStrokeDashArray = (style: LineStyle): number[] | undefined => {
    switch (style) {
      case 'dashed':
        return [10, 5];
      case 'dotted':
        return [2, 4];
      default:
        return undefined;
    }
  };

  const createArrowHead = (x: number, y: number, angle: number): fabric.Triangle => {
    return new fabric.Triangle({
      left: x,
      top: y,
      width: 15,
      height: 20,
      fill: strokeColor,
      angle: angle + 90,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
  };

  const enableDrawMode = useCallback(() => {
    if (!canvas) return;

    setIsDrawing(true);
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';

    let startPoint: { x: number; y: number } | null = null;
    let tempLine: fabric.Line | null = null;

    const onMouseDown = (opt: fabric.IEvent<MouseEvent>) => {
      const pointer = canvas.getPointer(opt.e);
      startPoint = { x: pointer.x, y: pointer.y };

      tempLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: getStrokeDashArray(lineStyle),
        selectable: false,
        evented: false,
      });

      canvas.add(tempLine);
    };

    const onMouseMove = (opt: fabric.IEvent<MouseEvent>) => {
      if (!startPoint || !tempLine) return;

      const pointer = canvas.getPointer(opt.e);
      tempLine.set({ x2: pointer.x, y2: pointer.y });
      canvas.renderAll();
    };

    const onMouseUp = (opt: fabric.IEvent<MouseEvent>) => {
      if (!startPoint || !tempLine) return;

      const pointer = canvas.getPointer(opt.e);

      // Remove temp line
      canvas.remove(tempLine);

      // Create final line
      const line = new fabric.Line(
        [startPoint.x, startPoint.y, pointer.x, pointer.y],
        {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDashArray: getStrokeDashArray(lineStyle),
        }
      );

      (line as any).elementType = 'line';
      canvas.add(line);

      // Add arrow heads if needed
      if (arrowStyle === 'end' || arrowStyle === 'both') {
        const angle = Math.atan2(pointer.y - startPoint.y, pointer.x - startPoint.x) * 180 / Math.PI;
        const arrow = createArrowHead(pointer.x, pointer.y, angle);
        canvas.add(arrow);
      }

      if (arrowStyle === 'start' || arrowStyle === 'both') {
        const angle = Math.atan2(startPoint.y - pointer.y, startPoint.x - pointer.x) * 180 / Math.PI;
        const arrow = createArrowHead(startPoint.x, startPoint.y, angle);
        canvas.add(arrow);
      }

      canvas.setActiveObject(line);
      canvas.renderAll();
      saveHistory();

      // Reset
      startPoint = null;
      tempLine = null;

      // Disable draw mode after one line
      disableDrawMode();
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    // Store handlers for cleanup
    (canvas as any).__lineHandlers = { onMouseDown, onMouseMove, onMouseUp };
  }, [canvas, strokeColor, strokeWidth, lineStyle, arrowStyle, saveHistory]);

  const disableDrawMode = useCallback(() => {
    if (!canvas) return;

    setIsDrawing(false);
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';

    const handlers = (canvas as any).__lineHandlers;
    if (handlers) {
      canvas.off('mouse:down', handlers.onMouseDown);
      canvas.off('mouse:move', handlers.onMouseMove);
      canvas.off('mouse:up', handlers.onMouseUp);
      delete (canvas as any).__lineHandlers;
    }
  }, [canvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableDrawMode();
    };
  }, [disableDrawMode]);

  const lineStyleItems: MenuProps['items'] = [
    { key: 'solid', label: '━━━ Solid' },
    { key: 'dashed', label: '┄┄┄ Dashed' },
    { key: 'dotted', label: '··· Dotted' },
  ];

  const arrowItems: MenuProps['items'] = [
    { key: 'none', label: 'No arrows' },
    { key: 'end', label: 'Arrow at end →' },
    { key: 'start', label: 'Arrow at start ←' },
    { key: 'both', label: 'Both ends ↔' },
  ];

  const handleLineStyleClick: MenuProps['onClick'] = ({ key }) => {
    setLineStyle(key as LineStyle);
  };

  const handleArrowClick: MenuProps['onClick'] = ({ key }) => {
    setArrowStyle(key as ArrowStyle);
  };

  return (
    <Space.Compact>
      <Button
        icon={<LineOutlined />}
        onClick={isDrawing ? disableDrawMode : enableDrawMode}
        type={isDrawing ? 'primary' : 'default'}
        disabled={disabled}
      >
        Line
      </Button>
      <Dropdown menu={{ items: lineStyleItems, onClick: handleLineStyleClick }} disabled={disabled}>
        <Button>Style</Button>
      </Dropdown>
      <Dropdown menu={{ items: arrowItems, onClick: handleArrowClick }} disabled={disabled}>
        <Button>Arrow</Button>
      </Dropdown>
      <ColorPicker
        value={strokeColor}
        onChange={(color) => setStrokeColor(color.toHexString())}
        size="small"
        disabled={disabled}
      />
      <InputNumber
        min={1}
        max={20}
        value={strokeWidth}
        onChange={(v) => setStrokeWidth(v || 2)}
        style={{ width: 60 }}
        disabled={disabled}
      />
    </Space.Compact>
  );
};

export default LineTool;
```

---

## Step 4: Create Quick Shape Buttons

**File**: `frontend/src/features/deck-editor/components/QuickShapeBar.tsx`

```tsx
import React from 'react';
import { Button, Tooltip, Space } from 'antd';
import { fabric } from 'fabric';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

interface QuickShapeBarProps {
  disabled?: boolean;
}

export const QuickShapeBar: React.FC<QuickShapeBarProps> = ({ disabled }) => {
  const { canvas, saveHistory } = useDeckCanvasStore();

  const addQuickShape = (type: 'rect' | 'circle' | 'text') => {
    if (!canvas) return;

    const center = canvas.getCenter();
    let obj: fabric.Object;

    switch (type) {
      case 'rect':
        obj = new fabric.Rect({
          left: center.left,
          top: center.top,
          width: 150,
          height: 100,
          fill: '#3b82f6',
          stroke: '#1e40af',
          strokeWidth: 2,
          rx: 8,
          ry: 8,
          originX: 'center',
          originY: 'center',
        });
        (obj as any).elementType = 'shape';
        (obj as any).shapeId = 'rect';
        break;

      case 'circle':
        obj = new fabric.Circle({
          left: center.left,
          top: center.top,
          radius: 50,
          fill: '#10b981',
          stroke: '#047857',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        (obj as any).elementType = 'shape';
        (obj as any).shapeId = 'circle';
        break;

      case 'text':
        obj = new fabric.IText('Double click to edit', {
          left: center.left,
          top: center.top,
          fontSize: 24,
          fontFamily: 'Inter, sans-serif',
          fill: '#1f2937',
          originX: 'center',
          originY: 'center',
        });
        (obj as any).elementType = 'text';
        break;

      default:
        return;
    }

    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    saveHistory();
  };

  return (
    <Space>
      <Tooltip title="Add Rectangle (R)">
        <Button
          onClick={() => addQuickShape('rect')}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center"
        >
          <span className="text-lg">▭</span>
        </Button>
      </Tooltip>
      <Tooltip title="Add Circle (C)">
        <Button
          onClick={() => addQuickShape('circle')}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center"
        >
          <span className="text-lg">○</span>
        </Button>
      </Tooltip>
      <Tooltip title="Add Text (T)">
        <Button
          onClick={() => addQuickShape('text')}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center"
        >
          <span className="text-lg font-bold">T</span>
        </Button>
      </Tooltip>
    </Space>
  );
};

export default QuickShapeBar;
```

---

## Step 5: Add Keyboard Shortcuts for Shapes

Update the keyboard shortcuts hook from Phase 3 to include shape shortcuts.

**Edit**: `frontend/src/features/deck-editor/hooks/useDeckKeyboardShortcuts.ts`

Add these handlers inside the existing keydown handler:

```typescript
// Quick shapes (add to existing keydown handler)
case 'r':
  if (!e.ctrlKey && !e.metaKey) {
    // Add rectangle
    const rect = new fabric.Rect({
      left: canvas.getCenter().left,
      top: canvas.getCenter().top,
      width: 150,
      height: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      originX: 'center',
      originY: 'center',
    });
    (rect as any).elementType = 'shape';
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveHistory();
  }
  break;

case 'c':
  if (!e.ctrlKey && !e.metaKey) {
    // Add circle (when not Ctrl+C for copy)
    const circle = new fabric.Circle({
      left: canvas.getCenter().left,
      top: canvas.getCenter().top,
      radius: 50,
      fill: '#10b981',
      stroke: '#047857',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    });
    (circle as any).elementType = 'shape';
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    saveHistory();
  }
  break;

case 't':
  if (!e.ctrlKey && !e.metaKey) {
    // Add text
    const text = new fabric.IText('Double click to edit', {
      left: canvas.getCenter().left,
      top: canvas.getCenter().top,
      fontSize: 24,
      fontFamily: 'Inter, sans-serif',
      fill: '#1f2937',
      originX: 'center',
      originY: 'center',
    });
    (text as any).elementType = 'text';
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveHistory();
  }
  break;

case 'l':
  if (!e.ctrlKey && !e.metaKey) {
    // Add line
    const center = canvas.getCenter();
    const line = new fabric.Line(
      [center.left - 75, center.top, center.left + 75, center.top],
      {
        stroke: '#374151',
        strokeWidth: 2,
      }
    );
    (line as any).elementType = 'line';
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    saveHistory();
  }
  break;
```

---

## Step 6: Update Toolbar with Shape Components

**Edit**: `frontend/src/features/deck-editor/components/DeckToolbar.tsx`

Add the shape components to the existing toolbar:

```tsx
import { ShapePicker } from './ShapePicker';
import { LineTool } from './LineTool';
import { QuickShapeBar } from './QuickShapeBar';

// In the toolbar JSX, add:
<Divider type="vertical" />
<QuickShapeBar disabled={!canvas} />
<Divider type="vertical" />
<ShapePicker disabled={!canvas} />
<LineTool disabled={!canvas} />
```

---

## Step 7: Export and Index File

**File**: `frontend/src/features/deck-editor/shapes/index.ts`

```typescript
export * from './shapeDefinitions';
```

Update the main feature index:

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add:

```typescript
export * from './shapes';
export * from './components/ShapePicker';
export * from './components/LineTool';
export * from './components/QuickShapeBar';
```

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run build` in frontend completes without errors
2. [ ] Shape picker opens and shows all categories
3. [ ] Clicking a shape adds it to canvas center
4. [ ] Shapes can be selected, moved, rotated, resized
5. [ ] Line tool allows drawing lines between two points
6. [ ] Line styles (solid, dashed, dotted) work correctly
7. [ ] Arrow options add arrow heads to lines
8. [ ] Keyboard shortcuts R, C, T, L add shapes quickly
9. [ ] Quick shape bar buttons work
10. [ ] All shapes have proper `elementType` for serialization

---

## Common Issues

1. **Shapes not appearing**: Check canvas is initialized before calling `canvas.add()`
2. **Arrow heads misaligned**: Verify angle calculation in `createArrowHead`
3. **Path shapes distorted**: Use `scaleX/scaleY` instead of modifying path coordinates
4. **TypeScript errors on fabric types**: Use `as any` for custom properties like `elementType`
