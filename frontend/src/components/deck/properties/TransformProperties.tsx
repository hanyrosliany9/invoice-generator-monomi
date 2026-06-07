import { useEffect, useState } from 'react';
import { InputNumber, Slider, Space, Button, Tooltip } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { FabricObject } from 'fabric';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';

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
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
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
    </PropertySection>
  );
}
