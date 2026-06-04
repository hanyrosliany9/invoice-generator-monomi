import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Send, Check, X, Trash2, Ban,
  ArrowDownLeft, Wallet,
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
/*  Navigation — shares the v2 spine. "Kas" sits beneath Expenses so   */
/*  the financial group reads as one chapter in the sidebar.           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status & category vocabularies — Bahasa Indonesia for the user,    */
/*  editorial badge variants for the chrome. The "POSTED == Lunas"     */
/*  pattern mirrors v2/expenses so the eye learns one rule.            */
/* ------------------------------------------------------------------ */

const STATUS_LABEL_KEY: Record<string, string> = {
  DRAFT:     'accounting.cashReceipts.statusDraft',
  SUBMITTED: 'accounting.cashReceipts.statusSubmitted',
  APPROVED:  'accounting.cashReceipts.statusApproved',
  REJECTED:  'accounting.cashReceipts.statusRejected',
  POSTED:    'accounting.cashReceipts.statusPosted',
  VOID:      'accounting.cashReceipts.statusVoid',
};
const STATUS_LABEL_FALLBACK: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved',
  REJECTED: 'Rejected', POSTED: 'Posted', VOID: 'Void',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT:     'outline',
  SUBMITTED: 'secondary',
  APPROVED:  'default',
  REJECTED:  'destructive',
  POSTED:    'default',
  VOID:      'outline',
};

const CATEGORY_LABEL_KEY: Record<string, string> = {
  OPERATING: 'accounting.cashReceipts.categoryOperating',
  INVESTING:  'accounting.cashReceipts.categoryInvesting',
  FINANCING:  'accounting.cashReceipts.categoryFinancing',
};
const CATEGORY_LABEL_FALLBACK: Record<string, string> = {
  OPERATING: 'Operating', INVESTING: 'Investing', FINANCING: 'Financing',
};

const PAYMENT_METHOD_LABEL_KEY: Record<string, string> = {
  CASH:          'accounting.cashReceipts.paymentCash',
  BANK_TRANSFER: 'accounting.cashReceipts.paymentBankTransfer',
  CREDIT_CARD:   'accounting.cashReceipts.paymentCreditCard',
  DEBIT_CARD:    'accounting.cashReceipts.paymentDebitCard',
  CHEQUE:        'accounting.cashReceipts.paymentCheque',
  E_WALLET:      'accounting.cashReceipts.paymentEWallet',
  OTHER:         'accounting.cashReceipts.paymentOther',
};
const PAYMENT_METHOD_LABEL_FALLBACK: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card', CHEQUE: 'Cheque', E_WALLET: 'E-Wallet', OTHER: 'Other',
};

const getStatusVariant  = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';

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
/*  Page shell — hoisted to module scope so React never unmounts it    */
/*  on re-render (fixes focus loss on every keystroke).               */
/* ------------------------------------------------------------------ */

function PageShell({ user, children }: { user: { name: string; role: string } | null; children: React.ReactNode }) {
  return (
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
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CashReceiptsPageV2() {
  const { t } = useTranslation();
  const getStatusLabel   = (s?: string) => t(STATUS_LABEL_KEY[s ?? ''] ?? '', STATUS_LABEL_FALLBACK[s ?? ''] ?? (s ?? '—'));
  const getCategoryLabel = (s?: string) => t(CATEGORY_LABEL_KEY[s ?? ''] ?? '', CATEGORY_LABEL_FALLBACK[s ?? ''] ?? (s ?? '—'));
  const getPaymentMethodLabel = (s?: string) => t(PAYMENT_METHOD_LABEL_KEY[s ?? ''] ?? '', PAYMENT_METHOD_LABEL_FALLBACK[s ?? ''] ?? (s ?? '—'));
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
    onSuccess: () => { toast.success(t('accounting.cashReceipts.submitSuccess', 'Receipt submitted')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashReceipts.submitFail', 'Failed to submit receipt')),
  });
  const approveMutation = useMutation({
    mutationFn: approveCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashReceipts.approveSuccess', 'Receipt approved')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashReceipts.approveFail', 'Failed to approve receipt')),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCashTransaction(id, reason),
    onSuccess: () => { toast.success(t('accounting.cashReceipts.rejectSuccess', 'Receipt rejected')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashReceipts.rejectFail', 'Failed to reject receipt')),
  });
  const voidMutation = useMutation({
    mutationFn: voidCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashReceipts.voidSuccess', 'Receipt voided')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashReceipts.voidFail', 'Failed to void receipt')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCashTransaction,
    onSuccess: () => { toast.success(t('accounting.cashReceipts.deleteSuccess', 'Receipt deleted')); invalidate(); },
    onError:   () => toast.error(t('accounting.cashReceipts.deleteFail', 'Failed to delete receipt')),
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

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <PageShell user={user}>
        <EmptyState
          icon={<ArrowDownLeft className="h-12 w-12" />}
          title={t('accounting.cashReceipts.errorTitle', 'Cannot load cash receipts')}
          description={error instanceof Error ? error.message : t('accounting.cashReceipts.errorDesc', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('accounting.cashReceipts.retry', 'Try Again')}</Button>}
        />
      </PageShell>
    );
  }

  /* ----- render ----- */
  return (
    <PageShell user={user}>
      <PageHeader
        title={t('accounting.cashReceipts.title', 'Cash Receipts')}
        description={t('accounting.cashReceipts.description', 'Record, submit, and post incoming cash transactions.')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/accounting/cash-bank-balance')}
            >
              <Wallet className="h-4 w-4" />
              {t('accounting.cashReceipts.cashBalance', 'Cash Balance')}
            </Button>
            <Button onClick={() => navigate('/accounting/cash-receipts')} size="sm">
              <Plus className="h-4 w-4" />
              {t('accounting.cashReceipts.newReceipt', 'New Receipt')}
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
                label={t('accounting.cashReceipts.statToday', 'Today')}
                value={<MoneyDisplay amount={stats.todayAmount} />}
                sublabel={t('accounting.cashReceipts.statTodaySub', "today's cash receipts")}
              />
              <StatCard
                label={t('accounting.cashReceipts.statThisMonth', 'This Month')}
                value={<MoneyDisplay amount={stats.monthAmount} />}
                sublabel={t('accounting.cashReceipts.statThisMonthSub', 'cash inflow this month')}
              />
              <StatCard
                label={t('accounting.cashReceipts.statTotal', 'Total (Filter)')}
                value={<MoneyDisplay amount={stats.totalAmount} />}
                sublabel={t('accounting.cashReceipts.statTotalSub', 'matching active filter')}
              />
              <StatCard
                label={t('accounting.cashReceipts.statTopSource', 'Top Source')}
                value={
                  <span className="text-base sm:text-lg font-display font-semibold text-text-primary truncate block">
                    {stats.topSourceName}
                  </span>
                }
                sublabel={stats.topSourceAmount > 0 ? formatIDR(stats.topSourceAmount) : t('accounting.cashReceipts.noData', 'no data yet')}
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
                placeholder={t('accounting.cashReceipts.searchPlaceholder', 'Search by transaction number or description...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]"
                >
                  <SelectValue placeholder={t('accounting.cashReceipts.cashAccountPlaceholder', 'Cash Account')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.cashReceipts.allCashAccounts', 'All Cash Accounts')}</SelectItem>
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
                  <SelectValue placeholder={t('accounting.cashReceipts.categoryPlaceholder', 'Category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.cashReceipts.allCategories', 'All Categories')}</SelectItem>
                  <SelectItem value="OPERATING">{t('accounting.cashReceipts.categoryOperating', 'Operating')}</SelectItem>
                  <SelectItem value="INVESTING">{t('accounting.cashReceipts.categoryInvesting', 'Investing')}</SelectItem>
                  <SelectItem value="FINANCING">{t('accounting.cashReceipts.categoryFinancing', 'Financing')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('accounting.cashReceipts.statusPlaceholder', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.cashReceipts.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="DRAFT">{t('accounting.cashReceipts.statusDraft', 'Draft')}</SelectItem>
                  <SelectItem value="SUBMITTED">{t('accounting.cashReceipts.statusSubmitted', 'Submitted')}</SelectItem>
                  <SelectItem value="POSTED">{t('accounting.cashReceipts.statusPosted', 'Posted')}</SelectItem>
                  <SelectItem value="REJECTED">{t('accounting.cashReceipts.statusRejected', 'Rejected')}</SelectItem>
                  <SelectItem value="VOID">{t('accounting.cashReceipts.statusVoid', 'Void')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">
                {t('accounting.cashReceipts.rangeLabel', 'Range')}
              </span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('accounting.cashReceipts.dateFrom', 'Start date')}
                  className="h-9 text-sm bg-bg-sunken border-border-subtle"
                />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('accounting.cashReceipts.dateTo', 'End date')}
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
            title={hasActiveFilters ? t('accounting.cashReceipts.noMatch', 'No matching receipts') : t('accounting.cashReceipts.noReceipts', 'No cash receipts yet')}
            description={
              hasActiveFilters
                ? t('accounting.cashReceipts.noMatchDesc', 'Try changing the filter.')
                : t('accounting.cashReceipts.noReceiptsDesc', 'Create your first cash receipt to get started.')
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.cashReceipts.resetFilter', 'Reset Filters')}</Button>
              ) : (
                <Button onClick={() => navigate('/accounting/cash-receipts')} size="sm">
                  <Plus className="h-4 w-4" />
                  {t('accounting.cashReceipts.newReceipt', 'New Receipt')}
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
                const reason = window.prompt(t('accounting.cashReceipts.rejectPrompt', 'Enter rejection reason'))?.trim();
                if (!reason) return;
                rejectMutation.mutate({ id: row.id, reason });
              }}
              onVoid={(row) => {
                if (window.confirm(t('accounting.cashReceipts.voidConfirm', { number: row.transactionNumber }))) {
                  voidMutation.mutate(row.id);
                }
              }}
              onDelete={(row) => {
                if (window.confirm(t('accounting.cashReceipts.deleteConfirm', { number: row.transactionNumber }))) {
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
            <DialogTitle className="font-display">{t('accounting.cashReceipts.detailTitle', 'Receipt Detail')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {viewing?.transactionNumber}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label={t('accounting.cashReceipts.fieldDate', 'Date')}>
                <DateDisplay date={viewing.transactionDate} />
              </DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldStatus', 'Status')}>
                <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
              </DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldAmount', 'Amount')} wide>
                <MoneyDisplay amount={viewing.amount} className="text-success text-base" />
              </DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldCategory', 'Category')}>{getCategoryLabel(viewing.category)}</DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldMethod', 'Method')}>{getPaymentMethodLabel(viewing.paymentMethod)}</DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldCashAccountDebit', 'Cash Account (Debit)')} wide>
                <span className="font-mono text-xs text-text-secondary">{viewing.cashAccount.code}</span>
                {' — '}
                {viewing.cashAccount.nameId}
              </DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldRevenueAccountCredit', 'Revenue Account (Credit)')} wide>
                <span className="font-mono text-xs text-text-secondary">{viewing.offsetAccount.code}</span>
                {' — '}
                {viewing.offsetAccount.nameId}
              </DetailRow>
              <DetailRow label={t('accounting.cashReceipts.fieldDescription', 'Description')} wide>
                {viewing.descriptionId || viewing.description}
              </DetailRow>
              {viewing.reference && <DetailRow label={t('accounting.cashReceipts.fieldReference', 'Reference')} wide>{viewing.reference}</DetailRow>}
              {viewing.notes && <DetailRow label={t('accounting.cashReceipts.fieldNotes', 'Notes')} wide>{viewing.notes}</DetailRow>}
              {viewing.rejectionReason && (
                <DetailRow label={t('accounting.cashReceipts.fieldRejectionReason', 'Rejection Reason')} wide>
                  <span className="text-danger">{viewing.rejectionReason}</span>
                </DetailRow>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>{t('accounting.cashReceipts.close', 'Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
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
  const { t } = useTranslation();
  const getStatusLabel   = (s?: string) => t(STATUS_LABEL_KEY[s ?? ''] ?? '', STATUS_LABEL_FALLBACK[s ?? ''] ?? (s ?? '—'));
  const getCategoryLabel = (s?: string) => t(CATEGORY_LABEL_KEY[s ?? ''] ?? '', CATEGORY_LABEL_FALLBACK[s ?? ''] ?? (s ?? '—'));
  return (
    <DataTable<CashTransaction>
      data={rows}
      onRowClick={onView}
      enablePagination
      columns={[
        {
          accessorKey: 'transactionNumber',
          header: t('accounting.cashReceipts.colNumber', 'Number'),
          cell: ({ row }) => (
            <div className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.transactionNumber || '—'}
            </div>
          ),
        },
        {
          id: 'narrative',
          header: t('accounting.cashReceipts.colDescriptionAccount', 'Description & Account'),
          accessorFn: (row) => row.descriptionId ?? row.description ?? '',
          cell: ({ row }) => {
            const tx = row.original;
            const desc = tx.descriptionId || tx.description;
            return (
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">{desc || '—'}</div>
                <div className="text-xs text-text-tertiary truncate mt-0.5">
                  {tx.cashAccount.nameId}
                  <span className="mx-1.5 text-text-tertiary/60">←</span>
                  {tx.offsetAccount.nameId}
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: 'category',
          header: t('accounting.cashReceipts.colCategory', 'Category'),
          cell: ({ row }) => (
            <span className="text-xs text-text-secondary">{getCategoryLabel(row.original.category)}</span>
          ),
        },
        {
          accessorKey: 'amount',
          header: () => <span className="block text-right">{t('accounting.cashReceipts.colAmount', 'Amount')}</span>,
          cell: ({ row }) => (
            <div className="text-right">
              <MoneyDisplay amount={toNumber(row.original.amount)} className="text-success" />
            </div>
          ),
        },
        {
          accessorKey: 'transactionDate',
          header: t('accounting.cashReceipts.colDate', 'Date'),
          cell: ({ row }) => (
            <span className="text-text-tertiary">
              <DateDisplay date={row.original.transactionDate} />
            </span>
          ),
        },
        {
          accessorKey: 'status',
          header: t('accounting.cashReceipts.colStatus', 'Status'),
          cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.original.status)}>
              {getStatusLabel(row.original.status)}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">{t('accounting.cashReceipts.colActions', 'Actions')}</span>,
          cell: ({ row }) => {
            const tx = row.original;
            return (
              <div className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label={t('accounting.cashReceipts.ariaActions', 'Cash receipt actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onView(tx)}>
                      <Eye className="h-3.5 w-3.5" /> {t('accounting.cashReceipts.actionView', 'View')}
                    </DropdownMenuItem>
                    {tx.status === 'DRAFT' && (
                      <>
                        <DropdownMenuItem onClick={() => onSubmit(tx)}>
                          <Send className="h-3.5 w-3.5" /> {t('accounting.cashReceipts.actionSubmit', 'Submit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(tx)}
                          className="text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t('accounting.cashReceipts.actionDelete', 'Delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {tx.status === 'SUBMITTED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onApprove(tx)}>
                          <Check className="h-3.5 w-3.5" /> {t('accounting.cashReceipts.actionApprove', 'Approve')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReject(tx)}
                          className="text-danger focus:text-danger"
                        >
                          <X className="h-3.5 w-3.5" /> {t('accounting.cashReceipts.actionReject', 'Reject')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {tx.status === 'POSTED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onVoid(tx)}
                          className="text-danger focus:text-danger"
                        >
                          <Ban className="h-3.5 w-3.5" /> {t('accounting.cashReceipts.actionVoid', 'Void')}
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
