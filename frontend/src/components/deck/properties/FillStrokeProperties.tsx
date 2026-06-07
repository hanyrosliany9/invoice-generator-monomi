import { useEffect, useState } from 'react';
import { ColorPicker, InputNumber, Select, Space, Switch } from 'antd';
import type { FabricObject } from 'fabric';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';

interface FillStrokePropertiesProps {
  object: FabricObject;
}

export default function FillStrokeProperties({ object }: FillStrokePropertiesProps) {
  const { canvas, pushHistory } = useDeckCanvasStore();

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

    setStrokeWidth((object.strokeWidth || 2) as number);

    // Detect dash array
    const dashArray = object.strokeDashArray as number[] | undefined;
    if (!dashArray || dashArray.length === 0) {
      setStrokeDashArray('solid');
    } else if (dashArray[0] > 5) {
      setStrokeDashArray('dashed');
    } else {
      setStrokeDashArray('dotted');
    }
  }, [object]);

  const updateObject = (changes: Record<string, any>) => {
    if (!object || !canvas) return;
    object.set(changes);
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
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
        <Space size={4}>
          <Switch
            size="small"
            checked={hasFill}
            onChange={handleFillToggle}
          />
          {hasFill && (
            <ColorPicker
              value={fill}
              onChange={handleFillChange}
              showText
            />
          )}
        </Space>
      </PropertyRow>

      {/* Stroke */}
      <PropertyRow label="Stroke" inline>
        <Space size={4}>
          <Switch
            size="small"
            checked={hasStroke}
            onChange={handleStrokeToggle}
          />
          {hasStroke && (
            <ColorPicker
              value={stroke}
              onChange={handleStrokeChange}
              showText
            />
          )}
        </Space>
      </PropertyRow>

      {/* Stroke Width */}
      {hasStroke && (
        <PropertyRow label="Width" inline>
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
        <PropertyRow label="Style" inline>
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
}
