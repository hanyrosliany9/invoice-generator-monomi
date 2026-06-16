import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Download, BookOpen,
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { useAuthStore } from '@/store/auth';
import {
  getAccountsReceivableAging,
  exportARAgingPDF,
  exportARAgingExcel,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Bucket vocabulary — five buckets in the order they read in the     */
/*  classic accounting report: youngest debt left, oldest right.       */
/* ------------------------------------------------------------------ */

type BucketKey = 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | 'Over 90 days';

const BUCKETS: { key: BucketKey; labelKey: string; labelDefault: string; tone: 'neutral' | 'warning' | 'danger' }[] = [
  { key: 'Current',      labelKey: 'accounting.arAging.bucketCurrent', labelDefault: 'Not Due', tone: 'neutral' },
  { key: '1-30 days',    labelKey: 'accounting.arAging.bucket1to30',   labelDefault: '1–30',   tone: 'neutral' },
  { key: '31-60 days',   labelKey: 'accounting.arAging.bucket31to60',  labelDefault: '31–60',  tone: 'warning' },
  { key: '61-90 days',   labelKey: 'accounting.arAging.bucket61to90',  labelDefault: '61–90',  tone: 'warning' },
  { key: 'Over 90 days', labelKey: 'accounting.arAging.bucketOver90',  labelDefault: '> 90',   tone: 'danger'  },
];

const TONE_CLASS: Record<'neutral' | 'warning' | 'danger', string> = {
  neutral: 'text-text-secondary',
  warning: 'text-warning',
  danger:  'text-danger',
};

/* ------------------------------------------------------------------ */
/*  Row shape                                                          */
/* ------------------------------------------------------------------ */

interface ARRow {
  invoiceId?: string;
  invoiceNumber?: string;
  client?: { id?: string; name?: string };
  amount?: number | string;
  agingBucket?: BucketKey | string;
}

interface ClientAging {
  clientId: string;
  clientName: string;
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

export default function ARAgingPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [fromDate, setFromDate] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState<Date>(new Date());

  const isoDate = toLocalISODate(toDate);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'ar-aging', isoDate],
    queryFn: () => getAccountsReceivableAging({ asOfDate: isoDate }),
  });

  /* ----- derived: client × bucket matrix.
     The backend returns invoice-level rows; the classic aging report
     groups by client. We do that here so the table reads as a true
     aging schedule (client name → five bucket cells → total). ----- */
  const matrix: ClientAging[] = useMemo(() => {
    const rows: ARRow[] = data?.aging ?? [];
    const map = new Map<string, ClientAging>();
    for (const r of rows) {
      const id = r.client?.id ?? '__unknown__';
      const name = r.client?.name ?? t('accounting.arAging.unknownClient', 'Unknown Client');
      const bucket = (r.agingBucket as BucketKey) ?? 'Current';
      const amt = toNumber(r.amount);
      let entry = map.get(id);
      if (!entry) {
        entry = {
          clientId: id,
          clientName: name,
          buckets: { 'Current': 0, '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, 'Over 90 days': 0 },
          total: 0,
        };
        map.set(id, entry);
      }
      entry.buckets[bucket] = (entry.buckets[bucket] ?? 0) + amt;
      entry.total += amt;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const summary = useMemo(() => {
    const s = data?.summary ?? {};
    return {
      total: toNumber(s.totalAR),
      'Current':      toNumber(s.current),
      '1-30 days':    toNumber(s.days1to30),
      '31-60 days':   toNumber(s.days31to60),
      '61-90 days':   toNumber(s.days61to90),
      'Over 90 days': toNumber(s.over90),
    } as { total: number } & Record<BucketKey, number>;
  }, [data]);

  const handleExportPDF = async () => {
    try {
      await exportARAgingPDF({ asOfDate: isoDate });
      toast.success(t('accounting.arAging.exportPdfSuccess'));
    } catch {
      toast.error(t('accounting.arAging.exportPdfFail'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportARAgingExcel({ asOfDate: isoDate });
      toast.success(t('accounting.arAging.exportExcelSuccess'));
    } catch {
      toast.error(t('accounting.arAging.exportExcelFail'));
    }
  };

  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>
        <PageHeader
          title={t('accounting.arAging.title')}
          description={t('accounting.arAging.description')}
          breadcrumbs={[
            { label: t('accounting.arAging.breadcrumbAccounting') },
            { label: t('accounting.arAging.title') },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-[150px]">
                  <MonomiDatePicker value={fromDate} onChange={(d) => d && setFromDate(d)} placeholder={t('common.fromDate', 'Dari')} />
                </div>
                <span className="text-text-tertiary text-xs">→</span>
                <div className="w-[150px]">
                  <MonomiDatePicker value={toDate} onChange={(d) => d && setToDate(d)} placeholder={t('common.toDate', 'Sampai')} />
                </div>
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

        {error ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title={t('accounting.arAging.errorTitle')}
            description={error instanceof Error ? error.message : t('accounting.arAging.errorDesc')}
            action={<Button onClick={() => refetch()}>{t('accounting.arAging.retry')}</Button>}
          />
        ) : (
          <>
            {/* ─────────────────────────────────────────────────────────────
                KPI band — five bucket totals. Same width, tighter gap, so
                they read as the executive summary of the matrix below.
               ───────────────────────────────────────────────────────────── */}
            <section className="mb-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {isLoading
                  ? BUCKETS.map((b) => (
                      <Skeleton key={b.key} className="h-[108px] rounded-lg" />
                    ))
                  : BUCKETS.map((b) => (
                      <StatCard
                        key={b.key}
                        label={t(b.labelKey, b.labelDefault)}
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

            {/* ─────────────────────────────────────────────────────────────
                Matrix table — client rows, bucket columns. Single panel,
                sticky header band, totals row at the bottom in a quiet inset.
               ───────────────────────────────────────────────────────────── */}
            <GlassPanel surface="glass" padding="none" className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <div className="text-sm font-display font-semibold text-text-primary">
                    {t('accounting.arAging.panelTitle')}
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {t('accounting.arAging.clientCount', { count: matrix.length })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                    {t('accounting.arAging.totalReceivable')}
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
                  title={t('accounting.arAging.noReceivables')}
                  description={t('accounting.arAging.noReceivablesDesc')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-max w-full font-body text-sm">
                    <thead className="border-b border-border-subtle">
                      <tr>
                        <th className="text-left text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary px-4 py-3">
                          Klien
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
                            {t(b.labelKey, b.labelDefault)}
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
                          key={row.clientId}
                          className="border-b border-border-subtle/60 last:border-0 hover:bg-accent-navy-soft transition-colors cursor-pointer"
                          onClick={() => navigate(`/invoices?clientId=${row.clientId}`)}
                          title={t('accounting.arAging.viewInvoicesTitle', 'View invoices for this client')}
                        >
                          <td className="px-4 py-3.5 text-text-primary underline-offset-2 hover:underline">{row.clientName}</td>
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
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
