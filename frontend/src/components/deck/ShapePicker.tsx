import { useState } from 'react';
import { Popover, Button, Tooltip, Tabs } from 'antd';
import { BorderOutlined, StarOutlined, RightOutlined, MessageOutlined, VideoCameraOutlined, ApartmentOutlined } from '@ant-design/icons';
import { Canvas as FabricCanvas } from 'fabric';
import {
  shapeDefinitions,
  shapeCategories,
  getShapesByCategory,
  type ShapeCategory,
} from '../../utils/shapeDefinitions';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface ShapePickerProps {
  canvas: FabricCanvas | null;
  onShapeAdd?: (shapeType: string) => void;
  disabled?: boolean;
}

const categoryIcons: Record<ShapeCategory, React.ReactNode> = {
  basic: <BorderOutlined />,
  arrows: <RightOutlined />,
  callouts: <MessageOutlined />,
  production: <VideoCameraOutlined />,
  flowchart: <ApartmentOutlined />,
};

export default function ShapePicker({ canvas, onShapeAdd, disabled }: ShapePickerProps) {
  const [open, setOpen] = useState(false);
  const { pushHistory } = useDeckCanvasStore();

  const handleShapeClick = (shapeId: string) => {
    if (!canvas) return;

    const shapeDef = shapeDefinitions.find(s => s.id === shapeId);
    if (!shapeDef) return;

    const center = canvas.getCenter();
    const obj = shapeDef.create({
      left: center.left,
      top: center.top,
      originX: 'center',
      originY: 'center',
    });

    obj.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    obj.set('elementType', 'shape');
    obj.set('shapeId', shapeId);

    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));

    onShapeAdd?.(shapeId);
    setOpen(false);
  };

  const renderShapeGrid = (shapeDefs: typeof shapeDefinitions) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {shapeDefs.map((shape) => (
        <Tooltip key={shape.id} title={shape.name}>
          <Button
            style={{
              width: 48,
              height: 48,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => handleShapeClick(shape.id)}
          >
            {shape.icon}
          </Button>
        </Tooltip>
      ))}
    </div>
  );

  const tabItems = shapeCategories.map((cat) => ({
    key: cat.id,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {categoryIcons[cat.id]}
        <span>{cat.name}</span>
      </span>
    ),
    children: renderShapeGrid(getShapesByCategory(cat.id)),
  }));

  const content = (
    <div style={{ width: 280 }}>
      <Tabs
        defaultActiveKey="basic"
        items={tabItems}
        size="small"
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
      placement="bottom"
    >
      <Button icon={<StarOutlined />} disabled={disabled}>
        Shapes
      </Button>
    </Popover>
  );
}
