import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAccountingQueries } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, X, Wallet, Landmark, BookOpen, Loader2, CheckCircle2, Download,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import {
  getSales, markSalePaid, exportSalesPDF, exportSalesExcel, type SaleRow,
} from '@/services/accounting';
import { invoiceService } from '@/services/invoices';

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const CREATE_HREF = '/accounting/sales/new';

export default function SalesReportPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [fromDate, setFromDate] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mark-as-collected dialog state.
  const [payTarget, setPayTarget] = useState<SaleRow | null>(null);
  const [cashAccount, setCashAccount] = useState<string>('1-1010');

  const fromIso = toLocalISODate(fromDate);
  const toIso = toLocalISODate(toDate);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'sales', fromIso, toIso],
    queryFn: () => getSales({ startDate: fromIso, endDate: toIso }),
  });

  const rows: SaleRow[] = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q
        || (r.description ?? '').toLowerCase().includes(q)
        || (r.number ?? '').toLowerCase().includes(q)
        || (r.clientName ?? '').toLowerCase().includes(q)
        || (r.revenueCode ?? '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' || r.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchText, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + toNumber(r.amount), 0);
    const unpaid = rows
      .filter((r) => r.paymentStatus === 'UNPAID')
      .reduce((s, r) => s + toNumber(r.amount), 0);
    return {
      total,
      unpaid,
      paid: total - unpaid,
      count: rows.length,
    };
  }, [rows]);

  const payMutation = useMutation({
    // Direct sales settle via the accounting endpoint (cash/bank choice); invoices
    // settle through their own mark-paid flow (paymentMethod), which posts the
    // payment journal. Both refresh the report + every accounting page.
    mutationFn: ({ row, code }: { row: SaleRow; code: string }) =>
      row.sourceType === 'INVOICE'
        ? invoiceService
            .markAsPaid(row.id, { paymentMethod: code === '1-1020' ? 'BANK' : 'CASH' })
            .then(() => ({ amount: row.amount }))
        : markSalePaid(row.id, code),
    onSuccess: (res) => {
      toast.success(
        t('accounting.salesReport.paidSuccess', 'Sale collected ({{amt}}). All accounting pages updated.', {
          amt: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(res.amount),
        }),
      );
      setPayTarget(null);
      queryClient.invalidateQueries({ queryKey: ['v2', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      invalidateAccountingQueries(queryClient);
      refetch();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('accounting.salesReport.paidFail', 'Failed to collect sale.'));
    },
  });

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => { setSearchText(''); setStatusFilter('all'); };

  const handleExportPDF = async () => {
    try {
      await exportSalesPDF({ startDate: fromIso, endDate: toIso });
      toast.success(t('accounting.salesReport.exportPdfSuccess', 'PDF exported successfully.'));
    } catch {
      toast.error(t('accounting.salesReport.exportPdfFail', 'Failed to export PDF.'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportSalesExcel({ startDate: fromIso, endDate: toIso });
      toast.success(t('accounting.salesReport.exportExcelSuccess', 'Excel exported successfully.'));
    } catch {
      toast.error(t('accounting.salesReport.exportExcelFail', 'Failed to export Excel.'));
    }
  };

  return (
    <AppShell
      sidebar={{ brand: <MonomiBrand />, sections: v2SidebarSections, footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      topbar={{}}
    >
      <PageContainer>
        <PageHeader
          title={t('accounting.salesReport.title', 'Sales Report')}
          description={t('accounting.salesReport.description', 'Sales recorded as journal entries (Penjualan). Collect a receivable with "Mark as Paid".')}
          breadcrumbs={[
            { label: t('accounting.salesReport.breadcrumb', 'Sales') },
            { label: t('accounting.salesReport.title', 'Sales Report') },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-[150px]">
                  <MonomiDatePicker
                    value={fromDate}
                    onChange={(d) => d && setFromDate(d)}
                    placeholder={t('common.fromDate', 'Dari')}
                  />
                </div>
                <span className="text-text-tertiary text-xs">→</span>
                <div className="w-[150px]">
                  <MonomiDatePicker
                    value={toDate}
                    onChange={(d) => d && setToDate(d)}
                    placeholder={t('common.toDate', 'Sampai')}
                  />
                </div>
              </div>
              <Button size="sm" onClick={() => navigate(CREATE_HREF)}>
                <Plus className="h-4 w-4" />
                {t('accounting.salesReport.newSale', '+ Penjualan')}
              </Button>
            </div>
          }
        />

        {error ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title={t('accounting.salesReport.errorTitle', 'Failed to load sales')}
            description={error instanceof Error ? error.message : ''}
            action={<Button onClick={() => refetch()}>{t('accounting.salesReport.retry', 'Retry')}</Button>}
          />
        ) : (
          <>
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
                    <StatCard label={t('accounting.salesReport.statTotal', 'Total Sales')} value={<MoneyDisplay amount={stats.total} />} sublabel={t('accounting.salesReport.statTotalSub', 'this year')} />
                    <StatCard label={t('accounting.salesReport.statUnpaid', 'Unpaid')} value={<MoneyDisplay amount={stats.unpaid} className="text-danger" />} sublabel={t('accounting.salesReport.statUnpaidSub', 'outstanding receivable')} />
                    <StatCard label={t('accounting.salesReport.statPaid', 'Paid')} value={<MoneyDisplay amount={stats.paid} />} sublabel={t('accounting.salesReport.statPaidSub', 'collected')} />
                    <StatCard label={t('accounting.salesReport.statCount', 'Sales')} value={stats.count} sublabel={t('accounting.salesReport.statCountSub', 'records')} />
                  </>
                )}
              </div>
            </section>

            <GlassPanel surface="glass" padding="none" className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder={t('accounting.salesReport.searchPlaceholder', 'Search by number, client or description...')}
                    className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]">
                      <SelectValue placeholder={t('accounting.salesReport.filterStatus', 'Status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('accounting.salesReport.filterAll', 'All')}</SelectItem>
                      <SelectItem value="UNPAID">{t('accounting.salesReport.statusUnpaid', 'Unpaid')}</SelectItem>
                      <SelectItem value="PAID">{t('accounting.salesReport.statusPaid', 'Paid')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-text-tertiary hover:text-text-primary">
                      <X className="h-3.5 w-3.5" /> {t('accounting.salesReport.reset', 'Reset')}
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-5 space-y-2">
                  {Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-10 rounded" />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<BookOpen />}
                  title={hasActiveFilters ? t('accounting.salesReport.noMatch', 'No matching sales') : t('accounting.salesReport.empty', 'No sales yet')}
                  description={hasActiveFilters ? t('accounting.salesReport.noMatchDesc', 'Try adjusting your filters.') : t('accounting.salesReport.emptyDesc', 'Record a sale with + Penjualan.')}
                  action={
                    hasActiveFilters
                      ? <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.salesReport.reset', 'Reset')}</Button>
                      : <Button size="sm" onClick={() => navigate(CREATE_HREF)}><Plus className="h-4 w-4" /> {t('accounting.salesReport.newSale', '+ Penjualan')}</Button>
                  }
                />
              ) : (
                <div className="px-1 pb-1">
                  <DataTable<SaleRow>
                    data={filtered}
                    enablePagination
                    onRowClick={(row) =>
                      navigate(`/accounting/journal-entries?search=${encodeURIComponent(row.transactionId)}`)
                    }
                    columns={[
                      {
                        accessorKey: 'number',
                        header: t('accounting.salesReport.colNumber', 'Number'),
                        cell: ({ row }) => <span className="text-sm font-medium text-text-primary tabular-nums">{row.original.number}</span>,
                      },
                      {
                        accessorKey: 'clientName',
                        header: t('accounting.salesReport.colClient', 'Client'),
                        cell: ({ row }) => <span className="text-text-secondary text-sm">{row.original.clientName || '—'}</span>,
                      },
                      {
                        accessorKey: 'description',
                        header: t('accounting.salesReport.colDescription', 'Description'),
                        cell: ({ row }) => <span className="text-text-secondary text-sm truncate">{row.original.description || '—'}</span>,
                      },
                      {
                        accessorKey: 'issuedDate',
                        header: t('accounting.salesReport.colIssuedDate', 'Issued Date'),
                        cell: ({ row }) => <span className="text-text-tertiary"><DateDisplay date={row.original.issuedDate} /></span>,
                      },
                      {
                        accessorKey: 'dueDate',
                        header: t('accounting.salesReport.colDueDate', 'Due Date'),
                        cell: ({ row }) => <span className="text-text-tertiary"><DateDisplay date={row.original.dueDate} /></span>,
                      },
                      {
                        accessorKey: 'amount',
                        header: () => <span className="block text-right">{t('accounting.salesReport.colAmount', 'Amount')}</span>,
                        cell: ({ row }) => <div className="text-right"><MoneyDisplay amount={toNumber(row.original.amount)} className="text-text-primary" /></div>,
                      },
                      {
                        id: 'status',
                        header: () => <span className="block text-right">{t('accounting.salesReport.colStatus', 'Status')}</span>,
                        cell: ({ row }) => <StatusCell row={row.original} onPay={(r) => { setPayTarget(r); setCashAccount('1-1010'); }} />,
                      },
                    ]}
                  />
                </div>
              )}
            </GlassPanel>
          </>
        )}
      </PageContainer>

      {/* Mark-as-collected dialog */}
      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounting.salesReport.payTitle', 'Mark sale as paid')}</DialogTitle>
            <DialogDescription>
              {t('accounting.salesReport.payDesc', 'Posts a settlement journal (DR cash / CR Accounts Receivable) and updates the GL, AR, cash & bank and every report.')}
            </DialogDescription>
          </DialogHeader>

          {payTarget && (
            <div className="space-y-4">
              <div className="rounded-md border border-border-subtle bg-bg-sunken px-4 py-3 text-sm">
                <div className="flex justify-between"><span className="text-text-tertiary">{payTarget.number}</span><MoneyDisplay amount={toNumber(payTarget.amount)} className="text-text-primary font-semibold" /></div>
                <div className="text-text-secondary mt-1 truncate">{payTarget.description}</div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-text-tertiary mb-1.5 block">
                  {t('accounting.salesReport.payTo', 'Collect into')}
                </label>
                <Select value={cashAccount} onValueChange={setCashAccount}>
                  <SelectTrigger className="bg-bg-sunken border-border-subtle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-1010"><span className="inline-flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> {t('accounting.salesReport.cash', 'Cash (Kas) · 1-1010')}</span></SelectItem>
                    <SelectItem value="1-1020"><span className="inline-flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> {t('accounting.salesReport.bank', 'Bank · 1-1020')}</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={payMutation.isPending}>
              {t('accounting.salesReport.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => payTarget && payMutation.mutate({ row: payTarget, code: cashAccount })}
              disabled={payMutation.isPending}
            >
              {payMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('accounting.salesReport.paying', 'Collecting...')}</>
                : <><CheckCircle2 className="h-4 w-4" /> {t('accounting.salesReport.confirmPay', 'Mark as Paid')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Status cell                                                        */
/* ------------------------------------------------------------------ */

function StatusCell({ row, onPay }: { row: SaleRow; onPay: (r: SaleRow) => void }) {
  const { t } = useTranslation();
  if (!row.isPosted) {
    return (
      <div className="flex justify-end">
        <Badge variant="outline">{t('accounting.salesReport.statusDraft', 'Draft')}</Badge>
      </div>
    );
  }
  if (row.paymentStatus === 'PAID') {
    return (
      <div className="flex justify-end">
        <Badge variant="secondary" className="bg-success/15 text-success border-success/20">
          <CheckCircle2 className="h-3 w-3" /> {t('accounting.salesReport.statusPaid', 'Paid')}
        </Badge>
      </div>
    );
  }
  return (
    <div className="flex justify-end items-center gap-2">
      <Badge variant="destructive">{t('accounting.salesReport.statusUnpaid', 'Unpaid')}</Badge>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={(e) => { e.stopPropagation(); onPay(row); }}
      >
        {t('accounting.salesReport.markPaid', 'Mark as Paid')}
      </Button>
    </div>
  );
}
