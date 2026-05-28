import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Boxes, Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, X,
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
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
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
import { assetService, type Asset } from '@/services/assets';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — mirrors v2 projects/clients/invoices so chrome reads as  */
/*  one app. Assets isn't a top-level v2 destination yet, so we keep   */
/*  it consistent with the other pages and let the active route be     */
/*  resolved by AppShell.                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status + condition copy — kept in one place so the list and detail */
/*  pages agree word-for-word.                                         */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<Asset['status'], string> = {
  AVAILABLE:       'Available',
  RESERVED:        'Reserved',
  CHECKED_OUT:     'Checked Out',
  IN_MAINTENANCE:  'In Maintenance',
  BROKEN:          'Broken',
  RETIRED:         'Retired',
};

const CONDITION_LABEL: Record<Asset['condition'], string> = {
  EXCELLENT: 'Excellent',
  GOOD:      'Good',
  FAIR:      'Fair',
  POOR:      'Poor',
  BROKEN:    'Broken',
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

const conditionToneClass = (condition?: Asset['condition']) => {
  switch (condition) {
    case 'EXCELLENT':
    case 'GOOD':   return 'text-text-secondary';
    case 'FAIR':   return 'text-warning';
    case 'POOR':
    case 'BROKEN': return 'text-danger';
    default:       return 'text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Numeric helpers — purchasePrice arrives as string from the Prisma  */
/*  Decimal column, so guard every cast.                               */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isDepreciable = (a: Asset) =>
  toNumber(a.usefulLifeYears) > 0 &&
  a.status !== 'RETIRED' &&
  a.status !== 'BROKEN';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  /* ----- data ----- */
  const { data: assets = [], isLoading, error, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: assetService.getAssets,
  });

  /* ----- mutations ----- */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.deleted', 'Aset berhasil dihapus.'));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('assets.deleteFailed', 'Gagal menghapus aset.');
      toast.error(msg);
    },
  });

  /* ----- derived: filtered + categories ----- */
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => a.category && set.add(a.category));
    return Array.from(set).sort();
  }, [assets]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return assets.filter((a) => {
      const matchesSearch = !q
        || a.assetCode?.toLowerCase().includes(q)
        || a.name?.toLowerCase().includes(q)
        || a.category?.toLowerCase().includes(q)
        || a.manufacturer?.toLowerCase().includes(q)
        || a.model?.toLowerCase().includes(q)
        || a.serialNumber?.toLowerCase().includes(q);

      const matchesStatus    = statusFilter    === 'all' || a.status    === statusFilter;
      const matchesCategory  = categoryFilter  === 'all' || a.category  === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || a.condition === conditionFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesCondition;
    });
  }, [assets, searchText, statusFilter, categoryFilter, conditionFilter]);

  /* ----- KPI band — four numbers chosen so an ops lead can answer:
     "How big is the fleet, what's it worth, how much is offline today,
     and how much do we still depreciate?" in one glance. ----- */
  const stats = useMemo(() => {
    const total = assets.length;
    const totalValue = assets.reduce((acc, a) => acc + toNumber(a.purchasePrice), 0);
    const underMaintenance = assets.filter(
      (a) => a.status === 'IN_MAINTENANCE' || a.status === 'BROKEN',
    ).length;
    const depreciating = assets.filter(isDepreciable).length;
    return { total, totalValue, underMaintenance, depreciating };
  }, [assets]);

  const hasActiveFilters =
    !!searchText
    || statusFilter !== 'all'
    || categoryFilter !== 'all'
    || conditionFilter !== 'all';

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setConditionFilter('all');
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{
          right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
      >
        <PageContainer>
          <EmptyState
            icon={<Boxes className="h-12 w-12" />}
            title={t('assets.error.title', 'Tidak bisa memuat aset')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- handlers ----- */
  const handleDelete = (a: Asset) => {
    if (
      confirm(
        t(
          'assets.confirmDelete',
          `Hapus aset ${a.assetCode || a.name}? Tindakan ini tidak bisa dibatalkan.`,
        ),
      )
    ) {
      deleteMutation.mutate(a.id);
    }
  };

  /* ----- render ----- */
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('assets.title', 'Aset')}
          description={t(
            'assets.subtitle',
            'Inventaris peralatan operasional, nilai, dan status perawatan.',
          )}
          actions={
            <Button onClick={() => navigate('/v2/assets/new')} size="sm">
              <Plus className="h-4 w-4" />
              {t('assets.new', 'Aset Baru')}
            </Button>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — Total / Value / Under Maintenance / Depreciating.
            Same shape as InvoicesPage/ProjectsPage band so the reader
            sees identical rhythm across operational entities.
           ───────────────────────────────────────────────────────────── */}
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
                  label={t('assets.kpi.total', 'Total Aset')}
                  value={stats.total}
                  sublabel={t('assets.kpi.totalSub', 'unit tercatat')}
                />
                <StatCard
                  label={t('assets.kpi.value', 'Nilai Perolehan')}
                  value={<MoneyDisplay amount={stats.totalValue} />}
                  sublabel={t('assets.kpi.valueSub', 'akumulasi harga beli')}
                />
                <StatCard
                  label={t('assets.kpi.maintenance', 'Dalam Perawatan')}
                  value={stats.underMaintenance}
                  sublabel={t('assets.kpi.maintenanceSub', 'rusak atau diservis')}
                />
                <StatCard
                  label={t('assets.kpi.depreciating', 'Aktif Disusutkan')}
                  value={stats.depreciating}
                  sublabel={t('assets.kpi.depreciatingSub', 'memiliki umur ekonomis')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Filter strip + table — single GlassPanel so the controls and
            data share one surface. Filter wells live on bg-sunken so
            they read as inputs, not chrome.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t(
                  'assets.search.placeholder',
                  'Cari kode, nama, model, atau serial…',
                )}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                >
                  <SelectValue placeholder={t('assets.filter.category', 'Kategori')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('assets.filter.allCategories', 'Semua Kategori')}
                  </SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                >
                  <SelectValue placeholder={t('assets.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('assets.filter.allStatuses', 'Semua Status')}
                  </SelectItem>
                  {(Object.keys(STATUS_LABEL) as Asset['status'][]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('assets.filter.condition', 'Kondisi')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('assets.filter.allConditions', 'Semua Kondisi')}
                  </SelectItem>
                  {(Object.keys(CONDITION_LABEL) as Asset['condition'][]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </SelectItem>
                  ))}
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

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Boxes />}
              title={
                hasActiveFilters
                  ? t('assets.empty.filtered.title', 'Tidak ada aset yang cocok')
                  : t('assets.empty.title', 'Belum ada aset')
              }
              description={
                hasActiveFilters
                  ? t(
                      'assets.empty.filtered.desc',
                      'Coba ubah atau hapus filter Anda.',
                    )
                  : t(
                      'assets.empty.desc',
                      'Mulai dengan menambahkan aset pertama.',
                    )
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filter')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/v2/assets/new')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('assets.new', 'Aset Baru')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <AssetTable
                rows={filtered}
                onRowClick={(row) => navigate(`/v2/assets/${row.id}`)}
                onView={(row) => navigate(`/v2/assets/${row.id}`)}
                onEdit={(row) => navigate(`/v2/assets/${row.id}/edit`)}
                onDelete={handleDelete}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  AssetTable — extracted only inside this file (no new shared        */
/*  primitives). Editorial column rhythm: mono code → narrative name + */
/*  category → status chip + quiet condition → right-aligned money →   */
/*  location → kebab.                                                  */
/* ------------------------------------------------------------------ */

interface AssetTableProps {
  rows: Asset[];
  onRowClick: (row: Asset) => void;
  onView: (row: Asset) => void;
  onEdit: (row: Asset) => void;
  onDelete: (row: Asset) => void;
}

function AssetTable({ rows, onRowClick, onView, onEdit, onDelete }: AssetTableProps) {
  const { t } = useTranslation();
  return (
    <DataTable<Asset>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          accessorKey: 'assetCode',
          header: t('assetsPage.col.code', 'Code'),
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.assetCode || '—'}
            </span>
          ),
        },
        {
          id: 'asset',
          header: t('assetsPage.col.asset', 'Asset'),
          accessorFn: (row) => row.name ?? '',
          cell: ({ row }) => {
            const a = row.original;
            const detail = [a.manufacturer, a.model].filter(Boolean).join(' · ');
            return (
              <div className="min-w-0 max-w-[320px]">
                <div className="text-sm text-text-primary truncate">
                  {a.name || '—'}
                </div>
                {detail && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {detail}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: 'category',
          header: t('assetsPage.col.category', 'Category'),
          cell: ({ row }) => {
            const a = row.original;
            return (
              <div className="min-w-0 max-w-[160px]">
                <div className="text-sm text-text-secondary truncate">
                  {a.category || '—'}
                </div>
                {a.subcategory && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {a.subcategory}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: 'status',
          header: t('assetsPage.col.status', 'Status'),
          cell: ({ row }) => {
            const a = row.original;
            return (
              <div className="flex flex-col gap-1 items-start">
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                    statusChipClass(a.status),
                  )}
                >
                  {STATUS_LABEL[a.status] ?? a.status}
                </Badge>
                <span
                  className={cn('text-[11px]', conditionToneClass(a.condition))}
                >
                  {CONDITION_LABEL[a.condition] ?? a.condition}
                </span>
              </div>
            );
          },
        },
        {
          id: 'value',
          accessorFn: (row) => toNumber(row.purchasePrice),
          header: () => <span className="block text-right">{t('assetsPage.col.value', 'Value')}</span>,
          cell: ({ row }) => {
            const v = toNumber(row.original.purchasePrice);
            return (
              <div className="text-right">
                <MoneyDisplay
                  amount={v}
                  className={cn(
                    v > 0 ? 'text-text-primary' : 'text-text-tertiary',
                  )}
                />
              </div>
            );
          },
        },
        {
          accessorKey: 'location',
          header: t('assetsPage.col.location', 'Location'),
          cell: ({ row }) => (
            <span className="text-text-tertiary text-xs">
              {row.original.location || '—'}
            </span>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">{t('assetsPage.col.actions', 'Actions')}</span>,
          cell: ({ row }) => {
            const a = row.original;
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label={t('assetsPage.assetActions', 'Asset actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onView(a)}>
                      <Eye className="h-3.5 w-3.5" /> {t('common.view', 'View')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" /> {t('common.edit', 'Edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(a)}
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
  );
}
