import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, CalendarDays, Download, Folder, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/monomi/EmptyState';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { httpStatus, portalApi } from '../portalApi';
import { BackLink, hasText, PortalError, PortalSpinner } from '../ui';
import { buildKpis, fmtDate } from '../reports/reportData';
import {
  jumpTo, KpiTile, sectionAnchor, SectionCard, TocChips, type TocItem, TocRail, useActiveAnchor,
} from '../reports/ReportSections';
import { reportStatusChip, useReportStatusLabel } from './ReportsTab';

const SUMMARY_ID = 'laporan-ringkasan';

export default function ReportDetail() {
  const { t } = useTranslation();
  const { clientId = '', reportId = '' } = useParams<{ clientId: string; reportId: string }>();
  const statusLabel = useReportStatusLabel();
  const [downloading, setDownloading] = useState(false);

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-report', clientId, reportId],
    queryFn: () => portalApi.getReport(clientId, reportId),
    enabled: clientId !== '' && reportId !== '',
    retry: false,
  });

  // Sections copied from last month and not yet filled have no data; clients never see empty frames.
  const sections = useMemo(
    () => (report?.sections ?? []).filter((s) => (s.rowCount ?? 0) > 0).sort((a, b) => a.order - b.order),
    [report],
  );
  const kpis = useMemo(() => buildKpis(sections), [sections]);
  const toc: TocItem[] = useMemo(
    () => [
      ...(kpis.length > 0 ? [{ id: SUMMARY_ID, label: t('portal.reports.summary', 'Ringkasan') }] : []),
      ...sections.map((s) => ({ id: sectionAnchor(s.id), label: s.title })),
    ],
    [kpis.length, sections, t],
  );
  const active = useActiveAnchor(toc);

  // `hasPdf`: a stored PDF exists or the report has sections (rendered on demand).
  const hasPdf = report?.hasPdf === true;
  const back = <BackLink to={`/c/${clientId}/reports`}>{t('portal.reports.back', 'Semua laporan')}</BackLink>;

  const download = async () => {
    if (report === undefined) return;
    setDownloading(true);
    try {
      const safe = (hasText(report.title) ? report.title : 'report').replace(/[^\p{L}\p{N} ._-]+/gu, '_').trim().slice(0, 100);
      await portalApi.downloadReportPdf(clientId, reportId, `${safe !== '' ? safe : 'report'}.pdf`);
    } catch (e) {
      toast.error(
        httpStatus(e) === 429
          ? t('portal.common.tooMany', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.')
          : t('portal.reports.pdfFailed', 'PDF tidak dapat diunduh. Coba lagi.'),
      );
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6">
        {back}
        <PortalSpinner />
      </div>
    );
  }
  if (isError || report === undefined) {
    return (
      <div className="px-4 py-6 sm:px-6">
        {back}
        <PortalError
          onRetry={() => void refetch()}
          message={t('portal.reports.loadError', 'Laporan tidak dapat dimuat atau Anda tidak memiliki akses.')}
        />
      </div>
    );
  }

  const project = report.project;
  const projectLine = [project?.number, project?.description].filter(hasText).join(' · ');
  const updated = new Date(report.updatedAt);

  return (
    <div className="report-print px-4 pb-16 pt-5 sm:px-6">
      <style>{`@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-3 print:hidden">{back}</div>

        {/* Hero */}
        <header className="mb-6 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-elevated via-bg-raised to-bg-raised p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-sunken px-3 py-1 text-xs font-medium text-text-secondary">
              <CalendarDays className="h-3.5 w-3.5" />
              {ReportUtils.formatPeriod(report.month, report.year)}
            </span>
            <Badge variant="outline" className={cn('h-7 border-transparent px-3 text-xs font-medium', reportStatusChip(report.status))}>
              {statusLabel(report.status)}
            </Badge>
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-4xl">
            {report.title}
          </h1>
          {projectLine !== '' && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-text-tertiary">
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{projectLine}</span>
            </p>
          )}
          {hasText(report.description) && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">{report.description}</p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center print:hidden">
            {hasPdf && (
              <Button variant="outline" onClick={() => void download()} disabled={downloading} className="h-11 px-5 sm:h-10">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? t('portal.reports.pdfPreparing', 'Menyiapkan PDF…') : t('portal.reports.downloadPdf', 'Unduh PDF')}
              </Button>
            )}
            {downloading && (
              <p className="text-xs text-text-tertiary">{t('portal.reports.pdfHint', 'PDF disiapkan saat diminta dan bisa memakan waktu hingga 30 detik.')}</p>
            )}
            {!downloading && !Number.isNaN(updated.getTime()) && (
              <p className="text-xs text-text-tertiary sm:ml-1">
                {t('portal.reports.updated', 'Diperbarui {{date}}', { date: fmtDate(updated, 'long') })}
              </p>
            )}
          </div>
        </header>

        {sections.length === 0 ? (
          <GlassPanel surface="glass" padding="lg">
            <EmptyState
              icon={<BarChart3 />}
              title={t('portal.reports.noSectionsTitle', 'Laporan belum memiliki isi')}
              description={t('portal.reports.noSectionsDesc', 'Bagian laporan akan tampil di sini setelah tim Monomi menyelesaikannya.')}
            />
          </GlassPanel>
        ) : (
          <>
            <TocChips items={toc} active={active} />
            <div className="mt-5 gap-10 lg:mt-0 lg:grid lg:grid-cols-[190px_minmax(0,1fr)]">
              <TocRail items={toc} active={active} />
              <div className="min-w-0 space-y-6">
                {kpis.length > 0 && (
                  <section id={SUMMARY_ID} className="scroll-mt-32 lg:scroll-mt-24">
                    <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">{t('portal.reports.summary', 'Ringkasan')}</h2>
                    <p className="mb-3 mt-0.5 text-sm text-text-tertiary">{t('portal.reports.summaryHint', 'Angka-angka utama dari laporan ini.')}</p>
                    <div className={cn('grid grid-cols-2 gap-3', kpis.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                      {kpis.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => jumpTo(sectionAnchor(k.sectionId))}
                          className="rounded-xl text-left transition-transform active:scale-[0.99] print:pointer-events-none"
                        >
                          <KpiTile kpi={k} />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {sections.map((s, i) => (
                  <SectionCard key={s.id} section={s} index={i} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
