import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ZoomIn, ZoomOut, RotateCw, Download, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LightboxOverlayProps {
  src: string;
  alt: string;
  downloadUrl?: string;
  onClose: () => void;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

export function LightboxOverlay({
  src,
  alt,
  downloadUrl,
  onClose,
}: LightboxOverlayProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0); // degrees, always a multiple of 90

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => setZoom(1);
  const rotateCw = () => setRotate((r) => (r + 90) % 360);

  // Keyboard shortcuts: +/-, 0 reset, R rotate, Esc close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); return; }
      if (e.key === '-') { e.preventDefault(); zoomOut(); return; }
      if (e.key === '0') { e.preventDefault(); resetZoom(); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateCw(); }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const download = async () => {
    const url = downloadUrl || src;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = alt || 'download';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
        <span className="text-xs text-white/60 truncate max-w-[40vw]">{alt}</span>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            title={t('mediaReview.lightbox.zoomOut', 'Zoom out (−)')}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={resetZoom}
            className="text-xs text-white/60 hover:text-white tabular-nums min-w-[3.5rem] text-center px-1 py-1 rounded hover:bg-white/10 transition-colors"
            title={t('mediaReview.lightbox.resetZoom', 'Reset zoom (0)')}
          >
            {Math.round(zoom * 100)}%
          </button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            title={t('mediaReview.lightbox.zoomIn', 'Zoom in (+)')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Rotate */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={rotateCw}
            title={t('mediaReview.lightbox.rotate', 'Rotate clockwise (R)')}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={download}
            title={t('mediaReview.lightbox.download', 'Download')}
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10 ml-1"
            onClick={onClose}
            title={t('mediaReview.lightbox.close', 'Close (Esc)')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image area — scrollable when zoomed */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 select-none">
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `scale(${zoom}) rotate(${rotate}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease',
            maxWidth: zoom === 1 ? '100%' : 'none',
            maxHeight: zoom === 1 ? '100%' : 'none',
          }}
          className={cn('object-contain', zoom > 1 && 'cursor-zoom-in')}
        />
      </div>

      {/* Keyboard hint */}
      <div className="px-4 py-1.5 text-center text-[10px] text-white/30 shrink-0">
        {t('mediaReview.lightbox.hint', '+/− zoom · R rotate · 0 reset · Esc close')}
      </div>
    </div>
  );
}
