import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, MoreHorizontal, Pencil, Trash2, Boxes,
  Camera, Cpu, Lightbulb, Mic, Aperture, Wrench, Package,
  MapPin, Calendar, Building2,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { assetService, type Asset } from '@/services/assets';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical to the list page so the chrome doesn't shift  */
/*  between routes.                                                    */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status + condition copy — keep in sync with the list page.        */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<Asset['status'], string> = {
  AVAILABLE:       'Tersedia',
  RESERVED:        'Direservasi',
  CHECKED_OUT:     'Dipinjam',
  IN_MAINTENANCE:  'Dalam Perawatan',
  BROKEN:          'Rusak',
  RETIRED:         'Tidak Aktif',
};

const CONDITION_LABEL: Record<Asset['condition'], string> = {
  EXCELLENT: 'Sangat Baik',
  GOOD:      'Baik',
  FAIR:      'Cukup',
  POOR:      'Buruk',
  BROKEN:    'Rusak',
};

const statusChipClass = (status?: Asset['status']) => {
  switch (status) {
    case 'AVAILABLE':      return 'bg-success/10 text-success';
    case 'CHECKED_OUT':    return 'bg-info/10 text-info';
    case 'RESERVED':       return 'bg-accent-navy-wash text-text-primary';
    case 'IN_MAINTENANCE': return 'bg-warning/10 text-warning';
    case 'BROKEN':         return 'bg-danger/10 text-danger';
    case 'RETIRED':
    default:               return 'bg-bg-sunken text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Months between two dates, floored. Both args required.
const monthsBetween = (from: Date, to: Date) => {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  return Math.max(months, 0);
};

// Category → lucide icon. Falls back to a neutral box.
const categoryIcon = (category?: string) => {
  const c = (category || '').toLowerCase();
  if (c.includes('camera')) return <Camera className="h-5 w-5" />;
  if (c.includes('lens') || c.includes('lensa')) return <Aperture className="h-5 w-5" />;
  if (c.includes('light')) return <Lightbulb className="h-5 w-5" />;
  if (c.includes('audio')) return <Mic className="h-5 w-5" />;
  if (c.includes('computer') || c.includes('laptop')) return <Cpu className="h-5 w-5" />;
  if (c.includes('tool') || c.includes('maintenance')) return <Wrench className="h-5 w-5" />;
  return <Package className="h-5 w-5" />;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ---------- data ---------- */
  const {
    data: asset,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(id!),
    enabled: !!id,
  });

  /* ---------- mutations ---------- */
  const deleteMutation = useMutation({
    mutationFn: () => assetService.deleteAsset(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.deleted', 'Aset berhasil dihapus.'));
      navigate('/v2/assets');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('assets.deleteFailed', 'Gagal menghapus aset.');
      toast.error(msg);
    },
  });

  /* ---------- derived: PSAK 16 straight-line snapshot ----------
     The detail page is the right surface to show the *current*
     position of an asset: how much value remains, how many months
     it has earned its keep, how much depreciation has accrued.
     We compute client-side from purchaseDate + useful life so the
     numbers stay live without a separate API call. ---------- */
  const dep = useMemo(() => {
    if (!asset) return null;
    const purchasePrice = toNumber(asset.purchasePrice);
    const residual = toNumber(asset.residualValue);
    const years = toNumber(asset.usefulLifeYears);
    const totalMonths = years * 12;
    const elapsedMonths = asset.purchaseDate
      ? monthsBetween(new Date(asset.purchaseDate), new Date())
      : 0;
    const monthsInService = Math.min(elapsedMonths, totalMonths || elapsedMonths);

    if (years <= 0 || purchasePrice <= 0) {
      return {
        purchasePrice,
        residual,
        years,
        monthsInService: elapsedMonths,
        accumulated: 0,
        currentValue: purchasePrice,
        applicable: false,
      };
    }

    const depreciableBase = Math.max(purchasePrice - residual, 0);
    const monthlyDep = depreciableBase / totalMonths;
    const accumulated = Math.min(monthlyDep * monthsInService, depreciableBase);
    const currentValue = Math.max(purchasePrice - accumulated, residual);

    return {
      purchasePrice,
      residual,
      years,
      monthsInService,
      accumulated,
      currentValue,
      applicable: true,
    };
  }, [asset]);

  /* ---------- shell wrapper ---------- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
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
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <Shell>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-32 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </Shell>
    );
  }

  /* ---------- error / not found ---------- */
  if (error || !asset) {
    return (
      <Shell>
        <EmptyState
          icon={<Boxes className="h-12 w-12" />}
          title={t('assets.detail.error.title', 'Aset tidak ditemukan')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'assets.detail.error.desc',
                  'Aset ini mungkin sudah dihapus atau Anda tidak memiliki akses.',
                )
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/assets')}>
                <ArrowLeft className="h-4 w-4" />
                {t('assets.detail.backToList', 'Kembali ke Aset')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  const handleDelete = () => {
    if (
      confirm(
        t(
          'assets.confirmDelete',
          `Hapus aset ${asset.assetCode || asset.name}? Tindakan ini tidak bisa dibatalkan.`,
        ),
      )
    ) {
      deleteMutation.mutate();
    }
  };

  /* ---------- related-entity column defs ----------
     Both maintenance and reservations come from the asset payload
     itself; the classic detail page already proves they're inline.
     We keep editorial table rhythm: mono-ish narrow leading column,
     narrative middle, right-aligned numerics. ---------- */
  const maintenanceColumns = [
    {
      accessorKey: 'performedDate',
      header: 'Tanggal',
      cell: ({ row }: { row: { original: any } }) => (
        <DateDisplay
          date={row.original.performedDate}
          className="text-xs text-text-tertiary"
        />
      ),
    },
    {
      id: 'type',
      header: 'Jenis',
      accessorFn: (row: any) => row?.maintenanceType ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <span className="text-sm text-text-secondary">
          {row.original.maintenanceType || '—'}
        </span>
      ),
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessorFn: (row: any) => row?.description ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="min-w-0 max-w-[320px]">
          <div className="text-sm text-text-primary truncate">
            {row.original.description || '—'}
          </div>
          {row.original.performedBy && (
            <div className="text-xs text-text-tertiary truncate mt-0.5">
              {row.original.performedBy}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'cost',
      header: () => <span className="block text-right">Biaya</span>,
      cell: ({ row }: { row: { original: any } }) => (
        <div className="text-right">
          <MoneyDisplay
            amount={toNumber(row.original.cost)}
            className="text-text-primary"
          />
        </div>
      ),
    },
  ];

  const reservationColumns = [
    {
      id: 'period',
      header: 'Periode',
      accessorFn: (row: any) => row?.startDate ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="text-xs text-text-tertiary">
          <DateDisplay date={row.original.startDate} />
          <span className="mx-1">→</span>
          <DateDisplay date={row.original.endDate} />
        </div>
      ),
    },
    {
      id: 'user',
      header: 'Pengguna',
      accessorFn: (row: any) => row?.user?.name ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <span className="text-sm text-text-secondary">
          {row.original.user?.name || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'purpose',
      header: 'Tujuan',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="min-w-0 max-w-[280px]">
          <div className="text-sm text-text-primary truncate">
            {row.original.purpose || '—'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: any } }) => (
        <Badge
          variant="outline"
          className="border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider bg-bg-sunken text-text-secondary"
        >
          {row.original.status || '—'}
        </Badge>
      ),
    },
  ];

  // SectionHeader — used twice below, factored inline to avoid
  // promoting a one-off shape to a new primitive.
  const SectionHeader = ({
    title,
    count,
  }: {
    title: string;
    count: number;
  }) => (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          {t('assets.detail.recordCount', '{{count}} catatan', { count })}
        </p>
      </div>
    </div>
  );

  const maintenanceRecords = asset.maintenanceRecords ?? [];
  const reservations = asset.reservations ?? [];

  /* ---------- render ---------- */
  return (
    <Shell>
      {/* Back-link — quiet tertiary, sits above the header so the
          asset code can own its own line. */}
      <div className="mb-4">
        <Link
          to="/v2/assets"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('assets.detail.backToList', 'Kembali ke Aset')}
        </Link>
      </div>

      <PageHeader
        title={asset.assetCode || asset.name}
        description={
          asset.name && asset.assetCode
            ? asset.name
            : t('assets.detail.subtitle', 'Detail aset, nilai, dan riwayat operasional.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-3 h-7 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(asset.status),
              )}
            >
              {STATUS_LABEL[asset.status] ?? asset.status}
            </Badge>
            <Button size="sm" onClick={() => navigate(`/v2/assets/${id}/edit`)}>
              <Pencil className="h-4 w-4" />
              {t('common.edit', 'Ubah')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.moreActions', 'Tindakan lain')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate(`/v2/assets/${id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit', 'Ubah')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete', 'Hapus')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ───────────────────────────────────────────────────────────
          Hero — left rail is identity (icon + name + category +
          spec line + condition); right rail is the load-bearing
          number (acquisition price) with the dates that frame it.
          One panel, two columns: avoids the tile sprawl that drowns
          the classic detail page.
         ─────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          {/* Left: identity */}
          <div className="min-w-0 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-md bg-bg-sunken border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
                {categoryIcon(asset.category)}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.name', 'Nama Aset')}
                </div>
                <div className="text-base font-medium text-text-primary truncate">
                  {asset.name}
                </div>
                <div className="text-sm text-text-secondary truncate flex items-center gap-1.5 mt-0.5">
                  <Package className="h-3.5 w-3.5 text-text-tertiary" />
                  {asset.category}
                  {asset.subcategory && (
                    <span className="text-text-tertiary">· {asset.subcategory}</span>
                  )}
                </div>
              </div>
            </div>

            {(asset.manufacturer || asset.model || asset.serialNumber) && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.specs', 'Spesifikasi')}
                </div>
                <div className="text-sm text-text-secondary leading-relaxed">
                  {[asset.manufacturer, asset.model].filter(Boolean).join(' · ') || '—'}
                </div>
                {asset.serialNumber && (
                  <div className="text-xs text-text-tertiary font-mono mt-0.5">
                    SN: {asset.serialNumber}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-text-secondary">
                  {asset.location || t('assets.detail.noLocation', 'Belum ditetapkan')}
                </span>
              </div>
              {asset.supplier && (
                <div className="flex items-center gap-1.5 text-text-tertiary">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-text-secondary">{asset.supplier}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <Wrench className="h-3.5 w-3.5" />
                <span className="text-text-secondary">
                  {CONDITION_LABEL[asset.condition] ?? asset.condition}
                </span>
              </div>
            </div>
          </div>

          {/* Right: money + dates rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 lg:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('assets.detail.purchasePrice', 'Harga Perolehan')}
              </div>
              <MoneyDisplay
                amount={toNumber(asset.purchasePrice)}
                className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-none block"
              />
            </div>
            <div className="flex lg:justify-end gap-6 text-xs">
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('assets.detail.purchaseDate', 'Dibeli')}
                </div>
                <DateDisplay
                  date={asset.purchaseDate}
                  className="text-text-secondary"
                />
              </div>
              {asset.warrantyExpiration && (
                <div>
                  <div className="text-text-tertiary mb-0.5">
                    {t('assets.detail.warrantyEnds', 'Garansi')}
                  </div>
                  <DateDisplay
                    date={asset.warrantyExpiration}
                    className="text-text-secondary"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          KPI band — money-first for asset detail:
            Original Value → Current Book Value → Accumulated Depr.
            → Months in service.
          Mirrors ProjectDetail's "money spine" pattern so an ops
          lead reads the same shape across operational entities.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={t('assets.detail.kpi.original', 'Nilai Perolehan')}
            value={<MoneyDisplay amount={dep?.purchasePrice ?? 0} />}
            sublabel={t('assets.detail.kpi.originalSub', 'harga saat pembelian')}
          />
          <StatCard
            label={t('assets.detail.kpi.current', 'Nilai Buku Saat Ini')}
            value={<MoneyDisplay amount={dep?.currentValue ?? toNumber(asset.purchasePrice)} />}
            sublabel={
              dep?.applicable
                ? t('assets.detail.kpi.currentSub', 'estimasi PSAK 16 garis lurus')
                : t('assets.detail.kpi.currentSubNone', 'tidak ada skema penyusutan')
            }
          />
          <StatCard
            label={t('assets.detail.kpi.accumulated', 'Akumulasi Penyusutan')}
            value={<MoneyDisplay amount={dep?.accumulated ?? 0} />}
            sublabel={
              dep?.applicable
                ? t('assets.detail.kpi.accumulatedSub', 'sejak tanggal pembelian')
                : t('assets.detail.kpi.accumulatedSubNone', 'belum disusutkan')
            }
          />
          <StatCard
            label={t('assets.detail.kpi.monthsInService', 'Lama Beroperasi')}
            value={
              <span className="tabular-nums">
                {(dep?.monthsInService ?? 0).toLocaleString('id-ID')}
              </span>
            }
            sublabel={t('assets.detail.kpi.monthsInServiceSub', 'bulan sejak akuisisi')}
          />
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Penyusutan — only when applicable. A quiet inline rail
          (not a table) since this asset only has one schedule line
          to communicate. Hides entirely when the asset has no useful
          life set, so the page stays honest about what it knows.
         ─────────────────────────────────────────────────────────── */}
      {dep?.applicable && (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('assets.detail.depreciationSection', 'Skema Penyusutan')}
              count={1}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.method', 'Metode')}
                </div>
                <div className="text-sm text-text-primary">
                  {t('assets.detail.depr.straightLine', 'Garis Lurus')}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.usefulLife', 'Umur Ekonomis')}
                </div>
                <div className="text-sm text-text-primary tabular-nums">
                  {dep.years} {t('assets.detail.depr.years', 'tahun')}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.residual', 'Nilai Sisa')}
                </div>
                <MoneyDisplay
                  amount={dep.residual}
                  className="text-sm text-text-primary tabular-nums"
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.monthly', 'Penyusutan / Bulan')}
                </div>
                <MoneyDisplay
                  amount={
                    dep.years > 0
                      ? Math.max(dep.purchasePrice - dep.residual, 0) / (dep.years * 12)
                      : 0
                  }
                  className="text-sm text-text-primary tabular-nums"
                />
              </div>
            </div>
          </GlassPanel>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────
          Maintenance — first because it's the section operators
          check most often (any pending repair?).
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('assets.detail.maintenanceSection', 'Riwayat Perawatan')}
            count={maintenanceRecords.length}
          />
          {maintenanceRecords.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-12 w-12" />}
              title={t('assets.detail.noMaintenance', 'Belum ada riwayat perawatan')}
              description={t(
                'assets.detail.noMaintenanceDesc',
                'Aset ini belum pernah diservis atau dirawat.',
              )}
            />
          ) : (
            <DataTable
              data={maintenanceRecords}
              columns={maintenanceColumns}
              enablePagination={maintenanceRecords.length > 10}
            />
          )}
        </GlassPanel>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Reservasi / Penempatan — who has held this asset, when,
          and why. Stacks under maintenance because checkout history
          is reference material more than urgent context.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t(
              'assets.detail.reservationsSection',
              'Riwayat Reservasi & Penempatan',
            )}
            count={reservations.length}
          />
          {reservations.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title={t('assets.detail.noReservations', 'Belum ada reservasi')}
              description={t(
                'assets.detail.noReservationsDesc',
                'Aset ini belum pernah direservasi atau dipinjam.',
              )}
            />
          ) : (
            <DataTable
              data={reservations}
              columns={reservationColumns}
              enablePagination={reservations.length > 10}
            />
          )}
        </GlassPanel>
      </section>

      {/* Catatan — only when present. Kept terminal so the page
          ends with the operator's own context, not a data table. */}
      {asset.notes && (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('assets.detail.notesSection', 'Catatan')}
              count={1}
            />
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {asset.notes}
            </p>
          </GlassPanel>
        </section>
      )}
    </Shell>
  );
}
