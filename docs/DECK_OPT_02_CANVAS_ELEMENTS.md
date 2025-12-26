# Phase 2: Canvas Elements - Text, Images, Shapes

> **File**: `DECK_OPT_02_CANVAS_ELEMENTS.md`
> **Executor**: Haiku 4.5
> **Prerequisites**: `DECK_OPT_01_CANVAS_SETUP.md` completed
> **Estimated Steps**: 6

## Objective

Implement proper element handling with double-click text editing, image loading, and shape variations.

---

## Step 1: Enhanced Text Editing with IText

Update the canvas utilities to use `IText` (interactive text) instead of `FabricText`.

**File**: `frontend/src/utils/deckCanvasUtils.ts`

Find and replace the `createTextObject` function:

```typescript
import {
  Canvas as FabricCanvas,
  IText,  // Changed from FabricText
  Rect,
  Circle,
  FabricImage,
  FabricObject,
  Triangle,
  Line,
  Polygon,
  Ellipse,
  Path,
} from 'fabric';

// ... keep other imports and functions ...

// Create interactive text object (double-click to edit)
export const createTextObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  const textObj = new IText(text, {
    left: 100,
    top: 100,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#000000',
    editable: true,
    ...options,
  });
  textObj.set('id', options.id || generateElementId());
  textObj.set('elementType', 'TEXT');
  return textObj;
};

// Create heading text (larger, bold)
export const createHeadingObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 48,
    fontWeight: 'bold',
    ...options,
  });
};

// Create subheading text
export const createSubheadingObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 32,
    fontWeight: '500',
    fill: '#666666',
    ...options,
  });
};

// Create body text
export const createBodyTextObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 18,
    fontWeight: 'normal',
    ...options,
  });
};
```

---

## Step 2: Add More Shape Types

Add to `frontend/src/utils/deckCanvasUtils.ts`:

```typescript
// Create ellipse
export const createEllipseObject = (
  options: Partial<Ellipse> & { id?: string } = {}
): Ellipse => {
  const ellipse = new Ellipse({
    left: 100,
    top: 100,
    rx: 80,
    ry: 50,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  ellipse.set('id', options.id || generateElementId());
  ellipse.set('elementType', 'SHAPE');
  ellipse.set('shapeType', 'ELLIPSE');
  return ellipse;
};

// Create arrow (using Path)
export const createArrowObject = (
  options: { id?: string; direction?: 'right' | 'left' | 'up' | 'down' } = {}
): Path => {
  // Right-pointing arrow path
  const arrowPath = 'M 0 20 L 60 20 L 60 10 L 80 25 L 60 40 L 60 30 L 0 30 Z';

  const arrow = new Path(arrowPath, {
    left: 100,
    top: 100,
    fill: '#333333',
    stroke: '#333333',
    strokeWidth: 1,
    ...options,
  });

  // Rotate based on direction
  if (options.direction === 'left') arrow.rotate(180);
  if (options.direction === 'up') arrow.rotate(-90);
  if (options.direction === 'down') arrow.rotate(90);

  arrow.set('id', options.id || generateElementId());
  arrow.set('elementType', 'SHAPE');
  arrow.set('shapeType', 'ARROW');
  return arrow;
};

// Create star shape
export const createStarObject = (
  options: { id?: string; points?: number } = {}
): Polygon => {
  const points = options.points || 5;
  const outerRadius = 50;
  const innerRadius = 25;
  const starPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    starPoints.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  const star = new Polygon(starPoints, {
    left: 100,
    top: 100,
    fill: '#ffd700',
    stroke: '#333333',
    strokeWidth: 2,
  });

  star.set('id', options.id || generateElementId());
  star.set('elementType', 'SHAPE');
  star.set('shapeType', 'STAR');
  return star;
};

// Create callout/speech bubble
export const createCalloutObject = (
  options: Partial<Path> & { id?: string } = {}
): Path => {
  // Rounded rectangle with pointer
  const calloutPath = `
    M 10 0
    L 140 0
    Q 150 0 150 10
    L 150 60
    Q 150 70 140 70
    L 40 70
    L 20 90
    L 30 70
    L 10 70
    Q 0 70 0 60
    L 0 10
    Q 0 0 10 0
    Z
  `;

  const callout = new Path(calloutPath, {
    left: 100,
    top: 100,
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });

  callout.set('id', options.id || generateElementId());
  callout.set('elementType', 'SHAPE');
  callout.set('shapeType', 'CALLOUT');
  return callout;
};

// Create horizontal line
export const createHorizontalLineObject = (
  width: number = 200,
  options: Partial<Line> & { id?: string } = {}
): Line => {
  return createLineObject([0, 0, width, 0], options);
};

// Create vertical line
export const createVerticalLineObject = (
  height: number = 200,
  options: Partial<Line> & { id?: string } = {}
): Line => {
  return createLineObject([0, 0, 0, height], options);
};
```

---

## Step 3: Update elementToFabricObject for New Shapes

Update the `elementToFabricObject` function in `frontend/src/utils/deckCanvasUtils.ts`:

```typescript
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
      underline: content.underline || false,
      linethrough: content.linethrough || false,
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
        // Return placeholder rect on error
        const placeholder = createRectObject({
          ...baseOptions,
          width,
          height,
          fill: '#f0f0f0',
          stroke: '#cccccc',
        });
        placeholder.set('elementType', 'IMAGE_PLACEHOLDER');
        return placeholder;
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

    switch (shapeType) {
      case 'CIRCLE':
        return createCircleObject({ ...shapeOptions, radius: Math.min(width, height) / 2 });
      case 'ELLIPSE':
        return createEllipseObject({ ...shapeOptions, rx: width / 2, ry: height / 2 });
      case 'TRIANGLE':
        return createTriangleObject({ ...shapeOptions, width, height });
      case 'LINE':
        return createLineObject([0, 0, width, 0], shapeOptions);
      case 'ARROW':
        return createArrowObject({ ...shapeOptions });
      case 'STAR':
        return createStarObject({ ...shapeOptions });
      case 'CALLOUT':
        return createCalloutObject({ ...shapeOptions });
      case 'RECT':
      default:
        return createRectObject({
          ...shapeOptions,
          width,
          height,
          rx: content.rx || 0,
          ry: content.ry || 0,
        });
    }
  }

  if (element.type === 'VIDEO') {
    // Videos are represented as image placeholders with play icon
    const content = element.content as any;
    const placeholder = createRectObject({
      ...baseOptions,
      width,
      height,
      fill: '#1a1a1a',
      stroke: '#333333',
    });
    placeholder.set('elementType', 'VIDEO');
    placeholder.set('videoUrl', content.url);
    return placeholder;
  }

  return null;
};
```

---

## Step 4: Create Shape Picker Component

**File**: `frontend/src/components/deck/ShapePicker.tsx`

```typescript
import { Popover, Button, Space, Tooltip } from 'antd';
import { BorderOutlined } from '@ant-design/icons';
import { Canvas as FabricCanvas } from 'fabric';
import {
  createRectObject,
  createCircleObject,
  createTriangleObject,
  createEllipseObject,
  createLineObject,
  createArrowObject,
  createStarObject,
  createCalloutObject,
} from '../../utils/deckCanvasUtils';

interface ShapePickerProps {
  canvas: FabricCanvas | null;
  onShapeAdd?: (shapeType: string) => void;
  disabled?: boolean;
}

const shapes = [
  { key: 'RECT', label: 'Rectangle', icon: '▢' },
  { key: 'ROUNDED_RECT', label: 'Rounded Rectangle', icon: '▢' },
  { key: 'CIRCLE', label: 'Circle', icon: '○' },
  { key: 'ELLIPSE', label: 'Ellipse', icon: '⬭' },
  { key: 'TRIANGLE', label: 'Triangle', icon: '△' },
  { key: 'LINE', label: 'Line', icon: '─' },
  { key: 'ARROW', label: 'Arrow', icon: '→' },
  { key: 'STAR', label: 'Star', icon: '★' },
  { key: 'CALLOUT', label: 'Callout', icon: '💬' },
];

export default function ShapePicker({ canvas, onShapeAdd, disabled }: ShapePickerProps) {
  const handleShapeClick = (shapeType: string) => {
    if (!canvas) return;

    let shape;
    switch (shapeType) {
      case 'RECT':
        shape = createRectObject({ rx: 0, ry: 0 });
        break;
      case 'ROUNDED_RECT':
        shape = createRectObject({ rx: 12, ry: 12 });
        break;
      case 'CIRCLE':
        shape = createCircleObject();
        break;
      case 'ELLIPSE':
        shape = createEllipseObject();
        break;
      case 'TRIANGLE':
        shape = createTriangleObject();
        break;
      case 'LINE':
        shape = createLineObject();
        break;
      case 'ARROW':
        shape = createArrowObject();
        break;
      case 'STAR':
        shape = createStarObject();
        break;
      case 'CALLOUT':
        shape = createCalloutObject();
        break;
      default:
        shape = createRectObject();
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    onShapeAdd?.(shapeType);
  };

  const content = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {shapes.map((shape) => (
        <Tooltip key={shape.key} title={shape.label}>
          <Button
            style={{
              width: 48,
              height: 48,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => handleShapeClick(shape.key)}
          >
            {shape.icon}
          </Button>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Insert Shape"
      trigger="click"
      placement="bottom"
    >
      <Button icon={<BorderOutlined />} disabled={disabled}>
        Shape
      </Button>
    </Popover>
  );
}
```

---

## Step 5: Create Text Style Picker Component

**File**: `frontend/src/components/deck/TextStylePicker.tsx`

```typescript
import { Popover, Button, Space, Tooltip } from 'antd';
import { FontSizeOutlined } from '@ant-design/icons';
import { Canvas as FabricCanvas } from 'fabric';
import {
  createTextObject,
  createHeadingObject,
  createSubheadingObject,
  createBodyTextObject,
} from '../../utils/deckCanvasUtils';

interface TextStylePickerProps {
  canvas: FabricCanvas | null;
  onTextAdd?: (textType: string) => void;
  disabled?: boolean;
}

const textStyles = [
  { key: 'HEADING', label: 'Title', preview: 'Title', fontSize: 48, fontWeight: 'bold' },
  { key: 'SUBHEADING', label: 'Subtitle', preview: 'Subtitle', fontSize: 32, fontWeight: '500' },
  { key: 'BODY', label: 'Body text', preview: 'Body text', fontSize: 18, fontWeight: 'normal' },
  { key: 'CAPTION', label: 'Caption', preview: 'Caption', fontSize: 14, fontWeight: 'normal' },
];

export default function TextStylePicker({ canvas, onTextAdd, disabled }: TextStylePickerProps) {
  const handleTextClick = (style: typeof textStyles[0]) => {
    if (!canvas) return;

    const text = createTextObject(style.preview, {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight as any,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    // Enter edit mode immediately
    text.enterEditing();
    text.selectAll();
    canvas.renderAll();
    onTextAdd?.(style.key);
  };

  const content = (
    <div style={{ width: 200 }}>
      {textStyles.map((style) => (
        <div
          key={style.key}
          onClick={() => handleTextClick(style)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: 4,
            marginBottom: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            style={{
              fontSize: Math.min(style.fontSize * 0.6, 24),
              fontWeight: style.fontWeight as any,
            }}
          >
            {style.preview}
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>{style.label}</div>
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Insert Text"
      trigger="click"
      placement="bottom"
    >
      <Button icon={<FontSizeOutlined />} disabled={disabled}>
        Text
      </Button>
    </Popover>
  );
}
```

---

## Step 6: Update DeckEditorPage Toolbar

Update the toolbar section in `frontend/src/pages/DeckEditorPage.tsx` to use the new pickers:

```typescript
// Add imports at top
import ShapePicker from '../components/deck/ShapePicker';
import TextStylePicker from '../components/deck/TextStylePicker';

// ... in the component, replace the center toolbar section:

        {/* Center toolbar */}
        <Space>
          <TextStylePicker
            canvas={canvas}
            disabled={!selectedSlide}
            onTextAdd={(textType) => {
              if (selectedSlide) {
                createElementMutation.mutate({
                  slideId: selectedSlide.id,
                  type: 'TEXT',
                  x: 10,
                  y: 10,
                  width: 30,
                  height: 10,
                  content: { text: textType === 'HEADING' ? 'Title' : 'Text', fontSize: 24 },
                });
              }
            }}
          />
          <ShapePicker
            canvas={canvas}
            disabled={!selectedSlide}
            onShapeAdd={(shapeType) => {
              if (selectedSlide) {
                createElementMutation.mutate({
                  slideId: selectedSlide.id,
                  type: 'SHAPE',
                  x: 10,
                  y: 10,
                  width: 20,
                  height: 15,
                  content: { shapeType, fill: '#e0e0e0', stroke: '#333333' },
                });
              }
            }}
          />
          <Tooltip title="Add Image">
            <Button icon={<PictureOutlined />} disabled={!selectedSlide}>
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
```

---

## Completion Checklist

- [ ] `IText` used instead of `FabricText` for double-click editing
- [ ] All shape types implemented (rect, circle, ellipse, triangle, line, arrow, star, callout)
- [ ] `elementToFabricObject` handles all shape types
- [ ] `ShapePicker.tsx` component created
- [ ] `TextStylePicker.tsx` component created
- [ ] Toolbar updated with new pickers
- [ ] Text can be edited by double-clicking
- [ ] Shapes appear correctly on canvas

---

## Next File

After completing this file, proceed to: `DECK_OPT_03_CANVAS_CONTROLS.md`
