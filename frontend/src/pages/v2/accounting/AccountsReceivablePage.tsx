import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Search, Download, X, AlertTriangle, Wallet, BookOpen,
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
import { useAuthStore } from '@/store/auth';
import {
  getAccountsReceivableReport,
  exportAccountsReceivablePDF,
  exportAccountsReceivableExcel,
} from '@/services/accounting';
import { clientService } from '@/services/clients';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — identical vocabulary to v2/invoices so the active     */
/*  shell reads as one app, not a stitched-together suite.             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Aging bucket vocabulary — backend ships English labels, we surface */
/*  them in Bahasa with editorial badge variants.                      */
/* ------------------------------------------------------------------ */

const BUCKET_ID_KEY: Record<string, string> = {
  'Current':     'accounting.accountsReceivable.bucketCurrent',
  '1-30 days':   'accounting.accountsReceivable.bucket1to30',
  '31-60 days':  'accounting.accountsReceivable.bucket31to60',
  '61-90 days':  'accounting.accountsReceivable.bucket61to90',
  'Over 90 days':'accounting.accountsReceivable.bucketOver90',
};
const BUCKET_ID_DEFAULT: Record<string, string> = {
  'Current':     'Not Yet Due',
  '1-30 days':   '1–30 Days',
  '31-60 days':  '31–60 Days',
  '61-90 days':  '61–90 Days',
  'Over 90 days':'> 90 Days',
};

const BUCKET_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  'Current':      'outline',
  '1-30 days':    'secondary',
  '31-60 days':   'secondary',
  '61-90 days':   'destructive',
  'Over 90 days': 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Row shape (loose — the AR aging endpoint returns mixed types).     */
/* ------------------------------------------------------------------ */

interface ARRow {
  invoiceId?: string;
  invoiceNumber?: string;
  client?: { id?: string; name?: string; email?: string };
  invoiceDate?: string;
  dueDate?: string;
  amount?: number | string;
  daysOverdue?: number;
  agingBucket?: string;
}

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountsReceivablePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');

  // LOCAL (WIB) calendar date — see toLocalISODate. Never toISOString().slice
  // (UTC shift drops same-day data for WIB users → "AR empty" bug).
  const isoDate = toLocalISODate(asOfDate);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'ar-report', isoDate],
    queryFn: () => getAccountsReceivableReport({ endDate: isoDate }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  /* ----- derived: rows + filtering ----- */
  const rows: ARRow[] = useMemo(() => data?.aging?.aging ?? [], [data]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q
        || r.invoiceNumber?.toLowerCase().includes(q)
        || r.client?.name?.toLowerCase().includes(q);
      const matchesClient = clientFilter === 'all' || r.client?.id === clientFilter;
      const matchesBucket = bucketFilter === 'all' || r.agingBucket === bucketFilter;
      return matchesSearch && matchesClient && matchesBucket;
    });
  }, [rows, searchText, clientFilter, bucketFilter]);

  /* ----- derived: KPI band ----- */
  const stats = useMemo(() => {
    const summary = data?.aging?.summary ?? data?.summary ?? {};
    const current = toNumber(summary.current);
    const overdue =
      toNumber(summary.days1to30) +
      toNumber(summary.days31to60) +
      toNumber(summary.days61to90) +
      toNumber(summary.over90);
    const total = toNumber(summary.totalAR ?? summary.totalOutstanding);
    // Piutang Lain-lain (Other Receivables, 1-2040) — reimbursable expenses
    // advanced on behalf of clients. Tracked in GL separately from trade AR.
    const otherReceivables = toNumber(
      (data?.summary as any)?.otherReceivablesBalance ??
        (data as any)?.otherReceivables?.balance,
    );
    return {
      total,
      current,
      overdue,
      otherReceivables,
      clientCount: data?.summary?.customerCount ?? data?.topCustomers?.length ?? 0,
    };
  }, [data]);

  const hasActiveFilters = !!searchText || clientFilter !== 'all' || bucketFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setClientFilter('all');
    setBucketFilter('all');
  };

  const handleExportPDF = async () => {
    try {
      await exportAccountsReceivablePDF({ endDate: isoDate });
      toast.success(t('accounting.accountsReceivable.exportPdfSuccess'));
    } catch (e) {
      toast.error(t('accounting.accountsReceivable.exportPdfFail'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportAccountsReceivableExcel({ endDate: isoDate });
      toast.success(t('accounting.accountsReceivable.exportExcelSuccess'));
    } catch (e) {
      toast.error(t('accounting.accountsReceivable.exportExcelFail'));
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
        topbar={{ right: <Button variant="ghost" size="sm">{user?.name || 'User'}</Button> }}
      >
        <PageContainer>
          <EmptyState
            icon={<Wallet className="h-12 w-12" />}
            title={t('accounting.accountsReceivable.errorTitle')}
            description={error instanceof Error ? error.message : t('accounting.accountsReceivable.errorDesc')}
            action={<Button onClick={() => refetch()}>{t('accounting.accountsReceivable.retry')}</Button>}
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
      topbar={{ right: <Button variant="ghost" size="sm">{user?.name || 'User'}</Button> }}
    >
      <PageContainer>
        <PageHeader
          title={t('accounting.accountsReceivable.title')}
          description={t('accounting.accountsReceivable.description')}
          breadcrumbs={[
            { label: t('accounting.accountsReceivable.breadcrumbAccounting') },
            { label: t('accounting.accountsReceivable.title') },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[200px]">
                <MonomiDatePicker
                  value={asOfDate}
                  onChange={(d) => d && setAsOfDate(d)}
                  placeholder={t('accounting.accountsReceivable.asOfDatePlaceholder', 'As of date')}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — Piutang Usaha / Piutang Lain-lain / Belum Jatuh
            Tempo / Jatuh Tempo / Klien. Trade AR (1-2010) and Other
            Receivables (1-2040, reimbursables) are shown as distinct lines;
            "Jatuh Tempo" is the load-bearing alarm.
           ───────────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  label={t('accounting.accountsReceivable.statTotalReceivable', 'Trade Receivable (Piutang Usaha)')}
                  value={<MoneyDisplay amount={stats.total} />}
                  sublabel={t('accounting.accountsReceivable.statTotalReceivableSub', 'open invoices as of reporting date')}
                />
                <StatCard
                  label={t('accounting.accountsReceivable.statOtherReceivable', 'Other Receivable (Piutang Lain-lain)')}
                  value={<MoneyDisplay amount={stats.otherReceivables} />}
                  sublabel={t('accounting.accountsReceivable.statOtherReceivableSub', 'reimbursable costs advanced for clients')}
                />
                <StatCard
                  label={t('accounting.accountsReceivable.statCurrent', 'Not Yet Due')}
                  value={<MoneyDisplay amount={stats.current} />}
                  sublabel={t('accounting.accountsReceivable.statCurrentSub', 'still within payment period')}
                />
                <StatCard
                  label={t('accounting.accountsReceivable.statOverdue', 'Overdue')}
                  value={<MoneyDisplay amount={stats.overdue} className="text-danger" />}
                  sublabel={t('accounting.accountsReceivable.statOverdueSub', 'follow-up collection required')}
                />
                <StatCard
                  label={t('accounting.accountsReceivable.statClientCount', 'Client Count')}
                  value={stats.clientCount}
                  sublabel={t('accounting.accountsReceivable.statClientCountSub', 'with open balance')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Filter + table — single panel, single border. Filter strip
            sits on a quiet inset; the table inherits the panel surface.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('accounting.accountsReceivable.searchPlaceholder', 'Search by invoice number or client name...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]"
                >
                  <SelectValue placeholder={t('accounting.accountsReceivable.filterClientLabel', 'Client')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.accountsReceivable.filterAllClients', 'All Clients')}</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bucketFilter} onValueChange={setBucketFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder={t('accounting.accountsReceivable.filterAgingLabel', 'Aging')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.accountsReceivable.filterAllAging', 'All Ages')}</SelectItem>
                  {Object.entries(BUCKET_ID_KEY).map(([k, tKey]) => (
                    <SelectItem key={k} value={k}>{t(tKey, BUCKET_ID_DEFAULT[k])}</SelectItem>
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
                  <X className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title={hasActiveFilters ? t('accounting.accountsReceivable.noMatch') : t('accounting.accountsReceivable.noReceivables')}
              description={
                hasActiveFilters
                  ? t('accounting.accountsReceivable.noMatchDesc')
                  : t('accounting.accountsReceivable.noReceivablesDesc')
              }
              action={
                hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.accountsReceivable.resetFilter')}</Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <ARTable
                rows={filtered}
                total={stats.total}
                onRowClick={(row) => row.invoiceId && navigate(`/invoices/${row.invoiceId}`)}
              />
            </div>
          )}
        </GlassPanel>

        {/* Other Receivables (Piutang Lain-lain) — itemised outstanding
            reimbursables, so each non-sales receivable is traceable to its
            expense / client / project (a single GL number couldn't show this).
            Collected reimbursements drop off automatically (reimbursedAt set). */}
        {(() => {
          const items: any[] = (data as any)?.otherReceivables?.items ?? [];
          if (items.length === 0) return null;
          return (
            <GlassPanel surface="glass" padding="lg" className="mt-8">
              <div className="mb-4">
                <h2 className="text-base font-display font-semibold text-text-primary">
                  {t('accounting.accountsReceivable.otherReceivablesTitle', 'Other Receivables · Piutang Lain-lain (1-2040)')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t('accounting.accountsReceivable.otherReceivablesSub', 'Reimbursable costs advanced for clients, not yet collected.')}
                </p>
              </div>
              <div className="overflow-hidden rounded-md border border-border-subtle">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 px-3 py-2 bg-bg-sunken/40 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  <div>{t('accounting.accountsReceivable.colExpense', 'Expense')}</div>
                  <div>{t('accounting.accountsReceivable.colClient', 'Client')}</div>
                  <div>{t('accounting.accountsReceivable.colProject', 'Project')}</div>
                  <div className="text-right">{t('accounting.accountsReceivable.colAmount', 'Amount')}</div>
                </div>
                <ul className="divide-y divide-border-subtle">
                  {items.map((it) => (
                    <li
                      key={it.expenseId}
                      className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 items-center px-3 py-2 text-sm cursor-pointer hover:bg-bg-sunken/30 transition-colors"
                      onClick={() => navigate(`/expenses/${it.expenseId}`)}
                    >
                      <div className="font-mono text-xs text-text-tertiary flex items-center gap-2">
                        {it.expenseNumber}
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                          it.collected
                            ? 'bg-success/15 text-success'
                            : it.pending
                              ? 'bg-bg-sunken text-text-tertiary'
                              : 'bg-warning/15 text-warning',
                        )}>
                          {it.collected
                            ? t('accounting.accountsReceivable.collected', 'Collected')
                            : it.pending
                              ? t('accounting.accountsReceivable.pending', 'Not billed')
                              : t('accounting.accountsReceivable.outstanding', 'Outstanding')}
                        </span>
                      </div>
                      <div className="truncate text-text-secondary">{it.client?.name ?? '—'}</div>
                      <div className="truncate text-text-tertiary text-xs">
                        {it.project?.number ?? '—'}
                        {it.vendorName ? ` · ${it.vendorName}` : ''}
                      </div>
                      <MoneyDisplay
                        amount={toNumber(it.amount)}
                        className={cn('text-right tabular-nums', it.collected ? 'text-text-tertiary line-through' : it.pending ? 'text-text-tertiary' : 'text-text-primary')}
                      />
                    </li>
                  ))}
                </ul>
                {(() => {
                  const orr: any = (data as any)?.otherReceivables ?? {};
                  const itemsOutstanding = toNumber(orr.itemsOutstanding ?? stats.otherReceivables);
                  const reconciling = toNumber(orr.reconcilingAdjustment ?? 0);
                  const glBalance = toNumber(orr.balance ?? stats.otherReceivables);
                  const hasRecon = Math.abs(reconciling) > 0.005;
                  return (
                    <>
                      {hasRecon && (
                        <>
                          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 px-3 py-2 border-t border-border-subtle text-sm">
                            <div className="col-span-3 text-text-tertiary uppercase text-[10px] tracking-[0.14em] self-center">
                              {t('accounting.accountsReceivable.itemsOutstanding', 'Itemised outstanding')}
                            </div>
                            <MoneyDisplay amount={itemsOutstanding} className="text-right text-text-secondary tabular-nums" />
                          </div>
                          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 px-3 py-2 text-sm">
                            <div className="col-span-3 text-text-tertiary uppercase text-[10px] tracking-[0.14em] self-center">
                              {t('accounting.accountsReceivable.reconcilingAdjustment', 'Manual GL adjustments')}
                            </div>
                            <MoneyDisplay amount={reconciling} className="text-right text-warning tabular-nums" />
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 px-3 py-2 border-t border-border-subtle bg-bg-sunken/20 text-sm">
                        <div className="col-span-3 text-text-tertiary uppercase text-[10px] tracking-[0.14em] self-center">
                          {hasRecon
                            ? t('accounting.accountsReceivable.glBalance', 'GL balance (1-2040)')
                            : t('accounting.accountsReceivable.outstandingTotal', 'Outstanding total')}
                        </div>
                        <MoneyDisplay amount={glBalance} className="text-right font-semibold text-text-primary tabular-nums" />
                      </div>
                    </>
                  );
                })()}
              </div>
            </GlassPanel>
          );
        })()}
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  ARTable — local, encapsulates the editorial column rhythm:         */
/*  mono number → narrative client → quiet dates → days overdue        */
/*  → bucket badge → right-aligned money. Footer aggregates total.     */
/* ------------------------------------------------------------------ */

interface ARTableProps {
  rows: ARRow[];
  total: number;
  onRowClick: (row: ARRow) => void;
}

function ARTable({ rows, total, onRowClick }: ARTableProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <DataTable<ARRow>
        data={rows}
        onRowClick={onRowClick}
        enablePagination
        columns={[
          {
            accessorKey: 'invoiceNumber',
            header: t('accounting.accountsReceivable.colNumber', 'Number'),
            cell: ({ row }) => (
              <span className="font-mono text-xs text-text-primary tracking-tight">
                {row.original.invoiceNumber || '—'}
              </span>
            ),
          },
          {
            id: 'client',
            header: t('accounting.accountsReceivable.colClient', 'Client'),
            accessorFn: (row) => row.client?.name ?? '',
            cell: ({ row }) => (
              <div className="min-w-0 text-sm text-text-primary truncate">
                {row.original.client?.name || '—'}
              </div>
            ),
          },
          {
            accessorKey: 'invoiceDate',
            header: t('accounting.accountsReceivable.colInvoiceDate', 'Invoice Date'),
            cell: ({ row }) => (
              <span className="text-text-tertiary">
                <DateDisplay date={row.original.invoiceDate} />
              </span>
            ),
          },
          {
            accessorKey: 'dueDate',
            header: t('accounting.accountsReceivable.colDueDate', 'Due Date'),
            cell: ({ row }) => {
              const over = (row.original.daysOverdue ?? 0) > 0;
              return (
                <span className={cn(over ? 'text-danger' : 'text-text-secondary')}>
                  <DateDisplay date={row.original.dueDate} />
                </span>
              );
            },
          },
          {
            accessorKey: 'daysOverdue',
            header: () => <span className="block text-center">{t('accounting.accountsReceivable.colDaysOverdue', 'Days Overdue')}</span>,
            cell: ({ row }) => {
              const d = row.original.daysOverdue ?? 0;
              if (d <= 0) {
                return <div className="text-center text-text-tertiary">—</div>;
              }
              return (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-danger font-medium tabular-nums">
                    <AlertTriangle className="h-3 w-3" />
                    {d} {t('accounting.accountsReceivable.daysUnit', 'days')}
                  </span>
                </div>
              );
            },
          },
          {
            accessorKey: 'agingBucket',
            header: t('accounting.accountsReceivable.colAging', 'Aging'),
            cell: ({ row }) => {
              const b = row.original.agingBucket ?? 'Current';
              return (
                <Badge variant={BUCKET_VARIANT[b] ?? 'secondary'}>
                  {BUCKET_ID_KEY[b] ? t(BUCKET_ID_KEY[b], BUCKET_ID_DEFAULT[b]) : b}
                </Badge>
              );
            },
          },
          {
            accessorKey: 'amount',
            header: () => <span className="block text-right">{t('accounting.accountsReceivable.colAmount', 'Amount')}</span>,
            cell: ({ row }) => (
              <div className="text-right">
                <MoneyDisplay
                  amount={toNumber(row.original.amount)}
                  className="text-text-primary"
                />
              </div>
            ),
          },
        ]}
      />
      {/* Totals row — sits below the table as an editorial colophon */}
      <div className="flex items-center justify-between px-4 py-3 rounded-md border border-border-subtle bg-bg-sunken">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
          {t('accounting.accountsReceivable.footerTotalReceivable', 'Total Receivable')}
        </span>
        <MoneyDisplay amount={total} className="text-text-primary text-base font-semibold" />
      </div>
    </div>
  );
}
