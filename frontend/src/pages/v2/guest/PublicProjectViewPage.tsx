import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Eye, FileImage, Film, Folder, FolderOpen,
  Image as ImageIcon, Home, Search, Star, User as UserIcon, X,
} from 'lucide-react';
import { AuroraBackground } from '@/components/monomi/AuroraBackground';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  mediaCollabService, type MediaAsset, type MediaFolder,
} from '@/services/media-collab';
import { getProxyUrl } from '@/utils/mediaProxy';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/*                                                                      */
/*  Public share-link gallery. Anyone with the token can see this; no  */
/*  AppShell, no auth context. Editorial composition:                  */
/*                                                                      */
/*    AuroraBackground → fixed brand canvas                            */
/*    Top hero bar     → wordmark · project · view count               */
/*    Main GlassPanel  → breadcrumb · search · folder grid · asset grid*/
/*    Footer note      → "Powered by Monomi"                           */
/*                                                                      */
/*  The page intentionally does not include the heavy feedback /        */
/*  comment drawer / VideoReviewModal from the classic page. Those     */
/*  are anchored to internal media primitives that violate the         */
/*  "ui/monomi-only" guideline. The v2 surface is a read-first         */
/*  showcase; commenting can be reintroduced in a later wave once a    */
/*  token-driven comment primitive is part of the design system.       */
/* ------------------------------------------------------------------ */

export const PublicProjectViewPage = () => {
  const { token: shareToken } = useParams<{ token: string }>();

  const [search, setSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  /* ----- data ----- */
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['public-project-v2', shareToken],
    queryFn: () => mediaCollabService.getPublicProject(shareToken!),
    enabled: !!shareToken,
    retry: false,
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['public-assets-v2', shareToken],
    queryFn: () => mediaCollabService.getPublicAssets(shareToken!),
    enabled: !!shareToken,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['public-folders-v2', shareToken],
    queryFn: () => mediaCollabService.getPublicFolders(shareToken!),
    enabled: !!shareToken,
  });

  // Signed Cloudflare Worker JWT — 24h cache so we don't refetch when
  // the user re-enters the page within the same browser session.
  const { data: mediaToken } = useQuery({
    queryKey: ['public-media-token-v2', shareToken],
    queryFn: () => mediaCollabService.getPublicMediaToken(shareToken!),
    enabled: !!shareToken,
    staleTime: 23 * 60 * 60 * 1000,
  });

  /* ----- derived navigation state ----- */
  const folderAssets = useMemo(
    () => assets.filter((a) => a.folderId === currentFolderId),
    [assets, currentFolderId],
  );
  const subfolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId],
  );

  // Breadcrumb path from root → current folder. Walks parentId chain so
  // deep folder trees stay navigable without a separate tree component.
  const folderPath = useMemo(() => {
    if (!currentFolderId) return [] as MediaFolder[];
    const path: MediaFolder[] = [];
    let folderId: string | null | undefined = currentFolderId;
    while (folderId) {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) break;
      path.unshift(folder);
      folderId = folder.parentId;
    }
    return path;
  }, [currentFolderId, folders]);

  /* ----- client-side search across the current folder ----- */
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folderAssets;
    return folderAssets.filter((a) =>
      a.originalName.toLowerCase().includes(q)
      || a.description?.toLowerCase().includes(q),
    );
  }, [folderAssets, search]);

  // Navigable images for lightbox prev/next.
  const imageAssets = useMemo(
    () => filteredAssets.filter(
      (a) => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE',
    ),
    [filteredAssets],
  );

  /* ----- lightbox keyboard nav ----- */
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setSelected(null);
      } else if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
        && (selected.mediaType === 'IMAGE' || selected.mediaType === 'RAW_IMAGE')
      ) {
        e.preventDefault();
        const idx = imageAssets.findIndex((a) => a.id === selected.id);
        if (idx === -1) return;
        const next = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
        if (next >= 0 && next < imageAssets.length) {
          setSelected(imageAssets[next]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, imageAssets]);

  /* ----- missing or invalid token states ----- */
  if (!shareToken) {
    return (
      <ShellFrame>
        <ErrorPanel
          title="Tautan Tidak Lengkap"
          body="Tautan berbagi ini terlihat rusak atau tidak lengkap. Mintalah pengirim untuk membagikan ulang tautan."
        />
      </ShellFrame>
    );
  }

  if (projectError) {
    return (
      <ShellFrame>
        <ErrorPanel
          title="Galeri Tidak Ditemukan"
          body="Tautan publik ini tidak valid atau telah dinonaktifkan oleh pemiliknya."
        />
      </ShellFrame>
    );
  }

  /* ----- render ----- */
  const isLoading = projectLoading || assetsLoading;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />

      {/* ─────────────── Hero header bar ─────────────── */}
      <header className="relative z-10 border-b border-border-subtle bg-bg-base/60 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl font-semibold tracking-tight text-text-primary">
                monomi
              </span>
              <span className="h-4 w-px bg-border-default" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                Galeri Publik
              </span>
            </div>
            {projectLoading ? (
              <Skeleton className="mt-2 h-5 w-72 rounded" />
            ) : (
              <h1 className="mt-1 truncate text-base font-medium text-text-primary sm:text-lg">
                {project?.name ?? '—'}
              </h1>
            )}
          </div>

          {/* Right rail: view count chip */}
          <div className="flex items-center gap-2">
            {project && (
              <Badge
                variant="outline"
                className="border-info/30 bg-info/[0.08] text-info gap-1.5 px-2.5 py-1 text-xs"
              >
                <Eye className="h-3 w-3" />
                {project.publicViewCount ?? 0} tampilan
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────── Main content ─────────────── */}
      <main className="relative z-10 mx-auto max-w-[1280px] px-6 py-8">
        {/* Description card — quiet sunken well */}
        {project?.description && (
          <GlassPanel surface="subtle" padding="md" className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-1.5">
              Ringkasan Proyek
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {project.description}
            </p>
          </GlassPanel>
        )}

        {/* Gallery panel */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Toolbar: title + counts + search */}
          <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-base font-display font-semibold tracking-tight text-text-primary">
                Galeri Media
              </h2>
              <span className="text-xs text-text-tertiary tabular-nums">
                {folderAssets.length} aset
                {subfolders.length > 0 && ` · ${subfolders.length} folder`}
              </span>
            </div>
            <div className="relative w-full sm:max-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berkas..."
                className="bg-bg-sunken border-border-subtle pl-9 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>

          {/* Breadcrumb row — only when navigated below root. Stays
              outside the toolbar so its hierarchy reads as "where am I"
              and not "filter".                                            */}
          {currentFolderId && (
            <div className="flex flex-wrap items-center gap-1 border-b border-border-subtle bg-bg-sunken/40 px-5 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolderId(null)}
                className="h-7 px-2 text-text-tertiary hover:text-text-primary"
              >
                <Home className="h-3.5 w-3.5" />
                Root
              </Button>
              {folderPath.map((folder, idx) => (
                <div key={folder.id} className="flex items-center gap-1">
                  <span className="text-text-tertiary">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentFolderId(folder.id)}
                    disabled={idx === folderPath.length - 1}
                    className={cn(
                      'h-7 px-2',
                      idx === folderPath.length - 1
                        ? 'text-text-primary disabled:opacity-100 cursor-default'
                        : 'text-text-tertiary hover:text-text-primary',
                    )}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    {folder.name}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="p-5">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-md" />
                ))}
              </div>
            ) : subfolders.length === 0 && filteredAssets.length === 0 ? (
              <EmptyState
                icon={<ImageIcon />}
                title={
                  search
                    ? 'Tidak ada berkas yang cocok'
                    : 'Folder ini kosong'
                }
                description={
                  search
                    ? 'Coba kata kunci lain atau hapus pencarian.'
                    : 'Belum ada aset atau folder di tingkat ini.'
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
              <div className="space-y-6">
                {/* Subfolders row — only rendered when there are folders to
                    show. Sits above the assets so navigation reads first.   */}
                {subfolders.length > 0 && (
                  <section>
                    <div className="mb-2.5 flex items-baseline justify-between">
                      <h3 className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                        Folder
                      </h3>
                      <span className="text-[11px] text-text-tertiary tabular-nums">
                        {subfolders.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {subfolders.map((folder) => (
                        <FolderTile
                          key={folder.id}
                          folder={folder}
                          onClick={() => setCurrentFolderId(folder.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Asset grid */}
                {filteredAssets.length > 0 && (
                  <section>
                    {subfolders.length > 0 && (
                      <div className="mb-2.5 flex items-baseline justify-between">
                        <h3 className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                          Aset
                        </h3>
                        <span className="text-[11px] text-text-tertiary tabular-nums">
                          {filteredAssets.length}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {filteredAssets.map((asset) => (
                        <AssetTile
                          key={asset.id}
                          asset={asset}
                          mediaToken={mediaToken ?? null}
                          onClick={() => setSelected(asset)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </GlassPanel>

        <div className="mt-8 text-center text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
          Powered by Monomi · Media Collaboration
        </div>
      </main>

      {/* Lightbox */}
      {selected && (
        <PreviewOverlay
          asset={selected}
          mediaToken={mediaToken ?? null}
          imageAssets={imageAssets}
          onClose={() => setSelected(null)}
          onNavigate={(next) => setSelected(next)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ShellFrame — empty aurora frame for non-rendering states.          */
/* ------------------------------------------------------------------ */

function ShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />
      <div className="absolute top-6 right-8 z-10 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
        Monomi Studio · Galeri Publik
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorPanel — uses the same composition as GuestProjectViewPage so  */
/*  the two public error states feel like one family.                  */
/* ------------------------------------------------------------------ */

function ErrorPanel({ title, body }: { title: string; body: string }) {
  return (
    <GlassPanel surface="strong" padding="lg" className="w-full max-w-[460px]">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
          Galeri Publik
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
    </GlassPanel>
  );
}

/* ------------------------------------------------------------------ */
/*  FolderTile — folder card matching the AssetTile rhythm.            */
/* ------------------------------------------------------------------ */

function FolderTile({
  folder, onClick,
}: {
  folder: MediaFolder;
  onClick: () => void;
}) {
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
      <div className="flex aspect-square w-full items-center justify-center bg-bg-base/60">
        <FolderOpen
          className="h-12 w-12 text-text-tertiary transition-colors group-hover:text-text-secondary"
          strokeWidth={1.25}
        />
      </div>
      <div className="px-3 py-2.5">
        <div className="truncate text-xs text-text-primary" title={folder.name}>
          {folder.name}
        </div>
        <div className="mt-0.5 text-[11px] text-text-tertiary">
          Buka folder
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  AssetTile — thumb + caption.                                       */
/* ------------------------------------------------------------------ */

function AssetTile({
  asset, mediaToken, onClick,
}: {
  asset: MediaAsset;
  mediaToken: string | null;
  onClick: () => void;
}) {
  const thumb = asset.thumbnailUrl
    ? getProxyUrl(asset.thumbnailUrl, mediaToken)
    : null;
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
        {(asset.starRating ?? 0) > 0 && (
          <div className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-bg-base/70 px-1.5 py-0.5 text-[10px] text-warning backdrop-blur-sm">
            <Star className="h-3 w-3 fill-current" />
            {asset.starRating}
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="truncate text-xs text-text-primary" title={asset.originalName}>
          {asset.originalName}
        </div>
        {asset.uploader?.name && (
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-text-tertiary">
            <UserIcon className="h-3 w-3 shrink-0" />
            {asset.uploader.name}
          </div>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  PreviewOverlay — lightbox shared between images and video.         */
/*  Keyboard navigation (←/→/Esc) is handled by the parent.            */
/* ------------------------------------------------------------------ */

function PreviewOverlay({
  asset, mediaToken, imageAssets, onClose, onNavigate,
}: {
  asset: MediaAsset;
  mediaToken: string | null;
  imageAssets: MediaAsset[];
  onClose: () => void;
  onNavigate: (asset: MediaAsset) => void;
}) {
  const src = getProxyUrl(asset.url, mediaToken);
  const isVideo = asset.mediaType === 'VIDEO';
  const isImage = asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE';

  const idx = isImage ? imageAssets.findIndex((a) => a.id === asset.id) : -1;
  const prev = idx > 0 ? imageAssets[idx - 1] : null;
  const next = idx >= 0 && idx < imageAssets.length - 1 ? imageAssets[idx + 1] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[1280px] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption bar */}
        <div className="flex items-center justify-between gap-3 rounded-t-md border border-b-0 border-border-default bg-bg-panel px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
              {asset.mediaType}
              {isImage && imageAssets.length > 1 && (
                <span className="ml-2 normal-case tracking-normal">
                  {idx + 1} / {imageAssets.length}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-sm text-text-primary">
              {asset.originalName}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!prev}
                  onClick={() => prev && onNavigate(prev)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!next}
                  onClick={() => next && onNavigate(next)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  Berikutnya
                </Button>
                <span className="mx-1 h-4 w-px bg-border-default" />
              </>
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
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-b-md border border-border-default bg-bg-base p-4">
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
              className="max-h-[78vh] max-w-full object-contain rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicProjectViewPage;
