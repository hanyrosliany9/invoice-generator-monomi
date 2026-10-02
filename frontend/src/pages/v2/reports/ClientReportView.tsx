/**
 * The report as the CLIENT sees it, built from the very same components the
 * client portal uses (KPI summary, section cards, PortalChart), fed with the
 * staff-side report. Used by the staff report page and the "Preview as client"
 * page, so what staff check is what the client gets.
 *
 * Like the portal, sections without data are not shown to the client; staff
 * get a hint listing them.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { buildKpis, fmtDate } from '@/portal/reports/reportData';
import { KpiTile, SectionCard, sectionAnchor } from '@/portal/reports/ReportSections';
import type { SocialMediaReport } from '@/types/report';

export const useStaffStatusLabel = () => {
  const { t } = useTranslation();
  return (status: string): string => {
    switch (status) {
      case 'COMPLETED': return t('reportStatus.completed', 'Completed');
      case 'SENT': return t('reportStatus.sent', 'Sent');
      default: return t('reportStatus.draft', 'Draft');
    }
  };
};

export const statusChipClass = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-success/10 text-success';
    case 'SENT': return 'bg-info/10 text-info';
    default: return 'bg-bg-sunken text-text-tertiary';
  }
};

export function ClientReportHero({ report }: { report: SocialMediaReport }) {
  const statusLabel = useStaffStatusLabel();
  const { t } = useTranslation();
  const project = report.project;
  const projectLine = [project?.number, project?.description].filter((s) => typeof s === 'string' && s !== '').join(' · ');
  const updated = new Date(report.updatedAt);
  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-elevated via-bg-raised to-bg-raised p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-sunken px-3 py-1 text-xs font-medium text-text-secondary">
          <CalendarDays className="h-3.5 w-3.5" />
          {ReportUtils.formatPeriod(report.month, report.year)}
        </span>
        <Badge variant="outline" className={cn('h-7 border-transparent px-3 text-xs font-medium', statusChipClass(report.status))}>
          {statusLabel(report.status)}
        </Badge>
      </div>
      <h1 className="mt-3 max-w-3xl break-words font-display text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-4xl">
        {report.title}
      </h1>
      {projectLine !== '' && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-text-tertiary">
          <Folder className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">{projectLine}</span>
        </p>
      )}
      {report.description && (
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">{report.description}</p>
      )}
      {!Number.isNaN(updated.getTime()) && (
        <p className="mt-4 text-xs text-text-tertiary">
          {t('portal.reports.updated', 'Diperbarui {{date}}', { date: fmtDate(updated, 'long') })}
        </p>
      )}
    </header>
  );
}

export function ClientReportBody({ report, editHref }: { report: SocialMediaReport; editHref?: string }) {
  const { t } = useTranslation();
  const all = useMemo(() => (report.sections ?? []).slice().sort((a, b) => a.order - b.order), [report.sections]);
  const sections = useMemo(() => all.filter((s) => (s.rowCount ?? 0) > 0), [all]);
  const empty = all.filter((s) => (s.rowCount ?? 0) === 0);
  const kpis = useMemo(() => buildKpis(sections), [sections]);

  return (
    <div className="min-w-0 space-y-6">
      {editHref && empty.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-secondary">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span className="min-w-0 flex-1">
            {t('reportPreview.emptyHidden', '{{count}} section(s) have no data and are hidden from the client: {{names}}.', {
              count: empty.length, names: empty.map((s) => s.title).join(', '),
            })}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to={editHref}>{t('reportPreview.fillData', 'Fill in data')}</Link>
          </Button>
        </div>
      )}

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-default p-8 text-center text-sm text-text-tertiary">
          {t('reportPreview.noContent', 'This report has no data yet, so the client would see an empty report.')}
        </div>
      ) : (
        <>
          {kpis.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">{t('portal.reports.summary', 'Ringkasan')}</h2>
              <p className="mb-3 mt-0.5 text-sm text-text-tertiary">{t('portal.reports.summaryHint', 'Angka-angka utama dari laporan ini.')}</p>
              <div className={cn('grid grid-cols-2 gap-3', kpis.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                {kpis.map((k) => (
                  <a key={k.id} href={`#${sectionAnchor(k.sectionId)}`} className="rounded-xl text-left">
                    <KpiTile kpi={k} />
                  </a>
                ))}
              </div>
            </section>
          )}
          {sections.map((s, i) => (
            <SectionCard key={s.id} section={s} index={i} />
          ))}
        </>
      )}
    </div>
  );
}
