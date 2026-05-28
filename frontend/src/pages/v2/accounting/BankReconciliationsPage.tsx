import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal, Eye, FileText as FileTextIcon,
  Check, ChevronDown, AlertTriangle, CheckCircle2, RefreshCw,
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
  approveBankReconciliation,
  type BankReconciliation,
  type ChartOfAccount,
  createBankReconciliation,
  deleteBankReconciliation,
  getBankReconciliations,
  getChartOfAccounts,
  rejectBankReconciliation,
  reviewBankReconciliation,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Vocab                                                              */
/* ------------------------------------------------------------------ */

const STATUS_LABEL_KEY: Record<string, string> = {
  DRAFT:       'accounting.bankReconciliations.statusDraft',
  IN_PROGRESS: 'accounting.bankReconciliations.statusInProgress',
  REVIEWED:    'accounting.bankReconciliations.statusReviewed',
  APPROVED:    'accounting.bankReconciliations.statusApproved',
  REJECTED:    'accounting.bankReconciliations.statusRejected',
  COMPLETED:   'accounting.bankReconciliations.statusCompleted',
};

const STATUS_LABEL_FALLBACK: Record<string, string> = {
  DRAFT:       'Draft',
  IN_PROGRESS: 'In Progress',
  REVIEWED:    'Reviewed',
  APPROVED:    'Approved',
  REJECTED:    'Rejected',
  COMPLETED:   'Completed',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT:       'outline',
  IN_PROGRESS: 'secondary',
  REVIEWED:    'secondary',
  APPROVED:    'default',
  REJECTED:    'destructive',
  COMPLETED:   'default',
};

const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);

/* ------------------------------------------------------------------ */
/*  Create dialog state / form                                         */
/* ------------------------------------------------------------------ */

interface CreateFormState {
  bankAccountId: string;
  statementDate: Date | undefined;
  periodStartDate: Date | undefined;
  periodEndDate: Date | undefined;
  statementReference: string;
  bookBalanceStart: string;
  bookBalanceEnd: string;
  statementBalance: string;
  depositsInTransit: string;
  outstandingChecks: string;
  bankCharges: string;
  bankInterest: string;
  otherAdjustments: string;
  notes: string;
}

const EMPTY_FORM: CreateFormState = {
  bankAccountId: '',
  statementDate: undefined,
  periodStartDate: undefined,
  periodEndDate: undefined,
  statementReference: '',
  bookBalanceStart: '0',
  bookBalanceEnd: '',
  statementBalance: '',
  depositsInTransit: '0',
  outstandingChecks: '0',
  bankCharges: '0',
  bankInterest: '0',
  otherAdjustments: '0',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BankReconciliationsPage() {
  const { t } = useTranslation();
  const getStatusLabel = (s?: string) =>
    t(STATUS_LABEL_KEY[s ?? ''] ?? '', STATUS_LABEL_FALLBACK[s ?? ''] ?? (s ?? '—'));
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* filters */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [balancedFilter, setBalancedFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]     = useState<Date | undefined>(undefined);

  /* dialogs */
  const [createOpen, setCreateOpen]   = useState(false);
  const [viewing, setViewing]         = useState<BankReconciliation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BankReconciliation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);

  /* queries */
  const queryParams = useMemo(() => ({
    page:          1,
    limit:         50,
    search:        searchText || undefined,
    status:        statusFilter   === 'all' ? undefined : (statusFilter as BankReconciliation['status']),
    bankAccountId: accountFilter  === 'all' ? undefined : accountFilter,
    isBalanced:    balancedFilter === 'all' ? undefined : balancedFilter === 'yes',
    startDate:     toIsoOrUndef(startDate),
    endDate:       toIsoOrUndef(endDate),
    sortBy:        'statementDate',
    sortOrder:     'desc' as const,
  }), [searchText, statusFilter, accountFilter, balancedFilter, startDate, endDate]);

  const { data: recons, isLoading, error, refetch } = useQuery({
    queryKey: ['bank-reconciliations', queryParams],
    queryFn:  () => getBankReconciliations(queryParams),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const rows = recons?.data ?? [];
  const bankAccounts = useMemo(
    () => (accounts as ChartOfAccount[]).filter((a) => a.code.startsWith('1-1')),
    [accounts],
  );

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });

  const createMutation = useMutation({
    mutationFn: createBankReconciliation,
    onSuccess: () => {
      toast.success(t('accounting.bankReconciliations.createSuccess', 'Reconciliation created'));
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t('accounting.bankReconciliations.createFail', 'Failed to create reconciliation')),
  });

  const reviewMutation = useMutation({
    mutationFn: reviewBankReconciliation,
    onSuccess: () => { toast.success(t('accounting.bankReconciliations.reviewSuccess', 'Sent for review')); invalidate(); },
    onError:   () => toast.error(t('accounting.bankReconciliations.reviewFail', 'Failed to submit for review')),
  });

  const approveMutation = useMutation({
    mutationFn: approveBankReconciliation,
    onSuccess: () => { toast.success(t('accounting.bankReconciliations.approveSuccess', 'Reconciliation approved')); invalidate(); },
    onError:   () => toast.error(t('accounting.bankReconciliations.approveFail', 'Failed to approve')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBankReconciliation(id, reason),
    onSuccess: () => {
      toast.success(t('accounting.bankReconciliations.rejectSuccess', 'Reconciliation rejected'));
      invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error(t('accounting.bankReconciliations.rejectFail', 'Failed to reject')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankReconciliation,
    onSuccess: () => { toast.success(t('accounting.bankReconciliations.deleteSuccess', 'Reconciliation deleted')); invalidate(); },
    onError:   () => toast.error(t('accounting.bankReconciliations.deleteFail', 'Failed to delete')),
  });

  /* derived stats */
  const stats = useMemo(() => {
    const total     = rows.length;
    const balanced  = rows.filter((r) => r.isBalanced).length;
    const completed = rows.filter((r) => r.status === 'COMPLETED' || r.status === 'APPROVED').length;
    const latest    = rows[0];
    return { total, balanced, completed, latestDiff: latest ? toNumber(latest.difference) : 0 };
  }, [rows]);

  /* calculated balances for create form */
  const calc = useMemo(() => {
    const bookEnd   = parseFloat(form.bookBalanceEnd)     || 0;
    const stmtBal   = parseFloat(form.statementBalance)   || 0;
    const depTrans  = parseFloat(form.depositsInTransit)  || 0;
    const outChk    = parseFloat(form.outstandingChecks)  || 0;
    const charges   = parseFloat(form.bankCharges)        || 0;
    const interest  = parseFloat(form.bankInterest)       || 0;
    const other     = parseFloat(form.otherAdjustments)   || 0;
    const adjBook   = bookEnd + interest - charges + other;
    const adjBank   = stmtBal + depTrans - outChk;
    const diff      = Math.abs(adjBook - adjBank);
    return { adjBook, adjBank, diff, isBalanced: diff < 0.01 };
  }, [form]);

  const hasActiveFilters =
    !!searchText || statusFilter !== 'all' || accountFilter !== 'all'
    || balancedFilter !== 'all' || !!startDate || !!endDate;

  const resetFilters = () => {
    setSearchInput(''); setStatusFilter('all'); setAccountFilter('all');
    setBalancedFilter('all'); setStartDate(undefined); setEndDate(undefined);
  };

  const handleCreate = () => {
    if (!form.bankAccountId || !form.statementDate || !form.periodStartDate || !form.periodEndDate) {
      toast.error(t('accounting.bankReconciliations.validationRequired', 'Please fill in all required fields'));
      return;
    }
    if (!form.bookBalanceEnd || !form.statementBalance) {
      toast.error(t('accounting.bankReconciliations.validationBalances', 'Please enter book and statement balances'));
      return;
    }
    createMutation.mutate({
      bankAccountId:       form.bankAccountId,
      statementDate:       form.statementDate.toISOString(),
      periodStartDate:     form.periodStartDate.toISOString(),
      periodEndDate:       form.periodEndDate.toISOString(),
      statementReference:  form.statementReference || undefined,
      bookBalanceStart:    parseFloat(form.bookBalanceStart) || 0,
      bookBalanceEnd:      parseFloat(form.bookBalanceEnd),
      statementBalance:    parseFloat(form.statementBalance),
      depositsInTransit:   parseFloat(form.depositsInTransit) || 0,
      outstandingChecks:   parseFloat(form.outstandingChecks) || 0,
      bankCharges:         parseFloat(form.bankCharges) || 0,
      bankInterest:        parseFloat(form.bankInterest) || 0,
      otherAdjustments:    parseFloat(form.otherAdjustments) || 0,
      adjustedBookBalance: calc.adjBook,
      adjustedBankBalance: calc.adjBank,
      notes:               form.notes || undefined,
    });
  };

  /* Shell */
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
          icon={<BookOpen className="h-12 w-12" />}
          title={t('accounting.bankReconciliations.errorTitle', 'Cannot load bank reconciliations')}
          description={error instanceof Error ? error.message : t('accounting.bankReconciliations.errorDesc', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('accounting.bankReconciliations.retry', 'Try Again')}</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title={t('accounting.bankReconciliations.title', 'Bank Reconciliations')}
        description={t('accounting.bankReconciliations.description', 'Match book balance with bank statement and resolve discrepancies.')}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              {t('accounting.bankReconciliations.newReconciliation', 'New Reconciliation')}
            </Button>
          </div>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-lg" />
            ))
          ) : (
            <>
              <StatCard label={t('accounting.bankReconciliations.statTotal', 'Total Reconciliations')} value={String(stats.total)} sublabel={t('accounting.bankReconciliations.statTotalSub', 'matching active filter')} />
              <StatCard label={t('accounting.bankReconciliations.statBalanced', 'Balanced')} value={String(stats.balanced)} sublabel={t('accounting.bankReconciliations.statBalancedSub', 'balances matched')} />
              <StatCard label={t('accounting.bankReconciliations.statCompleted', 'Completed / Approved')} value={String(stats.completed)} sublabel={t('accounting.bankReconciliations.statCompletedSub', 'final reconciliations')} />
              <StatCard
                label={t('accounting.bankReconciliations.statLatestDiff', 'Latest Difference')}
                value={<MoneyDisplay amount={stats.latestDiff} className={stats.latestDiff > 0.01 ? 'text-danger' : 'text-success'} />}
                sublabel={stats.latestDiff > 0.01 ? t('accounting.bankReconciliations.statHasDiff', 'has discrepancy') : t('accounting.bankReconciliations.statNoDiff', 'balanced')}
              />
            </>
          )}
        </div>
      </section>

      {/* Filter + table panel */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('accounting.bankReconciliations.searchPlaceholder', 'Search by reconciliation number...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]">
                  <SelectValue placeholder={t('accounting.bankReconciliations.bankAccountPlaceholder', 'Bank Account')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.bankReconciliations.allBankAccounts', 'All Bank Accounts')}</SelectItem>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.code} — {acc.nameId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder={t('accounting.bankReconciliations.statusPlaceholder', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.bankReconciliations.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="DRAFT">{t('accounting.bankReconciliations.statusDraft', 'Draft')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('accounting.bankReconciliations.statusInProgress', 'In Progress')}</SelectItem>
                  <SelectItem value="REVIEWED">{t('accounting.bankReconciliations.statusReviewed', 'Reviewed')}</SelectItem>
                  <SelectItem value="APPROVED">{t('accounting.bankReconciliations.statusApproved', 'Approved')}</SelectItem>
                  <SelectItem value="REJECTED">{t('accounting.bankReconciliations.statusRejected', 'Rejected')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('accounting.bankReconciliations.statusCompleted', 'Completed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={balancedFilter} onValueChange={setBalancedFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder={t('accounting.bankReconciliations.balancePlaceholder', 'Balance')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.bankReconciliations.balanceAll', 'All')}</SelectItem>
                  <SelectItem value="yes">{t('accounting.bankReconciliations.balanced', 'Balanced')}</SelectItem>
                  <SelectItem value="no">{t('accounting.bankReconciliations.unbalanced', 'Unbalanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">{t('accounting.bankReconciliations.periodLabel', 'Period')}</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker value={startDate} onChange={setStartDate} placeholder={t('accounting.bankReconciliations.dateFrom', 'Start date')} className="h-9 text-sm bg-bg-sunken border-border-subtle" />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker value={endDate} onChange={setEndDate} placeholder={t('accounting.bankReconciliations.dateTo', 'End date')} className="h-9 text-sm bg-bg-sunken border-border-subtle" />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-text-tertiary hover:text-text-primary self-start sm:self-auto">
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title={hasActiveFilters ? t('accounting.bankReconciliations.noMatch', 'No matching reconciliations') : t('accounting.bankReconciliations.noReconciliations', 'No bank reconciliations yet')}
            description={hasActiveFilters ? t('accounting.bankReconciliations.noMatchDesc', 'Try changing the filter.') : t('accounting.bankReconciliations.noReconciliationsDesc', 'Create your first bank reconciliation to start matching balances.')}
            action={
              hasActiveFilters
                ? <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.bankReconciliations.resetFilter', 'Reset Filters')}</Button>
                : <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> {t('accounting.bankReconciliations.newReconciliation', 'New Reconciliation')}</Button>
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<BankReconciliation>
              data={rows}
              onRowClick={setViewing}
              enablePagination
              columns={[
                {
                  accessorKey: 'reconciliationNumber',
                  header: t('accounting.bankReconciliations.colNumber', 'Number'),
                  cell: ({ row }) => (
                    <div className="font-mono text-xs text-text-primary tracking-tight">
                      {row.original.reconciliationNumber || '—'}
                    </div>
                  ),
                },
                {
                  id: 'bankAccount',
                  header: t('accounting.bankReconciliations.colBankAccount', 'Bank Account'),
                  cell: ({ row }) => {
                    const r = row.original;
                    return (
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary">{r.bankAccount.nameId}</div>
                        <div className="text-xs text-text-tertiary font-mono">{r.bankAccount.code}</div>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'statementDate',
                  header: t('accounting.bankReconciliations.colStatementDate', 'Statement Date'),
                  cell: ({ row }) => (
                    <span className="text-text-tertiary"><DateDisplay date={row.original.statementDate} /></span>
                  ),
                },
                {
                  id: 'period',
                  header: t('accounting.bankReconciliations.colPeriod', 'Period'),
                  cell: ({ row }) => {
                    const r = row.original;
                    return (
                      <div className="text-xs text-text-secondary">
                        <DateDisplay date={r.periodStartDate} /> — <DateDisplay date={r.periodEndDate} />
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'statementBalance',
                  header: () => <span className="block text-right">{t('accounting.bankReconciliations.colStatementBalance', 'Statement Balance')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.statementBalance)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'difference',
                  header: () => <span className="block text-right">{t('accounting.bankReconciliations.colDifference', 'Difference')}</span>,
                  cell: ({ row }) => {
                    const diff = toNumber(row.original.difference);
                    return (
                      <div className="text-right">
                        <MoneyDisplay amount={diff} className={diff > 0.01 ? 'text-danger' : 'text-success'} />
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'isBalanced',
                  header: t('accounting.bankReconciliations.colBalance', 'Balance'),
                  cell: ({ row }) => (
                    row.original.isBalanced
                      ? <CheckCircle2 className="h-4 w-4 text-success" />
                      : <AlertTriangle className="h-4 w-4 text-warning" />
                  ),
                },
                {
                  accessorKey: 'status',
                  header: t('accounting.bankReconciliations.colStatus', 'Status'),
                  cell: ({ row }) => (
                    <Badge variant={getStatusVariant(row.original.status)}>
                      {getStatusLabel(row.original.status)}
                    </Badge>
                  ),
                },
                {
                  id: 'actions',
                  header: () => <span className="sr-only">{t('accounting.bankReconciliations.colActions', 'Actions')}</span>,
                  cell: ({ row }) => {
                    const rec = row.original;
                    return (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setViewing(rec)}>
                              <Eye className="h-3.5 w-3.5" /> {t('accounting.bankReconciliations.actionViewDetail', 'View Detail')}
                            </DropdownMenuItem>
                            {(rec.status === 'DRAFT' || rec.status === 'IN_PROGRESS') && (
                              <>
                                <DropdownMenuItem onClick={() => reviewMutation.mutate(rec.id)}>
                                  <FileTextIcon className="h-3.5 w-3.5" /> {t('accounting.bankReconciliations.actionReview', 'Review')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteMutation.mutate(rec.id)} className="text-danger focus:text-danger">
                                  <X className="h-3.5 w-3.5" /> {t('accounting.bankReconciliations.actionDelete', 'Delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {rec.status === 'REVIEWED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (!rec.isBalanced) {
                                      toast.warning(t('accounting.bankReconciliations.mustBeBalanced', 'Reconciliation must be balanced before approving'));
                                      return;
                                    }
                                    approveMutation.mutate(rec.id);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" /> {t('accounting.bankReconciliations.actionApprove', 'Approve')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setRejectTarget(rec); setRejectReason(''); }}
                                  className="text-danger focus:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" /> {t('accounting.bankReconciliations.actionReject', 'Reject')}
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
          </div>
        )}
      </GlassPanel>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.bankReconciliations.detailTitle', 'Reconciliation Detail')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">{viewing?.reconciliationNumber}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailRow label={t('accounting.bankReconciliations.fieldStatus', 'Status')} wide={false}>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
                    {viewing.isBalanced
                      ? <span className="text-[10px] uppercase tracking-[0.14em] text-success">{t('accounting.bankReconciliations.balanced', 'Balanced')}</span>
                      : <span className="text-[10px] uppercase tracking-[0.14em] text-danger">{t('accounting.bankReconciliations.unbalanced', 'Unbalanced')}</span>}
                  </div>
                </DetailRow>
                <DetailRow label={t('accounting.bankReconciliations.colBankAccount', 'Bank Account')} wide={false}>
                  <span className="font-mono text-xs text-text-secondary">{viewing.bankAccount.code}</span>{' — '}{viewing.bankAccount.nameId}
                </DetailRow>
                <DetailRow label={t('accounting.bankReconciliations.colStatementDate', 'Statement Date')} wide={false}><DateDisplay date={viewing.statementDate} /></DetailRow>
                <DetailRow label={t('accounting.bankReconciliations.colPeriod', 'Period')} wide={false}>
                  <DateDisplay date={viewing.periodStartDate} /> — <DateDisplay date={viewing.periodEndDate} />
                </DetailRow>
                {viewing.statementReference && <DetailRow label={t('accounting.bankReconciliations.fieldReference', 'Reference')} wide={false}>{viewing.statementReference}</DetailRow>}
              </div>

              {/* Balance section */}
              <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">{t('accounting.bankReconciliations.sectionBalances', 'Balances')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldBookBalanceStart', 'Opening Book Balance')}</span>
                    <div><MoneyDisplay amount={toNumber(viewing.bookBalanceStart)} /></div>
                  </div>
                  <div>
                    <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldBookBalanceEnd', 'Closing Book Balance')}</span>
                    <div><MoneyDisplay amount={toNumber(viewing.bookBalanceEnd)} /></div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldStatementBalance', 'Bank Statement Balance')}</span>
                    <div><MoneyDisplay amount={toNumber(viewing.statementBalance)} /></div>
                  </div>
                </div>
              </div>

              {/* Adjustments */}
              <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">{t('accounting.bankReconciliations.sectionAdjustments', 'Adjustment Items')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldDepositsInTransit', 'Deposits in Transit')}</span><div><MoneyDisplay amount={toNumber(viewing.depositsInTransit)} /></div></div>
                  <div><span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldOutstandingChecks', 'Outstanding Checks')}</span><div><MoneyDisplay amount={toNumber(viewing.outstandingChecks)} /></div></div>
                  <div><span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldBankCharges', 'Bank Charges')}</span><div><MoneyDisplay amount={toNumber(viewing.bankCharges)} /></div></div>
                  <div><span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldBankInterest', 'Bank Interest')}</span><div><MoneyDisplay amount={toNumber(viewing.bankInterest)} /></div></div>
                  <div className="col-span-2"><span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldOtherAdjustments', 'Other Adjustments')}</span><div><MoneyDisplay amount={toNumber(viewing.otherAdjustments)} /></div></div>
                </div>
              </div>

              {/* Result */}
              <div className="bg-bg-panel rounded-lg p-4 border border-border-strong">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">{t('accounting.bankReconciliations.sectionResult', 'Reconciliation Result')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldAdjBookBalance', 'Adjusted Book Balance')}</span>
                    <div className="text-base font-semibold"><MoneyDisplay amount={toNumber(viewing.adjustedBookBalance)} /></div>
                  </div>
                  <div>
                    <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldAdjBankBalance', 'Adjusted Bank Balance')}</span>
                    <div className="text-base font-semibold"><MoneyDisplay amount={toNumber(viewing.adjustedBankBalance)} /></div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.colDifference', 'Difference')}</span>
                    <div className={cn('text-lg font-bold', toNumber(viewing.difference) > 0.01 ? 'text-danger' : 'text-success')}>
                      <MoneyDisplay amount={toNumber(viewing.difference)} />
                    </div>
                  </div>
                </div>
              </div>

              {viewing.notes && (
                <DetailRow label={t('accounting.bankReconciliations.fieldNotes', 'Notes')} wide><span className="text-text-secondary">{viewing.notes}</span></DetailRow>
              )}
              {viewing.rejectionReason && (
                <DetailRow label={t('accounting.bankReconciliations.fieldRejectionReason', 'Rejection Reason')} wide><span className="text-danger">{viewing.rejectionReason}</span></DetailRow>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>{t('accounting.bankReconciliations.close', 'Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.bankReconciliations.createDialogTitle', 'New Bank Reconciliation')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.bankReconciliations.createDialogDesc', 'Fill in the form to create a new bank reconciliation.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Bank account + statement date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.formBankAccount', 'Bank Account *')}</label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm((f) => ({ ...f, bankAccountId: v }))}>
                  <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                    <SelectValue placeholder={t('accounting.bankReconciliations.formBankAccountPlaceholder', 'Select bank account')} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.formStatementDate', 'Statement Date *')}</label>
                <MonomiDatePicker value={form.statementDate} onChange={(d) => setForm((f) => ({ ...f, statementDate: d }))} placeholder={t('accounting.bankReconciliations.formPickDate', 'Select date')} className="bg-bg-sunken border-border-subtle" />
              </div>
            </div>

            {/* Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.formPeriodStart', 'Period Start *')}</label>
                <MonomiDatePicker value={form.periodStartDate} onChange={(d) => setForm((f) => ({ ...f, periodStartDate: d }))} placeholder={t('accounting.bankReconciliations.dateFrom', 'Start date')} className="bg-bg-sunken border-border-subtle" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.formPeriodEnd', 'Period End *')}</label>
                <MonomiDatePicker value={form.periodEndDate} onChange={(d) => setForm((f) => ({ ...f, periodEndDate: d }))} placeholder={t('accounting.bankReconciliations.dateTo', 'End date')} className="bg-bg-sunken border-border-subtle" />
              </div>
            </div>

            {/* Ref */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.formStatementRef', 'Statement Reference')}</label>
              <Input value={form.statementReference} onChange={(e) => setForm((f) => ({ ...f, statementReference: e.target.value }))} placeholder={t('accounting.bankReconciliations.formOptional', 'Optional')} className="bg-bg-sunken border-border-subtle text-text-primary" />
            </div>

            {/* Balances */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle space-y-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.sectionBalances', 'Balances')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AmountField label={t('accounting.bankReconciliations.fieldBookBalanceStart', 'Opening Book Balance')} value={form.bookBalanceStart} onChange={(v) => setForm((f) => ({ ...f, bookBalanceStart: v }))} />
                <AmountField label={t('accounting.bankReconciliations.formBookBalanceEndReq', 'Closing Book Balance *')} value={form.bookBalanceEnd} onChange={(v) => setForm((f) => ({ ...f, bookBalanceEnd: v }))} />
              </div>
              <AmountField label={t('accounting.bankReconciliations.formStatementBalanceReq', 'Bank Statement Balance *')} value={form.statementBalance} onChange={(v) => setForm((f) => ({ ...f, statementBalance: v }))} />
            </div>

            {/* Adjustments */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle space-y-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.sectionAdjustments', 'Adjustment Items')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AmountField label={t('accounting.bankReconciliations.fieldDepositsInTransit', 'Deposits in Transit')} value={form.depositsInTransit} onChange={(v) => setForm((f) => ({ ...f, depositsInTransit: v }))} />
                <AmountField label={t('accounting.bankReconciliations.fieldOutstandingChecks', 'Outstanding Checks')} value={form.outstandingChecks} onChange={(v) => setForm((f) => ({ ...f, outstandingChecks: v }))} />
                <AmountField label={t('accounting.bankReconciliations.fieldBankCharges', 'Bank Charges')} value={form.bankCharges} onChange={(v) => setForm((f) => ({ ...f, bankCharges: v }))} />
                <AmountField label={t('accounting.bankReconciliations.fieldBankInterest', 'Bank Interest')} value={form.bankInterest} onChange={(v) => setForm((f) => ({ ...f, bankInterest: v }))} />
              </div>
              <AmountField label={t('accounting.bankReconciliations.fieldOtherAdjustments', 'Other Adjustments')} value={form.otherAdjustments} onChange={(v) => setForm((f) => ({ ...f, otherAdjustments: v }))} />
            </div>

            {/* Calculated result */}
            <div className="bg-bg-panel rounded-lg p-4 border border-border-strong">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">{t('accounting.bankReconciliations.sectionCalcResult', 'Calculation Result')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldAdjBookBalanceShort', 'Book Balance (Adj.)')}</span>
                  <div className="font-semibold"><MoneyDisplay amount={calc.adjBook} /></div>
                </div>
                <div>
                  <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.fieldAdjBankBalanceShort', 'Bank Balance (Adj.)')}</span>
                  <div className="font-semibold"><MoneyDisplay amount={calc.adjBank} /></div>
                </div>
                <div className="col-span-2">
                  <span className="text-text-tertiary text-xs">{t('accounting.bankReconciliations.colDifference', 'Difference')}</span>
                  <div className={cn('text-base font-bold', calc.isBalanced ? 'text-success' : 'text-danger')}>
                    <MoneyDisplay amount={calc.diff} />
                    <span className="ml-2 text-xs font-normal">{calc.isBalanced ? t('accounting.bankReconciliations.balancedCheck', '— Balanced ✓') : t('accounting.bankReconciliations.notYetBalanced', '— Not Yet Balanced')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.fieldNotes', 'Notes')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t('accounting.bankReconciliations.formNotesPlaceholder', 'Additional notes (optional)')}
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>{t('accounting.bankReconciliations.cancel', 'Cancel')}</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !calc.isBalanced}
            >
              {createMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> {t('accounting.bankReconciliations.saving', 'Saving...')}</>
              ) : calc.isBalanced ? t('accounting.bankReconciliations.createButton', 'Create Reconciliation') : t('accounting.bankReconciliations.notBalancedButton', 'Not Balanced')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.bankReconciliations.rejectDialogTitle', 'Reject Reconciliation')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {rejectTarget?.reconciliationNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankReconciliations.fieldRejectionReason', 'Rejection Reason')} *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('accounting.bankReconciliations.rejectReasonPlaceholder', 'Enter rejection reason...')}
              rows={3}
              className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>{t('accounting.bankReconciliations.cancel', 'Cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget && rejectReason.trim()) {
                  rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
                }
              }}
            >
              {t('accounting.bankReconciliations.rejectButton', 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function DetailRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words text-sm">{children}</div>
    </div>
  );
}

function AmountField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="bg-bg-panel border-border-subtle text-text-primary"
      />
    </div>
  );
}
