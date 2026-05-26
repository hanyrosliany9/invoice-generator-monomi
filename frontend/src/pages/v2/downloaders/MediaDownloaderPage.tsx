import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Download, Clipboard, Loader2, CheckCircle2, XCircle, Film,
  Image as ImageIcon, Music, Link2, AlertTriangle, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';

import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  mediaDownloaderService,
  type MediaInfo,
  type PlatformDetection,
  type VideoQuality,
} from '@/services/mediaDownloaderService';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — same vocabulary as every other v2 list page, plus a   */
/*  single "Unduhan" entry that owns both downloader tools so the      */
/*  sidebar doesn't sprout one-off leaves for each platform.           */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Unduhan',    icon: <Download    className="h-4 w-4" />, href: '/v2/downloaders/media' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Local session history — the backend has no "completed downloads"   */
/*  endpoint for yt-dlp jobs (everything streams as blob and is gone), */
/*  so we keep a small in-session log. Persisting to localStorage is   */
/*  deferred — first pass keeps the surface honest about its memory.   */
/* ------------------------------------------------------------------ */

interface DownloadEntry {
  id: string;
  url: string;
  platform: string;
  title?: string;
  thumbnail?: string;
  quality: VideoQuality;
  audioOnly: boolean;
  status: 'success' | 'failed';
  errorMessage?: string;
  finishedAt: string;
}

const QUALITY_LABEL: Record<VideoQuality, string> = {
  best:  'Kualitas Terbaik',
  '1080p': '1080p (Full HD)',
  '720p':  '720p (HD)',
  '480p':  '480p',
  '360p':  '360p',
  worst: 'Kualitas Terendah',
  audio: 'Audio Saja (MP3)',
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube:   'YouTube',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  twitter:   'Twitter / X',
  facebook:  'Facebook',
  vimeo:     'Vimeo',
  pinterest: 'Pinterest',
  unknown:   'Tidak dikenal',
};

const formatPlatform = (p?: string | null) =>
  PLATFORM_LABEL[(p ?? 'unknown').toLowerCase()] ?? (p ?? 'Tidak dikenal');

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '—';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024)          return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const formatRelative = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MediaDownloaderPageV2() {
  const user = useAuthStore((s) => s.user);

  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState<VideoQuality>('best');
  const [audioOnly, setAudioOnly] = useState(false);
  const [history, setHistory] = useState<DownloadEntry[]>([]);
  const [downloading, setDownloading] = useState(false);

  const debouncedUrl = useDebouncedValue(url.trim(), 600);

  /* ---- platform detection on debounced URL ---- */
  const { data: platform, isFetching: detecting } = useQuery<PlatformDetection | null>({
    queryKey: ['media-downloader', 'detect', debouncedUrl],
    queryFn: () => mediaDownloaderService.detectPlatform(debouncedUrl),
    enabled: debouncedUrl.length >= 10,
    retry: false,
    staleTime: 60_000,
  });

  /* ---- media info preview (only for supported, non-pinterest) ---- */
  const { data: mediaInfo, isFetching: loadingInfo } = useQuery<MediaInfo | null>({
    queryKey: ['media-downloader', 'info', debouncedUrl],
    queryFn: () => mediaDownloaderService.getMediaInfo(debouncedUrl),
    enabled:
      debouncedUrl.length >= 10
      && !!platform?.isSupported
      && platform.platform !== 'pinterest',
    retry: false,
    staleTime: 60_000,
  });

  /* ---- download mutation ---- */
  const downloadMutation = useMutation({
    mutationFn: () =>
      mediaDownloaderService.quickDownload({
        url: debouncedUrl,
        quality,
        audioOnly,
      }),
    onMutate: () => setDownloading(true),
    onSettled: () => setDownloading(false),
    onSuccess: () => {
      toast.success('Unduhan dimulai — periksa folder Downloads Anda.');
      const entry: DownloadEntry = {
        id: crypto.randomUUID(),
        url: debouncedUrl,
        platform: platform?.platform ?? 'unknown',
        title: mediaInfo?.title,
        thumbnail: mediaInfo?.thumbnail,
        quality,
        audioOnly,
        status: 'success',
        finishedAt: new Date().toISOString(),
      };
      setHistory((h) => [entry, ...h].slice(0, 25));
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? 'Unduhan gagal.';
      toast.error(message);
      const entry: DownloadEntry = {
        id: crypto.randomUUID(),
        url: debouncedUrl,
        platform: platform?.platform ?? 'unknown',
        quality,
        audioOnly,
        status: 'failed',
        errorMessage: message,
        finishedAt: new Date().toISOString(),
      };
      setHistory((h) => [entry, ...h].slice(0, 25));
    },
  });

  /* ---- paste-from-clipboard convenience ---- */
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        toast.success('URL ditempel dari clipboard.');
      } else {
        toast.info('Clipboard kosong.');
      }
    } catch {
      toast.error('Tidak bisa membaca clipboard. Tempel manual saja.');
    }
  }, []);

  /* ---- quality options: adapt to detected formats when present ---- */
  const qualityOptions = useMemo<{ value: VideoQuality; label: string }[]>(() => {
    const fromInfo: VideoQuality[] = (mediaInfo?.availableQualities ?? [])
      .map((q) => q.toLowerCase())
      .filter((q): q is VideoQuality => q in QUALITY_LABEL);

    const base: VideoQuality[] = ['best', '1080p', '720p', '480p', '360p', 'audio'];
    const source: VideoQuality[] = fromInfo.length ? fromInfo : base;
    const seen = new Set<VideoQuality>();
    const merged: VideoQuality[] = [];
    for (const q of [...source, 'audio' as VideoQuality]) {
      if (!seen.has(q)) { seen.add(q); merged.push(q); }
    }
    return merged.map((v) => ({ value: v, label: QUALITY_LABEL[v] }));
  }, [mediaInfo]);

  /* ---- KPIs ---- */
  const stats = useMemo(() => {
    const total = history.length;
    const success = history.filter((h) => h.status === 'success').length;
    const failed  = total - success;
    const rate    = total === 0 ? null : Math.round((success / total) * 100);
    return { total, success, failed, rate };
  }, [history]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ---- derived state for the action button ---- */
  const platformSupported = !!platform?.isSupported;
  const isPinterest = platform?.platform === 'pinterest';
  const canDownload =
    debouncedUrl.length >= 10
    && platformSupported
    && !isPinterest
    && !downloading;

  return (
    <Shell>
      <PageHeader
        title="Pengunduh Media"
        description="Tempel tautan dari YouTube, Instagram, TikTok, Twitter, Facebook, atau Vimeo. Kami mengurus formatnya — Anda terima file."
        actions={
          <Badge
            variant="outline"
            className="border-border-subtle text-text-tertiary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider"
          >
            6 platform didukung
          </Badge>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          Hero input — single tall panel. URL + paste sit on top, the
          options row stays understated below, and the CTA spans full
          width on mobile, snaps right on desktop. The platform chip
          appears inline so the user gets feedback without modals.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="strong" padding="none" className="mb-10 overflow-hidden">
        <div className="px-6 sm:px-8 py-7">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-base font-display font-semibold text-text-primary">
              Tempel tautan video atau gambar
            </h2>
            <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
              Langkah 1
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... atau https://instagram.com/p/..."
                className="pl-9 pr-3 h-11 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handlePaste}
              className="h-11 shrink-0 border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Clipboard className="h-4 w-4" />
              Tempel
            </Button>
          </div>

          {/* Inline status under the URL — single line, no modal noise */}
          <div className="mt-3 min-h-[20px] flex items-center gap-2 text-xs">
            {url.length === 0 ? (
              <span className="text-text-tertiary">
                Mendukung YouTube, Instagram, TikTok, Twitter, Facebook, Vimeo.
              </span>
            ) : detecting || loadingInfo ? (
              <span className="inline-flex items-center gap-1.5 text-text-tertiary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Memeriksa tautan…
              </span>
            ) : platform && platformSupported ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="text-text-secondary">
                  Terdeteksi
                </span>
                <Badge
                  variant="outline"
                  className="border-transparent bg-accent-navy/15 text-accent-navy px-2 py-0.5 text-[10px] font-medium"
                >
                  {formatPlatform(platform.platform)}
                  {platform.contentType ? ` · ${platform.contentType}` : ''}
                </Badge>
                {isPinterest && (
                  <span className="text-text-tertiary">
                    — gunakan halaman Pinterest untuk batch.
                  </span>
                )}
              </>
            ) : platform && !platformSupported ? (
              <>
                <XCircle className="h-3.5 w-3.5 text-danger" />
                <span className="text-text-secondary">
                  Platform <span className="text-text-primary">{formatPlatform(platform.platform)}</span> belum didukung.
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Options + CTA row — quieter band, separated by a hairline */}
        <div className="border-t border-border-subtle bg-bg-sunken/40 px-6 sm:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-6">
            {/* Quality */}
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-2">
                Kualitas
              </label>
              <Select
                value={quality}
                onValueChange={(v) => setQuality(v as VideoQuality)}
                disabled={audioOnly}
              >
                <SelectTrigger className="h-10 bg-bg-base border-border-subtle text-text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualityOptions.map((q) => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio only toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:min-w-[200px]">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-text-tertiary" />
                <div className="flex flex-col">
                  <span className="text-sm text-text-primary leading-tight">Audio saja</span>
                  <span className="text-xs text-text-tertiary leading-tight">Ekstrak ke MP3</span>
                </div>
              </div>
              <Switch
                checked={audioOnly}
                onCheckedChange={(c) => {
                  setAudioOnly(c);
                  if (c) setQuality('audio');
                  else if (quality === 'audio') setQuality('best');
                }}
              />
            </div>

            {/* CTA */}
            <Button
              size="lg"
              onClick={() => downloadMutation.mutate()}
              disabled={!canDownload}
              className="w-full lg:w-auto lg:ml-auto h-11 min-h-[44px] lg:min-w-[180px]"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengunduh…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Unduh Sekarang
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Preview strip — appears only when we have real info to show */}
        {mediaInfo && (
          <div className="border-t border-border-subtle px-6 sm:px-8 py-5 flex items-start gap-4">
            {mediaInfo.thumbnail ? (
              <img
                src={mediaInfo.thumbnail}
                alt=""
                className="w-32 h-20 sm:w-40 sm:h-24 object-cover rounded-md border border-border-subtle shrink-0 bg-bg-sunken"
                loading="lazy"
              />
            ) : (
              <div className="w-32 h-20 sm:w-40 sm:h-24 rounded-md border border-border-subtle bg-bg-sunken flex items-center justify-center shrink-0">
                <Film className="h-6 w-6 text-text-tertiary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-display font-semibold text-text-primary line-clamp-2 leading-snug">
                {mediaInfo.title || 'Tanpa judul'}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
                {mediaInfo.uploader && (
                  <span className="truncate max-w-[200px]">
                    <span className="text-text-secondary">{mediaInfo.uploader}</span>
                  </span>
                )}
                {mediaInfo.duration && (
                  <span className="tabular-nums">{formatDuration(mediaInfo.duration)}</span>
                )}
                {mediaInfo.filesize && (
                  <span className="tabular-nums">{formatFileSize(mediaInfo.filesize)}</span>
                )}
                {mediaInfo.width && mediaInfo.height && (
                  <span className="tabular-nums">{mediaInfo.width}×{mediaInfo.height}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────────────
          KPI band — three quiet tiles. Sesi label is honest about the
          memory: we don't pretend to track lifetime stats yet.
         ───────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Unduhan sesi ini"
            value={stats.total}
            sublabel="sejak halaman dibuka"
          />
          <StatCard
            label="Berhasil"
            value={stats.success}
            sublabel={stats.failed > 0 ? `${stats.failed} gagal` : 'tanpa kegagalan'}
          />
          <StatCard
            label="Tingkat keberhasilan"
            value={stats.rate === null ? '—' : `${stats.rate}%`}
            sublabel="rasio unduhan sukses"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          History — in-session log. No pagination, no kebab; a plain
          chronological list keeps it disposable, which it is.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <History className="h-4 w-4 text-text-tertiary shrink-0" />
            <h2 className="text-sm font-display font-semibold text-text-primary">
              Riwayat sesi
            </h2>
          </div>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistory([])}
              className="text-text-tertiary hover:text-text-primary"
            >
              Kosongkan
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <EmptyState
            icon={<Download />}
            title="Belum ada unduhan"
            description="Tempel sebuah tautan di atas dan klik Unduh untuk memulai. Daftar ini hanya bertahan selama sesi browser Anda."
          />
        ) : downloading && history.length === 0 ? (
          <div className="p-5 space-y-2">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {history.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </GlassPanel>

      {/* Quiet footnote: an Indonesian operator should know why
          Instagram sometimes fails. Single line, no Alert chrome. */}
      <p className="mt-6 text-xs text-text-tertiary flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 mt-[1px] shrink-0" />
        <span>
          Beberapa konten Instagram dan TikTok memerlukan login.
          Jika unduhan gagal, kemungkinan konten privat atau dibatasi platform.
        </span>
      </p>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  HistoryRow — one line per attempt. Status on the right so the eye  */
/*  scans success/failure column-wise instead of reading every title.  */
/* ------------------------------------------------------------------ */

interface HistoryRowProps { entry: DownloadEntry }

function HistoryRow({ entry }: HistoryRowProps) {
  const [, setTick] = useState(0);

  // re-render every 30s so "Baru saja" → "1 menit lalu" updates quietly.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <li className="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-bg-sunken/40 transition-colors">
      {/* Thumbnail or icon */}
      <div className="shrink-0">
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt=""
            className="w-12 h-12 object-cover rounded border border-border-subtle bg-bg-sunken"
            loading="lazy"
          />
        ) : (
          <div className={cn(
            'w-12 h-12 rounded border border-border-subtle flex items-center justify-center',
            entry.audioOnly ? 'bg-bg-sunken' : 'bg-bg-sunken',
          )}>
            {entry.audioOnly
              ? <Music className="h-5 w-5 text-text-tertiary" />
              : <ImageIcon className="h-5 w-5 text-text-tertiary" />}
          </div>
        )}
      </div>

      {/* Title + url */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-text-primary truncate">
            {entry.title || entry.url}
          </span>
          <Badge
            variant="outline"
            className="border-border-subtle text-text-tertiary px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider shrink-0"
          >
            {formatPlatform(entry.platform)}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-text-tertiary">
          <span className="tabular-nums">{QUALITY_LABEL[entry.quality] ?? entry.quality}</span>
          <span>{formatRelative(entry.finishedAt)}</span>
          {entry.status === 'failed' && entry.errorMessage && (
            <span className="text-danger truncate max-w-[300px]">{entry.errorMessage}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0">
        {entry.status === 'success' ? (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Selesai
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-danger">
            <XCircle className="h-3.5 w-3.5" />
            Gagal
          </span>
        )}
      </div>
    </li>
  );
}
