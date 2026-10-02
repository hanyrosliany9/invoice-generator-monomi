import { useCallback } from 'react';
import type { ContentCalendarItem } from '@/services/content-calendar';
import { useMediaToken } from '@/hooks/useMediaToken';

/**
 * A SCHEDULED item whose time has passed. Nothing publishes automatically (the
 * planner cannot post to Instagram), so this is a nudge for staff to either
 * mark it published or reschedule it.
 */
export function isOverdue(item: Pick<ContentCalendarItem, 'status' | 'scheduledAt'>, now: number = Date.now()): boolean {
  if (item.status !== 'SCHEDULED' || !item.scheduledAt) return false;
  const t = new Date(item.scheduledAt).getTime();
  return !Number.isNaN(t) && t < now;
}

/** Statuses that can still be rescheduled by dragging on the month grid. */
export function isReschedulable(item: Pick<ContentCalendarItem, 'status'>): boolean {
  return item.status === 'DRAFT' || item.status === 'SCHEDULED';
}

export interface ContentThumb {
  /** Displayable image URL, or null when only an icon can be shown (video without a poster). */
  url: string | null;
  isVideo: boolean;
  count: number;
}

/**
 * Resolve a small cover thumbnail for staff views. Images use the object key
 * through the authenticated media proxy; videos use their poster thumbnail
 * when one was stored.
 */
export function useContentThumb(): (item: ContentCalendarItem) => ContentThumb | null {
  const { mediaToken } = useMediaToken();
  return useCallback(
    (item) => {
      const sorted = [...(item.media ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const m = sorted[0];
      if (!m) return null;
      const view = (key: string) =>
        `/api/v1/media/view/${key}?mt=${encodeURIComponent(mediaToken ?? '')}`;
      const isVideo = m.type === 'VIDEO' || (m.mimeType ?? '').startsWith('video/');
      let url: string | null = null;
      if (isVideo) {
        url = m.thumbnailKey ? view(m.thumbnailKey) : (m.thumbnailUrl ?? null);
      } else {
        url = m.key ? view(m.key) : m.url;
      }
      return { url, isVideo, count: sorted.length };
    },
    [mediaToken],
  );
}

/** Short label for a post format; carousels are FEED posts with several media. */
export function formatKind(item: Pick<ContentCalendarItem, 'format' | 'media'>): 'POST' | 'CAROUSEL' | 'REEL' | 'STORY' {
  if (item.format === 'REEL') return 'REEL';
  if (item.format === 'STORY') return 'STORY';
  return (item.media?.length ?? 0) > 1 ? 'CAROUSEL' : 'POST';
}
