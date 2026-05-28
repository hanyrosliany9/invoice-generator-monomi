import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Send, Check, X, Trash2, Ban,
  ArrowUpRight, Wallet,
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
/*  Sidebar — same spine as the rest of v2/accounting. The active item */
/*  for this page is "Kas Keluar"; it sits next to "Kas Masuk".        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Same status / category vocabularies as CashReceipts. Copy is kept  */
/*  in this file so each page is self-contained — no premature        */
/*  shared module until a third caller asks for it.                    */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Diajukan', APPROVED: 'Disetujui',
  REJECTED: 'Ditolak', POSTED: 'Diposting', VOID: 'Void',
};
const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT: 'outline', SUBMITTED: 'secondary', APPROVED: 'default',
  REJECTED: 'destructive', POSTED: 'default', VOID: 'outline',
};
const CATEGORY_LABEL: Record<string, string> = {
  OPERATING: 'Operasional', INVESTING: 'Investasi', FINANCING: 'Pendanaan',
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tunai', BANK_TRANSFER: 'Transfer Bank', CREDIT_CARD: 'Kartu Kredit',
  DEBIT_CARD: 'Kartu Debit', CHEQUE: 'Cek', E_WALLET: 'E-Wallet', OTHER: 'Lainnya',
};
const getStatusLabel   = (s?: string) => STATUS_LABEL[s ?? ''] ?? (s ?? '—');
const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';
const getCategoryLabel = (s?: string) => CATEGORY_LABEL[s ?? ''] ?? (s ?? '—');

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isToday = (d?: string | null) => {
  if (!d) return false;
  const x = new Date(d), now = new Date();
  return x.getFullYear() === now.getFullYear()
    && x.getMonth() === now.getMonth()
    && x.getDate() === now.getDate();
};
const isThisMonth = (d?: string | null) => {
  if (!d) return false;
  const x = new Date(d), now = new Date();
  return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
};
const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

/* ------------------------------------------------------------------ */

export default function CashDisbursementsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter]     = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter]   = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]     = useState<Date | undefined>(undefined);

  const [viewing, setViewing] = useState<CashTransaction | null>(null);

  const queryParams = useMemo(() => ({
    page: 1, limit: 50,
    transactionType: 'DISBURSEMENT' as const,
    search:        searchText || undefined,
    status:        statusFilter   === 'all' ? undefined : (statusFilter   as CashTransaction['status']),
    category:      categoryFilter === 'all' ? undefined : (categoryFilter as CashTransaction['category']),
    cashAccountId: accountFilter  === 'all' ? undefined : accountFilter,
    startDate:     toIsoOrUndef(startDate),
    endDate:       toIsoOrUndef(endDate),
    sortBy:        'transactionDate',
    sortOrder:     'desc' as const,
  }), [searchText, statusFilter, categoryFilter, accountFilter, startDate, endDate]);

  const { data: txData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-transactions', 'DISBURSEMENT', queryParams],
    queryFn:  () => getCashTransactions(queryParams),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const disbursements = txData?.data ?? [];

  const cashAccounts = useMemo(
    () => accounts.filter((acc: ChartOfAccount) => acc.code.startsWith('1-1')),
    [accounts],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });

  const submitMutation = useMutation({
    mutationFn: submitCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashDisbursements.submitSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashDisbursements.submitFail')),
  });
  const approveMutation = useMutation({
    mutationFn: approveCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashDisbursements.approveSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashDisbursements.approveFail')),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCashTransaction(id, reason),
    onSuccess: () => { toast.success(t('accounting.cashDisbursements.rejectSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashDisbursements.rejectFail')),
  });
  const voidMutation = useMutation({
    mutationFn: voidCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashDisbursements.voidSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashDisbursements.voidFail')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashDisbursements.deleteSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashDisbursements.deleteFail')),
  });

  /* KPI band — mirrors CashReceipts but the "Top" tile surfaces the
     biggest expense category (offset account) so an owner can see at
     a glance where money is going. */
  const stats = useMemo(() => {
    const todayAmount = disbursements.filter((d) => isToday(d.transactionDate))
      .reduce((a, d) => a + toNumber(d.amount), 0);
    const monthAmount = disbursements.filter((d) => isThisMonth(d.transactionDate))
      .reduce((a, d) => a + toNumber(d.amount), 0);
    const totalAmount = disbursements.reduce((a, d) => a + toNumber(d.amount), 0);

    const byPayee = new Map<string, number>();
    disbursements.forEach((d) => {
      const key = d.offsetAccount?.nameId || d.offsetAccount?.name || '—';
      byPayee.set(key, (byPayee.get(key) ?? 0) + toNumber(d.amount));
    });
    let topPayeeName = '—'; let topPayeeAmount = 0;
    byPayee.forEach((amt, name) => {
      if (amt > topPayeeAmount) { topPayeeAmount = amt; topPayeeName = name; }
    });

    return { todayAmount, monthAmount, totalAmount, topPayeeName, topPayeeAmount };
  }, [disbursements]);

  const hasActiveFilters = !!searchText
    || statusFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all'
    || !!startDate || !!endDate;

  const resetFilters = () => {
    setSearchInput(''); setStatusFilter('all'); setCategoryFilter('all');
    setAccountFilter('all'); setStartDate(undefined); setEndDate(undefined);
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<ArrowUpRight className="h-12 w-12" />}
          title={t('accounting.cashDisbursements.errorTitle')}
          description={error instanceof Error ? error.message : t('accounting.cashDisbursements.errorDesc')}
          action={<Button onClick={() => refetch()}>{t('accounting.cashDisbursements.retry')}</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title={t('accounting.cashDisbursements.title')}
        description={t('accounting.cashDisbursements.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/accounting/cash-bank-balance')}
            >
              <Wallet className="h-4 w-4" />
              {t('accounting.cashDisbursements.cashBalance')}
            </Button>
            <Button onClick={() => navigate('/accounting/cash-disbursements')} size="sm">
              <Plus className="h-4 w-4" />
              {t('accounting.cashDisbursements.newDisbursement')}
            </Button>
          </div>
        }
      />

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
                sublabel="pengeluaran kas hari ini"
              />
              <StatCard
                label="Bulan Ini"
                value={<MoneyDisplay amount={stats.monthAmount} />}
                sublabel="kas keluar bulan berjalan"
              />
              <StatCard
                label="Total (Filter)"
                value={<MoneyDisplay amount={stats.totalAmount} />}
                sublabel="sesuai filter aktif"
              />
              <StatCard
                label="Tujuan Teratas"
                value={
                  <span className="text-base sm:text-lg font-display font-semibold text-text-primary truncate block">
                    {stats.topPayeeName}
                  </span>
                }
                sublabel={stats.topPayeeAmount > 0 ? formatIDR(stats.topPayeeAmount) : 'belum ada data'}
              />
            </>
          )}
        </div>
      </section>

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
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]">
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
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
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
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
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
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">Rentang</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={startDate} onChange={setStartDate}
                  placeholder="Tgl. mulai"
                  className="h-9 text-sm bg-bg-sunken border-border-subtle"
                />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={endDate} onChange={setEndDate}
                  placeholder="Tgl. akhir"
                  className="h-9 text-sm bg-bg-sunken border-border-subtle"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost" size="sm" onClick={resetFilters}
                className="text-text-tertiary hover:text-text-primary self-start sm:self-auto"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        ) : disbursements.length === 0 ? (
          <EmptyState
            icon={<ArrowUpRight />}
            title={hasActiveFilters ? t('accounting.cashDisbursements.noMatch') : t('accounting.cashDisbursements.noDisbursements')}
            description={
              hasActiveFilters
                ? t('accounting.cashDisbursements.noMatchDesc')
                : t('accounting.cashDisbursements.noDisbursementsDesc')
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.cashDisbursements.resetFilter')}</Button>
              ) : (
                <Button onClick={() => navigate('/accounting/cash-disbursements')} size="sm">
                  <Plus className="h-4 w-4" /> {t('accounting.cashDisbursements.newDisbursement')}
                </Button>
              )
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DisbursementsTable
              rows={disbursements}
              onView={setViewing}
              onSubmit={(row) => submitMutation.mutate(row.id)}
              onApprove={(row) => approveMutation.mutate(row.id)}
              onReject={(row) => {
                const reason = window.prompt(t('accounting.cashDisbursements.rejectPrompt'))?.trim();
                if (!reason) return;
                rejectMutation.mutate({ id: row.id, reason });
              }}
              onVoid={(row) => {
                if (window.confirm(t('accounting.cashDisbursements.voidConfirm', { number: row.transactionNumber }))) {
                  voidMutation.mutate(row.id);
                }
              }}
              onDelete={(row) => {
                if (window.confirm(t('accounting.cashDisbursements.deleteConfirm', { number: row.transactionNumber }))) {
                  deleteMutation.mutate(row.id);
                }
              }}
            />
          </div>
        )}
      </GlassPanel>

      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.cashDisbursements.detailTitle')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {viewing?.transactionNumber}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Tanggal"><DateDisplay date={viewing.transactionDate} /></DetailRow>
              <DetailRow label="Status">
                <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
              </DetailRow>
              <DetailRow label="Jumlah" wide>
                <MoneyDisplay amount={viewing.amount} className="text-danger text-base" />
              </DetailRow>
              <DetailRow label="Kategori">{getCategoryLabel(viewing.category)}</DetailRow>
              <DetailRow label="Metode">{PAYMENT_METHOD_LABEL[viewing.paymentMethod] ?? viewing.paymentMethod}</DetailRow>
              <DetailRow label="Akun Beban (Debit)" wide>
                <span className="font-mono text-xs text-text-secondary">{viewing.offsetAccount.code}</span>
                {' — '}
                {viewing.offsetAccount.nameId}
              </DetailRow>
              <DetailRow label="Akun Kas (Credit)" wide>
                <span className="font-mono text-xs text-text-secondary">{viewing.cashAccount.code}</span>
                {' — '}
                {viewing.cashAccount.nameId}
              </DetailRow>
              <DetailRow label="Deskripsi" wide>{viewing.descriptionId || viewing.description}</DetailRow>
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
            <Button variant="outline" onClick={() => setViewing(null)}>{t('accounting.cashDisbursements.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

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
/*  Narrative column reads "<expense account> → <cash account>" so the */
/*  flow of money is visible without expanding the row. The arrow is   */
/*  the opposite direction of CashReceipts on purpose: → vs ← teaches  */
/*  the user the polarity without color.                               */
/* ------------------------------------------------------------------ */

interface DisbursementsTableProps {
  rows:     CashTransaction[];
  onView:   (row: CashTransaction) => void;
  onSubmit: (row: CashTransaction) => void;
  onApprove:(row: CashTransaction) => void;
  onReject: (row: CashTransaction) => void;
  onVoid:   (row: CashTransaction) => void;
  onDelete: (row: CashTransaction) => void;
}

function DisbursementsTable({
  rows, onView, onSubmit, onApprove, onReject, onVoid, onDelete,
}: DisbursementsTableProps) {
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
                  {t.offsetAccount.nameId}
                  <span className="mx-1.5 text-text-tertiary/60">→</span>
                  {t.cashAccount.nameId}
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
              <MoneyDisplay amount={toNumber(row.original.amount)} className="text-danger" />
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
                      variant="ghost" size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label="Aksi pengeluaran kas"
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
