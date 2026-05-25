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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useDashboardData } from '@/hooks/useDashboard';

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

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
          brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
          items: sidebarItems,
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
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
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

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </>
          ) : (
            <>
              <StatCard
                label={t('dashboard.revenue', 'Revenue')}
                value={<MoneyDisplay amount={stats.totalRevenue} />}
                sublabel={t('dashboard.thisMonth', 'bulan ini')}
              />
              <StatCard
                label={t('dashboard.outstanding', 'Outstanding')}
                value={<MoneyDisplay amount={stats.pendingPayments} />}
                sublabel={t('dashboard.unpaid', 'belum dibayar')}
              />
              <StatCard
                label={t('dashboard.activeProjects', 'Proyek Aktif')}
                value={stats.totalProjects}
                sublabel={t('dashboard.ongoing', 'berlangsung')}
              />
              <StatCard
                label={t('dashboard.totalClients', 'Klien Aktif')}
                value={stats.totalClients}
                sublabel={t('dashboard.active', 'aktif')}
              />
            </>
          )}
        </div>

        {/* Chart Row */}
        <GlassPanel className="mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-display font-semibold text-text-primary">
              {t('dashboard.revenueTrend', 'Revenue Trend')}
            </h3>
            <p className="text-sm text-text-secondary">{t('dashboard.last6Months', 'Enam bulan terakhir')}</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="month"
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '0.875rem' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '0.875rem' }}
                  tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(20, 20, 40, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => `Rp ${(value / 1000000).toFixed(1)}M`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {/* TODO: Replace with real revenue trend data from API when available */}
        </GlassPanel>

        {/* Two-column Row: Recent Quotations + Recent Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Quotations */}
          <GlassPanel>
            <div className="mb-4">
              <h3 className="text-lg font-display font-semibold text-text-primary">
                {t('dashboard.recentQuotations', 'Penawaran Terbaru')}
              </h3>
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
          <GlassPanel>
            <div className="mb-4">
              <h3 className="text-lg font-display font-semibold text-text-primary">
                {t('dashboard.recentInvoices', 'Invoice Terbaru')}
              </h3>
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
        </div>
      </PageContainer>
    </AppShell>
  );
}
