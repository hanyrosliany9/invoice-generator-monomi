/**
 * ReportsPage (v2) — Catalog of financial & analytic reports.
 *
 * Editorial decision:
 *   The classic ReportsPage is one big "analytics dashboard" with revenue,
 *   payment, top-clients, top-projects all on the same screen. For v2 we
 *   reframe it as a *catalog*: the page answers "which reports exist, and
 *   which one do I want?" The detail view (ReportDetailPage) is where the
 *   numbers actually live. This separation matches the v2 list/detail
 *   pattern used by Projects, Invoices, etc.
 *
 *   We surface the four canonical analytic surfaces (revenue, payment,
 *   client, project) as static report cards — they're routes into the
 *   detail page with a `reportType` slug. Beneath the catalog we list the
 *   saved social-media reports (the data-driven, project-scoped reports).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, BarChart3,
  Plus, Search, MoreHorizontal, Eye, Trash2, X, Download,
  TrendingUp, PieChart, LineChart as LineChartIcon, Building2, Sparkles,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { useReports, useReportMutations } from '@/features/reports/hooks';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { reportsService } from '@/services/reports';
import type { SocialMediaReport, ReportStatus } from '@/features/reports/types/report.types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — adds Reports to keep parity with the rest of v2.         */
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

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

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
/*  Canonical analytic reports — these are baked into the system. We   */
/*  surface them as a top-row of report-type cards so operators can    */
/*  jump straight into Revenue / Payment / Client / Project views.     */
/* ------------------------------------------------------------------ */

interface CanonicalReport {
  slug: string;
  title: string;
  description: string;
  icon: typeof LineChartIcon;
  accent: string;
}

const CANONICAL_REPORTS: CanonicalReport[] = [
  {
    slug: 'revenue',
    title: 'Analisis Pendapatan',
    description: 'Tren pendapatan bulanan, kuartal, dan tahunan.',
    icon: LineChartIcon,
    accent: 'text-info',
  },
  {
    slug: 'payment',
    title: 'Analisis Pembayaran',
    description: 'Status pembayaran, jatuh tempo, dan piutang.',
    icon: PieChart,
    accent: 'text-warning',
  },
  {
    slug: 'clients',
    title: 'Analisis Klien',
    description: 'Klien teratas berdasarkan kontribusi pendapatan.',
    icon: Building2,
    accent: 'text-success',
  },
  {
    slug: 'projects',
    title: 'Analisis Proyek',
    description: 'Proyek teratas, distribusi tipe, dan performa.',
    icon: TrendingUp,
    accent: 'text-text-primary',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  /* ----- data ----- */
  const { data: reports = [], isLoading, error, refetch } = useReports();
  const { deleteReport } = useReportMutations();

  // Export of business-overview as the canonical "all-up" PDF — used by
  // the page-level Export button. Kept light: no params, defaults to
  // current month on the backend.
  const exportMutation = useMutation({
    mutationFn: () => reportsService.exportToPDF('business-overview', {}),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-ringkasan-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('reports.exportSuccess', 'Laporan ringkasan berhasil diunduh.'));
    },
    onError: () => toast.error(t('reports.exportFailed', 'Gagal mengunduh laporan.')),
  });

  /* ----- derived ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesSearch = !q
        || r.title?.toLowerCase().includes(q)
        || r.project?.description?.toLowerCase().includes(q)
        || r.project?.client?.name?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchText, statusFilter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const sent = reports.filter((r) => r.status === 'SENT').length;
    const draft = reports.filter((r) => r.status === 'DRAFT').length;
    const totalSections = reports.reduce((acc, r) => acc + (r.sections?.length ?? 0), 0);
    return { total, sent, draft, totalSections };
  }, [reports]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  /* ----- handlers ----- */
  const handleDelete = (r: SocialMediaReport) => {
    if (confirm(t('reports.confirmDelete', `Hapus laporan "${r.title}"? Tindakan ini tidak bisa dibatalkan.`))) {
      deleteReport.mutate(r.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          toast.success(t('reports.deleted', 'Laporan berhasil dihapus.'));
        },
        onError: () => toast.error(t('reports.deleteFailed', 'Gagal menghapus laporan.')),
      });
    }
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
          items: sidebarItems,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      >
        <PageContainer>
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title={t('reports.error.title', 'Tidak bisa memuat laporan')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  /* ----- render ----- */
  return (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>
        <PageHeader
          title={t('reports.title', 'Laporan')}
          description={t(
            'reports.subtitle',
            'Analisis finansial, performa bisnis, dan laporan kustom yang Anda simpan.',
          )}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download className="h-4 w-4" />
                {t('reports.exportPdf', 'Ekspor PDF')}
              </Button>
              <Button onClick={() => navigate('/v2/reports/builder')} size="sm">
                <Plus className="h-4 w-4" />
                {t('reports.new', 'Laporan Baru')}
              </Button>
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — four supporting numbers about the saved-report
            corpus. Mirrors the rhythm used on Projects/Invoices pages.
           ───────────────────────────────────────────────────────────── */}
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
                  label={t('reports.kpi.total', 'Total Laporan')}
                  value={stats.total}
                  sublabel={t('reports.kpi.totalSub', 'tersimpan di sistem')}
                />
                <StatCard
                  label={t('reports.kpi.sent', 'Terkirim')}
                  value={stats.sent}
                  sublabel={t('reports.kpi.sentSub', 'sudah dikirim ke klien')}
                />
                <StatCard
                  label={t('reports.kpi.draft', 'Draf')}
                  value={stats.draft}
                  sublabel={t('reports.kpi.draftSub', 'masih dalam pengerjaan')}
                />
                <StatCard
                  label={t('reports.kpi.sections', 'Total Bagian')}
                  value={stats.totalSections}
                  sublabel={t('reports.kpi.sectionsSub', 'di seluruh laporan')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Canonical analytic reports — these are *system* reports, not
            user-created. They live above the saved-report list because
            they're the recurring, always-available analytic surfaces.
           ───────────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('reports.analytics.title', 'Laporan Analitik Sistem')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t(
                  'reports.analytics.subtitle',
                  'Empat permukaan analitik utama, selalu tersedia dan terkini.',
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CANONICAL_REPORTS.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => navigate(`/v2/reports/system/${r.slug}`)}
                  className="text-left group"
                >
                  <GlassPanel
                    surface="glass"
                    padding="none"
                    className="p-5 h-full transition-colors hover:bg-bg-panel"
                  >
                    <div className={cn('mb-4', r.accent)}>
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="text-sm font-display font-semibold text-text-primary tracking-tight mb-1.5 group-hover:text-text-primary">
                      {r.title}
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">
                      {r.description}
                    </p>
                  </GlassPanel>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Saved reports — the project-scoped, custom-built reports.
            Single GlassPanel; filter strip + table share one surface.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('reports.saved.title', 'Laporan Tersimpan')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Memuat…')
                    : t('reports.saved.count', '{{count}} laporan', { count: reports.length })}
                </p>
              </div>
            </div>

            {/* Filter strip */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={t(
                    'reports.search.placeholder',
                    'Cari judul, proyek, atau klien...',
                  )}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    size="sm"
                    className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                  >
                    <SelectValue placeholder={t('reports.filter.status', 'Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('reports.filter.allStatuses', 'Semua Status')}
                    </SelectItem>
                    <SelectItem value="DRAFT">{STATUS_LABEL.DRAFT}</SelectItem>
                    <SelectItem value="COMPLETED">{STATUS_LABEL.COMPLETED}</SelectItem>
                    <SelectItem value="SENT">{STATUS_LABEL.SENT}</SelectItem>
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
                    {t('common.reset', 'Reset')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-12 w-12" />}
              title={
                hasActiveFilters
                  ? t('reports.empty.filtered.title', 'Tidak ada laporan yang cocok')
                  : t('reports.empty.title', 'Belum ada laporan tersimpan')
              }
              description={
                hasActiveFilters
                  ? t('reports.empty.filtered.desc', 'Coba ubah atau hapus filter Anda.')
                  : t(
                      'reports.empty.desc',
                      'Buat laporan kustom pertama Anda untuk menggabungkan data CSV dan visualisasi.',
                    )
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filter')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/v2/reports/builder')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('reports.new', 'Laporan Baru')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <DataTable<SocialMediaReport>
                data={filtered}
                onRowClick={(row) => navigate(`/v2/reports/${row.id}`)}
                enablePagination={filtered.length > 10}
                columns={[
                  {
                    id: 'title',
                    accessorKey: 'title',
                    header: 'Judul',
                    cell: ({ row }) => (
                      <div className="min-w-0 max-w-[300px]">
                        <div className="text-sm text-text-primary truncate">
                          {row.original.title || '—'}
                        </div>
                        {row.original.description && (
                          <div className="text-xs text-text-tertiary truncate mt-0.5">
                            {row.original.description}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    id: 'project',
                    accessorFn: (r) => r.project?.description ?? '',
                    header: 'Proyek',
                    cell: ({ row }) => {
                      const p = row.original.project;
                      if (!p) return <span className="text-text-tertiary">—</span>;
                      return (
                        <div className="min-w-0 max-w-[220px]">
                          <div className="text-sm text-text-secondary truncate">
                            {p.description}
                          </div>
                          {p.client?.name && (
                            <div className="text-xs text-text-tertiary truncate mt-0.5">
                              {p.client.name}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    id: 'period',
                    header: 'Periode',
                    cell: ({ row }) => (
                      <span className="text-text-secondary text-xs">
                        {ReportUtils.formatPeriod(row.original.month, row.original.year)}
                      </span>
                    ),
                  },
                  {
                    id: 'sections',
                    header: 'Bagian',
                    cell: ({ row }) => (
                      <span className="text-text-secondary text-xs tabular-nums">
                        {row.original.sections?.length ?? 0}
                      </span>
                    ),
                  },
                  {
                    accessorKey: 'status',
                    header: 'Status',
                    cell: ({ row }) => (
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                          statusChipClass(row.original.status),
                        )}
                      >
                        {STATUS_LABEL[row.original.status] ?? row.original.status}
                      </Badge>
                    ),
                  },
                  {
                    accessorKey: 'updatedAt',
                    header: 'Diperbarui',
                    cell: ({ row }) => (
                      <span className="text-text-tertiary text-xs">
                        <DateDisplay date={row.original.updatedAt} />
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: () => <span className="sr-only">Aksi</span>,
                    cell: ({ row }) => {
                      const r = row.original;
                      return (
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-text-tertiary hover:text-text-primary"
                                aria-label="Aksi laporan"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/v2/reports/${r.id}`)}>
                                <Eye className="h-3.5 w-3.5" /> Lihat
                              </DropdownMenuItem>
                              {r.pdfUrl && (
                                <DropdownMenuItem
                                  onClick={() => window.open(r.pdfUrl, '_blank')}
                                >
                                  <Download className="h-3.5 w-3.5" /> Unduh PDF
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(r)}
                                className="text-danger focus:text-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

// Re-export status type for downstream files that import from this page.
export type { ReportStatus };
