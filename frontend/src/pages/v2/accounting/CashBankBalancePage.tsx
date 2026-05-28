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
import { Input } from '@/components/ui/input';
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

  /* stats */
  const stats = useMemo(() => {
    const latest = balances[0];
    const prev   = balances[1];
    const closingLatest = toNumber(latest?.closingBalance);
    const closingPrev   = toNumber(prev?.closingBalance);
    const change        = closingLatest - closingPrev;
    const totalInflow   = toNumber(latest?.totalInflow);
    const totalOutflow  = toNumber(latest?.totalOutflow);
    return { closingLatest, change, totalInflow, totalOutflow, latestPeriod: latest?.period ?? '—' };
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

  const handleCreate = () => {
    if (!form.periodDate) {
      toast.error(t('accounting.cashBankBalance.validationPeriod', 'Please select a period first'));
      return;
    }
    if (!form.openingBalance) {
      toast.error(t('accounting.cashBankBalance.validationOpening', 'Opening balance is required'));
      return;
    }
    const d       = form.periodDate;
    const year    = d.getFullYear();
    const month   = d.getMonth() + 1;
    const monthId = MONTHS_ID[d.getMonth()] ?? String(month);
    const period  = `${monthId} ${year}`;
    // First day of the month as YYYY-MM-DD
    const periodDate = `${year}-${String(month).padStart(2, '0')}-01`;

    createMutation.mutate({
      period,
      periodDate,
      year,
      month,
      openingBalance: parseFloat(form.openingBalance),
      notes: form.notes || undefined,
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
          title={t('accounting.cashBankBalance.errorTitle', 'Cannot load cash & bank balance')}
          description={error instanceof Error ? error.message : t('accounting.cashBankBalance.errorGeneric', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('accounting.cashBankBalance.retry', 'Try Again')}</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title={t('cashBankBalance.pageTitle', 'Cash & Bank Balance')}
        description={t('cashBankBalance.pageDesc', 'Summary of cash and bank positions per period, automatically calculated from journal entries.')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {t('accounting.cashBankBalance.print', 'Print')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Calculator className="h-4 w-4" /> {t('accounting.cashBankBalance.calcNewPeriod', 'Calculate New Period')}
            </Button>
          </div>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)
          ) : (
            <>
              <StatCard
                label={t('accounting.cashBankBalance.statLatestBalance', 'Latest Balance')}
                value={<MoneyDisplay amount={stats.closingLatest} className="text-success" />}
                sublabel={stats.latestPeriod}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statTotalInflow', 'Total Inflow (Last Period)')}
                value={<MoneyDisplay amount={stats.totalInflow} className="text-success" />}
                sublabel={t('accounting.cashBankBalance.statFromJournal', 'from journal entries')}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statTotalOutflow', 'Total Outflow (Last Period)')}
                value={<MoneyDisplay amount={stats.totalOutflow} className="text-danger" />}
                sublabel={t('accounting.cashBankBalance.statFromJournal', 'from journal entries')}
              />
              <StatCard
                label={t('accounting.cashBankBalance.statNetChange', 'Net Change')}
                value={
                  <div className={cn('flex items-center gap-1', stats.change >= 0 ? 'text-success' : 'text-danger')}>
                    {stats.change >= 0
                      ? <TrendingUp className="h-4 w-4 shrink-0" />
                      : <TrendingDown className="h-4 w-4 shrink-0" />}
                    <MoneyDisplay amount={Math.abs(stats.change)} />
                  </div>
                }
                sublabel={stats.change >= 0 ? t('accounting.cashBankBalance.statIncreased', 'up from previous period') : t('accounting.cashBankBalance.statDecreased', 'down from previous period')}
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
              <span className="text-text-primary font-medium">{t('accounting.cashBankBalance.manualInput', 'Manual input:')} </span>{t('accounting.cashBankBalance.manualInputDesc', 'Period and Opening Balance.')}{' '}
              <span className="text-text-primary font-medium">{t('accounting.cashBankBalance.autoCalc', 'Auto-calculated:')} </span>{t('accounting.cashBankBalance.autoCalcDesc', 'Total Inflow, Total Outflow, Closing Balance — sourced from all cash/bank journal transactions for that period.')}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {t('accounting.cashBankBalance.formula', 'Formula:')} <span className="font-mono">Closing Balance = Opening + Inflow − Outflow</span>
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Balance history table */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.cashBankBalance.historyLabel', 'Balance History by Period')}</p>
          </div>
          <span className="text-xs text-text-tertiary">{balances.length} {t('cashBankBalance.periodCount', 'periods')}</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : balances.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title={t('accounting.cashBankBalance.emptyTitle', 'No balance data yet')}
            description={t('accounting.cashBankBalance.emptyDesc', 'Calculate the first period balance to start tracking your cash & bank position.')}
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Calculator className="h-4 w-4" /> {t('accounting.cashBankBalance.calcNewPeriod', 'Calculate New Period')}
              </Button>
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<CashBankBalance>
              data={balances}
              enablePagination
              columns={[
                {
                  accessorKey: 'period',
                  header: t('accounting.cashBankBalance.colPeriod', 'Period'),
                  cell: ({ row }) => (
                    <div className="font-medium text-sm text-text-primary">{row.original.period}</div>
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
            <DialogTitle className="font-display">{t('accounting.cashBankBalance.dialogTitle', 'Calculate New Period Balance')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.cashBankBalance.dialogDesc', 'Enter the period and opening balance. Inflow/outflow totals are calculated automatically from journal entries.')}
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

            {/* Opening balance */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{t('accounting.cashBankBalance.fieldOpening', 'Opening Balance (IDR)')} *</label>
              <Input
                type="number"
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                placeholder="0"
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
              <p className="text-xs text-text-tertiary">
                {t('accounting.cashBankBalance.fieldOpeningHint', 'Usually equal to the closing balance of the previous period.')}
              </p>
            </div>

            {/* Auto-calculated info */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-2">{t('accounting.cashBankBalance.autoCalculated', 'Auto-Calculated')}</p>
              <div className="space-y-1.5 text-sm text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>{t('accounting.cashBankBalance.colInflow', 'Total Inflow')}</span>
                  <span className="text-text-tertiary text-xs">{t('accounting.cashBankBalance.fromCashJournal', 'from cash journal entries')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('accounting.cashBankBalance.colOutflow', 'Total Outflow')}</span>
                  <span className="text-text-tertiary text-xs">{t('accounting.cashBankBalance.fromCashJournal', 'from cash journal entries')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('accounting.cashBankBalance.colClosing', 'Closing Balance')}</span>
                  <span className="font-mono text-xs text-text-tertiary">= Opening + Inflow − Outflow</span>
                </div>
              </div>
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
    </Shell>
  );
}
