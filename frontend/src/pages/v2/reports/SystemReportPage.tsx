/* ------------------------------------------------------------------ */
/*  SystemReportPage (v2)                                              */
/*                                                                     */
/*  Renders the four canonical "system" analytic reports surfaced as   */
/*  cards on the Reports page: revenue, payment, clients, projects.    */
/*  These are read-only analytic surfaces backed by /reports/<slug>.   */
/*  Previously /reports/system/:slug had NO route, so every card fell  */
/*  through to the catch-all and redirected to the dashboard.          */
/* ------------------------------------------------------------------ */

import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ArrowLeft, LineChart as LineChartIcon, PieChart, Building2, TrendingUp } from 'lucide-react';

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
import { DataTable } from '@/components/monomi/DataTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { reportsService } from '@/services/reports';

type Slug = 'revenue' | 'payment' | 'clients' | 'projects';

const SLUG_META: Record<
  Slug,
  { icon: typeof LineChartIcon; titleKey: string; titleFallback: string; descKey: string; descFallback: string }
> = {
  revenue: {
    icon: LineChartIcon,
    titleKey: 'reportsPage.canonical.revenue.title',
    titleFallback: 'Revenue Report',
    descKey: 'reportsPage.canonical.revenue.desc',
    descFallback: 'Monthly and cumulative revenue by client, project, and category.',
  },
  payment: {
    icon: PieChart,
    titleKey: 'reportsPage.canonical.payment.title',
    titleFallback: 'Payment Report',
    descKey: 'reportsPage.canonical.payment.desc',
    descFallback: 'Payment status breakdown, aging analysis, and collection trends.',
  },
  clients: {
    icon: Building2,
    titleKey: 'reportsPage.canonical.clients.title',
    titleFallback: 'Client Report',
    descKey: 'reportsPage.canonical.clients.desc',
    descFallback: 'Top clients by revenue, activity, and outstanding balances.',
  },
  projects: {
    icon: TrendingUp,
    titleKey: 'reportsPage.canonical.projects.title',
    titleFallback: 'Project Report',
    descKey: 'reportsPage.canonical.projects.desc',
    descFallback: 'Project performance, billing efficiency, and deadline adherence.',
  },
};

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function SystemReportPageV2() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const validSlug = (['revenue', 'payment', 'clients', 'projects'] as const).includes(
    slug as Slug,
  )
    ? (slug as Slug)
    : null;

  const query = useQuery({
    queryKey: ['system-report', validSlug],
    enabled: !!validSlug,
    queryFn: async (): Promise<any> => {
      switch (validSlug) {
        case 'revenue':
          return reportsService.getRevenueAnalytics();
        case 'payment':
          return reportsService.getPaymentAnalytics();
        case 'clients':
          return reportsService.getClientAnalytics(50);
        case 'projects':
          return reportsService.getProjectAnalytics(50);
        default:
          return null;
      }
    },
  });

  const data = query.data as any;
  const meta = validSlug ? SLUG_META[validSlug] : null;

  const shell = (children: React.ReactNode) => (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  // Unknown slug — don't silently bounce to dashboard; show a clear message.
  if (!validSlug || !meta) {
    return shell(
      <EmptyState
        icon={<LineChartIcon className="h-12 w-12" />}
        title={t('systemReport.unknown.title', 'Report not found')}
        description={t(
          'systemReport.unknown.desc',
          'This analytic report does not exist.',
        )}
        action={
          <Button onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4" />
            {t('systemReport.backToReports', 'Back to Reports')}
          </Button>
        }
      />,
    );
  }

  const Icon = meta.icon;

  return shell(
    <>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('systemReport.backToReports', 'Back to Reports')}
        </button>
      </div>

      <PageHeader
        title={t(meta.titleKey, meta.titleFallback)}
        description={t(meta.descKey, meta.descFallback)}
      />

      {query.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : query.error ? (
        <EmptyState
          icon={<Icon className="h-12 w-12" />}
          title={t('systemReport.error.title', 'Could not load report')}
          description={
            query.error instanceof Error
              ? query.error.message
              : t('systemReport.error.desc', 'An error occurred')
          }
          action={
            <Button onClick={() => query.refetch()}>
              {t('common.retry', 'Try Again')}
            </Button>
          }
        />
      ) : (
        <>
          {validSlug === 'revenue' && <RevenueView data={data} />}
          {validSlug === 'payment' && <PaymentView data={data} />}
          {validSlug === 'clients' && <ClientsView data={data} />}
          {validSlug === 'projects' && <ProjectsView data={data} />}
        </>
      )}
    </>,
  );
}

/* ------------------------------------------------------------------ */
/*  Per-report views                                                   */
/* ------------------------------------------------------------------ */

const chartGrid = 'var(--border-subtle, #2a2a30)';

const RevenueView = ({ data }: { data: any }) => {
  const { t } = useTranslation();
  const series = (data?.revenueByPeriod ?? []).map((r: any) => ({
    period: r.period,
    amount: toNumber(r.amount),
  }));
  return (
    <>
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label={t('systemReport.revenue.total', 'Total Revenue')}
          value={<MoneyDisplay amount={toNumber(data?.totalRevenue)} className="text-success" />}
        />
        <StatCard
          label={t('systemReport.revenue.average', 'Average / Period')}
          value={<MoneyDisplay amount={toNumber(data?.averageRevenue)} />}
        />
        <StatCard
          label={t('systemReport.revenue.invoices', 'Invoices')}
          value={toNumber(data?.invoiceCount)}
        />
      </section>
      <GlassPanel surface="glass" padding="lg">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-4">
          {t('systemReport.revenue.byPeriod', 'Revenue by Period')}
        </p>
        {series.length === 0 ? (
          <p className="text-sm text-text-tertiary italic">
            {t('systemReport.noData', 'No data for this period.')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`}
              />
              <Tooltip
                formatter={(v: any) => `Rp ${Number(v).toLocaleString('id-ID')}`}
                contentStyle={{ background: '#22222A', border: '1px solid #2a2a30', borderRadius: 8 }}
              />
              <Bar dataKey="amount" fill="#4988af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassPanel>
    </>
  );
};

const PaymentView = ({ data }: { data: any }) => {
  const { t } = useTranslation();
  const byStatus = (data?.invoicesByStatus ?? []).map((s: any) => ({
    status: s.status,
    count: s._count?.id ?? 0,
    amount: toNumber(s._sum?.totalAmount),
  }));
  return (
    <>
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label={t('systemReport.payment.overdueCount', 'Overdue Invoices')}
          value={toNumber(data?.overdueCount)}
        />
        <StatCard
          label={t('systemReport.payment.overdueAmount', 'Overdue Amount')}
          value={<MoneyDisplay amount={toNumber(data?.overdueAmount)} className="text-danger" />}
        />
        <StatCard
          label={t('systemReport.payment.statuses', 'Status Buckets')}
          value={byStatus.length}
        />
      </section>

      <GlassPanel surface="glass" padding="none" className="overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('systemReport.payment.byStatus', 'Invoices by Status')}
          </p>
        </div>
        <div className="px-1 pb-1">
          <DataTable<{ status: string; count: number; amount: number }>
            data={byStatus}
            enablePagination={false}
            columns={[
              { accessorKey: 'status', header: t('systemReport.payment.status', 'Status') },
              {
                accessorKey: 'count',
                header: () => <span className="block text-right">{t('systemReport.payment.count', 'Count')}</span>,
                cell: ({ row }) => <div className="text-right tabular-nums">{row.original.count}</div>,
              },
              {
                accessorKey: 'amount',
                header: () => <span className="block text-right">{t('systemReport.payment.amount', 'Amount')}</span>,
                cell: ({ row }) => (
                  <div className="text-right">
                    <MoneyDisplay amount={row.original.amount} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </GlassPanel>

      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('systemReport.payment.overdueList', 'Overdue Invoices')}
          </p>
        </div>
        <div className="px-1 pb-1">
          <DataTable<any>
            data={data?.overdueInvoices ?? []}
            enablePagination={false}
            columns={[
              { accessorKey: 'invoiceNumber', header: t('systemReport.payment.invoice', 'Invoice') },
              {
                id: 'client',
                header: t('systemReport.payment.client', 'Client'),
                cell: ({ row }) => <span>{row.original.client?.name ?? '—'}</span>,
              },
              {
                accessorKey: 'totalAmount',
                header: () => <span className="block text-right">{t('systemReport.payment.amount', 'Amount')}</span>,
                cell: ({ row }) => (
                  <div className="text-right">
                    <MoneyDisplay amount={toNumber(row.original.totalAmount)} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </GlassPanel>
    </>
  );
};

const ClientsView = ({ data }: { data: any }) => {
  const { t } = useTranslation();
  const rows = data?.topClients ?? [];
  return (
    <>
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label={t('systemReport.clients.total', 'Total Clients')}
          value={toNumber(data?.totalClients)}
        />
        <StatCard
          label={t('systemReport.clients.ranked', 'Ranked')}
          value={rows.length}
        />
      </section>
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('systemReport.clients.top', 'Top Clients by Revenue')}
          </p>
        </div>
        <div className="px-1 pb-1">
          <DataTable<any>
            data={rows}
            enablePagination={false}
            columns={[
              {
                id: 'client',
                header: t('systemReport.clients.name', 'Client'),
                cell: ({ row }) => (
                  <div className="font-medium text-text-primary">{row.original.client?.name ?? '—'}</div>
                ),
              },
              {
                accessorKey: 'invoiceCount',
                header: () => <span className="block text-right">{t('systemReport.clients.invoices', 'Invoices')}</span>,
                cell: ({ row }) => <div className="text-right tabular-nums">{row.original.invoiceCount}</div>,
              },
              {
                accessorKey: 'revenue',
                header: () => <span className="block text-right">{t('systemReport.clients.revenue', 'Revenue')}</span>,
                cell: ({ row }) => (
                  <div className="text-right">
                    <MoneyDisplay amount={toNumber(row.original.revenue)} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </GlassPanel>
    </>
  );
};

const ProjectsView = ({ data }: { data: any }) => {
  const { t } = useTranslation();
  const rows = data?.topProjects ?? [];
  return (
    <>
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label={t('systemReport.projects.total', 'Total Projects')}
          value={toNumber(data?.totalProjects)}
        />
        <StatCard
          label={t('systemReport.projects.ranked', 'Ranked')}
          value={rows.length}
        />
      </section>
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('systemReport.projects.top', 'Top Projects by Revenue')}
          </p>
        </div>
        <div className="px-1 pb-1">
          <DataTable<any>
            data={rows}
            enablePagination={false}
            columns={[
              {
                id: 'project',
                header: t('systemReport.projects.project', 'Project'),
                cell: ({ row }) => (
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary truncate">
                      {row.original.project?.number ?? '—'}
                    </div>
                    <div className="text-[11px] text-text-tertiary truncate">
                      {row.original.project?.client?.name ?? ''}
                    </div>
                  </div>
                ),
              },
              {
                id: 'status',
                header: t('systemReport.projects.status', 'Status'),
                cell: ({ row }) => <span className="text-text-secondary text-xs">{row.original.project?.status ?? '—'}</span>,
              },
              {
                accessorKey: 'revenue',
                header: () => <span className="block text-right">{t('systemReport.projects.revenue', 'Revenue')}</span>,
                cell: ({ row }) => (
                  <div className="text-right">
                    <MoneyDisplay amount={toNumber(row.original.revenue)} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </GlassPanel>
    </>
  );
};
