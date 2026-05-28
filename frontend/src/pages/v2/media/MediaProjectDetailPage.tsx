import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Upload, Image as ImageIcon, Film, Play, Trash2,
  MoreHorizontal, Share2, Copy, Link as LinkIcon, MessageCircle,
  CheckCircle2, X, Loader2, Eye, Globe, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useMediaToken } from '@/hooks/useMediaToken';
import { getProxyUrl } from '@/utils/mediaProxy';
import {
  mediaCollabService,
  type MediaAsset,
  type MediaCollection,
} from '@/services/media-collab';

/* ------------------------------------------------------------------ */
/*  Sidebar — same shape as every v2 page.                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const initialsOf = (name?: string) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const formatBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const assetStatusChip = (s?: string) => {
  switch (s) {
    case 'APPROVED':      return 'bg-success/10 text-success';
    case 'IN_REVIEW':     return 'bg-info/10 text-info';
    case 'NEEDS_CHANGES': return 'bg-warning/10 text-warning';
    case 'ARCHIVED':      return 'bg-bg-sunken text-text-tertiary';
    case 'DRAFT':
    default:              return 'bg-bg-sunken text-text-tertiary';
  }
};

const ASSET_STATUS_LABEL: Record<string, string> = {
  DRAFT:         'Draft',
  IN_REVIEW:     'In Review',
  NEEDS_CHANGES: 'Needs Changes',
  APPROVED:      'Approved',
  ARCHIVED:      'Archived',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MediaProjectDetailPageV2() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { mediaToken } = useMediaToken();

  /* ---------- local ui state ---------- */
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] =
    useState<'all' | 'IMAGE' | 'VIDEO'>('all');
  // Cap how many tiles render at once — a 440-asset project would otherwise
  // paint a 35,000px DOM. "Load more" reveals the next page on demand.
  const PAGE_SIZE = 48;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- data ---------- */
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['media-project', projectId],
    queryFn: () => mediaCollabService.getProject(projectId!),
    enabled: !!projectId,
  });

  const {
    data: assets = [],
    isLoading: assetsLoading,
  } = useQuery({
    queryKey: ['media-assets', projectId],
    queryFn: () => mediaCollabService.getAssets(projectId!, {
      sortBy: 'uploadedAt',
      sortOrder: 'desc',
    }),
    enabled: !!projectId,
  });

  const {
    data: collections = [],
    isLoading: collectionsLoading,
  } = useQuery({
    queryKey: ['media-collections', projectId],
    queryFn: () => mediaCollabService.getCollections(projectId!),
    enabled: !!projectId,
  });

  const {
    data: assetComments = [],
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['asset-comments', selectedAsset?.id],
    queryFn: () => mediaCollabService.getCommentsByAsset(selectedAsset!.id),
    enabled: !!selectedAsset,
  });

  /* ---------- mutations ---------- */
  const invalidateAssets = () => {
    queryClient.invalidateQueries({ queryKey: ['media-assets', projectId] });
    queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
  };

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => mediaCollabService.deleteAsset(assetId),
    onSuccess: () => {
      invalidateAssets();
      toast.success(t('mediaCollab.assetDeleted', 'Aset berhasil dihapus.'));
      setSelectedAsset(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('mediaCollab.assetDeleteFailed', 'Gagal menghapus aset.')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      mediaCollabService.updateAssetStatus(id, status),
    onSuccess: () => {
      invalidateAssets();
      toast.success(t('mediaCollab.statusUpdated', 'Status aset diperbarui.'));
    },
    onError: () => toast.error(t('mediaCollab.statusUpdateFailed', 'Gagal memperbarui status.')),
  });

  const enableShareMutation = useMutation({
    mutationFn: () => mediaCollabService.enablePublicSharing(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      toast.success(t('mediaCollab.shareEnabled', 'Tautan publik diaktifkan.'));
    },
    onError: () => toast.error(t('mediaCollab.shareEnableFailed', 'Gagal mengaktifkan tautan publik.')),
  });

  const disableShareMutation = useMutation({
    mutationFn: () => mediaCollabService.disablePublicSharing(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      toast.success(t('mediaCollab.shareDisabled', 'Tautan publik dinonaktifkan.'));
    },
    onError: () => toast.error(t('mediaCollab.shareDisableFailed', 'Gagal menonaktifkan tautan publik.')),
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) =>
      mediaCollabService.createComment({
        assetId: selectedAsset!.id,
        content: text,
      }),
    onSuccess: () => {
      refetchComments();
      toast.success(t('mediaCollab.commentSent', 'Komentar terkirim.'));
    },
    onError: () => toast.error(t('mediaCollab.commentFailed', 'Gagal mengirim komentar.')),
  });

  /* ---------- derived ---------- */
  const filteredAssets = useMemo(() => {
    if (mediaTypeFilter === 'all') return assets;
    if (mediaTypeFilter === 'IMAGE') {
      return assets.filter(
        (a) => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE',
      );
    }
    return assets.filter((a) => a.mediaType === 'VIDEO');
  }, [assets, mediaTypeFilter]);

  const kpis = useMemo(() => {
    const total = assets.length;
    const images = assets.filter(
      (a) => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE',
    ).length;
    const videos = assets.filter((a) => a.mediaType === 'VIDEO').length;
    const inReview = assets.filter((a) => a.status === 'IN_REVIEW').length;
    return { total, images, videos, inReview };
  }, [assets]);

  /* ---------- upload (simple, multi) ----------
     V2 first pass: standard file picker → mediaCollabService.uploadAsset
     looped per file. Progress is shown as Skeleton placeholders in the
     gallery (one per pending filename). Drag-and-drop, chunked, R2
     presigned uploads, conflict resolution, and the duplicate check
     flow from the classic page are intentionally deferred — see
     report.                                                              */
  const uploadAsset = async (file: File) => {
    if (!projectId) return;
    try {
      await mediaCollabService.uploadAsset(projectId, file);
      toast.success(t('mediaCollab.uploaded', '"{{name}}" diunggah.', { name: file.name }));
    } catch (err: any) {
      toast.error(t('mediaCollab.uploadFailed', 'Gagal unggah "{{name}}": {{error}}', { name: file.name, error: err?.response?.data?.message ?? err?.message ?? 'error' }));
    }
  };

  const handleFilesPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setPendingUploads(files.map((f) => f.name));
    // Sequential upload — predictable progress, kinder to backend than
    // parallel storm of multipart requests.
    for (const file of files) {
      await uploadAsset(file);
    }
    setPendingUploads([]);
    invalidateAssets();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---------- share link ----------
     Public gallery is served from the dedicated share host (share.monomiagency.com)
     at the /shared/:token route — NOT the admin origin. Overridable via
     VITE_SHARE_ORIGIN so dev links resolve against the dev tunnel. The old
     `${origin}/media/public/${token}` had no matching route (dead 404 link). */
  const shareOrigin = import.meta.env.VITE_SHARE_ORIGIN || 'https://share.monomiagency.com';
  const shareUrl = project?.isPublic && project.publicShareToken
    ? `${shareOrigin}/shared/${project.publicShareToken}`
    : null;

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('mediaCollab.linkCopied', 'Tautan disalin ke clipboard.'));
    } catch {
      toast.error(t('mediaCollab.linkCopyFailed', 'Gagal menyalin tautan.'));
    }
  };

  /* ---------- shell ---------- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ---------- loading ---------- */
  if (projectLoading) {
    return (
      <Shell>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-32 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </Shell>
    );
  }

  /* ---------- error ---------- */
  if (projectError || !project) {
    return (
      <Shell>
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title={t('mediaCollab.notFound', 'Proyek tidak ditemukan')}
          description={
            projectError instanceof Error
              ? projectError.message
              : t('mediaCollab.notFoundDesc', 'Proyek ini mungkin sudah dihapus atau Anda tidak memiliki akses.')
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/media-collab')}>
                <ArrowLeft className="h-4 w-4" /> {t('mediaCollab.back', 'Kembali')}
              </Button>
              <Button size="sm" onClick={() => refetchProject()}>{t('common.retry', 'Coba Lagi')}</Button>
            </div>
          }
        />
      </Shell>
    );
  }

  /* ---------- render ---------- */
  return (
    <Shell>
      {/* Back link */}
      <div className="mb-4">
        <Link
          to="/v2/media-collab"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('mediaCollab.backToCollab', 'Kembali ke Kolaborasi Media')}
        </Link>
      </div>

      <PageHeader
        title={project.name}
        description={
          project.description
          || t('mediaCollab.defaultDesc', 'Ruang kolaborasi media — unggah, ulas, dan setujui aset bersama tim.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareSheetOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              {t('mediaCollab.share', 'Bagikan')}
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {t('mediaCollab.uploadAsset', 'Unggah Aset')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFilesPicked}
            />
          </div>
        }
      />

      {/* On mobile the gallery leads (Drive/iCloud-style); flex `order`
          restores hero → stats → gallery on md+ without duplicating markup. */}
      <div className="flex flex-col">

      {/* Hero — identity + sharing panel. */}
      <GlassPanel surface="glass" padding="lg" className="order-3 md:order-1 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          <div className="min-w-0 space-y-5">
            {/* Creator */}
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 mt-0.5">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-sm font-medium">
                  {initialsOf(project.creator?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('mediaCollab.owner', 'Pemilik')}
                </div>
                <div className="text-base font-medium text-text-primary truncate">
                  {project.creator?.name ?? '—'}
                </div>
                {project.creator?.email && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {project.creator.email}
                  </div>
                )}
              </div>
            </div>

            {/* Client + connected project */}
            {(project.client || project.project) && (
              <div className="pt-1 space-y-3">
                {project.client && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('mediaCollab.client', 'Klien')}
                    </div>
                    <div className="text-sm text-text-primary">
                      {project.client.name}
                    </div>
                  </div>
                )}
                {project.project && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('mediaCollab.linkedProject', 'Proyek Terhubung')}
                    </div>
                    <div className="text-sm text-text-secondary inline-flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5 text-text-tertiary" />
                      {project.project.number}
                      {project.project.name && (
                        <span className="text-text-tertiary"> · {project.project.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sharing rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 min-w-0 lg:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('mediaCollab.publicLink', 'Tautan Publik')}
              </div>
              <div className="flex lg:justify-end items-center gap-2">
                {project.isPublic ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-success/10 text-success px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  >
                    {t('mediaCollab.active', 'Aktif')}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-bg-sunken text-text-tertiary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  >
                    {t('mediaCollab.inactive', 'Nonaktif')}
                  </Badge>
                )}
              </div>
              {project.publicViewCount !== undefined && project.isPublic && (
                <div className="text-xs text-text-tertiary mt-2">
                  {t('mediaCollab.viewCount', '{{n}} views', { n: project.publicViewCount.toLocaleString('id-ID') })}
                </div>
              )}
            </div>
            <div className="flex lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShareSheetOpen(true)}
              >
                <Globe className="h-4 w-4" />
                {t('mediaCollab.shareSettings', 'Atur Berbagi')}
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          KPI band — four supporting numbers. Total + Direview are
          the load-bearing items; Foto / Video are ambient breakdowns.
         ─────────────────────────────────────────────────────────── */}
      <section className="order-2 md:order-2 mb-8 md:mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label={t('mediaCollab.kpi.totalAssets', 'Total Aset')}
            value={kpis.total}
            sublabel={t('mediaCollab.kpi.totalAssetsSub', 'file dalam proyek')}
          />
          <StatCard
            label={t('mediaCollab.kpi.photos', 'Foto')}
            value={kpis.images}
            sublabel={t('mediaCollab.kpi.photosSub', 'termasuk RAW')}
          />
          <StatCard
            label={t('mediaCollab.kpi.videos', 'Video')}
            value={kpis.videos}
            sublabel={t('mediaCollab.kpi.videosSub', 'klip & rekaman')}
          />
          <StatCard
            label={t('mediaCollab.kpi.inReview', 'Sedang Direview')}
            value={kpis.inReview}
            sublabel={t('mediaCollab.kpi.inReviewSub', 'menunggu persetujuan')}
          />
        </div>
      </section>

      {/* Gallery — leads on mobile (order-1), third on desktop. */}
      <section className="order-1 md:order-3 mb-8 md:mb-10">
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5 flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('mediaCollab.assetGallery', 'Galeri Aset')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {assetsLoading
                  ? t('common.loading', 'Loading…')
                  : t('mediaCollab.assetCount', '{{filtered}} of {{total}} assets', { filtered: filteredAssets.length, total: assets.length })}
              </p>
            </div>

            {/* Type filter — tab-style segmented control */}
            <div className="inline-flex p-0.5 rounded-md bg-bg-sunken border border-border-subtle text-xs">
              {(['all', 'IMAGE', 'VIDEO'] as const).map((opt) => {
                const label = opt === 'all' ? t('mediaCollab.filterAll', 'Semua') : opt === 'IMAGE' ? t('mediaCollab.filterPhoto', 'Foto') : t('mediaCollab.filterVideo', 'Video');
                const active = mediaTypeFilter === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setMediaTypeFilter(opt); setVisibleCount(PAGE_SIZE); }}
                    className={cn(
                      'px-3 py-1.5 rounded-sm transition-colors font-medium',
                      active
                        ? 'bg-bg-raised text-text-primary shadow-[var(--shadow-glow)]'
                        : 'text-text-tertiary hover:text-text-secondary',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pending upload tiles — skeleton placeholders, one per filename */}
          {pendingUploads.length > 0 && (
            <div className="mb-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {pendingUploads.map((name) => (
                <div
                  key={name}
                  className="aspect-square rounded-md border border-border-subtle bg-bg-sunken/60 flex flex-col items-center justify-center p-3 text-center"
                >
                  <Loader2 className="h-5 w-5 text-text-tertiary animate-spin mb-2" />
                  <span className="text-[11px] text-text-tertiary truncate w-full">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {assetsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <UploadZone onPick={() => fileInputRef.current?.click()} />
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredAssets.slice(0, visibleCount).map((asset) => (
                  <AssetTile
                    key={asset.id}
                    asset={asset}
                    mediaToken={mediaToken}
                    onClick={() => setSelectedAsset(asset)}
                  />
                ))}
              </div>
              {filteredAssets.length > visibleCount && (
                <div className="mt-5 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    {t('mediaCollab.loadMore', 'Load more')}
                    <span className="text-text-tertiary ml-1.5 tabular-nums">
                      {filteredAssets.length - visibleCount}
                    </span>
                  </Button>
                </div>
              )}
            </>
          )}
        </GlassPanel>
      </section>

      {/* Collections — folder-like groupings. */}
      <section className="order-4 md:order-4 mb-10">
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('mediaCollab.collections', 'Koleksi')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {collectionsLoading
                  ? t('common.loading', 'Loading…')
                  : t('mediaCollab.collectionCount', '{{count}} collections', { count: collections.length })}
              </p>
            </div>
          </div>

          {collectionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : collections.length === 0 ? (
            <EmptyState
              icon={<Folder className="h-12 w-12" />}
              title={t('mediaCollab.noCollections', 'Belum ada koleksi')}
              description={t('mediaCollab.noCollectionsDesc', 'Buat koleksi untuk mengelompokkan aset berdasarkan tema, rilis, atau klien.')}
            />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collections.map((c) => (
                <CollectionRow key={c.id} collection={c} />
              ))}
            </ul>
          )}
        </GlassPanel>
      </section>

      </div>{/* end flex-col order wrapper */}

      {/* ───────────────────────────────────────────────────────────
          Asset detail sheet — right-side drawer. Preview + status
          actions + comment thread.
         ─────────────────────────────────────────────────────────── */}
      <Sheet
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl bg-bg-base border-border-default text-text-primary p-0 overflow-y-auto"
        >
          {selectedAsset && (
            <>
              <SheetHeader className="border-b border-border-subtle p-5">
                <SheetTitle className="text-text-primary text-base font-display font-semibold truncate pr-8">
                  {selectedAsset.originalName}
                </SheetTitle>
                <SheetDescription className="text-text-tertiary text-xs">
                  {t('mediaCollab.uploaded', 'Diunggah')}{' '}
                  <DateDisplay date={selectedAsset.uploadedAt} className="text-text-secondary" />
                  {selectedAsset.uploader?.name && (
                    <> {t('mediaCollab.by', 'oleh')} <span className="text-text-secondary">{selectedAsset.uploader.name}</span></>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="p-5 space-y-5">
                {/* Preview */}
                <div className="rounded-md bg-bg-sunken border border-border-subtle overflow-hidden">
                  {selectedAsset.mediaType === 'VIDEO' ? (
                    <div className="aspect-video flex flex-col items-center justify-center gap-2 text-text-tertiary">
                      <Play className="h-10 w-10 stroke-1" />
                      <span className="text-xs">{t('mediaCollab.videoPreview', 'Pratinjau video')}</span>
                    </div>
                  ) : selectedAsset.thumbnailUrl || selectedAsset.url ? (
                    <img
                      src={getProxyUrl(
                        selectedAsset.thumbnailUrl || selectedAsset.url,
                        mediaToken,
                      )}
                      alt={selectedAsset.originalName}
                      className="w-full max-h-[360px] object-contain bg-black"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-text-tertiary">
                      <ImageIcon className="h-10 w-10 stroke-1" />
                    </div>
                  )}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <MetaRow label={t('mediaCollab.meta.type', 'Tipe')} value={selectedAsset.mediaType} />
                  <MetaRow label={t('mediaCollab.meta.size', 'Ukuran')} value={formatBytes(Number(selectedAsset.size) || 0)} />
                  <MetaRow label={t('mediaCollab.meta.format', 'Format')} value={selectedAsset.mimeType} />
                  <MetaRow
                    label={t('mediaCollab.meta.status', 'Status')}
                    value={
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                          assetStatusChip(selectedAsset.status),
                        )}
                      >
                        {t(`mediaCollab.assetStatus.${selectedAsset.status}`, ASSET_STATUS_LABEL[selectedAsset.status] ?? selectedAsset.status)}
                      </Badge>
                    }
                  />
                  {selectedAsset.width && selectedAsset.height && (
                    <MetaRow
                      label={t('mediaCollab.meta.dimensions', 'Dimensi')}
                      value={`${selectedAsset.width} × ${selectedAsset.height}`}
                    />
                  )}
                  {selectedAsset.duration && (
                    <MetaRow
                      label={t('mediaCollab.meta.duration', 'Durasi')}
                      value={`${Math.round(selectedAsset.duration)} ${t('mediaCollab.meta.seconds', 'dtk')}`}
                    />
                  )}
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({
                        id: selectedAsset.id,
                        status: 'IN_REVIEW',
                      })
                    }
                    disabled={selectedAsset.status === 'IN_REVIEW'}
                  >
                    <Eye className="h-3.5 w-3.5" /> {t('mediaCollab.markReview', 'Tandai Review')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      statusMutation.mutate({
                        id: selectedAsset.id,
                        status: 'APPROVED',
                      })
                    }
                    disabled={selectedAsset.status === 'APPROVED'}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('mediaCollab.approve', 'Setujui')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-text-primary"
                        aria-label={t('mediaCollab.moreActions', 'Tindakan lain')}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedAsset.id,
                            status: 'NEEDS_CHANGES',
                          })
                        }
                      >
                        {t('mediaCollab.requestChanges', 'Minta Revisi')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedAsset.id,
                            status: 'ARCHIVED',
                          })
                        }
                      >
                        {t('mediaCollab.archive', 'Arsipkan')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(t('mediaCollab.confirmDeleteAsset', 'Hapus "{{name}}"?', { name: selectedAsset.originalName }))) {
                            deleteAssetMutation.mutate(selectedAsset.id);
                          }
                        }}
                        className="text-danger focus:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t('mediaCollab.delete', 'Hapus')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Comments */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3 text-text-secondary">
                    <MessageCircle className="h-4 w-4" />
                    <h3 className="text-sm font-medium">
                      {t('mediaCollab.comments', 'Komentar')}
                      <span className="text-text-tertiary font-normal ml-1.5">
                        ({assetComments.length})
                      </span>
                    </h3>
                  </div>

                  <CommentList comments={assetComments} />

                  <CommentComposer
                    onSubmit={(text) => addCommentMutation.mutate(text)}
                    isPending={addCommentMutation.isPending}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ───────────────────────────────────────────────────────────
          Share sheet — toggle public sharing + copyable link.
         ─────────────────────────────────────────────────────────── */}
      <Sheet open={shareSheetOpen} onOpenChange={setShareSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-bg-base border-border-default text-text-primary p-0"
        >
          <SheetHeader className="border-b border-border-subtle p-5">
            <SheetTitle className="text-text-primary text-base font-display font-semibold">
              {t('mediaCollab.shareProject', 'Bagikan Proyek')}
            </SheetTitle>
            <SheetDescription className="text-text-tertiary text-xs">
              {t('mediaCollab.shareDesc', 'Aktifkan tautan publik agar klien bisa melihat dan memberi komentar tanpa login.')}
            </SheetDescription>
          </SheetHeader>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 p-4 rounded-md bg-bg-sunken border border-border-subtle">
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  {t('mediaCollab.publicLink', 'Tautan Publik')}
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">
                  {project.isPublic
                    ? t('mediaCollab.anyoneWithLink', 'Siapa pun dengan tautan dapat melihat.')
                    : t('mediaCollab.noPublicAccess', 'Tidak ada akses publik.')}
                </div>
              </div>
              {project.isPublic ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disableShareMutation.mutate()}
                  disabled={disableShareMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" /> {t('mediaCollab.disable', 'Nonaktifkan')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => enableShareMutation.mutate()}
                  disabled={enableShareMutation.isPending}
                >
                  <Globe className="h-3.5 w-3.5" /> {t('mediaCollab.enable', 'Aktifkan')}
                </Button>
              )}
            </div>

            {shareUrl && (
              <div className="space-y-2">
                <label className="text-xs text-text-tertiary uppercase tracking-wider">
                  URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                    <Input
                      readOnly
                      value={shareUrl}
                      className="pl-8 bg-bg-sunken border-border-subtle text-text-secondary text-xs font-mono"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  <Button size="sm" onClick={copyShareLink}>
                    <Copy className="h-3.5 w-3.5" /> {t('mediaCollab.copy', 'Salin')}
                  </Button>
                </div>
                {project.publicViewCount !== undefined && (
                  <div className="text-xs text-text-tertiary">
                    {t('mediaCollab.viewCountSoFar', '{{n}} views so far', { n: project.publicViewCount.toLocaleString('id-ID') })}
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components — kept in-file (no new shared primitives).          */
/* ------------------------------------------------------------------ */

interface AssetTileProps {
  asset: MediaAsset;
  mediaToken: string | null;
  onClick: () => void;
}

function AssetTile({ asset, mediaToken, onClick }: AssetTileProps) {
  const { t } = useTranslation();
  const isVideo = asset.mediaType === 'VIDEO';
  const src = asset.thumbnailUrl || (!isVideo ? asset.url : null);
  const proxied = src ? getProxyUrl(src, mediaToken) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-square rounded-md overflow-hidden',
        'bg-bg-sunken border border-border-subtle',
        'hover:border-border-default transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy/40',
      )}
    >
      {proxied ? (
        <img
          src={proxied}
          alt={asset.originalName}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
          {isVideo ? <Film className="h-8 w-8 stroke-1" /> : <ImageIcon className="h-8 w-8 stroke-1" />}
        </div>
      )}

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="rounded-full bg-bg-base/80 backdrop-blur-sm p-2.5 border border-border-subtle">
            <Play className="h-4 w-4 text-text-primary fill-text-primary" />
          </div>
        </div>
      )}

      {/* Status pill — only when meaningful (most assets are DRAFT; showing
          it on every tile is noise). Top-left, glassy. */}
      {asset.status && asset.status !== 'DRAFT' && (
        <div className="absolute left-1.5 top-1.5">
          <Badge
            variant="outline"
            className={cn(
              'border-transparent px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider backdrop-blur-sm',
              assetStatusChip(asset.status),
            )}
          >
            {t(`mediaCollab.assetStatus.${asset.status}`, ASSET_STATUS_LABEL[asset.status] ?? asset.status)}
          </Badge>
        </div>
      )}

      {/* Filename — bottom, on a light gradient. Appears on hover for desktop,
          always visible on touch where there is no hover. */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity">
        <div className="text-[10px] text-white/90 font-medium truncate text-left">
          {asset.originalName}
        </div>
      </div>
    </button>
  );
}

function UploadZone({ onPick }: { onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'rounded-md border-2 border-dashed border-border-subtle',
        'bg-bg-sunken/40 px-6 py-16 text-center',
      )}
    >
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-bg-raised border border-border-subtle flex items-center justify-center text-text-tertiary">
        <Upload className="h-5 w-5" />
      </div>
      <h3 className="text-base font-display font-semibold text-text-primary">
        {t('mediaCollab.noAssets', 'Belum ada aset')}
      </h3>
      <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
        {t('mediaCollab.noAssetsDesc', 'Unggah foto atau video pertama untuk mulai berkolaborasi dengan tim.')}
      </p>
      <Button onClick={onPick} size="sm" className="mt-5">
        <Upload className="h-4 w-4" /> {t('mediaCollab.pickFile', 'Pilih File')}
      </Button>
    </div>
  );
}

function CollectionRow({ collection }: { collection: MediaCollection }) {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-3 p-3 rounded-md bg-bg-sunken/40 border border-border-subtle">
      <div className="shrink-0 mt-0.5 h-8 w-8 rounded-md bg-bg-raised border border-border-subtle flex items-center justify-center">
        <Folder className="h-4 w-4 text-text-tertiary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-text-primary truncate">
            {collection.name}
          </div>
          {collection.type === 'SMART' && (
            <Badge
              variant="outline"
              className="border-transparent bg-accent-navy-wash text-text-secondary px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider"
            >
              Smart
            </Badge>
          )}
        </div>
        <div className="text-xs text-text-tertiary mt-0.5">
          {t('mediaCollab.collectionAssetCount', '{{count}} assets', { count: collection._count?.assets ?? 0 })}
        </div>
      </div>
    </li>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-0.5">
        {label}
      </div>
      <div className="text-sm text-text-secondary">{value}</div>
    </div>
  );
}

interface CommentListProps {
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string; email: string };
    status: 'OPEN' | 'RESOLVED';
  }>;
}

function CommentList({ comments }: CommentListProps) {
  const { t } = useTranslation();
  if (comments.length === 0) {
    return (
      <div className="rounded-md bg-bg-sunken/40 border border-border-subtle px-4 py-6 text-center text-xs text-text-tertiary mb-3">
        {t('mediaCollab.noComments', 'No comments yet.')}
      </div>
    );
  }
  return (
    <ol className="space-y-3 mb-3">
      {comments.map((c) => (
        <li
          key={c.id}
          className="p-3 rounded-md bg-bg-sunken/60 border border-border-subtle"
        >
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-[9px] font-medium">
                  {initialsOf(c.author?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-text-primary truncate">
                {c.author?.name ?? t('mediaCollab.anonymousAuthor', 'Anonymous')}
              </span>
              {c.status === 'RESOLVED' && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-success/10 text-success px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider shrink-0"
                >
                  {t('mediaCollab.resolved', 'Resolved')}
                </Badge>
              )}
            </div>
            <DateDisplay
              date={c.createdAt}
              className="text-[10px] text-text-tertiary shrink-0"
            />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {c.content}
          </p>
        </li>
      ))}
    </ol>
  );
}

function CommentComposer({
  onSubmit,
  isPending,
}: {
  onSubmit: (text: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('mediaCollab.commentPlaceholder', 'Write a comment...')}
        className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-xs"
      />
      <Button type="submit" size="sm" disabled={!text.trim() || isPending}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('mediaCollab.sendComment', 'Send')}
      </Button>
    </form>
  );
}
