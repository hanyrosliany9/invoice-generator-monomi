import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Send, Check, X, Trash2, Ban,
  ArrowDownLeft, Wallet,
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  approveCashTransaction,
  type CashTransaction,
  type ChartOfAccount,
  deleteCashTransaction,
  getCashTransactions,
  getChartOfAccounts,
  rejectCashTransaction,
  submitCashTransaction,
  voidCashTransaction,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — shares the v2 spine. "Kas" sits beneath Expenses so   */
/*  the financial group reads as one chapter in the sidebar.           */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',   icon: <Inbox className="h-4 w-4" />,        href: '/v2' },
  { label: 'Invoices',    icon: <FileText className="h-4 w-4" />,     href: '/v2/invoices' },
  { label: 'Quotations',  icon: <ReceiptText className="h-4 w-4" />,  href: '/v2/quotations' },
  { label: 'Clients',     icon: <Users className="h-4 w-4" />,        href: '/v2/clients' },
  { label: 'Projects',    icon: <Folder className="h-4 w-4" />,       href: '/v2/projects' },
  { label: 'Expenses',    icon: <CreditCard className="h-4 w-4" />,   href: '/v2/expenses' },
  { label: 'Kas Masuk',   icon: <ArrowDownLeft className="h-4 w-4" />, href: '/v2/accounting/cash-receipts' },
  { label: 'Settings',    icon: <Settings className="h-4 w-4" />,     href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status & category vocabularies — Bahasa Indonesia for the user,    */
/*  editorial badge variants for the chrome. The "POSTED == Lunas"     */
/*  pattern mirrors v2/expenses so the eye learns one rule.            */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED:  'Disetujui',
  REJECTED:  'Ditolak',
  POSTED:    'Diposting',
  VOID:      'Void',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT:     'outline',
  SUBMITTED: 'secondary',
  APPROVED:  'default',
  REJECTED:  'destructive',
  POSTED:    'default',
  VOID:      'outline',
};

const CATEGORY_LABEL: Record<string, string> = {
  OPERATING: 'Operasional',
  INVESTING: 'Investasi',
  FINANCING: 'Pendanaan',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH:          'Tunai',
  BANK_TRANSFER: 'Transfer Bank',
  CREDIT_CARD:   'Kartu Kredit',
  DEBIT_CARD:    'Kartu Debit',
  CHEQUE:        'Cek',
  E_WALLET:      'E-Wallet',
  OTHER:         'Lainnya',
};

const getStatusLabel    = (s?: string) => STATUS_LABEL[s ?? ''] ?? (s ?? '—');
const getStatusVariant  = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';
const getCategoryLabel  = (s?: string) => CATEGORY_LABEL[s ?? ''] ?? (s ?? '—');

/* ------------------------------------------------------------------ */
/*  Numeric helpers                                                    */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth()    === now.getMonth()
    && d.getDate()     === now.getDate();
};

const isThisMonth = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CashReceiptsPageV2() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ----- filter state ----- */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter]     = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter]   = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]     = useState<Date | undefined>(undefined);

  /* ----- view dialog ----- */
  const [viewing, setViewing] = useState<CashTransaction | null>(null);

  /* ----- API queries ----- */
  const queryParams = useMemo(() => ({
    page:         1,
    limit:        50,
    transactionType: 'RECEIPT' as const,
    search:       searchText || undefined,
    status:       statusFilter   === 'all' ? undefined : (statusFilter   as CashTransaction['status']),
    category:     categoryFilter === 'all' ? undefined : (categoryFilter as CashTransaction['category']),
    cashAccountId: accountFilter === 'all' ? undefined : accountFilter,
    startDate:    toIsoOrUndef(startDate),
    endDate:      toIsoOrUndef(endDate),
    sortBy:       'transactionDate',
    sortOrder:    'desc' as const,
  }), [searchText, statusFilter, categoryFilter, accountFilter, startDate, endDate]);

  const { data: txData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-transactions', 'RECEIPT', queryParams],
    queryFn:  () => getCashTransactions(queryParams),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const receipts = txData?.data ?? [];

  // Filter to cash/bank accounts only for the account filter dropdown.
  const cashAccounts = useMemo(
    () => accounts.filter((acc: ChartOfAccount) => acc.code.startsWith('1-1')),
    [accounts],
  );

  /* ----- mutations ----- */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });

  const submitMutation = useMutation({
    mutationFn: submitCashTransaction,
    onSuccess: () => { toast.success('Penerimaan kas berhasil diajukan'); invalidate(); },
    onError:   () => toast.error('Gagal mengajukan penerimaan kas'),
  });
  const approveMutation = useMutation({
    mutationFn: approveCashTransaction,
    onSuccess: () => { toast.success('Penerimaan kas disetujui dan diposting'); invalidate(); },
    onError:   () => toast.error('Gagal menyetujui penerimaan kas'),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCashTransaction(id, reason),
    onSuccess: () => { toast.success('Penerimaan kas ditolak'); invalidate(); },
    onError:   () => toast.error('Gagal menolak penerimaan kas'),
  });
  const voidMutation = useMutation({
    mutationFn: voidCashTransaction,
    onSuccess: () => { toast.success('Penerimaan kas dibatalkan (void)'); invalidate(); },
    onError:   () => toast.error('Gagal membatalkan penerimaan kas'),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCashTransaction,
    onSuccess: () => { toast.success('Penerimaan kas dihapus'); invalidate(); },
    onError:   () => toast.error('Gagal menghapus penerimaan kas'),
  });

  /* ----- derived KPI band — Hari Ini / Bulan Ini / Top sumber ------- */
  const stats = useMemo(() => {
    const todayAmount = receipts
      .filter((r) => isToday(r.transactionDate))
      .reduce((a, r) => a + toNumber(r.amount), 0);

    const monthAmount = receipts
      .filter((r) => isThisMonth(r.transactionDate))
      .reduce((a, r) => a + toNumber(r.amount), 0);

    const totalAmount = receipts.reduce((a, r) => a + toNumber(r.amount), 0);

    // Top source = the offset account (revenue source) with the largest total.
    const bySource = new Map<string, number>();
    receipts.forEach((r) => {
      const key = r.offsetAccount?.nameId || r.offsetAccount?.name || '—';
      bySource.set(key, (bySource.get(key) ?? 0) + toNumber(r.amount));
    });
    let topSourceName = '—';
    let topSourceAmount = 0;
    bySource.forEach((amt, name) => {
      if (amt > topSourceAmount) { topSourceAmount = amt; topSourceName = name; }
    });

    return { todayAmount, monthAmount, totalAmount, topSourceName, topSourceAmount };
  }, [receipts]);

  const hasActiveFilters =
    !!searchText
    || statusFilter   !== 'all'
    || categoryFilter !== 'all'
    || accountFilter  !== 'all'
    || !!startDate || !!endDate;

  const resetFilters = () => {
    setSearchInput('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  /* ----- shell so error + happy paths share chrome ----- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<ArrowDownLeft className="h-12 w-12" />}
          title="Tidak bisa memuat penerimaan kas"
          description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
          action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
        />
      </Shell>
    );
  }

  /* ----- render ----- */
  return (
    <Shell>
      <PageHeader
        title="Penerimaan Kas"
        description="Catat dan setujui kas masuk dari pendapatan, pelanggan, dan sumber lain."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/accounting/cash-bank-balance')}
            >
              <Wallet className="h-4 w-4" />
              Saldo Kas
            </Button>
            <Button onClick={() => navigate('/accounting/cash-receipts')} size="sm">
              <Plus className="h-4 w-4" />
              Penerimaan Baru
            </Button>
          </div>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          KPI band — three KPIs aligned with operational rhythm:
          today / this month / top source. The fourth tile is the
          context-aware filter total so the band stays in sync with
          the table below.
         ───────────────────────────────────────────────────────────── */}
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
                label="Hari Ini"
                value={<MoneyDisplay amount={stats.todayAmount} />}
                sublabel="penerimaan kas hari ini"
              />
              <StatCard
                label="Bulan Ini"
                value={<MoneyDisplay amount={stats.monthAmount} />}
                sublabel="kas masuk bulan berjalan"
              />
              <StatCard
                label="Total (Filter)"
                value={<MoneyDisplay amount={stats.totalAmount} />}
                sublabel="sesuai filter aktif"
              />
              <StatCard
                label="Sumber Teratas"
                value={
                  <span className="text-base sm:text-lg font-display font-semibold text-text-primary truncate block">
                    {stats.topSourceName}
                  </span>
                }
                sublabel={stats.topSourceAmount > 0 ? formatIDR(stats.topSourceAmount) : 'belum ada data'}
              />
            </>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Filter + table — one GlassPanel, two regions divided by a
          hairline. Same grammar as v2/expenses.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nomor transaksi atau deskripsi..."
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]"
                >
                  <SelectValue placeholder="Akun Kas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Akun Kas</SelectItem>
                  {cashAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} — {acc.nameId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="OPERATING">Operasional</SelectItem>
                  <SelectItem value="INVESTING">Investasi</SelectItem>
                  <SelectItem value="FINANCING">Pendanaan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Diajukan</SelectItem>
                  <SelectItem value="POSTED">Diposting</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                  <SelectItem value="VOID">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">
                Rentang
              </span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Tgl. mulai"
                  className="h-9 text-sm bg-bg-sunken border-border-subtle"
                />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Tgl. akhir"
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
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState
            icon={<ArrowDownLeft />}
            title={hasActiveFilters ? 'Tidak ada penerimaan yang cocok' : 'Belum ada penerimaan kas'}
            description={
              hasActiveFilters
                ? 'Coba ubah atau hapus filter Anda.'
                : 'Catat penerimaan kas pertama untuk memulai pembukuan kas masuk.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
              ) : (
                <Button onClick={() => navigate('/accounting/cash-receipts')} size="sm">
                  <Plus className="h-4 w-4" />
                  Penerimaan Baru
                </Button>
              )
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <CashReceiptsTable
              rows={receipts}
              onView={setViewing}
              onSubmit={(row) => submitMutation.mutate(row.id)}
              onApprove={(row) => approveMutation.mutate(row.id)}
              onReject={(row) => {
                const reason = window.prompt('Alasan penolakan:')?.trim();
                if (!reason) return;
                rejectMutation.mutate({ id: row.id, reason });
              }}
              onVoid={(row) => {
                if (window.confirm(`Batalkan penerimaan ${row.transactionNumber}? Jurnal akan direverse.`)) {
                  voidMutation.mutate(row.id);
                }
              }}
              onDelete={(row) => {
                if (window.confirm(`Hapus penerimaan ${row.transactionNumber}? Tidak dapat dibatalkan.`)) {
                  deleteMutation.mutate(row.id);
                }
              }}
            />
          </div>
        )}
      </GlassPanel>

      {/* View dialog — read-only detail. Editing is deferred to the
          classic form route to avoid duplicating the full create flow. */}
      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Penerimaan Kas</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {viewing?.transactionNumber}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Tanggal">
                <DateDisplay date={viewing.transactionDate} />
              </DetailRow>
              <DetailRow label="Status">
                <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
              </DetailRow>
              <DetailRow label="Jumlah" wide>
                <MoneyDisplay amount={viewing.amount} className="text-success text-base" />
              </DetailRow>
              <DetailRow label="Kategori">{getCategoryLabel(viewing.category)}</DetailRow>
              <DetailRow label="Metode">{PAYMENT_METHOD_LABEL[viewing.paymentMethod] ?? viewing.paymentMethod}</DetailRow>
              <DetailRow label="Akun Kas (Debit)" wide>
                <span className="font-mono text-xs text-text-secondary">{viewing.cashAccount.code}</span>
                {' — '}
                {viewing.cashAccount.nameId}
              </DetailRow>
              <DetailRow label="Akun Pendapatan (Credit)" wide>
                <span className="font-mono text-xs text-text-secondary">{viewing.offsetAccount.code}</span>
                {' — '}
                {viewing.offsetAccount.nameId}
              </DetailRow>
              <DetailRow label="Deskripsi" wide>
                {viewing.descriptionId || viewing.description}
              </DetailRow>
              {viewing.reference && <DetailRow label="Referensi" wide>{viewing.reference}</DetailRow>}
              {viewing.notes && <DetailRow label="Catatan" wide>{viewing.notes}</DetailRow>}
              {viewing.rejectionReason && (
                <DetailRow label="Alasan Penolakan" wide>
                  <span className="text-danger">{viewing.rejectionReason}</span>
                </DetailRow>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  DetailRow — small primitive private to this page; keeps the view   */
/*  dialog flat and predictable.                                       */
/* ------------------------------------------------------------------ */

function DetailRow({
  label, children, wide,
}: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CashReceiptsTable — column rhythm: mono number → narrative (desc + */
/*  account pair) → category pill → right-aligned money → quiet date → */
/*  status badge → actions kebab. Matches v2/expenses grammar.         */
/* ------------------------------------------------------------------ */

interface ReceiptsTableProps {
  rows:     CashTransaction[];
  onView:   (row: CashTransaction) => void;
  onSubmit: (row: CashTransaction) => void;
  onApprove:(row: CashTransaction) => void;
  onReject: (row: CashTransaction) => void;
  onVoid:   (row: CashTransaction) => void;
  onDelete: (row: CashTransaction) => void;
}

function CashReceiptsTable({
  rows, onView, onSubmit, onApprove, onReject, onVoid, onDelete,
}: ReceiptsTableProps) {
  return (
    <DataTable<CashTransaction>
      data={rows}
      onRowClick={onView}
      enablePagination
      columns={[
        {
          accessorKey: 'transactionNumber',
          header: 'Nomor',
          cell: ({ row }) => (
            <div className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.transactionNumber || '—'}
            </div>
          ),
        },
        {
          id: 'narrative',
          header: 'Deskripsi & Akun',
          accessorFn: (row) => row.descriptionId ?? row.description ?? '',
          cell: ({ row }) => {
            const t = row.original;
            const desc = t.descriptionId || t.description;
            return (
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">{desc || '—'}</div>
                <div className="text-xs text-text-tertiary truncate mt-0.5">
                  {t.cashAccount.nameId}
                  <span className="mx-1.5 text-text-tertiary/60">←</span>
                  {t.offsetAccount.nameId}
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: 'category',
          header: 'Kategori',
          cell: ({ row }) => (
            <span className="text-xs text-text-secondary">{getCategoryLabel(row.original.category)}</span>
          ),
        },
        {
          accessorKey: 'amount',
          header: () => <span className="block text-right">Jumlah</span>,
          cell: ({ row }) => (
            <div className="text-right">
              <MoneyDisplay amount={toNumber(row.original.amount)} className="text-success" />
            </div>
          ),
        },
        {
          accessorKey: 'transactionDate',
          header: 'Tanggal',
          cell: ({ row }) => (
            <span className="text-text-tertiary">
              <DateDisplay date={row.original.transactionDate} />
            </span>
          ),
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.original.status)}>
              {getStatusLabel(row.original.status)}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const t = row.original;
            return (
              <div className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label="Aksi penerimaan kas"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onView(t)}>
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </DropdownMenuItem>
                    {t.status === 'DRAFT' && (
                      <>
                        <DropdownMenuItem onClick={() => onSubmit(t)}>
                          <Send className="h-3.5 w-3.5" /> Ajukan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(t)}
                          className="text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </DropdownMenuItem>
                      </>
                    )}
                    {t.status === 'SUBMITTED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onApprove(t)}>
                          <Check className="h-3.5 w-3.5" /> Setujui
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReject(t)}
                          className="text-danger focus:text-danger"
                        >
                          <X className="h-3.5 w-3.5" /> Tolak
                        </DropdownMenuItem>
                      </>
                    )}
                    {t.status === 'POSTED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onVoid(t)}
                          className="text-danger focus:text-danger"
                        >
                          <Ban className="h-3.5 w-3.5" /> Void
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
