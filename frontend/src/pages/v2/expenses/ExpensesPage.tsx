import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, X, Tag as TagIcon,
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
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
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
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { expenseService } from '@/services/expenses';
import type {
  Expense,
  ExpensePaymentStatus,
  ExpenseStatus,
  ExpenseQueryParams,
} from '@/types/expense';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — mirrors v2/invoices exactly so the active item, the   */
/*  rhythm, and the icon vocabulary read as one app.                   */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status maps — Bahasa Indonesia copy paired with editorial badge    */
/*  variants. Mirrors the vocabulary of v2/invoices: Lunas == default. */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED:  'Disetujui',
  REJECTED:  'Ditolak',
  CANCELLED: 'Dibatalkan',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT:     'outline',
  SUBMITTED: 'secondary',
  APPROVED:  'default',
  REJECTED:  'destructive',
  CANCELLED: 'outline',
};

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID:         'Belum Dibayar',
  PARTIALLY_PAID: 'Sebagian',
  PAID:           'Lunas',
};

const PAYMENT_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  UNPAID:         'destructive',
  PARTIALLY_PAID: 'secondary',
  PAID:           'default',
};

const getStatusLabel    = (s?: string) => STATUS_LABEL[s ?? ''] ?? (s ?? '—');
const getStatusVariant  = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';
const getPaymentLabel   = (s?: string) => PAYMENT_LABEL[s ?? ''] ?? (s ?? '—');
const getPaymentVariant = (s?: string) => PAYMENT_BADGE_VARIANT[s ?? ''] ?? 'secondary';

/* ------------------------------------------------------------------ */
/*  Numeric helpers — totalAmount arrives as a Decimal-string from the */
/*  API. Sum/aggregate carefully to avoid string concatenation bugs.   */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isThisMonth = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExpensesPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ----- filter state ----- */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  /* ----- build query params for the API ----- */
  const queryParams: ExpenseQueryParams = useMemo(() => ({
    search:        searchText || undefined,
    categoryId:    categoryFilter === 'all' ? undefined : categoryFilter,
    status:        statusFilter === 'all' ? undefined : (statusFilter as ExpenseStatus),
    paymentStatus: paymentFilter === 'all' ? undefined : (paymentFilter as ExpensePaymentStatus),
    startDate:     toIsoOrUndef(startDate),
    endDate:       toIsoOrUndef(endDate),
    page:          1,
    limit:         50,
    sortBy:        'expenseDate',
    sortOrder:     'desc',
  }), [searchText, categoryFilter, statusFilter, paymentFilter, startDate, endDate]);

  /* ----- data ----- */
  const { data: expensesData, isLoading, error, refetch } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn:  () => expenseService.getExpenses(queryParams),
  });

  const { data: statistics } = useQuery({
    queryKey: ['expenses-statistics', queryParams],
    queryFn:  () => expenseService.getExpenseStatistics(queryParams),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn:  () => expenseService.getExpenseCategories(),
  });

  const expenses = expensesData?.data ?? [];

  /* ----- mutations (row actions) ----- */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  /* ----- derived KPI band — leans on /statistics so totals reflect the
       same filter set as the table. Falls back to local sums on the
       expenses array if the stats endpoint hasn't responded yet. ----- */
  const stats = useMemo(() => {
    const totalAmount = statistics
      ? toNumber(statistics.totalAmount)
      : expenses.reduce((a, e) => a + toNumber(e.totalAmount), 0);

    const totalPPN = statistics
      ? toNumber(statistics.totalPPN)
      : expenses.reduce((a, e) => a + toNumber(e.ppnAmount), 0);

    const thisMonthAmount = expenses
      .filter((e) => isThisMonth(e.expenseDate))
      .reduce((a, e) => a + toNumber(e.totalAmount), 0);

    // Top-1 category by spend within the current filtered set.
    const byCategory = new Map<string, number>();
    expenses.forEach((e) => {
      const key = e.category?.nameId || e.category?.name || e.accountName || '—';
      byCategory.set(key, (byCategory.get(key) ?? 0) + toNumber(e.totalAmount));
    });
    let topCategoryName = '—';
    let topCategoryAmount = 0;
    byCategory.forEach((amt, name) => {
      if (amt > topCategoryAmount) { topCategoryAmount = amt; topCategoryName = name; }
    });

    return { totalAmount, totalPPN, thisMonthAmount, topCategoryName, topCategoryAmount };
  }, [expenses, statistics]);

  const hasActiveFilters =
    !!searchText
    || categoryFilter !== 'all'
    || statusFilter !== 'all'
    || paymentFilter !== 'all'
    || !!startDate
    || !!endDate;

  const resetFilters = () => {
    setSearchInput('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPaymentFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  /* ----- shell wrapper so the error short-circuit and the happy path
       both render with the same chrome ----- */
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

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title={t('expenses.error.title', 'Tidak bisa memuat biaya')}
          description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
          action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
        />
      </Shell>
    );
  }

  /* ----- render ----- */
  return (
    <Shell>
      <PageHeader
        title={t('expenses.title', 'Biaya')}
        description={t(
          'expenses.subtitle',
          'Catat pengeluaran usaha dengan kepatuhan PSAK & pajak Indonesia.',
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/v2/expenses/categories')}
            >
              <TagIcon className="h-4 w-4" />
              {t('expenses.categories', 'Kategori')}
            </Button>
            <Button onClick={() => navigate('/expenses/new')} size="sm">
              <Plus className="h-4 w-4" />
              {t('expenses.new', 'Biaya Baru')}
            </Button>
          </div>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          KPI band — four supporting numbers. "Bulan Ini" is the load-
          bearing figure (operational rhythm), "Total Filter" is the
          context-aware total, "PPN" is the tax-compliance pulse, and
          "Kategori Teratas" surfaces concentration without a chart.
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
                label={t('expenses.kpi.thisMonth', 'Bulan Ini')}
                value={<MoneyDisplay amount={stats.thisMonthAmount} />}
                sublabel={t('expenses.kpi.thisMonthSub', 'pengeluaran bulan berjalan')}
              />
              <StatCard
                label={t('expenses.kpi.total', 'Total (Filter)')}
                value={<MoneyDisplay amount={stats.totalAmount} />}
                sublabel={t('expenses.kpi.totalSub', 'sesuai filter aktif')}
              />
              <StatCard
                label={t('expenses.kpi.ppn', 'PPN Masukan')}
                value={<MoneyDisplay amount={stats.totalPPN} />}
                sublabel={t('expenses.kpi.ppnSub', 'pajak masukan terkumpul')}
              />
              <StatCard
                label={t('expenses.kpi.topCategory', 'Kategori Teratas')}
                value={
                  <span className="text-base sm:text-lg font-display font-semibold text-text-primary truncate block">
                    {stats.topCategoryName}
                  </span>
                }
                sublabel={
                  stats.topCategoryAmount > 0
                    ? `${expenseService.formatIDR(stats.topCategoryAmount)}`
                    : t('expenses.kpi.noData', 'belum ada data')
                }
              />
            </>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Filter + table — single GlassPanel so the strip and the table
          share one surface. The filter strip uses a hairline divider
          (border-b) rather than a separate panel so the eye reads the
          two zones as one card with two regions.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Filter strip — wraps so it works on tablet without a horizontal
            scroll. Date pickers sit on a second row implicit via wrap. */}
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('expenses.search.placeholder', 'Cari nomor, vendor, atau deskripsi...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder={t('expenses.filter.category', 'Kategori')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('expenses.filter.allCategories', 'Semua Kategori')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nameId || cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('expenses.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('expenses.filter.allStatuses', 'Semua Status')}</SelectItem>
                  <SelectItem value="DRAFT">{STATUS_LABEL.DRAFT}</SelectItem>
                  <SelectItem value="SUBMITTED">{STATUS_LABEL.SUBMITTED}</SelectItem>
                  <SelectItem value="APPROVED">{STATUS_LABEL.APPROVED}</SelectItem>
                  <SelectItem value="REJECTED">{STATUS_LABEL.REJECTED}</SelectItem>
                  <SelectItem value="CANCELLED">{STATUS_LABEL.CANCELLED}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('expenses.filter.payment', 'Pembayaran')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('expenses.filter.allPayments', 'Semua Pembayaran')}</SelectItem>
                  <SelectItem value="UNPAID">{PAYMENT_LABEL.UNPAID}</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">{PAYMENT_LABEL.PARTIALLY_PAID}</SelectItem>
                  <SelectItem value="PAID">{PAYMENT_LABEL.PAID}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range row — quiet sub-strip; only when needed the user
              will narrow with these. Reset lives here too so a heavy
              filter pass clears in one click. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">
                {t('expenses.filter.range', 'Rentang')}
              </span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('expenses.filter.startDate', 'Tgl. mulai')}
                  className="h-9 text-sm bg-bg-sunken border-border-subtle"
                />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('expenses.filter.endDate', 'Tgl. akhir')}
                  className="h-9 text-sm bg-bg-sunken border-border-subtle"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-text-tertiary hover:text-text-primary self-start sm:self-auto"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<CreditCard />}
            title={
              hasActiveFilters
                ? t('expenses.empty.filtered.title', 'Tidak ada biaya yang cocok')
                : t('expenses.empty.title', 'Belum ada biaya')
            }
            description={
              hasActiveFilters
                ? t('expenses.empty.filtered.desc', 'Coba ubah atau hapus filter Anda.')
                : t('expenses.empty.desc', 'Mulai catat pengeluaran usaha pertama Anda.')
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t('common.resetFilters', 'Reset Filter')}
                </Button>
              ) : (
                <Button onClick={() => navigate('/expenses/new')} size="sm">
                  <Plus className="h-4 w-4" />
                  {t('expenses.new', 'Biaya Baru')}
                </Button>
              )
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <ExpenseTable
              rows={expenses}
              onRowClick={(row) => navigate(`/v2/expenses/${row.id}`)}
              onView={(row) => navigate(`/v2/expenses/${row.id}`)}
              onEdit={(row) => navigate(`/expenses/${row.id}/edit`)}
              onDelete={(row) => {
                if (confirm(t(
                  'expenses.confirmDelete',
                  `Hapus biaya ${row.expenseNumber}? Tindakan ini tidak dapat dibatalkan.`,
                ))) {
                  deleteMutation.mutate(row.id);
                }
              }}
            />
          </div>
        )}
      </GlassPanel>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  ExpenseTable — local-only component (no new shared primitive this  */
/*  round). Column rhythm: mono number → narrative (vendor + desc) →   */
/*  category pill → right-aligned money → quiet date → status pills →  */
/*  actions kebab. Matches v2/invoices grammar exactly.                */
/* ------------------------------------------------------------------ */

interface ExpenseTableProps {
  rows: Expense[];
  onRowClick: (row: Expense) => void;
  onView:     (row: Expense) => void;
  onEdit:     (row: Expense) => void;
  onDelete:   (row: Expense) => void;
}

function ExpenseTable({ rows, onRowClick, onView, onEdit, onDelete }: ExpenseTableProps) {
  return (
    <DataTable<Expense>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          accessorKey: 'expenseNumber',
          header: 'Nomor',
          cell: ({ row }) => (
            <div className="min-w-0">
              <div className="font-mono text-xs text-text-primary tracking-tight">
                {row.original.expenseNumber || '—'}
              </div>
              {row.original.buktiPengeluaranNumber && (
                <div className="font-mono text-[10px] text-text-tertiary tracking-tight mt-0.5">
                  {row.original.buktiPengeluaranNumber}
                </div>
              )}
            </div>
          ),
        },
        {
          id: 'vendor',
          header: 'Vendor / Deskripsi',
          accessorFn: (row) => row.vendorName ?? '',
          cell: ({ row }) => {
            const e = row.original;
            const desc = e.descriptionId || e.description;
            return (
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">
                  {e.vendorName || '—'}
                </div>
                {desc && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">{desc}</div>
                )}
              </div>
            );
          },
        },
        {
          id: 'category',
          header: 'Kategori',
          accessorFn: (row) => row.category?.nameId ?? row.category?.name ?? '',
          cell: ({ row }) => {
            const cat = row.original.category;
            if (!cat) {
              return (
                <span className="text-xs text-text-tertiary">
                  {row.original.accountCode || '—'}
                </span>
              );
            }
            return (
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">
                  {cat.nameId || cat.name}
                </div>
                <div className="font-mono text-[10px] text-text-tertiary mt-0.5">
                  {cat.accountCode}
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: 'totalAmount',
          header: () => <span className="block text-right">Jumlah</span>,
          cell: ({ row }) => {
            const e = row.original;
            const ppn  = toNumber(e.ppnAmount);
            const pph  = toNumber(e.withholdingAmount);
            return (
              <div className="text-right">
                <MoneyDisplay
                  amount={toNumber(e.totalAmount)}
                  className="text-text-primary"
                />
                {(ppn > 0 || pph > 0) && (
                  <div className="mt-0.5 text-[10px] text-text-tertiary tabular-nums">
                    {ppn > 0 && <>PPN {expenseService.formatIDR(ppn)}</>}
                    {ppn > 0 && pph > 0 && <span className="mx-1">·</span>}
                    {pph > 0 && <span className="text-warning">PPh -{expenseService.formatIDR(pph)}</span>}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: 'expenseDate',
          header: 'Tanggal',
          cell: ({ row }) => (
            <span className="text-text-tertiary">
              <DateDisplay date={row.original.expenseDate} />
            </span>
          ),
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => {
            const e = row.original;
            return (
              <div className="flex flex-col items-start gap-1">
                <Badge variant={getStatusVariant(e.status)}>
                  {getStatusLabel(e.status)}
                </Badge>
                <Badge variant={getPaymentVariant(e.paymentStatus)} className="text-[10px]">
                  {getPaymentLabel(e.paymentStatus)}
                </Badge>
              </div>
            );
          },
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const e = row.original;
            const canEdit   = expenseService.canEdit(e);
            const canDelete = expenseService.canDelete(e);
            return (
              <div className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn('text-text-tertiary hover:text-text-primary')}
                      aria-label="Aksi biaya"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onView(e)}>
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" /> Ubah
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(e)}
                          className="text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </DropdownMenuItem>
                      </>
                    )}
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
