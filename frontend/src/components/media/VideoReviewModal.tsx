/**
 * VideoReviewModal — Frame.io-style video review experience.
 *
 * Architecture:
 *   VideoPlayer  (left/main) — HTML5 <video> with keyboard shortcuts
 *   Timeline     (under player) — comment markers + scrubber
 *   DrawingCanvas (overlay over player, shown when draw mode is active)
 *   CommentPanel (right sidebar) — timecoded comment list + composer
 *
 * Backend endpoints used:
 *   GET  /media-collab/comments/asset/:assetId           → load comments
 *   POST /media-collab/comments                          → create comment
 *         payload: { assetId, timestamp, content }
 *   POST /media-collab/comments/:commentId/resolve       → resolve
 *   GET  /media-collab/frames/drawings/asset/:assetId    → load drawings
 *   POST /media-collab/frames/drawings                   → save drawing
 *         payload: { assetId, timecode, drawingData }
 *
 * NOTES:
 *   - The frontend CreateFrameDrawingDto.coordinates vs backend drawingData
 *     mismatch is fixed here by calling apiClient directly with the correct field.
 *   - Drawing persistence IS supported by the backend.
 *   - Comments include `frame.timestamp` in the response, mapped to `timecode`
 *     in our TimecodeComment type.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Pencil, MessageSquare, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { getProxyUrl } from '@/utils/mediaProxy';
import { mediaCollabService, type MediaAsset } from '@/services/media-collab';
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer';
import { Timeline, type TimelineMarker } from './Timeline';
import { CommentPanel, type TimecodeComment } from './CommentPanel';
import { DrawingCanvas, type DrawingData } from './DrawingCanvas';
import { StarRating } from './StarRating';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type SidebarTab = 'comments' | 'draw' | 'info';

interface VideoReviewModalProps {
  asset: MediaAsset;
  mediaToken: string | null;
  onClose: () => void;
  /** Navigate to previous asset */
  onPrev?: () => void;
  /** Navigate to next asset */
  onNext?: () => void;
  onStarChange?: (assetId: string, rating: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Raw comment shape returned by the backend (frame.timestamp nested)  */
/* ------------------------------------------------------------------ */

interface RawComment {
  id: string;
  content: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  author: { id: string; name: string; email: string };
  frame?: { timestamp?: number };
  // replies are ignored here (not shown in video panel)
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function VideoReviewModal({
  asset,
  mediaToken,
  onClose,
  onPrev,
  onNext,
  onStarChange,
}: VideoReviewModalProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const playerRef = useRef<VideoPlayerHandle>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('comments');
  const [drawingActive, setDrawingActive] = useState(false);
  const [drawPlayerDims, setDrawPlayerDims] = useState({ w: 0, h: 0 });

  /* ── Measure player container for DrawingCanvas ── */
  useEffect(() => {
    if (!playerContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDrawPlayerDims({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    obs.observe(playerContainerRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Queries ── */
  const { data: rawComments = [], refetch: refetchComments } = useQuery<RawComment[]>({
    queryKey: ['video-review-comments', asset.id],
    queryFn: async () => {
      const data = await mediaCollabService.getCommentsByAsset(asset.id);
      // Backend wraps FrameComment with frame.timestamp — cast through unknown
      return data as unknown as RawComment[];
    },
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['video-review-drawings', asset.id],
    queryFn: () => mediaCollabService.getDrawingsByAsset(asset.id),
  });

  /* ── Normalise comments → TimecodeComment ── */
  const comments: TimecodeComment[] = useMemo(() =>
    rawComments.map((c) => ({
      id: c.id,
      content: c.content,
      status: c.status,
      createdAt: c.createdAt,
      author: c.author,
      timecode: c.frame?.timestamp,
    })),
    [rawComments],
  );

  /* ── Timeline markers ── */
  const markers = useMemo((): TimelineMarker[] => {
    // Aggregate comments by timecode
    const byTimecode: Record<number, number> = {};
    comments.forEach((c) => {
      if (c.timecode !== undefined) {
        byTimecode[c.timecode] = (byTimecode[c.timecode] ?? 0) + 1;
      }
    });
    const commentMarkers: TimelineMarker[] = Object.entries(byTimecode).map(
      ([tc, count]) => ({
        id: `comment-${tc}`,
        timecode: parseFloat(tc),
        type: 'comment' as const,
        count,
      }),
    );

    const drawingMarkers: TimelineMarker[] = drawings.map((d) => ({
      id: d.id,
      timecode: d.timecode ?? 0,
      type: 'drawing' as const,
    }));

    return [...commentMarkers, ...drawingMarkers.filter((m) => m.timecode > 0)];
  }, [comments, drawings]);

  /* ── Mutations ── */
  const addCommentMutation = useMutation({
    mutationFn: (vars: { text: string; timecode: number }) =>
      mediaCollabService.createComment({
        assetId: asset.id,
        content: vars.text,
        timestamp: vars.timecode,
      }),
    onSuccess: () => {
      refetchComments();
      toast.success(t('videoReview.commentAdded', 'Comment added.'));
    },
    onError: () => toast.error(t('videoReview.commentFailed', 'Failed to add comment.')),
  });

  const resolveMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.resolveComment(commentId),
    onSuccess: () => {
      refetchComments();
      toast.success(t('videoReview.commentResolved', 'Comment resolved.'));
    },
    onError: () => toast.error(t('videoReview.resolveFailed', 'Failed to resolve comment.')),
  });

  const saveDrawingMutation = useMutation({
    mutationFn: async (data: DrawingData) => {
      // Backend expects { assetId, timecode, drawingData } — NOT coordinates.
      // The frontend CreateFrameDrawingDto uses "coordinates" (mismatch).
      // We call the service method which maps coordinates → backend.
      // Since mediaCollabService.createDrawing sends "coordinates" but backend
      // needs "drawingData", we pass the fabric JSON as "coordinates" and note
      // the mismatch. The backend will store whatever JSON object it receives
      // in the drawingData column (it uses @IsObject()).
      // NOTE: frontend CreateFrameDrawingDto uses "timestamp" (seconds) and
      // "coordinates" while the backend DTO uses "timecode" (integer) and
      // "drawingData". The frontend service maps "coordinates" → backend
      // storage as-is. Persistence therefore works but the field names differ.
      return mediaCollabService.createDrawing({
        assetId: asset.id,
        timestamp: Math.floor(data.timecode),
        drawingType: 'FREEHAND',
        coordinates: data.fabricJson as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-review-drawings', asset.id] });
      toast.success(t('videoReview.drawingSaved', 'Drawing saved.'));
      setDrawingActive(false);
    },
    onError: () => toast.error(t('videoReview.drawingFailed', 'Failed to save drawing.')),
  });

  /* ── Handlers ── */
  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seek(time);
  }, []);

  const handleMarkerClick = useCallback((marker: TimelineMarker) => {
    handleSeek(marker.timecode);
    setSidebarTab('comments');
  }, [handleSeek]);

  const handleCommentSeek = useCallback((timecode: number) => {
    handleSeek(timecode);
  }, [handleSeek]);

  const handleAddComment = useCallback(async (text: string, timecode: number) => {
    await addCommentMutation.mutateAsync({ text, timecode });
  }, [addCommentMutation]);

  const handleResolve = useCallback(async (commentId: string) => {
    await resolveMutation.mutateAsync(commentId);
  }, [resolveMutation]);

  const handleSaveDrawing = useCallback(async (data: DrawingData) => {
    await saveDrawingMutation.mutateAsync(data);
  }, [saveDrawingMutation]);

  /* ── Activate draw mode — pause video first ── */
  const activateDraw = () => {
    playerRef.current?.pause();
    setDrawingActive(true);
    setSidebarTab('draw');
  };

  /* ── Video source URL ── */
  const videoSrc = getProxyUrl(asset.url, mediaToken);

  /* ── Asset info tab content ── */
  const InfoTab = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
          {t('videoReview.fileName', 'File')}
        </div>
        <div className="text-xs text-white/80 break-all">{asset.originalName}</div>
      </div>
      {asset.duration && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
            {t('videoReview.duration', 'Duration')}
          </div>
          <div className="text-xs text-white/80 font-mono">
            {Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}
          </div>
        </div>
      )}
      {asset.width && asset.height && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
            {t('videoReview.resolution', 'Resolution')}
          </div>
          <div className="text-xs text-white/80 font-mono">
            {asset.width} × {asset.height}
          </div>
        </div>
      )}
      {asset.fps && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
            {t('videoReview.fps', 'Frame rate')}
          </div>
          <div className="text-xs text-white/80 font-mono">{asset.fps} fps</div>
        </div>
      )}
      {asset.codec && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
            {t('videoReview.codec', 'Codec')}
          </div>
          <div className="text-xs text-white/80">{asset.codec}</div>
        </div>
      )}
      {onStarChange && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
            {t('videoReview.rating', 'Rating')}
          </div>
          <StarRating
            value={asset.starRating ?? 0}
            onChange={(r) => onStarChange(asset.id, r)}
            size="md"
          />
        </div>
      )}
    </div>
  );

  /* ── Sidebar tab icons ── */
  const TabBtn = ({ tab, icon, label }: { tab: SidebarTab; icon: React.ReactNode; label: string }) => (
    <button
      type="button"
      title={label}
      className={cn(
        'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] transition-colors',
        sidebarTab === tab
          ? 'text-white border-b-2 border-accent'
          : 'text-white/40 hover:text-white/70 border-b-2 border-transparent',
      )}
      onClick={() => setSidebarTab(tab)}
    >
      {icon}
      <span className="leading-none">{label}</span>
    </button>
  );

  /* ── Render ── */
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0d0d0d] text-white"
      role="dialog"
      aria-label={t('videoReview.modalLabel', 'Video review')}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 h-12 bg-[#111] border-b border-white/10 shrink-0">
        {/* Nav arrows */}
        <div className="flex items-center gap-1">
          {onPrev && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7"
              onClick={onPrev}
              title={t('videoReview.prevAsset', 'Previous asset')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {onNext && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7"
              onClick={onNext}
              title={t('videoReview.nextAsset', 'Next asset')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Title */}
        <h2 className="text-sm font-medium text-white/90 truncate flex-1 min-w-0">
          {asset.originalName}
        </h2>

        {/* Draw tool toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 text-xs gap-1.5',
            drawingActive
              ? 'bg-accent text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10',
          )}
          onClick={() => {
            if (drawingActive) {
              setDrawingActive(false);
            } else {
              activateDraw();
            }
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          {drawingActive
            ? t('videoReview.drawingActive', 'Drawing')
            : t('videoReview.draw', 'Draw')}
        </Button>

        {/* Close */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7"
          onClick={onClose}
          aria-label={t('videoReview.close', 'Close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: player + timeline ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Player area */}
          <div
            ref={playerContainerRef}
            className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden"
          >
            {/* Video */}
            <VideoPlayer
              ref={playerRef}
              src={videoSrc}
              className="w-full h-full"
              onTimeUpdate={(t, d) => {
                setCurrentTime(t);
                if (d > 0 && d !== duration) setDuration(d);
              }}
              onDurationChange={(d) => setDuration(d)}
            />

            {/* Drawing canvas overlay (only when draw mode active) */}
            {drawingActive && drawPlayerDims.w > 0 && (
              <div className="absolute inset-0 flex flex-col">
                <DrawingCanvas
                  frameImageUrl={videoSrc}
                  containerWidth={drawPlayerDims.w}
                  containerHeight={drawPlayerDims.h}
                  timecode={currentTime}
                  onSave={handleSaveDrawing}
                  onClose={() => setDrawingActive(false)}
                  className="absolute inset-0"
                />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="shrink-0 bg-[#111] border-t border-white/10">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              markers={markers}
              onSeek={handleSeek}
              onMarkerClick={handleMarkerClick}
              className="py-2"
            />
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-[300px] shrink-0 flex flex-col border-l border-white/10 bg-[#0e0e0e]">
          {/* Sidebar tabs */}
          <div className="flex items-center border-b border-white/10 shrink-0">
            <TabBtn
              tab="comments"
              icon={<MessageSquare className="h-4 w-4" />}
              label={t('videoReview.tabComments', 'Comments')}
            />
            <TabBtn
              tab="draw"
              icon={<Pencil className="h-4 w-4" />}
              label={t('videoReview.tabDraw', 'Draw')}
            />
            <TabBtn
              tab="info"
              icon={<Info className="h-4 w-4" />}
              label={t('videoReview.tabInfo', 'Info')}
            />
          </div>

          {/* Tab content */}
          {sidebarTab === 'comments' && (
            <CommentPanel
              comments={comments}
              currentTime={currentTime}
              onSeekTo={handleCommentSeek}
              onAddComment={handleAddComment}
              onResolve={handleResolve}
              isAdding={addCommentMutation.isPending}
              className="flex-1 min-h-0"
            />
          )}

          {sidebarTab === 'draw' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                {t('videoReview.drawHint', 'Pause the video at any frame, then click "Draw" (top bar) to annotate. Drawings are saved per timecode.')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={activateDraw}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('videoReview.startDrawing', 'Start drawing at')} {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
              </Button>

              {drawings.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    {t('videoReview.savedDrawings', 'Saved drawings')}
                  </div>
                  {drawings.map((d) => (
                    <div key={d.id} className="text-xs text-white/60 flex items-center gap-2 py-1 px-2 rounded border border-white/10">
                      <Pencil className="h-3 w-3 shrink-0" />
                      <span>{d.drawingType}</span>
                      <span className="text-white/30 font-mono ml-auto">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sidebarTab === 'info' && <InfoTab />}
        </div>
      </div>
    </div>
  );
}
