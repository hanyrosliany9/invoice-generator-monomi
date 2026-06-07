import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns, Copy, SlidersHorizontal, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getProxyUrl } from '@/utils/mediaProxy';
import type { MediaAsset } from '@/services/media-collab';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ComparisonMode = 'side-by-side' | 'overlay' | 'swipe';

interface ComparisonViewProps {
  assets: MediaAsset[];
  mediaToken: string | null;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Mode-switcher tab button                                           */
/* ------------------------------------------------------------------ */

function ModeTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-white'
          : 'bg-bg-sunken text-text-secondary hover:bg-bg-raised hover:text-text-primary border border-border-subtle',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Asset label strip                                                  */
/* ------------------------------------------------------------------ */

function AssetLabel({ name }: { name: string }) {
  return (
    <div className="text-[11px] text-text-tertiary truncate text-center px-1" title={name}>
      {name}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Side-by-side mode                                                  */
/* ------------------------------------------------------------------ */

function SideBySideView({
  assets,
  mediaToken,
}: {
  assets: MediaAsset[];
  mediaToken: string | null;
}) {
  const cols = assets.length <= 2 ? 2 : assets.length === 3 ? 3 : 2;
  return (
    <div
      className="grid gap-3 flex-1 min-h-0"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {assets.map((asset) => {
        const src = asset.thumbnailUrl || asset.url;
        const proxied = src ? getProxyUrl(src, mediaToken) : null;
        return (
          <div key={asset.id} className="flex flex-col gap-1.5 min-h-0">
            <div className="flex-1 min-h-0 rounded-md bg-black border border-border-subtle overflow-hidden flex items-center justify-center">
              {proxied ? (
                <img
                  src={proxied}
                  alt={asset.originalName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-text-tertiary text-xs">{asset.originalName}</div>
              )}
            </div>
            <AssetLabel name={asset.originalName} />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlay mode (2-asset only)                                        */
/* ------------------------------------------------------------------ */

function OverlayView({
  asset1,
  asset2,
  mediaToken,
}: {
  asset1: MediaAsset;
  asset2: MediaAsset;
  mediaToken: string | null;
}) {
  const { t } = useTranslation();
  const [opacity, setOpacity] = useState(50);

  const src1 = asset1.thumbnailUrl || asset1.url;
  const src2 = asset2.thumbnailUrl || asset2.url;
  const p1 = src1 ? getProxyUrl(src1, mediaToken) : null;
  const p2 = src2 ? getProxyUrl(src2, mediaToken) : null;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Slider */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-text-tertiary w-20 shrink-0">
          {asset1.originalName.slice(0, 12)}…
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="flex-1 accent-accent h-1.5 cursor-pointer"
          aria-label={t('mediaCompare.opacitySlider', 'Overlay opacity')}
        />
        <span className="text-[11px] text-text-tertiary w-20 shrink-0 text-right">
          {asset2.originalName.slice(0, 12)}…
        </span>
        <span className="text-[11px] text-text-tertiary tabular-nums w-8 shrink-0 text-right">
          {opacity}%
        </span>
      </div>

      {/* Stacked images */}
      <div className="flex-1 min-h-0 relative rounded-md bg-black border border-border-subtle overflow-hidden flex items-center justify-center">
        {p1 && (
          <img
            src={p1}
            alt={asset1.originalName}
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        {p2 && (
          <img
            src={p2}
            alt={asset2.originalName}
            className="absolute inset-0 w-full h-full object-contain transition-opacity"
            style={{ opacity: opacity / 100 }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Swipe mode (2-asset only)                                          */
/* ------------------------------------------------------------------ */

function SwipeView({
  asset1,
  asset2,
  mediaToken,
}: {
  asset1: MediaAsset;
  asset2: MediaAsset;
  mediaToken: string | null;
}) {
  const { t } = useTranslation();
  const [swipe, setSwipe] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const src1 = asset1.thumbnailUrl || asset1.url;
  const src2 = asset2.thumbnailUrl || asset2.url;
  const p1 = src1 ? getProxyUrl(src1, mediaToken) : null;
  const p2 = src2 ? getProxyUrl(src2, mediaToken) : null;

  const updateFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSwipe(Math.max(0, Math.min(100, pct)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    updateFromClientX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Swipe handle range (keyboard accessible) */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-text-tertiary truncate flex-1 text-left">
          {asset1.originalName}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={swipe}
          onChange={(e) => setSwipe(Number(e.target.value))}
          className="w-32 accent-accent h-1.5 cursor-pointer"
          aria-label={t('mediaCompare.swipePosition', 'Swipe divider position')}
        />
        <span className="text-[11px] text-text-tertiary truncate flex-1 text-right">
          {asset2.originalName}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative rounded-md bg-black border border-border-subtle overflow-hidden select-none cursor-ew-resize"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Base image (left) */}
        {p1 && (
          <img
            src={p1}
            alt={asset1.originalName}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}

        {/* Overlay image (right), clipped to reveal from left */}
        {p2 && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - swipe}% 0 0)` }}
          >
            <img
              src={p2}
              alt={asset2.originalName}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        )}

        {/* Divider line + handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-md pointer-events-none"
          style={{ left: `${swipe}%`, transform: 'translateX(-50%)' }}
        >
          {/* Circular handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white border-2 border-border-default shadow-lg flex items-center justify-center">
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 text-text-secondary"
              fill="currentColor"
            >
              <path d="M5 3l-3 5 3 5M11 3l3 5-3 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Corner labels */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white/80 pointer-events-none backdrop-blur-sm">
          {asset1.originalName.slice(0, 16)}
        </div>
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white/80 pointer-events-none backdrop-blur-sm">
          {asset2.originalName.slice(0, 16)}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ComparisonView                                                */
/* ------------------------------------------------------------------ */

export function ComparisonView({ assets, mediaToken, onClose }: ComparisonViewProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');

  // For 3-4 assets we only offer side-by-side.
  const multiAsset = assets.length > 2;
  const asset1 = assets[0];
  const asset2 = assets[1];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'bg-bg-base border-border-default text-text-primary p-0 flex flex-col',
          'max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh]',
        )}
      >
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between border-b border-border-subtle px-5 py-3 shrink-0 space-y-0">
          <DialogTitle className="text-sm font-display font-semibold text-text-primary">
            {t('mediaCompare.title', 'Compare Assets')}
            <span className="ml-2 text-xs font-normal text-text-tertiary">
              ({assets.length})
            </span>
          </DialogTitle>

          {/* Mode switcher — only available when exactly 2 assets */}
          {!multiAsset && (
            <div className="flex items-center gap-1.5">
              <ModeTab
                active={mode === 'side-by-side'}
                icon={<Columns className="h-3.5 w-3.5" />}
                label={t('mediaCompare.modeSideBySide', 'Side by Side')}
                onClick={() => setMode('side-by-side')}
              />
              <ModeTab
                active={mode === 'overlay'}
                icon={<Copy className="h-3.5 w-3.5" />}
                label={t('mediaCompare.modeOverlay', 'Overlay')}
                onClick={() => setMode('overlay')}
              />
              <ModeTab
                active={mode === 'swipe'}
                icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                label={t('mediaCompare.modeSwipe', 'Swipe')}
                onClick={() => setMode('swipe')}
              />
            </div>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="ml-2 shrink-0 rounded-md p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-sunken transition-colors"
            aria-label={t('mediaCompare.close', 'Close comparison')}
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 p-5 flex flex-col">
          {multiAsset || mode === 'side-by-side' ? (
            <SideBySideView assets={assets} mediaToken={mediaToken} />
          ) : mode === 'overlay' ? (
            <OverlayView asset1={asset1} asset2={asset2} mediaToken={mediaToken} />
          ) : (
            <SwipeView asset1={asset1} asset2={asset2} mediaToken={mediaToken} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
