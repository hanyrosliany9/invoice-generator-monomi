import { useEffect, useState } from 'react';
import { InputNumber, Slider, Space, Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined, SwapOutlined } from '@ant-design/icons';
import type { FabricObject } from 'fabric';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';
import { DECK_TOJSON_PROPS, applyLockState } from '../../../utils/deckCanvasUtils';

interface TransformPropertiesProps {
  object: FabricObject;
}

export default function TransformProperties({ object }: TransformPropertiesProps) {
  const { canvas, pushHistory } = useDeckCanvasStore();
  const [lockAspect, setLockAspect] = useState(true);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [locked, setLocked] = useState(false);

  // Sync state with object
  useEffect(() => {
    if (!object) return;

    const updateFromObject = () => {
      setPosition({
        x: Math.round(object.left || 0),
        y: Math.round(object.top || 0),
      });
      setSize({
        width: Math.round(((object.width || 0) * (object.scaleX || 1))),
        height: Math.round(((object.height || 0) * (object.scaleY || 1))),
      });
      setRotation(Math.round(object.angle || 0));
      setOpacity(Math.round(((object.opacity || 1) * 100)));
      setLocked(!!(object as any).isLocked || !!object.lockMovementX);
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

  const updateObject = (changes: Record<string, any>) => {
    if (!object || !canvas) return;
    object.set(changes);
    object.setCoords();
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(DECK_TOJSON_PROPS)));
    canvas.fire('object:modified', { target: object });
  };

  const handleFlip = (axis: 'x' | 'y') => {
    if (!object) return;
    const key = axis === 'x' ? 'flipX' : 'flipY';
    updateObject({ [key]: !object.get(key) });
  };

  const handleLockToggle = () => {
    if (!object || !canvas) return;
    const next = !locked;
    setLocked(next);
    (object as any).isLocked = next;
    applyLockState(object, next);
    if (!next) {
      // Unlock: restore interactivity.
      object.set({
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        hasControls: true,
      });
    }
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(DECK_TOJSON_PROPS)));
    canvas.fire('object:modified', { target: object });
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number | null) => {
    if (value === null) return;
    const key = axis === 'x' ? 'left' : 'top';
    setPosition((prev) => ({ ...prev, [axis]: value }));
    updateObject({ [key]: value });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number | null) => {
    if (value === null || !object) return;

    // Use live unrounded fabric dimensions to derive ratio and compute scales,
    // avoiding rounding-error accumulation from repeated edits.
    const liveWidth = (object.width || 1) * (object.scaleX || 1);
    const liveHeight = (object.height || 1) * (object.scaleY || 1);
    const aspectRatio = liveWidth / liveHeight;

    let newWidth: number;
    let newHeight: number;

    if (dimension === 'width') {
      newWidth = value;
      newHeight = lockAspect ? value / aspectRatio : liveHeight;
    } else {
      newHeight = value;
      newWidth = lockAspect ? value * aspectRatio : liveWidth;
    }

    const scaleX = newWidth / (object.width || 1);
    const scaleY = newHeight / (object.height || 1);

    // Display rounded values; actual scales are kept precise.
    setSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
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
        <Space size={4} style={{ width: '100%' }}>
          <InputNumber
            size="small"
            value={position.x}
            onChange={(v) => handlePositionChange('x', v)}
            placeholder="X"
            style={{ width: 70 }}
          />
          <InputNumber
            size="small"
            value={position.y}
            onChange={(v) => handlePositionChange('y', v)}
            placeholder="Y"
            style={{ width: 70 }}
          />
        </Space>
      </PropertyRow>

      {/* Size */}
      <PropertyRow label="Size">
        <Space size={4} style={{ width: '100%' }}>
          <InputNumber
            size="small"
            value={size.width}
            onChange={(v) => handleSizeChange('width', v)}
            placeholder="W"
            min={1}
            style={{ width: 70 }}
          />
          <Tooltip title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}>
            <Button
              size="small"
              icon={lockAspect ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => setLockAspect(!lockAspect)}
              style={{ minWidth: 32 }}
            />
          </Tooltip>
          <InputNumber
            size="small"
            value={size.height}
            onChange={(v) => handleSizeChange('height', v)}
            placeholder="H"
            min={1}
            style={{ width: 70 }}
          />
        </Space>
      </PropertyRow>

      {/* Rotation */}
      <PropertyRow label="Rotation" inline>
        <Space size={4}>
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
            style={{ width: 65 }}
          />
        </Space>
      </PropertyRow>

      {/* Opacity */}
      <PropertyRow label="Opacity" inline>
        <Space size={4}>
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
            style={{ width: 65 }}
          />
        </Space>
      </PropertyRow>

      {/* Flip & Lock */}
      <PropertyRow label="Arrange" inline>
        <Space size={4}>
          <Tooltip title="Flip horizontal (Shift+H)">
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleFlip('x')} />
          </Tooltip>
          <Tooltip title="Flip vertical (Shift+V)">
            <Button
              size="small"
              icon={<SwapOutlined rotate={90} />}
              onClick={() => handleFlip('y')}
            />
          </Tooltip>
          <Tooltip title={locked ? 'Unlock element' : 'Lock element'}>
            <Button
              size="small"
              type={locked ? 'primary' : 'default'}
              icon={locked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={handleLockToggle}
            />
          </Tooltip>
        </Space>
      </PropertyRow>
    </PropertySection>
  );
}
