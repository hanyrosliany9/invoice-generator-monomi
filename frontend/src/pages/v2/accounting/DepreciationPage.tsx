import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Play, Eye, RefreshCw, TrendingDown, Package, Calendar, DollarSign,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import {
  type DepreciationSummary,
  getDepreciationSummary,
  processMonthlyDepreciation,
} from '@/services/accounting';
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

const yearsInUse = (purchaseDate?: string | null): number => {
  if (!purchaseDate) return 0;
  const ms = Date.now() - new Date(purchaseDate).getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const fmt = (d: Date) => toLocalISODate(d);

/* ------------------------------------------------------------------ */
/*  Asset row type (from DepreciationSummary.byAsset)                 */
/* ------------------------------------------------------------------ */

type AssetRow = DepreciationSummary['byAsset'][number];

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

export default function DepreciationPageV2() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate,   setEndDate]   = useState<Date>(endOfMonth(today));

  /* ----- process dialog ----- */
  const [processOpen, setProcessOpen]  = useState(false);
  const [processDate, setProcessDate]  = useState<Date>(today);
  const [autoPost,    setAutoPost]     = useState<'manual' | 'auto'>('manual');

  /* ----- detail dialog ----- */
  const [detailAsset, setDetailAsset] = useState<AssetRow | null>(null);

  /* ----- query ----- */
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['depreciation-summary', fmt(startDate), fmt(endDate)],
    queryFn:  () => getDepreciationSummary({ startDate: fmt(startDate), endDate: fmt(endDate) }),
    enabled:  true,
  });

  /* ----- mutation ----- */
  const processMutation = useMutation({
    mutationFn: processMonthlyDepreciation,
    onSuccess: (data) => {
      toast.success(t('accounting.depreciation.processSuccess', { count: data.processed, posted: data.posted }));
      queryClient.invalidateQueries({ queryKey: ['depreciation-summary'] });
      setProcessOpen(false);
    },
    onError: () => toast.error(t('accounting.depreciation.processFail')),
  });

  /* ----- derived KPIs ----- */
  const kpis = useMemo(() => {
    const byAsset = summary?.byAsset ?? [];
    const totalAccumulated = byAsset.reduce((a, r) => a + toNumber(r.accumulatedDepreciation), 0);
    const monthlyDep = toNumber(summary?.totalDepreciation);
    const assetCount = toNumber(summary?.assetCount);
    return { monthlyDep, totalAccumulated, assetCount };
  }, [summary]);

  const nextRunDate = useMemo(() => {
    const d = new Date(endDate);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d;
  }, [endDate]);

  if (error) {
    return (
      <PageShell user={user}>
        <EmptyState
          icon={<TrendingDown className="h-12 w-12" />}
          title={t('accounting.depreciation.errorTitle')}
          description={error instanceof Error ? error.message : t('accounting.depreciation.errorGeneric')}
          action={<Button onClick={() => refetch()}>{t('accounting.depreciation.retry')}</Button>}
        />
      </PageShell>
    );
  }

  const byAsset = summary?.byAsset ?? [];

  return (
    <PageShell user={user}>
      <PageHeader
        title={t('accounting.depreciation.title')}
        description={t('accounting.depreciation.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              {t('accounting.depreciation.refresh')}
            </Button>
            <Button size="sm" onClick={() => setProcessOpen(true)}>
              <Play className="h-4 w-4" />
              {t('accounting.depreciation.process')}
            </Button>
          </div>
        }
      />

      {/* ── KPI band ─────────────────────────────────────────────── */}
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
                label={t('accounting.depreciation.statAssets', 'Depreciated Assets')}
                value={
                  <span className="text-2xl font-display font-semibold text-text-primary">
                    {kpis.assetCount}
                  </span>
                }
                sublabel={t('accounting.depreciation.statAssetsSub', 'assets with active schedule')}
              />
              <StatCard
                label={t('accounting.depreciation.statAccumulated', 'Total Accumulated')}
                value={<MoneyDisplay amount={kpis.totalAccumulated} className="text-danger" />}
                sublabel={t('accounting.depreciation.statAccumulatedSub', 'accumulated depreciation')}
              />
              <StatCard
                label={t('accounting.depreciation.statPeriod', 'Period Depreciation')}
                value={<MoneyDisplay amount={kpis.monthlyDep} className="text-warning" />}
                sublabel={t('accounting.depreciation.statPeriodSub', 'depreciation value this period')}
              />
              <StatCard
                label={t('accounting.depreciation.statNextRun', 'Next Run')}
                value={
                  <span className="text-base font-display font-semibold text-text-primary">
                    <DateDisplay date={nextRunDate.toISOString()} />
                  </span>
                }
                sublabel={t('accounting.depreciation.statNextRunSub', 'estimated depreciation run')}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Filter + table ───────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Period filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary shrink-0">
            {t('accounting.depreciation.period', 'Period')}
          </span>
          <div className="flex items-center gap-2">
            <MonomiDatePicker
              value={startDate}
              onChange={(d) => d && setStartDate(d)}
              placeholder={t('accounting.depreciation.startDate', 'Start date')}
              className="h-9 text-sm bg-bg-sunken border-border-subtle"
            />
            <span className="text-text-tertiary text-xs">—</span>
            <MonomiDatePicker
              value={endDate}
              onChange={(d) => d && setEndDate(d)}
              placeholder={t('accounting.depreciation.endDate', 'End date')}
              className="h-9 text-sm bg-bg-sunken border-border-subtle"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : byAsset.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={t('accounting.depreciation.noData')}
            description={t('accounting.depreciation.noDataDesc')}
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<AssetRow>
              data={byAsset}
              onRowClick={setDetailAsset}
              columns={[
                {
                  id: 'asset',
                  header: t('accounting.depreciation.colAsset', 'Asset'),
                  accessorFn: (r) => r.assetName,
                  cell: ({ row }) => (
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary truncate">{row.original.assetName}</div>
                      <div className="text-xs text-text-tertiary mt-0.5 font-mono">
                        {row.original.assetCode}
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'yearsInUse',
                  header: t('accounting.depreciation.colYearsInUse', 'Years in Use'),
                  cell: ({ row }) => (
                    <span className="text-sm text-text-secondary">
                      {yearsInUse(row.original.purchaseDate)} {t('accounting.depreciation.yr', 'yr')}
                    </span>
                  ),
                },
                {
                  accessorKey: 'purchasePrice',
                  header: () => <span className="block text-right">{t('accounting.depreciation.colPurchasePrice', 'Cost')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.purchasePrice)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'usefulLifeYears',
                  header: t('accounting.depreciation.colUsefulLife', 'Useful Life'),
                  cell: ({ row }) => (
                    <span className="text-sm text-text-secondary">
                      {row.original.usefulLifeYears ?? '—'} {t('accounting.depreciation.yr', 'yr')}
                    </span>
                  ),
                },
                {
                  accessorKey: 'depreciationAmount',
                  header: () => <span className="block text-right">{t('accounting.depreciation.colPeriodDep', 'Period Dep.')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.depreciationAmount)} className="text-warning" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'accumulatedDepreciation',
                  header: () => <span className="block text-right">{t('accounting.depreciation.colAccumulated', 'Accumulated')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.accumulatedDepreciation)} className="text-danger" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'netBookValue',
                  header: () => <span className="block text-right">{t('accounting.depreciation.colNetBook', 'Net Book Value')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.netBookValue)} className="text-success" />
                    </div>
                  ),
                },
                {
                  id: 'status',
                  header: t('accounting.depreciation.colStatus', 'Status'),
                  cell: ({ row }) => (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        toNumber(row.original.netBookValue) > 0
                          ? 'text-success border-success/30'
                          : 'text-text-tertiary border-border-subtle',
                      )}
                    >
                      {toNumber(row.original.netBookValue) > 0 ? t('accounting.depreciation.statusActive', 'Active') : t('accounting.depreciation.statusExpired', 'Expired')}
                    </Badge>
                  ),
                },
                {
                  id: 'detail',
                  header: () => <span className="sr-only">Detail</span>,
                  cell: ({ row }) => (
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-text-primary"
                        onClick={() => setDetailAsset(row.original)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </GlassPanel>

      {/* ── Process dialog ───────────────────────────────────────── */}
      <Dialog open={processOpen} onOpenChange={(o) => { if (!o) setProcessOpen(false); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Play className="h-4 w-4 text-text-tertiary" />
              {t('accounting.depreciation.processDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.depreciation.processDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.depreciation.processFieldDate', 'Period Date')}
              </label>
              <MonomiDatePicker
                value={processDate}
                onChange={(d) => d && setProcessDate(d)}
                className="w-full h-9 bg-bg-sunken border-border-subtle"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.depreciation.processFieldPosting', 'Posting Option')}
              </label>
              <Select
                value={autoPost}
                onValueChange={(v) => setAutoPost(v as 'manual' | 'auto')}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('accounting.depreciation.saveDraft')}</SelectItem>
                  <SelectItem value="auto">{t('accounting.depreciation.autoPost')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border-l-2 border-info bg-info/5 px-4 py-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('accounting.depreciation.processInfo')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessOpen(false)}
              disabled={processMutation.isPending}
            >
              {t('accounting.depreciation.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() =>
                processMutation.mutate({
                  periodDate: fmt(processDate),
                  autoPost: autoPost === 'auto',
                })
              }
              disabled={processMutation.isPending}
            >
              {processMutation.isPending ? t('accounting.depreciation.processing') : t('accounting.depreciation.processNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail dialog ────────────────────────────────────────── */}
      <Dialog open={!!detailAsset} onOpenChange={(o) => { if (!o) setDetailAsset(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.depreciation.detailTitle')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {detailAsset?.assetCode} — {detailAsset?.assetName}
            </DialogDescription>
          </DialogHeader>

          {detailAsset && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailRow label={t('accounting.depreciation.detailAssetName', 'Asset Name')} wide>
                <span className="font-medium text-text-primary">{detailAsset.assetName}</span>
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailAssetCode', 'Asset Code')}>
                <span className="font-mono text-xs text-text-secondary">{detailAsset.assetCode}</span>
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailEntryCount', 'Entry Count')}>
                <span className="text-text-primary">{detailAsset.entryCount}</span>
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailPurchasePrice', 'Acquisition Cost')} wide>
                <MoneyDisplay amount={toNumber(detailAsset.purchasePrice)} />
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailYearsInUse', 'Years in Use')}>
                <span className="text-text-primary">{yearsInUse(detailAsset.purchaseDate)} {t('accounting.depreciation.years', 'years')}</span>
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailUsefulLife', 'Useful Life')}>
                <span className="text-text-primary">{detailAsset.usefulLifeYears ?? '—'} {t('accounting.depreciation.years', 'years')}</span>
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailPeriodDep', 'Period Depreciation')} wide>
                <MoneyDisplay amount={toNumber(detailAsset.depreciationAmount)} className="text-warning" />
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailAccumulated', 'Accumulated Depreciation')} wide>
                <MoneyDisplay amount={toNumber(detailAsset.accumulatedDepreciation)} className="text-danger" />
              </DetailRow>
              <DetailRow label={t('accounting.depreciation.detailNetBook', 'Net Book Value')} wide>
                <MoneyDisplay amount={toNumber(detailAsset.netBookValue)} className="text-success text-base" />
              </DetailRow>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAsset(null)}>{t('accounting.depreciation.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  DetailRow primitive                                                */
/* ------------------------------------------------------------------ */

function DetailRow({
  label, children, wide,
}: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words">{children}</div>
    </div>
  );
}
