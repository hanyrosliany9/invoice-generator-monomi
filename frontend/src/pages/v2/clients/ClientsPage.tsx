import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
  Search,
  Plus,
  X,
  Mail,
  Phone,
} from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { clientService, type Client } from '@/services/clients';

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

// Derive a 1-2 character avatar token from name or company, preferring
// the human-name when present so individuals don't all collapse to "PT".
const getInitials = (client: Client): string => {
  const source = (client.name || client.company || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const isActive = (status?: string) => (status ?? 'active') === 'active';

export default function ClientsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const {
    data: clients = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  const filteredClients = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' || (isActive(c.status) ? 'active' : 'inactive') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchText, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeCount = clients.filter((c) => isActive(c.status)).length;
    const newThisMonth = clients.filter((c) => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt) >= monthAgo;
    }).length;
    const totalRevenue = clients.reduce((sum, c) => sum + (Number(c.totalPaid) || 0), 0);
    const totalOutstanding = clients.reduce((sum, c) => sum + (Number(c.totalPending) || 0), 0);
    return { activeCount, newThisMonth, totalRevenue, totalOutstanding };
  }, [clients]);

  const hasActiveFilters = searchText.trim().length > 0 || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('all');
  };

  // Editorial column definitions — left-aligned identity, mid-density contact,
  // right-aligned numerics so the eye can scan revenue down the column.
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('clients.table.client', 'Klien'),
        cell: ({ row }: { row: { original: Client } }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-xs font-medium tracking-wide">
                  {getInitials(c)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {c.name || '—'}
                </div>
                {c.company && (
                  <div className="text-xs text-text-tertiary truncate">{c.company}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: t('clients.table.contact', 'Kontak'),
        enableSorting: false,
        cell: ({ row }: { row: { original: Client } }) => {
          const c = row.original;
          if (!c.email && !c.phone) {
            return <span className="text-text-tertiary">—</span>;
          }
          return (
            <div className="min-w-0 space-y-1">
              {c.email && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate">
                  <Mail className="h-3 w-3 text-text-tertiary shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary truncate">
                  <Phone className="h-3 w-3 text-text-tertiary shrink-0" />
                  <span className="truncate">{c.phone}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'totalPaid',
        header: () => (
          <span className="block text-right">{t('clients.table.revenue', 'Pendapatan')}</span>
        ),
        cell: ({ row }: { row: { original: Client } }) => {
          const paid = Number(row.original.totalPaid) || 0;
          const pending = Number(row.original.totalPending) || 0;
          return (
            <div className="text-right">
              <MoneyDisplay
                amount={paid}
                className={cn(
                  'text-sm',
                  paid > 0 ? 'text-text-primary' : 'text-text-tertiary',
                )}
              />
              {pending > 0 && (
                <div className="mt-0.5 text-[11px] text-text-tertiary tabular-nums">
                  <MoneyDisplay amount={pending} className="text-[11px] text-text-tertiary" />
                  <span className="ml-1">{t('clients.table.pending', 'tertunda')}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('clients.table.status', 'Status'),
        cell: ({ row }: { row: { original: Client } }) => {
          const active = isActive(row.original.status);
          return (
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                active
                  ? 'bg-success/10 text-success'
                  : 'bg-bg-sunken text-text-tertiary',
              )}
            >
              <span
                className={cn(
                  'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                  active ? 'bg-success' : 'bg-text-tertiary',
                )}
              />
              {active
                ? t('clients.status.active', 'Aktif')
                : t('clients.status.inactive', 'Nonaktif')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'lastTransaction',
        header: t('clients.table.lastActivity', 'Aktivitas Terakhir'),
        cell: ({ row }: { row: { original: Client } }) => (
          <DateDisplay
            date={row.original.lastTransaction || row.original.updatedAt}
            className="text-xs text-text-secondary"
          />
        ),
      },
    ],
    [t],
  );

  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
          items: sidebarItems,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{
          right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
      >
        <PageContainer>
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('clients.error.title', 'Tidak bisa memuat data klien')}
            description={error instanceof Error ? error.message : t('common.errorGeneric', 'Terjadi kesalahan')}
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
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('clients.title', 'Klien')}
          description={t(
            'clients.subtitle',
            'Kelola data klien, kontak, dan riwayat transaksi bisnis Anda.',
          )}
          actions={
            <Button
              onClick={() => navigate('/v2/clients/new')}
              className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
            >
              <Plus className="h-4 w-4" />
              {t('clients.create', 'Klien Baru')}
            </Button>
          }
        />

        {/* KPI band — tight gap so four cards read as one band */}
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
                  label={t('clients.kpi.active', 'Klien Aktif')}
                  value={stats.activeCount}
                  sublabel={t('clients.kpi.activeSub', 'dari {{total}} total', {
                    total: clients.length,
                  })}
                />
                <StatCard
                  label={t('clients.kpi.new', 'Baru Bulan Ini')}
                  value={stats.newThisMonth}
                  sublabel={t('clients.kpi.newSub', 'pendaftaran baru')}
                />
                <StatCard
                  label={t('clients.kpi.revenue', 'Total Pendapatan')}
                  value={<MoneyDisplay amount={stats.totalRevenue} />}
                  sublabel={t('clients.kpi.revenueSub', 'sepanjang waktu')}
                />
                <StatCard
                  label={t('clients.kpi.outstanding', 'Belum Tertagih')}
                  value={<MoneyDisplay amount={stats.totalOutstanding} />}
                  sublabel={t('clients.kpi.outstandingSub', 'menunggu pembayaran')}
                />
              </>
            )}
          </div>
        </section>

        {/* Directory section — filters and table share one panel so they read
            as a single editorial unit, not two stacked widgets. */}
        <section>
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('clients.directory', 'Daftar Klien')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Memuat…')
                    : t('clients.directoryCount', '{{count}} klien ditemukan', {
                        count: filteredClients.length,
                      })}
                </p>
              </div>
            </div>

            {/* Filter row */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('clients.searchPlaceholder', 'Cari nama, perusahaan, atau email…')}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-full sm:w-44 bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('clients.filter.allStatus', 'Semua Status')}</SelectItem>
                  <SelectItem value="active">{t('clients.status.active', 'Aktif')}</SelectItem>
                  <SelectItem value="inactive">{t('clients.status.inactive', 'Nonaktif')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="mb-4 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-text-tertiary">{t('common.filters', 'Filter aktif')}:</span>
                {searchText.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    <span className="truncate max-w-[160px]">"{searchText.trim()}"</span>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    {statusFilter === 'active'
                      ? t('clients.status.active', 'Aktif')
                      : t('clients.status.inactive', 'Nonaktif')}
                    <X className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-text-tertiary hover:text-text-primary transition-colors underline-offset-2 hover:underline"
                >
                  {t('common.clearAll', 'Bersihkan semua')}
                </button>
              </div>
            )}

            {/* Table / loading / empty */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : filteredClients.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={<Search className="h-12 w-12" />}
                  title={t('clients.empty.filtered.title', 'Tidak ada klien yang cocok')}
                  description={t(
                    'clients.empty.filtered.desc',
                    'Coba ubah kata kunci atau bersihkan filter untuk melihat semua klien.',
                  )}
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      {t('common.clearAll', 'Bersihkan semua')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title={t('clients.empty.title', 'Belum ada klien')}
                  description={t(
                    'clients.empty.desc',
                    'Mulai bangun basis klien Anda dengan menambahkan klien pertama.',
                  )}
                  action={
                    <Button
                      onClick={() => navigate('/v2/clients/new')}
                      className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                    >
                      <Plus className="h-4 w-4" />
                      {t('clients.create', 'Klien Baru')}
                    </Button>
                  }
                />
              )
            ) : (
              <DataTable
                data={filteredClients}
                columns={columns}
                enablePagination={filteredClients.length > 10}
                onRowClick={(row) => navigate(`/v2/clients/${row.id}`)}
              />
            )}
          </GlassPanel>
        </section>
      </PageContainer>
    </AppShell>
  );
}
