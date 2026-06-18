import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, FileImage, Film, Image as ImageIcon, Search,
  ShieldCheck, User as UserIcon, X, Maximize2,
} from 'lucide-react';
import { AuroraBackground } from '@/components/monomi/AuroraBackground';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LightboxOverlay } from '@/components/media/LightboxOverlay';
import { mediaCollabService, type MediaAsset } from '@/services/media-collab';
import { getProxyUrl } from '@/utils/mediaProxy';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Editorial vocabulary for the role chip — same dictionary as the    */
/*  invite-acceptance page so the journey reads as continuous.         */
/* ------------------------------------------------------------------ */

const ROLE_LABEL: Record<string, string> = {
  VIEWER:    'Pengamat',
  COMMENTER: 'Pemberi Umpan Balik',
  EDITOR:    'Kolaborator',
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/*                                                                      */
/*  External-facing guest gallery. No AppShell — the layout is a       */
/*  full-bleed AuroraBackground canvas with a top hero bar carrying    */
/*  the monomi wordmark, project metadata and the guest's identity.    */
/*  The content body is a single GlassPanel that hosts the gallery,    */
/*  preserving the editorial "one strong panel on aurora" rhythm.      */
/* ------------------------------------------------------------------ */

export const GuestProjectViewPage = () => {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  const { data: projectResp, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['guest-project-v2', projectId, token],
    queryFn: () => mediaCollabService.getGuestProject(projectId!, token!),
    enabled: !!projectId && !!token,
    retry: false,
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['guest-assets-v2', projectId, token],
    queryFn: () => mediaCollabService.getGuestAssets(projectId!, token!),
    enabled: !!projectId && !!token,
  });

  const projectData = projectResp?.data;
  const isLoading = projectLoading || assetsLoading;

  /* ----- client-side search ----- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      a.originalName.toLowerCase().includes(q)
      || a.description?.toLowerCase().includes(q),
    );
  }, [assets, search]);

  /* ----- missing token ----- */
  if (!token) {
    return (
      <ShellFrame>
        <GlassPanel surface="strong" padding="lg" className="w-full max-w-[460px]">
          <ErrorBlock
            title="Token Akses Hilang"
            body={t('guest.guestProjectView.missingTokenBody', 'Tautan tidak menyertakan token akses tamu. Mintalah pemilik proyek untuk membagikan ulang tautan undangan Anda.')}
          />
        </GlassPanel>
      </ShellFrame>
    );
  }

  /* ----- error / loading ----- */
  if (projectError) {
    return (
      <ShellFrame>
        <GlassPanel surface="strong" padding="lg" className="w-full max-w-[460px]">
          <ErrorBlock
            title={t('guest.guestProjectView.accessUnavailable', 'Akses Tidak Tersedia')}
            body={t('guest.guestProjectView.accessUnavailableBody', 'Token akses tidak valid atau sudah kedaluwarsa. Mintalah pemilik proyek untuk mengirim undangan baru.')}
          />
        </GlassPanel>
      </ShellFrame>
    );
  }

  /* ----- render ----- */
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />

      {/* ─────────────── Hero header bar ─────────────── */}
      <header className="relative z-10 border-b border-border-subtle bg-bg-base/60 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand + project line */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl font-semibold tracking-tight text-text-primary">
                monomi
              </span>
              <span className="h-4 w-px bg-border-default" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                Kolaborasi Tamu
              </span>
            </div>
            {projectLoading ? (
              <Skeleton className="mt-2 h-5 w-64 rounded" />
            ) : (
              <h1 className="mt-1 truncate text-base font-medium text-text-primary sm:text-lg">
                {projectData?.project.name ?? '—'}
              </h1>
            )}
          </div>

          {/* Right rail: role chip + guest chip */}
          <div className="flex flex-wrap items-center gap-2">
            {projectData?.role && (
              <Badge
                variant="outline"
                className="border-accent/40 bg-accent/[0.07] text-accent gap-1.5 px-2.5 py-1 text-xs"
              >
                <ShieldCheck className="h-3 w-3" />
                {ROLE_LABEL[projectData.role] ?? projectData.role}
              </Badge>
            )}
            {projectData?.guestName && (
              <Badge
                variant="outline"
                className="border-border-default bg-bg-sunken text-text-secondary gap-1.5 px-2.5 py-1 text-xs"
              >
                <UserIcon className="h-3 w-3" />
                {projectData.guestName}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────── Main content ─────────────── */}
      <main className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 py-8">
        {/* Optional description card — quiet sunken well above the gallery */}
        {projectData?.project.description && (
          <GlassPanel surface="subtle" padding="md" className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-1.5">
              Ringkasan Proyek
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {projectData.project.description}
            </p>
          </GlassPanel>
        )}

        {/* Gallery panel — single surface carries search + grid so the
            page reads as one editorial composition.                      */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-base font-display font-semibold tracking-tight text-text-primary">
                Galeri Media
              </h2>
              <span className="text-xs text-text-tertiary tabular-nums">
                {filtered.length} dari {assets.length}
              </span>
            </div>
            <div className="relative w-full sm:max-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('guest.guestProjectView.searchPlaceholder', 'Cari berkas...')}
                className="bg-bg-sunken border-border-subtle pl-9 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-md" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<ImageIcon />}
                title={
                  search
                    ? t('guest.guestProjectView.noFilesMatch', 'Tidak ada berkas yang cocok')
                    : t('guest.guestProjectView.noAssets', 'Belum ada aset media')
                }
                description={
                  search
                    ? t('guest.guestProjectView.tryOtherKeyword', 'Coba kata kunci lain atau hapus pencarian.')
                    : t('guest.guestProjectView.noAssetsBody', 'Pemilik proyek belum mengunggah berkas apa pun.')
                }
                action={
                  search ? (
                    <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                      Hapus pencarian
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((asset) => (
                  <AssetTile
                    key={asset.id}
                    asset={asset}
                    token={token}
                    onClick={() => setSelected(asset)}
                  />
                ))}
              </div>
            )}
          </div>
        </GlassPanel>

        <div className="mt-8 text-center text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
          Dibagikan melalui Monomi · Akses Tamu
        </div>
      </main>

      {/* ─────────────── Lightweight inline preview overlay ─────────────── */}
      {selected && (
        <PreviewOverlay
          asset={selected}
          token={token}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ShellFrame — empty aurora frame for missing/invalid states so they */
/*  share the same brand chrome as the main page.                      */
/* ------------------------------------------------------------------ */

function ShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />
      <div className="absolute top-6 right-8 z-10 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
        Monomi Studio · Akses Tamu
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorBlock — same shape as GuestAcceptInvitePage state cards.      */
/* ------------------------------------------------------------------ */

function ErrorBlock({ title, body }: { title: string; body: string }) {
  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
          Akses Tamu
        </div>
        <h1 className="text-[36px] leading-none font-display font-semibold text-text-primary tracking-tight">
          monomi
        </h1>
      </div>
      <div className="rounded-md border border-danger/25 bg-danger/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 mb-1 text-danger">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-medium">
            Tidak Dapat Dibuka
          </span>
        </div>
        <h2 className="text-base font-display font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
          {body}
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  AssetTile — square thumb with quiet caption row beneath.           */
/*                                                                      */
/*  Falls back to a typed glyph well when there's no thumbnail so the  */
/*  grid stays rhythm-consistent even when uploads are mid-processing. */
/* ------------------------------------------------------------------ */

function AssetTile({
  asset, token, onClick,
}: {
  asset: MediaAsset;
  token: string;
  onClick: () => void;
}) {
  const thumb = asset.thumbnailUrl ? getProxyUrl(asset.thumbnailUrl, token) : null;
  const isVideo = asset.mediaType === 'VIDEO';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group block w-full text-left',
        'rounded-md border border-border-subtle bg-bg-sunken overflow-hidden',
        'transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60',
      )}
    >
      <div className="relative aspect-square w-full bg-bg-base">
        {thumb ? (
          <img
            src={thumb}
            alt={asset.originalName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-tertiary">
            {isVideo ? <Film className="h-8 w-8" /> : <FileImage className="h-8 w-8" />}
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Badge
            variant="outline"
            className="border-transparent bg-bg-base/70 text-[10px] font-medium uppercase tracking-wider text-text-secondary backdrop-blur-sm"
          >
            {asset.mediaType}
          </Badge>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <div className="truncate text-xs text-text-primary" title={asset.originalName}>
          {asset.originalName}
        </div>
        {asset.description && (
          <div className="mt-0.5 truncate text-[11px] text-text-tertiary">
            {asset.description}
          </div>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  PreviewOverlay — full-bleed lightbox for the selected asset.       */
/*                                                                      */
/*  Plain backdrop + GlassPanel; ESC and backdrop click both dismiss.  */
/*  Video assets fall back to the native <video> element so we don't   */
/*  pull in heavy player UI for a read-only guest surface.             */
/* ------------------------------------------------------------------ */

function PreviewOverlay({
  asset, token, onClose,
}: {
  asset: MediaAsset;
  token: string;
  onClose: () => void;
}) {
  const src = getProxyUrl(asset.url, token);
  const isVideo = asset.mediaType === 'VIDEO';
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/85 backdrop-blur-md p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1200px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption bar */}
        <div className="flex items-center justify-between gap-3 rounded-t-md border border-b-0 border-border-default bg-bg-panel px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
              {asset.mediaType}
            </div>
            <div className="mt-0.5 truncate text-sm text-text-primary">
              {asset.originalName}
            </div>
          </div>
          {!isVideo && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setLightboxOpen(true)}
              aria-label="Zoom"
              title="Zoom / fullscreen"
              className="text-text-tertiary hover:text-text-primary"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Tutup"
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Media body — sunken well so the asset reads as a sheet inside
            the lightbox frame, not as a floating element.                */}
        <div className="flex flex-1 items-center justify-center rounded-b-md border border-border-default bg-bg-base p-4 overflow-hidden">
          {isVideo ? (
            <video
              src={src}
              controls
              autoPlay
              className="max-h-[78vh] max-w-full rounded-sm"
            />
          ) : (
            <img
              src={src}
              alt={asset.originalName}
              className="max-h-[78vh] max-w-full object-contain rounded-sm cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      </div>

      {/* Full-screen zoom lightbox — opens on top of the preview overlay */}
      {lightboxOpen && !isVideo && (
        <LightboxOverlay
          src={src}
          alt={asset.originalName}
          downloadUrl={src}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

export default GuestProjectViewPage;
