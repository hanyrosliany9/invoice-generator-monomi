/**
 * ReportPreviewPage — "Preview as client".
 * Renders the report with the client portal's own components (hero, summary,
 * section cards, charts) from the staff data, framed by a banner with the
 * actions that matter before publishing: edit, preview the PDF, send.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { ArrowLeft, Eye, FileText, Loader2, Mail, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useReport } from '@/features/reports/hooks';
import { socialMediaReportsService } from '@/services/social-media-reports';
import { ClientReportBody, ClientReportHero, useStaffStatusLabel } from './ClientReportView';
import { SendReportDialog, reportErrorText } from './ReportActionDialogs';

export default function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const statusLabel = useStaffStatusLabel();
  const { data: report, isLoading } = useReport(id);
  const [pdfPending, setPdfPending] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const previewPdf = async () => {
    if (!id) return;
    const win = window.open('', '_blank');
    setPdfPending(true);
    try {
      await socialMediaReportsService.generatePDF(id, { targetWindow: win });
    } catch (e) {
      win?.close();
      toast.error(reportErrorText(e, t('reportDetail.pdfFailed', 'Failed to generate PDF.')));
    } finally {
      setPdfPending(false);
    }
  };

  const shell = (children: React.ReactNode) => (
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

  if (isLoading) return shell(<><Skeleton className="mb-4 h-14 rounded-lg" /><Skeleton className="h-64 rounded-2xl" /></>);
  if (!report) {
    return shell(
      <EmptyState
        title={t('reportDetail.notFound.title', 'Report not found')}
        description={t('reportDetail.notFound.desc', 'This report may have been deleted or you may not have access.')}
        action={<Button size="sm" variant="outline" onClick={() => navigate('/reports/social-media')}><ArrowLeft className="h-4 w-4" />{t('reportDetail.backToList', 'Back to Reports')}</Button>}
      />,
    );
  }

  return shell(
    <>
      <div className="-mx-4 mb-5 sm:sticky sm:top-0 sm:z-20 border-b border-border-default bg-bg-base/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Eye className="h-4 w-4 shrink-0 text-text-tertiary" />
          <div className="min-w-[min(100%,16rem)] flex-1 text-sm">
            <span className="font-medium text-text-primary">{t('reportPreview.banner', 'Preview: this is what the client sees')}</span>
            <span className="block text-xs text-text-tertiary sm:ml-2 sm:inline">
              {report.status === 'DRAFT'
                ? t('reportPreview.draftNote', 'Status: {{status}}. The client cannot open it yet.', { status: statusLabel(report.status) })
                : t('reportPreview.liveNote', 'Status: {{status}}. Already visible to the client.', { status: statusLabel(report.status) })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GuideHelpLink slug="laporan-bulanan" anchor="pratinjau-klien" />
            <Button asChild size="sm" variant="outline">
              <Link to={`/reports/${report.id}`}><ArrowLeft className="h-4 w-4" />{t('reportBuilder.backToReport', 'Back to Report')}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/reports/${report.id}/edit`}><Pencil className="h-4 w-4" />{t('reportDetail.editData', 'Edit data')}</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void previewPdf()} disabled={pdfPending || (report.sections ?? []).length === 0}>
              {pdfPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {t('reportPreview.pdf', 'Preview PDF')}
            </Button>
            <Button size="sm" onClick={() => setSendOpen(true)}>
              <Mail className="h-4 w-4" />
              {t('reportActions.send.menu', 'Send to client')}
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1180px]">
        <ClientReportHero report={report} />
        <ClientReportBody report={report} editHref={`/reports/${report.id}/edit`} />
      </div>
      <SendReportDialog report={report} open={sendOpen} onOpenChange={setSendOpen} />
    </>,
  );
}
