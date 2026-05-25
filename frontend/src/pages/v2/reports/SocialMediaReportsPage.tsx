/**
 * SocialMediaReportsPage (v2) — Social-media analytics surface.
 *
 * Editorial decision:
 *   The classic page is "list of saved social-media reports". For v2 we
 *   reframe the *page* itself as an analytics surface: a KPI band of
 *   reach/engagement/posting cadence, per-platform breakdown, and a
 *   time-series of engagement. Beneath the analytics, the saved-reports
 *   list lives as a quiet table — the "primary content" is the analytics,
 *   not the table.
 *
 *   Real per-platform reach/engagement data is not exposed by the current
 *   backend (the existing reports model is project-scoped CSV imports).
 *   Until the analytics endpoints exist we derive the KPI band from
 *   what *is* available — saved-report counts, sections, last-updated —
 *   and keep the per-platform breakdown wired off a clearly labelled
 *   placeholder dataset. Flagged with PLACEHOLDER comments for follow-up.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, BarChart3,
  Plus, Search, MoreHorizontal, Eye, Trash2, X,
  Camera, Video, Globe, AtSign, MessageCircle, Heart, Share2,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
import type { SocialMediaReport } from '@/features/reports/types/report.types';
import { cn } from '@/lib/utils';
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
/*  PLACEHOLDER datasets — replace when /reports/social-media/* lands. */
/*  Numbers are chosen to read as plausible mid-size brand performance */
/*  in Indonesia (10k–80k followers per platform, single-digit reach % */
/*  growth). Keep this isolated so a future swap is trivial.           */
/* ------------------------------------------------------------------ */

interface PlatformBreakdown {
  platform: string;
  icon: React.ComponentType<{ className?: string }>;
  followers: number;
  engagement: number; // percent
  reach: number;
  accent: string;
}

const PLATFORM_BREAKDOWN: PlatformBreakdown[] = [
  { platform: 'Instagram', icon: Camera, followers: 48200, engagement: 4.2, reach: 312_400, accent: 'text-warning' },
  { platform: 'TikTok',    icon: AtSign, followers: 62500, engagement: 6.8, reach: 540_900, accent: 'text-info' },
  { platform: 'Facebook',  icon: Globe,  followers: 18900, engagement: 1.9, reach: 124_700, accent: 'text-info' },
  { platform: 'YouTube',   icon: Video,  followers: 12300, engagement: 3.4, reach:  98_200, accent: 'text-danger' },
];

const ENGAGEMENT_TREND = [
  { month: 'Jan', engagement: 3.2, reach: 240_000 },
  { month: 'Feb', engagement: 3.6, reach: 268_000 },
  { month: 'Mar', engagement: 4.1, reach: 295_000 },
  { month: 'Apr', engagement: 4.4, reach: 318_000 },
  { month: 'May', engagement: 4.9, reach: 352_000 },
  { month: 'Jun', engagement: 5.3, reach: 401_000 },
];

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}rb`;
  return String(n);
};

const tooltipStyle = {
  backgroundColor: '#131316',
  border: `1px solid ${tokens.border.default}`,
  borderRadius: '8px',
  color: tokens.text.primary,
  fontSize: '12px',
  padding: '8px 12px',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SocialMediaReportsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: reports = [], isLoading, error, refetch } = useReports();
  const { deleteReport } = useReportMutations();

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

  /* Aggregate placeholder data into a four-card KPI band. */
  const aggregates = useMemo(() => {
    const followers = PLATFORM_BREAKDOWN.reduce((acc, p) => acc + p.followers, 0);
    const reach = PLATFORM_BREAKDOWN.reduce((acc, p) => acc + p.reach, 0);
    const avgEng = PLATFORM_BREAKDOWN.reduce((acc, p) => acc + p.engagement, 0)
      / PLATFORM_BREAKDOWN.length;
    return {
      followers,
      reach,
      engagement: avgEng,
      reportsCount: reports.length,
    };
  }, [reports.length]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  const handleDelete = (r: SocialMediaReport) => {
    if (confirm(t('reports.confirmDelete', `Hapus laporan "${r.title}"?`))) {
      deleteReport.mutate(r.id, {
        onSuccess: () => toast.success(t('reports.deleted', 'Laporan berhasil dihapus.')),
        onError: () => toast.error(t('reports.deleteFailed', 'Gagal menghapus laporan.')),
      });
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
        topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      >
        <PageContainer>
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title={t('socialReports.error.title', 'Tidak bisa memuat laporan')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
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
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>
        <PageHeader
          title={t('socialReports.title', 'Laporan Sosial Media')}
          description={t(
            'socialReports.subtitle',
            'Analitik lintas-platform, performa konten, dan laporan klien yang tersimpan.',
          )}
          actions={
            <Button onClick={() => navigate('/v2/reports/builder')} size="sm">
              <Plus className="h-4 w-4" />
              {t('socialReports.new', 'Laporan Baru')}
            </Button>
          }
        />

        {/* KPI band — followers / reach / engagement / report count. */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t('socialReports.kpi.followers', 'Total Pengikut')}
              value={formatCompact(aggregates.followers)}
              sublabel={t('socialReports.kpi.followersSub', 'di semua platform')}
            />
            <StatCard
              label={t('socialReports.kpi.reach', 'Jangkauan')}
              value={formatCompact(aggregates.reach)}
              sublabel={t('socialReports.kpi.reachSub', '30 hari terakhir')}
            />
            <StatCard
              label={t('socialReports.kpi.engagement', 'Tingkat Engagement')}
              value={`${aggregates.engagement.toFixed(1)}%`}
              sublabel={t('socialReports.kpi.engagementSub', 'rata-rata lintas-platform')}
            />
            <StatCard
              label={t('socialReports.kpi.reports', 'Laporan Tersimpan')}
              value={aggregates.reportsCount}
              sublabel={t('socialReports.kpi.reportsSub', 'siap dibagikan')}
            />
          </div>
        </section>

        {/* Per-platform breakdown — small cards with platform identity. */}
        <section className="mb-12">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('socialReports.platform.title', 'Breakdown per Platform')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t(
                  'socialReports.platform.subtitle',
                  'Performa per kanal — pengikut, engagement, dan jangkauan.',
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLATFORM_BREAKDOWN.map((p) => {
              const Icon = p.icon;
              return (
                <GlassPanel
                  key={p.platform}
                  surface="glass"
                  padding="none"
                  className="p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn('flex items-center gap-2', p.accent)}>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium text-text-primary">
                        {p.platform}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-0.5">
                        Pengikut
                      </div>
                      <div className="text-lg font-display font-semibold text-text-primary tabular-nums">
                        {formatCompact(p.followers)}
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <div className="text-text-tertiary">Engagement</div>
                        <div className="text-text-secondary tabular-nums">
                          {p.engagement.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-text-tertiary">Jangkauan</div>
                        <div className="text-text-secondary tabular-nums">
                          {formatCompact(p.reach)}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
          {/* PLACEHOLDER: wire to /reports/social-media/platforms once endpoint exists. */}
        </section>

        {/* Time-series — engagement trend + reach volume side-by-side. */}
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('socialReports.engagementTrend', 'Tren Engagement')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t('socialReports.last6Months', 'Enam bulan terakhir')}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-3 w-3" /> Engagement
                </span>
              </div>
            </div>
            <MonomiChart height={260}>
              <LineChart data={ENGAGEMENT_TREND} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid {...chartGridProps} vertical={false} />
                <XAxis dataKey="month" {...chartAxisProps} axisLine={false} tickLine={false} />
                <YAxis
                  {...chartAxisProps}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: tokens.border.default }}
                  formatter={(v) => [`${v}%`, 'Engagement']}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke={chartColors[0]}
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </MonomiChart>
          </GlassPanel>

          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('socialReports.reachVolume', 'Volume Jangkauan')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t('socialReports.reachSubtitle', 'Pengguna unik per bulan')}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  <Share2 className="h-3 w-3" /> Jangkauan
                </span>
              </div>
            </div>
            <MonomiChart height={260}>
              <BarChart data={ENGAGEMENT_TREND} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid {...chartGridProps} vertical={false} />
                <XAxis dataKey="month" {...chartAxisProps} axisLine={false} tickLine={false} />
                <YAxis
                  {...chartAxisProps}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(Number(v))}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(246,243,232,0.04)' }}
                  formatter={(v) => [formatCompact(Number(v)), 'Jangkauan']}
                />
                <Bar dataKey="reach" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </MonomiChart>
          </GlassPanel>
        </section>
        {/* PLACEHOLDER: trends are dummy — wire to /reports/social-media/trends. */}

        {/* Saved reports — quieter list table; analytics is the lead. */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('socialReports.saved.title', 'Laporan Klien Tersimpan')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Memuat…')
                    : t('socialReports.saved.count', '{{count}} laporan untuk klien', { count: reports.length })}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Laporan per-klien</span>
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
                    'socialReports.search.placeholder',
                    'Cari judul, proyek, atau klien...',
                  )}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    size="sm"
                    className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                  >
                    <SelectValue placeholder={t('reports.filter.status', 'Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('reports.filter.allStatuses', 'Semua Status')}</SelectItem>
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

          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-12 w-12" />}
              title={
                hasActiveFilters
                  ? t('socialReports.empty.filtered.title', 'Tidak ada laporan yang cocok')
                  : t('socialReports.empty.title', 'Belum ada laporan klien')
              }
              description={
                hasActiveFilters
                  ? t('socialReports.empty.filtered.desc', 'Coba ubah atau hapus filter Anda.')
                  : t(
                      'socialReports.empty.desc',
                      'Buat laporan sosial-media pertama untuk klien Anda.',
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
                    {t('socialReports.new', 'Laporan Baru')}
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
                    id: 'client',
                    accessorFn: (r) => r.project?.client?.name ?? '',
                    header: 'Klien',
                    cell: ({ row }) => (
                      <span className="text-sm text-text-secondary">
                        {row.original.project?.client?.name || '—'}
                      </span>
                    ),
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
