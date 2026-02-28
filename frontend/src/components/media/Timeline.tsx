import React, { useRef, useEffect, useState } from 'react';
import { Tooltip, theme } from 'antd';
import { CommentOutlined } from '@ant-design/icons';

interface TimelineMarker {
  timecode: number;
  type: 'comment' | 'drawing' | 'frame';
  count?: number;
  id: string;
}

interface TimelineProps {
  duration: number;
  currentTime: number;
  markers?: TimelineMarker[];
  onSeek: (timecode: number) => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

/**
 * Timeline Component
 *
 * Frame.io-inspired video timeline with:
 * - Main scrubber track with progress and playhead
 * - Dedicated comment strip below the scrubber (green tick marks)
 * - Hover time tooltip
 * - Click/drag to seek
 */
export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  markers = [],
  onSeek,
  onMarkerClick,
}) => {
  const { token } = theme.useToken();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const getTimecodeFromEvent = (e: React.MouseEvent<HTMLDivElement>): number => {
    if (!timelineRef.current || duration <= 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * duration;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onSeek(getTimecodeFromEvent(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setHoverX(percentage * 100);
    setHoverTime(duration > 0 ? percentage * duration : null);

    if (isDragging && duration > 0) {
      onSeek(getTimecodeFromEvent(e));
    }
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const commentMarkers = markers.filter((m) => m.type === 'comment');
  const drawingMarkers = markers.filter((m) => m.type === 'drawing' || m.type === 'frame');

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      {/* Time labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          fontFamily: 'monospace',
          color: token.colorTextSecondary,
          marginBottom: 4,
          letterSpacing: '0.02em',
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* ── Main scrubber track ── */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
        style={{
          position: 'relative',
          width: '100%',
          height: 32,
          backgroundColor: token.colorBgElevated,
          borderRadius: token.borderRadius,
          cursor: duration > 0 ? 'pointer' : 'default',
          overflow: 'visible',
        }}
      >
        {/* Progress fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${playheadPct}%`,
            backgroundColor: token.colorPrimary,
            borderRadius: `${token.borderRadius}px 0 0 ${token.borderRadius}px`,
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />

        {/* Drawing markers (orange ticks on the scrubber) */}
        {drawingMarkers.map((marker) => {
          const pct = duration > 0 ? (marker.timecode / duration) * 100 : 0;
          return (
            <Tooltip
              key={marker.id}
              title={`Drawing at ${formatTime(marker.timecode)}${marker.count && marker.count > 1 ? ` (×${marker.count})` : ''}`}
            >
              <div
                onClick={(e) => { e.stopPropagation(); onMarkerClick?.(marker); }}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: token.colorWarning,
                  transform: 'translateX(-1px)',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              />
            </Tooltip>
          );
        })}

        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: `${playheadPct}%`,
            top: -4,
            bottom: -4,
            width: 2,
            backgroundColor: token.colorPrimary,
            transform: 'translateX(-1px)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          {/* Playhead handle */}
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: token.colorPrimary,
              boxShadow: `0 0 0 2px ${token.colorBgBase}`,
            }}
          />
        </div>

        {/* Hover time tooltip */}
        {hoverTime !== null && duration > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${hoverX}%`,
              top: -28,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: token.borderRadius,
              fontSize: 11,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* ── Comment strip (Frame.io style) ── */}
      {commentMarkers.length > 0 && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 14,
            marginTop: 3,
            cursor: 'default',
          }}
        >
          {commentMarkers.map((marker) => {
            const pct = duration > 0 ? (marker.timecode / duration) * 100 : 0;
            const count = marker.count ?? 1;
            return (
              <Tooltip
                key={marker.id}
                title={
                  <span>
                    <CommentOutlined style={{ marginRight: 4 }} />
                    {count} comment{count > 1 ? 's' : ''} at {formatTime(marker.timecode)}
                  </span>
                }
              >
                <div
                  onClick={(e) => { e.stopPropagation(); onMarkerClick?.(marker); }}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 0,
                    transform: 'translateX(-50%)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {/* Count badge (only when > 1) */}
                  {count > 1 && (
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: '#fff',
                        background: '#52c41a',
                        padding: '1px 4px',
                        borderRadius: 8,
                        whiteSpace: 'nowrap',
                        minWidth: 14,
                        textAlign: 'center',
                      }}
                    >
                      {count}
                    </div>
                  )}

                  {/* Tick mark */}
                  <div
                    style={{
                      width: count > 1 ? 2 : 2,
                      height: count > 1 ? 5 : 8,
                      backgroundColor: '#52c41a',
                      borderRadius: 1,
                      marginTop: count > 1 ? 0 : 2,
                    }}
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};
