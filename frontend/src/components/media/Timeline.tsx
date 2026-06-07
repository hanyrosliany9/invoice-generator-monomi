import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface TimelineMarker {
  id: string;
  timecode: number;
  type: 'comment' | 'drawing';
  count?: number;
}

interface TimelineProps {
  duration: number;
  currentTime: number;
  markers?: TimelineMarker[];
  onSeek: (time: number) => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${ss.toString().padStart(2, '0')}.${ms}`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function Timeline({
  duration,
  currentTime,
  markers = [],
  onSeek,
  onMarkerClick,
  className,
}: TimelineProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getPctFromEvent = (e: React.MouseEvent): number => {
    if (!trackRef.current || duration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleClick = (e: React.MouseEvent) => {
    onSeek(getPctFromEvent(e) * duration);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pct = getPctFromEvent(e);
    setHoverPct(pct * 100);
    if (dragging) onSeek(pct * duration);
  };

  const commentMarkers = markers.filter((m) => m.type === 'comment');
  const drawingMarkers = markers.filter((m) => m.type === 'drawing');

  return (
    <div className={cn('w-full select-none px-3 pb-3', className)}>
      {/* Time labels */}
      <div className="flex justify-between text-[10px] font-mono text-white/40 mb-1">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* ── Main scrubber track ── */}
      <div
        ref={trackRef}
        role="slider"
        aria-label={t('videoReview.timeline', 'Timeline')}
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        className="relative w-full h-7 bg-white/10 rounded cursor-pointer group/track overflow-visible"
        onClick={handleClick}
        onMouseDown={() => setDragging(true)}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => { setDragging(false); setHoverPct(null); }}
      >
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full bg-accent/50 rounded"
          style={{ width: `${playheadPct}%` }}
        />

        {/* Drawing markers (amber ticks on the scrubber) */}
        {drawingMarkers.map((m) => {
          const pct = duration > 0 ? (m.timecode / duration) * 100 : 0;
          return (
            <button
              key={m.id}
              type="button"
              title={`Drawing @ ${fmt(m.timecode)}`}
              onClick={(e) => { e.stopPropagation(); onMarkerClick?.(m); }}
              className="absolute top-0 bottom-0 w-[2px] bg-amber-400 hover:bg-amber-300 cursor-pointer z-10"
              style={{ left: `${pct}%`, transform: 'translateX(-1px)' }}
            />
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-white z-20 pointer-events-none"
          style={{ left: `${playheadPct}%`, transform: 'translateX(-1px)' }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow" />
        </div>

        {/* Hover time tooltip */}
        {hoverPct !== null && duration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 bg-black/80 text-white text-[10px] font-mono px-2 py-0.5 rounded pointer-events-none z-30 whitespace-nowrap"
            style={{ left: `${hoverPct}%` }}
          >
            {fmt((hoverPct / 100) * duration)}
          </div>
        )}
      </div>

      {/* ── Comment strip (green ticks below the scrubber) ── */}
      {commentMarkers.length > 0 && (
        <div className="relative w-full h-3 mt-1">
          {commentMarkers.map((m) => {
            const pct = duration > 0 ? (m.timecode / duration) * 100 : 0;
            const count = m.count ?? 1;
            return (
              <button
                key={m.id}
                type="button"
                title={`${count} ${t('videoReview.comment', 'comment')}${count !== 1 ? 's' : ''} @ ${fmt(m.timecode)}`}
                onClick={() => onMarkerClick?.(m)}
                className="absolute top-0 bottom-0 flex flex-col items-center justify-start cursor-pointer z-10 group/cm"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                {count > 1 && (
                  <span className="text-[8px] leading-none font-bold text-emerald-400 mb-0.5">
                    {count}
                  </span>
                )}
                <div className={cn(
                  'w-[2px] bg-emerald-400 group-hover/cm:bg-emerald-300 rounded-[1px]',
                  count > 1 ? 'h-[4px]' : 'h-[6px] mt-[2px]',
                )} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
