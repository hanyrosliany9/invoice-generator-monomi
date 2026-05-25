import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Upload, Image as ImageIcon, Film, Play, Trash2,
  MoreHorizontal, Share2, Copy, Link as LinkIcon, MessageCircle,
  CheckCircle2, X, Loader2, Eye, Globe, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
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

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

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
  DRAFT:         'Draf',
  IN_REVIEW:     'Direview',
  NEEDS_CHANGES: 'Perlu Revisi',
  APPROVED:      'Disetujui',
  ARCHIVED:      'Diarsipkan',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MediaProjectDetailPageV2() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { mediaToken } = useMediaToken();

  /* ---------- local ui state ---------- */
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] =
    useState<'all' | 'IMAGE' | 'VIDEO'>('all');
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
      toast.success('Aset berhasil dihapus.');
      setSelectedAsset(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Gagal menghapus aset.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      mediaCollabService.updateAssetStatus(id, status),
    onSuccess: () => {
      invalidateAssets();
      toast.success('Status aset diperbarui.');
    },
    onError: () => toast.error('Gagal memperbarui status.'),
  });

  const enableShareMutation = useMutation({
    mutationFn: () => mediaCollabService.enablePublicSharing(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      toast.success('Tautan publik diaktifkan.');
    },
    onError: () => toast.error('Gagal mengaktifkan tautan publik.'),
  });

  const disableShareMutation = useMutation({
    mutationFn: () => mediaCollabService.disablePublicSharing(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      toast.success('Tautan publik dinonaktifkan.');
    },
    onError: () => toast.error('Gagal menonaktifkan tautan publik.'),
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) =>
      mediaCollabService.createComment({
        assetId: selectedAsset!.id,
        content: text,
      }),
    onSuccess: () => {
      refetchComments();
      toast.success('Komentar terkirim.');
    },
    onError: () => toast.error('Gagal mengirim komentar.'),
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
      toast.success(`"${file.name}" diunggah.`);
    } catch (err: any) {
      toast.error(`Gagal unggah "${file.name}": ${err?.response?.data?.message ?? err?.message ?? 'error'}`);
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

  /* ---------- share link ---------- */
  const shareUrl = project?.isPublic && project.publicShareToken
    ? `${window.location.origin}/media/public/${project.publicShareToken}`
    : null;

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Tautan disalin ke clipboard.');
    } catch {
      toast.error('Gagal menyalin tautan.');
    }
  };

  /* ---------- shell ---------- */
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
          title="Proyek tidak ditemukan"
          description={
            projectError instanceof Error
              ? projectError.message
              : 'Proyek ini mungkin sudah dihapus atau Anda tidak memiliki akses.'
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/media-collab')}>
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>
              <Button size="sm" onClick={() => refetchProject()}>Coba Lagi</Button>
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
          Kembali ke Kolaborasi Media
        </Link>
      </div>

      <PageHeader
        title={project.name}
        description={
          project.description
          || 'Ruang kolaborasi media — unggah, ulas, dan setujui aset bersama tim.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareSheetOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Bagikan
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Unggah Aset
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

      {/* ───────────────────────────────────────────────────────────
          Hero — single identity panel. Left: creator + client +
          collaborators avatar stack. Right: public sharing state
          (with copyable link if active). Avoids the classic page's
          stat-card sprawl.
         ─────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
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
                  Pemilik
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
                      Klien
                    </div>
                    <div className="text-sm text-text-primary">
                      {project.client.name}
                    </div>
                  </div>
                )}
                {project.project && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      Proyek Terhubung
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
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                Tautan Publik
              </div>
              <div className="flex lg:justify-end items-center gap-2">
                {project.isPublic ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-success/10 text-success px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  >
                    Aktif
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-bg-sunken text-text-tertiary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  >
                    Nonaktif
                  </Badge>
                )}
              </div>
              {project.publicViewCount !== undefined && project.isPublic && (
                <div className="text-xs text-text-tertiary mt-2">
                  {project.publicViewCount.toLocaleString('id-ID')} tampilan
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
                Atur Berbagi
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          KPI band — four supporting numbers. Total + Direview are
          the load-bearing items; Foto / Video are ambient breakdowns.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Aset"
            value={kpis.total}
            sublabel="file dalam proyek"
          />
          <StatCard
            label="Foto"
            value={kpis.images}
            sublabel="termasuk RAW"
          />
          <StatCard
            label="Video"
            value={kpis.videos}
            sublabel="klip & rekaman"
          />
          <StatCard
            label="Sedang Direview"
            value={kpis.inReview}
            sublabel="menunggu persetujuan"
          />
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Gallery — filter pill + grid of asset tiles. Header sticky
          inline (not a separate primitive). Click a tile to open
          the detail sheet on the right.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5 flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                Galeri Aset
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {assetsLoading
                  ? 'Memuat…'
                  : `${filteredAssets.length} dari ${assets.length} aset`}
              </p>
            </div>

            {/* Type filter — tab-style segmented control */}
            <div className="inline-flex p-0.5 rounded-md bg-bg-sunken border border-border-subtle text-xs">
              {(['all', 'IMAGE', 'VIDEO'] as const).map((opt) => {
                const label = opt === 'all' ? 'Semua' : opt === 'IMAGE' ? 'Foto' : 'Video';
                const active = mediaTypeFilter === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMediaTypeFilter(opt)}
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
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <UploadZone onPick={() => fileInputRef.current?.click()} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => (
                <AssetTile
                  key={asset.id}
                  asset={asset}
                  mediaToken={mediaToken}
                  onClick={() => setSelectedAsset(asset)}
                />
              ))}
            </div>
          )}
        </GlassPanel>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Collections — folder-like groupings. Quiet inline list.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                Koleksi
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {collectionsLoading
                  ? 'Memuat…'
                  : `${collections.length} koleksi`}
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
              title="Belum ada koleksi"
              description="Buat koleksi untuk mengelompokkan aset berdasarkan tema, rilis, atau klien."
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
                  Diunggah{' '}
                  <DateDisplay date={selectedAsset.uploadedAt} className="text-text-secondary" />
                  {selectedAsset.uploader?.name && (
                    <> oleh <span className="text-text-secondary">{selectedAsset.uploader.name}</span></>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="p-5 space-y-5">
                {/* Preview */}
                <div className="rounded-md bg-bg-sunken border border-border-subtle overflow-hidden">
                  {selectedAsset.mediaType === 'VIDEO' ? (
                    <div className="aspect-video flex flex-col items-center justify-center gap-2 text-text-tertiary">
                      <Play className="h-10 w-10 stroke-1" />
                      <span className="text-xs">Pratinjau video</span>
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
                  <MetaRow label="Tipe" value={selectedAsset.mediaType} />
                  <MetaRow label="Ukuran" value={formatBytes(Number(selectedAsset.size) || 0)} />
                  <MetaRow label="Format" value={selectedAsset.mimeType} />
                  <MetaRow
                    label="Status"
                    value={
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                          assetStatusChip(selectedAsset.status),
                        )}
                      >
                        {ASSET_STATUS_LABEL[selectedAsset.status] ?? selectedAsset.status}
                      </Badge>
                    }
                  />
                  {selectedAsset.width && selectedAsset.height && (
                    <MetaRow
                      label="Dimensi"
                      value={`${selectedAsset.width} × ${selectedAsset.height}`}
                    />
                  )}
                  {selectedAsset.duration && (
                    <MetaRow
                      label="Durasi"
                      value={`${Math.round(selectedAsset.duration)} dtk`}
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
                    <Eye className="h-3.5 w-3.5" /> Tandai Review
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
                    <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-text-primary"
                        aria-label="Tindakan lain"
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
                        Minta Revisi
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedAsset.id,
                            status: 'ARCHIVED',
                          })
                        }
                      >
                        Arsipkan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Hapus "${selectedAsset.originalName}"?`)) {
                            deleteAssetMutation.mutate(selectedAsset.id);
                          }
                        }}
                        className="text-danger focus:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Comments */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3 text-text-secondary">
                    <MessageCircle className="h-4 w-4" />
                    <h3 className="text-sm font-medium">
                      Komentar
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
              Bagikan Proyek
            </SheetTitle>
            <SheetDescription className="text-text-tertiary text-xs">
              Aktifkan tautan publik agar klien bisa melihat dan memberi komentar tanpa login.
            </SheetDescription>
          </SheetHeader>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 p-4 rounded-md bg-bg-sunken border border-border-subtle">
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  Tautan Publik
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">
                  {project.isPublic
                    ? 'Siapa pun dengan tautan dapat melihat.'
                    : 'Tidak ada akses publik.'}
                </div>
              </div>
              {project.isPublic ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disableShareMutation.mutate()}
                  disabled={disableShareMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" /> Nonaktifkan
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => enableShareMutation.mutate()}
                  disabled={enableShareMutation.isPending}
                >
                  <Globe className="h-3.5 w-3.5" /> Aktifkan
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
                    <Copy className="h-3.5 w-3.5" /> Salin
                  </Button>
                </div>
                {project.publicViewCount !== undefined && (
                  <div className="text-xs text-text-tertiary">
                    {project.publicViewCount.toLocaleString('id-ID')} tampilan sampai sekarang
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

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <div className="text-[11px] text-white font-medium truncate text-left">
          {asset.originalName}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <Badge
            variant="outline"
            className={cn(
              'border-transparent px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider',
              assetStatusChip(asset.status),
            )}
          >
            {ASSET_STATUS_LABEL[asset.status] ?? asset.status}
          </Badge>
          {asset.size && (
            <span className="text-[10px] text-white/70 tabular-nums">
              {formatBytes(Number(asset.size) || 0)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function UploadZone({ onPick }: { onPick: () => void }) {
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
        Belum ada aset
      </h3>
      <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
        Unggah foto atau video pertama untuk mulai berkolaborasi dengan tim.
      </p>
      <Button onClick={onPick} size="sm" className="mt-5">
        <Upload className="h-4 w-4" /> Pilih File
      </Button>
    </div>
  );
}

function CollectionRow({ collection }: { collection: MediaCollection }) {
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
          {collection._count?.assets ?? 0} aset
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
  if (comments.length === 0) {
    return (
      <div className="rounded-md bg-bg-sunken/40 border border-border-subtle px-4 py-6 text-center text-xs text-text-tertiary mb-3">
        Belum ada komentar.
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
                {c.author?.name ?? 'Anonim'}
              </span>
              {c.status === 'RESOLVED' && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-success/10 text-success px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider shrink-0"
                >
                  Selesai
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
        placeholder="Tulis komentar..."
        className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-xs"
      />
      <Button type="submit" size="sm" disabled={!text.trim() || isPending}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Kirim'}
      </Button>
    </form>
  );
}
