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
import { getPurchases, markPurchasePaid, exportPurchasesPDF, exportPurchasesExcel, type PurchaseRow } from '@/services/accounting';

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const CREATE_HREF = '/accounting/purchases/new';

export default function PurchaseReportPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pay dialog state.
  const [payTarget, setPayTarget] = useState<PurchaseRow | null>(null);
  const [cashAccount, setCashAccount] = useState<string>('1-1010');

  const isoDate = toLocalISODate(asOfDate);
  const startOfYear = useMemo(
    () => toLocalISODate(new Date(asOfDate.getFullYear(), 0, 1)),
    [asOfDate],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'purchases', startOfYear, isoDate],
    queryFn: () => getPurchases({ startDate: startOfYear, endDate: isoDate }),
  });

  const rows: PurchaseRow[] = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q
        || (r.description ?? '').toLowerCase().includes(q)
        || (r.number ?? '').toLowerCase().includes(q)
        || (r.vendorName ?? '').toLowerCase().includes(q)
        || (r.categoryName ?? '').toLowerCase().includes(q)
        || (r.categoryCode ?? '').toLowerCase().includes(q);
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
    mutationFn: ({ id, code }: { id: string; code: string }) => markPurchasePaid(id, code),
    onSuccess: (res) => {
      toast.success(
        t('accounting.purchaseReport.paidSuccess', 'Purchase settled ({{amt}}). All accounting pages updated.', {
          amt: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(res.amount),
        }),
      );
      setPayTarget(null);
      // The settlement posts a journal → refresh this list + every accounting page.
      queryClient.invalidateQueries({ queryKey: ['v2', 'purchases'] });
      invalidateAccountingQueries(queryClient);
      refetch();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('accounting.purchaseReport.paidFail', 'Failed to settle purchase.'));
    },
  });

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => { setSearchText(''); setStatusFilter('all'); };

  const handleExportPDF = async () => {
    try {
      await exportPurchasesPDF({ startDate: startOfYear, endDate: isoDate });
      toast.success(t('accounting.purchaseReport.exportPdfSuccess', 'PDF exported successfully.'));
    } catch {
      toast.error(t('accounting.purchaseReport.exportPdfFail', 'Failed to export PDF.'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportPurchasesExcel({ startDate: startOfYear, endDate: isoDate });
      toast.success(t('accounting.purchaseReport.exportExcelSuccess', 'Excel exported successfully.'));
    } catch {
      toast.error(t('accounting.purchaseReport.exportExcelFail', 'Failed to export Excel.'));
    }
  };

  return (
    <AppShell
      sidebar={{ brand: <MonomiBrand />, sections: v2SidebarSections, footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      topbar={{}}
    >
      <PageContainer>
        <PageHeader
          title={t('accounting.purchaseReport.title', 'Purchase Report')}
          description={t('accounting.purchaseReport.description', 'Purchases recorded as journal entries (Pembelian). Settle a payable with "Mark as Paid".')}
          breadcrumbs={[
            { label: t('accounting.purchaseReport.breadcrumb', 'Purchases') },
            { label: t('accounting.purchaseReport.title', 'Purchase Report') },
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
              <div className="w-[200px]">
                <MonomiDatePicker
                  value={asOfDate}
                  onChange={(d) => d && setAsOfDate(d)}
                  placeholder={t('accounting.purchaseReport.asOf', 'As of date')}
                />
              </div>
              <Button size="sm" onClick={() => navigate(CREATE_HREF)}>
                <Plus className="h-4 w-4" />
                {t('accounting.purchaseReport.newPurchase', '+ Pembelian')}
              </Button>
            </div>
          }
        />

        {error ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title={t('accounting.purchaseReport.errorTitle', 'Failed to load purchases')}
            description={error instanceof Error ? error.message : ''}
            action={<Button onClick={() => refetch()}>{t('accounting.purchaseReport.retry', 'Retry')}</Button>}
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
                    <StatCard label={t('accounting.purchaseReport.statTotal', 'Total Purchases')} value={<MoneyDisplay amount={stats.total} />} sublabel={t('accounting.purchaseReport.statTotalSub', 'this year')} />
                    <StatCard label={t('accounting.purchaseReport.statUnpaid', 'Unpaid')} value={<MoneyDisplay amount={stats.unpaid} className="text-danger" />} sublabel={t('accounting.purchaseReport.statUnpaidSub', 'outstanding payable')} />
                    <StatCard label={t('accounting.purchaseReport.statPaid', 'Paid')} value={<MoneyDisplay amount={stats.paid} />} sublabel={t('accounting.purchaseReport.statPaidSub', 'settled')} />
                    <StatCard label={t('accounting.purchaseReport.statCount', 'Purchases')} value={stats.count} sublabel={t('accounting.purchaseReport.statCountSub', 'records')} />
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
                    placeholder={t('accounting.purchaseReport.searchPlaceholder', 'Search by number, vendor, category or description...')}
                    className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]">
                      <SelectValue placeholder={t('accounting.purchaseReport.filterStatus', 'Status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('accounting.purchaseReport.filterAll', 'All')}</SelectItem>
                      <SelectItem value="UNPAID">{t('accounting.purchaseReport.statusUnpaid', 'Unpaid')}</SelectItem>
                      <SelectItem value="PAID">{t('accounting.purchaseReport.statusPaid', 'Paid')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-text-tertiary hover:text-text-primary">
                      <X className="h-3.5 w-3.5" /> {t('accounting.purchaseReport.reset', 'Reset')}
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
                  title={hasActiveFilters ? t('accounting.purchaseReport.noMatch', 'No matching purchases') : t('accounting.purchaseReport.empty', 'No purchases yet')}
                  description={hasActiveFilters ? t('accounting.purchaseReport.noMatchDesc', 'Try adjusting your filters.') : t('accounting.purchaseReport.emptyDesc', 'Record a purchase with + Pembelian.')}
                  action={
                    hasActiveFilters
                      ? <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.purchaseReport.reset', 'Reset')}</Button>
                      : <Button size="sm" onClick={() => navigate(CREATE_HREF)}><Plus className="h-4 w-4" /> {t('accounting.purchaseReport.newPurchase', '+ Pembelian')}</Button>
                  }
                />
              ) : (
                <div className="px-1 pb-1">
                  <DataTable<PurchaseRow>
                    data={filtered}
                    enablePagination
                    // Open the journal entries view filtered to this purchase's
                    // transactionId — shows the purchase journal AND its settlement.
                    onRowClick={(row) =>
                      navigate(`/accounting/journal-entries?search=${encodeURIComponent(row.transactionId)}`)
                    }
                    columns={[
                      {
                        accessorKey: 'number',
                        header: t('accounting.purchaseReport.colNumber', 'Number'),
                        cell: ({ row }) => <span className="text-sm font-medium text-text-primary tabular-nums">{row.original.number}</span>,
                      },
                      {
                        accessorKey: 'date',
                        header: t('accounting.purchaseReport.colDate', 'Date'),
                        cell: ({ row }) => <span className="text-text-tertiary"><DateDisplay date={row.original.date} /></span>,
                      },
                      {
                        accessorKey: 'vendorName',
                        header: t('accounting.purchaseReport.colVendor', 'Vendor'),
                        cell: ({ row }) => <span className="text-text-secondary text-sm">{row.original.vendorName || '—'}</span>,
                      },
                      {
                        accessorKey: 'categoryCode',
                        header: t('accounting.purchaseReport.colCategory', 'Category (COA)'),
                        cell: ({ row }) => (
                          <div className="min-w-0">
                            {row.original.categoryCode
                              ? <div className="text-sm text-text-primary truncate">
                                  <span className="tabular-nums text-text-tertiary">{row.original.categoryCode}</span>{' '}
                                  {row.original.categoryName}
                                </div>
                              : <span className="text-text-tertiary">—</span>}
                          </div>
                        ),
                      },
                      {
                        accessorKey: 'description',
                        header: t('accounting.purchaseReport.colDescription', 'Description'),
                        cell: ({ row }) => <span className="text-text-secondary text-sm truncate">{row.original.description || '—'}</span>,
                      },
                      {
                        accessorKey: 'amount',
                        header: () => <span className="block text-right">{t('accounting.purchaseReport.colAmount', 'Amount')}</span>,
                        cell: ({ row }) => <div className="text-right"><MoneyDisplay amount={toNumber(row.original.amount)} className="text-text-primary" /></div>,
                      },
                      {
                        id: 'status',
                        header: () => <span className="block text-right">{t('accounting.purchaseReport.colStatus', 'Status')}</span>,
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

      {/* Mark-as-paid dialog */}
      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounting.purchaseReport.payTitle', 'Mark purchase as paid')}</DialogTitle>
            <DialogDescription>
              {t('accounting.purchaseReport.payDesc', 'Posts a settlement journal (DR Accounts Payable / CR cash) and updates the GL, AP, cash & bank and every report.')}
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
                  {t('accounting.purchaseReport.payFrom', 'Pay from')}
                </label>
                <Select value={cashAccount} onValueChange={setCashAccount}>
                  <SelectTrigger className="bg-bg-sunken border-border-subtle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-1010"><span className="inline-flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> {t('accounting.purchaseReport.cash', 'Cash (Kas) · 1-1010')}</span></SelectItem>
                    <SelectItem value="1-1020"><span className="inline-flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> {t('accounting.purchaseReport.bank', 'Bank · 1-1020')}</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={payMutation.isPending}>
              {t('accounting.purchaseReport.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => payTarget && payMutation.mutate({ id: payTarget.id, code: cashAccount })}
              disabled={payMutation.isPending}
            >
              {payMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('accounting.purchaseReport.paying', 'Settling...')}</>
                : <><CheckCircle2 className="h-4 w-4" /> {t('accounting.purchaseReport.confirmPay', 'Mark as Paid')}</>}
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

function StatusCell({ row, onPay }: { row: PurchaseRow; onPay: (r: PurchaseRow) => void }) {
  const { t } = useTranslation();
  if (!row.isPosted) {
    return (
      <div className="flex justify-end">
        <Badge variant="outline">{t('accounting.purchaseReport.statusDraft', 'Draft')}</Badge>
      </div>
    );
  }
  if (row.paymentStatus === 'PAID') {
    return (
      <div className="flex justify-end">
        <Badge variant="secondary" className="bg-success/15 text-success border-success/20">
          <CheckCircle2 className="h-3 w-3" /> {t('accounting.purchaseReport.statusPaid', 'Paid')}
        </Badge>
      </div>
    );
  }
  return (
    <div className="flex justify-end items-center gap-2">
      <Badge variant="destructive">{t('accounting.purchaseReport.statusUnpaid', 'Unpaid')}</Badge>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        // stopPropagation: the row itself navigates to the related journals.
        onClick={(e) => { e.stopPropagation(); onPay(row); }}
      >
        {t('accounting.purchaseReport.markPaid', 'Mark as Paid')}
      </Button>
    </div>
  );
}
