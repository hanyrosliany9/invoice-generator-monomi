import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Trash2, Film, Image as ImageIcon,
  X, Eye, FolderOpen,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { mediaCollabService, type MediaProject } from '@/services/media-collab';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — identical shape to other v2 list pages so the active  */
/*  state and rhythm read as one app, not a one-off list screen.       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Page — a quiet hub. Three KPIs tell the operator "what's alive",   */
/*  filters narrow, the grid carries the work. We avoid duplicating    */
/*  the classic page's filter pill toggle (IMAGE/VIDEO) because the    */
/*  backend doesn't yet return per-type asset counts on the project    */
/*  list — a half-working filter is worse than none.                   */
/* ------------------------------------------------------------------ */

export default function MediaCollaborationPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'busiest'>('recent');

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['media-projects'],
    queryFn: () => mediaCollabService.getProjects(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaCollabService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-projects'] });
      toast.success(t('mediaCollab.deleteSuccess', 'Proyek media berhasil dihapus.'));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('mediaCollab.deleteFailed', 'Gagal menghapus proyek.'));
    },
  });

  /* ---- derived: filtered + sorted ---- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const matched = projects.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q)
        || (p.description?.toLowerCase().includes(q) ?? false)
        || (p.creator?.name?.toLowerCase().includes(q) ?? false)
      );
    });

    const sorted = [...matched];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'busiest':
        sorted.sort(
          (a, b) => (b._count?.assets ?? 0) - (a._count?.assets ?? 0),
        );
        break;
      case 'recent':
      default:
        sorted.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }
    return sorted;
  }, [projects, searchText, sortBy]);

  /* ---- derived: KPI band ----
     Three numbers: total projects, total assets across all projects,
     and number of publicly-shared projects. We avoid faking a "pending
     review" count — the classic page didn't expose one either, and a
     made-up KPI is the fastest way to look "AI-generated".            */
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalAssets = projects.reduce(
      (sum, p) => sum + (p._count?.assets ?? 0),
      0,
    );
    const sharedCount = projects.filter((p) => p.isPublic).length;
    return { totalProjects, totalAssets, sharedCount };
  }, [projects]);

  const hasActiveFilters = !!searchText;
  const resetFilters = () => setSearchText('');

  /* ---- shell wrapper ---- */
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

  /* ---- error short-circuit ---- */
  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title={t('mediaCollaboration.errorTitle', 'Tidak bisa memuat proyek media')}
          description={error instanceof Error ? error.message : t('mediaCollaboration.errorGeneric', 'Terjadi kesalahan.')}
          action={<Button onClick={() => refetch()}>{t('mediaCollaboration.retry', 'Coba Lagi')}</Button>}
        />
      </Shell>
    );
  }

  /* ---- handlers ---- */
  const handleDelete = (p: MediaProject) => {
    if (
      confirm(
        t('mediaCollab.confirmDelete', 'Hapus proyek "{{name}}"? Semua aset di dalamnya akan ikut terhapus.', { name: p.name }),
      )
    ) {
      deleteMutation.mutate(p.id);
    }
  };

  return (
    <Shell>
      <PageHeader
        title={t('mediaCollaboration.title', 'Kolaborasi Media')}
        description={t('mediaCollaboration.description', 'Ruang berbagi video dan foto untuk tim produksi — komentari, setujui, dan kirim ke klien.')}
        actions={
          <Button onClick={() => navigate('/media-collab')} size="sm">
            <Plus className="h-4 w-4" />
            {t('mediaCollab.newProject', 'Proyek Baru')}
          </Button>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          KPI band — three quiet numbers. Total Proyek and Aset are
          the load-bearing items; Tautan Publik is ambient, indicating
          how much of the workspace is exposed externally.
         ───────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
            </>
          ) : (
            <>
              <StatCard
                label={t('mediaCollab.kpi.totalProjects', 'Total Proyek')}
                value={stats.totalProjects}
                sublabel={t('mediaCollab.kpi.totalProjectsSub', 'ruang kerja media')}
              />
              <StatCard
                label={t('mediaCollab.kpi.totalAssets', 'Total Aset')}
                value={stats.totalAssets.toLocaleString('id-ID')}
                sublabel={t('mediaCollab.kpi.totalAssetsSub', 'video & foto tersimpan')}
              />
              <StatCard
                label={t('mediaCollab.kpi.publicLinks', 'Tautan Publik')}
                value={stats.sharedCount}
                sublabel={t('mediaCollab.kpi.publicLinksSub', 'proyek dibagikan ke klien')}
              />
            </>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Filter + grid — single GlassPanel so search and grid share
          one surface. Mirrors the projects list pattern but renders a
          card grid (richer than a row table for media work).
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t('mediaCollaboration.searchPlaceholder', 'Cari nama proyek, deskripsi, atau pembuat...')}
              className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger
                size="sm"
                className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
              >
                <SelectValue placeholder={t('mediaCollaboration.sortPlaceholder', 'Urutkan')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('mediaCollab.sort.recent', 'Terbaru diperbarui')}</SelectItem>
                <SelectItem value="name">{t('mediaCollab.sort.name', 'Nama (A → Z)')}</SelectItem>
                <SelectItem value="busiest">{t('mediaCollab.sort.busiest', 'Paling banyak aset')}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-[150px] rounded-lg" />
            <Skeleton className="h-[150px] rounded-lg" />
            <Skeleton className="h-[150px] rounded-lg" />
            <Skeleton className="h-[150px] rounded-lg" />
            <Skeleton className="h-[150px] rounded-lg" />
            <Skeleton className="h-[150px] rounded-lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title={
              hasActiveFilters
                ? t('mediaCollab.noMatch', 'Tidak ada proyek yang cocok')
                : t('mediaCollab.noProjects', 'Belum ada proyek media')
            }
            description={
              hasActiveFilters
                ? t('mediaCollab.noMatchDesc', 'Coba ubah atau hapus filter Anda.')
                : t('mediaCollab.noProjectsDesc', 'Mulai dengan membuat proyek media pertama Anda untuk berkolaborasi.')
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t('common.resetFilters', 'Reset Filter')}
                </Button>
              ) : (
                <Button onClick={() => navigate('/media-collab')} size="sm">
                  <Plus className="h-4 w-4" />
                  {t('mediaCollab.newProject', 'Proyek Baru')}
                </Button>
              )
            }
          />
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => navigate(`/v2/media-collab/projects/${p.id}`)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </GlassPanel>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectCard — a single card in the grid. Editorial: name + chips   */
/*  pin the top, description fills the middle, footer carries quiet    */
/*  metadata (creator + date) plus the kebab.                          */
/* ------------------------------------------------------------------ */

interface ProjectCardProps {
  project: MediaProject;
  onOpen: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const { t } = useTranslation();
  const assetCount = project._count?.assets ?? 0;
  const collaboratorCount = project._count?.collaborators ?? 0;
  const collectionCount = project._count?.collections ?? 0;

  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      className={cn(
        'group relative flex flex-col h-full p-5 rounded-lg border border-border-subtle',
        'bg-bg-sunken/60 hover:bg-bg-sunken transition-colors cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy/40',
      )}
    >
      {/* Top row — name + kebab */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-display font-semibold text-text-primary leading-tight truncate min-w-0">
          {project.name}
        </h3>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mt-1 -mr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={t('mediaCollab.projectActions', 'Aksi proyek')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpen}>
                <Eye className="h-3.5 w-3.5" /> {t('mediaCollab.open', 'Buka')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('mediaCollab.delete', 'Hapus')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem]">
        {project.description || t('mediaCollab.noDescription', 'Tanpa deskripsi.')}
      </p>

      {/* Counts strip */}
      <div className="flex items-center gap-4 text-xs text-text-tertiary mb-4">
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="text-text-secondary tabular-nums">{assetCount}</span>
          {t('mediaCollab.assets', 'aset')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span className="text-text-secondary tabular-nums">{collaboratorCount}</span>
          {t('mediaCollab.collaborators', 'kolaborator')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5" />
          <span className="text-text-secondary tabular-nums">{collectionCount}</span>
          {t('mediaCollab.collections', 'koleksi')}
        </span>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border-subtle/60 flex items-center justify-between gap-2 text-xs">
        <span className="text-text-tertiary truncate min-w-0">
          {t('mediaCollab.by', 'oleh')}{' '}
          <span className="text-text-secondary">
            {project.creator?.name ?? '—'}
          </span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {project.isPublic && (
            <Badge
              variant="outline"
              className="border-transparent bg-info/10 text-info px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            >
              {t('mediaCollab.public', 'Publik')}
            </Badge>
          )}
          <DateDisplay
            date={project.updatedAt}
            className="text-text-tertiary"
          />
        </div>
      </div>
    </article>
  );
}
