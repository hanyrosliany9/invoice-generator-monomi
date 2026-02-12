import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Spin, Badge, theme, App } from 'antd';
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
} from '@ant-design/icons';
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

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  // UI state
  const [drawMode, setDrawMode] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  // FPS for frame stepping (default to 30fps if not available)
  const fps = asset.fps || 30;
  const frameTime = 1 / fps;

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
      // Check if comment has timestamp in metadata or was added to a frame
      const timestamp = (comment as any).timestamp || 0;
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

  // Video controls
  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (timecode: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, timecode));
    setCurrentTime(timecode);
  };

  const handleFrameStep = (direction: 'forward' | 'backward') => {
    if (!videoRef.current) return;

    const newTime = direction === 'forward'
      ? currentTime + frameTime
      : currentTime - frameTime;

    handleSeek(newTime);
  };

  const handleJumpSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    handleSeek(currentTime + seconds);
  };

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

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
  }, [visible, isPlaying, currentTime, duration]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
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
      const comment = comments.find((c: any) => c.timestamp === marker.timecode);
      if (comment) {
        setSelectedCommentId(comment.id);
      }
    }
  };

  // Transform comments for CommentPanel
  const transformedComments = React.useMemo(() => {
    return comments.map((comment) => ({
      id: comment.id,
      text: comment.content,
      authorId: comment.authorId,
      author: comment.author,
      createdAt: comment.createdAt,
      resolved: comment.status === 'RESOLVED',
      replies: comment.replies?.map((reply) => ({
        id: reply.id,
        text: reply.content,
        authorId: reply.authorId,
        author: reply.author,
        createdAt: reply.createdAt,
        resolved: reply.status === 'RESOLVED',
      })) || [],
      timestamp: (comment as any).timestamp,
    }));
  }, [comments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="95vw"
      style={{ top: 20, maxWidth: '1920px' }}
      styles={{
        body: { padding: 0, height: 'calc(95vh - 55px)', overflow: 'hidden' },
      }}
      destroyOnClose
      closeIcon={<CloseOutlined style={{ fontSize: 20, color: 'white' }} />}
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
            padding: '12px 16px',
            background: antToken.colorBgElevated,
            borderBottom: `1px solid ${antToken.colorBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            {asset.originalName}
          </Text>
          <Space>
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
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Video + Timeline section */}
          <div
            style={{
              flex: showInfo ? '0 0 calc(100% - 400px)' : '1',
              display: 'flex',
              flexDirection: 'column',
              background: '#000',
              position: 'relative',
            }}
          >
            {/* Video player with optional drawing overlay */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                src={getProxyUrl(asset.url, mediaToken)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />

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
                padding: '16px',
                background: antToken.colorBgElevated,
              }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {/* Playback controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={4}>
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

                    {/* Play/Pause */}
                    <Button
                      type="text"
                      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={handlePlayPause}
                      style={{ color: 'white', fontSize: 28 }}
                      title="Play/Pause (Space or K)"
                    />

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

                    {/* Time display */}
                    <Text style={{ color: 'white', marginLeft: 16, fontFamily: 'monospace', fontSize: 14 }}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Text>
                  </Space>

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
                </div>

                {/* Timeline with markers */}
                <Timeline
                  duration={duration}
                  currentTime={currentTime}
                  markers={timelineMarkers}
                  onSeek={handleSeek}
                  onMarkerClick={handleMarkerClick}
                />
              </Space>
            </div>
          </div>

          {/* Comments panel */}
          {showInfo && (
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
                    selectedCommentId={selectedCommentId}
                    onSelectComment={setSelectedCommentId}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* New comment input with timecode display */}
      <div>
        <div style={{ marginBottom: 8 }}>
          <Badge
            count={`@ ${formatTime(currentTimecode)}`}
            style={{ background: token.colorPrimary }}
          />
        </div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment at current timecode..."
          style={{
            width: '100%',
            minHeight: 80,
            padding: 8,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`,
            marginBottom: 8,
            fontFamily: 'inherit',
            fontSize: 14,
            resize: 'vertical',
          }}
        />
        <Button
          type="primary"
          onClick={handleAddComment}
          loading={submitting}
          disabled={!newComment.trim()}
        >
          Add Comment
        </Button>
      </div>

      {/* Comments list with timecode badges */}
      <div>
        {comments.length === 0 ? (
          <Text type="secondary">No comments yet. Be the first to comment!</Text>
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {comments
              .filter((c) => !c.resolved)
              .map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: 12,
                    background: selectedCommentId === comment.id ? token.colorPrimaryBg : token.colorBgElevated,
                    borderRadius: token.borderRadius,
                    border: `1px solid ${selectedCommentId === comment.id ? token.colorPrimary : token.colorBorder}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectComment(comment.id)}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {/* Author and timecode */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{comment.author.name}</Text>
                      {comment.timestamp !== undefined && (
                        <Badge
                          count={formatTime(comment.timestamp)}
                          style={{
                            background: token.colorSuccess,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeekToTimecode(comment.timestamp!);
                          }}
                        />
                      )}
                    </div>

                    {/* Comment text */}
                    <Text>{comment.text}</Text>

                    {/* Actions */}
                    <Space size="small">
                      {comment.authorId === currentUserId && (
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteComment(comment.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolveComment(comment.id);
                        }}
                      >
                        Resolve
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(comment.id);
                        }}
                      >
                        Reply
                      </Button>
                    </Space>

                    {/* Reply input */}
                    {replyingTo === comment.id && (
                      <div style={{ marginTop: 8 }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          style={{
                            width: '100%',
                            minHeight: 60,
                            padding: 8,
                            borderRadius: token.borderRadius,
                            border: `1px solid ${token.colorBorder}`,
                            marginBottom: 8,
                            fontFamily: 'inherit',
                            fontSize: 14,
                          }}
                        />
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleAddReply(comment.id)}
                            loading={submitting}
                          >
                            Reply
                          </Button>
                          <Button size="small" onClick={() => setReplyingTo(null)}>
                            Cancel
                          </Button>
                        </Space>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div style={{ marginLeft: 24, marginTop: 8 }}>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          {comment.replies.map((reply) => (
                            <div
                              key={reply.id}
                              style={{
                                padding: 8,
                                background: token.colorBgContainer,
                                borderRadius: token.borderRadius,
                                border: `1px solid ${token.colorBorder}`,
                              }}
                            >
                              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Text strong style={{ fontSize: 12 }}>{reply.author.name}</Text>
                                <Text style={{ fontSize: 13 }}>{reply.text}</Text>
                              </Space>
                            </div>
                          ))}
                        </Space>
                      </div>
                    )}
                  </Space>
                </div>
              ))}
          </Space>
        )}

        {/* Resolved comments section */}
        {comments.filter((c) => c.resolved).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Resolved Comments ({comments.filter((c) => c.resolved).length})
            </Text>
            <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 12 }}>
              {comments
                .filter((c) => c.resolved)
                .map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: 8,
                      background: token.colorBgElevated,
                      borderRadius: token.borderRadius,
                      opacity: 0.6,
                    }}
                  >
                    <Text>{comment.text}</Text>
                  </div>
                ))}
            </Space>
          </div>
        )}
      </div>
    </Space>
  );
};

export default VideoReviewModal;
