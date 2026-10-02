/* ------------------------------------------------------------------ */
/*  TikTokPreview — a faithful, visual-only mock of the TikTok app      */
/*  rendered from planned content-calendar items (filtered to the       */
/*  TIKTOK platform). Per-client profile. Surfaces: dark profile +      */
/*  3-column portrait video grid, and a full-screen 9:16 player with    */
/*  the right action rail, caption and music ticker. Single media = a   */
/*  video; multiple media = a Photo Mode carousel.                      */
/*                                                                       */
/*  Nothing here publishes to TikTok. The phone is rendered in TikTok's  */
/*  dark theme so it reads as the real app inside the app's chrome.      */
/* ------------------------------------------------------------------ */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart, MessageCircle, Bookmark, Share2, Music2, Plus, X,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play,
  Pencil, Camera, Maximize2, Trash2, Bell, Send, UserPlus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import contentCalendarService, {
  type ContentCalendarItem,
  type IgProfile,
} from '@/services/content-calendar';
import { useMediaToken } from '@/hooks/useMediaToken';
import { extractR2Key } from '@/utils/mediaProxy';
import { contentShareMediaUrl } from '@/utils/contentShareMedia';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/initials';

const TIKTOK_RED = '#FE2C55';

/** Scale a pt size (designed at 390pt width) to the phone's own width, so the
 *  small launcher card and the full modal keep identical proportions. */
const u = (pt: number) => `${((pt / 390) * 100).toFixed(3)}cqw`;

type TFunc = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

/* ----- shared media helpers (self-contained to keep this isolated) ----- */

// authed mode → /media/view with the media token; share mode → the public
// per-client endpoint (no login). Both same-origin (work in dev + prod).
type MediaResolver = (url: string | null | undefined) => string | null;

function buildResolver(token?: string | null, shareToken?: string): MediaResolver {
  return (url) => {
    if (!url) return null;
    if (url.includes('/api/v1/media/proxy/') || url.includes('.r2.cloudflarestorage.com')) {
      const key = extractR2Key(url);
      if (key && shareToken) return contentShareMediaUrl(shareToken, key);
      if (key && token) return `/api/v1/media/view/${key}?mt=${encodeURIComponent(token)}`;
      return url;
    }
    return url;
  };
}

interface DisplayMedia { url: string; isVideo: boolean }

function coverMedia(item: ContentCalendarItem, resolve: MediaResolver): DisplayMedia | null {
  const m = item.media?.[0];
  if (!m) return null;
  const isVideo = m.type === 'VIDEO';
  const url = resolve(isVideo && m.thumbnailUrl ? m.thumbnailUrl : m.url);
  return url ? { url, isVideo } : null;
}

function orderedMedia(item: ContentCalendarItem) {
  return [...(item.media ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** TikTok grids are chronological (newest first); no manual reordering. */
function sortByRecent(items: ContentCalendarItem[]): ContentCalendarItem[] {
  return [...items].sort((a, b) => {
    const ad = a.scheduledAt ? +new Date(a.scheduledAt) : +new Date(a.createdAt);
    const bd = b.scheduledAt ? +new Date(b.scheduledAt) : +new Date(b.createdAt);
    return bd - ad;
  });
}

function scheduledLabel(item: ContentCalendarItem, t: TFunc, locale = 'id-ID'): string {
  const d = item.scheduledAt ? new Date(item.scheduledAt) : null;
  if (!d || Number.isNaN(d.getTime())) return t('preview.noSchedule', 'Tanpa jadwal');
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Caption with #hashtags and @mentions styled like TikTok (white-bold). */
function Caption({ text, className }: { text: string; className?: string }) {
  const parts = (text ?? '').split(/(\s+)/);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^[#@][\wÀ-ÿ.]+/.test(p)
          ? <span key={i} className="font-semibold text-white">{p}</span>
          : <span key={i}>{p}</span>,
      )}
    </span>
  );
}

const STATUS_TINT: Record<ContentCalendarItem['status'], string> = {
  DRAFT: 'bg-zinc-500',
  SCHEDULED: 'bg-sky-500',
  PUBLISHED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
  ARCHIVED: 'bg-zinc-400',
};

/* ------------------------------------------------------------------ */
/*  Avatar                                                             */
/* ------------------------------------------------------------------ */

function Avatar({ profile, size, fluid }: { profile?: IgProfile; size: number; fluid?: boolean }) {
  const letter = getInitials(profile?.companyName || profile?.handle?.replace(/^@/, ''), { fallback: 'T' });
  // fluid: fill the parent (which is sized in container units) instead of fixed px
  const box = fluid ? { width: '100%', height: '100%' } : { width: size, height: size };
  return profile?.avatarUrl ? (
    <img src={profile.avatarUrl} alt="" style={box} className="rounded-full object-cover" />
  ) : (
    <div style={{ ...box, fontSize: fluid ? u(96 * 0.42) : size * 0.42 }}
         className="flex items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-200">
      {letter}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid tile                                                          */
/* ------------------------------------------------------------------ */

function GridTile({ item, resolve, onOpen }: { item: ContentCalendarItem; resolve: MediaResolver; onOpen: () => void }) {
  const { t } = useTranslation();
  const cover = coverMedia(item, resolve);
  const isPhoto = (item.media?.length ?? 0) > 1;
  return (
    <button
      type="button"
      onClick={onOpen}
      // 2026 TikTok profile grid cells are 3:4 portrait covers.
      className="group relative aspect-[3/4] overflow-hidden bg-zinc-200"
    >
      {cover ? (
        <img src={cover.url} alt="" loading="lazy"
             className="absolute inset-0 h-full w-full object-cover"
             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-200 to-zinc-300 p-2 text-center">
          <Camera className="h-5 w-5 text-zinc-500" />
          <span className="line-clamp-3 text-[10px] leading-tight text-zinc-600">{item.caption?.slice(0, 50) || t('preview.noMediaShort', 'Tanpa media')}</span>
        </div>
      )}
      {/* play + view count (bottom-left), like the real app */}
      <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
        <Play className="h-3 w-3 drop-shadow" />
        <span className="text-[11px] font-semibold">—</span>
      </div>
      {/* photo-mode indicator */}
      {isPhoto && (
        <span className="absolute right-1 top-1 rounded bg-black/55 px-1 text-[9px] font-medium text-white">
          {item.media!.length} 📷
        </span>
      )}
      {/* status dot — keeps the mock useful as a planner */}
      <span className={cn('absolute left-1 top-1 h-2 w-2 rounded-full ring-1 ring-black/40', STATUS_TINT[item.status])} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Player (full-screen vertical, right action rail)                  */
/* ------------------------------------------------------------------ */

function TikTokPlayer({
  list, index, profile, resolve, onClose, onIndex, onEdit, onDelete, readOnly,
}: {
  list: ContentCalendarItem[];
  index: number;
  profile?: IgProfile;
  resolve: MediaResolver;
  readOnly?: boolean;
  onClose: () => void;
  onIndex: (i: number) => void;
  onEdit: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
}) {
  const { t } = useTranslation();
  const item = list[index];
  const media = useMemo(() => (item ? orderedMedia(item) : []), [item]);
  const [slide, setSlide] = useState(0);
  useEffect(() => { setSlide(0); }, [item?.id]);

  // Capture phase + stopImmediatePropagation so Escape closes only the player,
  // not the outer phone modal underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && index < list.length - 1) onIndex(index + 1);
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, list.length, onClose, onIndex]);

  if (!item) return null;
  const handle = profile?.handle?.replace(/^@/, '') || profile?.companyName || '';
  const isPhoto = media.length > 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3">
      {/* prev / next between posts (TikTok swipes vertically) */}
      {index > 0 && (
        <button onClick={() => onIndex(index - 1)} aria-label={t('preview.prev', 'Sebelumnya')}
                className="absolute right-6 top-1/2 hidden -translate-y-[140%] rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
      {index < list.length - 1 && (
        <button onClick={() => onIndex(index + 1)} aria-label={t('preview.next', 'Berikutnya')}
                className="absolute right-6 top-1/2 hidden translate-y-[60%] rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      <div className="relative h-[92vh] max-h-[860px] w-full max-w-[420px] overflow-hidden rounded-xl bg-black"
           style={{ ['--tt-red' as string]: TIKTOK_RED }}>
        {/* media (9:16) */}
        {media.length > 0 ? (
          <div className="flex h-full w-full transition-transform duration-300 ease-out"
               style={{ transform: `translateX(-${slide * 100}%)` }}>
            {media.map((m) => {
              const url = resolve(m.type === 'VIDEO' && m.thumbnailUrl ? m.thumbnailUrl : m.url);
              return (
                <div key={m.id} className="relative h-full w-full shrink-0 grow-0 basis-full bg-black">
                  <img src={url ?? undefined} alt="" className="h-full w-full object-cover"
                       onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                  {m.type === 'VIDEO' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/30 p-4"><Play className="h-9 w-9 fill-white/90 text-white/90" /></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-black text-zinc-400">
            <Camera className="h-8 w-8" />
            <span className="text-xs">{t('preview.noMedia', 'Belum ada media')}</span>
          </div>
        )}

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 text-white">
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-4 text-[14px] font-semibold">
            <span className="text-white/60">{t('preview.tt.followingTab', 'Mengikuti')}</span>
            <span className="border-b-2 border-white pb-0.5">{t('preview.tt.forYou', 'Untuk Anda')}</span>
          </div>
          {readOnly ? (
            <span className="w-6" />
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(item)} className="rounded-full p-1 hover:bg-white/10" aria-label={t('preview.edit', 'Edit')}>
                <Pencil className="h-4 w-4" />
              </button>
              {onDelete && (
                <button onClick={() => onDelete(item)} className="rounded-full p-1 text-rose-400 hover:bg-white/10" aria-label={t('preview.delete', 'Hapus')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* photo-mode carousel controls */}
        {isPhoto && (
          <>
            {slide > 0 && (
              <button onClick={() => setSlide((s) => s - 1)}
                      className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-1 text-white hover:bg-white/25">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {slide < media.length - 1 && (
              <button onClick={() => setSlide((s) => s + 1)}
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-1 text-white hover:bg-white/25">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <div className="absolute left-1/2 top-12 z-20 flex -translate-x-1/2 gap-1">
              {media.map((m, i) => (
                <span key={m.id} className={cn('h-1 rounded-full transition-all', i === slide ? 'w-4 bg-white' : 'w-1.5 bg-white/50')} />
              ))}
            </div>
          </>
        )}

        {/* right action rail */}
        <div className="absolute bottom-24 right-2 z-20 flex flex-col items-center gap-4 text-white">
          <div className="relative mb-1">
            <Avatar profile={profile} size={44} />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full p-0.5" style={{ background: TIKTOK_RED }}>
              <Plus className="h-3 w-3 text-white" />
            </span>
          </div>
          <RailIcon icon={<Heart className="h-7 w-7" />} label="—" />
          <RailIcon icon={<MessageCircle className="h-7 w-7" />} label="—" />
          <RailIcon icon={<Bookmark className="h-7 w-7" />} label="—" />
          <RailIcon icon={<Share2 className="h-7 w-7" />} label="—" />
          <div className="mt-1 h-9 w-9 animate-[spin_4s_linear_infinite] rounded-full border border-white/20 bg-gradient-to-br from-zinc-700 to-black p-2">
            <Music2 className="h-full w-full" />
          </div>
        </div>

        {/* bottom caption + music ticker */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 pr-16 pb-5 text-white">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[15px] font-bold">{profile?.handle ? `@${handle}` : handle}</span>
            <span className="text-[11px] text-white/60">· {scheduledLabel(item, t)}</span>
          </div>
          <p className="text-[13px] leading-snug"><Caption text={item.caption ?? ''} /></p>
          <div className="mt-2 flex items-center gap-1.5 text-[12px]">
            <Music2 className="h-3.5 w-3.5" />
            <span className="truncate">{t('preview.tt.originalSound', 'suara asli')} - {handle}</span>
          </div>
          <div className="mt-1.5">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_TINT[item.status])}>
              {item.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 drop-shadow">
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TikTokPhone — the device screen                                   */
/* ------------------------------------------------------------------ */

function TikTokPhone({
  items, onEdit, onDelete, clientId, interactive = true, profileOverride, shareToken,
}: {
  items: ContentCalendarItem[];
  onEdit: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
  clientId: string;
  interactive?: boolean;
  profileOverride?: IgProfile;
  shareToken?: string;
}) {
  const { t } = useTranslation();
  const { mediaToken } = useMediaToken();
  const readOnly = !!shareToken;
  const resolve = useMemo<MediaResolver>(() => buildResolver(mediaToken, shareToken), [mediaToken, shareToken]);
  const { data: queriedProfile } = useQuery({
    queryKey: ['tiktok-profile', clientId],
    queryFn: () => contentCalendarService.getSocialProfile(clientId, 'TIKTOK'),
    enabled: !profileOverride && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
  const profile = profileOverride ?? queriedProfile;

  const tkItems = useMemo(() => items.filter((i) => i.platforms?.includes('TIKTOK')), [items]);
  const grid = useMemo(() => sortByRecent(tkItems), [tkItems]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const empty = grid.length === 0;

  return (
    <>
      <div className="bg-white text-black" style={{ containerType: 'inline-size' }}>
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-semibold text-black">
          <span>9:41</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500">Preview</span>
          <span className="tabular-nums">100%</span>
        </div>

        {/* top bar: back, bell + share */}
        <div className="flex items-center justify-between" style={{ padding: `${u(10)} ${u(16)} 0` }}>
          <ChevronLeft style={{ width: u(24), height: u(24) }} />
          <div className="flex items-center" style={{ gap: u(18) }}>
            <Bell style={{ width: u(22), height: u(22) }} />
            <Share2 style={{ width: u(22), height: u(22) }} />
          </div>
        </div>

        {/* profile header (Sept 2026 layout): name + username left, photo right */}
        <div style={{ padding: `${u(8)} ${u(16)} 0` }}>
          <div className="flex items-start justify-between" style={{ gap: u(12) }}>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-3 break-words font-bold leading-[1.1]" style={{ fontSize: u(34) }}>
                {profile?.companyName || profile?.handle?.replace(/^@/, '') || ''}
              </div>
              {profile?.handle && (
                <div className="truncate text-zinc-500" style={{ fontSize: u(16), marginTop: u(4) }}>
                  {profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`}
                </div>
              )}
            </div>
            <div className="shrink-0" style={{ width: u(96), height: u(96) }}>
              <Avatar profile={profile} size={96} fluid />
            </div>
          </div>

          <div className="flex items-start" style={{ gap: u(24), marginTop: u(14) }}>
            <Stat n="—" label={t('preview.tt.following', 'Mengikuti')} />
            <Stat n="—" label={t('preview.tt.followers', 'Pengikut')} />
            <Stat n="—" label={t('preview.tt.likes', 'Suka')} />
          </div>

          <div className="flex items-center" style={{ gap: u(8), marginTop: u(16) }}>
            <span className="flex-1 rounded-full text-center font-bold text-white"
                  style={{ background: TIKTOK_RED, height: u(40), lineHeight: u(40), fontSize: u(16) }}>
              {t('preview.tt.follow', 'Ikuti')}
            </span>
            <span className="flex shrink-0 items-center justify-center rounded-full bg-zinc-100" style={{ width: u(40), height: u(40) }}>
              <Send style={{ width: u(18), height: u(18) }} />
            </span>
            <span className="flex shrink-0 items-center justify-center rounded-full bg-zinc-100" style={{ width: u(40), height: u(40) }}>
              <UserPlus style={{ width: u(18), height: u(18) }} />
            </span>
          </div>

          {profile?.bio && (
            <p className="whitespace-pre-line leading-snug text-black" style={{ fontSize: u(16), marginTop: u(14) }}>{profile.bio}</p>
          )}
        </div>

        {/* single grid tab with dropdown caret, centered 48pt underline */}
        <div className="flex justify-center" style={{ marginTop: u(14) }}>
          <div className="flex items-center justify-center border-b-2 border-black" style={{ width: u(48), paddingBottom: u(8), gap: u(3) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
                 style={{ width: u(22), height: u(22) }} aria-hidden="true">
              <path d="M7 5v14M12 5v14M17 5v14" />
            </svg>
            <ChevronDown style={{ width: u(10), height: u(10) }} strokeWidth={3} />
          </div>
        </div>
        <div className="border-t border-zinc-200" />

        {/* grid */}
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-zinc-500">
            <div className="rounded-full border-2 border-zinc-300 p-4"><Camera className="h-7 w-7 text-zinc-400" /></div>
            <p className="text-[13px] font-medium text-zinc-700">{t('preview.tt.emptyTitle', 'Belum ada konten TikTok')}</p>
            <p className="text-[12px] text-zinc-500">{t('preview.tt.emptyDesc', 'Tandai konten dengan platform TikTok untuk melihatnya di sini.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 bg-white" style={{ gap: u(2) }}>
            {grid.map((item, i) => (
              <GridTile key={item.id} item={item} resolve={resolve}
                        onOpen={() => interactive && setOpenIndex(i)} />
            ))}
          </div>
        )}
      </div>

      {interactive && openIndex !== null && grid[openIndex] && (
        <TikTokPlayer
          list={grid}
          index={openIndex}
          profile={profile}
          resolve={resolve}
          readOnly={readOnly}
          onClose={() => setOpenIndex(null)}
          onIndex={setOpenIndex}
          onEdit={(it) => { setOpenIndex(null); onEdit(it); }}
          onDelete={!readOnly && onDelete ? (it) => { setOpenIndex(null); onDelete(it); } : undefined}
        />
      )}
    </>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="leading-tight">
      <div className="font-bold tabular-nums" style={{ fontSize: u(20) }}>{n}</div>
      <div className="text-zinc-500" style={{ fontSize: u(15) }}>{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TikTokPreview — inline launcher + full-screen phone modal          */
/* ------------------------------------------------------------------ */

export default function TikTokPreview({
  items, onEdit, onDelete, clientId, profile, shareToken,
}: {
  items: ContentCalendarItem[];
  onEdit: (item: ContentCalendarItem) => void;
  onDelete?: (item: ContentCalendarItem) => void;
  clientId: string;
  profile?: IgProfile;
  shareToken?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex justify-center px-3 py-8">
      {/* inline launcher — a tappable dark phone card */}
      <div className="w-full max-w-[300px]">
        {/* Sibling overlay button: the phone mock has its own buttons (no nesting). */}
        <div className="group relative block w-full overflow-hidden rounded-[28px] border border-border-subtle bg-white text-left shadow-xl transition-transform hover:-translate-y-0.5 hover:shadow-2xl">
          <div className="pointer-events-none max-h-[360px] overflow-hidden" aria-hidden="true" inert>
            <TikTokPhone items={items} onEdit={onEdit} onDelete={onDelete} clientId={clientId} interactive={false} profileOverride={profile} shareToken={shareToken} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-white shadow-lg" style={{ background: TIKTOK_RED }}>
              <Maximize2 className="h-3.5 w-3.5" /> {t('preview.openTiktok', 'Buka pratinjau TikTok')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('preview.openTiktok', 'Buka pratinjau TikTok')}
            className="absolute inset-0 z-10 rounded-[28px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          />
        </div>
        <p className="mt-3 px-2 text-center text-[11px] text-text-tertiary">
          {t('preview.visualNote', 'Pratinjau visual — klik untuk membuka tampilan ponsel penuh.')}
        </p>
      </div>

      {/* full-screen phone modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
            <X className="h-4 w-4" /> {t('preview.close', 'Tutup')}
          </button>
          <div className="relative flex h-[92vh] max-h-[900px] w-full max-w-[412px] flex-col overflow-hidden rounded-[44px] border-[10px] border-zinc-900 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TikTokPhone items={items} onEdit={(it) => { setOpen(false); onEdit(it); }} onDelete={onDelete} clientId={clientId} interactive profileOverride={profile} shareToken={shareToken} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
