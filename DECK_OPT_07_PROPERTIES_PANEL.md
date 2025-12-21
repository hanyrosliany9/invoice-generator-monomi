# Phase 7: Properties Panel (Element Sidebar)

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_04_RICH_TEXT.md` and `DECK_OPT_05_SHAPE_LIBRARY.md` first
> **Estimated Complexity**: Medium

## Overview

Create a right-side properties panel that shows contextual controls for the selected element (text, shape, image, etc.).

---

## Step 1: Create Properties Panel Store

**File**: `frontend/src/features/deck-editor/stores/propertiesPanelStore.ts`

```typescript
import { create } from 'zustand';
import type { fabric } from 'fabric';

export type ElementType = 'text' | 'shape' | 'image' | 'line' | 'group' | 'multiple' | null;

interface PropertiesPanelState {
  // Panel visibility
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Selected element info
  selectedObject: fabric.Object | null;
  elementType: ElementType;
  setSelectedObject: (obj: fabric.Object | null) => void;

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
```

---

## Step 2: Create Base Property Components

**File**: `frontend/src/features/deck-editor/components/properties/PropertySection.tsx`

```tsx
import React from 'react';
import { Collapse } from 'antd';

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const PropertySection: React.FC<PropertySectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  return (
    <Collapse
      defaultActiveKey={defaultOpen ? ['1'] : []}
      ghost
      items={[
        {
          key: '1',
          label: <span className="font-medium text-gray-700">{title}</span>,
          children: <div className="space-y-3">{children}</div>,
        },
      ]}
    />
  );
};

export default PropertySection;
```

**File**: `frontend/src/features/deck-editor/components/properties/PropertyRow.tsx`

```tsx
import React from 'react';

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}

export const PropertyRow: React.FC<PropertyRowProps> = ({
  label,
  children,
  inline = false,
}) => {
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-600">{label}</label>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      {children}
    </div>
  );
};

export default PropertyRow;
```

---

## Step 3: Create Transform Properties Component

**File**: `frontend/src/features/deck-editor/components/properties/TransformProperties.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { InputNumber, Slider, Space, Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { fabric } from 'fabric';
import { PropertySection } from './PropertySection';
import { PropertyRow } from './PropertyRow';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface TransformPropertiesProps {
  object: fabric.Object;
}

export const TransformProperties: React.FC<TransformPropertiesProps> = ({ object }) => {
  const { canvas, saveHistory } = useDeckCanvasStore();
  const [lockAspect, setLockAspect] = useState(true);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(100);

  // Sync state with object
  useEffect(() => {
    if (!object) return;

    const updateFromObject = () => {
      setPosition({
        x: Math.round(object.left || 0),
        y: Math.round(object.top || 0),
      });
      setSize({
        width: Math.round((object.width || 0) * (object.scaleX || 1)),
        height: Math.round((object.height || 0) * (object.scaleY || 1)),
      });
      setRotation(Math.round(object.angle || 0));
      setOpacity(Math.round((object.opacity || 1) * 100));
    };

    updateFromObject();

    // Listen for object modifications
    const handler = () => updateFromObject();
    object.on('modified', handler);
    object.on('moving', handler);
    object.on('scaling', handler);
    object.on('rotating', handler);

    return () => {
      object.off('modified', handler);
      object.off('moving', handler);
      object.off('scaling', handler);
      object.off('rotating', handler);
    };
  }, [object]);

  const updateObject = (changes: Partial<fabric.Object>) => {
    if (!object || !canvas) return;
    object.set(changes);
    canvas.renderAll();
    saveHistory();
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number | null) => {
    if (value === null) return;
    const key = axis === 'x' ? 'left' : 'top';
    setPosition((prev) => ({ ...prev, [axis]: value }));
    updateObject({ [key]: value });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number | null) => {
    if (value === null || !object) return;

    const originalWidth = (object.width || 1) * (object.scaleX || 1);
    const originalHeight = (object.height || 1) * (object.scaleY || 1);
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = size.width;
    let newHeight = size.height;

    if (dimension === 'width') {
      newWidth = value;
      if (lockAspect) {
        newHeight = Math.round(value / aspectRatio);
      }
    } else {
      newHeight = value;
      if (lockAspect) {
        newWidth = Math.round(value * aspectRatio);
      }
    }

    const scaleX = newWidth / (object.width || 1);
    const scaleY = newHeight / (object.height || 1);

    setSize({ width: newWidth, height: newHeight });
    updateObject({ scaleX, scaleY });
  };

  const handleRotationChange = (value: number | null) => {
    if (value === null) return;
    setRotation(value);
    updateObject({ angle: value });
  };

  const handleOpacityChange = (value: number | null) => {
    if (value === null) return;
    setOpacity(value);
    updateObject({ opacity: value / 100 });
  };

  return (
    <PropertySection title="Transform">
      {/* Position */}
      <PropertyRow label="Position">
        <Space>
          <InputNumber
            size="small"
            value={position.x}
            onChange={(v) => handlePositionChange('x', v)}
            prefix="X"
            style={{ width: 80 }}
          />
          <InputNumber
            size="small"
            value={position.y}
            onChange={(v) => handlePositionChange('y', v)}
            prefix="Y"
            style={{ width: 80 }}
          />
        </Space>
      </PropertyRow>

      {/* Size */}
      <PropertyRow label="Size">
        <Space>
          <InputNumber
            size="small"
            value={size.width}
            onChange={(v) => handleSizeChange('width', v)}
            prefix="W"
            min={1}
            style={{ width: 80 }}
          />
          <Tooltip title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}>
            <Button
              size="small"
              icon={lockAspect ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => setLockAspect(!lockAspect)}
            />
          </Tooltip>
          <InputNumber
            size="small"
            value={size.height}
            onChange={(v) => handleSizeChange('height', v)}
            prefix="H"
            min={1}
            style={{ width: 80 }}
          />
        </Space>
      </PropertyRow>

      {/* Rotation */}
      <PropertyRow label="Rotation" inline>
        <Space>
          <Slider
            min={0}
            max={360}
            value={rotation}
            onChange={handleRotationChange}
            style={{ width: 100 }}
          />
          <InputNumber
            size="small"
            value={rotation}
            onChange={handleRotationChange}
            min={0}
            max={360}
            suffix="°"
            style={{ width: 70 }}
          />
        </Space>
      </PropertyRow>

      {/* Opacity */}
      <PropertyRow label="Opacity" inline>
        <Space>
          <Slider
            min={0}
            max={100}
            value={opacity}
            onChange={handleOpacityChange}
            style={{ width: 100 }}
          />
          <InputNumber
            size="small"
            value={opacity}
            onChange={handleOpacityChange}
            min={0}
            max={100}
            suffix="%"
            style={{ width: 70 }}
          />
        </Space>
      </PropertyRow>
    </PropertySection>
  );
};

export default TransformProperties;
```

---

## Step 4: Create Fill & Stroke Properties

**File**: `frontend/src/features/deck-editor/components/properties/FillStrokeProperties.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { ColorPicker, InputNumber, Select, Space, Switch } from 'antd';
import type { fabric } from 'fabric';
import { PropertySection } from './PropertySection';
import { PropertyRow } from './PropertyRow';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface FillStrokePropertiesProps {
  object: fabric.Object;
}

export const FillStrokeProperties: React.FC<FillStrokePropertiesProps> = ({ object }) => {
  const { canvas, saveHistory } = useDeckCanvasStore();

  const [fill, setFill] = useState<string>('#3b82f6');
  const [hasFill, setHasFill] = useState(true);
  const [stroke, setStroke] = useState<string>('#1e40af');
  const [hasStroke, setHasStroke] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeDashArray, setStrokeDashArray] = useState<string>('solid');

  // Sync with object
  useEffect(() => {
    if (!object) return;

    const objFill = object.fill as string;
    const objStroke = object.stroke as string;

    setHasFill(!!objFill && objFill !== 'transparent');
    setFill(objFill && objFill !== 'transparent' ? objFill : '#3b82f6');

    setHasStroke(!!objStroke && objStroke !== 'transparent');
    setStroke(objStroke && objStroke !== 'transparent' ? objStroke : '#1e40af');

    setStrokeWidth(object.strokeWidth || 2);

    // Detect dash array
    const dashArray = object.strokeDashArray;
    if (!dashArray || dashArray.length === 0) {
      setStrokeDashArray('solid');
    } else if (dashArray[0] > 5) {
      setStrokeDashArray('dashed');
    } else {
      setStrokeDashArray('dotted');
    }
  }, [object]);

  const updateObject = (changes: Partial<fabric.Object>) => {
    if (!object || !canvas) return;
    object.set(changes);
    canvas.renderAll();
    saveHistory();
  };

  const handleFillChange = (color: any) => {
    const hex = color.toHexString();
    setFill(hex);
    updateObject({ fill: hex });
  };

  const handleFillToggle = (enabled: boolean) => {
    setHasFill(enabled);
    updateObject({ fill: enabled ? fill : 'transparent' });
  };

  const handleStrokeChange = (color: any) => {
    const hex = color.toHexString();
    setStroke(hex);
    updateObject({ stroke: hex });
  };

  const handleStrokeToggle = (enabled: boolean) => {
    setHasStroke(enabled);
    updateObject({ stroke: enabled ? stroke : 'transparent' });
  };

  const handleStrokeWidthChange = (value: number | null) => {
    if (value === null) return;
    setStrokeWidth(value);
    updateObject({ strokeWidth: value });
  };

  const handleStrokeDashChange = (value: string) => {
    setStrokeDashArray(value);

    let dashArray: number[] | undefined;
    switch (value) {
      case 'dashed':
        dashArray = [10, 5];
        break;
      case 'dotted':
        dashArray = [2, 4];
        break;
      default:
        dashArray = undefined;
    }

    updateObject({ strokeDashArray: dashArray });
  };

  return (
    <PropertySection title="Fill & Stroke">
      {/* Fill */}
      <PropertyRow label="Fill" inline>
        <Space>
          <Switch
            size="small"
            checked={hasFill}
            onChange={handleFillToggle}
          />
          {hasFill && (
            <ColorPicker
              value={fill}
              onChange={handleFillChange}
              size="small"
            />
          )}
        </Space>
      </PropertyRow>

      {/* Stroke */}
      <PropertyRow label="Stroke" inline>
        <Space>
          <Switch
            size="small"
            checked={hasStroke}
            onChange={handleStrokeToggle}
          />
          {hasStroke && (
            <ColorPicker
              value={stroke}
              onChange={handleStrokeChange}
              size="small"
            />
          )}
        </Space>
      </PropertyRow>

      {/* Stroke Width */}
      {hasStroke && (
        <PropertyRow label="Stroke Width" inline>
          <InputNumber
            size="small"
            value={strokeWidth}
            onChange={handleStrokeWidthChange}
            min={0}
            max={50}
            suffix="px"
            style={{ width: 80 }}
          />
        </PropertyRow>
      )}

      {/* Stroke Style */}
      {hasStroke && (
        <PropertyRow label="Stroke Style" inline>
          <Select
            size="small"
            value={strokeDashArray}
            onChange={handleStrokeDashChange}
            style={{ width: 100 }}
            options={[
              { value: 'solid', label: '━━━ Solid' },
              { value: 'dashed', label: '┄┄┄ Dashed' },
              { value: 'dotted', label: '··· Dotted' },
            ]}
          />
        </PropertyRow>
      )}
    </PropertySection>
  );
};

export default FillStrokeProperties;
```

---

## Step 5: Create Text Properties Component

**File**: `frontend/src/features/deck-editor/components/properties/TextProperties.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Select, InputNumber, ColorPicker, Space, Button, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
} from '@ant-design/icons';
import type { fabric } from 'fabric';
import { PropertySection } from './PropertySection';
import { PropertyRow } from './PropertyRow';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

// Common fonts
const fontOptions = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
];

interface TextPropertiesProps {
  object: fabric.IText | fabric.Text;
}

export const TextProperties: React.FC<TextPropertiesProps> = ({ object }) => {
  const { canvas, saveHistory } = useDeckCanvasStore();

  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [fontStyle, setFontStyle] = useState<string>('normal');
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<string>('left');
  const [fill, setFill] = useState<string>('#1f2937');
  const [lineHeight, setLineHeight] = useState(1.2);
  const [charSpacing, setCharSpacing] = useState(0);

  // Sync with object
  useEffect(() => {
    if (!object) return;

    setFontFamily(object.fontFamily || 'Inter, sans-serif');
    setFontSize(object.fontSize || 24);
    setFontWeight(object.fontWeight as string || 'normal');
    setFontStyle(object.fontStyle || 'normal');
    setUnderline(object.underline || false);
    setTextAlign(object.textAlign || 'left');
    setFill(object.fill as string || '#1f2937');
    setLineHeight(object.lineHeight || 1.2);
    setCharSpacing(object.charSpacing || 0);
  }, [object]);

  const updateObject = (changes: Partial<fabric.IText>) => {
    if (!object || !canvas) return;
    object.set(changes);
    canvas.renderAll();
    saveHistory();
  };

  return (
    <PropertySection title="Text">
      {/* Font Family */}
      <PropertyRow label="Font">
        <Select
          size="small"
          value={fontFamily}
          onChange={(v) => {
            setFontFamily(v);
            updateObject({ fontFamily: v });
          }}
          options={fontOptions}
          style={{ width: '100%' }}
          showSearch
        />
      </PropertyRow>

      {/* Font Size */}
      <PropertyRow label="Size" inline>
        <InputNumber
          size="small"
          value={fontSize}
          onChange={(v) => {
            if (v) {
              setFontSize(v);
              updateObject({ fontSize: v });
            }
          }}
          min={8}
          max={200}
          suffix="px"
          style={{ width: 80 }}
        />
      </PropertyRow>

      {/* Text Color */}
      <PropertyRow label="Color" inline>
        <ColorPicker
          value={fill}
          onChange={(color) => {
            const hex = color.toHexString();
            setFill(hex);
            updateObject({ fill: hex });
          }}
          size="small"
        />
      </PropertyRow>

      {/* Font Style Buttons */}
      <PropertyRow label="Style">
        <Space>
          <Tooltip title="Bold">
            <Button
              size="small"
              type={fontWeight === 'bold' ? 'primary' : 'default'}
              icon={<BoldOutlined />}
              onClick={() => {
                const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
                setFontWeight(newWeight);
                updateObject({ fontWeight: newWeight });
              }}
            />
          </Tooltip>
          <Tooltip title="Italic">
            <Button
              size="small"
              type={fontStyle === 'italic' ? 'primary' : 'default'}
              icon={<ItalicOutlined />}
              onClick={() => {
                const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
                setFontStyle(newStyle);
                updateObject({ fontStyle: newStyle });
              }}
            />
          </Tooltip>
          <Tooltip title="Underline">
            <Button
              size="small"
              type={underline ? 'primary' : 'default'}
              icon={<UnderlineOutlined />}
              onClick={() => {
                setUnderline(!underline);
                updateObject({ underline: !underline });
              }}
            />
          </Tooltip>
        </Space>
      </PropertyRow>

      {/* Text Alignment */}
      <PropertyRow label="Align">
        <Space>
          <Tooltip title="Align Left">
            <Button
              size="small"
              type={textAlign === 'left' ? 'primary' : 'default'}
              icon={<AlignLeftOutlined />}
              onClick={() => {
                setTextAlign('left');
                updateObject({ textAlign: 'left' });
              }}
            />
          </Tooltip>
          <Tooltip title="Align Center">
            <Button
              size="small"
              type={textAlign === 'center' ? 'primary' : 'default'}
              icon={<AlignCenterOutlined />}
              onClick={() => {
                setTextAlign('center');
                updateObject({ textAlign: 'center' });
              }}
            />
          </Tooltip>
          <Tooltip title="Align Right">
            <Button
              size="small"
              type={textAlign === 'right' ? 'primary' : 'default'}
              icon={<AlignRightOutlined />}
              onClick={() => {
                setTextAlign('right');
                updateObject({ textAlign: 'right' });
              }}
            />
          </Tooltip>
        </Space>
      </PropertyRow>

      {/* Line Height */}
      <PropertyRow label="Line Height" inline>
        <InputNumber
          size="small"
          value={lineHeight}
          onChange={(v) => {
            if (v) {
              setLineHeight(v);
              updateObject({ lineHeight: v });
            }
          }}
          min={0.5}
          max={3}
          step={0.1}
          style={{ width: 80 }}
        />
      </PropertyRow>

      {/* Character Spacing */}
      <PropertyRow label="Letter Spacing" inline>
        <InputNumber
          size="small"
          value={charSpacing}
          onChange={(v) => {
            if (v !== null) {
              setCharSpacing(v);
              updateObject({ charSpacing: v });
            }
          }}
          min={-100}
          max={500}
          style={{ width: 80 }}
        />
      </PropertyRow>
    </PropertySection>
  );
};

export default TextProperties;
```

---

## Step 6: Create Image Properties Component

**File**: `frontend/src/features/deck-editor/components/properties/ImageProperties.tsx`

```tsx
import React, { useCallback } from 'react';
import { Button, Space, Slider, Tooltip } from 'antd';
import {
  SwapOutlined,
  BorderOutlined,
  RadiusSettingOutlined,
} from '@ant-design/icons';
import type { fabric } from 'fabric';
import { PropertySection } from './PropertySection';
import { PropertyRow } from './PropertyRow';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';
import { useAssetBrowserStore, MediaAsset } from '../../stores/assetBrowserStore';

interface ImagePropertiesProps {
  object: fabric.Image;
}

export const ImageProperties: React.FC<ImagePropertiesProps> = ({ object }) => {
  const { canvas, saveHistory } = useDeckCanvasStore();
  const { openModal, setOnAssetSelect } = useAssetBrowserStore();

  const handleReplaceImage = useCallback(() => {
    const handleAssetSelected = (asset: MediaAsset) => {
      if (!canvas || !object) return;

      fabric.Image.fromURL(
        asset.url,
        (newImg) => {
          // Preserve transform from old image
          newImg.set({
            left: object.left,
            top: object.top,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            angle: object.angle,
            opacity: object.opacity,
          });

          (newImg as any).elementType = 'image';
          (newImg as any).assetId = asset.id;
          (newImg as any).assetUrl = asset.url;

          canvas.remove(object);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.renderAll();
          saveHistory();
        },
        { crossOrigin: 'anonymous' }
      );
    };

    setOnAssetSelect(handleAssetSelected);
    openModal();
  }, [canvas, object, saveHistory, setOnAssetSelect, openModal]);

  const handleCropToggle = useCallback(() => {
    // TODO: Implement crop mode
    console.log('Crop mode not yet implemented');
  }, []);

  return (
    <PropertySection title="Image">
      {/* Replace Image */}
      <PropertyRow label="Source">
        <Button
          size="small"
          icon={<SwapOutlined />}
          onClick={handleReplaceImage}
        >
          Replace Image
        </Button>
      </PropertyRow>

      {/* Crop button placeholder */}
      <PropertyRow label="Crop">
        <Button
          size="small"
          icon={<BorderOutlined />}
          onClick={handleCropToggle}
          disabled
        >
          Crop (Coming Soon)
        </Button>
      </PropertyRow>

      {/* Image info */}
      {object.width && object.height && (
        <PropertyRow label="Original Size">
          <span className="text-sm text-gray-500">
            {object.width} × {object.height}px
          </span>
        </PropertyRow>
      )}
    </PropertySection>
  );
};

export default ImageProperties;
```

---

## Step 7: Create Main Properties Panel

**File**: `frontend/src/features/deck-editor/components/PropertiesPanel.tsx`

```tsx
import React, { useEffect } from 'react';
import { Button, Tooltip, Empty, Divider } from 'antd';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import type { fabric } from 'fabric';
import { usePropertiesPanelStore } from '../stores/propertiesPanelStore';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';
import { TransformProperties } from './properties/TransformProperties';
import { FillStrokeProperties } from './properties/FillStrokeProperties';
import { TextProperties } from './properties/TextProperties';
import { ImageProperties } from './properties/ImageProperties';

export const PropertiesPanel: React.FC = () => {
  const {
    isOpen,
    closePanel,
    selectedObject,
    elementType,
    setSelectedObject,
    setSelectedCount,
  } = usePropertiesPanelStore();

  const { canvas } = useDeckCanvasStore();

  // Listen for canvas selection changes
  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      setSelectedObject(activeObject || null);

      // Check for multi-select
      if (activeObject?.type === 'activeSelection') {
        const selection = activeObject as fabric.ActiveSelection;
        setSelectedCount(selection.getObjects().length);
      } else {
        setSelectedCount(activeObject ? 1 : 0);
      }
    };

    const handleClear = () => {
      setSelectedObject(null);
      setSelectedCount(0);
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleClear);
    canvas.on('object:modified', handleSelection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleClear);
      canvas.off('object:modified', handleSelection);
    };
  }, [canvas, setSelectedObject, setSelectedCount]);

  if (!isOpen) {
    return null;
  }

  const renderProperties = () => {
    if (!selectedObject) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select an element to edit its properties"
          className="py-12"
        />
      );
    }

    return (
      <div className="space-y-2">
        {/* Transform always shown */}
        <TransformProperties object={selectedObject} />

        <Divider className="my-2" />

        {/* Type-specific properties */}
        {elementType === 'text' && (
          <TextProperties object={selectedObject as fabric.IText} />
        )}

        {elementType === 'shape' && (
          <FillStrokeProperties object={selectedObject} />
        )}

        {elementType === 'image' && (
          <ImageProperties object={selectedObject as fabric.Image} />
        )}

        {elementType === 'line' && (
          <FillStrokeProperties object={selectedObject} />
        )}

        {elementType === 'multiple' && (
          <div className="p-4 text-center text-gray-500">
            <p>Multiple objects selected</p>
            <p className="text-sm">Use transform controls to modify all</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <SettingOutlined />
          <span className="font-medium">Properties</span>
        </div>
        <Tooltip title="Close panel">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={closePanel}
          />
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {renderProperties()}
      </div>
    </div>
  );
};

export default PropertiesPanel;
```

---

## Step 8: Create Panel Toggle Button

**File**: `frontend/src/features/deck-editor/components/PropertiesPanelToggle.tsx`

```tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { usePropertiesPanelStore } from '../stores/propertiesPanelStore';

export const PropertiesPanelToggle: React.FC = () => {
  const { isOpen, togglePanel } = usePropertiesPanelStore();

  return (
    <Tooltip title={isOpen ? 'Hide Properties' : 'Show Properties'}>
      <Button
        icon={<SettingOutlined />}
        type={isOpen ? 'primary' : 'default'}
        onClick={togglePanel}
      />
    </Tooltip>
  );
};

export default PropertiesPanelToggle;
```

---

## Step 9: Integrate into Editor Layout

**Edit**: Main editor component to include the panel:

```tsx
import { PropertiesPanel } from './PropertiesPanel';
import { PropertiesPanelToggle } from './PropertiesPanelToggle';

// In the component:
<div className="flex h-full">
  {/* Left sidebar (slides list) */}
  <div className="w-64 border-r">
    {/* Slide thumbnails */}
  </div>

  {/* Main canvas area */}
  <div className="flex-1 flex flex-col">
    {/* Toolbar */}
    <div className="flex items-center gap-2 p-2 border-b">
      {/* ...other toolbar items */}
      <PropertiesPanelToggle />
    </div>

    {/* Canvas */}
    <div className="flex-1">
      <DeckCanvas />
    </div>
  </div>

  {/* Right properties panel */}
  <PropertiesPanel />
</div>
```

---

## Step 10: Export from Feature Index

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add exports:

```typescript
export * from './stores/propertiesPanelStore';
export * from './components/properties/PropertySection';
export * from './components/properties/PropertyRow';
export * from './components/properties/TransformProperties';
export * from './components/properties/FillStrokeProperties';
export * from './components/properties/TextProperties';
export * from './components/properties/ImageProperties';
export * from './components/PropertiesPanel';
export * from './components/PropertiesPanelToggle';
```

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run build` in frontend completes without errors
2. [ ] Properties panel appears on right side of editor
3. [ ] Panel shows "Select an element" when nothing selected
4. [ ] Selecting text shows text properties
5. [ ] Selecting shape shows fill/stroke properties
6. [ ] Selecting image shows image properties
7. [ ] Transform controls (position, size, rotation) work
8. [ ] Opacity slider works
9. [ ] Lock aspect ratio toggle works for size
10. [ ] Color pickers update elements immediately
11. [ ] Multi-select shows "Multiple objects selected"
12. [ ] Panel toggle button works

---

## Common Issues

1. **Properties not updating**: Ensure canvas selection events are properly bound
2. **Scale vs size confusion**: Remember fabric.js uses scaleX/scaleY, convert for display
3. **Color picker format**: Use `color.toHexString()` to get proper hex value
4. **TypeScript errors**: Cast objects to specific types (fabric.IText, fabric.Image)
