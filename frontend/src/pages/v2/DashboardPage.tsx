import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
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

// Generate stub revenue trend data (6 months)
const generateRevenueData = () => [
  { month: 'Jan', revenue: 12500000 },
  { month: 'Feb', revenue: 15800000 },
  { month: 'Mar', revenue: 14200000 },
  { month: 'Apr', revenue: 18900000 },
  { month: 'May', revenue: 21500000 },
  { month: 'Jun', revenue: 19300000 },
];

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

// Helper to get status display text
const getStatusText = (status: string, type: 'quotation' | 'invoice') => {
  const quotationMap: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    APPROVED: 'Disetujui',
    DECLINED: 'Ditolak',
  };

  const invoiceMap: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    PAID: 'Lunas',
    OVERDUE: 'Jatuh Tempo',
    PENDING: 'Tertunda',
  };

  const map = type === 'quotation' ? quotationMap : invoiceMap;
  return map[status?.toUpperCase() as keyof typeof map] || status;
};

export default function DashboardPageV2() {
  const { t } = useTranslation();
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
  const revenueData = useMemo(() => generateRevenueData(), []);

  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{
          right: (
            <Button variant="ghost" size="sm">
              {user?.name || 'User'}
            </Button>
          ),
        }}
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
      topbar={{
        right: (
          <Button variant="ghost" size="sm">
            {user?.name || 'User'}
          </Button>
        ),
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('dashboard.title', 'Dashboard')}
          description={t('dashboard.subtitle', 'Ringkasan bisnis Anda hari ini')}
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
                  />
                </RevealOnView>
                <RevealOnView delay={80}>
                  <StatCard
                    label={t('dashboard.outstanding', 'Belum Tertagih')}
                    value={<MoneyDisplay amount={stats.pendingPayments} />}
                    sublabel={t('dashboard.unpaid', 'belum dibayar')}
                  />
                </RevealOnView>
                <RevealOnView delay={160}>
                  <StatCard
                    label={t('dashboard.activeProjects', 'Proyek Aktif')}
                    value={stats.totalProjects}
                    sublabel={t('dashboard.ongoing', 'berlangsung')}
                  />
                </RevealOnView>
                <RevealOnView delay={240}>
                  <StatCard
                    label={t('dashboard.totalClients', 'Klien Aktif')}
                    value={stats.totalClients}
                    sublabel={t('dashboard.active', 'aktif')}
                  />
                </RevealOnView>
              </>
            )}
          </div>
        </section>

        {/* Revenue chart — its own breathing section */}
        <section className="mb-12">
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
            {/* TODO: Replace with real revenue trend data from API when available */}
          </GlassPanel>
        </section>

        {/* Recent activity — paired tables in one rhythmic row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
