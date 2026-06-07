/**
 * CollectionDetailPage (v2)
 *
 * A "collection" in this system is a curated subset of media assets that
 * lives inside a media project — either MANUAL (hand-picked) or SMART
 * (rule-based filter that auto-updates). The classic page exposed this as
 * a generic AntD card with a MediaLibrary grid. For v2 we reframe it as
 * an editorial record:
 *
 *   1. A hero panel that establishes identity (collection name, parent
 *      project chip, asset count, type badge, share/edit/delete actions).
 *   2. A KPI band — three quiet supporting numbers for the operator to
 *      understand the *shape* of the collection at a glance (total assets,
 *      images, videos).
 *   3. A single asset grid panel — native to the v2 chrome, no MediaLibrary
 *      AntD dependency. Thumbnails go through the existing media proxy so
 *      we don't re-invent auth.
 *
 * All chrome is pure black + navy ACCENT. No raw hex, no AntD.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
  ArrowLeft,
  Pencil,
  Trash2,
  MoreHorizontal,
  Sparkles,
  Image as ImageIcon,
  Video,
  Hash,
  ExternalLink,
  Layers,
  X,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  mediaCollabService,
  type MediaAsset,
  type MediaCollection,
} from '@/services/media-collab';
import { useMediaToken } from '@/hooks/useMediaToken';
import { getProxyUrl } from '@/utils/mediaProxy';

/* ------------------------------------------------------------------ */
/*  Smart-criteria types                                               */
/* ------------------------------------------------------------------ */

/**
 * Criteria that drive which backend smart-endpoint is called.
 *
 * NOTE: The backend UpdateCollectionDto only persists name/description.
 * The `filters` JSON column exists in the DB schema but the current
 * service layer does not expose it through the PUT endpoint.
 * Criteria are therefore used exclusively to drive which smart query
 * endpoint is called when the user presses "Apply & Run" — the live
 * result set updates the displayed member list for the session.
 * Persistence of criteria is deferred (noted in UI).
 */
type SmartMode = 'rating' | 'status' | 'unresolved';

interface SmartCriteria {
  mode: SmartMode;
  minRating: number; // 1-5, used when mode === 'rating'
  status: MediaAsset['status']; // used when mode === 'status'
  hasUnresolved: boolean; // used when mode === 'unresolved'
}

const DEFAULT_CRITERIA: SmartCriteria = {
  mode: 'rating',
  minRating: 4,
  status: 'APPROVED',
  hasUnresolved: true,
};

const STATUS_LABELS: Record<MediaAsset['status'], string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  NEEDS_CHANGES: 'Needs Changes',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const isImage = (a: MediaAsset) => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE';
const isVideo = (a: MediaAsset) => a.mediaType === 'VIDEO';

const formatBytes = (raw?: string | number) => {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CollectionDetailPageV2() {
  const { id: collectionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { mediaToken } = useMediaToken();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);

  // Smart-collection criteria editor
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [criteria, setCriteria] = useState<SmartCriteria>(DEFAULT_CRITERIA);
  // Assets returned by the last smart query run — null means "not yet run"
  const [smartAssets, setSmartAssets] = useState<MediaAsset[] | null>(null);
  const [smartRunning, setSmartRunning] = useState(false);

  const shell = {
    sidebar: {
      brand: <MonomiBrand />,
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
    topbar: {
      right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
  };

  /* ----- data ----- */
  const {
    data: collection,
    isLoading: collectionLoading,
    error: collectionError,
    refetch: refetchCollection,
  } = useQuery<MediaCollection>({
    queryKey: ['collection', collectionId],
    queryFn: () => mediaCollabService.getCollection(collectionId!),
    enabled: !!collectionId,
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery<MediaAsset[]>({
    queryKey: ['collection-assets', collectionId],
    queryFn: () => mediaCollabService.getCollectionAssets(collectionId!),
    enabled: !!collectionId,
  });

  // Project-level assets are only fetched when the Add Assets dialog opens.
  // No reason to pay the round-trip on every detail-page mount.
  const { data: projectAssets = [], isLoading: projectAssetsLoading } = useQuery<MediaAsset[]>({
    queryKey: ['media-assets', collection?.projectId],
    queryFn: () => mediaCollabService.getAssets(collection!.projectId),
    enabled: !!collection?.projectId && addOpen,
  });

  /* ----- mutations ----- */
  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mediaCollabService.updateCollection(collectionId!, data),
    onSuccess: () => {
      toast.success(t('collections.detail.updated', 'Koleksi berhasil diperbarui.'));
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['media-collections', collection?.projectId] });
      setEditOpen(false);
    },
    onError: () =>
      toast.error(t('collections.detail.updateFailed', 'Gagal memperbarui koleksi.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => mediaCollabService.deleteCollection(collectionId!),
    onSuccess: () => {
      toast.success(t('collections.detail.deleted', 'Koleksi berhasil dihapus.'));
      queryClient.invalidateQueries({ queryKey: ['media-collections', collection?.projectId] });
      navigate(`/media-collab/projects/${collection?.projectId}`);
    },
    onError: () =>
      toast.error(t('collections.detail.deleteFailed', 'Gagal menghapus koleksi.')),
  });

  const addAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) =>
      mediaCollabService.addAssetsToCollection(collectionId!, assetIds),
    onSuccess: (_data, variables) => {
      toast.success(
        t('collections.detail.added', '{{count}} aset ditambahkan ke koleksi.', {
          count: variables.length,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['collection-assets', collectionId] });
      setAddOpen(false);
      setSelectedAddIds([]);
    },
    onError: () =>
      toast.error(t('collections.detail.addFailed', 'Gagal menambahkan aset.')),
  });

  const removeAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) =>
      mediaCollabService.removeAssetsFromCollection(collectionId!, assetIds),
    onSuccess: () => {
      toast.success(t('collections.detail.removed', 'Aset berhasil dihapus dari koleksi.'));
      queryClient.invalidateQueries({ queryKey: ['collection-assets', collectionId] });
    },
    onError: () =>
      toast.error(t('collections.detail.removeFailed', 'Gagal menghapus aset.')),
  });

  /* ----- smart query runner ----- */
  const runSmartQuery = useCallback(
    async (c: SmartCriteria) => {
      if (!collection?.projectId) return;
      setSmartRunning(true);
      try {
        let result: MediaAsset[] = [];
        if (c.mode === 'rating') {
          result = await mediaCollabService.getSmartCollectionByRating(
            collection.projectId,
            c.minRating,
          );
        } else if (c.mode === 'status') {
          result = await mediaCollabService.getSmartCollectionByStatus(
            collection.projectId,
            c.status,
          );
        } else {
          result = await mediaCollabService.getSmartCollectionUnresolved(collection.projectId);
        }
        setSmartAssets(result);
        toast.success(
          t('smartCollection.queryRan', 'Kueri dijalankan — {{count}} aset cocok.', {
            count: result.length,
          }),
        );
      } catch {
        toast.error(t('smartCollection.queryFailed', 'Gagal menjalankan kueri cerdas.'));
      } finally {
        setSmartRunning(false);
      }
    },
    [collection?.projectId, t],
  );

  const handleApplyCriteria = async () => {
    // Run the smart query so the member list refreshes.
    // Criteria persistence is deferred (UpdateCollectionDto doesn't expose
    // the filters JSON column yet).
    await runSmartQuery(criteria);
    setCriteriaOpen(false);
  };

  /* ----- derived ----- */
  const isSmart = !!collection?.isSmartCollection || collection?.type === 'SMART';

  // For SMART collections, prefer the live smart-query result over the stored
  // member list (which may be empty since smart assets aren't stored as items).
  const displayAssets = isSmart && smartAssets !== null ? smartAssets : assets;

  const counts = useMemo(() => {
    const total = displayAssets.length;
    const images = displayAssets.filter(isImage).length;
    const videos = displayAssets.filter(isVideo).length;
    const totalBytes = displayAssets.reduce((acc, a) => acc + Number(a.size ?? 0), 0);
    return { total, images, videos, totalBytes };
  }, [displayAssets]);

  const availableAssets = useMemo(() => {
    if (!projectAssets.length || !assets.length) return projectAssets;
    const inCollection = new Set(assets.map((a) => a.id));
    return projectAssets.filter((a) => !inCollection.has(a.id));
  }, [projectAssets, assets]);

  /* ----- handlers ----- */
  const handleEdit = () => {
    if (!collection) return;
    setEditName(collection.name ?? '');
    setEditDescription(collection.description ?? '');
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error(t('collections.detail.nameRequired', 'Nama koleksi wajib diisi.'));
      return;
    }
    updateMutation.mutate({
      name: trimmed,
      description: editDescription.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (!collection) return;
    const ok = window.confirm(
      t(
        'collections.detail.confirmDelete',
        'Hapus koleksi "{{name}}"? Tindakan ini tidak bisa dibatalkan.',
        { name: collection.name },
      ),
    );
    if (ok) deleteMutation.mutate();
  };

  const handleRemoveAsset = (asset: MediaAsset) => {
    const ok = window.confirm(
      t(
        'collections.detail.confirmRemove',
        'Hapus "{{name}}" dari koleksi? Aset tidak akan terhapus dari proyek.',
        { name: asset.originalName || asset.filename },
      ),
    );
    if (ok) removeAssetsMutation.mutate([asset.id]);
  };

  const handleCopyShare = () => {
    if (!collection) return;
    // Lightweight share: copies the deep link to clipboard. The classic page
    // had no real "publish" endpoint for collections, so this is the most
    // honest action we can offer without lying about persistence.
    const url = `${window.location.origin}/v2/collections/${collection.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success(t('collections.detail.linkCopied', 'Tautan koleksi disalin.')))
      .catch(() =>
        toast.error(t('collections.detail.linkCopyFailed', 'Gagal menyalin tautan.')),
      );
  };

  const toggleAddSelection = (id: string) => {
    setSelectedAddIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /* ----- error / not-found ----- */
  if (collectionError || (!collectionLoading && !collection)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('collections.detail.notFoundTitle', 'Koleksi tidak ditemukan')}
            breadcrumbs={[
              { label: t('collections.title', 'Koleksi'), href: '/media' },
              { label: t('collections.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Layers className="h-12 w-12" />}
            title={t('collections.detail.notFoundTitle', 'Koleksi tidak ditemukan')}
            description={
              collectionError instanceof Error
                ? collectionError.message
                : t(
                    'collections.detail.notFoundDesc',
                    'Koleksi yang Anda cari tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetchCollection()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate(-1)}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('common.back', 'Kembali')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- loading skeleton ----- */
  if (collectionLoading || !collection) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('collections.title', 'Koleksi'), href: '/media' },
              { label: '…' },
            ]}
          />
          <section className="mb-12">
            <Skeleton className="h-[180px] rounded-lg" />
          </section>
          <section className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
            </div>
          </section>
          <Skeleton className="h-[420px] rounded-lg" />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- render ----- */
  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={collection.name}
          breadcrumbs={[
            { label: t('collections.media', 'Media'), href: '/media' },
            {
              label: t('collections.project', 'Proyek'),
              href: `/media/project/${collection.projectId}`,
            },
            { label: collection.name },
          ]}
          description={
            collection.description ||
            (isSmart
              ? t(
                  'collections.detail.smartSub',
                  'Koleksi cerdas — diperbarui otomatis berdasarkan kriteria.',
                )
              : t(
                  'collections.detail.manualSub',
                  'Koleksi manual — pilih aset yang ingin Anda kelompokkan.',
                ))
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/media-collab/projects/${collection.projectId}`)}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.back', 'Kembali')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShare}
                className="border-border-subtle"
              >
                <ExternalLink className="h-4 w-4" />
                {t('collections.detail.copyLink', 'Salin Tautan')}
              </Button>
              {isSmart && (
                <Button
                  onClick={() => setCriteriaOpen(true)}
                  size="sm"
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t('smartCollection.editCriteria', 'Kriteria')}
                </Button>
              )}
              <Button
                onClick={handleEdit}
                variant="outline"
                size="sm"
                className="border-border-subtle"
              >
                <Pencil className="h-4 w-4" />
                {t('common.edit', 'Ubah')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-text-secondary hover:text-text-primary"
                    aria-label={t('common.moreActions', 'Tindakan lainnya')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-bg-raised border-border-subtle">
                  {!isSmart && (
                    <>
                      <DropdownMenuItem onSelect={() => setAddOpen(true)}>
                        <Layers className="h-3.5 w-3.5" />
                        {t('collections.detail.addAssets', 'Tambah Aset')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteMutation.isPending
                      ? t('common.deleting', 'Menghapus…')
                      : t('common.delete', 'Hapus')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {/* ────────────────────────────────────────────────────────
            Identity panel — single editorial block. Avatar slot is
            a folder icon glyph; right side lists metadata as quiet
            definition pairs. The smart/manual badge is the type
            anchor for the operator.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <GlassPanel surface="glass" padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-start">
              <div className="flex items-start gap-5">
                <div className="h-16 w-16 shrink-0 rounded-md bg-accent-navy-wash flex items-center justify-center">
                  <Folder className="h-7 w-7 text-text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-display font-semibold text-text-primary tracking-tight leading-tight">
                    {collection.name}
                  </h2>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                        isSmart ? 'bg-info/10 text-info' : 'bg-bg-sunken text-text-tertiary',
                      )}
                    >
                      <Sparkles className="mr-1.5 h-3 w-3" />
                      {isSmart
                        ? t('collections.type.smart', 'Cerdas')
                        : t('collections.type.manual', 'Manual')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-border-subtle bg-bg-sunken text-text-tertiary px-2 py-0.5 text-[11px] font-medium tracking-wide"
                    >
                      {t('collections.detail.assetCount', '{{count}} aset', {
                        count: counts.total,
                      })}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <MetaRow
                  icon={<Folder className="h-3.5 w-3.5" />}
                  label={t('collections.detail.parentProject', 'Proyek Induk')}
                  value={
                    <a
                      href={`/media/project/${collection.projectId}`}
                      className="text-text-primary hover:text-brand-cream transition-colors truncate inline-flex items-center gap-1"
                    >
                      {collection.projectId.slice(0, 8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
                <MetaRow
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label={t('collections.detail.id', 'ID Koleksi')}
                  value={
                    <span className="font-mono tabular-nums text-xs">
                      {collection.id.slice(0, 12)}…
                    </span>
                  }
                />
                <MetaRow
                  icon={<Layers className="h-3.5 w-3.5" />}
                  label={t('collections.detail.totalSize', 'Total Ukuran')}
                  value={
                    <span className="font-mono tabular-nums">{formatBytes(counts.totalBytes)}</span>
                  }
                />
                {collection.description && (
                  <div className="sm:col-span-2">
                    <MetaRow
                      icon={<FileText className="h-3.5 w-3.5" />}
                      label={t('collections.detail.description', 'Deskripsi')}
                      value={
                        <span className="leading-relaxed text-text-secondary">
                          {collection.description}
                        </span>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ────────────────────────────────────────────────────────
            KPI band — content shape at a glance. Three cards keeps
            the rhythm calm; we don't pretend to have four numbers
            when "average rating" would be empty for most collections.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label={t('collections.detail.kpi.assets', 'Total Aset')}
              value={counts.total}
              sublabel={
                isSmart
                  ? t('collections.detail.kpi.assetsSmart', 'sesuai kriteria')
                  : t('collections.detail.kpi.assetsManual', 'dikurasi manual')
              }
            />
            <StatCard
              label={t('collections.detail.kpi.images', 'Gambar')}
              value={counts.images}
              sublabel={t('collections.detail.kpi.imagesSub', 'foto & RAW')}
            />
            <StatCard
              label={t('collections.detail.kpi.videos', 'Video')}
              value={counts.videos}
              sublabel={t('collections.detail.kpi.videosSub', 'klip')}
            />
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            Asset grid — single GlassPanel. The native v2 grid means
            we don't drag the AntD MediaLibrary into the new chrome
            and lose the editorial feel.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('collections.detail.gridTitle', 'Aset dalam Koleksi')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {assetsLoading || smartRunning
                    ? t('common.loading', 'Memuat…')
                    : t('collections.detail.assetCount', '{{count}} aset', {
                        count: counts.total,
                      })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSmart && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runSmartQuery(criteria)}
                    disabled={smartRunning}
                    className="border-border-subtle"
                  >
                    <RefreshCw className={cn('h-4 w-4', smartRunning && 'animate-spin')} />
                    {t('smartCollection.runQuery', 'Jalankan Kueri')}
                  </Button>
                )}
                {!isSmart && counts.total > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddOpen(true)}
                    className="border-border-subtle"
                  >
                    <Layers className="h-4 w-4" />
                    {t('collections.detail.addAssets', 'Tambah Aset')}
                  </Button>
                )}
              </div>
            </div>

            {/* Smart collection callout — shown before the first query run */}
            {isSmart && smartAssets === null && !assetsLoading && (
              <div className="mb-4 flex items-start gap-3 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(
                    'smartCollection.callout',
                    'Ini adalah koleksi cerdas — anggotanya ditentukan oleh kriteria, bukan pilihan manual. Klik "Kriteria" untuk mengatur filter lalu "Jalankan Kueri" untuk melihat hasilnya.',
                  )}
                </p>
              </div>
            )}

            {assetsLoading || smartRunning ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : displayAssets.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-12 w-12" />}
                title={
                  isSmart
                    ? t('collections.detail.emptySmart', 'Tidak ada aset yang cocok')
                    : t('collections.detail.emptyManual', 'Koleksi masih kosong')
                }
                description={
                  isSmart
                    ? t(
                        'collections.detail.emptySmartDesc',
                        'Sesuaikan kriteria koleksi cerdas untuk menampilkan aset.',
                      )
                    : t(
                        'collections.detail.emptyManualDesc',
                        'Tambahkan aset dari proyek untuk memulai kurasi.',
                      )
                }
                action={
                  isSmart ? (
                    <Button
                      onClick={() => setCriteriaOpen(true)}
                      size="sm"
                      className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {t('smartCollection.editCriteria', 'Kriteria')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setAddOpen(true)}
                      size="sm"
                      className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                    >
                      <Layers className="h-4 w-4" />
                      {t('collections.detail.addAssets', 'Tambah Aset')}
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {displayAssets.map((asset) => (
                  <AssetTile
                    key={asset.id}
                    asset={asset}
                    mediaToken={mediaToken}
                    onRemove={!isSmart ? () => handleRemoveAsset(asset) : undefined}
                  />
                ))}
              </div>
            )}
          </GlassPanel>
        </section>

        {/* ────────────────────────────────────────────────────────
            Smart criteria editor dialog.
            Supports three backend query modes:
              - rating     → minimum star rating (1-5)
              - status     → asset review status enum
              - unresolved → assets with open frame comments
            Criteria drive which smart endpoint is called on "Apply & Run".
            Persistence is deferred — UpdateCollectionDto doesn't expose
            the filters JSON column yet (noted in UI).
           ──────────────────────────────────────────────────────── */}
        <Dialog open={criteriaOpen} onOpenChange={setCriteriaOpen}>
          <DialogContent className="bg-bg-raised border-border-subtle">
            <DialogHeader>
              <DialogTitle>
                {t('smartCollection.dialogTitle', 'Kriteria Koleksi Cerdas')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'smartCollection.dialogDesc',
                  'Pilih filter yang menentukan aset mana yang masuk ke koleksi ini. Anggota diperbarui setiap kali Anda menjalankan kueri.',
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-1">
              {/* Mode selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                  {t('smartCollection.modeLabel', 'Jenis Filter')}
                </Label>
                <Select
                  value={criteria.mode}
                  onValueChange={(v) =>
                    setCriteria((prev) => ({ ...prev, mode: v as SmartMode }))
                  }
                >
                  <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    <SelectItem value="rating">
                      {t('smartCollection.modeRating', 'Rating Bintang Minimum')}
                    </SelectItem>
                    <SelectItem value="status">
                      {t('smartCollection.modeStatus', 'Status Review')}
                    </SelectItem>
                    <SelectItem value="unresolved">
                      {t('smartCollection.modeUnresolved', 'Ada Komentar Belum Selesai')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating sub-field */}
              {criteria.mode === 'rating' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                    {t('smartCollection.minRatingLabel', 'Rating Minimum (1–5)')}
                  </Label>
                  <Select
                    value={String(criteria.minRating)}
                    onValueChange={(v) =>
                      setCriteria((prev) => ({ ...prev, minRating: Number(v) }))
                    }
                  >
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-raised border-border-subtle">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {'★'.repeat(n)}
                          {'☆'.repeat(5 - n)} ({n})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-text-tertiary">
                    {t(
                      'smartCollection.minRatingHint',
                      'Tampilkan semua aset dengan rating ≥ nilai ini.',
                    )}
                  </p>
                </div>
              )}

              {/* Status sub-field */}
              {criteria.mode === 'status' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                    {t('smartCollection.statusLabel', 'Status Aset')}
                  </Label>
                  <Select
                    value={criteria.status}
                    onValueChange={(v) =>
                      setCriteria((prev) => ({
                        ...prev,
                        status: v as MediaAsset['status'],
                      }))
                    }
                  >
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-raised border-border-subtle">
                      {(Object.entries(STATUS_LABELS) as [MediaAsset['status'], string][]).map(
                        ([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Unresolved comments sub-field */}
              {criteria.mode === 'unresolved' && (
                <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3">
                  <Switch
                    id="unresolved-toggle"
                    checked={criteria.hasUnresolved}
                    onCheckedChange={(v) =>
                      setCriteria((prev) => ({ ...prev, hasUnresolved: v }))
                    }
                  />
                  <Label
                    htmlFor="unresolved-toggle"
                    className="cursor-pointer text-sm text-text-secondary leading-relaxed"
                  >
                    {t(
                      'smartCollection.unresolvedLabel',
                      'Tampilkan aset yang memiliki komentar frame belum diselesaikan.',
                    )}
                  </Label>
                </div>
              )}

              {/* Persistence notice */}
              <p className="text-[11px] text-text-tertiary leading-relaxed border-t border-border-subtle pt-3">
                {t(
                  'smartCollection.autoUpdateNote',
                  'Koleksi cerdas diperbarui otomatis setiap kali Anda menekan "Jalankan Kueri". Kriteria belum disimpan ke server — fitur persistensi sedang dalam pengembangan.',
                )}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCriteriaOpen(false)}>
                {t('common.cancel', 'Batal')}
              </Button>
              <Button
                onClick={handleApplyCriteria}
                disabled={smartRunning}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                {smartRunning
                  ? t('smartCollection.applying', 'Menjalankan…')
                  : t('smartCollection.apply', 'Terapkan & Jalankan')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ────────────────────────────────────────────────────────
            Edit dialog — name + description. Available for both
            MANUAL and SMART collections.
           ──────────────────────────────────────────────────────── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-bg-raised border-border-subtle">
            <DialogHeader>
              <DialogTitle>
                {t('collections.detail.editTitle', 'Ubah Koleksi')}
              </DialogTitle>
              <DialogDescription>
                {t('collections.detail.editDesc', 'Perbarui nama dan deskripsi koleksi.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                  {t('collections.detail.fieldName', 'Nama')}
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('collections.detail.namePlaceholder', 'mis. Final Deliverables')}
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                  {t('collections.detail.fieldDescription', 'Deskripsi')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder={t('collections.detail.descPlaceholder', 'Apa isi koleksi ini?')}
                  className="w-full rounded-md bg-bg-sunken border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary px-3 py-2 leading-relaxed focus:outline-none focus:ring-1 focus:ring-border-strong resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                {t('common.cancel', 'Batal')}
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                {updateMutation.isPending
                  ? t('common.saving', 'Menyimpan…')
                  : t('common.save', 'Simpan')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ────────────────────────────────────────────────────────
            Add-assets dialog — pick aset proyek yang belum ada.
           ──────────────────────────────────────────────────────── */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="bg-bg-raised border-border-subtle max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {t('collections.detail.addTitle', 'Tambah Aset ke Koleksi')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'collections.detail.addDesc',
                  'Aset yang sudah ada di koleksi tidak ditampilkan. {{count}} terpilih.',
                  { count: selectedAddIds.length },
                )}
              </DialogDescription>
            </DialogHeader>

            {projectAssetsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : availableAssets.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-12 w-12" />}
                title={t(
                  'collections.detail.allAdded',
                  'Semua aset proyek sudah ada di koleksi',
                )}
                description={t(
                  'collections.detail.allAddedDesc',
                  'Tidak ada aset baru untuk ditambahkan.',
                )}
              />
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableAssets.map((asset) => {
                    const selected = selectedAddIds.includes(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAddSelection(asset.id)}
                        className={cn(
                          'group relative rounded-md overflow-hidden border transition-colors text-left',
                          selected
                            ? 'border-brand-cream bg-bg-panel'
                            : 'border-border-subtle bg-bg-sunken hover:border-border-default',
                        )}
                      >
                        <div className="aspect-square bg-bg-base flex items-center justify-center">
                          {asset.thumbnailUrl ? (
                            <img
                              src={getProxyUrl(asset.thumbnailUrl, mediaToken)}
                              alt={asset.originalName || asset.filename}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <PlaceholderGlyph asset={asset} />
                          )}
                        </div>
                        <div className="px-2 py-1.5">
                          <div className="text-[11px] text-text-primary truncate">
                            {asset.originalName || asset.filename}
                          </div>
                          <div className="text-[10px] text-text-tertiary truncate">
                            {asset.mediaType}
                          </div>
                        </div>
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-brand-cream text-brand-black flex items-center justify-center text-[10px] font-semibold tabular-nums">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  setSelectedAddIds([]);
                }}
              >
                {t('common.cancel', 'Batal')}
              </Button>
              <Button
                onClick={() => {
                  if (selectedAddIds.length === 0) {
                    toast.error(
                      t('collections.detail.selectAtLeastOne', 'Pilih minimal satu aset.'),
                    );
                    return;
                  }
                  addAssetsMutation.mutate(selectedAddIds);
                }}
                disabled={
                  addAssetsMutation.isPending ||
                  selectedAddIds.length === 0 ||
                  availableAssets.length === 0
                }
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                {addAssetsMutation.isPending
                  ? t('common.adding', 'Menambahkan…')
                  : t('collections.detail.addCount', 'Tambahkan ({{count}})', {
                      count: selectedAddIds.length,
                    })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Local helpers — kept here so we don't add one-off primitives.       */
/* ------------------------------------------------------------------ */

interface MetaRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const MetaRow = ({ icon, label, value }: MetaRowProps) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
      <span className="text-text-tertiary">{icon}</span>
      {label}
    </div>
    <div className="mt-1 text-sm text-text-primary truncate">{value}</div>
  </div>
);

interface AssetTileProps {
  asset: MediaAsset;
  mediaToken?: string | null;
  onRemove?: () => void;
}

const AssetTile = ({ asset, mediaToken, onRemove }: AssetTileProps) => (
  <div className="group relative rounded-md overflow-hidden border border-border-subtle bg-bg-sunken">
    <div className="aspect-square bg-bg-base flex items-center justify-center overflow-hidden">
      {asset.thumbnailUrl ? (
        <img
          src={getProxyUrl(asset.thumbnailUrl, mediaToken)}
          alt={asset.originalName || asset.filename}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <PlaceholderGlyph asset={asset} />
      )}
    </div>
    <div className="px-2 py-1.5">
      <div className="text-[11px] text-text-primary truncate">
        {asset.originalName || asset.filename}
      </div>
      <div className="text-[10px] text-text-tertiary truncate flex items-center gap-1.5">
        <span>{asset.mediaType}</span>
        <span className="text-border-strong">•</span>
        <span className="tabular-nums">{formatBytes(asset.size)}</span>
      </div>
    </div>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-bg-overlay text-text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-danger/30"
        aria-label="Remove from collection"
      >
        <X className="h-3 w-3" />
      </button>
    )}
  </div>
);

const PlaceholderGlyph = ({ asset }: { asset: MediaAsset }) => {
  if (isVideo(asset)) {
    return <Video className="h-8 w-8 text-text-tertiary" strokeWidth={1.5} />;
  }
  if (isImage(asset)) {
    return <ImageIcon className="h-8 w-8 text-text-tertiary" strokeWidth={1.5} />;
  }
  return <FileText className="h-8 w-8 text-text-tertiary" strokeWidth={1.5} />;
};
