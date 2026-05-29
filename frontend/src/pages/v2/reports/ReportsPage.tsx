/**
 * ReportsPage (v2) — Catalog of financial & analytic reports.
 *
 * Editorial decision:
 *   The classic ReportsPage is one big "analytics dashboard" with revenue,
 *   payment, top-clients, top-projects all on the same screen. For v2 we
 *   reframe it as a *catalog*: the page answers "which reports exist, and
 *   which one do I want?" The detail view (ReportDetailPage) is where the
 *   numbers actually live. This separation matches the v2 list/detail
 *   pattern used by Projects, Invoices, etc.
 *
 *   We surface the four canonical analytic surfaces (revenue, payment,
 *   client, project) as static report cards — they're routes into the
 *   detail page with a `reportType` slug. Beneath the catalog we list the
 *   saved social-media reports (the data-driven, project-scoped reports).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, BarChart3,
  Plus, Search, MoreHorizontal, Eye, Trash2, X, Download,
  TrendingUp, PieChart, LineChart as LineChartIcon, Building2, Sparkles,
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
import { useReports, useReportMutations } from '@/features/reports/hooks';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { reportsService } from '@/services/reports';
import type { SocialMediaReport, ReportStatus } from '@/features/reports/types/report.types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — adds Reports to keep parity with the rest of v2.         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draft',
  COMPLETED: 'Completed',
  SENT:      'Sent',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-success/10 text-success';
    case 'SENT':      return 'bg-info/10 text-info';
    case 'DRAFT':
    default:          return 'bg-bg-sunken text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Canonical analytic reports — these are baked into the system. We   */
/*  surface them as a top-row of report-type cards so operators can    */
/*  jump straight into Revenue / Payment / Client / Project views.     */
/* ------------------------------------------------------------------ */


interface CanonicalReportDef {
  slug: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  icon: typeof LineChartIcon;
  accent: string;
}

const CANONICAL_REPORTS: CanonicalReportDef[] = [
  {
    slug: 'revenue',
    titleKey: 'reportsPage.canonical.revenue.title',
    titleFallback: 'Revenue Report',
    descKey: 'reportsPage.canonical.revenue.desc',
    descFallback: 'Monthly and cumulative revenue by client, project, and category.',
    icon: LineChartIcon,
    accent: 'text-info',
  },
  {
    slug: 'payment',
    titleKey: 'reportsPage.canonical.payment.title',
    titleFallback: 'Payment Report',
    descKey: 'reportsPage.canonical.payment.desc',
    descFallback: 'Payment status breakdown, aging analysis, and collection trends.',
    icon: PieChart,
    accent: 'text-warning',
  },
  {
    slug: 'clients',
    titleKey: 'reportsPage.canonical.clients.title',
    titleFallback: 'Client Report',
    descKey: 'reportsPage.canonical.clients.desc',
    descFallback: 'Top clients by revenue, activity, and outstanding balances.',
    icon: Building2,
    accent: 'text-success',
  },
  {
    slug: 'projects',
    titleKey: 'reportsPage.canonical.projects.title',
    titleFallback: 'Project Report',
    descKey: 'reportsPage.canonical.projects.desc',
    descFallback: 'Project performance, billing efficiency, and deadline adherence.',
    icon: TrendingUp,
    accent: 'text-text-primary',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  /* ----- data ----- */
  const { data: reports = [], isLoading, error, refetch } = useReports();
  const { deleteReport } = useReportMutations();

  // Export of business-overview as the canonical "all-up" PDF — used by
  // the page-level Export button. Kept light: no params, defaults to
  // current month on the backend.
  const exportMutation = useMutation({
    mutationFn: () => reportsService.exportToPDF('business-overview', {}),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-ringkasan-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('reportsPage.exportSuccess', 'Summary report downloaded successfully.'));
    },
    onError: () => toast.error(t('reportsPage.exportFailed', 'Failed to download report.')),
  });

  /* ----- derived ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesSearch = !q
        || r.title?.toLowerCase().includes(q)
        || r.project?.description?.toLowerCase().includes(q)
        || r.project?.client?.name?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchText, statusFilter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const sent = reports.filter((r) => r.status === 'SENT').length;
    const draft = reports.filter((r) => r.status === 'DRAFT').length;
    const totalSections = reports.reduce((acc, r) => acc + (r.sections?.length ?? 0), 0);
    return { total, sent, draft, totalSections };
  }, [reports]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  /* ----- handlers ----- */
  const handleDelete = (r: SocialMediaReport) => {
    if (confirm(t('reportsPage.confirmDelete', `Delete report "${r.title}"? This action cannot be undone.`))) {
      deleteReport.mutate(r.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          toast.success(t('reportsPage.deleted', 'Report deleted.'));
        },
        onError: () => toast.error(t('reportsPage.deleteFailed', 'Failed to delete report.')),
      });
    }
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
        topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      >
        <PageContainer>
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title={t('reportsPage.error.title', 'Unable to load reports')}
            description={error instanceof Error ? error.message : t('reportsPage.error.generic', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- render ----- */
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>
        <PageHeader
          title={t('reportsPage.title', 'Reports')}
          description={t(
            'reportsPage.subtitle',
            'Financial analysis, business performance, and your saved custom reports.',
          )}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download className="h-4 w-4" />
                {t('reportsPage.exportPdf', 'Export PDF')}
              </Button>
              <Button onClick={() => navigate('/reports/builder')} size="sm">
                <Plus className="h-4 w-4" />
                {t('reportsPage.new', 'New Report')}
              </Button>
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — four supporting numbers about the saved-report
            corpus. Mirrors the rhythm used on Projects/Invoices pages.
           ───────────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  label={t('reportsPage.kpi.total', 'Total Reports')}
                  value={stats.total}
                  sublabel={t('reportsPage.kpi.totalSub', 'saved in the system')}
                />
                <StatCard
                  label={t('reportsPage.kpi.sent', 'Sent')}
                  value={stats.sent}
                  sublabel={t('reportsPage.kpi.sentSub', 'delivered to clients')}
                />
                <StatCard
                  label={t('reportsPage.kpi.draft', 'Draft')}
                  value={stats.draft}
                  sublabel={t('reportsPage.kpi.draftSub', 'still in progress')}
                />
                <StatCard
                  label={t('reportsPage.kpi.sections', 'Total Sections')}
                  value={stats.totalSections}
                  sublabel={t('reportsPage.kpi.sectionsSub', 'across all reports')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Canonical analytic reports — these are *system* reports, not
            user-created. They live above the saved-report list because
            they're the recurring, always-available analytic surfaces.
           ───────────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('reportsPage.analytics.title', 'System Analytics Reports')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t(
                  'reportsPage.analytics.subtitle',
                  'Four core analytic surfaces, always available and up to date.',
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CANONICAL_REPORTS.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => navigate(`/reports/system/${r.slug}`)}
                  className="text-left group"
                >
                  <GlassPanel
                    surface="glass"
                    padding="none"
                    className="p-5 h-full transition-colors hover:bg-bg-panel"
                  >
                    <div className={cn('mb-4', r.accent)}>
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="text-sm font-display font-semibold text-text-primary tracking-tight mb-1.5 group-hover:text-text-primary">
                      {t(r.titleKey, r.titleFallback)}
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">
                      {t(r.descKey, r.descFallback)}
                    </p>
                  </GlassPanel>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Saved reports — the project-scoped, custom-built reports.
            Single GlassPanel; filter strip + table share one surface.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('reportsPage.saved.title', 'Saved Reports')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Loading…')
                    : t('reportsPage.saved.count', '{{count}} reports', { count: reports.length })}
                </p>
              </div>
            </div>

            {/* Filter strip */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={t(
                    'reportsPage.search.placeholder',
                    'Search by title, project, or client…',
                  )}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    size="sm"
                    className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                  >
                    <SelectValue placeholder={t('reportsPage.filter.status', 'Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('reportsPage.filter.allStatuses', 'All Statuses')}
                    </SelectItem>
                    <SelectItem value="DRAFT">{STATUS_LABEL.DRAFT}</SelectItem>
                    <SelectItem value="COMPLETED">{STATUS_LABEL.COMPLETED}</SelectItem>
                    <SelectItem value="SENT">{STATUS_LABEL.SENT}</SelectItem>
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
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-12 w-12" />}
              title={
                hasActiveFilters
                  ? t('reportsPage.empty.filtered.title', 'No matching reports')
                  : t('reportsPage.empty.title', 'No saved reports yet')
              }
              description={
                hasActiveFilters
                  ? t('reportsPage.empty.filtered.desc', 'Try adjusting or clearing your filters.')
                  : t(
                      'reportsPage.empty.desc',
                      'Build your first custom report by combining CSV data and visualizations.',
                    )
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/reports/builder')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('reportsPage.new', 'New Report')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <DataTable<SocialMediaReport>
                data={filtered}
                onRowClick={(row) => navigate(`/reports/${row.id}`)}
                enablePagination={filtered.length > 10}
                columns={[
                  {
                    id: 'title',
                    accessorKey: 'title',
                    header: t('reportsPage.col.title', 'Title'),
                    cell: ({ row }) => (
                      <div className="min-w-0 max-w-[300px]">
                        <div className="text-sm text-text-primary truncate">
                          {row.original.title || '—'}
                        </div>
                        {row.original.description && (
                          <div className="text-xs text-text-tertiary truncate mt-0.5">
                            {row.original.description}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    id: 'project',
                    accessorFn: (r) => r.project?.description ?? '',
                    header: t('reportsPage.col.project', 'Project'),
                    cell: ({ row }) => {
                      const p = row.original.project;
                      if (!p) return <span className="text-text-tertiary">—</span>;
                      return (
                        <div className="min-w-0 max-w-[220px]">
                          <div className="text-sm text-text-secondary truncate">
                            {p.description}
                          </div>
                          {p.client?.name && (
                            <div className="text-xs text-text-tertiary truncate mt-0.5">
                              {p.client.name}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    id: 'period',
                    header: t('reportsPage.col.period', 'Period'),
                    cell: ({ row }) => (
                      <span className="text-text-secondary text-xs">
                        {ReportUtils.formatPeriod(row.original.month, row.original.year)}
                      </span>
                    ),
                  },
                  {
                    id: 'sections',
                    header: t('reportsPage.col.sections', 'Sections'),
                    cell: ({ row }) => (
                      <span className="text-text-secondary text-xs tabular-nums">
                        {row.original.sections?.length ?? 0}
                      </span>
                    ),
                  },
                  {
                    accessorKey: 'status',
                    header: t('reportsPage.col.status', 'Status'),
                    cell: ({ row }) => (
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                          statusChipClass(row.original.status),
                        )}
                      >
                        {STATUS_LABEL[row.original.status] ?? row.original.status}
                      </Badge>
                    ),
                  },
                  {
                    accessorKey: 'updatedAt',
                    header: t('reportsPage.col.updatedAt', 'Updated'),
                    cell: ({ row }) => (
                      <span className="text-text-tertiary text-xs">
                        <DateDisplay date={row.original.updatedAt} />
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: () => <span className="sr-only">{t('reportsPage.col.actions', 'Actions')}</span>,
                    cell: ({ row }) => {
                      const r = row.original;
                      return (
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-text-tertiary hover:text-text-primary"
                                aria-label={t('reportsPage.reportActions', 'Report actions')}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/reports/${r.id}`)}>
                                <Eye className="h-3.5 w-3.5" /> {t('common.view', 'View')}
                              </DropdownMenuItem>
                              {r.pdfUrl && (
                                <DropdownMenuItem
                                  onClick={() => window.open(r.pdfUrl, '_blank')}
                                >
                                  <Download className="h-3.5 w-3.5" /> {t('reportsPage.downloadPdf', 'Download PDF')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(r)}
                                className="text-danger focus:text-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> {t('common.delete', 'Delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

// Re-export status type for downstream files that import from this page.
export type { ReportStatus };
