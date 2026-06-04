import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw,
  Printer, Download, Calculator,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* Month names for Indonesian format */
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/* ------------------------------------------------------------------ */
/*  Create form state                                                  */
/* ------------------------------------------------------------------ */

interface CreateForm {
  periodDate: Date | undefined;
  openingBalance: string;
  notes: string;
}

const EMPTY_FORM: CreateForm = {
  periodDate: undefined,
  openingBalance: '',
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
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CashBankBalancePage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* state */
  const [createOpen, setCreateOpen]         = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<CashBankBalance | null>(null);
  const [form, setForm]                     = useState<CreateForm>(EMPTY_FORM);

  /* queries */
  const { data: balanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-bank-balances'],
    queryFn:  () => getCashBankBalances({ sortBy: 'periodDate', sortOrder: 'desc' }),
  });

  const balances = useMemo(() => balanceData?.data ?? [], [balanceData]);

  /* stats — latest period, split into Cash vs Bank (per account) */
  const stats = useMemo(() => {
    let latestKey = 0;
    for (const b of balances) {
      const k = b.year * 100 + b.month;
      if (k > latestKey) latestKey = k;
    }
    const latestYear = Math.floor(latestKey / 100);
    const latestMonth = latestKey % 100;
    const latestRows = balances.filter((b) => b.year === latestYear && b.month === latestMonth);
    const cash = latestRows.filter((b) => b.group === 'CASH');
    const bank = latestRows.filter((b) => b.group === 'BANK');
    const sumClosing = (rows: CashBankBalance[]) =>
      rows.reduce((s, b) => s + toNumber(b.closingBalance), 0);
    const cashTotal = sumClosing(cash);
    const bankTotal = sumClosing(bank);
    return {
      cash,
      bank,
      cashTotal,
      bankTotal,
      combined: cashTotal + bankTotal,
      latestPeriod: latestRows[0]?.period ?? '—',
      hasData: latestRows.length > 0,
    };
  }, [balances]);

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash-bank-balances'] });

  const createMutation = useMutation({
    mutationFn: createCashBankBalance,
    onSuccess: () => {
      toast.success(t('accounting.cashBankBalance.createSuccess', 'Cash & bank balance calculated and saved'));
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
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

    // Opening balances are auto-chained per account; this just (re)syncs the
    // period's cash/bank balances from posted journal entries.
    createMutation.mutate({ period, periodDate, year, month, notes: form.notes || undefined });
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

      {/* KPI band — Cash vs Bank vs combined (latest period) */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)
          ) : (
            <>
              <StatCard
                label={t('accounting.cashBankBalance.statCashTotal', 'Cash')}
                value={<MoneyDisplay amount={stats.cashTotal} />}
                sublabel={stats.latestPeriod}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statBankTotal', 'Bank')}
                value={<MoneyDisplay amount={stats.bankTotal} />}
                sublabel={stats.latestPeriod}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statCombinedTotal', 'Total Cash & Bank')}
                value={<MoneyDisplay amount={stats.combined} className="text-success" />}
                sublabel={stats.latestPeriod}
              />
            </>
          )}
        </div>
      </section>

      {/* Info panel */}
      <GlassPanel surface="strong" padding="sm" className="mb-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Calculator className="h-4 w-4 text-text-tertiary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1">{t('accounting.cashBankBalance.howItWorksLabel', 'How It Works')}</p>
            <p className="text-sm text-text-secondary">
              {t('accounting.cashBankBalance.howItWorksV2', 'Each cash and bank account keeps its own running balance, derived automatically from posted journal entries (expenses, payments, etc.) and chained from the previous period. Cash and Bank are shown separately and summed into the total.')}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {t('accounting.cashBankBalance.formula', 'Formula:')} <span className="font-mono">Closing = Opening + Inflow − Outflow</span> {t('accounting.cashBankBalance.perAccount', '(per account)')}
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Balance history table */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.cashBankBalance.byAccountLabel', 'Balances by account')}</p>
          </div>
          <span className="text-xs text-text-tertiary">{stats.latestPeriod}</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : !stats.hasData ? (
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
          <div className="px-1 pb-1">
            <DataTable<CashBankBalance>
              data={[...stats.cash, ...stats.bank]}
              enablePagination={false}
              columns={[
                {
                  accessorKey: 'accountName',
                  header: t('accounting.cashBankBalance.colAccount', 'Account'),
                  cell: ({ row }) => (
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-text-primary truncate">{row.original.accountName}</div>
                      <div className="text-[11px] text-text-tertiary mt-0.5">
                        <span className="font-mono mr-1.5">{row.original.accountCode}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-1.5 py-0 text-[9px] uppercase tracking-wider border-transparent',
                            row.original.group === 'CASH' ? 'bg-success/10 text-success' : 'bg-info/10 text-info',
                          )}
                        >
                          {row.original.group === 'CASH'
                            ? t('accounting.cashBankBalance.groupCash', 'Cash')
                            : t('accounting.cashBankBalance.groupBank', 'Bank')}
                        </Badge>
                      </div>
                    </div>
                  ),
                },
                {
                  accessorKey: 'openingBalance',
                  header: () => <span className="block text-right">{t('accounting.cashBankBalance.colOpening', 'Opening Balance')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.openingBalance)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'totalInflow',
                  header: () => <span className="block text-right">{t('accounting.cashBankBalance.colInflow', 'Total Inflow')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.totalInflow)} className="text-success" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'totalOutflow',
                  header: () => <span className="block text-right">{t('accounting.cashBankBalance.colOutflow', 'Total Outflow')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.totalOutflow)} className="text-danger" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'closingBalance',
                  header: () => <span className="block text-right">{t('accounting.cashBankBalance.colClosing', 'Closing Balance')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right font-semibold">
                      <MoneyDisplay amount={toNumber(row.original.closingBalance)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'netChange',
                  header: () => <span className="block text-right">{t('accounting.cashBankBalance.colNetChange', 'Net Change')}</span>,
                  cell: ({ row }) => {
                    const net = toNumber(row.original.netChange);
                    return (
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono text-xs gap-1',
                            net >= 0
                              ? 'border-success/20 text-success bg-success/5'
                              : 'border-danger/20 text-danger bg-danger/5',
                          )}
                        >
                          {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <MoneyDisplay amount={Math.abs(net)} />
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  id: 'calculatedAt',
                  header: t('accounting.cashBankBalance.colCalculatedAt', 'Calculated'),
                  cell: ({ row }) => (
                    <span className="text-text-tertiary text-xs">
                      {row.original.calculatedAt
                        ? <DateDisplay date={row.original.calculatedAt} />
                        : '—'}
                    </span>
                  ),
                },
                {
                  id: 'actions',
                  header: () => <span className="sr-only">{t('cashBankBalance.actions', 'Actions')}</span>,
                  cell: ({ row }) => (
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-danger"
                        onClick={() => setDeleteTarget(row.original)}
                        aria-label={t('accounting.cashBankBalance.deleteBalance', 'Delete balance')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </GlassPanel>

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
            {/* Period picker */}
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

            {/* Auto-calculated note */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle text-sm text-text-secondary">
              {t(
                'accounting.cashBankBalance.syncNote',
                "Each cash/bank account's opening, inflow, outflow and closing for this month are calculated automatically from posted journal entries — and chained from the previous period.",
              )}
            </div>

            {/* Notes */}
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
              {t('accounting.cashBankBalance.deleteDialogDesc', 'Are you sure you want to delete the balance for period')} <span className="text-text-primary font-medium">{deleteTarget?.period}</span>?{' '}
              {t('accounting.cashBankBalance.deleteDialogWarn', 'This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('accounting.cashBankBalance.cancel', 'Cancel')}</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
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
