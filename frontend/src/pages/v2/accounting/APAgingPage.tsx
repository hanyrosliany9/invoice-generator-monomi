import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Download, BookOpen,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { useAuthStore } from '@/store/auth';
import {
  getAccountsPayableAging,
  exportAPAgingPDF,
  exportAPAgingExcel,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Bucket vocabulary                                                  */
/* ------------------------------------------------------------------ */

type BucketKey = 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | 'Over 90 days';

const BUCKETS: { key: BucketKey; label: string; tone: 'neutral' | 'warning' | 'danger' }[] = [
  { key: 'Current',      label: 'Belum J.T.', tone: 'neutral' },
  { key: '1-30 days',    label: '1–30',       tone: 'neutral' },
  { key: '31-60 days',   label: '31–60',      tone: 'warning' },
  { key: '61-90 days',   label: '61–90',      tone: 'warning' },
  { key: 'Over 90 days', label: '> 90',       tone: 'danger'  },
];

const TONE_CLASS: Record<'neutral' | 'warning' | 'danger', string> = {
  neutral: 'text-text-secondary',
  warning: 'text-warning',
  danger:  'text-danger',
};

/* ------------------------------------------------------------------ */
/*  Row shape                                                          */
/* ------------------------------------------------------------------ */

interface APRow {
  expenseId?: string;
  category?: { code?: string; name?: string; nameId?: string };
  amount?: number | string;
  agingBucket?: BucketKey | string;
}

interface CategoryAging {
  categoryCode: string;
  categoryName: string;
  buckets: Record<BucketKey, number>;
  total: number;
}

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function APAgingPageV2() {
  const user = useAuthStore((state) => state.user);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const isoDate = asOfDate.toISOString().slice(0, 10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'ap-aging', isoDate],
    queryFn: () => getAccountsPayableAging({ asOfDate: isoDate }),
  });

  /* ----- derived: category × bucket matrix.
     AP doesn't have "vendors" attached to expenses in this schema —
     we group by expense category, which is the natural payable bucket
     for an Indonesian SMB books-of-account view. ----- */
  const matrix: CategoryAging[] = useMemo(() => {
    const rows: APRow[] = data?.aging ?? [];
    const map = new Map<string, CategoryAging>();
    for (const r of rows) {
      const code = r.category?.code ?? '__unknown__';
      const name = r.category?.nameId || r.category?.name || 'Kategori tidak diketahui';
      const bucket = (r.agingBucket as BucketKey) ?? 'Current';
      const amt = toNumber(r.amount);
      let entry = map.get(code);
      if (!entry) {
        entry = {
          categoryCode: code,
          categoryName: name,
          buckets: { 'Current': 0, '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, 'Over 90 days': 0 },
          total: 0,
        };
        map.set(code, entry);
      }
      entry.buckets[bucket] = (entry.buckets[bucket] ?? 0) + amt;
      entry.total += amt;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const summary = useMemo(() => {
    const s = data?.summary ?? {};
    return {
      total: toNumber(s.totalAP),
      'Current':      toNumber(s.current),
      '1-30 days':    toNumber(s.days1to30),
      '31-60 days':   toNumber(s.days31to60),
      '61-90 days':   toNumber(s.days61to90),
      'Over 90 days': toNumber(s.over90),
    } as { total: number } & Record<BucketKey, number>;
  }, [data]);

  const handleExportPDF = async () => {
    try {
      await exportAPAgingPDF({ asOfDate: isoDate });
      toast.success('Laporan PDF berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportAPAgingExcel({ asOfDate: isoDate });
      toast.success('Laporan Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh Excel');
    }
  };

  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
          items: sidebarItems,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{ right: <Button variant="ghost" size="sm">{user?.name || 'User'}</Button> }}
      >
        <PageContainer>
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="Tidak bisa memuat aging hutang"
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: <Button variant="ghost" size="sm">{user?.name || 'User'}</Button> }}
    >
      <PageContainer>
        <PageHeader
          title="Aging Hutang"
          description="Analisis umur hutang per kategori — semakin tua bucket, semakin mendesak untuk dilunasi."
          breadcrumbs={[
            { label: 'Akuntansi' },
            { label: 'Aging Hutang' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <div className="w-[200px]">
                <MonomiDatePicker
                  value={asOfDate}
                  onChange={(d) => d && setAsOfDate(d)}
                  placeholder="Per tanggal"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {isLoading
              ? BUCKETS.map((b) => (
                  <Skeleton key={b.key} className="h-[108px] rounded-lg" />
                ))
              : BUCKETS.map((b) => (
                  <StatCard
                    key={b.key}
                    label={b.label}
                    value={
                      <MoneyDisplay
                        amount={summary[b.key]}
                        className={cn(TONE_CLASS[b.tone])}
                      />
                    }
                    sublabel={
                      summary.total > 0
                        ? `${((summary[b.key] / summary.total) * 100).toFixed(1)}%`
                        : '—'
                    }
                  />
                ))}
          </div>
        </section>

        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <div className="text-sm font-display font-semibold text-text-primary">
                Aging per Kategori
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {matrix.length} kategori dengan saldo terbuka
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                Total Hutang
              </div>
              <div className="mt-1">
                <MoneyDisplay amount={summary.total} className="text-text-primary text-base font-semibold" />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : matrix.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="Tidak ada hutang terbuka"
              description="Semua kewajiban telah diselesaikan per tanggal ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead className="border-b border-border-subtle">
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary px-4 py-3">
                      Kategori
                    </th>
                    {BUCKETS.map((b) => (
                      <th
                        key={b.key}
                        className={cn(
                          'text-right text-[10px] uppercase tracking-[0.14em] font-medium px-4 py-3',
                          b.tone === 'danger'
                            ? 'text-danger'
                            : b.tone === 'warning'
                            ? 'text-warning'
                            : 'text-text-tertiary',
                        )}
                      >
                        {b.label}
                      </th>
                    ))}
                    <th className="text-right text-[10px] uppercase tracking-[0.14em] font-medium text-text-secondary px-4 py-3">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr
                      key={row.categoryCode}
                      className="border-b border-border-subtle/60 last:border-0 hover:bg-accent-navy-soft transition-colors"
                    >
                      <td className="px-4 py-3.5 text-text-primary">{row.categoryName}</td>
                      {BUCKETS.map((b) => {
                        const v = row.buckets[b.key];
                        return (
                          <td
                            key={b.key}
                            className={cn(
                              'px-4 py-3.5 text-right',
                              v === 0
                                ? 'text-text-tertiary'
                                : b.tone === 'danger'
                                ? 'text-danger'
                                : b.tone === 'warning'
                                ? 'text-warning'
                                : 'text-text-secondary',
                            )}
                          >
                            {v === 0 ? '—' : <MoneyDisplay amount={v} />}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3.5 text-right text-text-primary font-medium">
                        <MoneyDisplay amount={row.total} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border-default bg-bg-sunken">
                  <tr>
                    <td className="px-4 py-3.5 text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
                      Total
                    </td>
                    {BUCKETS.map((b) => (
                      <td
                        key={b.key}
                        className={cn(
                          'px-4 py-3.5 text-right font-medium',
                          b.tone === 'danger'
                            ? 'text-danger'
                            : b.tone === 'warning'
                            ? 'text-warning'
                            : 'text-text-secondary',
                        )}
                      >
                        <MoneyDisplay amount={summary[b.key]} />
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-right text-text-primary font-semibold">
                      <MoneyDisplay amount={summary.total} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}
