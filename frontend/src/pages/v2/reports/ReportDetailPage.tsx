/**
 * ReportDetailPage (v2) — Render a single saved report.
 *
 * Editorial decision:
 *   The classic detail page is a CMS-style "manage sections + edit charts"
 *   surface. We split that responsibility: this page is a *read-first*
 *   render of the report — header with identity + actions, KPI band of
 *   meta, then each section rendered as a sub-panel with its charts laid
 *   out in a responsive grid. Editing (add/remove sections, reorder,
 *   configure visualizations) hands off to the ReportBuilderPage. Saves
 *   the reader from a tool-heavy UI when they just want to look at numbers.
 *
 *   Includes a small v2-native chart renderer (no AntD) that handles the
 *   five canonical visualization types: line, bar, area, pie, metric_card.
 *   Table fallback degrades to a simple DataTable. This keeps the page
 *   self-contained and avoids pulling in the AntD-flavoured ChartRenderer.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, BarChart3,
  ArrowLeft, MoreHorizontal, Pencil, Trash2, Download, Send, CheckCircle2,
  AppWindow, RefreshCw, LayoutGrid, FileBarChart, FileSpreadsheet,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { MonomiChart, chartColors, chartAxisProps, chartGridProps } from '@/components/monomi/MonomiChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useReport, useReportMutations } from '@/features/reports/hooks';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { socialMediaReportsService } from '@/services/social-media-reports';
import type {
  ReportSection,
  ReportStatus,
  VisualizationConfig,
} from '@/features/reports/types/report.types';
import { tokens } from '@/styles/tokens';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Reports',    icon: <BarChart3   className="h-4 w-4" />, href: '/v2/reports' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draf',
  COMPLETED: 'Selesai',
  SENT:      'Terkirim',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-success/10 text-success';
    case 'SENT':      return 'bg-info/10 text-info';
    case 'DRAFT':
    default:          return 'bg-bg-sunken text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Numeric coercion — CSV-derived data arrives as strings; recharts   */
/*  silently drops nulls so we coerce up-front.                        */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[$,\s]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const normalizeRows = (rows: any[], numericKeys: string[]) =>
  rows.map((row) => {
    const out: any = { ...row };
    numericKeys.forEach((k) => { out[k] = toNumber(row[k]); });
    return out;
  });

const aggregate = (
  rows: any[],
  key: string,
  fn: VisualizationConfig['aggregation'] = 'sum',
) => {
  const values = rows.map((r) => toNumber(r[key]));
  if (values.length === 0) return 0;
  switch (fn) {
    case 'count':   return values.length;
    case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':     return Math.min(...values);
    case 'max':     return Math.max(...values);
    case 'sum':
    default:        return values.reduce((a, b) => a + b, 0);
  }
};

const formatNumber = (n: number, precision = 0) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(n);

/* ------------------------------------------------------------------ */
/*  Local chart renderer — five viz types, all token-driven.           */
/* ------------------------------------------------------------------ */

const tooltipStyle = {
  backgroundColor: '#131316',
  border: `1px solid ${tokens.border.default}`,
  borderRadius: '8px',
  color: tokens.text.primary,
  fontSize: '12px',
  padding: '8px 12px',
};

function VizRenderer({ config, data }: { config: VisualizationConfig; data: any[] }) {
  const numericKeys = useMemo(
    () => [
      ...(config.yAxis ?? []),
      ...(config.valueKey ? [config.valueKey] : []),
      ...(config.metric ? [config.metric] : []),
    ],
    [config],
  );
  const normalized = useMemo(() => normalizeRows(data, numericKeys), [data, numericKeys]);

  /* metric_card — a single number, rendered as a small KPI tile.       */
  if (config.type === 'metric_card') {
    const key = config.valueKey || config.metric;
    if (!key) {
      return (
        <div className="text-xs text-text-tertiary p-4">
          Konfigurasi metric_card tidak lengkap (valueKey hilang).
        </div>
      );
    }
    const value = aggregate(normalized, key, config.aggregation);
    return (
      <div className="px-2 py-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
          {config.title}
        </div>
        <div className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight tabular-nums leading-none">
          {formatNumber(value, config.precision ?? 0)}
        </div>
        {config.aggregation && (
          <div className="text-xs text-text-tertiary mt-2">
            {config.aggregation} • {key}
          </div>
        )}
      </div>
    );
  }

  /* table — fallback for tabular viz; we just lean on DataTable.       */
  if (config.type === 'table') {
    const cols = Object.keys(data[0] ?? {}).map((k) => ({
      accessorKey: k,
      header: k,
    }));
    return (
      <div className="-mx-2">
        <DataTable data={normalized} columns={cols} enablePagination={normalized.length > 10} />
      </div>
    );
  }

  if (!normalized.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-text-tertiary">
        Tidak ada data
      </div>
    );
  }

  /* pie — proportion split by nameKey / valueKey                       */
  if (config.type === 'pie') {
    const nameKey = config.nameKey ?? config.xAxis ?? '';
    const valueKey = config.valueKey ?? config.yAxis?.[0] ?? '';
    return (
      <MonomiChart height={260}>
        <PieChart>
          <Pie
            data={normalized}
            dataKey={valueKey}
            nameKey={nameKey}
            outerRadius={90}
            label={{ fill: tokens.text.secondary, fontSize: 11 }}
          >
            {normalized.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '11px', color: tokens.text.tertiary }} />
        </PieChart>
      </MonomiChart>
    );
  }

  /* line / bar / area — x is xAxis (string), y is one-or-many series. */
  const xKey = config.xAxis ?? Object.keys(normalized[0] ?? {})[0];
  const yKeys = config.yAxis?.length ? config.yAxis : [Object.keys(normalized[0] ?? {})[1]];

  const Axes = (
    <>
      <CartesianGrid {...chartGridProps} vertical={false} />
      <XAxis dataKey={xKey} {...chartAxisProps} axisLine={false} tickLine={false} />
      <YAxis {...chartAxisProps} axisLine={false} tickLine={false} width={48} />
      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: tokens.border.default }} />
      <Legend wrapperStyle={{ fontSize: '11px', color: tokens.text.tertiary }} />
    </>
  );

  if (config.type === 'line') {
    return (
      <MonomiChart height={260}>
        <LineChart data={normalized} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {Axes}
          {yKeys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={chartColors[i % chartColors.length]}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </MonomiChart>
    );
  }

  if (config.type === 'bar') {
    return (
      <MonomiChart height={260}>
        <BarChart data={normalized} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {Axes}
          {yKeys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={chartColors[i % chartColors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </MonomiChart>
    );
  }

  // area
  return (
    <MonomiChart height={260}>
      <AreaChart data={normalized} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        {Axes}
        {yKeys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stroke={chartColors[i % chartColors.length]}
            fill={chartColors[i % chartColors.length]}
            fillOpacity={0.15}
            strokeWidth={1.75}
          />
        ))}
      </AreaChart>
    </MonomiChart>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: report, isLoading, error, refetch, isFetching } = useReport(id);
  const { updateStatus, deleteReport, generatePDF } = useReportMutations();

  const [pdfPending, setPdfPending] = useState(false);

  /* ---------- derived ---------- */
  const totals = useMemo(() => {
    const sections = report?.sections ?? [];
    return {
      sections: sections.length,
      visualizations: sections.reduce((acc, s) => acc + (s.visualizations?.length ?? 0), 0),
      rows: sections.reduce((acc, s) => acc + (s.rowCount ?? 0), 0),
    };
  }, [report]);

  /* ---------- handlers ---------- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  const handleGeneratePdf = async () => {
    if (!id) return;
    try {
      setPdfPending(true);
      await socialMediaReportsService.generatePDF(id);
      toast.success(t('reports.detail.pdfGenerated', 'PDF berhasil dibuat dan diunduh.'));
      queryClient.invalidateQueries({ queryKey: ['report', id] });
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message
          ?? t('reports.detail.pdfFailed', 'Gagal membuat PDF.'),
      );
    } finally {
      setPdfPending(false);
    }
  };

  const handleDelete = () => {
    if (!report) return;
    if (
      confirm(
        t('reports.confirmDelete', `Hapus laporan "${report.title}"? Tindakan ini tidak bisa dibatalkan.`),
      )
    ) {
      deleteReport.mutate(report.id, {
        onSuccess: () => {
          toast.success(t('reports.deleted', 'Laporan berhasil dihapus.'));
          navigate('/v2/reports');
        },
        onError: () => toast.error(t('reports.deleteFailed', 'Gagal menghapus laporan.')),
      });
    }
  };

  const setStatus = (status: ReportStatus) => {
    if (!report) return;
    updateStatus.mutate(
      { id: report.id, status },
      {
        onSuccess: () => toast.success(t('reports.statusUpdated', 'Status laporan diperbarui.')),
        onError: () => toast.error(t('reports.statusFailed', 'Gagal mengubah status.')),
      },
    );
  };

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <Shell>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-32 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </Shell>
    );
  }

  /* ---------- error / not found ---------- */
  if (error || !report) {
    return (
      <Shell>
        <EmptyState
          icon={<FileBarChart className="h-12 w-12" />}
          title={t('reports.detail.notFound.title', 'Laporan tidak ditemukan')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'reports.detail.notFound.desc',
                  'Laporan ini mungkin sudah dihapus atau Anda tidak memiliki akses.',
                )
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/reports')}>
                <ArrowLeft className="h-4 w-4" />
                {t('reports.detail.backToList', 'Kembali ke Laporan')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  const canEdit = ReportUtils.canEdit(report.status);
  const canGenPdf = ReportUtils.canGeneratePDF(report.sections?.length ?? 0);

  /* ---------- render ---------- */
  return (
    <Shell>
      {/* Back-link above H1 so the title gets its own line. */}
      <div className="mb-4">
        <Link
          to="/v2/reports"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('reports.detail.backToList', 'Kembali ke Laporan')}
        </Link>
      </div>

      <PageHeader
        title={report.title || '—'}
        description={
          report.description ||
          t('reports.detail.subtitle', 'Detail laporan, bagian, dan visualisasi terkait.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-3 h-7 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(report.status),
              )}
            >
              {STATUS_LABEL[report.status] ?? report.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              {t('reports.detail.refresh', 'Muat Ulang')}
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => navigate(`/v2/reports/${report.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
                {t('common.edit', 'Ubah')}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.moreActions', 'Tindakan lain')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canGenPdf && (
                  <DropdownMenuItem onClick={handleGeneratePdf} disabled={pdfPending}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {t('reports.detail.generatePdf', 'Buat PDF')}
                  </DropdownMenuItem>
                )}
                {report.pdfUrl && (
                  <DropdownMenuItem onClick={() => window.open(report.pdfUrl, '_blank')}>
                    <Download className="h-3.5 w-3.5" />
                    {t('reports.detail.downloadPdf', 'Unduh PDF')}
                  </DropdownMenuItem>
                )}
                {report.status === 'DRAFT' && (
                  <DropdownMenuItem onClick={() => setStatus('COMPLETED')}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('reports.detail.markComplete', 'Tandai Selesai')}
                  </DropdownMenuItem>
                )}
                {report.status === 'COMPLETED' && (
                  <DropdownMenuItem onClick={() => setStatus('SENT')}>
                    <Send className="h-3.5 w-3.5" />
                    {t('reports.detail.markSent', 'Tandai Terkirim')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete', 'Hapus')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Identity panel — period, project, client, last updated. */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          <div className="min-w-0 space-y-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('reports.detail.period', 'Periode')}
              </div>
              <div className="text-base font-medium text-text-primary">
                {ReportUtils.formatPeriod(report.month, report.year)}
              </div>
            </div>
            {report.project && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('reports.detail.project', 'Proyek')}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/v2/projects/${report.project!.id}`)}
                  className="text-sm text-text-primary hover:text-text-secondary transition-colors text-left"
                >
                  {report.project.description}
                  {report.project.number && (
                    <span className="ml-2 font-mono text-xs text-text-tertiary">
                      {report.project.number}
                    </span>
                  )}
                </button>
                {report.project.client?.name && (
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {report.project.client.name}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-3 lg:min-w-[200px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('reports.detail.updated', 'Diperbarui')}
              </div>
              <DateDisplay date={report.updatedAt} className="text-sm text-text-secondary" />
            </div>
            {report.pdfGeneratedAt && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('reports.detail.pdfGenerated', 'PDF Terbit')}
                </div>
                <DateDisplay
                  date={report.pdfGeneratedAt}
                  className="text-sm text-text-secondary"
                />
              </div>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* KPI band — meta about the report (volume, not money). */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label={t('reports.detail.kpi.sections', 'Total Bagian')}
            value={totals.sections}
            sublabel={t('reports.detail.kpi.sectionsSub', 'sumber data tergabung')}
          />
          <StatCard
            label={t('reports.detail.kpi.visualizations', 'Total Visualisasi')}
            value={totals.visualizations}
            sublabel={t('reports.detail.kpi.visualizationsSub', 'grafik dikonfigurasi')}
          />
          <StatCard
            label={t('reports.detail.kpi.rows', 'Total Baris Data')}
            value={formatNumber(totals.rows)}
            sublabel={t('reports.detail.kpi.rowsSub', 'di semua CSV')}
          />
        </div>
      </section>

      {/* Sections — rendered as a vertical stack of sub-panels. */}
      {(!report.sections || report.sections.length === 0) ? (
        <GlassPanel surface="glass" padding="lg">
          <EmptyState
            icon={<LayoutGrid className="h-12 w-12" />}
            title={t('reports.detail.noSections.title', 'Belum ada bagian')}
            description={t(
              'reports.detail.noSections.desc',
              'Tambahkan sumber data CSV dan visualisasi melalui editor laporan.',
            )}
            action={
              <Button
                size="sm"
                onClick={() => navigate(`/v2/reports/${report.id}/edit`)}
              >
                <AppWindow className="h-4 w-4" />
                {t('reports.detail.openBuilder', 'Buka Editor')}
              </Button>
            }
          />
        </GlassPanel>
      ) : (
        <div className="space-y-6">
          {report.sections
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionBlock — one section as a quiet sub-panel.                   */
/* ------------------------------------------------------------------ */

function SectionBlock({ section }: { section: ReportSection }) {
  const visualizations = section.visualizations ?? [];
  return (
    <GlassPanel surface="glass" padding="lg">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
              {section.title}
            </h2>
            <span className="text-xs text-text-tertiary tabular-nums">
              {section.rowCount} baris
            </span>
          </div>
          {section.description && (
            <p className="mt-1 text-xs text-text-tertiary leading-relaxed max-w-2xl">
              {section.description}
            </p>
          )}
          {section.csvFileName && (
            <p className="mt-1 text-[11px] text-text-tertiary font-mono">
              {section.csvFileName}
            </p>
          )}
        </div>
      </div>

      {visualizations.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-subtle p-6 text-center text-xs text-text-tertiary">
          Belum ada visualisasi pada bagian ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visualizations.map((viz, i) => (
            <div
              key={i}
              className="rounded-md border border-border-subtle bg-bg-sunken p-4"
            >
              {viz.title && viz.type !== 'metric_card' && (
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-3">
                  {viz.title}
                </div>
              )}
              <VizRenderer config={viz} data={section.rawData ?? []} />
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
