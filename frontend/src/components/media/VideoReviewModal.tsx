import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Modal, Button, Space, Typography, Spin, Select, theme, App } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  EditOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  FullscreenOutlined,
  SoundOutlined,
  CommentOutlined,
  LeftOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { StarRating } from './StarRating';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timeline } from './Timeline';
import { DrawingCanvasContainer } from './DrawingCanvasContainer';
import { CommentPanel } from './CommentPanel';
import { mediaCollabService, MediaAsset, FrameComment } from '../../services/media-collab';
import { getProxyUrl } from '../../utils/mediaProxy';
import { useAuthStore } from '../../store/auth';
import { getErrorMessage } from '../../utils/errorHandlers';

const { Text } = Typography;

interface VideoReviewModalProps {
  visible: boolean;
  asset: MediaAsset;
  mediaToken: string | null;
  onClose: () => void;
}

interface TimelineMarker {
  timecode: number;
  type: 'comment' | 'drawing' | 'frame';
  count?: number;
  id: string;
}

/**
 * VideoReviewModal Component
 *
 * Frame.io-inspired full-screen video review experience with:
 * - Video playback with industry-standard keyboard shortcuts (J/K/L)
 * - Frame-accurate timeline with markers for comments and drawings
 * - Drawing overlay on paused frames
 * - Timecoded comments panel
 * - Professional media review workflow
 */
export const VideoReviewModal: React.FC<VideoReviewModalProps> = ({
  visible,
  asset,
  mediaToken,
  onClose,
}) => {
  const { token: antToken } = theme.useToken();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Build video URL. Prefer the worker URL (CDN, Range-aware) when a token is available.
  // If the token was null at mount (still loading from store), we upgrade to the worker
  // URL as soon as it arrives so the video can actually play.
  const [videoSrc, setVideoSrc] = useState<string>(() => getProxyUrl(asset.url, mediaToken));

  // Upgrade from proxy fallback → worker URL once the token loads (or if it changes).
  // We also reload the video element so it picks up the new source immediately.
  useEffect(() => {
    if (!mediaToken) return;
    const workerUrl = getProxyUrl(asset.url, mediaToken);
    if (workerUrl !== videoSrc) {
      setVideoSrc(workerUrl);
      // Reset player state so the video reloads cleanly
      setCurrentTime(0);
      setIsPlaying(false);
      setIsVideoLoading(true);
      setIsBuffering(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaToken, asset.url]);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  // UI state
  const [drawMode, setDrawMode] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);

  // Asset metadata state (status + rating)
  const [currentStatus, setCurrentStatus] = useState<string>(asset.status);
  const [currentRating, setCurrentRating] = useState<number | null>(asset.starRating ?? null);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => mediaCollabService.updateAssetStatus(asset.id, status),
    onSuccess: (updated) => {
      setCurrentStatus(updated.status);
      queryClient.invalidateQueries({ queryKey: ['assets', asset.projectId] });
    },
    onError: (err) => {
      message.error(getErrorMessage(err));
    },
  });

  // Update rating mutation
  const updateRatingMutation = useMutation({
    mutationFn: (rating: number) => mediaCollabService.updateStarRating(asset.id, rating),
    onSuccess: (updated) => {
      setCurrentRating(updated.starRating ?? null);
      queryClient.invalidateQueries({ queryKey: ['assets', asset.projectId] });
    },
    onError: (err) => {
      message.error(getErrorMessage(err));
    },
  });

  // Download handler
  const handleDownload = async () => {
    try {
      const proxyUrl = getProxyUrl(asset.url, mediaToken);
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = asset.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch {
      window.open(getProxyUrl(asset.url, mediaToken), '_blank');
    }
  };

  // FPS for frame stepping (default to 30fps if not available)
  const fps = asset.fps || 30;
  const frameTime = 1 / fps;

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch frames for timeline markers
  const { data: frames = [] } = useQuery({
    queryKey: ['frames', asset.id],
    queryFn: () => mediaCollabService.getFramesByAsset(asset.id),
    enabled: visible && !!asset.id,
  });

  // Fetch comments with timecode
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', asset.id],
    queryFn: () => mediaCollabService.getCommentsByAsset(asset.id),
    enabled: visible && !!asset.id,
  });

  // Fetch drawings
  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', asset.id],
    queryFn: () => mediaCollabService.getDrawingsByAsset(asset.id),
    enabled: visible && !!asset.id,
  });

  // Create timeline markers from frames, comments, and drawings
  const timelineMarkers: TimelineMarker[] = React.useMemo(() => {
    const markers: TimelineMarker[] = [];

    // Group comments by timestamp
    const commentsByTime = new Map<number, FrameComment[]>();
    comments.forEach((comment) => {
      // frame.timestamp is the Decimal from the DB; fall back to legacy .timestamp
      const timestamp = parseFloat((comment as any).frame?.timestamp) || (comment as any).timestamp || 0;
      if (timestamp > 0) {
        const existing = commentsByTime.get(timestamp) || [];
        existing.push(comment);
        commentsByTime.set(timestamp, existing);
      }
    });

    // Add comment markers
    commentsByTime.forEach((commentList, timestamp) => {
      markers.push({
        id: `comment-${timestamp}`,
        timecode: timestamp,
        type: 'comment',
        count: commentList.length,
      });
    });

    // Group drawings by frame
    const drawingsByFrame = new Map<string, any[]>();
    drawings.forEach((drawing) => {
      const existing = drawingsByFrame.get(drawing.frameId) || [];
      existing.push(drawing);
      drawingsByFrame.set(drawing.frameId, existing);
    });

    // Add drawing markers
    frames.forEach((frame) => {
      const frameDrawings = drawingsByFrame.get(frame.id) || [];
      if (frameDrawings.length > 0) {
        markers.push({
          id: `drawing-${frame.id}`,
          timecode: frame.timestamp,
          type: 'drawing',
          count: frameDrawings.length,
        });
      }
    });

    return markers.sort((a, b) => a.timecode - b.timecode);
  }, [frames, comments, drawings]);

  // Format time for display (MM:SS.f)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames}`;
  };

  // Auto-hide controls on mobile
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isMobile && isPlaying) {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isMobile, isPlaying]);

  // Video controls
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
    showControls();
  }, [isPlaying, showControls]);

  // Pause-only (used by comment textarea focus to auto-pause)
  const handlePause = useCallback(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((timecode: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, timecode));
    setCurrentTime(timecode);
    showControls();
  }, [duration, showControls]);

  const handleFrameStep = useCallback((direction: 'forward' | 'backward') => {
    if (!videoRef.current) return;

    const newTime = direction === 'forward'
      ? currentTime + frameTime
      : currentTime - frameTime;

    handleSeek(newTime);
  }, [currentTime, frameTime, handleSeek]);

  const handleJumpSeconds = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    handleSeek(currentTime + seconds);
  }, [currentTime, handleSeek]);

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  // Touch handlers for mobile
  const handleVideoTap = useCallback(() => {
    if (isMobile) {
      handlePlayPause();
    }
  }, [isMobile, handlePlayPause]);

  const handleVideoDoubleTap = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const tapX = e.changedTouches[0].clientX - rect.left;
      const isLeftHalf = tapX < rect.width / 2;

      if (isLeftHalf) {
        handleSeek(Math.max(0, currentTime - 10));
      } else {
        handleSeek(Math.min(duration, currentTime + 10));
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [isMobile, currentTime, duration, handleSeek]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // Only handle horizontal swipes (ignore vertical)
    if (dy < 30 && Math.abs(dx) > 10) {
      showControls();
    }
  }, [isMobile, showControls]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return;

    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.time;

    // Horizontal swipe for seeking (ignore vertical swipes)
    if (dy < 30 && Math.abs(dx) > 50 && dt < 500) {
      const seekAmount = (dx / window.innerWidth) * duration * 0.3;
      handleSeek(Math.max(0, Math.min(duration, currentTime + seekAmount)));
    }

    touchStartRef.current = null;
  }, [isMobile, currentTime, duration, handleSeek]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ': // Space - Play/Pause
          e.preventDefault();
          handlePlayPause();
          break;
        case 'k': // K - Play/Pause (industry standard)
          e.preventDefault();
          handlePlayPause();
          break;
        case 'j': // J - Rewind 1 second
          e.preventDefault();
          handleJumpSeconds(-1);
          break;
        case 'l': // L - Forward 1 second
          e.preventDefault();
          handleJumpSeconds(1);
          break;
        case 'arrowleft': // Left arrow - Previous frame
          e.preventDefault();
          handleFrameStep('backward');
          break;
        case 'arrowright': // Right arrow - Next frame
          e.preventDefault();
          handleFrameStep('forward');
          break;
        case ',': // Comma - Previous frame (alternative)
          e.preventDefault();
          handleFrameStep('backward');
          break;
        case '.': // Period - Next frame (alternative)
          e.preventDefault();
          handleFrameStep('forward');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handlePlayPause, handleJumpSeconds, handleFrameStep]);

  // Auto-hide controls effect
  useEffect(() => {
    showControls();
  }, [isPlaying, showControls]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleLoadStart = () => setIsVideoLoading(true);
  const handleCanPlay = () => setIsVideoLoading(false);
  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => { setIsBuffering(false); setIsVideoLoading(false); };
  const handleSeeking = () => setIsBuffering(true);
  const handleSeeked = () => setIsBuffering(false);
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsVideoLoading(false);
    setIsBuffering(false);
    const code = (e.currentTarget as HTMLVideoElement).error?.code;
    // code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (401/404/wrong type)
    const msg = code === 4 ? 'Video could not be loaded (access denied or unsupported format)' : 'Video failed to load';
    console.error('[VideoReviewModal] video error code', code, 'src:', videoSrc);
    message.error(msg);
  };

  const handleVolumeChange = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value / 100;
    setVolume(value);
  };

  // Comment handlers
  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      return mediaCollabService.createComment({
        assetId: asset.id,
        content: data.content,
        parentId: data.parentId,
        // Attach current timecode to comment
        ...(currentTime > 0 && { timestamp: currentTime } as any),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', asset.id] });
      message.success('Comment added');
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to add comment'));
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', asset.id] });
      message.success('Comment deleted');
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to delete comment'));
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.resolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', asset.id] });
      message.success('Comment resolved');
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to resolve comment'));
    },
  });

  // Handle marker click (seek to timecode and highlight comment)
  const handleMarkerClick = (marker: TimelineMarker) => {
    handleSeek(marker.timecode);

    if (marker.type === 'comment') {
      // Find the first comment at this timecode
      const comment = comments.find((c: any) => (parseFloat(c.frame?.timestamp) || c.timestamp) === marker.timecode);
      if (comment) {
        setSelectedCommentId(comment.id);
      }
    }
  };

  // Transform comments for CommentPanel
  // Backend returns: { text, resolved: boolean, frame: { timestamp } }
  const transformedComments = React.useMemo(() => {
    return comments.map((comment: any) => ({
      id: comment.id,
      text: comment.text,
      authorId: comment.authorId,
      author: comment.author,
      createdAt: comment.createdAt,
      resolved: comment.resolved ?? false,
      replies: comment.replies?.map((reply: any) => ({
        id: reply.id,
        text: reply.text,
        authorId: reply.authorId,
        author: reply.author,
        createdAt: reply.createdAt,
        resolved: reply.resolved ?? false,
      })) || [],
      timestamp: parseFloat(comment.frame?.timestamp) || comment.timestamp,
    }));
  }, [comments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* CSS for mobile animations */}
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}
      </style>

    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100vw' : '95vw'}
      style={isMobile ? { top: 0, padding: 0, maxWidth: '100vw' } : { top: 20, maxWidth: '1920px' }}
      styles={{
        body: {
          padding: 0,
          height: isMobile ? '100vh' : 'calc(95vh - 55px)',
          overflow: 'hidden'
        },
      }}
      destroyOnClose
      closeIcon={isMobile ? null : <CloseOutlined style={{ fontSize: 20, color: 'white' }} />}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: antToken.colorBgBase,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            background: antToken.colorBgElevated,
            borderBottom: `1px solid ${antToken.colorBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {isMobile ? (
            <>
              <Space size="small">
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  onClick={onClose}
                  style={{ padding: '4px 8px' }}
                />
                <Text strong style={{ fontSize: 14 }} ellipsis>
                  {asset.originalName}
                </Text>
              </Space>
              <Space size="small">
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  style={{ padding: '4px 8px' }}
                />
                <Button
                  type="text"
                  icon={<CommentOutlined />}
                  onClick={() => setShowCommentsSheet(!showCommentsSheet)}
                  style={{ padding: '4px 8px' }}
                />
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={onClose}
                  style={{ padding: '4px 8px' }}
                />
              </Space>
            </>
          ) : (
            <>
              {/* Left: filename + status + rating */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1, marginRight: 16 }}>
                <Text strong style={{ fontSize: 15, lineHeight: '1.2' }} ellipsis>
                  {asset.originalName}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Select
                    value={currentStatus}
                    size="small"
                    style={{ width: 148 }}
                    loading={updateStatusMutation.isPending}
                    onChange={(val) => updateStatusMutation.mutate(val)}
                    options={[
                      { value: 'DRAFT', label: 'Draft' },
                      { value: 'IN_REVIEW', label: 'In Review' },
                      { value: 'NEEDS_CHANGES', label: 'Needs Changes' },
                      { value: 'APPROVED', label: 'Approved' },
                      { value: 'ARCHIVED', label: 'Archived' },
                    ]}
                    optionRender={(option) => {
                      const colorMap: Record<string, string> = {
                        DRAFT: '#8c8c8c',
                        IN_REVIEW: '#1890ff',
                        NEEDS_CHANGES: '#fa8c16',
                        APPROVED: '#52c41a',
                        ARCHIVED: '#595959',
                      };
                      return (
                        <span style={{ color: colorMap[option.value as string] }}>
                          {option.label}
                        </span>
                      );
                    }}
                  />
                  <StarRating
                    value={currentRating}
                    size={16}
                    enableKeyboard={false}
                    onChange={(rating) => updateRatingMutation.mutate(rating)}
                  />
                </div>
              </div>

              {/* Right: actions */}
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                >
                  Download
                </Button>
                <Button
                  type={drawMode ? 'primary' : 'default'}
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (!isPlaying) {
                      setDrawMode(!drawMode);
                    } else {
                      message.info('Pause the video to enable drawing mode');
                    }
                  }}
                  disabled={isPlaying}
                >
                  Draw
                </Button>
                <Button
                  type={showInfo ? 'primary' : 'default'}
                  icon={<InfoCircleOutlined />}
                  onClick={() => setShowInfo(!showInfo)}
                >
                  Info
                </Button>
              </Space>
            </>
          )}
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
          {/* Video + Timeline section */}
          <div
            style={{
              flex: isMobile ? '1' : (showInfo ? '0 0 calc(100% - 400px)' : '1'),
              display: 'flex',
              flexDirection: 'column',
              background: '#000',
              position: 'relative',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {/* Video player with optional drawing overlay */}
            <div
              style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                preload="metadata"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onLoadStart={handleLoadStart}
                onCanPlay={handleCanPlay}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                onSeeking={handleSeeking}
                onSeeked={handleSeeked}
                onError={handleVideoError}
                onEnded={() => { setIsPlaying(false); setIsBuffering(false); }}
                onClick={handleVideoTap}
                onTouchEnd={handleVideoDoubleTap}
              />

              {/* Loading / buffering overlay */}
              {(isVideoLoading || isBuffering) && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.65)',
                    zIndex: 10,
                  }}
                >
                  {/* Thumbnail preview shown while initial video loads */}
                  {isVideoLoading && asset.thumbnailUrl && (
                    <img
                      src={getProxyUrl(asset.thumbnailUrl, mediaToken)}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: 0.35,
                      }}
                    />
                  )}
                  <Spin size="large" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.9)',
                      marginTop: 14,
                      fontSize: 13,
                      fontWeight: 500,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {isVideoLoading ? 'Loading video…' : 'Buffering…'}
                  </Text>
                </div>
              )}

              {/* Drawing overlay (only when paused and draw mode active) */}
              {drawMode && !isPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto',
                  }}
                >
                  <DrawingCanvasContainer
                    assetId={asset.id}
                    imageUrl={getProxyUrl(asset.url, mediaToken)}
                    timecode={currentTime}
                    width={asset.width}
                    height={asset.height}
                    onClose={() => setDrawMode(false)}
                  />
                </div>
              )}
            </div>

            {/* Video controls */}
            <div
              style={{
                padding: isMobile ? '12px' : '16px',
                background: antToken.colorBgElevated,
                opacity: isMobile && !controlsVisible ? 0 : 1,
                transition: 'opacity 0.3s ease',
                pointerEvents: isMobile && !controlsVisible ? 'none' : 'auto',
              }}
              onMouseMove={isMobile ? showControls : undefined}
              onTouchStart={isMobile ? showControls : undefined}
            >
              <Space direction="vertical" size={isMobile ? 16 : 12} style={{ width: '100%' }}>
                {/* Playback controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={isMobile ? 8 : 4}>
                    {!isMobile && (
                      <>
                        {/* Frame backward */}
                        <Button
                          type="text"
                          icon={<StepBackwardOutlined />}
                          onClick={() => handleFrameStep('backward')}
                          style={{ color: 'white' }}
                          title="Previous frame (← or ,)"
                        />

                        {/* Jump back 1 second */}
                        <Button
                          type="text"
                          icon={<FastBackwardOutlined />}
                          onClick={() => handleJumpSeconds(-1)}
                          style={{ color: 'white' }}
                          title="Rewind 1s (J)"
                        />
                      </>
                    )}

                    {/* Play/Pause */}
                    <Button
                      type="text"
                      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={handlePlayPause}
                      style={{
                        color: 'white',
                        fontSize: isMobile ? 40 : 28,
                        width: isMobile ? 48 : 'auto',
                        height: isMobile ? 48 : 'auto',
                      }}
                      title="Play/Pause (Space or K)"
                    />

                    {!isMobile && (
                      <>
                        {/* Jump forward 1 second */}
                        <Button
                          type="text"
                          icon={<FastForwardOutlined />}
                          onClick={() => handleJumpSeconds(1)}
                          style={{ color: 'white' }}
                          title="Forward 1s (L)"
                        />

                        {/* Frame forward */}
                        <Button
                          type="text"
                          icon={<StepForwardOutlined />}
                          onClick={() => handleFrameStep('forward')}
                          style={{ color: 'white' }}
                          title="Next frame (→ or .)"
                        />
                      </>
                    )}

                    {/* Time display */}
                    <Text
                      style={{
                        color: 'white',
                        marginLeft: isMobile ? 8 : 16,
                        fontFamily: 'monospace',
                        fontSize: isMobile ? 12 : 14,
                      }}
                    >
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Text>
                  </Space>

                  {!isMobile && (
                    <Space>
                      {/* Volume */}
                      <SoundOutlined style={{ color: 'white' }} />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        style={{ width: 100 }}
                      />

                      {/* Fullscreen */}
                      <Button
                        type="text"
                        icon={<FullscreenOutlined />}
                        onClick={handleFullscreen}
                        style={{ color: 'white' }}
                        title="Fullscreen"
                      />
                    </Space>
                  )}
                </div>

                {/* Timeline with markers */}
                <div style={{ marginTop: isMobile ? 4 : 0 }}>
                  <Timeline
                    duration={duration}
                    currentTime={currentTime}
                    markers={timelineMarkers}
                    onSeek={handleSeek}
                    onMarkerClick={handleMarkerClick}
                  />
                </div>
              </Space>
            </div>
          </div>

          {/* Comments panel - Desktop sidebar or Mobile bottom sheet */}
          {isMobile ? (
            // Mobile bottom sheet
            showCommentsSheet && (
              <div
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  maxHeight: '70vh',
                  background: antToken.colorBgContainer,
                  borderRadius: '16px 16px 0 0',
                  zIndex: 1001,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
                  animation: 'slideUp 0.3s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div
                  style={{
                    padding: '12px 0 8px',
                    textAlign: 'center',
                    cursor: 'grab',
                  }}
                  onTouchStart={(e) => {
                    const startY = e.touches[0].clientY;
                    const handleTouchMove = (moveEvent: TouchEvent) => {
                      const deltaY = moveEvent.touches[0].clientY - startY;
                      if (deltaY > 50) {
                        setShowCommentsSheet(false);
                        document.removeEventListener('touchmove', handleTouchMove);
                      }
                    };
                    document.addEventListener('touchmove', handleTouchMove);
                    document.addEventListener('touchend', () => {
                      document.removeEventListener('touchmove', handleTouchMove);
                    }, { once: true });
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      background: antToken.colorBorderSecondary,
                      margin: '0 auto',
                    }}
                  />
                </div>

                {/* Comments content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                  {commentsLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <TimecodeCommentPanel
                      comments={transformedComments}
                      currentUserId={user?.id || ''}
                      currentTimecode={currentTime}
                      onAddComment={async (text) => {
                        await createCommentMutation.mutateAsync({ content: text });
                      }}
                      onDeleteComment={async (commentId) => {
                        await deleteCommentMutation.mutateAsync(commentId);
                      }}
                      onResolveComment={async (commentId) => {
                        await resolveCommentMutation.mutateAsync(commentId);
                      }}
                      onSeekToTimecode={handleSeek}
                      onPauseVideo={handlePause}
                      selectedCommentId={selectedCommentId}
                      onSelectComment={setSelectedCommentId}
                    />
                  )}
                </div>
              </div>
            )
          ) : (
            // Desktop sidebar
            showInfo && (
              <div
                style={{
                  width: '400px',
                  borderLeft: `1px solid ${antToken.colorBorder}`,
                  background: antToken.colorBgContainer,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                  {commentsLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <TimecodeCommentPanel
                      comments={transformedComments}
                      currentUserId={user?.id || ''}
                      currentTimecode={currentTime}
                      onAddComment={async (text) => {
                        await createCommentMutation.mutateAsync({ content: text });
                      }}
                      onDeleteComment={async (commentId) => {
                        await deleteCommentMutation.mutateAsync(commentId);
                      }}
                      onResolveComment={async (commentId) => {
                        await resolveCommentMutation.mutateAsync(commentId);
                      }}
                      onSeekToTimecode={handleSeek}
                      onPauseVideo={handlePause}
                      selectedCommentId={selectedCommentId}
                      onSelectComment={setSelectedCommentId}
                    />
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Backdrop for mobile bottom sheet */}
        {isMobile && showCommentsSheet && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
            }}
            onClick={() => setShowCommentsSheet(false)}
          />
        )}
      </div>
    </Modal>
    </>
  );
};

/**
 * TimecodeCommentPanel
 *
 * Extension of CommentPanel that adds timecode badges and seeking functionality
 */
interface TimecodeComment {
  id: string;
  text: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  resolved: boolean;
  replies?: TimecodeComment[];
  timestamp?: number;
}

interface TimecodeCommentPanelProps {
  comments: TimecodeComment[];
  currentUserId: string;
  currentTimecode: number;
  onAddComment: (text: string, parentId?: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onResolveComment: (commentId: string) => Promise<void>;
  onSeekToTimecode: (timecode: number) => void;
  onPauseVideo?: () => void;
  selectedCommentId: string | null;
  onSelectComment: (commentId: string | null) => void;
}

const TimecodeCommentPanel: React.FC<TimecodeCommentPanelProps> = ({
  comments,
  currentUserId,
  currentTimecode,
  onAddComment,
  onDeleteComment,
  onResolveComment,
  onSeekToTimecode,
  onPauseVideo,
  selectedCommentId,
  onSelectComment,
}) => {
  const { token } = theme.useToken();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames}`;
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(replyText, parentId);
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const activeComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 13,
    resize: 'vertical',
    outline: 'none',
    color: token.colorText,
    boxSizing: 'border-box',
    lineHeight: 1.5,
  };

  return (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      {/* ── Comment input box ── */}
      <div
        style={{
          borderRadius: token.borderRadius,
          border: `1px solid ${token.colorBorder}`,
          overflow: 'hidden',
          background: token.colorBgElevated,
        }}
      >
        {/* Timecode chip header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 10px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#52c41a',
              flexShrink: 0,
            }}
          />
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            Commenting at
          </Text>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 8px',
              background: token.colorPrimaryBg,
              color: token.colorPrimary,
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'monospace',
              letterSpacing: '0.02em',
            }}
          >
            {formatTime(currentTimecode)}
          </span>
        </div>

        {/* Textarea — auto-pauses video on focus */}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onFocus={() => onPauseVideo?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAddComment();
            }
          }}
          placeholder="Add a comment… (Ctrl+Enter to submit)"
          style={{ ...textareaStyle, minHeight: 72 }}
        />

        {/* Submit row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '6px 10px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button
            type="primary"
            size="small"
            onClick={handleAddComment}
            loading={submitting}
            disabled={!newComment.trim()}
          >
            Add Comment
          </Button>
        </div>
      </div>

      {/* ── Active comments ── */}
      {activeComments.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', padding: '12px 0' }}>
          No comments yet. Pause the video and type to comment at a timestamp.
        </Text>
      ) : (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {activeComments.map((comment) => {
            const isSelected = selectedCommentId === comment.id;
            return (
              <div
                key={comment.id}
                style={{
                  borderRadius: token.borderRadius,
                  border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                  background: isSelected ? token.colorPrimaryBg : token.colorBgElevated,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onClick={() => onSelectComment(comment.id)}
              >
                {/* Comment header: avatar + name + timestamp chip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px 6px',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: token.colorPrimary,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {comment.author.name.charAt(0).toUpperCase()}
                    </div>
                    <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comment.author.name}
                    </Text>
                  </div>

                  {/* Frame.io-style green timestamp chip */}
                  {comment.timestamp !== undefined && (
                    <button
                      title={`Jump to ${formatTime(comment.timestamp)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeekToTimecode(comment.timestamp!);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        background: 'rgba(82, 196, 26, 0.1)',
                        color: '#389e0d',
                        border: '1px solid rgba(82, 196, 26, 0.3)',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        flexShrink: 0,
                        letterSpacing: '0.02em',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(82, 196, 26, 0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(82, 196, 26, 0.1)')}
                    >
                      ▶ {formatTime(comment.timestamp)}
                    </button>
                  )}
                </div>

                {/* Comment text */}
                <div style={{ padding: '0 10px 8px' }}>
                  <Text style={{ fontSize: 13, lineHeight: 1.5 }}>{comment.text}</Text>
                </div>

                {/* Action bar */}
                <div
                  style={{
                    display: 'flex',
                    gap: 2,
                    padding: '3px 6px',
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Button
                    type="link" size="small"
                    style={{ fontSize: 11, padding: '0 6px', height: 24 }}
                    onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === comment.id ? null : comment.id); }}
                  >
                    Reply
                  </Button>
                  <Button
                    type="link" size="small"
                    style={{ fontSize: 11, padding: '0 6px', height: 24 }}
                    onClick={(e) => { e.stopPropagation(); onResolveComment(comment.id); }}
                  >
                    Resolve
                  </Button>
                  {comment.authorId === currentUserId && (
                    <Button
                      type="link" size="small" danger
                      style={{ fontSize: 11, padding: '0 6px', height: 24 }}
                      onClick={(e) => { e.stopPropagation(); onDeleteComment(comment.id); }}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                {/* Reply input */}
                {replyingTo === comment.id && (
                  <div style={{ padding: '8px 10px', borderTop: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onFocus={() => onPauseVideo?.()}
                      placeholder="Write a reply…"
                      style={{
                        ...textareaStyle,
                        minHeight: 52,
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: token.borderRadius,
                        marginBottom: 8,
                        background: token.colorBgElevated,
                        padding: '6px 8px',
                      }}
                    />
                    <Space size={6}>
                      <Button type="primary" size="small" onClick={() => handleAddReply(comment.id)} loading={submitting}>Reply</Button>
                      <Button size="small" onClick={() => setReplyingTo(null)}>Cancel</Button>
                    </Space>
                  </div>
                )}

                {/* Threaded replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        style={{ padding: '7px 10px 7px 22px', borderBottom: `1px solid ${token.colorBorderSecondary}`, position: 'relative' }}
                      >
                        <div style={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, background: token.colorBorderSecondary, borderRadius: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: token.colorTextSecondary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {reply.author.name.charAt(0).toUpperCase()}
                          </div>
                          <Text strong style={{ fontSize: 11 }}>{reply.author.name}</Text>
                        </div>
                        <Text style={{ fontSize: 12, lineHeight: 1.5 }}>{reply.text}</Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Space>
      )}

      {/* ── Resolved comments ── */}
      {resolvedComments.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
            Resolved ({resolvedComments.length})
          </Text>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {resolvedComments.map((comment) => (
              <div
                key={comment.id}
                style={{ padding: '8px 10px', background: token.colorBgElevated, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorder}`, opacity: 0.55 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <Text strong style={{ fontSize: 11 }}>{comment.author.name}</Text>
                  {comment.timestamp !== undefined && (
                    <Text style={{ fontSize: 10, fontFamily: 'monospace', color: token.colorTextSecondary }}>
                      {formatTime(comment.timestamp)}
                    </Text>
                  )}
                </div>
                <Text style={{ fontSize: 12 }}>{comment.text}</Text>
              </div>
            ))}
          </Space>
        </div>
      )}
    </Space>
  );
};

export default VideoReviewModal;
