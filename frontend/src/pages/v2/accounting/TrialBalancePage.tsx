import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useDateLocale } from '@/lib/dateLocale';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Scale, BookOpen, TrendingUp, Activity,
  Download, RefreshCw, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import {
  getTrialBalance,
  exportTrialBalancePDF,
  exportTrialBalanceExcel,
  type TrialBalance,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Kewajiban',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  EXPENSE: 'Beban',
};

const typeLabel = (key: string) => TYPE_LABEL[key] ?? key;

const typeChipClass = (type: string) => {
  switch (type) {
    case 'ASSET':     return 'bg-info/10 text-info';
    case 'LIABILITY': return 'bg-warning/10 text-warning';
    case 'EQUITY':    return 'bg-success/10 text-success';
    case 'REVENUE':   return 'bg-success/10 text-success';
    case 'EXPENSE':   return 'bg-danger/10 text-danger';
    default:          return 'bg-bg-sunken text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TrialBalancePageV2() {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const user = useAuthStore((state) => state.user);
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(today));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch, isFetching } = useQuery<TrialBalance>({
    queryKey: ['v2', 'trial-balance', endStr],
    queryFn: () =>
      getTrialBalance({
        endDate: endStr,
        includeInactive: false,
        includeZeroBalances: false,
      }),
  });

  const handleExportPDF = async () => {
    try {
      await exportTrialBalancePDF({
        endDate: endStr,
        includeInactive: false,
        includeZeroBalances: false,
      });
      toast.success(t('accounting.trialBalance.exportPdfSuccess'));
    } catch {
      toast.error(t('accounting.trialBalance.exportPdfFail'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportTrialBalanceExcel({
        endDate: endStr,
        includeInactive: false,
        includeZeroBalances: false,
      });
      toast.success(t('accounting.trialBalance.exportCsvSuccess'));
    } catch {
      toast.error(t('accounting.trialBalance.exportCsvFail'));
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.balances.filter((b) => {
      const matchSearch = !q
        || b.accountCode.toLowerCase().includes(q)
        || b.accountNameId?.toLowerCase().includes(q)
        || b.accountName?.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || b.accountType === typeFilter;
      return matchSearch && matchType;
    });
  }, [data, search, typeFilter]);

  // Recalculate totals from the *filtered* view so the totals row matches
  // what the reader actually sees. The summary balance check uses the
  // unfiltered totals (the report-level integrity signal).
  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => ({
        debit: acc.debit + (b.debitBalance || 0),
        credit: acc.credit + (b.creditBalance || 0),
      }),
      { debit: 0, credit: 0 },
    );
  }, [filtered]);

  const hasActiveFilters = !!search || typeFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
  };

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
          title={t('accounting.trialBalance.title')}
          description={t('accounting.trialBalance.description')}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-text-tertiary hover:text-text-primary"
              >
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                {t('accounting.trialBalance.reload', 'Reload')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    {t('accounting.trialBalance.export', 'Export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>CSV / Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {/* Sticky period bar */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 md:-mx-8 mb-8 px-4 sm:px-6 md:px-8 py-3 bg-bg-base/85 backdrop-blur-[24px] border-b border-border-subtle">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-text-tertiary uppercase tracking-[0.16em]">
              <span>{t('accounting.trialBalance.period', 'Period')}</span>
              <span className="text-text-primary normal-case tracking-normal font-display text-sm">
                {format(startDate, 'd MMM yyyy', { locale: idLocale })} – {format(endDate, 'd MMM yyyy', { locale: idLocale })}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={(d) => d && setStartDate(d)}
                  placeholder={t('accounting.trialBalance.startDate', 'Start date')}
                />
              </div>
              <span className="text-text-tertiary text-xs">→</span>
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={(d) => d && setEndDate(d)}
                  placeholder={t('accounting.trialBalance.endDate', 'End date')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Integrity banner — the trial balance's job is to *verify* the
            books balance, so this is the single most important signal. */}
        {data && !data.summary.isBalanced && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-text-primary">{t('accounting.trialBalance.imbalanceTitle', 'Trial balance is not balanced')}</div>
              <div className="mt-0.5 text-text-secondary">
                {t('accounting.trialBalance.imbalanceDesc', {
                  amount: Math.abs(data.summary.difference).toLocaleString('id-ID'),
                })}
              </div>
            </div>
          </div>
        )}

        {data && data.summary.isBalanced && (
          <div className="mb-6 flex items-center gap-3 text-xs text-text-tertiary">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>
              {t('accounting.trialBalance.balancedMsg', 'General ledger is balanced')} —{' '}
              <MoneyDisplay amount={data.summary.totalDebit} className="text-text-secondary" />
              {' debit = '}
              <MoneyDisplay amount={data.summary.totalCredit} className="text-text-secondary" />
              {' credit'}
            </span>
          </div>
        )}

        {error ? (
          <EmptyState
            icon={<BookOpen />}
            title={t('accounting.trialBalance.errorTitle')}
            description={error instanceof Error ? error.message : t('accounting.trialBalance.errorGeneric')}
            action={<Button onClick={() => refetch()} size="sm">{t('accounting.trialBalance.retry')}</Button>}
          />
        ) : isLoading || !data ? (
          <Skeleton className="h-[600px] rounded-lg" />
        ) : (
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            {/* Filter strip */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('accounting.trialBalance.searchPlaceholder', 'Search by account code or name...')}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger
                    size="sm"
                    className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                  >
                    <SelectValue placeholder={t('accounting.trialBalance.allTypes', 'All Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('accounting.trialBalance.allTypes', 'All Types')}</SelectItem>
                    <SelectItem value="ASSET">{t('accounting.accountTypes.ASSET', 'Asset')}</SelectItem>
                    <SelectItem value="LIABILITY">{t('accounting.accountTypes.LIABILITY', 'Liability')}</SelectItem>
                    <SelectItem value="EQUITY">{t('accounting.accountTypes.EQUITY', 'Equity')}</SelectItem>
                    <SelectItem value="REVENUE">{t('accounting.accountTypes.REVENUE', 'Revenue')}</SelectItem>
                    <SelectItem value="EXPENSE">{t('accounting.accountTypes.EXPENSE', 'Expense')}</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    {t('accounting.trialBalance.resetFilter', 'Reset')}
                  </Button>
                )}
              </div>
            </div>

            {/* Table — Akun (with type chip) | Debit | Kredit. Direct
                hand-rolled table so we can drop the editorial totals row
                with double-rule emphasis below the body. */}
            {filtered.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  title={hasActiveFilters ? t('accounting.trialBalance.noAccounts') : t('accounting.trialBalance.noBalances')}
                  description={
                    hasActiveFilters
                      ? t('accounting.trialBalance.noAccountsDesc')
                      : t('accounting.trialBalance.noBalancesDesc')
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        {t('accounting.trialBalance.resetFilter', 'Reset')}
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-max w-full font-body text-sm">
                <colgroup>
                  <col className="w-[110px]" />
                  <col />
                  <col className="w-[130px]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="border-b border-border-subtle bg-bg-sunken">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
                      {t('accounting.trialBalance.colCode', 'Code')}
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
                      {t('accounting.trialBalance.colAccount', 'Account')}
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
                      {t('accounting.trialBalance.colType', 'Type')}
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
                      {t('accounting.trialBalance.colDebit', 'Debit')}
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
                      {t('accounting.trialBalance.colCredit', 'Credit')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr
                      key={b.accountCode}
                      className={cn(
                        'border-b border-border-subtle/60 last:border-0',
                        'hover:bg-accent-navy-soft transition-colors',
                        b.isAbnormal && 'bg-warning/[0.03]',
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-text-primary tracking-tight">
                          {b.accountCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-sm text-text-primary truncate">
                            {b.accountNameId || b.accountName}
                          </div>
                          {b.accountName && b.accountName !== b.accountNameId && (
                            <div className="text-xs text-text-tertiary truncate mt-0.5">
                              {b.accountName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                            typeChipClass(b.accountType),
                          )}
                        >
                          {t(`accounting.accountTypes.${b.accountType}`, typeLabel(b.accountType))}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.debitBalance > 0 ? (
                          <MoneyDisplay
                            amount={b.debitBalance}
                            className={cn(
                              'text-sm tabular-nums',
                              b.isAbnormal ? 'text-warning' : 'text-text-primary',
                            )}
                          />
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.creditBalance > 0 ? (
                          <MoneyDisplay
                            amount={b.creditBalance}
                            className={cn(
                              'text-sm tabular-nums',
                              b.isAbnormal ? 'text-warning' : 'text-text-primary',
                            )}
                          />
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {/* Totals row — double rule, the universal "this is the
                      end of the report" accounting signal. Also doubles
                      as the integrity check (debit should = credit). */}
                  <tr className="border-t-2 border-border-strong">
                    <td colSpan={3} className="px-4 py-4">
                      <span className="text-xs font-display font-semibold text-text-primary uppercase tracking-wider">
                        {t('accounting.trialBalance.total', 'Total')}
                      </span>
                      {hasActiveFilters && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-text-tertiary">
                          ({t('accounting.trialBalance.filtered', 'filtered')})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right border-b-2 border-border-strong">
                      <MoneyDisplay
                        amount={filteredTotals.debit}
                        className="text-base font-display font-bold text-text-primary"
                      />
                    </td>
                    <td className="px-4 py-4 text-right border-b-2 border-border-strong">
                      <MoneyDisplay
                        amount={filteredTotals.credit}
                        className="text-base font-display font-bold text-text-primary"
                      />
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            )}
          </GlassPanel>
        )}
      </PageContainer>
    </AppShell>
  );
}
