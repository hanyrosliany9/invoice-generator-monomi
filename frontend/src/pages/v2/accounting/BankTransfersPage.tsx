import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal, Eye, Check, Ban,
  RefreshCw, ArrowRight,
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
  approveBankTransfer,
  type BankTransfer,
  cancelBankTransfer,
  type ChartOfAccount,
  createBankTransfer,
  deleteBankTransfer,
  getBankTransfers,
  getChartOfAccounts,
  rejectBankTransfer,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Vocab                                                              */
/* ------------------------------------------------------------------ */

const STATUS_LABEL_EN: Record<string, string> = {
  PENDING:     'Pending',
  APPROVED:    'Approved',
  IN_PROGRESS: 'In Progress',
  COMPLETED:   'Completed',
  FAILED:      'Failed',
  REJECTED:    'Rejected',
  CANCELLED:   'Cancelled',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  PENDING:     'secondary',
  APPROVED:    'default',
  IN_PROGRESS: 'secondary',
  COMPLETED:   'default',
  FAILED:      'destructive',
  REJECTED:    'destructive',
  CANCELLED:   'outline',
};

const TRANSFER_METHOD_LABEL_EN: Record<string, string> = {
  INTERNAL:  'Internal',
  INTERBANK: 'Interbank',
  RTGS:      'RTGS',
  CLEARING:  'Clearing',
  SKN:       'SKN',
  BIFAST:    'BI-FAST',
  OTHER:     'Other',
};

const getStatusLabel   = (s?: string) => STATUS_LABEL_EN[s ?? '']        ?? (s ?? '—');
const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';
const getMethodLabel   = (m?: string) => TRANSFER_METHOD_LABEL_EN[m ?? ''] ?? (m ?? '—');

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);

const isThisMonth = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ------------------------------------------------------------------ */
/*  Create form state                                                  */
/* ------------------------------------------------------------------ */

interface CreateForm {
  transferDate: Date | undefined;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transferMethod: BankTransfer['transferMethod'];
  transferFee: string;
  feeAccountId: string;
  descriptionId: string;
  description: string;
  bankReference: string;
  confirmationCode: string;
  reference: string;
  notes: string;
}

const EMPTY_FORM: CreateForm = {
  transferDate: undefined,
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  transferMethod: 'INTERNAL',
  transferFee: '',
  feeAccountId: '',
  descriptionId: '',
  description: '',
  bankReference: '',
  confirmationCode: '',
  reference: '',
  notes: '',
};

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
      topbar={{}}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BankTransfersPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* filters */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]     = useState<Date | undefined>(undefined);

  /* dialogs */
  const [createOpen, setCreateOpen]   = useState(false);
  const [viewing, setViewing]         = useState<BankTransfer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BankTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  /* queries */
  const queryParams = useMemo(() => ({
    page:           1,
    limit:          50,
    search:         searchText || undefined,
    status:         statusFilter === 'all' ? undefined : (statusFilter as BankTransfer['status']),
    transferMethod: methodFilter === 'all' ? undefined : (methodFilter as BankTransfer['transferMethod']),
    startDate:      toIsoOrUndef(startDate),
    endDate:        toIsoOrUndef(endDate),
    sortBy:         'transferDate',
    sortOrder:      'desc' as const,
  }), [searchText, statusFilter, methodFilter, startDate, endDate]);

  const { data: txData, isLoading, error, refetch } = useQuery({
    queryKey: ['bank-transfers', queryParams],
    queryFn:  () => getBankTransfers(queryParams),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const transfers = txData?.data ?? [];
  const bankAccounts = useMemo(
    () => (accounts as ChartOfAccount[]).filter((a) => a.code.startsWith('1-1')),
    [accounts],
  );
  const expenseAccounts = useMemo(
    () => (accounts as ChartOfAccount[]).filter(
      (a) => a.accountType === 'EXPENSE' && a.accountSubType === 'BANK_CHARGES',
    ),
    [accounts],
  );

  /* stats */
  const stats = useMemo(() => {
    const thisMonth  = transfers.filter((t) => isThisMonth(t.transferDate));
    const totalMonth = thisMonth.reduce((a, t) => a + toNumber(t.amount), 0);
    const pending    = transfers.filter((t) => t.status === 'PENDING').length;
    const completed  = transfers.filter((t) => t.status === 'COMPLETED').length;
    const totalAll   = transfers.reduce((a, t) => a + toNumber(t.amount), 0);
    return { totalMonth, pending, completed, totalAll };
  }, [transfers]);

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });

  const createMutation = useMutation({
    mutationFn: createBankTransfer,
    onSuccess: () => {
      toast.success(t('accounting.bankTransfers.createSuccess', 'Bank transfer created'));
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t('accounting.bankTransfers.createFail', 'Failed to create bank transfer')),
  });

  const approveMutation = useMutation({
    mutationFn: approveBankTransfer,
    onSuccess: () => { toast.success(t('accounting.bankTransfers.approveSuccess', 'Bank transfer approved and posted')); invalidate(); },
    onError:   () => toast.error(t('accounting.bankTransfers.approveFail', 'Failed to approve bank transfer')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBankTransfer(id, reason),
    onSuccess: () => {
      toast.success(t('accounting.bankTransfers.rejectSuccess', 'Bank transfer rejected'));
      invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error(t('accounting.bankTransfers.rejectFail', 'Failed to reject bank transfer')),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBankTransfer,
    onSuccess: () => { toast.success(t('accounting.bankTransfers.cancelSuccess', 'Bank transfer cancelled')); invalidate(); },
    onError:   () => toast.error(t('accounting.bankTransfers.cancelFail', 'Failed to cancel bank transfer')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankTransfer,
    onSuccess: () => { toast.success(t('accounting.bankTransfers.deleteSuccess', 'Bank transfer deleted')); invalidate(); },
    onError:   () => toast.error(t('accounting.bankTransfers.deleteFail', 'Failed to delete bank transfer')),
  });

  const hasActiveFilters =
    !!searchText || statusFilter !== 'all' || methodFilter !== 'all' || !!startDate || !!endDate;

  const resetFilters = () => {
    setSearchInput(''); setStatusFilter('all'); setMethodFilter('all');
    setStartDate(undefined); setEndDate(undefined);
  };

  const handleCreate = () => {
    if (!form.transferDate || !form.fromAccountId || !form.toAccountId) {
      toast.error(t('accounting.bankTransfers.validationRequired', 'Please complete all required fields'));
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error(t('accounting.bankTransfers.validationAmount', 'Transfer amount is required and must be greater than 0'));
      return;
    }
    if (!form.descriptionId.trim()) {
      toast.error(t('accounting.bankTransfers.validationDesc', 'Transfer description is required'));
      return;
    }
    createMutation.mutate({
      transferDate:     form.transferDate.toISOString(),
      amount:           parseFloat(form.amount),
      fromAccountId:    form.fromAccountId,
      toAccountId:      form.toAccountId,
      description:      form.description || form.descriptionId,
      descriptionId:    form.descriptionId,
      reference:        form.reference || undefined,
      transferFee:      form.transferFee ? parseFloat(form.transferFee) : undefined,
      feeAccountId:     form.feeAccountId || undefined,
      transferMethod:   form.transferMethod,
      bankReference:    form.bankReference || undefined,
      confirmationCode: form.confirmationCode || undefined,
      notes:            form.notes || undefined,
      status:           'PENDING',
    });
  };

  if (error) {
    return (
      <PageShell user={user}>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={t('accounting.bankTransfers.errorTitle', 'Cannot load bank transfers')}
          description={error instanceof Error ? error.message : t('accounting.bankTransfers.errorGeneric', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('accounting.bankTransfers.retry', 'Try Again')}</Button>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell user={user}>
      <PageHeader
        title={t('accounting.bankTransfers.title', 'Bank Transfers')}
        description={t('accounting.bankTransfers.description', 'Record and approve transfers between cash and bank accounts.')}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('accounting.bankTransfers.newTransfer', 'New Transfer')}
          </Button>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)
          ) : (
            <>
              <StatCard label={t('accounting.bankTransfers.statThisMonth', 'This Month Total')} value={<MoneyDisplay amount={stats.totalMonth} />} sublabel={t('accounting.bankTransfers.statThisMonthSub', 'transfer value this month')} />
              <StatCard label={t('accounting.bankTransfers.statPending', 'Awaiting Approval')} value={String(stats.pending)} sublabel={t('accounting.bankTransfers.statPendingSub', 'pending transfers')} />
              <StatCard label={t('accounting.bankTransfers.statCompleted', 'Completed')} value={String(stats.completed)} sublabel={t('accounting.bankTransfers.statCompletedSub', 'completed transfers')} />
              <StatCard label={t('accounting.bankTransfers.statFiltered', 'Total (Filtered)')} value={<MoneyDisplay amount={stats.totalAll} />} sublabel={t('accounting.bankTransfers.statFilteredSub', 'matching active filter')} />
            </>
          )}
        </div>
      </section>

      {/* Filter + table */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('accounting.bankTransfers.searchPlaceholder', 'Search transfer number, description...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.bankTransfers.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="PENDING">{t('accounting.bankTransfers.statusPending', 'Pending')}</SelectItem>
                  <SelectItem value="APPROVED">{t('accounting.bankTransfers.statusApproved', 'Approved')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('accounting.bankTransfers.statusInProgress', 'In Progress')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('accounting.bankTransfers.statusCompleted', 'Completed')}</SelectItem>
                  <SelectItem value="FAILED">{t('accounting.bankTransfers.statusFailed', 'Failed')}</SelectItem>
                  <SelectItem value="REJECTED">{t('accounting.bankTransfers.statusRejected', 'Rejected')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('accounting.bankTransfers.statusCancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder={t('bankTransfers.methodPlaceholder', 'Method')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.bankTransfers.allMethods', 'All Methods')}</SelectItem>
                  <SelectItem value="INTERNAL">{t('accounting.bankTransfers.methodInternal', 'Internal')}</SelectItem>
                  <SelectItem value="INTERBANK">{t('accounting.bankTransfers.methodInterbank', 'Interbank')}</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="CLEARING">{t('accounting.bankTransfers.methodClearing', 'Clearing')}</SelectItem>
                  <SelectItem value="SKN">SKN</SelectItem>
                  <SelectItem value="BIFAST">BI-FAST</SelectItem>
                  <SelectItem value="OTHER">{t('accounting.bankTransfers.methodOther', 'Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">{t('accounting.bankTransfers.dateRange', 'Range')}</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker value={startDate} onChange={setStartDate} placeholder={t('accounting.bankTransfers.startDate', 'Start date')} className="h-9 text-sm bg-bg-sunken border-border-subtle" />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker value={endDate} onChange={setEndDate} placeholder={t('accounting.bankTransfers.endDate', 'End date')} className="h-9 text-sm bg-bg-sunken border-border-subtle" />
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
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title={hasActiveFilters ? t('accounting.bankTransfers.noMatch', 'No matching transfers') : t('accounting.bankTransfers.emptyTitle', 'No bank transfers yet')}
            description={hasActiveFilters ? t('accounting.bankTransfers.noMatchDesc', 'Try adjusting the filter.') : t('accounting.bankTransfers.emptyDesc', 'Create the first bank transfer to start recording fund movements.')}
            action={
              hasActiveFilters
                ? <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.bankTransfers.resetFilter', 'Reset Filter')}</Button>
                : <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> {t('accounting.bankTransfers.newTransfer', 'New Transfer')}</Button>
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<BankTransfer>
              data={transfers}
              onRowClick={setViewing}
              enablePagination
              columns={[
                {
                  accessorKey: 'transferNumber',
                  header: t('accounting.bankTransfers.colNumber', 'Number'),
                  cell: ({ row }) => (
                    <div className="font-mono text-xs text-text-primary tracking-tight">
                      {row.original.transferNumber || '—'}
                    </div>
                  ),
                },
                {
                  accessorKey: 'transferDate',
                  header: t('accounting.bankTransfers.colDate', 'Date'),
                  cell: ({ row }) => (
                    <span className="text-text-tertiary"><DateDisplay date={row.original.transferDate} /></span>
                  ),
                },
                {
                  id: 'route',
                  header: t('accounting.bankTransfers.colRoute', 'From → To'),
                  cell: ({ row }) => {
                    const tx = row.original;
                    return (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-text-secondary truncate">{tx.fromAccount.nameId}</span>
                          <ArrowRight className="h-3 w-3 text-text-tertiary shrink-0" />
                          <span className="text-text-secondary truncate">{tx.toAccount.nameId}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono mt-0.5">
                          <span>{tx.fromAccount.code}</span>
                          <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                          <span>{tx.toAccount.code}</span>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'transferMethod',
                  header: t('accounting.bankTransfers.colMethod', 'Method'),
                  cell: ({ row }) => (
                    <span className="text-xs text-text-secondary">{getMethodLabel(row.original.transferMethod)}</span>
                  ),
                },
                {
                  id: 'amount',
                  header: () => <span className="block text-right">{t('accounting.bankTransfers.colAmount', 'Amount')}</span>,
                  cell: ({ row }) => {
                    const tx = row.original;
                    const fee = toNumber(tx.transferFee);
                    return (
                      <div className="text-right">
                        <MoneyDisplay amount={toNumber(tx.amount)} />
                        {fee > 0 && (
                          <div className="text-xs text-text-tertiary mt-0.5">
                            {t('accounting.bankTransfers.fee', 'Fee')}: <MoneyDisplay amount={fee} />
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'status',
                  header: t('accounting.bankTransfers.colStatus', 'Status'),
                  cell: ({ row }) => (
                    <Badge variant={getStatusVariant(row.original.status)}>
                      {getStatusLabel(row.original.status)}
                    </Badge>
                  ),
                },
                {
                  id: 'actions',
                  header: () => <span className="sr-only">{t('bankTransfers.actions', 'Actions')}</span>,
                  cell: ({ row }) => {
                    const tx = row.original;
                    return (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setViewing(tx)}>
                              <Eye className="h-3.5 w-3.5" /> {t('accounting.bankTransfers.actionView', 'View Details')}
                            </DropdownMenuItem>
                            {tx.status === 'PENDING' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => approveMutation.mutate(tx.id)}>
                                  <Check className="h-3.5 w-3.5" /> {t('accounting.bankTransfers.actionApprove', 'Approve')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setRejectTarget(tx); setRejectReason(''); }}
                                  className="text-danger focus:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" /> {t('accounting.bankTransfers.actionReject', 'Reject')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (window.confirm(`${t('accounting.bankTransfers.confirmDelete', 'Delete transfer')} ${tx.transferNumber}?`)) {
                                      deleteMutation.mutate(tx.id);
                                    }
                                  }}
                                  className="text-danger focus:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" /> {t('accounting.bankTransfers.actionDelete', 'Delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {(tx.status === 'APPROVED' || tx.status === 'IN_PROGRESS') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (window.confirm(`${t('accounting.bankTransfers.confirmCancel', 'Cancel transfer')} ${tx.transferNumber}?`)) {
                                      cancelMutation.mutate(tx.id);
                                    }
                                  }}
                                  className="text-danger focus:text-danger"
                                >
                                  <Ban className="h-3.5 w-3.5" /> {t('accounting.bankTransfers.actionCancel', 'Cancel')}
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
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.bankTransfers.viewTitle', 'Bank Transfer Detail')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">{viewing?.transferNumber}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <ViewRow label={t('accounting.bankTransfers.viewStatus', 'Status')}>
                  <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
                </ViewRow>
                <ViewRow label={t('accounting.bankTransfers.viewMethod', 'Method')}>{getMethodLabel(viewing.transferMethod)}</ViewRow>
                <ViewRow label={t('accounting.bankTransfers.viewDate', 'Date')} wide><DateDisplay date={viewing.transferDate} /></ViewRow>
              </div>

              {/* Transfer route */}
              <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">{t('accounting.bankTransfers.viewRoute', 'Transfer Route')}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{t('accounting.bankTransfers.viewFrom', 'From')}</div>
                    <div className="text-sm text-text-primary">{viewing.fromAccount.nameId}</div>
                    <div className="text-xs font-mono text-text-tertiary">{viewing.fromAccount.code}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-tertiary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{t('accounting.bankTransfers.viewTo', 'To')}</div>
                    <div className="text-sm text-text-primary">{viewing.toAccount.nameId}</div>
                    <div className="text-xs font-mono text-text-tertiary">{viewing.toAccount.code}</div>
                  </div>
                </div>
              </div>

              {/* Amount block */}
              <div className="bg-bg-panel rounded-lg p-4 border border-border-strong">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-2">{t('accounting.bankTransfers.viewAmount', 'Transfer Amount')}</p>
                <div className="text-2xl font-display font-bold text-text-primary">
                  <MoneyDisplay amount={toNumber(viewing.amount)} />
                </div>
                {toNumber(viewing.transferFee) > 0 && (
                  <div className="text-xs text-text-tertiary mt-1">
                    {t('accounting.bankTransfers.viewFeeLabel', 'Transfer fee:')} <MoneyDisplay amount={toNumber(viewing.transferFee)} />
                  </div>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {viewing.descriptionId && (
                  <ViewRow label={t('accounting.bankTransfers.viewDescription', 'Description')} wide>{viewing.descriptionId}</ViewRow>
                )}
                {viewing.reference && <ViewRow label={t('accounting.bankTransfers.viewReference', 'Reference')}>{viewing.reference}</ViewRow>}
                {viewing.bankReference && <ViewRow label={t('accounting.bankTransfers.viewBankRef', 'Bank Ref.')}>{viewing.bankReference}</ViewRow>}
                {viewing.confirmationCode && <ViewRow label={t('accounting.bankTransfers.viewConfirmCode', 'Confirmation Code')}>{viewing.confirmationCode}</ViewRow>}
                {viewing.journalEntryId && (
                  <ViewRow label={t('accounting.bankTransfers.viewJournalId', 'Journal Entry ID')} wide>
                    <span className="font-mono text-xs">{viewing.journalEntryId}</span>
                  </ViewRow>
                )}
                {viewing.notes && <ViewRow label={t('accounting.bankTransfers.viewNotes', 'Notes')} wide>{viewing.notes}</ViewRow>}
                {viewing.rejectionReason && (
                  <ViewRow label={t('accounting.bankTransfers.viewRejectionReason', 'Rejection Reason')} wide>
                    <span className="text-danger">{viewing.rejectionReason}</span>
                  </ViewRow>
                )}
                {viewing.approvedAt && (
                  <ViewRow label={t('accounting.bankTransfers.viewApproved', 'Approved')}><DateDisplay date={viewing.approvedAt} /></ViewRow>
                )}
                {viewing.completedAt && (
                  <ViewRow label={t('accounting.bankTransfers.viewCompleted', 'Completed')}><DateDisplay date={viewing.completedAt} /></ViewRow>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>{t('accounting.bankTransfers.close', 'Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.bankTransfers.createTitle', 'New Bank Transfer')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.bankTransfers.createDesc', 'Move funds between cash and bank accounts.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldDate', 'Transfer Date')} *</label>
              <MonomiDatePicker
                value={form.transferDate}
                onChange={(d) => setForm((f) => ({ ...f, transferDate: d }))}
                placeholder={t('accounting.bankTransfers.fieldDatePh', 'Select date')}
                className="bg-bg-sunken border-border-subtle"
              />
            </div>

            {/* From account */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldFromAccount', 'From Account (Debit)')} *</label>
              <Select value={form.fromAccountId} onValueChange={(v) => setForm((f) => ({ ...f, fromAccountId: v }))}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                  <SelectValue placeholder={t('accounting.bankTransfers.fieldFromAccountPh', 'Select source account')} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Arrow separator */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-text-tertiary text-xs">
                <div className="h-px w-16 bg-border-subtle" />
                <ArrowRight className="h-4 w-4" />
                <div className="h-px w-16 bg-border-subtle" />
              </div>
            </div>

            {/* To account */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldToAccount', 'To Account (Credit)')} *</label>
              <Select value={form.toAccountId} onValueChange={(v) => setForm((f) => ({ ...f, toAccountId: v }))}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                  <SelectValue placeholder={t('accounting.bankTransfers.fieldToAccountPh', 'Select destination account')} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount + method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldAmount', 'Transfer Amount (IDR)')} *</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldMethod', 'Transfer Method')}</label>
                <Select
                  value={form.transferMethod}
                  onValueChange={(v) => setForm((f) => ({ ...f, transferMethod: v as BankTransfer['transferMethod'] }))}
                >
                  <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="INTERBANK">{t('accounting.bankTransfers.methodInterbank', 'Interbank')}</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="CLEARING">{t('accounting.bankTransfers.methodClearing', 'Clearing')}</SelectItem>
                    <SelectItem value="SKN">SKN</SelectItem>
                    <SelectItem value="BIFAST">BI-FAST</SelectItem>
                    <SelectItem value="OTHER">{t('accounting.bankTransfers.methodOther', 'Other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fee (optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldFee', 'Transfer Fee (Optional)')}</label>
                <Input
                  type="number"
                  value={form.transferFee}
                  onChange={(e) => setForm((f) => ({ ...f, transferFee: e.target.value }))}
                  placeholder="0"
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
              {expenseAccounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldFeeAccount', 'Fee Account')}</label>
                  <Select value={form.feeAccountId} onValueChange={(v) => setForm((f) => ({ ...f, feeAccountId: v }))}>
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue placeholder={t('accounting.bankTransfers.fieldFeeAccountPh', 'Select account')} />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldDescId', 'Description (Indonesian)')} *</label>
              <textarea
                value={form.descriptionId}
                onChange={(e) => setForm((f) => ({ ...f, descriptionId: e.target.value }))}
                placeholder={t('accounting.bankTransfers.fieldDescIdPh', 'e.g. Transfer operational funds to BCA account')}
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldBankRef', 'Bank Reference')}</label>
                <Input value={form.bankReference} onChange={(e) => setForm((f) => ({ ...f, bankReference: e.target.value }))} placeholder={t('accounting.bankTransfers.optional', 'Optional')} className="bg-bg-sunken border-border-subtle text-text-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldConfirmCode', 'Confirmation Code')}</label>
                <Input value={form.confirmationCode} onChange={(e) => setForm((f) => ({ ...f, confirmationCode: e.target.value }))} placeholder={t('accounting.bankTransfers.optional', 'Optional')} className="bg-bg-sunken border-border-subtle text-text-primary" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.fieldNotes', 'Notes')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t('accounting.bankTransfers.fieldNotesPh', 'Additional notes (optional)')}
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>{t('accounting.bankTransfers.cancel', 'Cancel')}</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t('accounting.bankTransfers.saving', 'Saving...')}</> : t('accounting.bankTransfers.createSubmit', 'Create Transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.bankTransfers.rejectTitle', 'Reject Bank Transfer')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">{rejectTarget?.transferNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.bankTransfers.rejectReasonLabel', 'Rejection Reason')} *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('accounting.bankTransfers.rejectReasonPh', 'State the reason for rejection...')}
              rows={3}
              className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>{t('accounting.bankTransfers.cancel', 'Cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget && rejectReason.trim()) {
                  rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
                }
              }}
            >
              {t('accounting.bankTransfers.rejectSubmit', 'Reject Transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function ViewRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words text-sm">{children}</div>
    </div>
  );
}
