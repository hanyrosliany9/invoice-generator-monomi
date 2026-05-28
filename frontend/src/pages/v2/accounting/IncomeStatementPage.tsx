import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useDateLocale } from '@/lib/dateLocale';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Scale, BookOpen, TrendingUp, Activity,
  Download, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import {
  getIncomeStatement,
  exportIncomeStatementPDF,
  exportIncomeStatementExcel,
  type IncomeStatement,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Expense sub-type grouping. Editorial intent: split expenses into  */
/*  COGS (above gross profit) and OpEx (between gross + operating     */
/*  profit). Backend's accountSubType is the source of truth.         */
/* ------------------------------------------------------------------ */

const COGS_SUBTYPES = new Set([
  'COST_OF_GOODS_SOLD',
  'COST_OF_SALES',
  'COST_OF_REVENUE',
  'DIRECT_COST',
]);

const SUBTYPE_LABEL_FALLBACK: Record<string, string> = {
  COST_OF_GOODS_SOLD: 'Cost of Goods Sold',
  COST_OF_SALES: 'Cost of Sales',
  COST_OF_REVENUE: 'Cost of Revenue',
  DIRECT_COST: 'Direct Cost',
  OPERATING_EXPENSE: 'Operating Expense',
  SELLING_EXPENSE: 'Selling Expense',
  ADMINISTRATIVE_EXPENSE: 'Administrative & General Expense',
  GENERAL_EXPENSE: 'General Expense',
  OTHER_EXPENSE: 'Other Expense',
  DEPRECIATION_EXPENSE: 'Depreciation Expense',
  INTEREST_EXPENSE: 'Interest Expense',
  TAX_EXPENSE: 'Tax Expense',
  OPERATING_REVENUE: 'Operating Revenue',
  SALES_REVENUE: 'Sales Revenue',
  SERVICE_REVENUE: 'Service Revenue',
  OTHER_REVENUE: 'Other Revenue',
};

const subtypeLabel = (key: string, tFn: (k: string, fb: string) => string) =>
  tFn(`incomeStatement.subtype.${key}`, SUBTYPE_LABEL_FALLBACK[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));

/* ------------------------------------------------------------------ */
/*  Row primitives — same conventions as BalanceSheet, but tuned for  */
/*  a waterfall (single column of numbers, no opposing column).        */
/* ------------------------------------------------------------------ */

interface LineRowProps {
  label: string;
  amount: number;
  indent?: number;
  code?: string;
  negative?: boolean; // render with leading "(" wrap, like a subtraction
  muted?: boolean;
}

const LineRow = ({ label, amount, indent = 1, code, negative, muted }: LineRowProps) => {
  const padClass = indent === 0 ? 'pl-0' : indent === 1 ? 'pl-4' : indent === 2 ? 'pl-8' : 'pl-12';
  return (
    <tr className="border-b border-border-subtle/40 last:border-0 hover:bg-accent-navy-soft transition-colors">
      <td className={cn('py-2.5', padClass)}>
        <div className="flex items-baseline gap-3">
          {code && (
            <span className="font-mono text-[11px] text-text-tertiary tracking-tight w-14 shrink-0">
              {code}
            </span>
          )}
          <span className={cn('text-sm', muted ? 'text-text-tertiary' : 'text-text-secondary')}>
            {label}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right">
        {negative ? (
          // Parentheses notation for subtractions — accounting convention
          <span className="font-mono tabular-nums text-sm text-text-secondary">
            ({Math.round(Math.abs(amount)).toLocaleString('id-ID')})
          </span>
        ) : (
          <MoneyDisplay
            amount={amount}
            className={cn(
              'text-sm',
              amount < 0 ? 'text-danger' : 'text-text-secondary',
            )}
          />
        )}
      </td>
    </tr>
  );
};

interface SubtotalRowProps {
  label: string;
  amount: number;
  emphasis?: 'normal' | 'strong';
}

const SubtotalRow = ({ label, amount, emphasis = 'normal' }: SubtotalRowProps) => (
  <tr className={cn(emphasis === 'strong' ? 'border-t-2 border-border-strong' : 'border-t border-border-default')}>
    <td className={cn(
      'pl-4 uppercase tracking-wider text-text-primary',
      emphasis === 'strong' ? 'py-4 text-xs font-display font-semibold' : 'py-3 text-[11px] font-medium',
    )}>
      {label}
    </td>
    <td className="pr-4 text-right">
      <MoneyDisplay
        amount={amount}
        className={cn(
          'tabular-nums',
          emphasis === 'strong' ? 'text-base font-display font-bold text-text-primary' : 'text-sm font-semibold text-text-primary',
          amount < 0 && 'text-danger',
        )}
      />
    </td>
  </tr>
);

const SectionHeaderRow = ({ label }: { label: string }) => (
  <tr>
    <td colSpan={2} className="pt-6 pb-2 pl-1 text-[10px] uppercase tracking-[0.18em] text-text-tertiary font-medium">
      {label}
    </td>
  </tr>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IncomeStatementPageV2() {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const user = useAuthStore((state) => state.user);
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(today));

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch, isFetching } = useQuery<IncomeStatement>({
    queryKey: ['v2', 'income-statement', startStr, endStr],
    queryFn: () => getIncomeStatement({ startDate: startStr, endDate: endStr }),
  });

  const handleExportPDF = async () => {
    try {
      await exportIncomeStatementPDF({ startDate: startStr, endDate: endStr });
      toast.success(t('incomeStatement.exportPdfSuccess', 'Income statement exported (PDF).'));
    } catch {
      toast.error(t('incomeStatement.exportPdfFail', 'Failed to export PDF.'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportIncomeStatementExcel({ startDate: startStr, endDate: endStr });
      toast.success(t('incomeStatement.exportCsvSuccess', 'Income statement exported (CSV).'));
    } catch {
      toast.error(t('incomeStatement.exportCsvFail', 'Failed to export CSV.'));
    }
  };

  /* ----- derived waterfall structure -----
     Backend gives us a flat revenue list and a flat+grouped expense list.
     We re-split expenses into COGS vs OpEx so the report reads as a
     proper multi-step income statement (rather than the classic
     "Revenue minus all-expenses-in-one-pile" approach).               */
  const waterfall = useMemo(() => {
    if (!data) return null;

    const totalRevenue = data.summary.totalRevenue;
    const allExpenses = data.expenses.accounts as Array<{
      accountCode: string;
      accountName: string;
      accountNameId: string;
      accountSubType: string;
      balance: number;
    }>;

    const cogs = allExpenses.filter((e) => COGS_SUBTYPES.has(e.accountSubType));
    const opex = allExpenses.filter((e) => !COGS_SUBTYPES.has(e.accountSubType));

    const totalCogs = cogs.reduce((s, r) => s + (r.balance || 0), 0);
    const totalOpex = opex.reduce((s, r) => s + (r.balance || 0), 0);
    const grossProfit = totalRevenue - totalCogs;
    const operatingIncome = grossProfit - totalOpex;
    // We don't have an explicit "other income / interest / tax" split
    // from the API, so net income = operating income here. The summary
    // figure is the authoritative one.
    const netIncome = data.summary.netIncome;

    // Group OpEx by sub-type for readable sub-headings.
    const opexBySubtype = opex.reduce<Record<string, typeof opex>>((acc, row) => {
      const k = row.accountSubType || 'OPERATING_EXPENSE';
      (acc[k] = acc[k] || []).push(row);
      return acc;
    }, {});

    // Group revenue by sub-type too — most COA designs only have one or
    // two, but the loop handles N gracefully.
    const revenueAccounts = data.revenue.accounts as Array<{
      accountCode: string;
      accountName: string;
      accountNameId: string;
      accountSubType: string;
      balance: number;
    }>;
    const revBySubtype = revenueAccounts.reduce<Record<string, typeof revenueAccounts>>((acc, row) => {
      const k = row.accountSubType || 'OPERATING_REVENUE';
      (acc[k] = acc[k] || []).push(row);
      return acc;
    }, {});

    return {
      revBySubtype,
      totalRevenue,
      cogs,
      totalCogs,
      grossProfit,
      opexBySubtype,
      totalOpex,
      operatingIncome,
      netIncome,
      profitMargin: data.summary.profitMargin,
    };
  }, [data]);

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
          title={t('incomeStatement.title', 'Laporan Laba Rugi')}
          description={t('incomeStatement.subtitle', 'Pendapatan dikurangi beban — periode berjalan, dari pendapatan kotor hingga laba bersih.')}
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
                {t('incomeStatement.reload', 'Reload')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    {t('incomeStatement.export', 'Export')}
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

        {/* Sticky period range bar */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-8 px-4 sm:px-6 lg:px-8 py-3 bg-bg-base/85 backdrop-blur-[24px] border-b border-border-subtle">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-text-tertiary uppercase tracking-[0.16em]">
              <span>{t('incomeStatement.period', 'Period')}</span>
              <span className="text-text-primary normal-case tracking-normal font-display text-sm">
                {format(startDate, 'd MMM yyyy', { locale: idLocale })} – {format(endDate, 'd MMM yyyy', { locale: idLocale })}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={(d) => d && setStartDate(d)}
                  placeholder={t('incomeStatement.startDate', 'Start date')}
                />
              </div>
              <span className="text-text-tertiary text-xs">→</span>
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={(d) => d && setEndDate(d)}
                  placeholder={t('incomeStatement.endDate', 'End date')}
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <EmptyState
            icon={<TrendingUp />}
            title={t('incomeStatement.error.title', 'Tidak bisa memuat laporan')}
            description={error instanceof Error ? error.message : t('common.errorGeneric', 'Terjadi kesalahan.')}
            action={<Button onClick={() => refetch()} size="sm">{t('incomeStatement.retry', 'Try Again')}</Button>}
          />
        ) : isLoading || !data || !waterfall ? (
          <Skeleton className="h-[640px] rounded-lg" />
        ) : (
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle bg-bg-sunken flex items-baseline justify-between">
              <h2 className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-[0.18em]">
                {t('incomeStatement.title', 'Income Statement')}
              </h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                Margin {waterfall.profitMargin.toFixed(1)}%
              </span>
            </div>

            <div className="overflow-x-auto px-2 pb-2">
              <table className="min-w-[500px] w-full font-body">
                <colgroup>
                  <col />
                  <col className="w-[38%]" />
                </colgroup>
                <tbody>
                  {/* ── PENDAPATAN ── */}
                  <SectionHeaderRow label={t('incomeStatement.sectionRevenue', 'Revenue')} />
                  {Object.entries(waterfall.revBySubtype).flatMap(([sub, rows]) => [
                    ...rows.map((r) => (
                      <LineRow
                        key={r.accountCode}
                        label={r.accountNameId || r.accountName}
                        code={r.accountCode}
                        amount={r.balance}
                        indent={1}
                      />
                    )),
                  ])}
                  {waterfall.totalRevenue === 0 && Object.keys(waterfall.revBySubtype).length === 0 && (
                    <LineRow label={t('incomeStatement.noRevenue', 'No revenue in this period')} amount={0} muted indent={1} />
                  )}
                  <SubtotalRow label={t('incomeStatement.totalRevenue', 'Total Revenue')} amount={waterfall.totalRevenue} />

                  {/* ── HPP ── (only if there are COGS accounts) */}
                  {waterfall.cogs.length > 0 && (
                    <>
                      <SectionHeaderRow label={t('incomeStatement.sectionCOGS', 'Cost of Goods Sold')} />
                      {waterfall.cogs.map((r) => (
                        <LineRow
                          key={r.accountCode}
                          label={r.accountNameId || r.accountName}
                          code={r.accountCode}
                          amount={r.balance}
                          indent={1}
                          negative
                        />
                      ))}
                      <SubtotalRow label={t('incomeStatement.totalCOGS', 'Total COGS')} amount={-waterfall.totalCogs} />
                      <SubtotalRow label={t('incomeStatement.grossProfit', 'Gross Profit')} amount={waterfall.grossProfit} emphasis="normal" />
                    </>
                  )}

                  {/* ── BIAYA OPERASIONAL ── */}
                  {Object.keys(waterfall.opexBySubtype).length > 0 && (
                    <>
                      <SectionHeaderRow label={t('incomeStatement.sectionOpex', 'Operating Expenses')} />
                      {Object.entries(waterfall.opexBySubtype).map(([sub, rows]) => {
                        const subTotal = rows.reduce((s, r) => s + (r.balance || 0), 0);
                        return (
                          <>
                            <tr key={`${sub}-head`}>
                              <td colSpan={2} className="pt-3 pb-1 pl-4 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                                {subtypeLabel(sub, t)}
                              </td>
                            </tr>
                            {rows.map((r) => (
                              <LineRow
                                key={r.accountCode}
                                label={r.accountNameId || r.accountName}
                                code={r.accountCode}
                                amount={r.balance}
                                indent={2}
                                negative
                              />
                            ))}
                            <tr className="border-t border-border-subtle">
                              <td className="py-2 pl-4 text-[11px] text-text-secondary">
                                {t('incomeStatement.subtotal', 'Subtotal')} {subtypeLabel(sub, t)}
                              </td>
                              <td className="py-2 pr-4 text-right">
                                <span className="font-mono tabular-nums text-sm text-text-secondary">
                                  ({Math.round(subTotal).toLocaleString('id-ID')})
                                </span>
                              </td>
                            </tr>
                          </>
                        );
                      })}
                      <SubtotalRow label={t('incomeStatement.totalOpex', 'Total Operating Expenses')} amount={-waterfall.totalOpex} />
                      <SubtotalRow label={t('incomeStatement.operatingIncome', 'Operating Income')} amount={waterfall.operatingIncome} emphasis="normal" />
                    </>
                  )}

                  {/* ── LABA / RUGI BERSIH ── */}
                  <SubtotalRow
                    label={waterfall.netIncome >= 0 ? t('incomeStatement.netIncome', 'Net Income') : t('incomeStatement.netLoss', 'Net Loss')}
                    amount={waterfall.netIncome}
                    emphasis="strong"
                  />
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </PageContainer>
    </AppShell>
  );
}
