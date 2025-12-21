import { Button, Tooltip, Space } from 'antd';
import { Canvas as FabricCanvas, Rect, Circle, IText } from 'fabric';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface QuickShapeBarProps {
  canvas: FabricCanvas | null;
  disabled?: boolean;
}

export default function QuickShapeBar({ canvas, disabled }: QuickShapeBarProps) {
  const { pushHistory } = useDeckCanvasStore();

  const addQuickShape = (type: 'rect' | 'circle' | 'text') => {
    if (!canvas) return;

    const center = canvas.getCenter();
    let obj: any;

    switch (type) {
      case 'rect':
        obj = new Rect({
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
        obj.set('elementType', 'shape');
        obj.set('shapeId', 'rect');
        break;

      case 'circle':
        obj = new Circle({
          left: center.left,
          top: center.top,
          radius: 50,
          fill: '#10b981',
          stroke: '#047857',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        obj.set('elementType', 'shape');
        obj.set('shapeId', 'circle');
        break;

      case 'text':
        obj = new IText('Double click to edit', {
          left: center.left,
          top: center.top,
          fontSize: 24,
          fontFamily: 'Inter, sans-serif',
          fill: '#1f2937',
          originX: 'center',
          originY: 'center',
        });
        obj.set('elementType', 'text');
        break;

      default:
        return;
    }

    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
  };

  return (
    <Space size={4}>
      <Tooltip title="Add Rectangle (R)">
        <Button
          onClick={() => addQuickShape('rect')}
          disabled={disabled}
          style={{ width: 40, height: 40 }}
        >
          ▭
        </Button>
      </Tooltip>
      <Tooltip title="Add Circle (C)">
        <Button
          onClick={() => addQuickShape('circle')}
          disabled={disabled}
          style={{ width: 40, height: 40 }}
        >
          ○
        </Button>
      </Tooltip>
      <Tooltip title="Add Text (T)">
        <Button
          onClick={() => addQuickShape('text')}
          disabled={disabled}
          style={{ width: 40, height: 40 }}
        >
          <strong>T</strong>
        </Button>
      </Tooltip>
    </Space>
  );
}
