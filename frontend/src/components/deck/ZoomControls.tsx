import React from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useDeckCanvasStore } from '@/stores/deckCanvasStore';

interface ZoomControlsProps {
  className?: string;
}

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;

/**
 * Zoom controls widget: zoom-out (−), % readout, zoom-in (+), and Fit.
 *
 * Wires into useDeckCanvasStore for zoom / setZoom. The sibling canvas agent
 * is adding zoomIn / zoomOut / zoomToFit / resetZoom actions; this component
 * calls them when they exist and falls back to manual setZoom arithmetic so
 * it works even before those actions land.
 */
const ZoomControls: React.FC<ZoomControlsProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  // Access the full store object so we can call optional actions that the
  // sibling agent is adding (zoomIn, zoomOut, zoomToFit, resetZoom).
  const store = useDeckCanvasStore();
  const { zoom, setZoom } = store;

  // Helper: call the named action if it exists on the store, else fall back.
  const callOrFallback = (
    actionName: keyof typeof store,
    fallback: () => void,
  ) => {
    const fn = store[actionName];
    if (typeof fn === 'function') {
      (fn as () => void)();
    } else {
      fallback();
    }
  };

  const handleZoomOut = () => {
    callOrFallback(
      'zoomOut' as keyof typeof store,
      () => setZoom(Math.max(ZOOM_MIN, parseFloat((zoom - ZOOM_STEP).toFixed(2)))),
    );
  };

  const handleZoomIn = () => {
    callOrFallback(
      'zoomIn' as keyof typeof store,
      () => setZoom(Math.min(ZOOM_MAX, parseFloat((zoom + ZOOM_STEP).toFixed(2)))),
    );
  };

  const handleFit = () => {
    callOrFallback(
      'zoomToFit' as keyof typeof store,
      () => setZoom(1),
    );
  };

  const percent = Math.round(zoom * 100);

  return (
    <div
      className={`flex items-center gap-0.5 rounded border border-border-subtle bg-bg-base px-1 ${className}`}
    >
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoom <= ZOOM_MIN}
        title={t('deckEditor.zoomOut', 'Zoom out')}
        className="flex items-center justify-center h-6 w-6 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-sunken disabled:opacity-30 transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>

      <span
        className="text-xs tabular-nums text-text-secondary select-none min-w-[36px] text-center"
        title={t('deckEditor.currentZoom', 'Current zoom')}
      >
        {percent}%
      </span>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoom >= ZOOM_MAX}
        title={t('deckEditor.zoomIn', 'Zoom in')}
        className="flex items-center justify-center h-6 w-6 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-sunken disabled:opacity-30 transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>

      <div className="w-px h-4 bg-border-subtle mx-0.5" />

      <button
        type="button"
        onClick={handleFit}
        title={t('deckEditor.zoomFit', 'Fit to window')}
        className="flex items-center justify-center h-6 w-6 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-sunken transition-colors"
      >
        <Maximize2 className="h-3 w-3" />
      </button>
    </div>
  );
};

export default ZoomControls;
