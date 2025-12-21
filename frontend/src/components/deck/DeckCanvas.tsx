import { useEffect, useRef, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricObject, FabricImage } from 'fabric';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface DeckCanvasProps {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImage?: string;
  onSelectionChange?: (objectIds: string[]) => void;
  onCanvasReady?: (canvas: FabricCanvas) => void;
  onObjectModified?: (object: FabricObject) => void;
}

export default function DeckCanvas({
  width,
  height,
  backgroundColor = '#ffffff',
  backgroundImage,
  onSelectionChange,
  onCanvasReady,
  onObjectModified,
}: DeckCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const { setCanvas, pushHistory, setSelectedObjectIds } = useDeckCanvasStore();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricRef.current = canvas;
    setCanvas(canvas);

    // Selection events
    canvas.on('selection:created', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChange?.(ids);
    });

    canvas.on('selection:updated', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChange?.(ids);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObjectIds([]);
      onSelectionChange?.([]);
    });

    // Object modified (move, resize, rotate)
    canvas.on('object:modified', (e) => {
      if (e.target) {
        onObjectModified?.(e.target);
        // Save to history
        const json = canvas.toJSON();
        pushHistory(JSON.stringify(json));
      }
    });

    // Text editing events
    canvas.on('text:editing:entered', () => {
      // Disable canvas selection while editing text
      canvas.selection = false;
    });

    canvas.on('text:editing:exited', () => {
      canvas.selection = true;
      // Save history when done editing
      const json = canvas.toJSON();
      pushHistory(JSON.stringify(json));
    });

    // Initial history entry
    const initialJson = canvas.toJSON();
    pushHistory(JSON.stringify(initialJson));

    onCanvasReady?.(canvas);

    return () => {
      canvas.dispose();
      setCanvas(null);
    };
  }, []);

  // Update dimensions
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width, height });
    }
  }, [width, height]);

  // Update background color
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = backgroundColor;
      fabricRef.current.renderAll();
    }
  }, [backgroundColor]);

  // Update background image
  useEffect(() => {
    if (fabricRef.current && backgroundImage) {
      const fabricCanvas = fabricRef.current;
      FabricImage.fromURL(backgroundImage, {
        crossOrigin: 'anonymous',
      }).then((img) => {
        if (fabricCanvas) {
          img.scaleToWidth(width);
          fabricCanvas.backgroundImage = img;
          fabricCanvas.renderAll();
        }
      }).catch((err) => {
        console.error('Failed to load background image:', err);
      });
    } else if (fabricRef.current) {
      fabricRef.current.backgroundImage = undefined;
      fabricRef.current.renderAll();
    }
  }, [backgroundImage, width]);

  return (
    <div
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'inline-block',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
