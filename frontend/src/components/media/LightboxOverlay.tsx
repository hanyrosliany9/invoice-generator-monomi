import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ZoomIn, ZoomOut, RotateCw, Download, X, ChevronLeft, ChevronRight, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LightboxOverlayProps {
  src: string;
  alt: string;
  downloadUrl?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { current: number; total: number };
  /** When provided the ⓘ button toggles an inline right-hand panel. */
  infoPanel?: React.ReactNode;
  /** Fallback: when no infoPanel, ⓘ closes the lightbox and opens an external sheet. */
  onShowDetails?: () => void;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_DEFAULT = 1;

export function LightboxOverlay({
  src,
  alt,
  downloadUrl,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  position,
  infoPanel,
  onShowDetails,
}: LightboxOverlayProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [rotate, setRotate] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => setZoom(1);
  const rotateCw = () => setRotate((r) => (r + 90) % 360);

  // Reset zoom/rotate and close panel when navigating to a different image
  useEffect(() => {
    setZoom(1);
    setRotate(0);
    // Don't close the info panel on navigation — user wants to keep rating/commenting
  }, [src]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && zoom > 1) return;
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) { e.preventDefault(); onPrev(); return; }
      if (e.key === 'ArrowRight' && onNext && hasNext) { e.preventDefault(); onNext(); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); return; }
      if (e.key === '-') { e.preventDefault(); zoomOut(); return; }
      if (e.key === '0') { e.preventDefault(); resetZoom(); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateCw(); }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose, onPrev, onNext, hasPrev, hasNext, zoom],
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
      window.open(url, '_blank');
    }
  };

  const hasInfoAction = !!(infoPanel || onShowDetails);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/92 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-white/60 truncate max-w-[35vw]">{alt}</span>
          {position && (
            <span className="text-[10px] text-white/35 tabular-nums shrink-0">
              {position.current} / {position.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* ⓘ Details — toggles inline panel or calls external handler */}
          {hasInfoAction && (
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                'text-white/70 hover:text-white hover:bg-white/10',
                showInfo && infoPanel && 'bg-white/10 text-white',
              )}
              onClick={() => {
                if (infoPanel) setShowInfo((v) => !v);
                else onShowDetails?.();
              }}
              title={
                infoPanel
                  ? (showInfo
                    ? t('mediaReview.lightbox.hideDetails', 'Hide details')
                    : t('mediaReview.lightbox.showDetails', 'Show details — rating & comments'))
                  : t('mediaReview.lightbox.showDetails', 'Show details')
              }
            >
              <Info className="h-4 w-4" />
            </Button>
          )}

          <span className="h-4 w-px bg-white/15 mx-0.5" />

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

      {/* Image area + optional info panel */}
      <div className="flex-1 flex items-stretch min-h-0">
        {/* Prev arrow */}
        <div className="flex items-center shrink-0 px-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'h-10 w-10 rounded-full text-white/50 hover:text-white hover:bg-white/10',
              !hasPrev && 'invisible',
            )}
            onClick={onPrev}
            title={t('mediaReview.lightbox.prev', 'Previous (←)')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>

        {/* Image + right panel side-by-side */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Scrollable image area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 select-none min-w-0">
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

          {/* Info panel — slides in from right when showInfo is true */}
          {showInfo && infoPanel && (
            <div className="w-80 shrink-0 border-l border-white/10 bg-black/60 flex flex-col overflow-hidden">

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                  {t('mediaReview.lightbox.details', 'Details')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="text-white/40 hover:text-white/80 transition-colors"
                  title={t('mediaReview.lightbox.hideDetails', 'Hide details')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {infoPanel}
              </div>
            </div>
          )}
        </div>

        {/* Next arrow */}
        <div className="flex items-center shrink-0 px-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'h-10 w-10 rounded-full text-white/50 hover:text-white hover:bg-white/10',
              !hasNext && 'invisible',
            )}
            onClick={onNext}
            title={t('mediaReview.lightbox.next', 'Next (→)')}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="px-4 py-1.5 text-center text-[10px] text-white/25 shrink-0">
        {t('mediaReview.lightbox.hint', '← → navigate · +/− zoom · R rotate · 0 reset · Esc close')}
      </div>
    </div>
  );
}
