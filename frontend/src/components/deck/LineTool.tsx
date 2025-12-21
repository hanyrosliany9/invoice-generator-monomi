import { useTheme } from '../../theme';
import { useState, useCallback, useEffect } from 'react';
import { Button, Dropdown, ColorPicker, InputNumber, Space, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { LineOutlined } from '@ant-design/icons';
import { Canvas as FabricCanvas, Line, Triangle } from 'fabric';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

type LineStyle = 'solid' | 'dashed' | 'dotted';
type ArrowStyle = 'none' | 'start' | 'end' | 'both';

interface LineToolProps {
  canvas: FabricCanvas | null;
  disabled?: boolean;
}

export default function LineTool({ canvas, disabled }: LineToolProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [arrowStyle, setArrowStyle] = useState<ArrowStyle>('none');
  const [strokeColor, setStrokeColor] = useState('#374151');
  const [strokeWidth, setStrokeWidth] = useState(2);

  const { pushHistory } = useDeckCanvasStore();

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

  const createArrowHead = (x: number, y: number, angle: number): Triangle => {
    return new Triangle({
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
    let tempLine: Line | null = null;

    const onMouseDown = (opt: any) => {
      const pointer = canvas.getPointer(opt.e);
      startPoint = { x: pointer.x, y: pointer.y };

      tempLine = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: getStrokeDashArray(lineStyle),
        selectable: false,
        evented: false,
      });

      canvas.add(tempLine);
    };

    const onMouseMove = (opt: any) => {
      if (!startPoint || !tempLine) return;

      const pointer = canvas.getPointer(opt.e);
      tempLine.set({ x2: pointer.x, y2: pointer.y });
      canvas.renderAll();
    };

    const onMouseUp = (opt: any) => {
      if (!startPoint || !tempLine) return;

      const pointer = canvas.getPointer(opt.e);

      // Remove temp line
      canvas.remove(tempLine);

      // Create final line
      const line = new Line(
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
      pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));

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
  }, [canvas, strokeColor, strokeWidth, lineStyle, arrowStyle, pushHistory]);

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
      <Tooltip title="Draw Line">
        <Button
          icon={<LineOutlined />}
          onClick={isDrawing ? disableDrawMode : enableDrawMode}
          type={isDrawing ? 'primary' : 'default'}
          disabled={disabled}
        >
          Line
        </Button>
      </Tooltip>
      <Dropdown menu={{ items: lineStyleItems, onClick: handleLineStyleClick }} disabled={disabled}>
        <Button>Style</Button>
      </Dropdown>
      <Dropdown menu={{ items: arrowItems, onClick: handleArrowClick }} disabled={disabled}>
        <Button>Arrow</Button>
      </Dropdown>
      <ColorPicker
        value={strokeColor}
        onChange={(color) => setStrokeColor(color.toHexString())}
        showText
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
}
