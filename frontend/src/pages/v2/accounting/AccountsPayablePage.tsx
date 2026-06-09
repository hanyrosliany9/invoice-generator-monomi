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
  getAccountsPayableReport,
  exportAccountsPayablePDF,
  exportAccountsPayableExcel,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Bucket vocabulary                                                  */
/* ------------------------------------------------------------------ */

const BUCKET_ID_KEY: Record<string, string> = {
  'Current':     'accounting.accountsPayable.bucketCurrent',
  '1-30 days':   'accounting.accountsPayable.bucket1to30',
  '31-60 days':  'accounting.accountsPayable.bucket31to60',
  '61-90 days':  'accounting.accountsPayable.bucket61to90',
  'Over 90 days':'accounting.accountsPayable.bucketOver90',
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
/*  Row shape (AP aging endpoint)                                      */
/* ------------------------------------------------------------------ */

interface APRow {
  expenseId?: string;
  category?: { code?: string; name?: string; nameId?: string };
  expenseDate?: string;
  dueDate?: string;
  amount?: number | string;
  description?: string;
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

export default function AccountsPayablePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');

  const isoDate = toLocalISODate(asOfDate);
  // The AP report endpoint expects an endDate (and optional startDate).
  // We pin startDate to the start of the year so we still get the full
  // period of unpaid expenses without arbitrary truncation.
  const startOfYear = useMemo(
    () => toLocalISODate(new Date(asOfDate.getFullYear(), 0, 1)),
    [asOfDate],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'ap-report', isoDate],
    queryFn: () => getAccountsPayableReport({ startDate: startOfYear, endDate: isoDate }),
  });

  /* ----- derived: rows + filtering ----- */
  const rows: APRow[] = useMemo(() => data?.aging?.aging ?? [], [data]);

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const code = r.category?.code;
      const name = r.category?.nameId || r.category?.name;
      if (code && name) m.set(code, name);
    }
    return Array.from(m.entries()).map(([code, name]) => ({ code, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q
        || (r.description ?? '').toLowerCase().includes(q)
        || (r.category?.nameId ?? r.category?.name ?? '').toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || r.category?.code === categoryFilter;
      const matchesBucket = bucketFilter === 'all' || r.agingBucket === bucketFilter;
      return matchesSearch && matchesCategory && matchesBucket;
    });
  }, [rows, searchText, categoryFilter, bucketFilter]);

  /* ----- derived: KPI band ----- */
  const stats = useMemo(() => {
    const summary = data?.aging?.summary ?? data?.summary ?? {};
    const current = toNumber(summary.current);
    const overdue =
      toNumber(summary.days1to30) +
      toNumber(summary.days31to60) +
      toNumber(summary.days61to90) +
      toNumber(summary.over90);
    const total = toNumber(summary.totalAP ?? summary.totalOutstanding);
    return {
      total,
      current,
      overdue,
      categoryCount: data?.summary?.categoryCount ?? data?.topCategories?.length ?? 0,
    };
  }, [data]);

  const hasActiveFilters = !!searchText || categoryFilter !== 'all' || bucketFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setCategoryFilter('all');
    setBucketFilter('all');
  };

  const handleExportPDF = async () => {
    try {
      await exportAccountsPayablePDF({ startDate: startOfYear, endDate: isoDate });
      toast.success(t('accounting.accountsPayable.exportPdfSuccess'));
    } catch {
      toast.error(t('accounting.accountsPayable.exportPdfFail'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportAccountsPayableExcel({ startDate: startOfYear, endDate: isoDate });
      toast.success(t('accounting.accountsPayable.exportExcelSuccess'));
    } catch {
      toast.error(t('accounting.accountsPayable.exportExcelFail'));
    }
  };

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
            title={t('accounting.accountsPayable.errorTitle')}
            description={error instanceof Error ? error.message : t('accounting.accountsPayable.errorDesc')}
            action={<Button onClick={() => refetch()}>{t('accounting.accountsPayable.retry')}</Button>}
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
          title={t('accounting.accountsPayable.title')}
          description={t('accounting.accountsPayable.description')}
          breadcrumbs={[
            { label: t('accounting.accountsPayable.breadcrumbAccounting') },
            { label: t('accounting.accountsPayable.title') },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[200px]">
                <MonomiDatePicker
                  value={asOfDate}
                  onChange={(d) => d && setAsOfDate(d)}
                  placeholder={t('accounting.accountsPayable.asOfDatePlaceholder', 'As of date')}
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
                <StatCard
                  label={t('accounting.accountsPayable.statTotalPayable', 'Total Payable')}
                  value={<MoneyDisplay amount={stats.total} />}
                  sublabel={t('accounting.accountsPayable.statTotalPayableSub', 'open obligations as of reporting date')}
                />
                <StatCard
                  label={t('accounting.accountsPayable.statCurrent', 'Not Yet Due')}
                  value={<MoneyDisplay amount={stats.current} />}
                  sublabel={t('accounting.accountsPayable.statCurrentSub', 'still within payment period')}
                />
                <StatCard
                  label={t('accounting.accountsPayable.statOverdue', 'Overdue')}
                  value={<MoneyDisplay amount={stats.overdue} className="text-danger" />}
                  sublabel={t('accounting.accountsPayable.statOverdueSub', 'requires immediate settlement')}
                />
                <StatCard
                  label={t('accounting.accountsPayable.statCategoryCount', 'Category Count')}
                  value={stats.categoryCount}
                  sublabel={t('accounting.accountsPayable.statCategoryCountSub', 'with open balance')}
                />
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
                placeholder={t('accounting.accountsPayable.searchPlaceholder', 'Search by category or expense description...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]"
                >
                  <SelectValue placeholder={t('accounting.accountsPayable.filterCategoryLabel', 'Category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.accountsPayable.filterAllCategories', 'All Categories')}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bucketFilter} onValueChange={setBucketFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder={t('accounting.accountsPayable.filterAgingLabel', 'Aging')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accounting.accountsPayable.filterAllAging', 'All Ages')}</SelectItem>
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
              title={hasActiveFilters ? t('accounting.accountsPayable.noMatch') : t('accounting.accountsPayable.noPayables')}
              description={
                hasActiveFilters
                  ? t('accounting.accountsPayable.noMatchDesc')
                  : t('accounting.accountsPayable.noPayablesDesc')
              }
              action={
                hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.accountsPayable.resetFilter')}</Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <APTable
                rows={filtered}
                total={stats.total}
                onRowClick={(row) => row.expenseId && navigate(`/expenses/${row.expenseId}`)}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  APTable                                                            */
/* ------------------------------------------------------------------ */

interface APTableProps {
  rows: APRow[];
  total: number;
  onRowClick: (row: APRow) => void;
}

function APTable({ rows, total, onRowClick }: APTableProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <DataTable<APRow>
        data={rows}
        onRowClick={onRowClick}
        enablePagination
        columns={[
          {
            id: 'category',
            header: t('accounting.accountsPayable.colCategory', 'Category'),
            accessorFn: (row) => row.category?.nameId ?? row.category?.name ?? '',
            cell: ({ row }) => (
              <div className="min-w-0 text-sm text-text-primary truncate">
                {row.original.category?.nameId || row.original.category?.name || '—'}
              </div>
            ),
          },
          {
            accessorKey: 'description',
            header: t('accounting.accountsPayable.colDescription', 'Description'),
            cell: ({ row }) => (
              <span className="text-text-secondary text-sm truncate">
                {row.original.description || '—'}
              </span>
            ),
          },
          {
            accessorKey: 'expenseDate',
            header: t('accounting.accountsPayable.colExpenseDate', 'Expense Date'),
            cell: ({ row }) => (
              <span className="text-text-tertiary">
                <DateDisplay date={row.original.expenseDate} />
              </span>
            ),
          },
          {
            accessorKey: 'dueDate',
            header: t('accounting.accountsPayable.colDueDate', 'Due Date'),
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
            header: () => <span className="block text-center">{t('accounting.accountsPayable.colDaysOverdue', 'Days Overdue')}</span>,
            cell: ({ row }) => {
              const d = row.original.daysOverdue ?? 0;
              if (d <= 0) return <div className="text-center text-text-tertiary">—</div>;
              return (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-danger font-medium tabular-nums">
                    <AlertTriangle className="h-3 w-3" />
                    {d} {t('accounting.accountsPayable.daysUnit', 'days')}
                  </span>
                </div>
              );
            },
          },
          {
            accessorKey: 'agingBucket',
            header: t('accounting.accountsPayable.colAging', 'Aging'),
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
            header: () => <span className="block text-right">{t('accounting.accountsPayable.colAmount', 'Amount')}</span>,
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
      <div className="flex items-center justify-between px-4 py-3 rounded-md border border-border-subtle bg-bg-sunken">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
          {t('accounting.accountsPayable.footerTotalPayable', 'Total Payable')}
        </span>
        <MoneyDisplay amount={total} className="text-text-primary text-base font-semibold" />
      </div>
    </div>
  );
}
