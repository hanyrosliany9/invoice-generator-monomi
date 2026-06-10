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
  Truck,
  Building2,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
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
import { vendorService } from '@/services/vendors';
import {
  VENDOR_TYPES,
  PKP_STATUSES,
  type Vendor,
  type VendorType,
  type PKPStatus,
} from '@/types/vendor';

// Sidebar mirrors the rest of v2 — keeps the chrome identical so
// navigating between Clients and Vendors doesn't feel like two apps.
// Avatar token — prefer the human-readable name so PT-prefixed vendors
// don't all collapse to "PT". Fall back to "?".
const getInitials = (vendor: Vendor): string => {
  const source = (vendor.nameId || vendor.name || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  // Skip a leading "PT" or "CV" so the initials read as the company itself.
  if (parts.length >= 3 && /^(PT|CV)\.?$/i.test(parts[0])) {
    return (parts[1][0] + parts[2][0]).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Vendor type → editorial chip. Same vocabulary as the form, single
// place that decides "what looks like what" so the table never drifts.
const vendorTypeStyle = (type: VendorType) => {
  switch (type) {
    case 'SUPPLIER':
      return 'bg-info/10 text-info';
    case 'SERVICE_PROVIDER':
      return 'bg-accent-navy-soft text-text-secondary';
    case 'CONTRACTOR':
      return 'bg-warning/10 text-warning';
    case 'CONSULTANT':
      return 'bg-success/10 text-success';
    case 'GOVERNMENT':
      return 'bg-accent-navy-wash text-text-primary';
    case 'UTILITY':
    case 'OTHER':
    default:
      return 'bg-bg-sunken text-text-tertiary';
  }
};

// Total transaction count — used both as "activity" signal in the
// row and as the KPI denominator. Keep it derived from one helper so
// the two surfaces never disagree.
const txnCount = (vendor: Vendor): number => {
  const c = vendor._count || ({} as Record<string, number | undefined>);
  return (
    (c.purchaseOrders || 0) +
    (c.vendorInvoices || 0) +
    (c.expenses || 0) +
    (c.assets || 0)
  );
};

export default function VendorsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Filter state — searchInput drives the visible input; searchText
  // (debounced) drives the actual filter pass so typing stays snappy.
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [typeFilter, setTypeFilter] = useState<'all' | VendorType>('all');
  const [pkpFilter, setPkpFilter] = useState<'all' | PKPStatus>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Single page fetch — list page does client-side filtering on the
  // dataset already returned. Matches ClientsPage's pattern and avoids
  // server round-trips per keystroke.
  const {
    data: vendorsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vendors', { limit: 200, sortBy: 'createdAt', sortOrder: 'desc' }],
    queryFn: () =>
      vendorService.getVendors({
        limit: 200,
        page: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const { data: statistics } = useQuery({
    queryKey: ['vendorStatistics'],
    queryFn: vendorService.getVendorStatistics,
  });

  const vendors = vendorsData?.data || [];

  const filteredVendors = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchesSearch =
        !q ||
        (v.name || '').toLowerCase().includes(q) ||
        (v.nameId || '').toLowerCase().includes(q) ||
        (v.vendorCode || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q) ||
        (v.phone || '').toLowerCase().includes(q) ||
        (v.contactPerson || '').toLowerCase().includes(q) ||
        (v.city || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || v.vendorType === typeFilter;
      const matchesPkp = pkpFilter === 'all' || v.pkpStatus === pkpFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (v.isActive ? 'active' : 'inactive') === statusFilter;
      return matchesSearch && matchesType && matchesPkp && matchesStatus;
    });
  }, [vendors, searchText, typeFilter, pkpFilter, statusFilter]);

  // KPI band — financial first (outstanding to vendors, top spend),
  // volume second (active vendors, total POs). Spend totals fall back
  // to client-side reductions when the statistics endpoint doesn't
  // ship a dedicated number; this keeps the band populated regardless.
  const stats = useMemo(() => {
    const activeCount = statistics?.activeVendors ?? vendors.filter((v) => v.isActive).length;
    const totalPOs =
      statistics?.vendorsWithPOs ??
      vendors.reduce((sum, v) => sum + (v._count?.purchaseOrders ?? 0), 0);
    // No outstanding-AP aggregate is exposed by the vendor API yet, so
    // we surface the count of vendors with open AP rows as a proxy.
    const vendorsWithAP = vendors.reduce(
      (sum, v) => sum + ((v._count?.accountsPayable ?? 0) > 0 ? 1 : 0),
      0,
    );
    // Top vendor by transaction volume — first-pass proxy for spend,
    // since per-vendor revenue isn't on the listing payload.
    const top = vendors
      .map((v) => ({ vendor: v, count: txnCount(v) }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)[0];
    return { activeCount, totalPOs, vendorsWithAP, top };
  }, [vendors, statistics]);

  const hasActiveFilters =
    searchText.trim().length > 0 ||
    typeFilter !== 'all' ||
    pkpFilter !== 'all' ||
    statusFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setTypeFilter('all');
    setPkpFilter('all');
    setStatusFilter('all');
  };

  // Column definitions — left-aligned identity, mid-density contact,
  // right-aligned numerics so the eye can scan transaction counts down.
  const columns = useMemo(
    () => [
      {
        accessorKey: 'vendorCode',
        header: t('vendors.table.code', 'Kode'),
        cell: ({ row }: { row: { original: Vendor } }) => (
          <span className="text-xs font-mono tabular-nums text-text-tertiary">
            {row.original.vendorCode || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('vendors.table.vendor', 'Vendor'),
        cell: ({ row }: { row: { original: Vendor } }) => {
          const v = row.original;
          const displayName = v.nameId || v.name;
          const subline = v.nameId && v.nameId !== v.name ? v.name : v.industryType;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-xs font-medium tracking-wide">
                  {getInitials(v)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {displayName || '—'}
                </div>
                {subline && (
                  <div className="text-xs text-text-tertiary truncate">{subline}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'vendorType',
        header: t('vendors.table.category', 'Kategori'),
        cell: ({ row }: { row: { original: Vendor } }) => (
          <div className="space-y-1">
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                vendorTypeStyle(row.original.vendorType),
              )}
            >
              {vendorService.getVendorTypeLabel(row.original.vendorType)}
            </Badge>
            <div className="text-[11px] text-text-tertiary">
              {vendorService.getPKPStatusLabel(row.original.pkpStatus)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: t('vendors.table.contact', 'Kontak'),
        enableSorting: false,
        cell: ({ row }: { row: { original: Vendor } }) => {
          const v = row.original;
          if (!v.email && !v.phone && !v.contactPerson) {
            return <span className="text-text-tertiary">—</span>;
          }
          return (
            <div className="min-w-0 space-y-1">
              {v.contactPerson && (
                <div className="text-xs text-text-secondary truncate">{v.contactPerson}</div>
              )}
              {v.email && (
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary truncate">
                  <Mail className="h-3 w-3 text-text-tertiary shrink-0" />
                  <span className="truncate">{v.email}</span>
                </div>
              )}
              {v.phone && (
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary truncate">
                  <Phone className="h-3 w-3 text-text-tertiary shrink-0" />
                  <span className="truncate">{v.phone}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'city',
        header: t('vendors.table.location', 'Lokasi'),
        cell: ({ row }: { row: { original: Vendor } }) => {
          const v = row.original;
          if (!v.city && !v.province) return <span className="text-text-tertiary">—</span>;
          return (
            <div className="min-w-0">
              <div className="text-sm text-text-primary truncate">{v.city || '—'}</div>
              {v.province && (
                <div className="text-xs text-text-tertiary truncate">{v.province}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'transactions',
        header: () => (
          <span className="block text-right">{t('vendors.table.activity', 'Aktivitas')}</span>
        ),
        cell: ({ row }: { row: { original: Vendor } }) => {
          const count = txnCount(row.original);
          const poCount = row.original._count?.purchaseOrders ?? 0;
          return (
            <div className="text-right">
              <div
                className={cn(
                  'text-sm tabular-nums',
                  count > 0 ? 'text-text-primary' : 'text-text-tertiary',
                )}
              >
                {count}
              </div>
              {poCount > 0 && (
                <div className="mt-0.5 text-[11px] text-text-tertiary tabular-nums">
                  {t('vendors.table.poCount', '{{count}} PO', { count: poCount })}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: t('vendors.table.status', 'Status'),
        cell: ({ row }: { row: { original: Vendor } }) => {
          const active = row.original.isActive;
          return (
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                active ? 'bg-success/10 text-success' : 'bg-bg-sunken text-text-tertiary',
              )}
            >
              <span
                className={cn(
                  'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                  active ? 'bg-success' : 'bg-text-tertiary',
                )}
              />
              {active
                ? t('vendors.status.active', 'Aktif')
                : t('vendors.status.inactive', 'Tidak Aktif')}
            </Badge>
          );
        },
      },
    ],
    [t],
  );

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
            icon={<Truck className="h-12 w-12" />}
            title={t('vendors.error.title', 'Tidak bisa memuat data vendor')}
            description={
              error instanceof Error
                ? error.message
                : t('common.errorGeneric', 'Terjadi kesalahan')
            }
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
          title={t('vendors.title', 'Vendor')}
          description={t(
            'vendors.subtitle',
            'Kelola supplier, penyedia jasa, dan mitra procurement Anda.',
          )}
          actions={
            <Button
              onClick={() => navigate('/vendors/new')}
              className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
            >
              <Plus className="h-4 w-4" />
              {t('vendors.create.title', 'Vendor Baru')}
            </Button>
          }
        />

        {/* KPI band — tight gap so four cards read as one band */}
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
                  label={t('vendors.kpi.active', 'Vendor Aktif')}
                  value={stats.activeCount}
                  sublabel={t('vendors.kpi.activeSub', 'dari {{total}} total', {
                    total: statistics?.totalVendors ?? vendors.length,
                  })}
                />
                <StatCard
                  label={t('vendors.kpi.purchaseOrders', 'Total Purchase Order')}
                  value={stats.totalPOs}
                  sublabel={t('vendors.kpi.purchaseOrdersSub', 'sepanjang waktu')}
                />
                <StatCard
                  label={t('vendors.kpi.outstanding', 'Hutang ke Vendor')}
                  value={stats.vendorsWithAP}
                  sublabel={t(
                    'vendors.kpi.outstandingSub',
                    'vendor dengan AP terbuka',
                  )}
                />
                <StatCard
                  label={t('vendors.kpi.topVendor', 'Vendor Paling Aktif')}
                  value={
                    stats.top ? (
                      <span className="truncate block max-w-full">
                        {stats.top.vendor.nameId || stats.top.vendor.name}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                  sublabel={
                    stats.top
                      ? t('vendors.kpi.topVendorSub', '{{count}} transaksi', {
                          count: stats.top.count,
                        })
                      : t('vendors.kpi.topVendorEmpty', 'belum ada transaksi')
                  }
                />
              </>
            )}
          </div>
        </section>

        {/* Directory — filters and table share one panel so they read as
            a single editorial unit, not two stacked widgets. */}
        <section>
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('vendors.directory', 'Daftar Vendor')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Memuat…')
                    : t('vendors.directoryCount', '{{count}} vendor ditemukan', {
                        count: filteredVendors.length,
                      })}
                </p>
              </div>
            </div>

            {/* Filter row — search dominates, three quiet selects after */}
            <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_180px] gap-3">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t(
                    'vendors.searchPlaceholder',
                    'Cari nama, kode, kontak, atau kota…',
                  )}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              >
                <SelectTrigger className="w-full bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="all">
                    {t('vendors.filter.allTypes', 'Semua Kategori')}
                  </SelectItem>
                  {VENDOR_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pkpFilter}
                onValueChange={(v) => setPkpFilter(v as typeof pkpFilter)}
              >
                <SelectTrigger className="w-full bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="all">
                    {t('vendors.filter.allPkp', 'Semua Status PKP')}
                  </SelectItem>
                  {PKP_STATUSES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-full bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="all">
                    {t('vendors.filter.allStatus', 'Semua Status')}
                  </SelectItem>
                  <SelectItem value="active">
                    {t('vendors.status.active', 'Aktif')}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t('vendors.status.inactive', 'Tidak Aktif')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips — small dismissable tokens, plus
                a one-tap clear-all when more than one is set. */}
            {hasActiveFilters && (
              <div className="mb-4 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-text-tertiary">
                  {t('common.filters', 'Filter aktif')}:
                </span>
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
                {typeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    {vendorService.getVendorTypeLabel(typeFilter)}
                    <X className="h-3 w-3" />
                  </button>
                )}
                {pkpFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setPkpFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    {vendorService.getPKPStatusLabel(pkpFilter)}
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
                      ? t('vendors.status.active', 'Aktif')
                      : t('vendors.status.inactive', 'Tidak Aktif')}
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
            ) : filteredVendors.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={<Search className="h-12 w-12" />}
                  title={t('vendors.empty.filtered.title', 'Tidak ada vendor yang cocok')}
                  description={t(
                    'vendors.empty.filtered.desc',
                    'Coba ubah kata kunci atau bersihkan filter untuk melihat semua vendor.',
                  )}
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      {t('common.clearAll', 'Bersihkan semua')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Building2 className="h-12 w-12" />}
                  title={t('vendors.empty.title', 'Belum ada vendor')}
                  description={t(
                    'vendors.empty.desc',
                    'Mulai bangun database procurement Anda dengan menambahkan vendor pertama.',
                  )}
                  action={
                    <Button
                      onClick={() => navigate('/vendors/new')}
                      className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                    >
                      <Plus className="h-4 w-4" />
                      {t('vendors.create.title', 'Vendor Baru')}
                    </Button>
                  }
                />
              )
            ) : (
              <DataTable
                data={filteredVendors}
                columns={columns}
                enablePagination={filteredVendors.length > 10}
                onRowClick={(row) => navigate(`/vendors/${row.id}`)}
              />
            )}
          </GlassPanel>
        </section>
      </PageContainer>
    </AppShell>
  );
}
