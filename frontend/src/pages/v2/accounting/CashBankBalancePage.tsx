import { useMemo, useState } from 'react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, Trash2, RefreshCw, Printer, Calculator,
  ChevronLeft, ChevronRight, ExternalLink, Wallet, Landmark,
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
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import {
  getCashBankBalances,
  createCashBankBalance,
  deleteCashBankBalance,
  recalculateAllCashBankBalances,
  type CashBankBalance,
} from '@/services/cash-bank-balance';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* Month names for Indonesian period labels (used when building a new period). */
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/* Local-date ISO (yyyy-mm-dd) without UTC shift — used for ledger deep links. */
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthStart = (year: number, month: number) => new Date(year, month - 1, 1);
const monthEnd   = (year: number, month: number) => new Date(year, month, 0);

/* Friendly, language-aware period label ("June 2026" / "Juni 2026") instead
 * of the raw stored "YYYY-MM". Computed at render time so it follows the
 * active EN/ID toggle. */
const fmtPeriod = (year: number, month: number) => {
  const locale = (i18n.language || '').startsWith('id') ? 'id-ID' : 'en-US';
  return new Date(year, month - 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

/* One period's accounts, split into Cash vs Bank, with rolled-up totals. */
interface PeriodAgg {
  key: number;            // year * 100 + month — sortable
  year: number;
  month: number;
  period: string;         // display label, e.g. "Maret 2026"
  cashRows: CashBankBalance[];
  bankRows: CashBankBalance[];
  openingTotal: number;
  inflowTotal: number;
  outflowTotal: number;
  cashTotal: number;      // Σ closing of cash accounts
  bankTotal: number;      // Σ closing of bank accounts
  combined: number;
  calculatedAt?: string;  // most recent calculation across the period's rows
}

const sumBy = (rows: CashBankBalance[], pick: (b: CashBankBalance) => unknown) =>
  rows.reduce((s, b) => s + toNumber(pick(b)), 0);

/* ------------------------------------------------------------------ */
/*  Page shell — hoisted so React never unmounts it on re-render.      */
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

interface CreateForm {
  periodDate: Date | undefined;
  notes: string;
}
const EMPTY_FORM: CreateForm = { periodDate: undefined, notes: '' };

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CashBankBalancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* state */
  const [createOpen, setCreateOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CashBankBalance | null>(null);
  const [form, setForm]                 = useState<CreateForm>(EMPTY_FORM);
  /* Selected period key (year*100+month). null → default to latest available. */
  const [selectedKey, setSelectedKey]   = useState<number | null>(null);

  /* queries */
  const { data: balanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-bank-balances'],
    queryFn:  () => getCashBankBalances({ sortBy: 'periodDate', sortOrder: 'desc' }),
  });

  const balances = useMemo(() => balanceData?.data ?? [], [balanceData]);

  /* Group every balance row by period, newest first. */
  const periods = useMemo<PeriodAgg[]>(() => {
    const byKey = new Map<number, CashBankBalance[]>();
    for (const b of balances) {
      const key = b.year * 100 + b.month;
      const arr = byKey.get(key);
      if (arr) arr.push(b);
      else byKey.set(key, [b]);
    }
    const aggs: PeriodAgg[] = [];
    for (const [key, rows] of byKey) {
      const cashRows = rows.filter((r) => r.group === 'CASH');
      const bankRows = rows.filter((r) => r.group === 'BANK');
      const cashTotal = sumBy(cashRows, (b) => b.closingBalance);
      const bankTotal = sumBy(bankRows, (b) => b.closingBalance);
      const calculatedAt = rows
        .map((r) => r.calculatedAt)
        .filter(Boolean)
        .sort()
        .pop();
      aggs.push({
        key,
        year: Math.floor(key / 100),
        month: key % 100,
        period: rows[0]?.period ?? '—',
        cashRows,
        bankRows,
        openingTotal: sumBy(rows, (b) => b.openingBalance),
        inflowTotal:  sumBy(rows, (b) => b.totalInflow),
        outflowTotal: sumBy(rows, (b) => b.totalOutflow),
        cashTotal,
        bankTotal,
        combined: cashTotal + bankTotal,
        calculatedAt: calculatedAt ?? undefined,
      });
    }
    return aggs.sort((a, b) => b.key - a.key);
  }, [balances]);

  /* Resolve the active period: explicit selection, else the latest. */
  const selectedIdx = useMemo(() => {
    if (selectedKey == null) return 0;
    const i = periods.findIndex((p) => p.key === selectedKey);
    return i === -1 ? 0 : i;
  }, [periods, selectedKey]);

  const selected = periods[selectedIdx];
  const prevPeriod = periods[selectedIdx + 1];   // chronologically earlier (list is desc)
  const newerPeriod = periods[selectedIdx - 1];  // chronologically later

  /* Percent change vs the previous period — quiet "is it growing?" signal. */
  const pctDelta = (current: number, prior?: number): { value: number } | undefined => {
    if (prior === undefined || prior === 0) return undefined;
    return { value: Math.round(((current - prior) / Math.abs(prior)) * 100) };
  };

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash-bank-balances'] });

  const createMutation = useMutation({
    mutationFn: createCashBankBalance,
    onSuccess: (created) => {
      toast.success(t('accounting.cashBankBalance.createSuccess', 'Cash & bank balance calculated and saved'));
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      if (created?.year && created?.month) setSelectedKey(created.year * 100 + created.month);
    },
    onError: () => toast.error(t('accounting.cashBankBalance.createFail', 'Failed to save cash & bank balance')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCashBankBalance,
    onSuccess: () => {
      toast.success(t('accounting.cashBankBalance.deleteSuccess', 'Balance deleted'));
      invalidate();
      setDeleteTarget(null);
    },
    onError: () => toast.error(t('accounting.cashBankBalance.deleteFail', 'Failed to delete balance')),
  });

  const recalcAllMutation = useMutation({
    mutationFn: recalculateAllCashBankBalances,
    onSuccess: (res) => {
      toast.success(
        t('accounting.cashBankBalance.recalcAllSuccess', 'Recalculated {{n}} period(s) chronologically', {
          n: res?.recalculated ?? 0,
        }),
      );
      invalidate();
    },
    onError: () => toast.error(t('accounting.cashBankBalance.recalcAllFail', 'Failed to recalculate balances')),
  });

  const handleCreate = () => {
    if (!form.periodDate) {
      toast.error(t('accounting.cashBankBalance.validationPeriod', 'Please select a period first'));
      return;
    }
    const d       = form.periodDate;
    const year    = d.getFullYear();
    const month   = d.getMonth() + 1;
    const monthId = MONTHS_ID[d.getMonth()] ?? String(month);
    const period  = `${monthId} ${year}`;
    const periodDate = `${year}-${String(month).padStart(2, '0')}-01`;
    createMutation.mutate({ period, periodDate, year, month, notes: form.notes || undefined });
  };

  /* Deep link into the General Ledger for one account, scoped to the period. */
  const ledgerHref = (accountCode: string) => {
    if (!selected) return '/accounting/general-ledger';
    const start = monthStart(selected.year, selected.month);
    const end   = monthEnd(selected.year, selected.month);
    return `/accounting/general-ledger?accountCode=${encodeURIComponent(accountCode)}`
      + `&startDate=${localIso(start)}&endDate=${localIso(end)}`;
  };

  if (error) {
    return (
      <PageShell user={user}>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={t('accounting.cashBankBalance.errorTitle', 'Cannot load cash & bank balance')}
          description={error instanceof Error ? error.message : t('accounting.cashBankBalance.errorGeneric', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('accounting.cashBankBalance.retry', 'Try Again')}</Button>}
        />
      </PageShell>
    );
  }

  const hasData = !isLoading && periods.length > 0 && !!selected;

  return (
    <PageShell user={user}>
      <PageHeader
        title={t('cashBankBalance.pageTitle', 'Cash & Bank Balance')}
        description={t('cashBankBalance.pageDesc', 'Summary of cash and bank positions per period, automatically calculated from journal entries.')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {t('accounting.cashBankBalance.print', 'Print')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => recalcAllMutation.mutate()}
              disabled={recalcAllMutation.isPending}
            >
              <RefreshCw className={cn('h-4 w-4', recalcAllMutation.isPending && 'animate-spin')} />
              {t('accounting.cashBankBalance.recalcAll', 'Recalculate')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Calculator className="h-4 w-4" /> {t('accounting.cashBankBalance.calcNewPeriod', 'Calculate New Period')}
            </Button>
          </div>
        }
      />

      {/* ---- Period selector + provenance bar ------------------------------ */}
      {/*  Answers the finance question "WHICH data am I looking at?" up front: */}
      {/*  the period, the exact date range it covers, the source, and when it  */}
      {/*  was last calculated.                                                 */}
      {isLoading ? (
        <Skeleton className="h-[64px] rounded-lg mb-5" />
      ) : hasData ? (
        <GlassPanel surface="strong" padding="sm" className="mb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
                disabled={!prevPeriod}
                onClick={() => prevPeriod && setSelectedKey(prevPeriod.key)}
                aria-label={t('accounting.cashBankBalance.prevPeriodAria', 'Previous period')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select
                value={String(selected!.key)}
                onValueChange={(v) => setSelectedKey(Number(v))}
              >
                <SelectTrigger size="sm" className="min-w-[170px] bg-bg-sunken border-border-subtle font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.key} value={String(p.key)}>{fmtPeriod(p.year, p.month)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon-sm"
                className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
                disabled={!newerPeriod}
                onClick={() => newerPeriod && setSelectedKey(newerPeriod.key)}
                aria-label={t('accounting.cashBankBalance.nextPeriodAria', 'Next period')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <span className="ml-1 hidden text-xs text-text-tertiary sm:inline">
                {t('accounting.cashBankBalance.coversLabel', 'Covers')}{' '}
                <DateDisplay date={monthStart(selected!.year, selected!.month)} />
                {' – '}
                <DateDisplay date={monthEnd(selected!.year, selected!.month)} />
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-tertiary">
              <span>
                {t('accounting.cashBankBalance.sourceLabel', 'Source')}:{' '}
                <span className="text-text-secondary">{t('accounting.cashBankBalance.sourceValue', 'Posted journal entries')}</span>
              </span>
              <span className="hidden sm:inline">
                {t('accounting.cashBankBalance.calcFreshLabel', 'Last calculated')}:{' '}
                <span className="text-text-secondary">
                  {selected!.calculatedAt
                    ? <DateDisplay date={selected!.calculatedAt} format="long" />
                    : t('accounting.cashBankBalance.notCalculated', 'Not yet calculated')}
                </span>
              </span>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {/* ---- KPI band — selected period, with vs-previous-period deltas ----- */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[128px] rounded-lg" />)
          ) : (
            <>
              <StatCard
                label={t('accounting.cashBankBalance.statCashTotal', 'Cash')}
                value={<MoneyDisplay amount={selected?.cashTotal ?? 0} />}
                delta={pctDelta(selected?.cashTotal ?? 0, prevPeriod?.cashTotal)}
                sublabel={selected ? fmtPeriod(selected.year, selected.month) : '—'}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statBankTotal', 'Bank')}
                value={<MoneyDisplay amount={selected?.bankTotal ?? 0} />}
                delta={pctDelta(selected?.bankTotal ?? 0, prevPeriod?.bankTotal)}
                sublabel={selected ? fmtPeriod(selected.year, selected.month) : '—'}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statCombinedTotal', 'Total Cash & Bank')}
                value={<MoneyDisplay amount={selected?.combined ?? 0} className="text-success" />}
                delta={pctDelta(selected?.combined ?? 0, prevPeriod?.combined)}
                sublabel={selected ? fmtPeriod(selected.year, selected.month) : '—'}
              />
            </>
          )}
        </div>
      </section>

      {/* ---- Per-account breakdown — grouped, subtotalled, drill-down ------- */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden mb-10">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">{t('accounting.cashBankBalance.byAccountLabel', 'Balances by account')}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              <span className="font-mono">{t('accounting.cashBankBalance.formula', 'Formula:')} {t('accounting.cashBankBalance.closingFormula', 'Closing = Opening + Inflow − Outflow')}</span>
            </p>
          </div>
          {hasData && <span className="text-xs text-text-tertiary">{fmtPeriod(selected!.year, selected!.month)}</span>}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : !hasData ? (
          <EmptyState
            icon={<BookOpen />}
            title={t('accounting.cashBankBalance.emptyTitle', 'No balance data yet')}
            description={t('accounting.cashBankBalance.emptyDescV2', 'Record an expense or post a journal entry — cash & bank balances build automatically. Or click Recalculate to rebuild from history.')}
            action={
              <Button size="sm" onClick={() => recalcAllMutation.mutate()} disabled={recalcAllMutation.isPending}>
                <RefreshCw className={cn('h-4 w-4', recalcAllMutation.isPending && 'animate-spin')} /> {t('accounting.cashBankBalance.recalcAll', 'Recalculate')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <th className="text-left  font-medium px-5 py-2.5">{t('accounting.cashBankBalance.colAccount', 'Account')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.colOpening', 'Opening Balance')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.colInflow', 'Total Inflow')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.colOutflow', 'Total Outflow')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.colClosing', 'Closing Balance')}</th>
                  <th className="px-3 py-2.5 w-[1%]"><span className="sr-only">{t('cashBankBalance.actions', 'Actions')}</span></th>
                </tr>
              </thead>

              <BalanceGroup
                title={t('accounting.cashBankBalance.groupCash', 'Cash')}
                subtotalLabel={t('accounting.cashBankBalance.subtotalCash', 'Cash subtotal')}
                Icon={Wallet}
                accent="text-success"
                rows={selected!.cashRows}
                onDelete={setDeleteTarget}
                onLedger={(code) => navigate(ledgerHref(code))}
                t={t}
              />
              <BalanceGroup
                title={t('accounting.cashBankBalance.groupBank', 'Bank')}
                subtotalLabel={t('accounting.cashBankBalance.subtotalBank', 'Bank subtotal')}
                Icon={Landmark}
                accent="text-info"
                rows={selected!.bankRows}
                onDelete={setDeleteTarget}
                onLedger={(code) => navigate(ledgerHref(code))}
                t={t}
              />

              <tfoot>
                <tr className="border-t-2 border-border-default bg-bg-sunken/40 font-semibold">
                  <td className="px-5 py-3 text-text-primary">{t('accounting.cashBankBalance.statCombinedTotal', 'Total Cash & Bank')}</td>
                  <td className="px-3 py-3 text-right"><MoneyDisplay amount={selected!.openingTotal} /></td>
                  <td className="px-3 py-3 text-right text-success"><MoneyDisplay amount={selected!.inflowTotal} /></td>
                  <td className="px-3 py-3 text-right text-danger"><MoneyDisplay amount={selected!.outflowTotal} /></td>
                  <td className="px-3 py-3 text-right text-text-primary"><MoneyDisplay amount={selected!.combined} /></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassPanel>

      {/* ---- Balance history — compare every period at a glance ------------- */}
      {!isLoading && periods.length > 1 && (
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <p className="text-sm font-medium text-text-primary">{t('accounting.cashBankBalance.historyTitle', 'Balance history')}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{t('accounting.cashBankBalance.historySubtitle', 'Cash & bank totals by period — click a row to view its breakdown.')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <th className="text-left  font-medium px-5 py-2.5">{t('accounting.cashBankBalance.colPeriod', 'Period')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.groupCash', 'Cash')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.groupBank', 'Bank')}</th>
                  <th className="text-right font-medium px-3 py-2.5">{t('accounting.cashBankBalance.colTotal', 'Total')}</th>
                  <th className="text-right font-medium px-5 py-2.5">{t('accounting.cashBankBalance.colCalculatedAt', 'Calculated')}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const active = p.key === selected!.key;
                  return (
                    <tr
                      key={p.key}
                      onClick={() => setSelectedKey(p.key)}
                      className={cn(
                        'border-b border-border-subtle/60 cursor-pointer transition-colors',
                        active ? 'bg-bg-sunken/60' : 'hover:bg-bg-sunken/30',
                      )}
                    >
                      <td className="px-5 py-2.5">
                        <span className={cn('text-text-secondary', active && 'text-text-primary font-medium')}>{fmtPeriod(p.year, p.month)}</span>
                        {active && (
                          <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] uppercase tracking-wider border-transparent bg-info/10 text-info">
                            {t('accounting.cashBankBalance.viewingBadge', 'Viewing')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary"><MoneyDisplay amount={p.cashTotal} /></td>
                      <td className="px-3 py-2.5 text-right text-text-secondary"><MoneyDisplay amount={p.bankTotal} /></td>
                      <td className="px-3 py-2.5 text-right text-text-primary font-medium"><MoneyDisplay amount={p.combined} /></td>
                      <td className="px-5 py-2.5 text-right text-text-tertiary text-xs">
                        {p.calculatedAt ? <DateDisplay date={p.calculatedAt} /> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(EMPTY_FORM); } }}
      >
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.cashBankBalance.dialogTitle', 'Calculate Period Balance')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.cashBankBalance.dialogDescV2', 'Select the month to (re)calculate. Per-account cash & bank balances are derived from posted journal entries.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.cashBankBalance.fieldPeriod', 'Period')} *</label>
              <MonomiDatePicker
                value={form.periodDate}
                onChange={(d) => setForm((f) => ({ ...f, periodDate: d }))}
                placeholder={t('accounting.cashBankBalance.fieldPeriodPh', 'Select month')}
                className="bg-bg-sunken border-border-subtle"
              />
              <p className="text-xs text-text-tertiary">
                {t('accounting.cashBankBalance.fieldPeriodHint', 'Select any date within the desired month — the system will use that month.')}
              </p>
            </div>

            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle text-sm text-text-secondary">
              {t(
                'accounting.cashBankBalance.syncNote',
                "Each cash/bank account's opening, inflow, outflow and closing for this month are calculated automatically from posted journal entries — and chained from the previous period.",
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.cashBankBalance.fieldNotes', 'Notes (Optional)')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t('accounting.cashBankBalance.fieldNotesPh', 'Additional notes...')}
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>
              {t('accounting.cashBankBalance.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t('accounting.cashBankBalance.calculating', 'Calculating...')}</>
                : <><Calculator className="h-4 w-4" /> {t('accounting.cashBankBalance.calcBalance', 'Calculate Balance')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.cashBankBalance.deleteDialogTitle', 'Delete Balance')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.cashBankBalance.deleteDialogDesc', 'Are you sure you want to delete the balance for period')}{' '}
              <span className="text-text-primary font-medium">{deleteTarget?.accountName} — {deleteTarget ? fmtPeriod(deleteTarget.year, deleteTarget.month) : ''}</span>?{' '}
              {t('accounting.cashBankBalance.deleteDialogWarn', 'This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('accounting.cashBankBalance.cancel', 'Cancel')}</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
            >
              {deleteMutation.isPending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t('accounting.cashBankBalance.deleting', 'Deleting...')}</>
                : <><Trash2 className="h-4 w-4" /> {t('accounting.cashBankBalance.deleteBalance', 'Delete Balance')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Grouped section (Cash / Bank) with a subtotal row.                 */
/*  Rendered as <tbody> so it slots into the shared <table>, keeping   */
/*  every monetary column aligned across both groups + the grand total.*/
/* ------------------------------------------------------------------ */

function BalanceGroup({
  title, subtotalLabel, Icon, accent, rows, onDelete, onLedger, t,
}: {
  title: string;
  subtotalLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
  rows: CashBankBalance[];
  onDelete: (b: CashBankBalance) => void;
  onLedger: (accountCode: string) => void;
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string;
}) {
  if (rows.length === 0) return null;
  const opening = sumBy(rows, (b) => b.openingBalance);
  const inflow  = sumBy(rows, (b) => b.totalInflow);
  const outflow = sumBy(rows, (b) => b.totalOutflow);
  const closing = sumBy(rows, (b) => b.closingBalance);

  return (
    <tbody>
      {/* group header */}
      <tr className="bg-bg-sunken/30">
        <td colSpan={6} className="px-5 py-2">
          <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em]', accent)}>
            <Icon className="h-3.5 w-3.5" /> {title}
            <span className="text-text-tertiary normal-case tracking-normal">· {t('accounting.cashBankBalance.accountsCount', '{{count}} accounts', { count: rows.length })}</span>
          </span>
        </td>
      </tr>

      {rows.map((b) => (
        <tr key={b.id} className="border-b border-border-subtle/50 hover:bg-bg-sunken/20 group">
          <td className="px-5 py-3">
            <div className="font-medium text-text-primary">{b.accountName}</div>
            <div className="font-mono text-[11px] text-text-tertiary mt-0.5">{b.accountCode}</div>
          </td>
          <td className="px-3 py-3 text-right"><MoneyDisplay amount={toNumber(b.openingBalance)} /></td>
          <td className="px-3 py-3 text-right"><MoneyDisplay amount={toNumber(b.totalInflow)} className="text-success" /></td>
          <td className="px-3 py-3 text-right"><MoneyDisplay amount={toNumber(b.totalOutflow)} className="text-danger" /></td>
          <td className="px-3 py-3 text-right font-semibold"><MoneyDisplay amount={toNumber(b.closingBalance)} /></td>
          <td className="px-3 py-3">
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-text-tertiary hover:text-info opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onLedger(b.accountCode)}
                title={t('accounting.cashBankBalance.viewLedgerAria', 'View {{account}} in the general ledger', { account: b.accountName })}
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t('accounting.cashBankBalance.viewLedger', 'Ledger')}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-text-tertiary hover:text-danger"
                onClick={() => onDelete(b)}
                aria-label={t('accounting.cashBankBalance.deleteBalance', 'Delete balance')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      ))}

      {/* subtotal */}
      <tr className="border-b border-border-subtle bg-bg-sunken/20 text-text-secondary">
        <td className="px-5 py-2.5 text-xs uppercase tracking-wider">{subtotalLabel}</td>
        <td className="px-3 py-2.5 text-right"><MoneyDisplay amount={opening} /></td>
        <td className="px-3 py-2.5 text-right text-success"><MoneyDisplay amount={inflow} /></td>
        <td className="px-3 py-2.5 text-right text-danger"><MoneyDisplay amount={outflow} /></td>
        <td className="px-3 py-2.5 text-right font-semibold text-text-primary"><MoneyDisplay amount={closing} /></td>
        <td />
      </tr>
    </tbody>
  );
}
