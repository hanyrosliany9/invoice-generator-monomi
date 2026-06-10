import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Play, Eye, RefreshCw, AlertTriangle, DollarSign, BarChart3,
  CheckCircle2, X,
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
  type ECLSummary,
  getECLSummary,
  processMonthlyECL,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Vocabularies                                                       */
/* ------------------------------------------------------------------ */

const AGING_LABEL_EN: Record<string, string> = {
  Current:    'Current',
  '1-30':     '1–30 Days',
  '31-60':    '31–60 Days',
  '61-90':    '61–90 Days',
  '91-120':   '91–120 Days',
  'Over 120': '> 120 Days',
};

const agingLabel = (bucket: string) => AGING_LABEL_EN[bucket] ?? bucket;

const agingRiskClass = (bucket: string) => {
  switch (bucket) {
    case 'Current': return 'bg-success/10 text-success border-success/20';
    case '1-30':    return 'bg-info/10 text-info border-info/20';
    case '31-60':   return 'bg-warning/10 text-warning border-warning/20';
    default:        return 'bg-danger/10 text-danger border-danger/20';
  }
};

const RISK_BAND_LABEL: Record<string, string> = {
  LOW:      'Low',
  MEDIUM:   'Medium',
  HIGH:     'High',
  CRITICAL: 'Critical',
};

type Provision = ECLSummary['provisions'][number];

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const fmt          = (d: Date) => toLocalISODate(d);

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
      topbar={{}}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ECLProvisionPageV2() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate,   setEndDate]   = useState<Date>(endOfMonth(today));
  const [includeWrittenOff, setIncludeWrittenOff] = useState<boolean>(false);

  /* ----- process dialog ----- */
  const [processOpen, setProcessOpen]  = useState(false);
  const [processDate, setProcessDate]  = useState<Date>(today);
  const [autoPost,    setAutoPost]     = useState<'manual' | 'auto'>('manual');

  /* ----- detail dialog ----- */
  const [detailProvision, setDetailProvision] = useState<Provision | null>(null);

  /* ----- query ----- */
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['ecl-summary', fmt(startDate), fmt(endDate), includeWrittenOff],
    queryFn:  () =>
      getECLSummary({
        startDate: fmt(startDate),
        endDate:   fmt(endDate),
        includeWrittenOff,
      }),
    enabled: true,
  });

  /* ----- mutation ----- */
  const processMutation = useMutation({
    mutationFn: processMonthlyECL,
    onSuccess: (data) => {
      toast.success(
        t('accounting.eclProvision.processSuccess', { count: data.processed, posted: data.posted, defaultValue: `Processed ${data.processed} ECL provisions. ${data.posted} posted to journal.` }),
      );
      queryClient.invalidateQueries({ queryKey: ['ecl-summary'] });
      setProcessOpen(false);
    },
    onError: () => toast.error(t('accounting.eclProvision.processFail', 'Failed to process ECL')),
  });

  /* ----- derived KPIs ----- */
  const kpis = useMemo(() => {
    const s = summary?.summary;
    return {
      totalOutstanding: toNumber(s?.totalOutstanding),
      totalECL:         toNumber(s?.totalECL),
      provisionPct:     s && toNumber(s.totalOutstanding) > 0
        ? ((toNumber(s.totalECL) / toNumber(s.totalOutstanding)) * 100).toFixed(1) + '%'
        : '—',
      lastCalcDate:     summary?.provisions?.[0]?.calculationDate ?? null,
    };
  }, [summary]);

  /* ----- bucket analysis ----- */
  const buckets = useMemo(() => {
    const b = summary?.byAgingBucket ?? {};
    return Object.entries(b).map(([bucket, data]) => ({ bucket, ...data }));
  }, [summary]);

  const provisions = summary?.provisions ?? [];

  if (error) {
    return (
      <PageShell user={user}>
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12" />}
          title={t('accounting.eclProvision.errorTitle', 'Unable to load ECL data')}
          description={error instanceof Error ? error.message : t('accounting.eclProvision.errorGeneric', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('accounting.eclProvision.retry', 'Try Again')}</Button>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell user={user}>
      <PageHeader
        title={t('accounting.eclProvision.title', 'ECL Provision')}
        description={t('accounting.eclProvision.description', 'Expected Credit Loss provision for receivables under PSAK 71.')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              {t('accounting.eclProvision.refresh', 'Refresh')}
            </Button>
            <Button size="sm" onClick={() => setProcessOpen(true)}>
              <Play className="h-4 w-4" />
              {t('accounting.eclProvision.calcECL', 'Calculate ECL')}
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
                label={t('accounting.eclProvision.statReceivables', 'Total Receivables')}
                value={<MoneyDisplay amount={kpis.totalOutstanding} />}
                sublabel={t('accounting.eclProvision.statReceivablesSub', 'outstanding receivables')}
              />
              <StatCard
                label={t('accounting.eclProvision.statECL', 'Total ECL Provision')}
                value={<MoneyDisplay amount={kpis.totalECL} className="text-danger" />}
                sublabel={t('accounting.eclProvision.statECLSub', 'expected credit loss')}
              />
              <StatCard
                label={t('accounting.eclProvision.statProvisionRate', 'Provision Ratio')}
                value={
                  <span className="text-2xl font-display font-semibold text-warning">
                    {kpis.provisionPct}
                  </span>
                }
                sublabel={t('accounting.eclProvision.statProvisionRateSub', 'ECL to total receivables')}
              />
              <StatCard
                label={t('accounting.eclProvision.statLastCalc', 'Last Calculation')}
                value={
                  kpis.lastCalcDate ? (
                    <span className="text-base font-display font-semibold text-text-primary">
                      <DateDisplay date={kpis.lastCalcDate} />
                    </span>
                  ) : (
                    <span className="text-base text-text-tertiary">{t('accounting.eclProvision.statNone', 'None yet')}</span>
                  )
                }
                sublabel={t('accounting.eclProvision.statLastCalcSub', 'ECL calculation date')}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Aging bucket analysis ───────────────────────────────── */}
      {!isLoading && buckets.length > 0 && (
        <section className="mb-12">
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {t('accounting.eclProvision.agingAnalysis', 'Aging Analysis')}
            </span>
          </div>
          <GlassPanel surface="strong" padding="none" className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
              {buckets.map(({ bucket, count, totalOutstanding, totalECL, averageECLRate }) => (
                <div key={bucket} className="px-4 py-5 flex flex-col gap-2">
                  <span className={cn(
                    'self-start inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium',
                    agingRiskClass(bucket),
                  )}>
                    {agingLabel(bucket)}
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-0.5">
                      {t('accounting.eclProvision.bucketInvoices', 'Invoices')}
                    </div>
                    <div className="text-lg font-display font-semibold text-text-primary">{count}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-0.5">
                      {t('accounting.eclProvision.bucketTotalECL', 'Total ECL')}
                    </div>
                    <MoneyDisplay amount={toNumber(totalECL)} className="text-sm text-danger" />
                  </div>
                  {/* Rate bar */}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('accounting.eclProvision.bucketAvgRate', 'Avg Rate')} — {(averageECLRate * 100).toFixed(1)}%
                    </div>
                    <div className="h-1 w-full rounded-full bg-bg-sunken overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          bucket === 'Current' ? 'bg-success' :
                          bucket === '1-30'    ? 'bg-info' :
                          bucket === '31-60'   ? 'bg-warning' : 'bg-danger',
                        )}
                        style={{ width: `${Math.min(averageECLRate * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>
      )}

      {/* ── Provisions table ─────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary shrink-0">
            {t('accounting.eclProvision.period', 'Period')}
          </span>
          <div className="flex items-center gap-2 flex-1">
            <MonomiDatePicker
              value={startDate}
              onChange={(d) => d && setStartDate(d)}
              placeholder={t('accounting.eclProvision.startDate', 'Start date')}
              className="h-9 text-sm bg-bg-sunken border-border-subtle"
            />
            <span className="text-text-tertiary text-xs">—</span>
            <MonomiDatePicker
              value={endDate}
              onChange={(d) => d && setEndDate(d)}
              placeholder={t('accounting.eclProvision.endDate', 'End date')}
              className="h-9 text-sm bg-bg-sunken border-border-subtle"
            />
          </div>

          <Select
            value={String(includeWrittenOff)}
            onValueChange={(v) => setIncludeWrittenOff(v === 'true')}
          >
            <SelectTrigger
              size="sm"
              className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">{t('accounting.eclProvision.excludeWriteOff', 'Exclude Write-offs')}</SelectItem>
              <SelectItem value="true">{t('accounting.eclProvision.includeWriteOff', 'Include Write-offs')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table section header */}
        <div className="px-5 py-3 border-b border-border-subtle bg-bg-sunken/50">
          <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('accounting.eclProvision.atRiskHeader', 'At-Risk Invoices')} — {provisions.length} {t('accounting.eclProvision.invoicesCount', 'invoices')}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : provisions.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title={t('accounting.eclProvision.emptyTitle', 'No at-risk invoices')}
            description={t('accounting.eclProvision.emptyDesc', 'No ECL data for the selected period and filters.')}
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<Provision>
              data={provisions}
              onRowClick={setDetailProvision}
              columns={[
                {
                  id: 'invoice',
                  header: t('accounting.eclProvision.colInvoiceClient', 'Invoice & Client'),
                  accessorFn: (r) => r.invoiceNumber,
                  cell: ({ row }) => (
                    <div className="min-w-0">
                      <div className="text-sm font-mono text-text-primary truncate">
                        {row.original.invoiceNumber}
                      </div>
                      <div className="text-xs text-text-tertiary truncate mt-0.5">
                        {row.original.clientName}
                      </div>
                    </div>
                  ),
                },
                {
                  accessorKey: 'agingBucket',
                  header: t('accounting.eclProvision.colAging', 'Aging'),
                  cell: ({ row }) => (
                    <div>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium',
                        agingRiskClass(row.original.agingBucket),
                      )}>
                        {agingLabel(row.original.agingBucket)}
                      </span>
                      <div className="text-[10px] text-text-tertiary mt-0.5">
                        {row.original.daysPastDue} {t('accounting.eclProvision.days', 'days')}
                      </div>
                    </div>
                  ),
                },
                {
                  accessorKey: 'outstandingAmount',
                  header: () => <span className="block text-right">{t('accounting.eclProvision.colOutstanding', 'Outstanding')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.outstandingAmount)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'eclRate',
                  header: t('accounting.eclProvision.colECLRate', 'ECL Rate'),
                  cell: ({ row }) => (
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium',
                      'bg-warning/10 text-warning border-warning/20',
                    )}>
                      {(toNumber(row.original.eclRate) * 100).toFixed(1)}%
                    </span>
                  ),
                },
                {
                  accessorKey: 'eclAmount',
                  header: () => <span className="block text-right">{t('accounting.eclProvision.colECLAmount', 'ECL Provision')}</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.eclAmount)} className="text-danger" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'calculationDate',
                  header: t('accounting.eclProvision.colCalcDate', 'Calc. Date'),
                  cell: ({ row }) => (
                    <span className="text-text-tertiary">
                      <DateDisplay date={row.original.calculationDate} />
                    </span>
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
                        onClick={() => setDetailProvision(row.original)}
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
              <BarChart3 className="h-4 w-4 text-text-tertiary" />
              {t('accounting.eclProvision.processDialogTitle', 'Calculate Monthly ECL')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('accounting.eclProvision.processDialogDesc', 'Calculate Expected Credit Loss for all outstanding invoices.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.eclProvision.processFieldDate', 'Calculation Date')}
              </label>
              <MonomiDatePicker
                value={processDate}
                onChange={(d) => d && setProcessDate(d)}
                className="w-full h-9 bg-bg-sunken border-border-subtle"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.eclProvision.processFieldPosting', 'Posting Option')}
              </label>
              <Select
                value={autoPost}
                onValueChange={(v) => setAutoPost(v as 'manual' | 'auto')}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('accounting.eclProvision.saveDraft', 'Save as draft (manual posting)')}</SelectItem>
                  <SelectItem value="auto">{t('accounting.eclProvision.autoPost', 'Auto-post to journal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border-l-2 border-warning bg-warning/5 px-4 py-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('accounting.eclProvision.processInfo', 'This process calculates Expected Credit Loss for all outstanding invoices on the selected date, based on receivable aging and PSAK 71 default ECL rates.')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessOpen(false)}
              disabled={processMutation.isPending}
            >
              {t('accounting.eclProvision.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() =>
                processMutation.mutate({
                  calculationDate: fmt(processDate),
                  autoPost: autoPost === 'auto',
                })
              }
              disabled={processMutation.isPending}
            >
              {processMutation.isPending ? t('accounting.eclProvision.calculating', 'Calculating...') : t('accounting.eclProvision.calcECL', 'Calculate ECL')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail dialog ────────────────────────────────────────── */}
      <Dialog open={!!detailProvision} onOpenChange={(o) => { if (!o) setDetailProvision(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{t('accounting.eclProvision.detailTitle', 'Invoice ECL Detail')}</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {detailProvision?.invoiceNumber} — {detailProvision?.clientName}
            </DialogDescription>
          </DialogHeader>

          {detailProvision && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailRow label={t('accounting.eclProvision.detailInvoiceNo', 'Invoice No.')} wide>
                <span className="font-mono text-text-primary">{detailProvision.invoiceNumber}</span>
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailClient', 'Client')} wide>
                <span className="text-text-primary">{detailProvision.clientName}</span>
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailAging', 'Aging')}>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium',
                  agingRiskClass(detailProvision.agingBucket),
                )}>
                  {agingLabel(detailProvision.agingBucket)}
                </span>
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailDaysPastDue', 'Days Past Due')}>
                <span className="text-text-primary">{detailProvision.daysPastDue} {t('accounting.eclProvision.days', 'days')}</span>
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailOutstanding', 'Outstanding Amount')} wide>
                <MoneyDisplay amount={toNumber(detailProvision.outstandingAmount)} />
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailECLRate', 'ECL Rate')}>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium',
                  'bg-warning/10 text-warning border-warning/20',
                )}>
                  {(toNumber(detailProvision.eclRate) * 100).toFixed(1)}%
                </span>
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailStatus', 'Status')}>
                <Badge variant="outline" className="text-[10px]">
                  {detailProvision.status}
                </Badge>
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailECLAmount', 'ECL Provision')} wide>
                <MoneyDisplay
                  amount={toNumber(detailProvision.eclAmount)}
                  className="text-danger text-base"
                />
              </DetailRow>
              <DetailRow label={t('accounting.eclProvision.detailCalcDate', 'Calculation Date')} wide>
                <DateDisplay date={detailProvision.calculationDate} />
              </DetailRow>
            </div>
          )}

          <div className="rounded-lg border border-border-subtle bg-bg-sunken px-4 py-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-text-primary">{t('accounting.eclProvision.detailNote', 'Note')}:</strong> {t('accounting.eclProvision.detailNoteText', 'ECL provision is calculated based on receivable aging using PSAK 71 default ECL rates. Rates can be adjusted based on the company\'s historical experience.')}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailProvision(null)}>{t('accounting.eclProvision.close', 'Close')}</Button>
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
