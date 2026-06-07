/**
 * CommentPanel — timecoded comments for video review.
 *
 * Renders all asset comments (with their timecode from frame.timestamp),
 * lets users add new comments stamped to the current playback time,
 * supports resolve, and clicking a comment seeks the video.
 *
 * Endpoint used for reading:  GET /media-collab/comments/asset/:assetId
 * Endpoint used for creating: POST /media-collab/comments
 *   payload: { assetId, timestamp (secs), content }
 * Endpoint used for resolving: POST /media-collab/comments/:commentId/resolve
 *
 * The backend returns comments with shape:
 *   { id, content, createdAt, status, author: { id, name, email },
 *     frame: { timestamp } }
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

/** Extended FrameComment that includes the nested frame timestamp. */
export interface TimecodeComment {
  id: string;
  content: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  author: { id: string; name: string; email: string };
  /** Timecode in seconds — comes from frame.timestamp in the backend response. */
  timecode?: number;
}

interface CommentPanelProps {
  comments: TimecodeComment[];
  currentTime: number;
  /** Called when user clicks a comment — parent should seek to comment.timecode */
  onSeekTo?: (timecode: number) => void;
  /** Submit a new comment at currentTime */
  onAddComment: (text: string, timecode: number) => Promise<void>;
  onResolve?: (commentId: string) => Promise<void>;
  isAdding?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const fmt = (s?: number) => {
  if (s === undefined || s === null || !Number.isFinite(s)) return null;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
};

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function CommentPanel({
  comments,
  currentTime,
  onSeekTo,
  onAddComment,
  onResolve,
  isAdding,
  className,
}: CommentPanelProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    await onAddComment(value, currentTime);
    setText('');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
        <MessageSquare className="h-4 w-4 text-white/60" />
        <span className="text-sm font-medium text-white">
          {t('videoReview.comments', 'Comments')}
        </span>
        <span className="text-xs text-white/40 ml-auto">
          {comments.length}
        </span>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-xs">
            {t('videoReview.noComments', 'No comments yet. Add one below.')}
          </div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onSeekTo={onSeekTo}
              onResolve={onResolve}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 p-3 shrink-0 bg-[#111]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* Timecode stamp preview */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <Clock className="h-3 w-3" />
            <span>{t('videoReview.commentAt', 'Comment at')} {fmt(currentTime) ?? '0:00'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('videoReview.commentPlaceholder', 'Add a comment…')}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 text-xs h-8"
            />
            <Button type="submit" size="sm" className="h-8 shrink-0" disabled={!text.trim() || isAdding}>
              {isAdding
                ? t('videoReview.sending', 'Sending…')
                : t('videoReview.send', 'Send')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── CommentItem ── */

function CommentItem({
  comment,
  onSeekTo,
  onResolve,
}: {
  comment: TimecodeComment;
  onSeekTo?: (timecode: number) => void;
  onResolve?: (commentId: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const timecodeLabel = fmt(comment.timecode);

  return (
    <div
      className={cn(
        'rounded-md border p-2.5 transition-colors',
        comment.timecode !== undefined && onSeekTo
          ? 'cursor-pointer hover:bg-white/5 border-white/10'
          : 'border-white/10',
        comment.status === 'RESOLVED' && 'opacity-50',
      )}
      onClick={() => {
        if (comment.timecode !== undefined) onSeekTo?.(comment.timecode);
      }}
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
          <AvatarFallback className="bg-white/10 text-white text-[9px] font-medium">
            {initials(comment.author?.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[11px] font-medium text-white truncate">
              {comment.author?.name ?? t('videoReview.anonymous', 'Anonymous')}
            </span>
            {timecodeLabel && (
              <Badge
                variant="outline"
                className="border-transparent bg-emerald-500/20 text-emerald-400 px-1 py-0 text-[9px] font-mono"
              >
                {timecodeLabel}
              </Badge>
            )}
            {comment.status === 'RESOLVED' && (
              <Badge
                variant="outline"
                className="border-transparent bg-white/10 text-white/50 px-1 py-0 text-[9px]"
              >
                {t('videoReview.resolved', 'Resolved')}
              </Badge>
            )}
          </div>

          <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-line">
            {comment.content}
          </p>
        </div>

        {/* Resolve button */}
        {onResolve && comment.status === 'OPEN' && (
          <button
            type="button"
            title={t('videoReview.resolve', 'Resolve')}
            className="shrink-0 mt-0.5 text-white/30 hover:text-emerald-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onResolve(comment.id);
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
