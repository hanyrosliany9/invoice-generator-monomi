import React, { useRef, useEffect, useState } from 'react';
import { Tooltip, theme } from 'antd';
import { CommentOutlined, EditOutlined } from '@ant-design/icons';

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

/**
 * Timeline Component
 *
 * Video timeline with frame markers for comments and drawings.
 * Features:
 * - Click to seek
 * - Markers for comments and drawings
 * - Hover preview (tooltip with timecode)
 * - Current playhead indicator
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const timecode = percentage * duration;

    onSeek(timecode);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const timecode = duration > 0 ? percentage * duration : 0;

    setHoverTime(duration > 0 ? timecode : null);

    if (isDragging && duration > 0) {
      onSeek(timecode);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      {/* Time labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: token.colorTextSecondary,
          marginBottom: '4px',
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Timeline track */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
        style={{
          position: 'relative',
          width: '100%',
          height: '40px',
          backgroundColor: token.colorBgElevated,
          borderRadius: token.borderRadius,
          cursor: duration > 0 ? 'pointer' : 'default',
          overflow: 'visible',
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${playheadPosition}%`,
            backgroundColor: token.colorPrimary,
            borderRadius: `${token.borderRadius}px 0 0 ${token.borderRadius}px`,
            opacity: 0.3,
          }}
        />

        {/* Markers */}
        {markers.map((marker) => {
          const markerPosition = (marker.timecode / duration) * 100;
          return (
            <Tooltip
              key={marker.id}
              title={`${marker.type} at ${formatTime(marker.timecode)}`}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerClick?.(marker);
                }}
                style={{
                  position: 'absolute',
                  left: `${markerPosition}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: marker.type === 'comment' ? token.colorSuccess : token.colorWarning,
                  border: `2px solid ${token.colorBgContainer}`,
                  cursor: 'pointer',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {marker.count && marker.count > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      fontSize: '10px',
                      backgroundColor: token.colorBgBase,
                      color: token.colorTextLightSolid,
                      padding: '2px 4px',
                      borderRadius: token.borderRadiusSM,
                    }}
                  >
                    {marker.count}
                  </span>
                )}
              </div>
            </Tooltip>
          );
        })}

        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: `${playheadPosition}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: token.colorPrimary,
            transform: 'translateX(-1px)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${token.colorPrimary}`,
            }}
          />
        </div>

        {/* Hover time indicator */}
        {hoverTime !== null && duration > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoverTime / duration) * 100}%`,
              top: '-24px',
              transform: 'translateX(-50%)',
              backgroundColor: token.colorBgBase,
              color: token.colorTextLightSolid,
              padding: '4px 8px',
              borderRadius: token.borderRadius,
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Marker legend */}
      {markers.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '8px',
            fontSize: '12px',
            color: token.colorTextSecondary,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: token.colorSuccess,
              }}
            />
            <span>Comments</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: token.colorWarning,
              }}
            />
            <span>Drawings</span>
          </div>
        </div>
      )}
    </div>
  );
};
