import React, { useEffect, useRef, useState } from 'react';
import { Canvas, Image, Circle, Rect, Line, Textbox, IText, Triangle, Group, Object as FabricObject, util } from 'fabric';
import { Button, Space, Select, Slider, Tooltip, theme } from 'antd';
import {
  BorderOutlined,
  LineOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';

export interface DrawingData {
  type: 'arrow' | 'rectangle' | 'circle' | 'freehand' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  text?: string;
  color: string;
  strokeWidth: number;
  timecode?: number;
  drawingData?: any; // fabric.js serialized data
}

interface DrawingCanvasProps {
  assetId: string;
  frameId?: string;
  imageUrl: string;
  width?: number;
  height?: number;
  timecode?: number;
  onSave?: (drawingData: any) => Promise<void>;
  onClose?: () => void;
  existingDrawings?: DrawingData[];
  readOnly?: boolean;
}

type DrawingTool = 'select' | 'arrow' | 'rectangle' | 'circle' | 'freehand' | 'text';

/**
 * DrawingCanvas Component
 *
 * Provides drawing annotation tools using fabric.js:
 * - Arrow annotations
 * - Rectangle highlights
 * - Circle markers
 * - Freehand drawing
 * - Text notes
 */
export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  assetId,
  frameId,
  imageUrl,
  width = 1200,
  height = 675,
  timecode = 0,
  onSave,
  onClose,
  existingDrawings = [],
  readOnly = false,
}) => {
  const { token } = theme.useToken();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [strokeColor, setStrokeColor] = useState(token.colorError);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [history, setHistory] = useState<any[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: token.colorBgBase,
      selection: activeTool === 'select',
    });

    fabricCanvasRef.current = canvas;

    // Load background image
    Image.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((img: FabricObject) => {
      const scale = Math.min(width / (img.width || 1), height / (img.height || 1));
      img.scale(scale);
      img.set({
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = img;
      canvas.renderAll();
    });

    // Load existing drawings
    if (existingDrawings.length > 0) {
      existingDrawings.forEach((drawing) => {
        if (drawing.drawingData) {
          util.enlivenObjects([drawing.drawingData], {}).then((objects: any[]) => {
            objects.forEach((obj: any) => {
              obj.set({ selectable: !readOnly });
              canvas.add(obj);
            });
            canvas.renderAll();
          });
        }
      });
    }

    // Save to history on object modification
    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, width, height, existingDrawings, readOnly]);

  // Update canvas selection mode
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.selection = activeTool === 'select';
      fabricCanvasRef.current.isDrawingMode = activeTool === 'freehand';
    }
  }, [activeTool]);

  const saveHistory = () => {
    if (!fabricCanvasRef.current) return;

    const json = fabricCanvasRef.current.toJSON();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(json);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0 && fabricCanvasRef.current) {
      setHistoryStep(historyStep - 1);
      fabricCanvasRef.current.loadFromJSON(history[historyStep - 1], () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1 && fabricCanvasRef.current) {
      setHistoryStep(historyStep + 1);
      fabricCanvasRef.current.loadFromJSON(history[historyStep + 1], () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  };

  const handleToolChange = (tool: DrawingTool) => {
    setActiveTool(tool);
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.isDrawingMode = false;
    canvas.selection = tool === 'select';

    if (tool === 'freehand') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
      }
    }
  };

  const addRectangle = () => {
    if (!fabricCanvasRef.current) return;

    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!fabricCanvasRef.current) return;

    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
  };

  const addArrow = () => {
    if (!fabricCanvasRef.current) return;

    // Create arrow using line with triangle
    const line = new Line([50, 50, 200, 50], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const triangle = new Triangle({
      left: 200,
      top: 50,
      width: 15,
      height: 20,
      fill: strokeColor,
      angle: 90,
      originX: 'center',
      originY: 'center',
    });

    const group = new Group([line, triangle], {
      left: 100,
      top: 100,
    });

    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.setActiveObject(group);
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new IText('Click to edit', {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: strokeColor,
      fontFamily: 'Arial',
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        fabricCanvasRef.current?.remove(obj);
      });
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleSave = () => {
    if (!fabricCanvasRef.current || !onSave) return;

    const objects = fabricCanvasRef.current.getObjects().filter((obj: FabricObject) => obj !== fabricCanvasRef.current?.backgroundImage);

    const drawingData = objects.map((obj: FabricObject) => obj.toJSON());

    onSave({
      timecode,
      drawingData,
    });
  };

  const colorOptions = [
    { label: 'Red', value: token.colorError },
    { label: 'Blue', value: token.colorPrimary },
    { label: 'Green', value: token.colorSuccess },
    { label: 'Yellow', value: token.colorWarning },
    { label: 'Orange', value: token.orange },
    { label: 'Purple', value: token.purple },
    { label: 'White', value: token.colorBgContainer },
  ];

  if (readOnly) {
    return (
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px',
          backgroundColor: token.colorBgElevated,
          borderRadius: token.borderRadius,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Drawing Tools */}
        <Space>
          <Tooltip title="Select (V)">
            <Button
              icon={<EditOutlined />}
              type={activeTool === 'select' ? 'primary' : 'default'}
              onClick={() => handleToolChange('select')}
            />
          </Tooltip>
          <Tooltip title="Arrow">
            <Button
              icon={<LineOutlined />}
              type={activeTool === 'arrow' ? 'primary' : 'default'}
              onClick={() => {
                handleToolChange('arrow');
                addArrow();
              }}
            />
          </Tooltip>
          <Tooltip title="Rectangle">
            <Button
              icon={<BorderOutlined />}
              type={activeTool === 'rectangle' ? 'primary' : 'default'}
              onClick={() => {
                handleToolChange('rectangle');
                addRectangle();
              }}
            />
          </Tooltip>
          <Tooltip title="Circle">
            <Button
              icon={<BorderOutlined />}
              style={{ borderRadius: '50%' }}
              type={activeTool === 'circle' ? 'primary' : 'default'}
              onClick={() => {
                handleToolChange('circle');
                addCircle();
              }}
            />
          </Tooltip>
          <Tooltip title="Freehand (F)">
            <Button
              type={activeTool === 'freehand' ? 'primary' : 'default'}
              onClick={() => handleToolChange('freehand')}
            >
              Pen
            </Button>
          </Tooltip>
          <Tooltip title="Text (T)">
            <Button
              type={activeTool === 'text' ? 'primary' : 'default'}
              onClick={() => {
                handleToolChange('text');
                addText();
              }}
            >
              Text
            </Button>
          </Tooltip>
        </Space>

        {/* Color Picker */}
        <Select
          value={strokeColor}
          onChange={setStrokeColor}
          style={{ width: 120 }}
          options={colorOptions}
        />

        {/* Stroke Width */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 150 }}>
          <span style={{ color: token.colorText, fontSize: '12px' }}>Width:</span>
          <Slider
            min={1}
            max={10}
            value={strokeWidth}
            onChange={setStrokeWidth}
            style={{ flex: 1 }}
          />
        </div>

        {/* History Controls */}
        <Space>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button icon={<UndoOutlined />} onClick={undo} disabled={historyStep <= 0} />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button icon={<RedoOutlined />} onClick={redo} disabled={historyStep >= history.length - 1} />
          </Tooltip>
        </Space>

        {/* Actions */}
        <Space style={{ marginLeft: 'auto' }}>
          <Button icon={<DeleteOutlined />} onClick={deleteSelected} danger>
            Delete
          </Button>
          {onSave && (
            <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>
              Save
            </Button>
          )}
          {onClose && (
            <Button icon={<CloseOutlined />} onClick={onClose}>
              Close
            </Button>
          )}
        </Space>
      </div>

      {/* Canvas */}
      <div style={{ border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, overflow: 'hidden' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
