import { useEffect, useState } from 'react';
import { ColorPicker, InputNumber, Select, Space, Switch } from 'antd';
import { Shadow, type FabricObject } from 'fabric';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';
import { DECK_TOJSON_PROPS } from '../../../utils/deckCanvasUtils';

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
  // Corner radius applies to rect-like shapes only (they have rx/ry).
  const isRect = object && typeof (object as any).rx === 'number';
  const [cornerRadius, setCornerRadius] = useState(0);
  const [hasShadow, setHasShadow] = useState(false);
  const [shadowColor, setShadowColor] = useState('rgba(0,0,0,0.35)');
  const [shadowBlur, setShadowBlur] = useState(8);
  const [shadowOffsetX, setShadowOffsetX] = useState(4);
  const [shadowOffsetY, setShadowOffsetY] = useState(4);

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

    setCornerRadius(((object as any).rx as number) || 0);

    const sh = object.shadow as Shadow | null | undefined;
    setHasShadow(!!sh);
    if (sh) {
      setShadowColor(sh.color || 'rgba(0,0,0,0.35)');
      setShadowBlur(sh.blur || 0);
      setShadowOffsetX(sh.offsetX || 0);
      setShadowOffsetY(sh.offsetY || 0);
    }
  }, [object]);

  const updateObject = (changes: Record<string, any>) => {
    if (!object || !canvas) return;
    object.set(changes);
    object.setCoords();
    canvas.renderAll();
    // Persist via the autosave path AND push undo history with all bespoke props.
    pushHistory(JSON.stringify((canvas as any).toJSON(DECK_TOJSON_PROPS)));
    canvas.fire('object:modified', { target: object });
  };

  const handleCornerRadius = (value: number | null) => {
    if (value === null) return;
    setCornerRadius(value);
    updateObject({ rx: value, ry: value });
  };

  const applyShadow = (
    enabled: boolean,
    color = shadowColor,
    blur = shadowBlur,
    ox = shadowOffsetX,
    oy = shadowOffsetY,
  ) => {
    updateObject({
      shadow: enabled ? new Shadow({ color, blur, offsetX: ox, offsetY: oy }) : null,
    });
  };

  const handleShadowToggle = (enabled: boolean) => {
    setHasShadow(enabled);
    applyShadow(enabled);
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

      {/* Corner Radius (rect-like shapes only) */}
      {isRect && (
        <PropertyRow label="Corner" inline>
          <InputNumber
            size="small"
            value={cornerRadius}
            onChange={handleCornerRadius}
            min={0}
            max={200}
            suffix="px"
            style={{ width: 80 }}
          />
        </PropertyRow>
      )}

      {/* Shadow */}
      <PropertyRow label="Shadow" inline>
        <Switch size="small" checked={hasShadow} onChange={handleShadowToggle} />
      </PropertyRow>
      {hasShadow && (
        <>
          <PropertyRow label="Shadow color" inline>
            <ColorPicker
              value={shadowColor}
              onChange={(c) => {
                const hex = c.toRgbString();
                setShadowColor(hex);
                applyShadow(true, hex);
              }}
              showText
            />
          </PropertyRow>
          <PropertyRow label="Blur" inline>
            <InputNumber
              size="small"
              value={shadowBlur}
              min={0}
              max={100}
              style={{ width: 80 }}
              onChange={(v) => {
                if (v === null) return;
                setShadowBlur(v);
                applyShadow(true, shadowColor, v);
              }}
            />
          </PropertyRow>
          <PropertyRow label="Offset X" inline>
            <InputNumber
              size="small"
              value={shadowOffsetX}
              min={-100}
              max={100}
              style={{ width: 80 }}
              onChange={(v) => {
                if (v === null) return;
                setShadowOffsetX(v);
                applyShadow(true, shadowColor, shadowBlur, v);
              }}
            />
          </PropertyRow>
          <PropertyRow label="Offset Y" inline>
            <InputNumber
              size="small"
              value={shadowOffsetY}
              min={-100}
              max={100}
              style={{ width: 80 }}
              onChange={(v) => {
                if (v === null) return;
                setShadowOffsetY(v);
                applyShadow(true, shadowColor, shadowBlur, shadowOffsetX, v);
              }}
            />
          </PropertyRow>
        </>
      )}
    </PropertySection>
  );
}
