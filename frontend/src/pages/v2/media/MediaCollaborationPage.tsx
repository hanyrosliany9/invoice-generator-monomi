import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Folder,
  Plus, Search, MoreHorizontal, Trash2, Film,
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
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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

interface MediaCollabShellProps { children: React.ReactNode; user: import('@/store/auth').User | null; }
const MediaCollabShell = ({ children, user }: MediaCollabShellProps) => (
  <AppShell
    sidebar={{
      brand: <MonomiBrand />,
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    }}
    topbar={{}}
    disableSmoothScroll
  >
    <PageContainer>{children}</PageContainer>
  </AppShell>
);

export default function MediaCollaborationPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'busiest'>('recent');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

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

  const createMutation = useMutation({
    mutationFn: () =>
      mediaCollabService.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['media-projects'] });
      toast.success(t('mediaCollab.createSuccess', 'Proyek "{{name}}" berhasil dibuat.', { name: project.name }));
      setCreateDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      navigate(`/media-collab/projects/${project.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('mediaCollab.createFailed', 'Gagal membuat proyek.'));
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


  /* ---- error short-circuit ---- */
  if (error) {
    return (
      <MediaCollabShell user={user}>
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title={t('mediaCollaboration.errorTitle', 'Tidak bisa memuat proyek media')}
          description={error instanceof Error ? error.message : t('mediaCollaboration.errorGeneric', 'Terjadi kesalahan.')}
          action={<Button onClick={() => refetch()}>{t('mediaCollaboration.retry', 'Coba Lagi')}</Button>}
        />
      </MediaCollabShell>
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
    <MediaCollabShell user={user}>
      <PageHeader
        title={t('mediaCollaboration.title', 'Kolaborasi Media')}
        description={t('mediaCollaboration.description', 'Ruang berbagi video dan foto untuk tim produksi — komentari, setujui, dan kirim ke klien.')}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
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
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] rounded-xl" />
            ))}
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
                <Button onClick={() => setCreateDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  {t('mediaCollab.newProject', 'Proyek Baru')}
                </Button>
              )
            }
          />
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => navigate(`/media-collab/projects/${p.id}`)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </GlassPanel>
      {/* ─────────────────────────────────────────────────────────────
          Create Project Dialog
         ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setNewProjectName('');
            setNewProjectDescription('');
          }
        }}
      >
        <DialogContent className="bg-bg-base border-border-default text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-text-primary font-display font-semibold">
              {t('mediaCollab.createProject', 'Buat Proyek Media Baru')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t('mediaCollab.createProjectDesc', 'Beri nama proyek untuk memulai ruang kolaborasi media baru.')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newProjectName.trim()) return;
              createMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('mediaCollab.projectName', 'Nama Proyek')}
                <span className="text-danger ml-1">*</span>
              </label>
              <Input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('mediaCollab.projectNamePlaceholder', 'mis. Kampanye Q3 — Foto Produk')}
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {t('mediaCollab.projectDescription', 'Deskripsi')}
                <span className="text-text-tertiary ml-1 font-normal normal-case">{t('common.optional', '(opsional)')}</span>
              </label>
              <Input
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder={t('mediaCollab.projectDescriptionPlaceholder', 'Ringkasan singkat tujuan proyek ini…')}
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                maxLength={500}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                {t('common.cancel', 'Batal')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newProjectName.trim() || createMutation.isPending}
              >
                {createMutation.isPending
                  ? t('mediaCollab.creating', 'Membuat…')
                  : t('mediaCollab.createProjectSubmit', 'Buat Proyek')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MediaCollabShell>
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
        'group relative flex items-center gap-3.5 p-3.5 rounded-xl border border-border-subtle',
        'bg-bg-sunken/60 hover:bg-bg-sunken transition-colors cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy/40',
      )}
    >
      {/* Leading folder glyph — reads as a media workspace, Drive/iCloud-style. */}
      <div className="shrink-0 h-12 w-12 rounded-lg bg-bg-raised border border-border-subtle flex items-center justify-center text-text-tertiary group-hover:text-text-secondary transition-colors">
        <FolderOpen className="h-5 w-5" strokeWidth={1.5} />
      </div>

      {/* Body — name, then a single quiet meta line. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-display font-semibold text-text-primary leading-tight truncate min-w-0">
            {project.name}
          </h3>
          {project.isPublic && (
            <Badge
              variant="outline"
              className="shrink-0 border-transparent bg-info/10 text-info px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider"
            >
              {t('mediaCollab.public', 'Publik')}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-tertiary">
          <span className="tabular-nums text-text-secondary">{assetCount}</span>
          {t('mediaCollab.assets', 'aset')}
          {collaboratorCount > 0 && (
            <>
              <span className="text-border-default">·</span>
              <Users className="h-3 w-3" />
              <span className="tabular-nums text-text-secondary">{collaboratorCount}</span>
            </>
          )}
          {collectionCount > 0 && (
            <>
              <span className="text-border-default">·</span>
              <Folder className="h-3 w-3" />
              <span className="tabular-nums text-text-secondary">{collectionCount}</span>
            </>
          )}
          <span className="text-border-default">·</span>
          <DateDisplay date={project.updatedAt} className="text-text-tertiary" />
        </div>
        {project.description && (
          <p className="mt-1 text-xs text-text-secondary/80 leading-snug line-clamp-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Kebab */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-text-tertiary hover:text-text-primary md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity"
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
    </article>
  );
}
