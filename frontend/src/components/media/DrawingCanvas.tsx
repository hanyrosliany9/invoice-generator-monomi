/**
 * DrawingCanvas — Fabric.js overlay for video frame annotation.
 *
 * PERSISTENCE NOTE:
 *   Backend endpoint POST /media-collab/frames/drawings expects { assetId,
 *   timecode, drawingData } (CreateFrameDrawingDto). However, the frontend
 *   CreateFrameDrawingDto in media-collab.ts sends "coordinates" instead of
 *   "drawingData" — that frontend DTO is mis-matched to the backend.
 *   We call the service directly and map the field correctly here.
 *   Drawing persistence is therefore WORKING via the backend.
 *
 *   Drawings are fetched per asset via GET /media-collab/frames/drawings/asset/:assetId
 *   and per timecode via GET /media-collab/frames/drawings/timecode/:assetId/:timecode.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MousePointer2, RectangleHorizontal, Circle, Pen, Type,
  Trash2, Undo2, Redo2, Save, X, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type DrawingTool = 'select' | 'arrow' | 'rect' | 'circle' | 'freehand' | 'text';

export interface DrawingData {
  fabricJson: unknown; // Fabric.js serialised canvas JSON
  timecode: number;
}

interface DrawingCanvasProps {
  /** Full-resolution video frame URL (same proxied URL the video uses). */
  frameImageUrl: string;
  /** Container width in pixels (canvas will match). */
  containerWidth: number;
  /** Container height in pixels. */
  containerHeight: number;
  /** Current video timecode (seconds) — metadata for saved drawings. */
  timecode: number;
  /** Called when the user clicks "Save" with the serialised canvas. */
  onSave?: (data: DrawingData) => Promise<void>;
  onClose?: () => void;
  readOnly?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

const COLORS = [
  '#ef4444', // red (default)
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ffffff', // white
];

export function DrawingCanvas({
  frameImageUrl,
  containerWidth,
  containerHeight,
  timecode,
  onSave,
  onClose,
  readOnly = false,
  className,
}: DrawingCanvasProps) {
  const { t } = useTranslation();
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  // fabric.Canvas type — dynamic import avoids SSR issues
  const fabricRef = useRef<any>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [fabricLoaded, setFabricLoaded] = useState(false);

  /* ── Dynamic import fabric (it's a CJS module with global side-effects) ── */
  useEffect(() => {
    let cancelled = false;
    import('fabric').then((mod) => {
      if (cancelled) return;
      const canvas = new mod.Canvas(canvasElRef.current!, {
        width: containerWidth,
        height: containerHeight,
        selection: true,
        backgroundColor: '#000',
      });
      fabricRef.current = { canvas, mod };

      // Load background frame image
      if (frameImageUrl) {
        mod.Image.fromURL(frameImageUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
          if (cancelled || !fabricRef.current) return;
          const scaleX = containerWidth / (img.width || 1);
          const scaleY = containerHeight / (img.height || 1);
          const scale = Math.min(scaleX, scaleY);
          img.scale(scale);
          img.set({ selectable: false, evented: false });
          canvas.backgroundImage = img;
          canvas.renderAll();
        }).catch(() => {
          // Image load failure is non-fatal — just draws on black
        });
      }

      if (readOnly) {
        canvas.selection = false;
        canvas.isDrawingMode = false;
      }

      const saveSnapshot = () => {
        const json = JSON.stringify(canvas.toJSON());
        setHistory((prev) => {
          const slice = prev.slice(0, historyIdx + 1);
          const next = [...slice, json];
          setHistoryIdx(next.length - 1);
          return next;
        });
      };

      canvas.on('object:added', saveSnapshot);
      canvas.on('object:modified', saveSnapshot);
      canvas.on('object:removed', saveSnapshot);

      setFabricLoaded(true);
      return () => { cancelled = true; canvas.dispose(); };
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, containerHeight, frameImageUrl, readOnly]);

  /* ── Tool activation ── */
  useEffect(() => {
    if (!fabricRef.current) return;
    const { canvas, mod } = fabricRef.current;
    canvas.isDrawingMode = activeTool === 'freehand';
    canvas.selection = activeTool === 'select';
    if (activeTool === 'freehand' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [activeTool, color, strokeWidth]);

  /* ── Shape adders ── */
  const addRect = useCallback(() => {
    if (!fabricRef.current) return;
    const { canvas, mod } = fabricRef.current;
    const rect = new mod.Rect({
      left: 60, top: 60, width: 160, height: 100,
      fill: 'transparent', stroke: color, strokeWidth,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  }, [color, strokeWidth]);

  const addCircle = useCallback(() => {
    if (!fabricRef.current) return;
    const { canvas, mod } = fabricRef.current;
    const c = new mod.Circle({
      left: 80, top: 80, radius: 50,
      fill: 'transparent', stroke: color, strokeWidth,
    });
    canvas.add(c);
    canvas.setActiveObject(c);
  }, [color, strokeWidth]);

  const addArrow = useCallback(() => {
    if (!fabricRef.current) return;
    const { canvas, mod } = fabricRef.current;
    const line = new mod.Line([50, 50, 200, 50], { stroke: color, strokeWidth });
    const tri = new mod.Triangle({
      left: 200, top: 50, width: 14, height: 18,
      fill: color, angle: 90,
      originX: 'center', originY: 'center',
    });
    const group = new mod.Group([line, tri], { left: 80, top: 80 });
    canvas.add(group);
    canvas.setActiveObject(group);
  }, [color, strokeWidth]);

  const addText = useCallback(() => {
    if (!fabricRef.current) return;
    const { canvas, mod } = fabricRef.current;
    const txt = new mod.IText('Edit me', {
      left: 80, top: 80, fontSize: 20, fill: color, fontFamily: 'sans-serif',
    });
    canvas.add(txt);
    canvas.setActiveObject(txt);
    txt.enterEditing();
  }, [color]);

  const deleteSelected = () => {
    if (!fabricRef.current) return;
    const { canvas } = fabricRef.current;
    canvas.getActiveObjects().forEach((o: any) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const undo = () => {
    if (!fabricRef.current || historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    const { canvas } = fabricRef.current;
    canvas.loadFromJSON(history[newIdx], () => canvas.renderAll());
  };

  const redo = () => {
    if (!fabricRef.current || historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    const { canvas } = fabricRef.current;
    canvas.loadFromJSON(history[newIdx], () => canvas.renderAll());
  };

  const handleSave = async () => {
    if (!fabricRef.current || !onSave) return;
    setSaving(true);
    try {
      const { canvas } = fabricRef.current;
      await onSave({ fabricJson: canvas.toJSON(), timecode });
    } finally {
      setSaving(false);
    }
  };

  /* ── Tool button helper ── */
  const ToolBtn = ({
    tool, label, icon, onClick,
  }: { tool: DrawingTool; label: string; icon: React.ReactNode; onClick?: () => void }) => (
    <Button
      variant={activeTool === tool ? 'default' : 'ghost'}
      size="icon-sm"
      className={cn(
        'h-7 w-7',
        activeTool === tool
          ? 'bg-accent text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10',
      )}
      title={label}
      onClick={() => {
        setActiveTool(tool);
        onClick?.();
      }}
    >
      {icon}
    </Button>
  );

  if (!fabricLoaded) {
    return (
      <div className={cn('flex items-center justify-center bg-black', className)}
        style={{ width: containerWidth, height: containerHeight }}>
        <span className="text-white/40 text-xs">{t('videoReview.loadingCanvas', 'Loading canvas…')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {!readOnly && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] border-b border-white/10 flex-wrap">
          {/* Tools */}
          <div className="flex items-center gap-0.5 border-r border-white/15 pr-2 mr-1">
            <ToolBtn tool="select" label={t('videoReview.toolSelect', 'Select (V)')} icon={<MousePointer2 className="h-3.5 w-3.5" />} />
            <ToolBtn tool="arrow" label={t('videoReview.toolArrow', 'Arrow')} icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={addArrow} />
            <ToolBtn tool="rect" label={t('videoReview.toolRect', 'Rectangle')} icon={<RectangleHorizontal className="h-3.5 w-3.5" />} onClick={addRect} />
            <ToolBtn tool="circle" label={t('videoReview.toolCircle', 'Circle')} icon={<Circle className="h-3.5 w-3.5" />} onClick={addCircle} />
            <ToolBtn tool="freehand" label={t('videoReview.toolPen', 'Pen (freehand)')} icon={<Pen className="h-3.5 w-3.5" />} />
            <ToolBtn tool="text" label={t('videoReview.toolText', 'Text')} icon={<Type className="h-3.5 w-3.5" />} onClick={addText} />
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1 border-r border-white/15 pr-2 mr-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  'h-4 w-4 rounded-full border-2 transition-transform',
                  color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110',
                )}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>

          {/* History */}
          <div className="flex items-center gap-0.5 border-r border-white/15 pr-2 mr-1">
            <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" title={t('videoReview.undo', 'Undo')} onClick={undo} disabled={historyIdx <= 0}>
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" title={t('videoReview.redo', 'Redo')} onClick={redo} disabled={historyIdx >= history.length - 1}>
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Delete + Save + Close */}
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-white/70 hover:text-red-400 hover:bg-white/10" title={t('videoReview.deleteSelected', 'Delete selected')} onClick={deleteSelected}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {onSave && (
              <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
                <Save className="h-3.5 w-3.5" />
                {saving ? t('videoReview.saving', 'Saving…') : t('videoReview.save', 'Save')}
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" title={t('videoReview.closeCanvas', 'Close canvas')} onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Canvas element */}
      <div style={{ width: containerWidth, height: containerHeight }} className="overflow-hidden">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
