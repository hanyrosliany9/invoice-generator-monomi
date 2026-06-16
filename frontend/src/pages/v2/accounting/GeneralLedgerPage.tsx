import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Download, Search, X, Calendar,
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
import { DataTable } from '@/components/monomi/DataTable';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import {
  exportGeneralLedgerExcel, exportGeneralLedgerPDF,
  getChartOfAccounts, getGeneralLedger,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — same shape as other v2 pages so navigation reads as one */
/*  app. We splice an Accounting item in; the active state simply     */
/*  matches the /v2/accounting prefix.                                 */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const endOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};
const toIsoDate = (d: Date) => toLocalISODate(d);

/* Parse a yyyy-mm-dd query param into a Date, falling back when absent/invalid. */
const parseDateParam = (v: string | null, fallback: () => Date): Date => {
  if (!v) return fallback();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback() : d;
};

interface LedgerEntry {
  id: string;
  journalEntryId?: string;
  entryDate: string;
  accountCode: string;
  accountName: string;
  accountNameId: string;
  debit: number;
  credit: number;
  runningBalance: number;
  journalEntry?: {
    id?: string;
    entryNumber: string;
    description?: string;
    descriptionId?: string;
  };
}

export default function GeneralLedgerPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  /* Honour deep-link query params on first load (e.g. from Cash & Bank
   * Balance or Chart of Accounts): ?accountCode=&accountType=&startDate=&endDate=.
   * Only the initial state is seeded — afterwards filters are user-controlled. */
  const [searchParams] = useSearchParams();
  const [startDate, setStartDate] = useState<Date>(() => parseDateParam(searchParams.get('startDate'), startOfMonth));
  const [endDate, setEndDate]     = useState<Date>(() => parseDateParam(searchParams.get('endDate'), endOfMonth));
  const [accountCode, setAccountCode] = useState<string>(() => searchParams.get('accountCode') ?? 'all');
  const [accountType, setAccountType] = useState<string>(() => searchParams.get('accountType') ?? 'all');
  const [searchText, setSearchText]   = useState('');

  /* ----- data ----- */
  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['general-ledger', toIsoDate(startDate), toIsoDate(endDate), accountCode, accountType],
    queryFn:  () => getGeneralLedger({
      startDate:  toIsoDate(startDate),
      endDate:    toIsoDate(endDate),
      accountCode: accountCode !== 'all' ? accountCode : undefined,
      accountType: accountType !== 'all' ? accountType : undefined,
      includeInactive: false,
    }),
    enabled: !!startDate && !!endDate,
  });

  const entries: LedgerEntry[] = data?.entries ?? [];
  const summary = data?.summary ?? { totalEntries: 0, totalDebit: 0, totalCredit: 0 };

  /* ----- client-side search filter (server already narrows by account) ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      e.accountCode?.toLowerCase().includes(q)
      || e.accountNameId?.toLowerCase().includes(q)
      || e.accountName?.toLowerCase().includes(q)
      || e.journalEntry?.entryNumber?.toLowerCase().includes(q)
      || e.journalEntry?.descriptionId?.toLowerCase().includes(q),
    );
  }, [entries, searchText]);

  const hasActiveFilters = !!searchText || accountCode !== 'all' || accountType !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setAccountCode('all');
    setAccountType('all');
  };

  /* ----- export handlers ----- */
  const handleExport = async (kind: 'pdf' | 'excel') => {
    const params = {
      startDate:  toIsoDate(startDate),
      endDate:    toIsoDate(endDate),
      accountCode: accountCode !== 'all' ? accountCode : undefined,
      accountType: accountType !== 'all' ? accountType : undefined,
      includeInactive: false,
    };
    try {
      if (kind === 'pdf') await exportGeneralLedgerPDF(params);
      else await exportGeneralLedgerExcel(params);
      toast.success(t('accounting.generalLedger.exportStarted', { type: kind.toUpperCase() }));
    } catch (err) {
      toast.error(t('accounting.generalLedger.exportFail', { message: (err as Error).message }));
    }
  };

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
          title={t('accounting.generalLedger.title')}
          description={t('accounting.generalLedger.description')}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  {t('accounting.generalLedger.export', 'Export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* KPI band */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  label={t('accounting.generalLedger.statKpiEntries', 'Total Entries')}
                  value={summary.totalEntries.toLocaleString('id-ID')}
                  sublabel={t('accounting.generalLedger.statKpiEntriesSub', 'in selected period')}
                />
                <StatCard
                  label={t('accounting.generalLedger.statKpiDebit', 'Total Debit')}
                  value={<MoneyDisplay amount={toNumber(summary.totalDebit)} />}
                  sublabel={t('accounting.generalLedger.statKpiDebitSub', 'accumulated across all accounts')}
                />
                <StatCard
                  label={t('accounting.generalLedger.statKpiCredit', 'Total Credit')}
                  value={<MoneyDisplay amount={toNumber(summary.totalCredit)} />}
                  sublabel={t('accounting.generalLedger.statKpiCreditSub', 'accumulated across all accounts')}
                />
              </>
            )}
          </div>
        </section>

        {/* Filter + table on a single GlassPanel surface — the filter strip
            and the table form a unified workspace. */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Filter strip — period is load-bearing so it sits on the left,
              while account-narrowing controls cluster on the right. */}
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                <MonomiDatePicker
                  value={startDate}
                  onChange={(d) => d && setStartDate(d)}
                  className="bg-bg-sunken border-border-subtle"
                />
                <span className="text-text-tertiary text-xs">—</span>
                <MonomiDatePicker
                  value={endDate}
                  onChange={(d) => d && setEndDate(d)}
                  className="bg-bg-sunken border-border-subtle"
                />
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={accountCode}
                  onValueChange={(v) => {
                    setAccountCode(v);
                    if (v !== 'all') setAccountType('all');
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[200px] max-w-[260px]"
                  >
                    <SelectValue placeholder={t('accounting.generalLedger.allAccounts', 'All Accounts')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">{t('accounting.generalLedger.allAccounts', 'All Accounts')}</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        <span className="font-mono text-xs text-text-tertiary mr-2">{a.code}</span>
                        {a.nameId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={accountType}
                  onValueChange={(v) => {
                    setAccountType(v);
                    if (v !== 'all') setAccountCode('all');
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                  >
                    <SelectValue placeholder={t('accounting.generalLedger.allTypes', 'All Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('accounting.generalLedger.allTypes', 'All Types')}</SelectItem>
                    <SelectItem value="ASSET">{t('accounting.accountTypes.ASSET', 'Asset')}</SelectItem>
                    <SelectItem value="LIABILITY">{t('accounting.accountTypes.LIABILITY', 'Liability')}</SelectItem>
                    <SelectItem value="EQUITY">{t('accounting.accountTypes.EQUITY', 'Equity')}</SelectItem>
                    <SelectItem value="REVENUE">{t('accounting.accountTypes.REVENUE', 'Revenue')}</SelectItem>
                    <SelectItem value="EXPENSE">{t('accounting.accountTypes.EXPENSE', 'Expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={t('accounting.generalLedger.searchPlaceholder', 'Search account code, journal number, description...')}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>
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

          {/* Table */}
          {error ? (
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title={t('accounting.generalLedger.errorTitle')}
              description={error instanceof Error ? error.message : t('accounting.generalLedger.errorGeneric')}
              action={<Button onClick={() => refetch()}>{t('accounting.generalLedger.retry')}</Button>}
            />
          ) : isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title={hasActiveFilters ? t('accounting.generalLedger.noMatch') : t('accounting.generalLedger.noEntries')}
              description={
                hasActiveFilters
                  ? t('accounting.generalLedger.noMatchDesc')
                  : t('accounting.generalLedger.noEntriesDesc')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.generalLedger.resetFilter', 'Reset Filter')}</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <LedgerTable rows={filtered} onRowClick={(row) => {
                const jeId = row.journalEntryId ?? row.journalEntry?.id;
                if (jeId) {
                  navigate(`/accounting/journal-entries/${jeId}/edit`);
                }
              }} />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  LedgerTable — narrow columns left, money right. Running balance   */
/*  is the editorial anchor: tabular-nums + bold so the eye lands.    */
/* ------------------------------------------------------------------ */

function LedgerTable({ rows, onRowClick }: { rows: LedgerEntry[]; onRowClick?: (row: LedgerEntry) => void }) {
  const { t } = useTranslation();
  return (
    <DataTable<LedgerEntry>
      data={rows}
      enablePagination
      onRowClick={onRowClick}
      columns={[
        {
          accessorKey: 'entryDate',
          header: t('accounting.generalLedger.colDate', 'Date'),
          cell: ({ row }) => (
            <span className="text-text-tertiary text-xs">
              <DateDisplay date={row.original.entryDate} />
            </span>
          ),
        },
        {
          id: 'journal',
          header: t('accounting.generalLedger.colJournal', 'Journal'),
          accessorFn: (row) => row.journalEntry?.entryNumber ?? '',
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.journalEntry?.entryNumber || '—'}
            </span>
          ),
        },
        {
          id: 'account',
          header: t('accounting.generalLedger.colAccount', 'Account'),
          accessorFn: (row) => `${row.accountCode} ${row.accountNameId}`,
          cell: ({ row }) => {
            const r = row.original;
            return (
              <div className="min-w-0 max-w-[280px]">
                <div className="text-sm text-text-primary truncate">
                  <span className="font-mono text-xs text-text-tertiary mr-2">{r.accountCode}</span>
                  {r.accountNameId}
                </div>
                {r.accountName && r.accountName !== r.accountNameId && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">{r.accountName}</div>
                )}
              </div>
            );
          },
        },
        {
          id: 'description',
          header: t('accounting.generalLedger.colDescription', 'Description'),
          accessorFn: (row) => row.journalEntry?.descriptionId ?? '',
          cell: ({ row }) => (
            <div className="min-w-0 max-w-[280px] text-sm text-text-secondary truncate">
              {row.original.journalEntry?.descriptionId
                || row.original.journalEntry?.description
                || '—'}
            </div>
          ),
        },
        {
          accessorKey: 'debit',
          header: () => <span className="block text-right">{t('accounting.generalLedger.colDebit', 'Debit')}</span>,
          cell: ({ row }) => {
            const v = toNumber(row.original.debit);
            return (
              <div className="text-right">
                {v > 0
                  ? <MoneyDisplay amount={v} className="text-text-primary tabular-nums" />
                  : <span className="text-text-disabled">—</span>}
              </div>
            );
          },
        },
        {
          accessorKey: 'credit',
          header: () => <span className="block text-right">{t('accounting.generalLedger.colCredit', 'Credit')}</span>,
          cell: ({ row }) => {
            const v = toNumber(row.original.credit);
            return (
              <div className="text-right">
                {v > 0
                  ? <MoneyDisplay amount={v} className="text-text-primary tabular-nums" />
                  : <span className="text-text-disabled">—</span>}
              </div>
            );
          },
        },
        {
          accessorKey: 'runningBalance',
          header: () => <span className="block text-right">{t('accounting.generalLedger.colBalance', 'Balance')}</span>,
          cell: ({ row }) => {
            const v = toNumber(row.original.runningBalance);
            return (
              <div className="text-right">
                <MoneyDisplay
                  amount={Math.abs(v)}
                  className={cn(
                    'font-medium tabular-nums',
                    v < 0 ? 'text-danger' : 'text-text-primary',
                  )}
                />
              </div>
            );
          },
        },
      ]}
    />
  );
}
