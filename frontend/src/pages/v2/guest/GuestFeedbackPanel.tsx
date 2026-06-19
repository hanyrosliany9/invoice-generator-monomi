/**
 * GuestFeedbackPanel
 *
 * Public-link feedback surface: star rating + threaded comment list + comment
 * submission form.  No authentication required — uses the public share token
 * so anyone with the link can leave feedback.
 *
 * Usage:
 *   <GuestFeedbackPanel shareToken={token} asset={asset} />
 *
 * The guest name is persisted to localStorage so returning visitors don't have
 * to type it again.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Star, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Skeleton } from '@/components/ui/skeleton';
import {
  mediaCollabService,
  type MediaAsset,
  type FrameComment,
} from '@/services/media-collab';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const GUEST_NAME_KEY = 'monomi_public_guest_name';

/* ------------------------------------------------------------------ */
/*  StarRatingInput — v2-native interactive star widget                 */
/* ------------------------------------------------------------------ */

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={t('guestReview.ratingLabel', 'Rating bintang')}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={t('guestReview.starN', '{{n}} bintang', { n: star })}
            onClick={() => onChange(value === star ? 0 : star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={cn(
              'rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                active
                  ? 'fill-warning stroke-warning'
                  : 'fill-transparent stroke-text-tertiary hover:stroke-warning',
              )}
            />
          </button>
        );
      })}
      {value > 0 && !disabled && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-1 rounded px-1 py-0.5 text-[11px] text-text-tertiary hover:text-text-secondary focus-visible:outline-none"
          aria-label={t('guestReview.clearRating', 'Hapus rating')}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CommentItem — renders one comment row                              */
/* ------------------------------------------------------------------ */

function CommentItem({ comment }: { comment: FrameComment }) {
  const { t } = useTranslation();

  // Comments posted via the public endpoint are prefixed "[GuestName]: ..."
  // Parse that prefix back out for a cleaner display.
  const prefixMatch = comment.content.match(/^\[([^\]]+)\]:\s*([\s\S]*)$/);
  const authorDisplay = prefixMatch ? prefixMatch[1] : comment.author?.name ?? t('guestReview.anonymous', 'Anonim');
  const bodyText = prefixMatch ? prefixMatch[2] : comment.content;

  return (
    <div className="flex gap-2.5">
      {/* Avatar initials */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold uppercase text-accent"
        aria-hidden="true"
      >
        {authorDisplay.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-text-primary">{authorDisplay}</span>
          <span className="text-[11px] text-text-tertiary">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: idLocale,
            })}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{bodyText}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GuestFeedbackPanel — main export                                    */
/* ------------------------------------------------------------------ */

interface GuestFeedbackPanelProps {
  shareToken: string;
  asset: MediaAsset;
  /** Called after a rating PUT succeeds so parent can refresh its asset list */
  onRatingChange?: (newRating: number) => void;
}

export function GuestFeedbackPanel({
  shareToken,
  asset,
  onRatingChange,
}: GuestFeedbackPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  /* ---- guest name (persisted) ---- */
  const [guestName, setGuestName] = useState<string>(() => {
    try {
      return localStorage.getItem(GUEST_NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const persistGuestName = (name: string) => {
    setGuestName(name);
    try {
      localStorage.setItem(GUEST_NAME_KEY, name);
    } catch {
      /* localStorage unavailable (private browsing etc.) — silently skip */
    }
  };

  /* ---- comment text ---- */
  const [commentText, setCommentText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---- local optimistic star rating ---- */
  const [localRating, setLocalRating] = useState<number>(asset.starRating ?? 0);
  useEffect(() => {
    setLocalRating(asset.starRating ?? 0);
  }, [asset.starRating, asset.id]);

  /* ---- fetch comments ---- */
  const commentsQueryKey = ['public-asset-comments', shareToken, asset.id];
  const {
    data: comments = [],
    isLoading: commentsLoading,
  } = useQuery<FrameComment[]>({
    queryKey: commentsQueryKey,
    queryFn: () => mediaCollabService.getPublicAssetComments(shareToken, asset.id),
  });

  /* ---- post comment mutation ---- */
  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      mediaCollabService.createPublicComment(shareToken, asset.id, {
        content,
        guestName: guestName.trim() || t('guestReview.anonymous', 'Anonim'),
      }),
    onSuccess: () => {
      setCommentText('');
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });

  /* ---- rating mutation ---- */
  const ratingMutation = useMutation({
    mutationFn: (rating: number) =>
      mediaCollabService.updatePublicAssetRating(shareToken, asset.id, rating),
    onSuccess: (_, rating) => {
      onRatingChange?.(rating);
      // Also invalidate asset list so tile star badge updates
      void queryClient.invalidateQueries({ queryKey: ['public-assets-v2', shareToken] });
    },
  });

  const handleRatingChange = (rating: number) => {
    setLocalRating(rating);
    ratingMutation.mutate(rating);
  };

  const handleSubmitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    commentMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <GlassPanel surface="strong" padding="none" className="flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-text-tertiary" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary">
            {t('guestReview.feedbackHeader', 'Tinggalkan Masukan')}
          </span>
        </div>
      </div>

      {/* Star rating section */}
      <div className="border-b border-border-subtle px-4 py-3">
        <Label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
          {t('guestReview.ratingSection', 'Rating Aset')}
        </Label>
        <div className="flex items-center gap-3">
          <StarRatingInput
            value={localRating}
            onChange={handleRatingChange}
            disabled={ratingMutation.isPending}
          />
          {ratingMutation.isPending && (
            <span className="text-[11px] text-text-tertiary">
              {t('guestReview.saving', 'Menyimpan...')}
            </span>
          )}
          {ratingMutation.isSuccess && (
            <span className="text-[11px] text-success">
              {t('guestReview.ratingsaved', 'Tersimpan')}
            </span>
          )}
          {ratingMutation.isError && (
            <span className="text-[11px] text-danger">
              {t('guestReview.ratingError', 'Gagal menyimpan')}
            </span>
          )}
        </div>
      </div>

      {/* Comment list */}
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary font-medium">
            {t('guestReview.commentsSection', 'Komentar')}
          </span>
          {!commentsLoading && (
            <span className="text-[10px] text-text-tertiary tabular-nums">({comments.length})</span>
          )}
        </div>
        {commentsLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-text-tertiary italic py-2">
            {t('guestReview.noComments', 'Belum ada komentar. Jadilah yang pertama!')}
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
          </div>
        )}
      </div>

      {/* Comment form */}
      <div className="border-t border-border-subtle px-4 pb-4 pt-3 space-y-2.5">
        {/* Guest name */}
        <div>
          <Label
            htmlFor="guest-name-input"
            className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-text-tertiary"
          >
            {t('guestReview.yourName', 'Nama Anda')}
          </Label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              id="guest-name-input"
              value={guestName}
              onChange={(e) => persistGuestName(e.target.value)}
              placeholder={t('guestReview.namePlaceholder', 'cth. Budi Santoso')}
              className="bg-bg-sunken border-border-subtle pl-8 text-xs text-text-primary placeholder:text-text-tertiary h-8"
              maxLength={80}
            />
          </div>
        </div>

        {/* Comment textarea */}
        <div>
          <Label
            htmlFor="guest-comment-input"
            className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-text-tertiary"
          >
            {t('guestReview.commentLabel', 'Komentar')}
          </Label>
          <textarea
            ref={textareaRef}
            id="guest-comment-input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('guestReview.commentPlaceholder', 'Tulis masukan Anda di sini...')}
            rows={3}
            maxLength={1000}
            className={cn(
              'w-full resize-none rounded-md border border-border-subtle bg-bg-sunken px-3 py-2',
              'text-xs text-text-primary placeholder:text-text-tertiary',
              'shadow-xs outline-none transition-[color,box-shadow]',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            disabled={commentMutation.isPending}
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary">
              {t('guestReview.submitHint', 'Ctrl+Enter untuk kirim')}
            </span>
            <span className="text-[10px] text-text-tertiary tabular-nums">
              {commentText.length}/1000
            </span>
          </div>
        </div>

        {/* Submit */}
        <Button
          size="sm"
          onClick={handleSubmitComment}
          disabled={!commentText.trim() || commentMutation.isPending}
          className="w-full gap-2"
        >
          <Send className="h-3.5 w-3.5" />
          {commentMutation.isPending
            ? t('guestReview.sending', 'Mengirim...')
            : t('guestReview.sendButton', 'Kirim Komentar')}
        </Button>

        {commentMutation.isError && (
          <p className="text-[11px] text-danger">
            {t('guestReview.commentError', 'Gagal mengirim komentar. Coba lagi.')}
          </p>
        )}
      </div>
    </GlassPanel>
  );
}

export default GuestFeedbackPanel;
