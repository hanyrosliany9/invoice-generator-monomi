/* ------------------------------------------------------------------ */
/*  MonthlyBusinessReportPage (v2)                                     */
/*                                                                     */
/*  An OVERALL monthly business report compiled AUTOMATICALLY from the */
/*  data already in the system — revenue, invoices, AR/overdue, top    */
/*  clients & projects, conversion & payment rates. No manual input,   */
/*  no CSV upload, no chart configuration: pick a month and it's there.*/
/* ------------------------------------------------------------------ */

import { useMemo, useState } from 'react';
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
import { Printer, TrendingUp, AlertTriangle, Wallet, Receipt } from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { StatCard } from '@/components/monomi/StatCard';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { reportsService } from '@/services/reports';

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function MonthlyBusinessReportPageV2() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState<number>(now.getFullYear());

  const months = (i18n.language || '').startsWith('id') ? MONTHS_ID : MONTHS_EN;
  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2];
  }, [now]);

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59); // last day of month
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [year, month]);

  const summaryQ = useQuery({
    queryKey: ['monthly-report', 'summary', year, month],
    queryFn: () => reportsService.getFinancialSummary({ startDate, endDate }),
  });
  const revenueQ = useQuery({
    queryKey: ['monthly-report', 'revenue', year, month],
    queryFn: () => reportsService.getRevenueAnalytics({ startDate, endDate }),
  });
  const clientsQ = useQuery({
    queryKey: ['monthly-report', 'clients'],
    queryFn: () => reportsService.getClientAnalytics(10),
  });
  const projectsQ = useQuery({
    queryKey: ['monthly-report', 'projects'],
    queryFn: () => reportsService.getProjectAnalytics(10),
  });
  const paymentsQ = useQuery({
    queryKey: ['monthly-report', 'payments'],
    queryFn: () => reportsService.getPaymentAnalytics(),
  });

  const isLoading =
    summaryQ.isLoading || revenueQ.isLoading || clientsQ.isLoading || projectsQ.isLoading;
  const isError =
    summaryQ.isError || revenueQ.isError || clientsQ.isError || projectsQ.isError;

  const s = summaryQ.data;
  const outstanding = toNumber(s?.invoices.totalValue) - toNumber(s?.invoices.paidValue);
  const revenueSeries = (revenueQ.data?.revenueByPeriod ?? []).map((r) => ({
    period: r.period,
    amount: toNumber(r.amount),
  }));

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
          title={t('monthlyReport.title', 'Monthly Business Report')}
          description={t(
            'monthlyReport.subtitle',
            'Compiled automatically from your live data — no manual input required.',
          )}
          breadcrumbs={[
            { label: t('reportsPage.title', 'Reports'), href: '/reports' },
            { label: `${months[month - 1]} ${year}` },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle min-w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {t('monthlyReport.print', 'Print / PDF')}
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)}
            </div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <GlassPanel surface="glass" padding="lg">
            <EmptyState
              icon={<AlertTriangle className="h-12 w-12 text-danger" />}
              title={t('monthlyReport.error.title', 'Failed to load report data')}
              description={t('monthlyReport.error.description', 'One or more data sources could not be fetched. Please try again.')}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    summaryQ.refetch();
                    revenueQ.refetch();
                    clientsQ.refetch();
                    projectsQ.refetch();
                    paymentsQ.refetch();
                  }}
                >
                  {t('common.retry', 'Coba Lagi')}
                </Button>
              }
            />
          </GlassPanel>
        ) : (
          <>
            {/* Headline KPIs */}
            <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label={t('monthlyReport.kpi.revenue', 'Revenue (Paid)')}
                value={<MoneyDisplay amount={toNumber(s?.invoices.paidValue)} className="text-success" />}
                sublabel={t('monthlyReport.kpi.revenueSub', 'collected this month')}
              />
              <StatCard
                label={t('monthlyReport.kpi.invoiced', 'Invoiced')}
                value={<MoneyDisplay amount={toNumber(s?.invoices.totalValue)} />}
                sublabel={t('monthlyReport.kpi.invoicedSub', '{{n}} invoices', { n: toNumber(s?.invoices.total) })}
              />
              <StatCard
                label={t('monthlyReport.kpi.outstanding', 'Outstanding (AR)')}
                value={<MoneyDisplay amount={Math.max(outstanding, 0)} />}
                sublabel={t('monthlyReport.kpi.outstandingSub', 'awaiting payment')}
              />
              <StatCard
                label={t('monthlyReport.kpi.overdue', 'Overdue')}
                value={<MoneyDisplay amount={toNumber(paymentsQ.data?.overdueAmount)} className="text-danger" />}
                sublabel={t('monthlyReport.kpi.overdueSub', '{{n}} invoices', { n: toNumber(paymentsQ.data?.overdueCount) })}
              />
            </section>

            {/* Secondary metrics */}
            <section className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t('monthlyReport.kpi.conversion', 'Quote → Invoice')} value={`${toNumber(s?.conversionRate)}%`} sublabel={t('monthlyReport.kpi.conversionSub', 'conversion rate')} />
              <StatCard label={t('monthlyReport.kpi.paymentRate', 'Payment Rate')} value={`${toNumber(s?.paymentRate)}%`} sublabel={t('monthlyReport.kpi.paymentRateSub', 'invoices paid')} />
              <StatCard label={t('monthlyReport.kpi.newClients', 'New Clients')} value={toNumber(s?.newClients)} sublabel={t('monthlyReport.kpi.newClientsSub', 'this month')} />
              <StatCard label={t('monthlyReport.kpi.newProjects', 'New Projects')} value={toNumber(s?.newProjects)} sublabel={t('monthlyReport.kpi.newProjectsSub', 'this month')} />
            </section>

            {/* Revenue chart */}
            <GlassPanel surface="glass" padding="lg" className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-info" />
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                  {t('monthlyReport.revenueByPeriod', 'Revenue by Period')}
                </p>
              </div>
              {revenueSeries.length === 0 ? (
                <p className="text-sm text-text-tertiary italic">{t('monthlyReport.noRevenue', 'No revenue recorded for this period.')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: any) => `Rp ${Number(v).toLocaleString('id-ID')}`} contentStyle={{ background: '#22222A', border: '1px solid #2a2a30', borderRadius: 8 }} />
                    <Bar dataKey="amount" fill="#4988af" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top clients */}
              <GlassPanel surface="glass" padding="none" className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-success" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('monthlyReport.topClients', 'Top Clients (all-time)')}</p>
                </div>
                <div className="px-1 pb-1">
                  <DataTable<any>
                    data={clientsQ.data?.topClients ?? []}
                    enablePagination={false}
                    columns={[
                      { id: 'client', header: t('monthlyReport.client', 'Client'), cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.client?.name ?? '—'}</span> },
                      { accessorKey: 'revenue', header: () => <span className="block text-right">{t('monthlyReport.revenue', 'Revenue')}</span>, cell: ({ row }) => <div className="text-right"><MoneyDisplay amount={toNumber(row.original.revenue)} /></div> },
                    ]}
                  />
                </div>
              </GlassPanel>

              {/* Top projects */}
              <GlassPanel surface="glass" padding="none" className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-info" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('monthlyReport.topProjects', 'Top Projects (all-time)')}</p>
                </div>
                <div className="px-1 pb-1">
                  <DataTable<any>
                    data={projectsQ.data?.topProjects ?? []}
                    enablePagination={false}
                    columns={[
                      { id: 'project', header: t('monthlyReport.project', 'Project'), cell: ({ row }) => <span className="font-medium text-text-primary truncate">{row.original.project?.number ?? '—'}</span> },
                      { accessorKey: 'revenue', header: () => <span className="block text-right">{t('monthlyReport.revenue', 'Revenue')}</span>, cell: ({ row }) => <div className="text-right"><MoneyDisplay amount={toNumber(row.original.revenue)} /></div> },
                    ]}
                  />
                </div>
              </GlassPanel>
            </div>

            {/* Payment status breakdown */}
            <GlassPanel surface="glass" padding="none" className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('monthlyReport.paymentStatus', 'Invoices by Status (all-time)')}</p>
              </div>
              <div className="px-1 pb-1">
                <DataTable<any>
                  data={(paymentsQ.data?.invoicesByStatus ?? []).map((b) => ({ status: b.status, count: b._count?.id ?? 0, amount: toNumber(b._sum?.totalAmount) }))}
                  enablePagination={false}
                  columns={[
                    { accessorKey: 'status', header: t('monthlyReport.status', 'Status') },
                    { accessorKey: 'count', header: () => <span className="block text-right">{t('monthlyReport.count', 'Count')}</span>, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.count}</div> },
                    { accessorKey: 'amount', header: () => <span className="block text-right">{t('monthlyReport.amount', 'Amount')}</span>, cell: ({ row }) => <div className="text-right"><MoneyDisplay amount={row.original.amount} /></div> },
                  ]}
                />
              </div>
            </GlassPanel>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
