import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, Plus,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { reportsService } from '@/services/reports';
import { dashboardService } from '@/services/dashboard';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { RevealOnView } from '@/components/monomi/RevealOnView';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useDashboardData } from '@/hooks/useDashboard';


// Helper to get badge variant based on status
const getStatusBadgeVariant = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'default'; // green-ish
    case 'SENT':
      return 'secondary'; // blue-ish
    case 'DRAFT':
      return 'outline';
    case 'OVERDUE':
      return 'destructive'; // red
    case 'APPROVED':
      return 'default'; // green
    case 'DECLINED':
      return 'destructive';
    default:
      return 'secondary';
  }
};

// Helper to get status display text — locale-aware via i18next
const useStatusText = () => {
  const { t } = useTranslation();
  return (status: string, type: 'quotation' | 'invoice'): string => {
    if (type === 'quotation') {
      const map: Record<string, string> = {
        DRAFT:    t('quotations.status.draft',    'Draft'),
        SENT:     t('quotations.status.sent',     'Terkirim'),
        APPROVED: t('quotations.status.approved', 'Disetujui'),
        DECLINED: t('quotations.status.declined', 'Ditolak'),
      };
      return map[status?.toUpperCase()] ?? status;
    }
    const map: Record<string, string> = {
      DRAFT:   t('invoices.status.draft',   'Draft'),
      SENT:    t('invoices.status.sent',    'Terkirim'),
      PAID:    t('invoices.status.paid',    'Lunas'),
      OVERDUE: t('invoices.status.overdue', 'Jatuh Tempo'),
      PENDING: t('invoices.status.pending', 'Tertunda'),
    };
    return map[status?.toUpperCase()] ?? status;
  };
};

export default function DashboardPageV2() {
  const { t } = useTranslation();
  const getStatusText = useStatusText();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();

  const stats = dashboardData?.stats || {
    totalQuotations: 0,
    totalInvoices: 0,
    totalClients: 0,
    totalProjects: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  };

  const recentQuotations = dashboardData?.recentQuotations || [];
  const recentInvoices = dashboardData?.recentInvoices || [];

  const { data: revenueAnalytics } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: () => reportsService.getRevenueAnalytics({ period: 'monthly' }),
    staleTime: 5 * 60 * 1000, // 5 min — prevents refetch-flicker on window focus
  });
  const revenueData = useMemo(
    () => (revenueAnalytics?.revenueByPeriod ?? []).map((item) => ({
      month: item.period,
      revenue: item.amount,
    })),
    [revenueAnalytics],
  );

  // Invoice stats for the payment-status donut chart.
  const { data: invoiceStats } = useQuery({
    queryKey: ['dashboard-invoice-stats'],
    queryFn: dashboardService.getInvoiceStats,
    staleTime: 5 * 60 * 1000,
  });

  const paymentDonutData = useMemo(() => {
    if (!invoiceStats?.byStatus) return [];
    const { byStatus } = invoiceStats;
    const entries: { name: string; value: number; color: string }[] = [
      { name: t('invoices.status.paid',    'Paid'),    value: byStatus.PAID    ?? 0, color: '#059669' },
      { name: t('invoices.status.sent',    'Sent'),    value: byStatus.SENT    ?? 0, color: '#1e40af' },
      { name: t('invoices.status.draft',   'Draft'),   value: byStatus.DRAFT   ?? 0, color: '#6b7280' },
      { name: t('invoices.status.overdue', 'Overdue'), value: byStatus.OVERDUE ?? 0, color: '#dc2626' },
    ];
    return entries.filter((e) => e.value > 0);
  }, [invoiceStats, t]);

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
            icon={<FileText className="h-12 w-12" />}
            title={t('dashboard.error.title', 'Tidak bisa memuat dashboard')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
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
          title={t('dashboard.title', 'Dashboard')}
          description={t('dashboard.subtitle', 'Ringkasan bisnis Anda hari ini')}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/quotations/new')}>
                <Plus className="h-4 w-4" />
                {t('dashboard.newQuotation', '+ Penawaran Baru')}
              </Button>
              <Button size="sm" onClick={() => navigate('/invoices/new')}>
                <Plus className="h-4 w-4" />
                {t('dashboard.newInvoice', '+ Invoice Baru')}
              </Button>
            </div>
          }
        />

        {/* KPI band — tight gap so the four cards read as one band, not four billboards */}
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
                {/* Staggered cinematic reveal — each card arrives 80ms after
                 * the previous, giving the band of KPIs a deliberate cadence
                 * that feels designed, not random. */}
                <RevealOnView delay={0}>
                  <StatCard
                    label={t('dashboard.revenue', 'Pendapatan')}
                    value={<MoneyDisplay amount={stats.totalRevenue} />}
                    sublabel={t('dashboard.thisMonth', 'bulan ini')}
                    href="/invoices?status=PAID"
                  />
                </RevealOnView>
                <RevealOnView delay={80}>
                  <StatCard
                    label={t('dashboard.outstanding', 'Belum Tertagih')}
                    value={<MoneyDisplay amount={stats.pendingPayments} />}
                    sublabel={t('dashboard.unpaid', 'belum dibayar')}
                    href="/invoices?status=OVERDUE"
                  />
                </RevealOnView>
                <RevealOnView delay={160}>
                  <StatCard
                    label={t('dashboard.activeProjects', 'Proyek Aktif')}
                    value={stats.totalProjects}
                    sublabel={t('dashboard.ongoing', 'berlangsung')}
                    href="/projects?status=IN_PROGRESS"
                  />
                </RevealOnView>
                <RevealOnView delay={240}>
                  <StatCard
                    label={t('dashboard.totalClients', 'Klien Aktif')}
                    value={stats.totalClients}
                    sublabel={t('dashboard.active', 'aktif')}
                    href="/clients"
                  />
                </RevealOnView>
              </>
            )}
          </div>
        </section>

        {/* Revenue trend + Payment status donut — side-by-side on large screens */}
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Revenue trend */}
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('dashboard.revenueTrend', 'Tren Pendapatan')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t('dashboard.last6Months', 'Enam bulan terakhir')}
                </p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-64 rounded-md" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(246,243,232,0.06)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(246,243,232,0.35)"
                    tick={{ fontSize: 11, fill: 'rgba(246,243,232,0.45)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(246,243,232,0.35)"
                    tick={{ fontSize: 11, fill: 'rgba(246,243,232,0.45)' }}
                    tickFormatter={(value) => `${Math.round(value / 1000000)}jt`}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(246,243,232,0.15)', strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: '#131316',
                      border: '1px solid rgba(246, 243, 232, 0.12)',
                      borderRadius: '8px',
                      color: '#F6F3E8',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: 'rgba(246,243,232,0.55)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
                    formatter={(value) => [`Rp ${(Number(value) / 1000000).toFixed(1)} jt`, 'Pendapatan']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F6F3E8"
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 4, fill: '#F6F3E8', stroke: '#030303', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </GlassPanel>

          {/* Payment-status donut */}
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-4">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('dashboard.invoiceStatus', 'Status Invoice')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t('dashboard.invoiceStatusDesc', 'Distribusi berdasarkan jumlah')}
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-48 rounded-md" />
            ) : paymentDonutData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-text-tertiary gap-2">
                <FileText className="h-8 w-8 opacity-30" />
                <p className="text-xs">{t('dashboard.noInvoiceData', 'Belum ada data invoice')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentDonutData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {paymentDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#131316',
                      border: '1px solid rgba(246, 243, 232, 0.12)',
                      borderRadius: '8px',
                      color: '#F6F3E8',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    formatter={(value) => [`${value} invoice`]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: 'rgba(246,243,232,0.65)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </GlassPanel>
        </section>

        {/* Recent activity — paired tables in one rhythmic row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recent Quotations */}
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('dashboard.recentQuotations', 'Penawaran Terbaru')}
              </h2>
              <a href="/quotations" className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                {t('common.viewAll', 'Lihat semua')} →
              </a>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : recentQuotations.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-8 w-8" />}
                title={t('dashboard.noQuotations', 'Belum ada penawaran')}
                description={t('dashboard.noQuotationsDesc', 'Buat penawaran pertama Anda')}
                action={
                  <Button size="sm" onClick={() => navigate('/quotations/new')}>
                    <Plus className="h-4 w-4" />
                    {t('dashboard.newQuotation', '+ Penawaran Baru')}
                  </Button>
                }
              />
            ) : (
              <DataTable
                data={recentQuotations}
                columns={[
                  { accessorKey: 'quotationNumber', header: t('table.number', 'Nomor') },
                  {
                    accessorKey: 'client.name',
                    header: t('table.client', 'Klien'),
                    cell: ({ row }) => row.original.client?.name || '-',
                  },
                  {
                    accessorKey: 'totalAmount',
                    header: t('table.amount', 'Jumlah'),
                    cell: ({ row }) => (
                      <MoneyDisplay
                        amount={parseFloat(row.original.totalAmount) || 0}
                      />
                    ),
                  },
                  {
                    accessorKey: 'status',
                    header: t('table.status', 'Status'),
                    cell: ({ row }) => (
                      <Badge variant={getStatusBadgeVariant(row.original.status)}>
                        {getStatusText(row.original.status, 'quotation')}
                      </Badge>
                    ),
                  },
                  {
                    accessorKey: 'date',
                    header: t('table.date', 'Tanggal'),
                    cell: ({ row }) => <DateDisplay date={row.original.date} />,
                  },
                ]}
                enablePagination={false}
                onRowClick={(row) => navigate(`/quotations/${row.id}`)}
              />
            )}
          </GlassPanel>

          {/* Recent Invoices */}
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('dashboard.recentInvoices', 'Invoice Terbaru')}
              </h2>
              <a href="/invoices" className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                {t('common.viewAll', 'Lihat semua')} →
              </a>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title={t('dashboard.noInvoices', 'Belum ada invoice')}
                description={t('dashboard.noInvoicesDesc', 'Buat invoice pertama Anda')}
                action={
                  <Button size="sm" onClick={() => navigate('/invoices/new')}>
                    <Plus className="h-4 w-4" />
                    {t('dashboard.newInvoice', '+ Invoice Baru')}
                  </Button>
                }
              />
            ) : (
              <DataTable
                data={recentInvoices}
                columns={[
                  { accessorKey: 'invoiceNumber', header: t('table.number', 'Nomor') },
                  {
                    accessorKey: 'client.name',
                    header: t('table.client', 'Klien'),
                    cell: ({ row }) => row.original.client?.name || '-',
                  },
                  {
                    accessorKey: 'totalAmount',
                    header: t('table.amount', 'Jumlah'),
                    cell: ({ row }) => (
                      <MoneyDisplay
                        amount={parseFloat(row.original.totalAmount) || 0}
                      />
                    ),
                  },
                  {
                    accessorKey: 'status',
                    header: t('table.status', 'Status'),
                    cell: ({ row }) => (
                      <Badge variant={getStatusBadgeVariant(row.original.status)}>
                        {getStatusText(row.original.status, 'invoice')}
                      </Badge>
                    ),
                  },
                  {
                    accessorKey: 'dueDate',
                    header: t('table.dueDate', 'Jatuh Tempo'),
                    cell: ({ row }) => <DateDisplay date={row.original.dueDate} />,
                  },
                ]}
                enablePagination={false}
                onRowClick={(row) => navigate(`/invoices/${row.id}`)}
              />
            )}
          </GlassPanel>
        </section>
      </PageContainer>
    </AppShell>
  );
}
