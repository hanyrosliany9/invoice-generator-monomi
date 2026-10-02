import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { locale } from '../reports/reportData';
import { portalApi, type PortalReportSummary } from '../portalApi';
import { hasText, PortalError, PortalSpinner } from '../ui';

export const reportStatusChip = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-success/10 text-success';
    case 'SENT': return 'bg-info/10 text-info';
    default: return 'bg-bg-sunken text-text-tertiary';
  }
};

export function useReportStatusLabel() {
  const { t } = useTranslation();
  return (status?: string) => {
    switch (status) {
      case 'COMPLETED': return t('portal.reports.status.completed', 'Selesai');
      case 'SENT': return t('portal.reports.status.sent', 'Terkirim');
      case 'DRAFT': return t('portal.reports.status.draft', 'Draf');
      default: return status ?? '';
    }
  };
}

function ReportCard({ r, clientId, latest }: { r: PortalReportSummary; clientId: string; latest: boolean }) {
  const { t } = useTranslation();
  const statusLabel = useReportStatusLabel();
  const month = new Date(r.year, r.month - 1).toLocaleDateString(locale(), { month: 'short' }).replace('.', '');
  const projectLine = [r.projectNumber, r.projectName].filter(hasText).join(' · ');
  const titles = (r.sectionTitles ?? []).filter(hasText);
  const teaser = hasText(r.description)
    ? r.description
    : titles.length > 0
      ? t('portal.reports.teaserFallback', 'Isi: {{titles}}', { titles: titles.join(' · ') })
      : '';

  return (
    <Link
      to={`/c/${clientId}/reports/${r.id}`}
      aria-label={`${r.title} — ${ReportUtils.formatPeriod(r.month, r.year)}`}
      className="group flex h-full flex-col rounded-2xl border border-border-subtle bg-bg-raised p-4 transition-all hover:-translate-y-px hover:border-border-strong sm:p-5"
    >
      <div className="mb-4 flex gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border-default bg-bg-sunken">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{month}</span>
          <span className="font-display text-lg font-semibold leading-none text-text-primary tabular-nums">{r.year}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 text-base font-semibold leading-snug text-text-primary">{r.title}</h3>
            {latest && (
              <Badge variant="outline" className="h-5 border-transparent bg-brand-cream px-2 text-[10px] font-semibold uppercase tracking-wider text-bg-base">
                {t('portal.reports.latest', 'Terbaru')}
              </Badge>
            )}
          </div>
          {projectLine !== '' && <p className="mt-0.5 truncate text-xs text-text-tertiary">{projectLine}</p>}
          {teaser !== '' && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{teaser}</p>}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('h-6 border-transparent px-2.5 text-xs font-medium', reportStatusChip(r.status))}>
            {statusLabel(r.status)}
          </Badge>
          {typeof r.sectionCount === 'number' && r.sectionCount > 0 && (
            <span className="text-xs text-text-tertiary">{t('portal.reports.sectionsCount', '{{count}} bagian', { count: r.sectionCount })}</span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-text-primary">
          {t('portal.reports.view', 'Lihat laporan')}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default function ReportsTab() {
  const { t } = useTranslation();
  const { clientId = '' } = useParams<{ clientId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-reports', clientId],
    queryFn: () => portalApi.getReports(clientId),
    enabled: clientId !== '',
    retry: false,
  });

  if (isLoading) return <PortalSpinner />;
  if (isError || data === undefined) return <PortalError onRetry={() => void refetch()} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title={t('portal.reports.emptyTitle', 'Belum ada laporan')}
        description={t('portal.reports.emptyDesc', 'Laporan media sosial bulanan Anda akan muncul di sini.')}
      />
    );
  }

  const sorted = [...data].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
  const years = Array.from(new Set(sorted.map((r) => r.year)));
  const latestId = sorted[0].id;

  return (
    <div>
      <p className="mb-5 text-sm text-text-secondary">
        {t('portal.reports.subtitle', 'Ringkasan kinerja media sosial Anda, bulan demi bulan.')}
      </p>
      <div className="space-y-6">
        {years.map((y) => (
          <section key={y} aria-label={String(y)}>
            {years.length > 1 && (
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{y}</h2>
            )}
            <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
              {sorted.filter((r) => r.year === y).map((r) => (
                <li key={r.id} className="min-w-0">
                  <ReportCard r={r} clientId={clientId} latest={r.id === latestId} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
