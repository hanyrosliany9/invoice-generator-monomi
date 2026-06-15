/* ------------------------------------------------------------------ */
/*  InstagramPreview — a faithful, visual-only mock of the Instagram   */
/*  app rendered from planned content-calendar items. Single agency    */
/*  profile. Surfaces: profile grid (3-col, drag-to-rearrange),        */
/*  single post / swipeable carousel, Reels tab, and Stories.          */
/*                                                                     */
/*  Nothing here publishes to Instagram. "Posted" = item marked        */
/*  PUBLISHED elsewhere. The phone is intentionally rendered in        */
/*  Instagram's light theme so it reads as the real app, sitting       */
/*  inside the app's dark chrome like a device on a desk.              */
/* ------------------------------------------------------------------ */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Heart, MessageCircle, Send, Bookmark, Grid3x3, Film, Play,
  GripVertical, SquareStack, ChevronLeft, ChevronRight, X,
  MoreHorizontal, Pencil, Camera, Rocket, Maximize2, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import contentCalendarService, {
  type ContentCalendarItem,
  type ContentFormat,
  type IgProfile,
  type StoryHighlight,
} from '@/services/content-calendar';
import { useMediaToken } from '@/hooks/useMediaToken';
import { extractR2Key } from '@/utils/mediaProxy';
import { cn } from '@/lib/utils';

// Minimal shape of the i18n t() so module-level helpers can take it.
type TFunc = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const IG_BLUE = '#0095f6';
const LINK_BLUE = '#00376b';

interface DisplayMedia { url: string; isVideo: boolean }

/**
 * Builds a media-URL resolver. Uploaded content media lives in R2 behind an
 * authenticated endpoint, so an <img> can't send an auth header:
 *  - authed mode → /media/view with the media token (same-origin, dev+prod)
 *  - share mode  → the public per-client endpoint (no login)
 * External/absolute URLs (e.g. a pasted client avatar) are left untouched.
 */
export type MediaResolver = (url: string | null | undefined) => string | null;

function buildResolver(token?: string | null, shareToken?: string): MediaResolver {
  return (url) => {
    if (!url) return null;
    if (url.includes('/api/v1/media/proxy/') || url.includes('.r2.cloudflarestorage.com')) {
      const key = extractR2Key(url);
      if (key && shareToken) return `/api/v1/content-calendar/public/${shareToken}/media?key=${encodeURIComponent(key)}`;
      if (key && token) return `/api/v1/media/view/${key}?mt=${encodeURIComponent(token)}`;
      return url;
    }
    return url;
  };
}

/** Turn a highlight's media into story-viewer items (each frame = one media). */
function highlightToItems(h: StoryHighlight): ContentCalendarItem[] {
  return (h.media ?? []).map((m) => ({
    id: m.id,
    caption: h.title,
    status: 'PUBLISHED',
    format: 'STORY',
    platforms: ['INSTAGRAM'],
    media: [{ id: m.id, url: m.url, key: m.key, type: m.type, mimeType: m.mimeType, size: 0, thumbnailUrl: m.thumbnailUrl ?? undefined, order: m.order ?? 0, uploadedAt: '' }],
    createdAt: '',
    updatedAt: '',
  } as unknown as ContentCalendarItem));
}

/** First media for a tile/cover; videos fall back to their thumbnail. */
function coverMedia(item: ContentCalendarItem, resolve: MediaResolver): DisplayMedia | null {
  const m = item.media?.[0];
  if (!m) return null;
  const isVideo = m.type === 'VIDEO';
  const raw = isVideo && m.thumbnailUrl ? m.thumbnailUrl : m.url;
  const url = resolve(raw);
  return url ? { url, isVideo } : null;
}

/** Media ordered for the carousel (by `order`, falling back to array order). */
function orderedMedia(item: ContentCalendarItem) {
  return [...(item.media ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Instagram grid order: manual gridOrder first (nulls last), then newest. */
function sortForGrid(items: ContentCalendarItem[]): ContentCalendarItem[] {
  return [...items].sort((a, b) => {
    const ao = a.gridOrder ?? null;
    const bo = b.gridOrder ?? null;
    if (ao !== null && bo !== null && ao !== bo) return ao - bo;
    if (ao !== null && bo === null) return -1;
    if (ao === null && bo !== null) return 1;
    const ad = a.scheduledAt ? +new Date(a.scheduledAt) : +new Date(a.createdAt);
    const bd = b.scheduledAt ? +new Date(b.scheduledAt) : +new Date(b.createdAt);
    return bd - ad; // newest first (top-left), like a real profile
  });
}

function scheduledLabel(item: ContentCalendarItem, t: TFunc, locale = 'id-ID'): string {
  const d = item.scheduledAt ? new Date(item.scheduledAt) : null;
  if (!d || Number.isNaN(d.getTime())) return t('preview.noSchedule', 'Tanpa jadwal');
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Render a caption with @mentions and #hashtags styled like Instagram. */
function Caption({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^[#@][\wÀ-ÿ.]+/.test(p)
          ? <span key={i} style={{ color: LINK_BLUE }}>{p}</span>
          : <span key={i}>{p}</span>,
      )}
    </span>
  );
}

const STATUS_TINT: Record<ContentCalendarItem['status'], string> = {
  DRAFT: 'bg-zinc-500',
  SCHEDULED: 'bg-blue-500',
  PUBLISHED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
  ARCHIVED: 'bg-zinc-400',
};

/* ------------------------------------------------------------------ */
/*  Tile cover (shared by grid + reels)                               */
/* ------------------------------------------------------------------ */

function TileCover({ item, reel, resolve }: { item: ContentCalendarItem; reel?: boolean; resolve: MediaResolver }) {
  const { t } = useTranslation();
  const cover = coverMedia(item, resolve);
  const multi = (item.media?.length ?? 0) > 1;
  const isReel = item.format === 'REEL';
  return (
    <>
      {cover ? (
        <img src={cover.url} alt="" className="absolute inset-0 h-full w-full object-cover"
             loading="lazy" draggable={false}
             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-100 to-zinc-200 p-2 text-center">
          <Camera className="h-5 w-5 text-zinc-400" />
          <span className="line-clamp-3 text-[10px] leading-tight text-zinc-500">
            {item.caption?.slice(0, 60) || t('preview.noMediaShort', 'Tanpa media')}
          </span>
        </div>
      )}

      {/* top-right format indicator, exactly where Instagram puts it */}
      <div className="pointer-events-none absolute right-1.5 top-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        {isReel || reel ? <Film className="h-4 w-4" />
          : multi ? <SquareStack className="h-4 w-4" />
          : cover?.isVideo ? <Play className="h-4 w-4 fill-white" />
          : null}
      </div>

      {/* status dot — keeps the mock useful as a planner */}
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
        <span className={cn('h-2 w-2 rounded-full ring-1 ring-white/70', STATUS_TINT[item.status])} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable grid tile                                                 */
/* ------------------------------------------------------------------ */

function GridTile({
  item, rearrange, onOpen, resolve,
}: { item: ContentCalendarItem; rearrange: boolean; onOpen: () => void; resolve: MediaResolver }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !rearrange });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // 2026 Instagram profile grid displays 3:4 portrait tiles.
        'group relative aspect-[3/4] select-none overflow-hidden bg-zinc-100',
        rearrange ? 'cursor-grab touch-none ring-1 ring-inset ring-black/5 active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'shadow-2xl ring-2 ring-[color:var(--ig-blue)]',
      )}
      {...(rearrange ? { ...attributes, ...listeners } : { onClick: onOpen })}
    >
      <TileCover item={item} resolve={resolve} />

      {/* hover overlay (desktop) with schedule + status — planner affordance */}
      {!rearrange && (
        <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/70 via-black/0 to-black/0 p-2 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
          <span className="text-[10px] font-medium text-white">{scheduledLabel(item, t)}</span>
          <span className="text-[9px] uppercase tracking-wide text-white/70">{item.status}</span>
        </div>
      )}

      {rearrange && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
          <GripVertical className="h-5 w-5 text-white drop-shadow" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post / carousel modal                                              */
/* ------------------------------------------------------------------ */

function PostModal({
  list, index, profile, onClose, onIndex, onEdit, onDelete, onFormatChange, formatPending, resolve, readOnly,
}: {
  list: ContentCalendarItem[];
  index: number;
  profile?: IgProfile;
  onClose: () => void;
  onIndex: (i: number) => void;
  onEdit: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
  onFormatChange: (item: ContentCalendarItem, format: ContentFormat) => void;
  formatPending: boolean;
  resolve: MediaResolver;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const item = list[index];
  const media = useMemo(() => (item ? orderedMedia(item) : []), [item]);
  const [slide, setSlide] = useState(0);

  // reset carousel slide whenever the post changes
  useEffect(() => { setSlide(0); }, [item?.id]);

  // keyboard nav: esc closes, arrows move between posts.
  // Capture phase + stopImmediatePropagation so Escape closes only this
  // modal, not the outer phone modal underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
      else if (e.key === 'ArrowRight' && index < list.length - 1) onIndex(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, list.length, onClose, onIndex]);

  if (!item) return null;

  const tall = item.format === 'REEL' || item.format === 'STORY';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      {/* prev / next between posts */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}
          className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block"
          aria-label={t('preview.prev', 'Sebelumnya')}
        ><ChevronLeft className="h-6 w-6" /></button>
      )}
      {index < list.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}
          className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block"
          aria-label={t('preview.next', 'Berikutnya')}
        ><ChevronRight className="h-6 w-6" /></button>
      )}

      <div
        className="flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-xl bg-white text-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--ig-blue' as string]: IG_BLUE }}
      >
        {/* header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Avatar profile={profile} size={32} ring />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold">{profile?.handle?.replace(/^@/, '') ?? 'monomi'}</div>
            <div className="truncate text-[11px] text-zinc-500">{scheduledLabel(item, t)}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* media — feed posts display 4:5 portrait, reels/stories 9:16 (2026) */}
        <div className={cn('relative w-full overflow-hidden bg-black', tall ? 'aspect-[9/16]' : 'aspect-[4/5]')}>
          {media.length > 0 ? (
            <div
              className="flex h-full w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {media.map((m) => {
                const url = resolve(m.type === 'VIDEO' && m.thumbnailUrl ? m.thumbnailUrl : m.url);
                return (
                  <div key={m.id} className="relative h-full w-full shrink-0 grow-0 basis-full bg-black">
                    <img src={url ?? undefined} alt="" className="h-full w-full object-contain"
                         onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                    {m.type === 'VIDEO' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/40 p-3"><Play className="h-7 w-7 fill-white text-white" /></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-300">
              <Camera className="h-8 w-8" />
              <span className="text-xs">{t('preview.noMedia', 'Belum ada media')}</span>
            </div>
          )}

          {/* carousel arrows + dots */}
          {media.length > 1 && (
            <>
              {slide > 0 && (
                <button onClick={() => setSlide((s) => s - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-zinc-800 shadow hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {slide < media.length - 1 && (
                <button onClick={() => setSlide((s) => s + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-zinc-800 shadow hover:bg-white">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                {slide + 1}/{media.length}
              </div>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {media.map((m, i) => (
                  <span key={m.id} className={cn('h-1.5 w-1.5 rounded-full', i === slide ? 'bg-[color:var(--ig-blue)]' : 'bg-white/60')} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* action row */}
        <div className="flex items-center gap-4 px-3 pt-2.5">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
          <Bookmark className="ml-auto h-6 w-6" />
        </div>

        {/* caption + meta (scrolls if long) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
          <p className="text-[13px] leading-snug">
            <span className="mr-1.5 font-semibold">{profile?.handle?.replace(/^@/, '') ?? 'monomi'}</span>
            <Caption text={item.caption ?? ''} />
          </p>

          {!readOnly && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2.5">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white', STATUS_TINT[item.status])}>
                {item.status}
              </span>
              {/* format switcher — lets you re-tag Feed / Reel / Story */}
              <div className="ml-auto inline-flex overflow-hidden rounded-md border border-zinc-200 text-[10px]">
                {(['FEED', 'REEL', 'STORY'] as ContentFormat[]).map((f) => (
                  <button
                    key={f}
                    disabled={formatPending || item.format === f}
                    onClick={() => onFormatChange(item, f)}
                    className={cn('px-2 py-1 transition-colors disabled:opacity-100',
                      item.format === f ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100')}
                  >{f === 'FEED' ? 'Feed' : f === 'REEL' ? 'Reel' : 'Story'}</button>
                ))}
              </div>
              <button
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
              ><Pencil className="h-3 w-3" /> {t('preview.edit', 'Edit')}</button>
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-1 text-red-500 hover:bg-red-50"
                  aria-label={t('preview.delete', 'Hapus')}
                ><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Story viewer (fullscreen, auto-advancing)                          */
/* ------------------------------------------------------------------ */

const STORY_MS = 5000;

function StoryViewer({
  stories, index, profile, onClose, onIndex, resolve, onEdit, onDelete,
}: {
  stories: ContentCalendarItem[];
  index: number;
  profile?: IgProfile;
  onClose: () => void;
  onIndex: (i: number) => void;
  resolve: MediaResolver;
  onEdit?: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
}) {
  const { t } = useTranslation();
  const item = stories[index];
  const cover = item ? coverMedia(item, resolve) : null;
  const startRef = useRef<number>(0);

  // auto-advance: next story, or close after the last one
  useEffect(() => {
    if (!item) return;
    startRef.current = Date.now();
    const timer = setTimeout(() => {
      if (index < stories.length - 1) onIndex(index + 1);
      else onClose();
    }, STORY_MS);
    return () => clearTimeout(timer);
  }, [index, item, stories.length, onClose, onIndex]);

  // Capture phase + stopImmediatePropagation so Escape closes only the story
  // viewer, not the outer phone modal underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
      else if (e.key === 'ArrowRight') index < stories.length - 1 ? onIndex(index + 1) : onClose();
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, stories.length, onClose, onIndex]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95">
      <div className="relative h-[92vh] max-h-[860px] w-full max-w-[420px] overflow-hidden rounded-xl bg-black">
        {/* progress bars */}
        <style>{`@keyframes igStoryFill{from{width:0%}to{width:100%}}`}</style>
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2">
          {stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                // Remount (key change) when a story becomes active so the fill
                // animation restarts from 0% and runs over the auto-advance window.
                style={
                  i < index
                    ? { width: '100%' }
                    : i === index
                      ? { width: '0%', animation: `igStoryFill ${STORY_MS}ms linear forwards` }
                      : { width: '0%' }
                }
                key={`${s.id}-${i === index ? index : 'idle'}`}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute left-0 right-0 top-3 z-20 flex items-center gap-2 px-3 pt-2 text-white">
          <Avatar profile={profile} size={28} ring />
          <span className="text-[13px] font-semibold">{profile?.handle?.replace(/^@/, '') ?? 'monomi'}</span>
          <span className="text-[12px] text-white/70">{scheduledLabel(item, t)}</span>
          {onEdit && (
            <button onClick={() => onEdit(item)} className="ml-auto rounded-full p-1 hover:bg-white/10" aria-label={t('preview.edit', 'Edit')}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(item)} className={cn('rounded-full p-1 text-rose-400 hover:bg-white/10', !onEdit && 'ml-auto')} aria-label={t('preview.delete', 'Hapus')}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className={cn('rounded-full p-1 hover:bg-white/10', !onEdit && !onDelete && 'ml-auto')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* media */}
        {cover ? (
          <img src={cover.url} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-500 p-8 text-center text-white">
            <Camera className="h-10 w-10" />
            <Caption text={item.caption ?? ''} className="text-lg font-medium" />
          </div>
        )}

        {/* caption strip */}
        {cover && item.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <Caption text={item.caption} className="text-sm" />
          </div>
        )}

        {/* tap zones */}
        <button aria-label={t('preview.prev', 'Sebelumnya')} className="absolute inset-y-0 left-0 z-10 w-1/3"
                onClick={() => index > 0 && onIndex(index - 1)} />
        <button aria-label={t('preview.next', 'Berikutnya')} className="absolute inset-y-0 right-0 z-10 w-2/3"
                onClick={() => (index < stories.length - 1 ? onIndex(index + 1) : onClose())} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar                                                             */
/* ------------------------------------------------------------------ */

function Avatar({ profile, size, ring }: { profile?: IgProfile; size: number; ring?: boolean }) {
  const letter = (profile?.companyName || profile?.handle || 'M').replace(/^@/, '').charAt(0).toUpperCase();
  const inner = (
    profile?.avatarUrl
      ? <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      : <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-700"
             style={{ fontSize: size * 0.42 }}>{letter}</div>
  );
  if (!ring) return <div style={{ width: size, height: size }}>{inner}</div>;
  return (
    <div style={{ width: size, height: size }}
         className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px]">
      <div className="h-full w-full rounded-full bg-white p-[2px]">{inner}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InstagramPhone — the device screen itself. Rendered small + inert  */
/*  as an inline launcher, or full-size + interactive inside the modal.*/
/* ------------------------------------------------------------------ */

function InstagramPhone({
  items, onEdit, onDelete, clientId, interactive = true, profileOverride, shareToken, highlightsOverride,
}: {
  items: ContentCalendarItem[];
  onEdit: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
  clientId: string;
  interactive?: boolean;
  profileOverride?: IgProfile;        // share mode: profile comes from the public payload
  shareToken?: string;                // share mode: resolve media via the public endpoint
  highlightsOverride?: StoryHighlight[]; // share mode: highlights from the public payload
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { mediaToken } = useMediaToken();
  const readOnly = !!shareToken;
  const resolve = useMemo<MediaResolver>(() => buildResolver(mediaToken, shareToken), [mediaToken, shareToken]);

  const { data: queriedProfile } = useQuery({
    queryKey: ['ig-profile', clientId],
    queryFn: () => contentCalendarService.getIgProfile(clientId),
    enabled: !profileOverride && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
  const profile = profileOverride ?? queriedProfile;

  const { data: queriedHighlights } = useQuery({
    queryKey: ['ig-highlights', clientId],
    queryFn: () => contentCalendarService.listHighlights(clientId),
    enabled: !highlightsOverride && !!clientId,
    staleTime: 60 * 1000,
  });
  const highlights = highlightsOverride ?? queriedHighlights ?? [];
  const [highlightView, setHighlightView] = useState<{ items: ContentCalendarItem[]; index: number } | null>(null);

  // Only Instagram-targeted content belongs in the Instagram preview.
  const igItems = useMemo(
    () => items.filter((i) => i.platforms?.includes('INSTAGRAM')),
    [items],
  );
  const gridSource = useMemo(() => igItems.filter((i) => i.format !== 'STORY'), [igItems]);
  const reelItems = useMemo(() => sortForGrid(igItems.filter((i) => i.format === 'REEL')), [igItems]);
  const storyItems = useMemo(() => sortForGrid(igItems.filter((i) => i.format === 'STORY')), [igItems]);

  const sortedGrid = useMemo(() => sortForGrid(gridSource), [gridSource]);
  const byId = useMemo(() => new Map(igItems.map((i) => [i.id, i])), [igItems]);

  // local override for optimistic drag order; cleared when server data changes
  const [localIds, setLocalIds] = useState<string[] | null>(null);
  const sortedKey = sortedGrid.map((i) => i.id).join(',');
  useEffect(() => { setLocalIds(null); }, [sortedKey]);
  const displayGrid = localIds
    ? localIds.map((id) => byId.get(id)).filter(Boolean) as ContentCalendarItem[]
    : sortedGrid;

  const [tab, setTab] = useState<'grid' | 'reels'>('grid');
  const [rearrange, setRearrange] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  const activeList = tab === 'grid' ? displayGrid : reelItems;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const reorderMutation = useMutation({
    mutationFn: (payload: { id: string; gridOrder: number }[]) => contentCalendarService.reorder(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-calendar-v2'] }),
    onError: () => { setLocalIds(null); toast.error(t('preview.reorderFailed', 'Gagal menyimpan urutan grid.')); },
  });

  const formatMutation = useMutation({
    mutationFn: ({ id, format }: { id: string; format: ContentFormat }) =>
      contentCalendarService.updateContent(id, { format }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('preview.formatUpdated', 'Format konten diperbarui.'));
    },
    onError: () => toast.error(t('preview.formatFailed', 'Gagal memperbarui format.')),
  });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = displayGrid.map((i) => i.id);
    const oldI = ids.indexOf(String(active.id));
    const newI = ids.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const newIds = arrayMove(ids, oldI, newI);
    setLocalIds(newIds);
    reorderMutation.mutate(newIds.map((id, idx) => ({ id, gridOrder: idx })));
  }

  function handleFormatChange(item: ContentCalendarItem, format: ContentFormat) {
    if (item.format === format) return;
    formatMutation.mutate({ id: item.id, format });
    setOpenIndex(null); // item leaves/joins lists; close to avoid index drift
  }

  const empty = igItems.length === 0;

  return (
    <>
      <div className="bg-white" style={{ ['--ig-blue' as string]: IG_BLUE }}>
          {/* status bar */}
          <div className="flex items-center justify-between bg-white px-5 pt-3 text-[11px] font-semibold text-zinc-900">
            <span>9:41</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500">Preview</span>
            <span className="tabular-nums">100%</span>
          </div>

          {/* profile header — tapping the avatar plays ALL planned stories in
              sequence (like Instagram active stories), so a 30-day plan with
              30 stories scales without cluttering the UI. */}
          <div className="px-4 pb-3 pt-3 text-zinc-900">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => storyItems.length && setStoryIndex(0)}
                disabled={!storyItems.length}
                aria-label={storyItems.length ? t('preview.playStories', 'Putar {{n}} story', { n: storyItems.length }) : undefined}
                className={cn('relative shrink-0', storyItems.length ? 'cursor-pointer' : 'cursor-default')}
              >
                <Avatar profile={profile} size={76} ring={storyItems.length > 0} />
                {storyItems.length > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ring-2 ring-white"
                        style={{ background: IG_BLUE }}>
                    {storyItems.length}
                  </span>
                )}
              </button>
              <div className="flex flex-1 justify-around text-center">
                <Stat n={profile?.postCount ?? gridSource.length} label={t('preview.posts', 'kiriman')} />
                <Stat n="—" label={t('preview.followers', 'pengikut')} />
                <Stat n="—" label={t('preview.following', 'diikuti')} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[14px] font-semibold">{profile?.companyName ?? 'Monomi Agency'}</div>
              {profile?.bio && <div className="whitespace-pre-line text-[13px] leading-snug text-zinc-700">{profile.bio}</div>}
              <div className="mt-0.5 text-[12px] text-zinc-400">{profile?.handle ?? '@monomi'}</div>
            </div>

            {/* action row — visual placeholders mirroring the real profile chrome
                (Instagram shows Follow / Message here). Inert by design: this is a
                planning preview, not a live account. */}
            <div className="mt-3 flex items-center gap-1.5">
              <span className="flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold text-white" style={{ background: IG_BLUE }}>
                {t('preview.follow', 'Ikuti')}
              </span>
              <span className="flex-1 rounded-lg bg-zinc-100 py-1.5 text-center text-[13px] font-semibold text-zinc-900">
                {t('preview.message', 'Pesan')}
              </span>
              <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[13px] font-semibold text-zinc-900">▾</span>
            </div>
          </div>

          {/* story highlights — gray-ringed circles (distinct from the story
              ring on the avatar); tap to play that highlight's media. */}
          {highlights.length > 0 && (
            <div className="flex gap-4 overflow-x-auto px-4 pb-3 pt-1">
              {highlights.map((h) => {
                const cover = resolve(h.coverUrl ?? h.media?.[0]?.url);
                return (
                  <button
                    key={h.id}
                    onClick={() => setHighlightView({ items: highlightToItems(h), index: 0 })}
                    className="flex w-16 shrink-0 flex-col items-center gap-1"
                  >
                    <span className="rounded-full border border-zinc-300 p-[3px]">
                      {cover
                        ? <img src={cover} alt="" className="h-14 w-14 rounded-full object-cover" />
                        : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100"><Camera className="h-5 w-5 text-zinc-400" /></span>}
                    </span>
                    <span className="w-full truncate text-center text-[10px] text-zinc-700">{h.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* tab bar */}
          <div className="flex border-t border-zinc-200 text-zinc-400">
            <button onClick={() => setTab('grid')}
                    className={cn('flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold',
                      tab === 'grid' ? 'border-t-2 border-zinc-900 text-zinc-900' : 'hover:text-zinc-600')}>
              <Grid3x3 className="h-4 w-4" /> {t('preview.tabGrid', 'KISI')}
            </button>
            <button onClick={() => setTab('reels')}
                    className={cn('flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold',
                      tab === 'reels' ? 'border-t-2 border-zinc-900 text-zinc-900' : 'hover:text-zinc-600')}>
              <Film className="h-4 w-4" /> {t('preview.tabReels', 'REELS')}
            </button>
          </div>

          {/* rearrange toggle (grid tab only) */}
          {interactive && !readOnly && tab === 'grid' && displayGrid.length > 1 && (
            <div className="flex items-center justify-between bg-zinc-50 px-4 py-1.5 text-[11px]">
              <span className="text-zinc-500">{rearrange ? t('preview.dragHint', 'Seret untuk menata ulang kisi') : t('preview.feedLayout', 'Tata letak feed')}</span>
              <button onClick={() => setRearrange((v) => !v)}
                      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
                        rearrange ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-100')}>
                <GripVertical className="h-3.5 w-3.5" /> {rearrange ? t('preview.done', 'Selesai') : t('preview.rearrange', 'Atur ulang')}
              </button>
            </div>
          )}

          {/* body */}
          {empty ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-zinc-500">
              <div className="rounded-full border-2 border-zinc-300 p-4"><Camera className="h-7 w-7 text-zinc-400" /></div>
              <p className="text-[13px] font-medium text-zinc-700">{t('preview.igEmptyTitle', 'Belum ada konten Instagram')}</p>
              <p className="text-[12px] text-zinc-400">{t('preview.igEmptyDesc', 'Tandai konten dengan platform Instagram untuk melihatnya di sini.')}</p>
            </div>
          ) : tab === 'grid' ? (
            displayGrid.length === 0 ? (
              <EmptyTab label={t('preview.noFeed', 'Belum ada kiriman feed.')} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={displayGrid.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-[3px] bg-white p-[3px]">
                    {displayGrid.map((item, i) => (
                      <GridTile key={item.id} item={item} rearrange={rearrange} resolve={resolve}
                                onOpen={() => { setTab('grid'); setOpenIndex(i); }} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )
          ) : reelItems.length === 0 ? (
            <EmptyTab label={t('preview.noReels', 'Belum ada Reels.')} />
          ) : (
            <div className="grid grid-cols-3 gap-[3px] bg-white p-[3px]">
              {reelItems.map((item, i) => (
                <button key={item.id} onClick={() => setOpenIndex(i)}
                        className="group relative aspect-[9/16] overflow-hidden bg-zinc-100">
                  <TileCover item={item} reel resolve={resolve} />
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white drop-shadow">
                    <Play className="h-3 w-3 fill-white" />
                    <span className="text-[10px] font-medium">—</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      {openIndex !== null && activeList[openIndex] && (
        <PostModal
          list={activeList}
          index={openIndex}
          profile={profile}
          onClose={() => setOpenIndex(null)}
          onIndex={setOpenIndex}
          onEdit={(it) => { setOpenIndex(null); onEdit(it); }}
          onDelete={!readOnly && onDelete ? (it) => { setOpenIndex(null); onDelete(it); } : undefined}
          onFormatChange={handleFormatChange}
          formatPending={formatMutation.isPending}
          resolve={resolve}
          readOnly={readOnly}
        />
      )}

      {highlightView && highlightView.items[highlightView.index] && (
        <StoryViewer
          stories={highlightView.items}
          index={highlightView.index}
          profile={profile}
          onClose={() => setHighlightView(null)}
          onIndex={(i) => setHighlightView((v) => (v ? { ...v, index: i } : v))}
          resolve={resolve}
        />
      )}

      {storyIndex !== null && storyItems[storyIndex] && (
        <StoryViewer
          stories={storyItems}
          index={storyIndex}
          profile={profile}
          onClose={() => setStoryIndex(null)}
          onIndex={setStoryIndex}
          resolve={resolve}
          onEdit={!readOnly ? (it) => { setStoryIndex(null); onEdit(it); } : undefined}
          onDelete={!readOnly && onDelete ? (it) => { setStoryIndex(null); onDelete(it); } : undefined}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  InstagramPreview — inline launcher + full-screen phone modal       */
/* ------------------------------------------------------------------ */

export default function InstagramPreview({
  items, onEdit, onDelete, clientId, profile, shareToken, highlights,
}: {
  items: ContentCalendarItem[];
  onEdit: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
  clientId: string;
  profile?: IgProfile;     // share mode: profile from the public payload
  shareToken?: string;     // share mode: resolve media via the public endpoint
  highlights?: StoryHighlight[]; // share mode: highlights from the public payload
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Escape closes the full-screen preview.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex justify-center px-3 py-8">
      {/* inline launcher — a tappable phone card */}
      <div className="w-full max-w-[300px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('preview.openIg', 'Buka pratinjau Instagram')}
          className="group relative block w-full overflow-hidden rounded-[28px] border border-border-subtle bg-white text-left shadow-xl transition-transform hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <div className="pointer-events-none max-h-[360px] overflow-hidden">
            <InstagramPhone items={items} onEdit={onEdit} onDelete={onDelete} clientId={clientId} interactive={false} profileOverride={profile} shareToken={shareToken} highlightsOverride={highlights} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-[12px] font-medium text-zinc-900 shadow-lg ring-1 ring-black/5 transition group-hover:bg-white">
              <Maximize2 className="h-3.5 w-3.5" /> {t('preview.openPhone', 'Buka pratinjau ponsel')}
            </span>
          </div>
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </button>
        <p className="mt-3 px-2 text-center text-[11px] text-text-tertiary">
          {t('preview.visualNote', 'Pratinjau visual — klik untuk membuka tampilan ponsel penuh.')}
        </p>
      </div>

      {/* full-screen phone modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" /> {t('preview.close', 'Tutup')}
          </button>

          {/* device */}
          <div
            className="relative flex h-[92vh] max-h-[900px] w-full max-w-[412px] flex-col overflow-hidden rounded-[44px] border-[10px] border-zinc-900 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InstagramPhone
                items={items}
                onEdit={(it) => { setOpen(false); onEdit(it); }}
                onDelete={onDelete}
                clientId={clientId}
                interactive
                profileOverride={profile}
                shareToken={shareToken}
                highlightsOverride={highlights}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[15px] font-semibold tabular-nums">{n}</div>
      <div className="text-[12px] text-zinc-500">{label}</div>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center text-zinc-400">
      <Rocket className="h-6 w-6" />
      <p className="text-[12px]">{label}</p>
    </div>
  );
}
