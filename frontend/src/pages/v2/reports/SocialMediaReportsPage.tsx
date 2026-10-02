/**
 * SocialMediaReportsPage (v2) — landing page for client social media reports.
 *
 * Everything shown here is derived from the saved reports themselves (counts
 * by status, which projects still need this month's report, recent reports);
 * there is no made-up analytics. The report list below is the main tool.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, BarChart3,
  Plus, Search, MoreHorizontal, Eye, Trash2, X, Copy, MessageCircle, CalendarCheck,
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
import type { SocialMediaReport } from '@/features/reports/types/report.types';
import { cn } from '@/lib/utils';
import { socialMediaReportsService } from '@/services/social-media-reports';
import { reportErrorText } from './ReportActionDialogs';
import { CopyReportDialog } from './CopyReportDialog';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SocialMediaReportsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: reports = [], isLoading, error, refetch } = useReports();
  const { deleteReport } = useReportMutations();

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

  const queryClient = useQueryClient();
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  /* Real counts derived from the saved reports. */
  const stats = useMemo(() => {
    const byStatus = { DRAFT: 0, COMPLETED: 0, SENT: 0 } as Record<string, number>;
    reports.forEach((r) => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; });
    const thisMonth = reports.filter((r) => r.month === curMonth && r.year === curYear);

    // Projects that have reported before: who still needs this month's report?
    const byProject = new Map<string, SocialMediaReport[]>();
    reports.forEach((r) => {
      const list = byProject.get(r.projectId) ?? [];
      list.push(r);
      byProject.set(r.projectId, list);
    });
    const missing: { project: SocialMediaReport['project']; projectId: string; latest: SocialMediaReport }[] = [];
    byProject.forEach((list, projectId) => {
      if (list.some((r) => r.month === curMonth && r.year === curYear)) return;
      const latest = [...list].sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
      missing.push({ project: latest.project, projectId, latest });
    });
    missing.sort((a, b) => (a.project?.client?.name ?? '').localeCompare(b.project?.client?.name ?? ''));
    return {
      total: reports.length,
      drafts: byStatus.DRAFT,
      live: byStatus.COMPLETED + byStatus.SENT,
      sent: byStatus.SENT,
      thisMonth,
      missing,
    };
  }, [reports, curMonth, curYear]);

  const copyMutation = useMutation({
    mutationFn: (sourceId: string) =>
      socialMediaReportsService.duplicateReport(sourceId, { month: curMonth, year: curYear }),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(
        t('reportActions.duplicate.done', 'Copied to {{period}} as a draft. Upload new data to each section.', {
          period: ReportUtils.formatPeriod(copy.month, copy.year),
        }),
      );
      navigate(`/reports/${copy.id}/edit`);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportActions.duplicate.failed', 'Failed to copy the report.'))),
  });

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  const [copySource, setCopySource] = useState<SocialMediaReport | null>(null);

  const handleDelete = (r: SocialMediaReport) => {
    if (confirm(t('socialMediaReports.confirmDelete', `Delete report "${r.title}"?`))) {
      deleteReport.mutate(r.id, {
        onSuccess: () => toast.success(t('socialMediaReports.deleted', 'Report deleted.')),
        onError: () => toast.error(t('socialMediaReports.deleteFailed', 'Failed to delete report.')),
      });
    }
  };

  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{}}
      >
        <PageContainer>
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title={t('socialMediaReports.error.title', 'Unable to load reports')}
            description={error instanceof Error ? error.message : t('socialMediaReports.error.generic', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Try Again')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>
        <PageHeader
          title={t('socialMediaReports.title', 'Social Media Reports')}
          description={t(
            'socialMediaReports.subtitle2',
            'Monthly performance reports for your clients: create, review and send.',
          )}
          actions={
            <Button onClick={() => navigate('/reports/builder')} size="sm">
              <Plus className="h-4 w-4" />
              {t('socialMediaReports.new', 'New Report')}
            </Button>
          }
        />

        {/* KPI band — real counts from the saved reports. */}
        <section className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t('socialMediaReports.kpi.reports', 'Saved Reports')}
              value={stats.total}
              sublabel={t('socialMediaReports.kpi.reportsAll', 'across all clients')}
            />
            <StatCard
              label={t('socialMediaReports.kpi.drafts', 'Drafts')}
              value={stats.drafts}
              sublabel={t('socialMediaReports.kpi.draftsSub', 'not visible to clients')}
            />
            <StatCard
              label={t('socialMediaReports.kpi.live', 'Live in client portal')}
              value={stats.live}
              sublabel={t('socialMediaReports.kpi.liveSub', '{{count}} emailed to the client', { count: stats.sent })}
            />
            <StatCard
              label={t('socialMediaReports.kpi.thisMonth', 'Reports this month')}
              value={stats.thisMonth.length}
              sublabel={ReportUtils.formatPeriod(curMonth, curYear)}
            />
          </div>
        </section>

        {/* This month — who still needs a report. */}
        {!isLoading && stats.total > 0 && (
          <section className="mb-8">
            <GlassPanel surface="glass" padding="lg">
              <div className="mb-4 flex items-start gap-3">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
                <div className="min-w-0">
                  <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                    {t('socialMediaReports.month.title', 'Reports for {{period}}', { period: ReportUtils.formatPeriod(curMonth, curYear) })}
                  </h2>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {stats.missing.length === 0
                      ? t('socialMediaReports.month.allDone', 'Every project that has reported before already has a report this month.')
                      : t('socialMediaReports.month.missing', '{{count}} project(s) still need a report this month. Copy last month\'s structure to start.', { count: stats.missing.length })}
                  </p>
                </div>
              </div>
              {stats.missing.length > 0 && (
                <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
                  {stats.missing.map((m) => (
                    <li key={m.projectId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-text-primary">{m.project?.client?.name ?? '—'}</div>
                        <div className="truncate text-xs text-text-tertiary">
                          {m.project?.description} · {t('socialMediaReports.month.lastReport', 'last report: {{period}}', { period: ReportUtils.formatPeriod(m.latest.month, m.latest.year) })}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={copyMutation.isPending}
                        onClick={() => copyMutation.mutate(m.latest.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t('socialMediaReports.month.copy', 'Copy last report')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {stats.thisMonth.length > 0 && (
                <div className={cn('flex flex-wrap gap-2', stats.missing.length > 0 && 'mt-4')}>
                  {stats.thisMonth.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => navigate(`/reports/${r.id}`)}
                      className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-sunken px-3 py-1 text-xs text-text-secondary hover:text-text-primary max-sm:min-h-8"
                    >
                      <span className="max-w-[220px] truncate">{r.project?.client?.name ?? r.title}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider', statusChipClass(r.status))}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </GlassPanel>
          </section>
        )}

        {/* Saved reports */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('socialMediaReports.saved.title', 'Saved Client Reports')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Loading…')
                    : t('socialMediaReports.saved.count', '{{count}} client reports', { count: reports.length })}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t('socialMediaReports.perClientReports', 'Per-client reports')}</span>
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
                    'socialMediaReports.search.placeholder',
                    'Search by title, project, or client…',
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
                    <SelectValue placeholder={t('socialMediaReports.filter.status', 'Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('socialMediaReports.filter.allStatuses', 'All Statuses')}</SelectItem>
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

          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-12 w-12" />}
              title={
                hasActiveFilters
                  ? t('socialMediaReports.empty.filtered.title', 'No matching reports')
                  : t('socialMediaReports.empty.title', 'No client reports yet')
              }
              description={
                hasActiveFilters
                  ? t('socialMediaReports.empty.filtered.desc', 'Try adjusting or clearing your filters.')
                  : t(
                      'socialMediaReports.empty.desc',
                      'Create your first social media report for a client.',
                    )
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filter')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/reports/builder')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('socialMediaReports.new', 'New Report')}
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
                    header: t('socialMediaReports.col.title', 'Title'),
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
                    id: 'client',
                    accessorFn: (r) => r.project?.client?.name ?? '',
                    header: t('socialMediaReports.col.client', 'Client'),
                    cell: ({ row }) => (
                      <span className="text-sm text-text-secondary">
                        {row.original.project?.client?.name || '—'}
                      </span>
                    ),
                  },
                  {
                    id: 'period',
                    header: t('socialMediaReports.col.period', 'Period'),
                    cell: ({ row }) => (
                      <span className="text-text-secondary text-xs">
                        {ReportUtils.formatPeriod(row.original.month, row.original.year)}
                      </span>
                    ),
                  },
                  {
                    id: 'sections',
                    header: t('socialMediaReports.col.sections', 'Sections'),
                    cell: ({ row }) => (
                      <span className="text-text-secondary text-xs tabular-nums">
                        {row.original.sections?.length ?? 0}
                      </span>
                    ),
                  },
                  {
                    accessorKey: 'status',
                    header: t('socialMediaReports.col.status', 'Status'),
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
                    header: t('socialMediaReports.col.updatedAt', 'Updated'),
                    cell: ({ row }) => (
                      <span className="text-text-tertiary text-xs">
                        <DateDisplay date={row.original.updatedAt} />
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: () => <span className="sr-only">{t('socialMediaReports.col.actions', 'Actions')}</span>,
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
                                aria-label={t('socialMediaReports.reportActions', 'Report actions')}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/reports/${r.id}`)}>
                                <Eye className="h-3.5 w-3.5" /> {t('common.view', 'View')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCopySource(r)}>
                                <Copy className="h-3.5 w-3.5" /> {t('reportActions.duplicate.menu', 'Copy to next month')}
                              </DropdownMenuItem>
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
      {copySource !== null && (
        <CopyReportDialog
          source={{ id: copySource.id, projectId: copySource.projectId, month: copySource.month, year: copySource.year, title: copySource.title }}
          open
          onOpenChange={(o) => { if (!o) setCopySource(null); }}
        />
      )}
    </AppShell>
  );
}
