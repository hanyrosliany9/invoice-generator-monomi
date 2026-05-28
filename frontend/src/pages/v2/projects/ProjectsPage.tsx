import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Pencil, Copy, Trash2, X,
  PlayCircle, CheckCircle2, PauseCircle,
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
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
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
import { projectService, type Project } from '@/services/projects';
import { clientService } from '@/services/clients';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — mirrors v2 invoices/clients exactly so the active     */
/*  state and rhythm read as one app, not a one-off list screen.       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status helpers — Bahasa labels + editorial badge palette. We       */
/*  intentionally avoid AntD's saturated Tag colors; status chips      */
/*  here lean on token wash backgrounds so the data, not the chip,     */
/*  carries the visual weight.                                         */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  PLANNING:    'Perencanaan',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED:   'Selesai',
  CANCELLED:   'Dibatalkan',
  ON_HOLD:     'Ditahan',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'IN_PROGRESS': return 'bg-info/10 text-info';
    case 'COMPLETED':   return 'bg-success/10 text-success';
    case 'CANCELLED':   return 'bg-danger/10 text-danger';
    case 'ON_HOLD':     return 'bg-warning/10 text-warning';
    case 'PLANNING':
    default:            return 'bg-bg-sunken text-text-tertiary';
  }
};

const getStatusLabel = (s?: string) => STATUS_LABEL[s?.toUpperCase() ?? ''] ?? (s ?? '—');

/* ------------------------------------------------------------------ */
/*  Numeric helpers — project numeric fields arrive as strings from    */
/*  the Prisma decimal columns, so guard every cast.                   */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const projectRevenue = (p: Project) =>
  toNumber(p.totalPaidAmount) || toNumber(p.basePrice) || toNumber(p.estimatedBudget);

const isThisMonth = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  /* ----- data ----- */
  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });

  // Clients drive the client filter dropdown. Light query, no risk of
  // ballooning context — the filter is the only consumer here.
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  /* ----- mutations ----- */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.deleted', 'Proyek berhasil dihapus.'));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('projects.deleteFailed', 'Gagal menghapus proyek.');
      toast.error(msg);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => projectService.duplicateProject(id),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.duplicated', `Proyek diduplikasi: ${created?.number ?? ''}`));
    },
    onError: () => toast.error(t('projects.duplicateFailed', 'Gagal menduplikasi proyek.')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      projectService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.statusUpdated', 'Status proyek berhasil diubah.'));
    },
    onError: () => toast.error(t('projects.statusFailed', 'Gagal mengubah status.')),
  });

  /* ----- derived: filtered list ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesSearch = !q
        || p.number?.toLowerCase().includes(q)
        || p.description?.toLowerCase().includes(q)
        || p.client?.name?.toLowerCase().includes(q)
        || p.client?.company?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesClient = clientFilter === 'all' || p.clientId === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [projects, searchText, statusFilter, clientFilter]);

  /* ----- derived: KPI band -----
     The band carries four numbers — two volume (active, completed this
     month) and two money (revenue earned, outstanding budget). Mirrors
     the InvoicesPage band so operators read the same shape twice.      */
  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING',
    );
    const completedThisMonth = projects.filter(
      (p) => p.status === 'COMPLETED' && isThisMonth(p.updatedAt),
    );
    const revenue = projects.reduce((acc, p) => acc + toNumber(p.totalPaidAmount), 0);
    const outstanding = projects.reduce((acc, p) => {
      // Outstanding = invoiced-but-unpaid (basePrice − paid), floored at 0.
      const billed = toNumber(p.basePrice);
      const paid = toNumber(p.totalPaidAmount);
      return acc + Math.max(billed - paid, 0);
    }, 0);
    return {
      activeCount: active.length,
      revenue,
      completedThisMonth: completedThisMonth.length,
      outstanding,
    };
  }, [projects]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all' || clientFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setClientFilter('all');
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
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
        <PageContainer>
          <EmptyState
            icon={<Folder className="h-12 w-12" />}
            title={t('projects.error.title', 'Tidak bisa memuat proyek')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- handlers ----- */
  const handleDelete = (p: Project) => {
    if (confirm(t('projects.confirmDelete', `Hapus proyek ${p.number}? Tindakan ini tidak bisa dibatalkan.`))) {
      deleteMutation.mutate(p.id);
    }
  };

  /* ----- render ----- */
  return (
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
      <PageContainer>
        <PageHeader
          title={t('projects.title', 'Proyek')}
          description={t(
            'projects.subtitle',
            'Kelola proyek aktif, pantau anggaran, dan lihat status pengerjaan.',
          )}
          actions={
            <Button onClick={() => navigate('/projects/new')} size="sm">
              <Plus className="h-4 w-4" />
              {t('projects.new', 'Proyek Baru')}
            </Button>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — four supporting numbers, tight gap so they read
            as one strip of context. Active and Revenue are the load-
            bearing items; CompletedThisMonth + Outstanding are quieter
            ambient stats.
           ───────────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  label={t('projects.kpi.active', 'Proyek Aktif')}
                  value={stats.activeCount}
                  sublabel={t('projects.kpi.activeSub', 'sedang berjalan')}
                />
                <StatCard
                  label={t('projects.kpi.revenue', 'Total Pendapatan')}
                  value={<MoneyDisplay amount={stats.revenue} />}
                  sublabel={t('projects.kpi.revenueSub', 'dari proyek terbayar')}
                />
                <StatCard
                  label={t('projects.kpi.completedMonth', 'Selesai Bulan Ini')}
                  value={stats.completedThisMonth}
                  sublabel={t('projects.kpi.completedMonthSub', 'di bulan berjalan')}
                />
                <StatCard
                  label={t('projects.kpi.outstanding', 'Belum Tertagih')}
                  value={<MoneyDisplay amount={stats.outstanding} />}
                  sublabel={t('projects.kpi.outstandingSub', 'menunggu pembayaran')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Filter + table — single GlassPanel so the strip and table
            share one surface. Filter strip uses sunken inner wells on
            its inputs to separate them from the table chrome without
            competing for weight.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Filter strip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t(
                  'projects.search.placeholder',
                  'Cari nomor, deskripsi, atau klien...',
                )}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                >
                  <SelectValue placeholder={t('projects.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('projects.filter.allStatuses', 'Semua Status')}
                  </SelectItem>
                  <SelectItem value="PLANNING">{STATUS_LABEL.PLANNING}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{STATUS_LABEL.IN_PROGRESS}</SelectItem>
                  <SelectItem value="COMPLETED">{STATUS_LABEL.COMPLETED}</SelectItem>
                  <SelectItem value="ON_HOLD">{STATUS_LABEL.ON_HOLD}</SelectItem>
                  <SelectItem value="CANCELLED">{STATUS_LABEL.CANCELLED}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px] max-w-[220px]"
                >
                  <SelectValue placeholder={t('projects.filter.client', 'Klien')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('projects.filter.allClients', 'Semua Klien')}
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
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

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Folder />}
              title={
                hasActiveFilters
                  ? t('projects.empty.filtered.title', 'Tidak ada proyek yang cocok')
                  : t('projects.empty.title', 'Belum ada proyek')
              }
              description={
                hasActiveFilters
                  ? t(
                      'projects.empty.filtered.desc',
                      'Coba ubah atau hapus filter Anda.',
                    )
                  : t(
                      'projects.empty.desc',
                      'Mulai dengan membuat proyek pertama Anda.',
                    )
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filter')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/projects/new')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('projects.new', 'Proyek Baru')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <ProjectTable
                rows={filtered}
                onRowClick={(row) => navigate(`/v2/projects/${row.id}`)}
                onView={(row) => navigate(`/v2/projects/${row.id}`)}
                onEdit={(row) => navigate(`/projects/${row.id}/edit`)}
                onDuplicate={(row) => duplicateMutation.mutate(row.id)}
                onStart={(row) => statusMutation.mutate({ id: row.id, status: 'IN_PROGRESS' })}
                onComplete={(row) => statusMutation.mutate({ id: row.id, status: 'COMPLETED' })}
                onHold={(row) => statusMutation.mutate({ id: row.id, status: 'ON_HOLD' })}
                onDelete={handleDelete}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectTable — extracted only inside this file (per task rules, no */
/*  new shared primitives). Editorial column rhythm: mono number →     */
/*  narrative description + client → status chip → quiet dates →       */
/*  right-aligned money → actions kebab.                               */
/* ------------------------------------------------------------------ */

interface ProjectTableProps {
  rows: Project[];
  onRowClick: (row: Project) => void;
  onView: (row: Project) => void;
  onEdit: (row: Project) => void;
  onDuplicate: (row: Project) => void;
  onStart: (row: Project) => void;
  onComplete: (row: Project) => void;
  onHold: (row: Project) => void;
  onDelete: (row: Project) => void;
}

function ProjectTable({
  rows, onRowClick, onView, onEdit, onDuplicate,
  onStart, onComplete, onHold, onDelete,
}: ProjectTableProps) {
  return (
    <DataTable<Project>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          accessorKey: 'number',
          header: 'Nomor',
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.number || '—'}
            </span>
          ),
        },
        {
          id: 'description',
          header: 'Proyek',
          accessorFn: (row) => row.description ?? '',
          cell: ({ row }) => {
            const p = row.original;
            return (
              <div className="min-w-0 max-w-[320px]">
                <div className="text-sm text-text-primary truncate">
                  {p.description || '—'}
                </div>
                {p.projectType?.name && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {p.projectType.name}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: 'client',
          header: 'Klien',
          accessorFn: (row) => row.client?.name ?? '',
          cell: ({ row }) => {
            const c = row.original.client;
            if (!c) return <span className="text-text-tertiary">—</span>;
            return (
              <div className="min-w-0 max-w-[220px]">
                <div className="text-sm text-text-primary truncate">{c.name}</div>
                {c.company && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {c.company}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(row.original.status),
              )}
            >
              {getStatusLabel(row.original.status)}
            </Badge>
          ),
        },
        {
          accessorKey: 'startDate',
          header: 'Mulai',
          cell: ({ row }) => (
            <span className="text-text-tertiary text-xs">
              <DateDisplay date={row.original.startDate ?? undefined} />
            </span>
          ),
        },
        {
          accessorKey: 'endDate',
          header: 'Selesai',
          cell: ({ row }) => (
            <span className="text-text-secondary text-xs">
              <DateDisplay date={row.original.endDate ?? undefined} />
            </span>
          ),
        },
        {
          id: 'value',
          accessorFn: (row) => projectRevenue(row),
          header: () => <span className="block text-right">Nilai</span>,
          cell: ({ row }) => {
            const value = projectRevenue(row.original);
            return (
              <div className="text-right">
                <MoneyDisplay
                  amount={value}
                  className={cn(
                    value > 0 ? 'text-text-primary' : 'text-text-tertiary',
                  )}
                />
              </div>
            );
          },
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const p = row.original;
            const canStart = p.status === 'PLANNING' || p.status === 'ON_HOLD';
            const canComplete = p.status === 'IN_PROGRESS';
            const canHold = p.status === 'IN_PROGRESS';
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label="Aksi proyek"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onView(p)}>
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Ubah
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(p)}>
                      <Copy className="h-3.5 w-3.5" /> Duplikasi
                    </DropdownMenuItem>
                    {(canStart || canComplete || canHold) && (
                      <DropdownMenuSeparator />
                    )}
                    {canStart && (
                      <DropdownMenuItem onClick={() => onStart(p)}>
                        <PlayCircle className="h-3.5 w-3.5" /> Mulai
                      </DropdownMenuItem>
                    )}
                    {canComplete && (
                      <DropdownMenuItem onClick={() => onComplete(p)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Selesaikan
                      </DropdownMenuItem>
                    )}
                    {canHold && (
                      <DropdownMenuItem onClick={() => onHold(p)}>
                        <PauseCircle className="h-3.5 w-3.5" /> Tahan
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(p)}
                      className="text-danger focus:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        },
      ]}
    />
  );
}
