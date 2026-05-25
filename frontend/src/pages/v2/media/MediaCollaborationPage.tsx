import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Trash2, Film, Image as ImageIcon,
  X, Eye, FolderOpen,
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
/*  Page — a quiet hub. Three KPIs tell the operator "what's alive",   */
/*  filters narrow, the grid carries the work. We avoid duplicating    */
/*  the classic page's filter pill toggle (IMAGE/VIDEO) because the    */
/*  backend doesn't yet return per-type asset counts on the project    */
/*  list — a half-working filter is worse than none.                   */
/* ------------------------------------------------------------------ */

export default function MediaCollaborationPageV2() {
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
      toast.success('Proyek media berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus proyek.');
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

  /* ---- error short-circuit ---- */
  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<Film className="h-12 w-12" />}
          title="Tidak bisa memuat proyek media"
          description={error instanceof Error ? error.message : 'Terjadi kesalahan.'}
          action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
        />
      </Shell>
    );
  }

  /* ---- handlers ---- */
  const handleDelete = (p: MediaProject) => {
    if (
      confirm(
        `Hapus proyek "${p.name}"? Semua aset di dalamnya akan ikut terhapus.`,
      )
    ) {
      deleteMutation.mutate(p.id);
    }
  };

  return (
    <Shell>
      <PageHeader
        title="Kolaborasi Media"
        description="Ruang berbagi video dan foto untuk tim produksi — komentari, setujui, dan kirim ke klien."
        actions={
          <Button onClick={() => navigate('/media-collab')} size="sm">
            <Plus className="h-4 w-4" />
            Proyek Baru
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
                label="Total Proyek"
                value={stats.totalProjects}
                sublabel="ruang kerja media"
              />
              <StatCard
                label="Total Aset"
                value={stats.totalAssets.toLocaleString('id-ID')}
                sublabel="video & foto tersimpan"
              />
              <StatCard
                label="Tautan Publik"
                value={stats.sharedCount}
                sublabel="proyek dibagikan ke klien"
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
              placeholder="Cari nama proyek, deskripsi, atau pembuat..."
              className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger
                size="sm"
                className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
              >
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Terbaru diperbarui</SelectItem>
                <SelectItem value="name">Nama (A → Z)</SelectItem>
                <SelectItem value="busiest">Paling banyak aset</SelectItem>
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
                Reset
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
                ? 'Tidak ada proyek yang cocok'
                : 'Belum ada proyek media'
            }
            description={
              hasActiveFilters
                ? 'Coba ubah atau hapus filter Anda.'
                : 'Mulai dengan membuat proyek media pertama Anda untuk berkolaborasi.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filter
                </Button>
              ) : (
                <Button onClick={() => navigate('/media-collab')} size="sm">
                  <Plus className="h-4 w-4" />
                  Proyek Baru
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
                aria-label="Aksi proyek"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpen}>
                <Eye className="h-3.5 w-3.5" /> Buka
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem]">
        {project.description || 'Tanpa deskripsi.'}
      </p>

      {/* Counts strip */}
      <div className="flex items-center gap-4 text-xs text-text-tertiary mb-4">
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="text-text-secondary tabular-nums">{assetCount}</span>
          aset
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span className="text-text-secondary tabular-nums">{collaboratorCount}</span>
          kolaborator
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5" />
          <span className="text-text-secondary tabular-nums">{collectionCount}</span>
          koleksi
        </span>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border-subtle/60 flex items-center justify-between gap-2 text-xs">
        <span className="text-text-tertiary truncate min-w-0">
          oleh{' '}
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
              Publik
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
