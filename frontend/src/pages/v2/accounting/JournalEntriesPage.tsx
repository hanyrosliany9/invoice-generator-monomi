import { useEffect, useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal,
  Eye, Pencil, Trash2, RotateCcw, Wand2, Download,
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
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { formatIDR } from '@/utils/currency';
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
import {
  deleteJournalEntry, getJournalEntries, reverseJournalEntry,
  exportJournalEntriesPDF, exportJournalEntriesExcel,
  type JournalEntry,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — mirrors GeneralLedgerPage so all accounting screens     */
/*  share one nav reading.                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status & helpers                                                  */
/* ------------------------------------------------------------------ */

const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT:  'accounting.journalEntries.statusDraft',
  POSTED: 'accounting.journalEntries.statusPosted',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'POSTED': return 'bg-success/10 text-success';
    case 'DRAFT':
    default:       return 'bg-bg-sunken text-text-tertiary';
  }
};

const TRANSACTION_TYPE_LABEL_KEYS: Record<string, string> = {
  ADJUSTMENT:           'accounting.journalEntries.typeAdjustment',
  PURCHASE:             'accounting.journalEntries.typePurchase',
  ASSET_PURCHASE:       'accounting.journalEntries.typeAssetPurchase',
  CASH_RECEIPT:         'accounting.journalEntries.typeCashReceipt',
  CASH_DISBURSEMENT:    'accounting.journalEntries.typeCashDisbursement',
  DEPRECIATION:         'accounting.journalEntries.typeDepreciation',
  BANK_TRANSFER:        'accounting.journalEntries.typeBankTransfer',
  CAPITAL_CONTRIBUTION: 'accounting.journalEntries.typeCapitalContribution',
  OWNER_DRAWING:        'accounting.journalEntries.typeOwnerDrawing',
  CLOSING:              'accounting.journalEntries.typeClosing',
  OPENING:              'accounting.journalEntries.typeOpening',
  INVOICE:              'accounting.journalEntries.typeInvoice',
  PAYMENT:              'accounting.journalEntries.typePayment',
  EXPENSE:              'accounting.journalEntries.typeExpense',
  ECL:                  'accounting.journalEntries.typeECL',
};

/* Per-row display: map the SPECIFIC transactionType to a readable label so an
   expense entry reads "Expense"/"Reimbursement" rather than raw "EXPENSE_PAID". */
const ROW_TYPE_LABEL_KEYS: Record<string, string> = {
  INVOICE_SENT:          'accounting.journalEntries.typeInvoice',
  INVOICE_PAID:          'accounting.journalEntries.typePayment',
  PAYMENT_RECEIVED:      'accounting.journalEntries.typePayment',
  PAYMENT_MADE:          'accounting.journalEntries.typePayment',
  EXPENSE_PAID:          'accounting.journalEntries.typeExpense',
  EXPENSE_SUBMITTED:     'accounting.journalEntries.typeExpense',
  EXPENSE_REIMBURSEMENT: 'accounting.journalEntries.typeReimbursement',
};

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumDebit  = (e: JournalEntry) => e.lineItems?.reduce((a, l) => a + toNumber(l.debitAmount), 0) ?? 0;
const sumCredit = (e: JournalEntry) => e.lineItems?.reduce((a, l) => a + toNumber(l.creditAmount), 0) ?? 0;

const isThisMonth = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function JournalEntriesPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // A `?type=` query param (e.g. the sidebar "Laporan Pembelian" → ?type=PURCHASE)
  // pre-filters the list to that transaction type. Changing query string does NOT
  // remount this page, so we sync the filter to the param via an effect below.
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type');
  // A `?search=` param (e.g. a Purchase Report row → its PUR-… transactionId)
  // pre-fills the search box, surfacing every related journal at once.
  const urlSearch = searchParams.get('search');

  const [searchText, setSearchText] = useState(urlSearch ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter]     = useState<string>(urlType ? urlType.toUpperCase() : 'all');
  const [startDate, setStartDate]       = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]           = useState<Date | undefined>(undefined);

  // Follow the URL: ?type=PURCHASE → Pembelian filter; no param → All.
  useEffect(() => {
    setTypeFilter(urlType ? urlType.toUpperCase() : 'all');
  }, [urlType]);
  useEffect(() => {
    if (urlSearch !== null) setSearchText(urlSearch);
  }, [urlSearch]);

  // "New Journal" / "+Pembelian" carries the active type so the create form
  // opens preset to it (e.g. on the Purchases view → New Journal = Pembelian).
  const createHref =
    typeFilter !== 'all'
      ? `/accounting/journal-entries/create?type=${typeFilter}`
      : '/accounting/journal-entries/create';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['journal-entries', searchText, statusFilter, typeFilter, startDate, endDate],
    queryFn:  () => getJournalEntries({
      page: 1,
      limit: 200,
      search: searchText || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      transactionType: typeFilter !== 'all' ? typeFilter : undefined,
      startDate: (startDate ? toLocalISODate(startDate) : undefined),
      endDate: (endDate ? toLocalISODate(endDate) : undefined),
      sortBy: 'entryDate',
      sortOrder: 'desc',
    }),
  });

  const entries = data?.data ?? [];

  /* ----- mutations ----- */
  const reverseMutation = useMutation({
    mutationFn: reverseJournalEntry,
    onSuccess: (reversing) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(t('accounting.journalEntries.reverseSuccess', { number: reversing.entryNumber }));
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntries.reverseFail')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(t('accounting.journalEntries.deleteSuccess'));
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntries.deleteFail')),
  });

  /* ----- derived KPIs — counts and money this month ----- */
  const stats = useMemo(() => {
    const totalDebit  = entries.reduce((a, e) => a + sumDebit(e), 0);
    const draftCount  = entries.filter((e) => e.status === 'DRAFT').length;
    const postedMonth = entries.filter((e) => e.status === 'POSTED' && isThisMonth(e.postingDate || e.entryDate)).length;
    return {
      totalEntries: entries.length,
      totalDebit,
      draftCount,
      postedMonth,
    };
  }, [entries]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all' || typeFilter !== 'all' || !!startDate || !!endDate;
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setTypeFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleExportPDF = async () => {
    try {
      await exportJournalEntriesPDF({
        search: searchText || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        transactionType: typeFilter !== 'all' ? typeFilter : undefined,
        startDate: startDate ? toLocalISODate(startDate) : undefined,
        endDate: endDate ? toLocalISODate(endDate) : undefined,
      });
      toast.success(t('accounting.journalEntries.exportPdfSuccess', 'PDF exported successfully.'));
    } catch {
      toast.error(t('accounting.journalEntries.exportPdfFail', 'Failed to export PDF.'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportJournalEntriesExcel({
        search: searchText || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        transactionType: typeFilter !== 'all' ? typeFilter : undefined,
        startDate: startDate ? toLocalISODate(startDate) : undefined,
        endDate: endDate ? toLocalISODate(endDate) : undefined,
      });
      toast.success(t('accounting.journalEntries.exportExcelSuccess', 'Excel exported successfully.'));
    } catch {
      toast.error(t('accounting.journalEntries.exportExcelFail', 'Failed to export Excel.'));
    }
  };

  const handleDelete = (e: JournalEntry) => {
    if (confirm(t('accounting.journalEntries.deleteConfirm', { number: e.entryNumber }))) {
      deleteMutation.mutate(e.id);
    }
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
        topbar={{}}
      >
        <PageContainer>
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={t('accounting.journalEntries.errorTitle')}
            description={error instanceof Error ? error.message : t('accounting.journalEntries.errorGeneric')}
            action={<Button onClick={() => refetch()}>{t('accounting.journalEntries.retry')}</Button>}
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
          title={t('accounting.journalEntries.title')}
          description={t('accounting.journalEntries.description')}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/accounting/journal-entries/create?type=adjusting')}
              >
                <Wand2 className="h-4 w-4" />
                {t('accounting.journalEntries.newAdjusting', 'Adjusting')}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(createHref)}
              >
                <Plus className="h-4 w-4" />
                {typeFilter === 'PURCHASE'
                  ? t('accounting.journalEntries.newPurchase', '+ Pembelian')
                  : t('accounting.journalEntries.newJournal', 'New Journal')}
              </Button>
            </div>
          }
        />

        {/* KPI band */}
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
                <StatCard label={t('accounting.journalEntries.statKpiEntries', 'Total Entries')}       value={stats.totalEntries}   sublabel={t('accounting.journalEntries.statKpiEntriesSub', 'in active filter')} />
                <StatCard label={t('accounting.journalEntries.statKpiDebit', 'Total Debit')}            value={<MoneyDisplay amount={stats.totalDebit} />} sublabel={t('accounting.journalEntries.statKpiDebitSub', 'accumulated visible')} />
                <StatCard label={t('accounting.journalEntries.statKpiDraft', 'Pending Drafts')}         value={stats.draftCount}     sublabel={t('accounting.journalEntries.statKpiDraftSub', 'awaiting posting')} />
                <StatCard label={t('accounting.journalEntries.statKpiPostedMonth', 'Posted This Month')} value={stats.postedMonth}   sublabel={t('accounting.journalEntries.statKpiPostedMonthSub', 'in current month')} />
              </>
            )}
          </div>
        </section>

        {/* Filter + table */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={t('accounting.journalEntries.searchPlaceholder', 'Search journal number, description, document...')}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <MonomiDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('accounting.journalEntries.fromDate', 'From date')}
                  className="bg-bg-sunken border-border-subtle"
                />
                <MonomiDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('accounting.journalEntries.toDate', 'To date')}
                  className="bg-bg-sunken border-border-subtle"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('accounting.journalEntries.allStatuses', 'All Statuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('accounting.journalEntries.statusDraft', 'Draft')}</SelectItem>
                    <SelectItem value="POSTED">{t('accounting.journalEntries.statusPosted', 'Posted')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]">
                    <SelectValue placeholder={t('accounting.journalEntries.allTypes', 'All Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('accounting.journalEntries.allTypes', 'All Types')}</SelectItem>
                    {Object.entries(TRANSACTION_TYPE_LABEL_KEYS).map(([v, key]) => (
                      <SelectItem key={v} value={v}>{t(key, v)}</SelectItem>
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
                    <X className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title={hasActiveFilters ? t('accounting.journalEntries.noMatch') : t('accounting.journalEntries.noJournals')}
              description={
                hasActiveFilters
                  ? t('accounting.journalEntries.noMatchDesc')
                  : t('accounting.journalEntries.noJournalsDesc')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.journalEntries.resetFilter', 'Reset')}</Button>
                ) : (
                  <Button size="sm" onClick={() => navigate(createHref)}>
                    <Plus className="h-4 w-4" /> {t('accounting.journalEntries.newJournal', 'New Journal')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <JournalTable
                rows={entries}
                onView={(e) => navigate(`/accounting/journal-entries/${e.id}/edit`)}
                onEdit={(e) => navigate(`/accounting/journal-entries/${e.id}/edit`)}
                onReverse={(e) => reverseMutation.mutate(e.id)}
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
/*  JournalTable — number, date, ref, description, balanced money,    */
/*  status, actions. Debit / Credit columns are aligned right and use */
/*  tabular-nums for ledger feel.                                     */
/* ------------------------------------------------------------------ */

interface JournalTableProps {
  rows: JournalEntry[];
  onView:    (e: JournalEntry) => void;
  onEdit:    (e: JournalEntry) => void;
  onReverse: (e: JournalEntry) => void;
  onDelete:  (e: JournalEntry) => void;
}

function JournalTable({ rows, onView, onEdit, onReverse, onDelete }: JournalTableProps) {
  const { t } = useTranslation();
  return (
    <DataTable<JournalEntry>
      data={rows}
      onRowClick={(row) => onView(row)}
      enablePagination
      columns={[
        {
          accessorKey: 'entryNumber',
          header: t('accounting.journalEntries.colNumber', 'Number'),
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.entryNumber || '—'}
            </span>
          ),
        },
        {
          accessorKey: 'entryDate',
          header: t('accounting.journalEntries.colDate', 'Date'),
          cell: ({ row }) => (
            <span className="text-text-tertiary text-xs">
              <DateDisplay date={row.original.entryDate} />
            </span>
          ),
        },
        {
          accessorKey: 'transactionType',
          header: t('accounting.journalEntries.colType', 'Type'),
          cell: ({ row }) => {
            const e = row.original;
            const key = ROW_TYPE_LABEL_KEYS[e.transactionType] ?? TRANSACTION_TYPE_LABEL_KEYS[e.transactionType];
            // Show the COA accounts touched: debit account(s) → credit account(s),
            // so the user can read the double-entry at a glance.
            const debitAccts = [
              ...new Set((e.lineItems ?? []).filter((l) => toNumber(l.debitAmount) > 0).map((l) => l.accountCode)),
            ];
            const creditAccts = [
              ...new Set((e.lineItems ?? []).filter((l) => toNumber(l.creditAmount) > 0).map((l) => l.accountCode)),
            ];
            return (
              <div className="min-w-0">
                <div className="text-xs text-text-secondary">{key ? t(key, e.transactionType) : e.transactionType}</div>
                {(debitAccts.length > 0 || creditAccts.length > 0) && (
                  <div className="mt-0.5 font-mono text-[10px] text-text-tertiary truncate">
                    {debitAccts.join(', ') || '—'} <span className="text-text-tertiary/60">→</span> {creditAccts.join(', ') || '—'}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: 'description',
          header: t('accounting.journalEntries.colDescription', 'Description'),
          accessorFn: (row) => row.descriptionId ?? row.description ?? '',
          cell: ({ row }) => {
            const e = row.original;
            return (
              <div className="min-w-0 max-w-[340px]">
                <div className="text-sm text-text-primary truncate">
                  {e.descriptionId || e.description || '—'}
                </div>
                {e.documentNumber && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {t('accounting.journalEntries.docPrefix', 'Doc.')} {e.documentNumber}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: 'debit',
          header: () => <span className="block text-right">{t('accounting.journalEntries.colDebit', 'Debit')}</span>,
          cell: ({ row }) => (
            <div className="text-right">
              <MoneyDisplay amount={sumDebit(row.original)} className="tabular-nums text-text-primary" />
            </div>
          ),
        },
        {
          id: 'credit',
          header: () => <span className="block text-right">{t('accounting.journalEntries.colCredit', 'Credit')}</span>,
          cell: ({ row }) => {
            const d = sumDebit(row.original);
            const c = sumCredit(row.original);
            const balanced = Math.abs(d - c) < 0.01;
            return (
              <div className="text-right">
                <MoneyDisplay
                  amount={c}
                  className={cn('tabular-nums', balanced ? 'text-text-secondary' : 'text-warning')}
                />
                {!balanced && (
                  <div className="text-[10px] uppercase tracking-[0.12em] text-warning">
                    Δ {formatIDR(Math.abs(d - c))}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: 'status',
          header: t('accounting.journalEntries.colStatus', 'Status'),
          cell: ({ row }) => {
            const statusKey = STATUS_LABEL_KEYS[row.original.status];
            return (
              <Badge
                variant="outline"
                className={cn(
                  'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                  statusChipClass(row.original.status),
                )}
              >
                {statusKey ? t(statusKey, row.original.status) : row.original.status}
              </Badge>
            );
          },
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">{t('accounting.journalEntries.actionsAriaLabel', 'Actions')}</span>,
          cell: ({ row }) => {
            const e = row.original;
            const isDraft = e.status === 'DRAFT';
            const isPosted = e.status === 'POSTED';
            return (
              <div className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label={t('accounting.journalEntries.actionMenuAriaLabel', 'Journal actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onView(e)}>
                      <Eye className="h-3.5 w-3.5" /> {t('accounting.journalEntries.actionView', 'View')}
                    </DropdownMenuItem>
                    {isDraft && (
                      <DropdownMenuItem onClick={() => onEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" /> {t('accounting.journalEntries.actionEdit', 'Edit')}
                      </DropdownMenuItem>
                    )}
                    {/* Posting is automatic (expenses post on input); manual Post
                        removed. Adjustments are made via Reverse. */}
                    {isPosted && (
                      <DropdownMenuItem onClick={() => onReverse(e)}>
                        <RotateCcw className="h-3.5 w-3.5" /> {t('accounting.journalEntries.actionReverse', 'Reverse (adjust)')}
                      </DropdownMenuItem>
                    )}
                    {isDraft && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(e)}
                          className="text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t('accounting.journalEntries.actionDelete', 'Delete')}
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
