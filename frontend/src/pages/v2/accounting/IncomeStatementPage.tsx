import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Scale, BookOpen, TrendingUp, Activity,
  Download, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
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

const sidebarItems = [
  { label: 'Dashboard',    icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',     icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations',   icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',      icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',     icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',     icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Neraca',       icon: <Scale       className="h-4 w-4" />, href: '/v2/accounting/balance-sheet' },
  { label: 'Laba Rugi',    icon: <TrendingUp  className="h-4 w-4" />, href: '/v2/accounting/income-statement' },
  { label: 'Arus Kas',     icon: <Activity    className="h-4 w-4" />, href: '/v2/accounting/cash-flow' },
  { label: 'Neraca Saldo', icon: <BookOpen    className="h-4 w-4" />, href: '/v2/accounting/trial-balance' },
  { label: 'Settings',     icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

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

const SUBTYPE_LABEL_ID: Record<string, string> = {
  COST_OF_GOODS_SOLD: 'Harga Pokok Penjualan',
  COST_OF_SALES: 'Harga Pokok Penjualan',
  COST_OF_REVENUE: 'Harga Pokok Pendapatan',
  DIRECT_COST: 'Biaya Langsung',
  OPERATING_EXPENSE: 'Biaya Operasional',
  SELLING_EXPENSE: 'Biaya Penjualan',
  ADMINISTRATIVE_EXPENSE: 'Biaya Administrasi & Umum',
  GENERAL_EXPENSE: 'Biaya Umum',
  OTHER_EXPENSE: 'Biaya Lain-lain',
  DEPRECIATION_EXPENSE: 'Beban Penyusutan',
  INTEREST_EXPENSE: 'Beban Bunga',
  TAX_EXPENSE: 'Beban Pajak',
  OPERATING_REVENUE: 'Pendapatan Operasional',
  SALES_REVENUE: 'Pendapatan Penjualan',
  SERVICE_REVENUE: 'Pendapatan Jasa',
  OTHER_REVENUE: 'Pendapatan Lain-lain',
};

const subtypeLabel = (key: string) =>
  SUBTYPE_LABEL_ID[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
      toast.success('Laporan laba rugi berhasil diekspor (PDF).');
    } catch {
      toast.error('Gagal mengekspor PDF.');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportIncomeStatementExcel({ startDate: startStr, endDate: endStr });
      toast.success('Laporan laba rugi berhasil diekspor (CSV).');
    } catch {
      toast.error('Gagal mengekspor CSV.');
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
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title="Laporan Laba Rugi"
          description="Pendapatan dikurangi beban — periode berjalan, dari pendapatan kotor hingga laba bersih."
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
                Muat Ulang
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    Ekspor
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
              <span>Periode</span>
              <span className="text-text-primary normal-case tracking-normal font-display text-sm">
                {format(startDate, 'd MMM yyyy', { locale: idLocale })} – {format(endDate, 'd MMM yyyy', { locale: idLocale })}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={(d) => d && setStartDate(d)}
                  placeholder="Tanggal mulai"
                />
              </div>
              <span className="text-text-tertiary text-xs">→</span>
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={(d) => d && setEndDate(d)}
                  placeholder="Tanggal akhir"
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <EmptyState
            icon={<TrendingUp />}
            title="Tidak bisa memuat laporan"
            description={error instanceof Error ? error.message : 'Terjadi kesalahan.'}
            action={<Button onClick={() => refetch()} size="sm">Coba Lagi</Button>}
          />
        ) : isLoading || !data || !waterfall ? (
          <Skeleton className="h-[640px] rounded-lg" />
        ) : (
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle bg-bg-sunken flex items-baseline justify-between">
              <h2 className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-[0.18em]">
                Laporan Laba Rugi
              </h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                Margin {waterfall.profitMargin.toFixed(1)}%
              </span>
            </div>

            <div className="px-2 pb-2">
              <table className="w-full font-body">
                <colgroup>
                  <col />
                  <col className="w-[38%]" />
                </colgroup>
                <tbody>
                  {/* ── PENDAPATAN ── */}
                  <SectionHeaderRow label="Pendapatan" />
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
                    <LineRow label="Tidak ada pendapatan pada periode ini" amount={0} muted indent={1} />
                  )}
                  <SubtotalRow label="Total Pendapatan" amount={waterfall.totalRevenue} />

                  {/* ── HPP ── (only if there are COGS accounts) */}
                  {waterfall.cogs.length > 0 && (
                    <>
                      <SectionHeaderRow label="Harga Pokok Penjualan" />
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
                      <SubtotalRow label="Total HPP" amount={-waterfall.totalCogs} />
                      <SubtotalRow label="Laba Kotor" amount={waterfall.grossProfit} emphasis="normal" />
                    </>
                  )}

                  {/* ── BIAYA OPERASIONAL ── */}
                  {Object.keys(waterfall.opexBySubtype).length > 0 && (
                    <>
                      <SectionHeaderRow label="Biaya Operasional" />
                      {Object.entries(waterfall.opexBySubtype).map(([sub, rows]) => {
                        const subTotal = rows.reduce((s, r) => s + (r.balance || 0), 0);
                        return (
                          <>
                            <tr key={`${sub}-head`}>
                              <td colSpan={2} className="pt-3 pb-1 pl-4 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                                {subtypeLabel(sub)}
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
                                Subtotal {subtypeLabel(sub)}
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
                      <SubtotalRow label="Total Biaya Operasional" amount={-waterfall.totalOpex} />
                      <SubtotalRow label="Laba Operasional" amount={waterfall.operatingIncome} emphasis="normal" />
                    </>
                  )}

                  {/* ── LABA / RUGI BERSIH ── */}
                  <SubtotalRow
                    label={waterfall.netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
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
