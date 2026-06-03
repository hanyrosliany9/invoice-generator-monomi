/**
 * MilestoneAnalyticsPage (v2)
 *
 * Cross-project analytics for payment milestones. The classic page mixed
 * "profitability by phase" pie/bar charts, a cash-flow chart, and a
 * milestone table inside chunky AntD cards. For v2 we reframe it as a
 * single editorial page with one ascending rhythm:
 *
 *   1. KPI band (Total / Upcoming / Overdue / Completed) — the operator's
 *      mental model of the milestone corpus at a glance.
 *   2. Filter strip — project, time range, status — on a single GlassPanel.
 *   3. Timeline panel — bar chart of revenue per milestone phase (the most
 *      common cross-cutting view).
 *   4. Cash-flow forecast — line chart that pairs expected vs actual.
 *   5. Detail table — one row per milestone with project, due date, amount,
 *      status. Click-through to the project detail page.
 *
 * Charts use MonomiChart + token-mirrored colors so we never leak raw hex.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCcw,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
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
import {
  MonomiChart,
  chartColors,
  chartGridProps,
  chartAxisProps,
} from '@/components/monomi/MonomiChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { tokens } from '@/styles/tokens';
import { useAuthStore } from '@/store/auth';
import {
  milestonesService,
  type MilestoneAnalytics,
  type MilestoneMetric,
} from '@/services/milestones';
import { projectService, type Project } from '@/services/projects';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type TimeRange = '30days' | '90days' | '1year' | 'custom';
type StatusFilter = 'all' | MilestoneMetric['status'];

const TIME_RANGE_DAYS: Record<Exclude<TimeRange, 'custom'>, number> = {
  '30days': 30,
  '90days': 90,
  '1year': 365,
};

const STATUS_LABEL: Record<MilestoneMetric['status'], string> = {
  PENDING: 'Tertunda',
  INVOICED: 'Tertagih',
  PAID: 'Lunas',
  OVERDUE: 'Jatuh Tempo',
};

const statusChipClass = (status?: MilestoneMetric['status']) => {
  switch (status) {
    case 'PAID':
      return 'bg-success/10 text-success';
    case 'INVOICED':
      return 'bg-info/10 text-info';
    case 'OVERDUE':
      return 'bg-danger/10 text-danger';
    case 'PENDING':
    default:
      return 'bg-warning/10 text-warning';
  }
};

/* ------------------------------------------------------------------ */
/*  Date utilities — no dayjs dependency, the classic page used it but */
/*  the v2 system standardizes on Date + DateDisplay primitive.        */
/* ------------------------------------------------------------------ */

const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const formatMonthLabel = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
};

const formatJtIDR = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MilestoneAnalyticsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Default to 1 year: payment milestones (termin) are created across the whole
  // project history, so a 90-day window often shows an empty analytics page.
  const [timeRange, setTimeRange] = useState<TimeRange>('1year');
  const [projectId, setProjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // For 'custom' we'd wire MonomiDatePicker here; the classic page also
  // never implemented a real custom-range editor (it just left the field
  // unbound), so we mirror that behaviour and treat 'custom' as a no-op
  // that keeps the current dates pinned. Bookmark for a future iteration.
  const { startDate, endDate } = useMemo(() => {
    const end = new Date().toISOString();
    if (timeRange === 'custom') {
      return { startDate: isoDaysAgo(90), endDate: end };
    }
    return { startDate: isoDaysAgo(TIME_RANGE_DAYS[timeRange]), endDate: end };
  }, [timeRange]);

  /* ----- data ----- */
  const {
    data: analytics,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<MilestoneAnalytics>({
    queryKey: ['milestone-analytics', projectId, timeRange, startDate, endDate],
    queryFn: () =>
      milestonesService.getAnalytics({
        projectId: projectId === 'all' ? undefined : projectId,
        startDate,
        endDate,
        timeRange,
      }),
  });

  // Project list for the filter — small payload, only used to populate the
  // Select. We don't try to join project names into the metric rows because
  // the analytics payload already provides the relation when present.
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
  });

  /* ----- derived ----- */
  const metrics = useMemo(() => {
    const rows = analytics?.milestoneMetrics ?? [];
    if (statusFilter === 'all') return rows;
    return rows.filter((m) => m.status === statusFilter);
  }, [analytics, statusFilter]);

  const kpi = useMemo(() => {
    const rows = analytics?.milestoneMetrics ?? [];
    const total = rows.length;
    const upcoming = rows.filter(
      (m) => m.status === 'PENDING' || m.status === 'INVOICED',
    ).length;
    const overdue = rows.filter((m) => m.status === 'OVERDUE').length;
    const completed = rows.filter((m) => m.status === 'PAID').length;
    return { total, upcoming, overdue, completed };
  }, [analytics]);

  const hasActiveFilters =
    projectId !== 'all' || statusFilter !== 'all' || timeRange !== '1year';

  const resetFilters = () => {
    setProjectId('all');
    setStatusFilter('all');
    setTimeRange('1year');
  };

  const handleExport = () => {
    if (!analytics) {
      toast.error(t('milestones.analytics.noData', 'Tidak ada data untuk diekspor.'));
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(analytics, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `milestone-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('milestones.analytics.exported', 'Data analitik diekspor.'));
    } catch {
      toast.error(t('milestones.analytics.exportFailed', 'Gagal mengekspor data.'));
    }
  };

  /* ----- table columns ----- */
  const milestoneColumns = useMemo(
    () => [
      {
        accessorKey: 'milestoneNumber',
        header: t('milestones.table.number', 'No.'),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => (
          <span className="text-sm font-medium text-text-primary tabular-nums">
            #{row.original.milestoneNumber}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('milestones.table.name', 'Milestone'),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => (
          <div className="min-w-0 max-w-[280px]">
            <div className="text-sm text-text-primary truncate">{row.original.name}</div>
          </div>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: t('milestones.table.dueDate', 'Jatuh Tempo'),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => (
          <DateDisplay
            date={row.original.dueDate}
            className="text-xs text-text-secondary"
          />
        ),
      },
      {
        accessorKey: 'amount',
        header: () => (
          <span className="block text-right">
            {t('milestones.table.amount', 'Jumlah')}
          </span>
        ),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => (
          <div className="text-right">
            <MoneyDisplay
              amount={Number(row.original.amount) || 0}
              className="text-sm text-text-primary"
            />
          </div>
        ),
      },
      {
        accessorKey: 'revenueRecognized',
        header: () => (
          <span className="block text-right">
            {t('milestones.table.recognized', 'Diakui')}
          </span>
        ),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => {
          const v = Number(row.original.revenueRecognized) || 0;
          return (
            <div className="text-right">
              <MoneyDisplay
                amount={v}
                className={cn('text-sm', v > 0 ? 'text-success' : 'text-text-tertiary')}
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'daysToPayment',
        header: () => (
          <span className="block text-right">
            {t('milestones.table.daysToPayment', 'Hari Bayar')}
          </span>
        ),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => {
          const d = row.original.daysToPayment;
          return (
            <div className="text-right text-xs text-text-secondary tabular-nums">
              {typeof d === 'number' ? `${d}h` : '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('milestones.table.status', 'Status'),
        cell: ({ row }: { row: { original: MilestoneMetric } }) => (
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
    ],
    [t],
  );

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
          <PageHeader
            title={t('milestones.analytics.title', 'Analitik Milestone')}
            breadcrumbs={[
              { label: t('common.analytics', 'Analitik'), href: '/' },
              { label: t('milestones.analytics.title', 'Analitik Milestone') },
            ]}
          />
          <EmptyState
            icon={<AlertTriangle className="h-12 w-12" />}
            title={t('milestones.analytics.errorTitle', 'Tidak bisa memuat analitik')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={
              <Button onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
                {t('common.retry', 'Coba Lagi')}
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  const profitabilityData = analytics?.projectProfitabilityByPhase ?? [];
  const cashFlowData = analytics?.cashFlowForecast ?? [];

  /* ----- chart tooltip wiring (token-mirrored, no raw hex in chart data) */
  const tooltipStyle = {
    backgroundColor: tokens.brand.black,
    border: `1px solid ${tokens.border.default}`,
    borderRadius: tokens.radius.sm,
    color: tokens.text.primary,
    fontSize: 12,
    padding: '8px 12px',
  } as const;

  const tooltipLabelStyle = {
    color: tokens.text.secondary,
    fontSize: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 4,
  } as const;

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
          title={t('milestones.analytics.title', 'Analitik Milestone')}
          description={t(
            'milestones.analytics.subtitle',
            'Performa pembayaran milestone lintas proyek — siklus, ketepatan waktu, dan arus kas.',
          )}
          breadcrumbs={[
            { label: t('common.analytics', 'Analitik'), href: '/' },
            { label: t('milestones.analytics.title', 'Analitik Milestone') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-text-secondary hover:text-text-primary"
              >
                <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                {t('common.refresh', 'Muat Ulang')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!analytics}
                className="border-border-subtle"
              >
                <Download className="h-4 w-4" />
                {t('milestones.analytics.export', 'Ekspor JSON')}
              </Button>
            </div>
          }
        />

        {/* ────────────────────────────────────────────────────────
            KPI band — four supporting counts of the milestone corpus.
           ──────────────────────────────────────────────────────── */}
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
                  label={t('milestones.kpi.total', 'Total Milestone')}
                  value={kpi.total}
                  sublabel={t('milestones.kpi.totalSub', 'dalam rentang waktu')}
                />
                <StatCard
                  label={t('milestones.kpi.upcoming', 'Akan Datang')}
                  value={kpi.upcoming}
                  sublabel={t('milestones.kpi.upcomingSub', 'pending atau tertagih')}
                />
                <StatCard
                  label={t('milestones.kpi.overdue', 'Jatuh Tempo')}
                  value={kpi.overdue}
                  sublabel={
                    kpi.overdue > 0
                      ? t('milestones.kpi.overdueWarn', 'perlu tindak lanjut')
                      : t('milestones.kpi.overdueOk', 'semua lancar')
                  }
                />
                <StatCard
                  label={t('milestones.kpi.completed', 'Selesai')}
                  value={kpi.completed}
                  sublabel={t('milestones.kpi.completedSub', 'sudah lunas')}
                />
              </>
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            Filter strip — project, time range, status — on one panel.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <GlassPanel surface="glass" padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-text-tertiary text-[10px] uppercase tracking-[0.16em] font-medium shrink-0">
                <CalendarIcon className="h-3.5 w-3.5" />
                {t('common.filters', 'Filter')}
              </div>

              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[200px]"
                >
                  <SelectValue placeholder={t('milestones.filter.project', 'Proyek')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('milestones.filter.allProjects', 'Semua Proyek')}
                  </SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number ? `${p.number} — ` : ''}
                      {p.description || p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={timeRange}
                onValueChange={(v) => setTimeRange(v as TimeRange)}
              >
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder={t('milestones.filter.range', 'Rentang')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">
                    {t('milestones.range.30', '30 hari terakhir')}
                  </SelectItem>
                  <SelectItem value="90days">
                    {t('milestones.range.90', '90 hari terakhir')}
                  </SelectItem>
                  <SelectItem value="1year">
                    {t('milestones.range.year', '1 tahun terakhir')}
                  </SelectItem>
                  <SelectItem value="custom">
                    {t('milestones.range.custom', 'Kustom')}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder={t('milestones.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('milestones.filter.allStatuses', 'Semua Status')}
                  </SelectItem>
                  <SelectItem value="PENDING">{STATUS_LABEL.PENDING}</SelectItem>
                  <SelectItem value="INVOICED">{STATUS_LABEL.INVOICED}</SelectItem>
                  <SelectItem value="PAID">{STATUS_LABEL.PAID}</SelectItem>
                  <SelectItem value="OVERDUE">{STATUS_LABEL.OVERDUE}</SelectItem>
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
          </GlassPanel>
        </section>

        {/* ────────────────────────────────────────────────────────
            Supporting metrics — payment cycle, on-time rate, revenue
            recognition. These are quieter than the count KPIs above
            because they're proportional, not absolute.
           ──────────────────────────────────────────────────────── */}
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
                  label={t('milestones.metric.cycle', 'Siklus Pembayaran')}
                  value={
                    <span className="tabular-nums">
                      {(analytics?.averagePaymentCycle ?? 0).toFixed(0)}h
                    </span>
                  }
                  sublabel={t('milestones.metric.cycleSub', 'rata-rata waktu bayar')}
                />
                <StatCard
                  label={t('milestones.metric.onTime', 'Tepat Waktu')}
                  value={
                    <span className="tabular-nums">
                      {(analytics?.onTimePaymentRate ?? 0).toFixed(1)}%
                    </span>
                  }
                  sublabel={t('milestones.metric.onTimeSub', 'dari milestone dibayar')}
                  delta={
                    analytics
                      ? {
                          value: Math.round(analytics.onTimePaymentRate - 80),
                          suffix: 'pt',
                        }
                      : undefined
                  }
                />
                <StatCard
                  label={t('milestones.metric.recognition', 'Pengakuan Pendapatan')}
                  value={
                    <span className="tabular-nums">
                      {(analytics?.revenueRecognitionRate ?? 0).toFixed(1)}%
                    </span>
                  }
                  sublabel={t(
                    'milestones.metric.recognitionSub',
                    'dari nilai milestone',
                  )}
                />
              </>
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            Revenue per phase — bar chart. Stacked = revenue / cost /
            profit grouped per milestone phase.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('milestones.charts.profitability', 'Profitabilitas per Fase')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t(
                    'milestones.charts.profitabilitySub',
                    'Pendapatan, biaya, dan laba per fase milestone.',
                  )}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-text-tertiary" />
            </div>

            {isLoading ? (
              <Skeleton className="h-64 rounded-md" />
            ) : profitabilityData.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-12 w-12" />}
                title={t('milestones.charts.empty', 'Belum ada data profitabilitas')}
                description={t(
                  'milestones.charts.emptyDesc',
                  'Sesuaikan filter atau tunggu hingga ada milestone yang tercatat.',
                )}
              />
            ) : (
              <MonomiChart height={280}>
                <BarChart
                  data={profitabilityData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid {...chartGridProps} vertical={false} />
                  <XAxis
                    dataKey="milestone"
                    {...chartAxisProps}
                    axisLine={false}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    {...chartAxisProps}
                    tickFormatter={(v) => formatJtIDR(Number(v))}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: tokens.bg.glass }}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value, name) => [
                      `Rp ${Number(value).toLocaleString('id-ID')}`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      color: tokens.text.tertiary,
                      paddingTop: 8,
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={chartColors[0]}
                    name={t('milestones.legend.revenue', 'Pendapatan')}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="cost"
                    fill={chartColors[3]}
                    name={t('milestones.legend.cost', 'Biaya')}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    fill={chartColors[2]}
                    name={t('milestones.legend.profit', 'Laba')}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </MonomiChart>
            )}
          </GlassPanel>
        </section>

        {/* ────────────────────────────────────────────────────────
            Cash-flow forecast — line chart. Expected vs actual vs
            forecast over time, sharing one quiet rhythm.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('milestones.charts.cashFlow', 'Proyeksi Arus Kas')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t(
                    'milestones.charts.cashFlowSub',
                    'Perbandingan arus masuk yang diharapkan, aktual, dan proyeksi.',
                  )}
                </p>
              </div>
              <Clock className="h-4 w-4 text-text-tertiary" />
            </div>

            {isLoading ? (
              <Skeleton className="h-64 rounded-md" />
            ) : cashFlowData.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-12 w-12" />}
                title={t('milestones.charts.cashFlowEmpty', 'Belum ada data arus kas')}
                description={t(
                  'milestones.charts.cashFlowEmptyDesc',
                  'Belum cukup milestone untuk membentuk proyeksi.',
                )}
              />
            ) : (
              <MonomiChart height={280}>
                <LineChart
                  data={cashFlowData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid {...chartGridProps} vertical={false} />
                  <XAxis
                    dataKey="date"
                    {...chartAxisProps}
                    tickFormatter={formatMonthLabel}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    {...chartAxisProps}
                    tickFormatter={(v) => formatJtIDR(Number(v))}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ stroke: tokens.border.default, strokeWidth: 1 }}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    labelFormatter={(label) => formatMonthLabel(String(label))}
                    formatter={(value, name) => [
                      `Rp ${Number(value).toLocaleString('id-ID')}`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      color: tokens.text.tertiary,
                      paddingTop: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expectedInflow"
                    stroke={chartColors[1]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={t('milestones.legend.expected', 'Diharapkan')}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualInflow"
                    stroke={chartColors[2]}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={t('milestones.legend.actual', 'Aktual')}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastedInflow"
                    stroke={chartColors[3]}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={t('milestones.legend.forecast', 'Proyeksi')}
                  />
                </LineChart>
              </MonomiChart>
            )}
          </GlassPanel>
        </section>

        {/* ────────────────────────────────────────────────────────
            Detail table — one row per milestone. Click-through to
            the project detail page.
           ──────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('milestones.table.title', 'Detail Milestone')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Memuat…')
                    : t('milestones.table.count', '{{count}} catatan', {
                        count: metrics.length,
                      })}
                </p>
              </div>
              {kpi.overdue > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('milestones.table.overdueNote', '{{count}} jatuh tempo', {
                    count: kpi.overdue,
                  })}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="p-5 space-y-2">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : metrics.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-12 w-12" />}
                title={
                  hasActiveFilters
                    ? t('milestones.empty.filtered', 'Tidak ada milestone yang cocok')
                    : t('milestones.empty.title', 'Belum ada milestone')
                }
                description={
                  hasActiveFilters
                    ? t(
                        'milestones.empty.filteredDesc',
                        'Coba ubah filter atau pilih rentang waktu yang berbeda.',
                      )
                    : t(
                        'milestones.empty.desc',
                        'Belum ada milestone yang tercatat dalam rentang waktu ini.',
                      )
                }
                action={
                  hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      {t('common.resetFilters', 'Reset Filter')}
                    </Button>
                  )
                }
              />
            ) : (
              <div className="px-1 pb-1">
                <DataTable<MilestoneMetric>
                  data={metrics}
                  columns={milestoneColumns}
                  enablePagination={metrics.length > 10}
                  onRowClick={(row) => {
                    // Best-effort: jump to the project detail when the metric
                    // payload carries a projectId we can resolve. The classic
                    // page didn't navigate, so this is a quiet enhancement.
                    const m = row as unknown as { projectId?: string };
                    if (m.projectId) navigate(`/projects/${m.projectId}`);
                  }}
                />
              </div>
            )}
          </GlassPanel>
        </section>
      </PageContainer>
    </AppShell>
  );
}
