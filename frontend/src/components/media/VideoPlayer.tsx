import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface VideoPlayerHandle {
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  pause: () => void;
}

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onDurationChange?: (duration: number) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate, onPlay, onPause, onDurationChange, className }, ref) {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    /* ---- imperative handle ---- */
    useImperativeHandle(ref, () => ({
      seek: (time: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      },
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      getDuration: () => videoRef.current?.duration ?? 0,
      pause: () => {
        videoRef.current?.pause();
      },
    }), [duration]);

    /* ---- keyboard shortcuts ---- */
    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const vid = videoRef.current;
        if (!vid) return;

        switch (e.key) {
          case ' ':
          case 'k':
          case 'K':
            e.preventDefault();
            vid.paused ? vid.play() : vid.pause();
            break;
          case 'j':
          case 'J':
            e.preventDefault();
            vid.currentTime = Math.max(0, vid.currentTime - 10);
            break;
          case 'l':
          case 'L':
            e.preventDefault();
            vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            vid.currentTime = Math.max(0, vid.currentTime - (1 / 30));
            break;
          case 'ArrowRight':
            e.preventDefault();
            vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + (1 / 30));
            break;
          case 'm':
          case 'M':
            vid.muted = !vid.muted;
            setMuted(vid.muted);
            break;
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, []);

    /* ---- scrubber drag ---- */
    const getTimeFromEvent = (e: React.MouseEvent) => {
      if (!progressRef.current || duration <= 0) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return pct * duration;
    };

    const handleProgressClick = (e: React.MouseEvent) => {
      if (!videoRef.current) return;
      const t = getTimeFromEvent(e);
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging && videoRef.current) {
        const t = getTimeFromEvent(e);
        videoRef.current.currentTime = t;
        setCurrentTime(t);
      }
    };

    /* ---- fullscreen ---- */
    const handleFullscreen = () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        vid.requestFullscreen?.();
      }
    };

    const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className={cn('flex flex-col bg-black select-none', className)}>
        {/* ── Video element ── */}
        <div className="relative w-full">
          <video
            ref={videoRef}
            src={src}
            className="w-full max-h-[55vh] object-contain bg-black"
            onTimeUpdate={() => {
              const vid = videoRef.current;
              if (!vid) return;
              setCurrentTime(vid.currentTime);
              onTimeUpdate?.(vid.currentTime, vid.duration || 0);
            }}
            onLoadedMetadata={() => {
              const vid = videoRef.current;
              if (!vid) return;
              setDuration(vid.duration || 0);
              onDurationChange?.(vid.duration || 0);
            }}
            onPlay={() => { setIsPlaying(true); onPlay?.(); }}
            onPause={() => { setIsPlaying(false); onPause?.(); }}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* ── Controls bar ── */}
        <div className="flex flex-col gap-2 px-3 py-2 bg-[#111] border-t border-white/10">
          {/* Scrubber */}
          <div
            ref={progressRef}
            role="slider"
            aria-label={t('videoReview.scrubber', 'Scrubber')}
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={duration}
            className="relative h-2 w-full bg-white/20 rounded-full cursor-pointer group/scrub"
            onClick={handleProgressClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Filled */}
            <div
              className="absolute left-0 top-0 h-full bg-white/80 rounded-full"
              style={{ width: `${playheadPct}%` }}
            />
            {/* Playhead knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow opacity-0 group-hover/scrub:opacity-100 transition-opacity"
              style={{ left: `${playheadPct}%` }}
            />
          </div>

          {/* Buttons + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  const vid = videoRef.current;
                  if (!vid) return;
                  vid.paused ? vid.play() : vid.pause();
                }}
                aria-label={isPlaying ? t('videoReview.pause', 'Pause') : t('videoReview.play', 'Play')}
              >
                {isPlaying
                  ? <Pause className="h-4 w-4 fill-white text-white" />
                  : <Play className="h-4 w-4 fill-white text-white" />}
              </Button>

              {/* Mute */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  if (!videoRef.current) return;
                  videoRef.current.muted = !videoRef.current.muted;
                  setMuted(videoRef.current.muted);
                }}
                aria-label={muted ? t('videoReview.unmute', 'Unmute') : t('videoReview.mute', 'Mute')}
              >
                {muted
                  ? <VolumeX className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />}
              </Button>

              {/* Time display */}
              <span className="text-xs text-white/70 font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Keyboard hint */}
              <span className="text-[10px] text-white/40 hidden sm:block select-none">
                {t('videoReview.keyboardHint', 'Space/K  J  L  ←/→')}
              </span>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                onClick={handleFullscreen}
                aria-label={t('videoReview.fullscreen', 'Fullscreen')}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
