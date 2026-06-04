import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Pencil, Copy, Trash2, X,
  PlayCircle, CheckCircle2, PauseCircle, Clock, Ban,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
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

/* All five project statuses — order is intentional (lifecycle order). */
const PROJECT_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
] as const;

type ProjectStatus = typeof PROJECT_STATUSES[number];

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

/* Status icon used in the "Ubah Status" dropdown group. */
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'IN_PROGRESS': return <PlayCircle className="h-3.5 w-3.5" />;
    case 'COMPLETED':   return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'ON_HOLD':     return <PauseCircle className="h-3.5 w-3.5" />;
    case 'CANCELLED':   return <Ban className="h-3.5 w-3.5" />;
    case 'PLANNING':
    default:            return <Clock className="h-3.5 w-3.5" />;
  }
};

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
    placeholderData: (prev) => prev,
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
    onSuccess: (_data, deletedId) => {
      // Drop the row from the cached list immediately so the table updates
      // without a manual refresh, then invalidate to reconcile.
      queryClient.setQueriesData<Project[]>(
        { queryKey: ['projects'] },
        (old) =>
          Array.isArray(old) ? old.filter((p) => p.id !== deletedId) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.deleted', 'Project deleted successfully.'));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('projects.deleteFailed', 'Failed to delete project.');
      toast.error(msg);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => projectService.duplicateProject(id),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.duplicated', `Project duplicated: ${created?.number ?? ''}`));
    },
    onError: () => toast.error(t('projects.duplicateFailed', 'Failed to duplicate project.')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      projectService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.statusUpdated', 'Project status updated.'));
    },
    onError: () => toast.error(t('projects.statusFailed', 'Failed to update status.')),
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
      // Cancelled projects are not owed — exclude from outstanding.
      if (p.status === 'CANCELLED') return acc;
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
            title={t('projects.error.title', 'Could not load projects')}
            description={error instanceof Error ? error.message : t('common.errorOccurred', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- handlers ----- */
  const handleDelete = (p: Project) => {
    if (confirm(t('projects.confirmDelete', `Delete project {{number}}? This action cannot be undone.`, { number: p.number }))) {
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
          title={t('projects.title', 'Projects')}
          description={t(
            'projects.subtitle',
            'Manage active projects, track budgets, and monitor progress.',
          )}
          actions={
            <Button onClick={() => navigate('/projects/new')} size="sm">
              <Plus className="h-4 w-4" />
              {t('projects.new', 'New Project')}
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
                  label={t('projects.kpi.active', 'Active Projects')}
                  value={stats.activeCount}
                  sublabel={t('projects.kpi.activeSub', 'currently running')}
                />
                <StatCard
                  label={t('projects.kpi.revenue', 'Total Revenue')}
                  value={<MoneyDisplay amount={stats.revenue} />}
                  sublabel={t('projects.kpi.revenueSub', 'from paid projects')}
                />
                <StatCard
                  label={t('projects.kpi.completedMonth', 'Completed This Month')}
                  value={stats.completedThisMonth}
                  sublabel={t('projects.kpi.completedMonthSub', 'in current month')}
                />
                <StatCard
                  label={t('projects.kpi.outstanding', 'Outstanding')}
                  value={<MoneyDisplay amount={stats.outstanding} />}
                  sublabel={t('projects.kpi.outstandingSub', 'awaiting payment')}
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
                  'Search by number, description, or client...',
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
                    {t('projects.filter.allStatuses', 'All Statuses')}
                  </SelectItem>
                  <SelectItem value="PLANNING">{t('projects.status.PLANNING', 'Planning')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('projects.status.IN_PROGRESS', 'In Progress')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('projects.status.COMPLETED', 'Completed')}</SelectItem>
                  <SelectItem value="ON_HOLD">{t('projects.status.ON_HOLD', 'On Hold')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('projects.status.CANCELLED', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px] max-w-[220px]"
                >
                  <SelectValue placeholder={t('projects.filter.client', 'Client')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('projects.filter.allClients', 'All Clients')}
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
                  ? t('projects.empty.filtered.title', 'No matching projects')
                  : t('projects.empty.title', 'No projects yet')
              }
              description={
                hasActiveFilters
                  ? t(
                      'projects.empty.filtered.desc',
                      'Try changing or removing your filters.',
                    )
                  : t(
                      'projects.empty.desc',
                      'Start by creating your first project.',
                    )
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/projects/new')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('projects.new', 'New Project')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <ProjectTable
                rows={filtered}
                onRowClick={(row) => navigate(`/projects/${row.id}`)}
                onView={(row) => navigate(`/projects/${row.id}`)}
                onEdit={(row) => navigate(`/projects/${row.id}/edit`)}
                onDuplicate={(row) => duplicateMutation.mutate(row.id)}
                onStatusChange={(row, status) => statusMutation.mutate({ id: row.id, status })}
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
  onStatusChange: (row: Project, status: string) => void;
  onDelete: (row: Project) => void;
}

function ProjectTable({
  rows, onRowClick, onView, onEdit, onDuplicate,
  onStatusChange, onDelete,
}: ProjectTableProps) {
  const { t } = useTranslation();

  /* Translate a status key → display label. */
  const statusLabel = (s: string) => {
    switch (s) {
      case 'PLANNING':    return t('projects.status.PLANNING',    'Planning');
      case 'IN_PROGRESS': return t('projects.status.IN_PROGRESS', 'In Progress');
      case 'COMPLETED':   return t('projects.status.COMPLETED',   'Completed');
      case 'ON_HOLD':     return t('projects.status.ON_HOLD',     'On Hold');
      case 'CANCELLED':   return t('projects.status.CANCELLED',   'Cancelled');
      default:            return s || '—';
    }
  };

  return (
    <DataTable<Project>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          accessorKey: 'number',
          header: t('projects.col.number', 'Number'),
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.number || '—'}
            </span>
          ),
        },
        {
          id: 'description',
          header: t('projects.col.project', 'Project'),
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
          header: t('projects.col.client', 'Client'),
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
          header: t('projects.col.status', 'Status'),
          cell: ({ row }) => (
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(row.original.status),
              )}
            >
              {statusLabel(row.original.status ?? '')}
            </Badge>
          ),
        },
        {
          accessorKey: 'startDate',
          header: t('projects.col.startDate', 'Start'),
          cell: ({ row }) => (
            <span className="text-text-tertiary text-xs">
              <DateDisplay date={row.original.startDate ?? undefined} />
            </span>
          ),
        },
        {
          accessorKey: 'endDate',
          header: t('projects.col.endDate', 'End'),
          cell: ({ row }) => (
            <span className="text-text-secondary text-xs">
              <DateDisplay date={row.original.endDate ?? undefined} />
            </span>
          ),
        },
        {
          id: 'value',
          accessorFn: (row) => projectRevenue(row),
          header: () => (
            <span className="block text-right">
              {t('projects.col.value', 'Value')}
            </span>
          ),
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
          header: () => (
            <span className="sr-only">
              {t('projects.col.actions', 'Actions')}
            </span>
          ),
          cell: ({ row }) => {
            const p = row.original;
            const currentStatus = p.status ?? '';
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label={t('projects.actions.label', 'Project actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => onView(p)}>
                      <Eye className="h-3.5 w-3.5" />
                      {t('projects.actions.view', 'View')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {t('projects.actions.edit', 'Edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(p)}>
                      <Copy className="h-3.5 w-3.5" />
                      {t('projects.actions.duplicate', 'Duplicate')}
                    </DropdownMenuItem>

                    {/* ── Change Status group ── */}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-text-tertiary font-medium px-2 py-1">
                      {t('projects.actions.changeStatus', 'Change Status')}
                    </DropdownMenuLabel>
                    {PROJECT_STATUSES.map((s) => {
                      const isCurrent = s === currentStatus;
                      return (
                        <DropdownMenuItem
                          key={s}
                          disabled={isCurrent}
                          onClick={() => !isCurrent && onStatusChange(p, s)}
                          className={cn(isCurrent && 'opacity-50 cursor-default')}
                        >
                          <StatusIcon status={s} />
                          {statusLabel(s)}
                          {isCurrent && (
                            <span className="ml-auto">
                              <CheckCircle2 className="h-3 w-3 text-text-tertiary" />
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(p)}
                      className="text-danger focus:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('projects.actions.delete', 'Delete')}
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
