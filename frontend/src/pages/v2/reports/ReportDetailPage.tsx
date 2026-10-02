/**
 * ReportDetailPage (v2) — a saved report.
 *
 * Header with status + actions (edit data, preview as client / PDF, send to
 * client, publish, back to draft, copy to next month), then the report body
 * rendered with the SAME components as the client portal, so what staff read
 * here is exactly what the client sees. Editing lives in the builder.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MoreHorizontal, Pencil, Trash2, Download, CheckCircle2, RefreshCw,
  FileBarChart, Copy, EyeOff, Globe, Settings2, Mail, Eye, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
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
import { fmtDate } from '@/portal/reports/reportData';
import type { ReportStatus } from '@/features/reports/types/report.types';
import { EditReportDialog, SendReportDialog, reportErrorText } from './ReportActionDialogs';
import { ClientReportBody, statusChipClass, useStaffStatusLabel } from './ClientReportView';
import { CopyReportDialog } from './CopyReportDialog';

function Shell({ user, children }: { user: { name: string; role: string } | null; children: React.ReactNode }) {
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

export default function ReportDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const statusLabel = useStaffStatusLabel();

  const { data: report, isLoading, error, refetch, isFetching } = useReport(id);
  const { updateStatus, deleteReport } = useReportMutations();

  const [pdfPending, setPdfPending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const [copyOpen, setCopyOpen] = useState(false);

  const totals = useMemo(() => {
    const sections = report?.sections ?? [];
    return {
      sections: sections.length,
      visualizations: sections.reduce((acc, s) => acc + (s.visualizations?.length ?? 0), 0),
      rows: sections.reduce((acc, s) => acc + (s.rowCount ?? 0), 0),
    };
  }, [report]);

  const runPdf = async (preview: boolean) => {
    if (!id) return;
    // Open the tab inside the click so pop-up blockers allow it.
    const win = preview ? window.open('', '_blank') : null;
    try {
      setPdfPending(true);
      await socialMediaReportsService.generatePDF(id, { targetWindow: win });
      if (!preview) toast.success(t('reportDetail.pdfDownloaded', 'PDF downloaded.'));
    } catch (e) {
      win?.close();
      toast.error(reportErrorText(e, t('reportDetail.pdfFailed', 'Failed to generate PDF.')));
    } finally {
      setPdfPending(false);
    }
  };

  const handleDelete = () => {
    if (!report) return;
    if (confirm(t('reportDetail.confirmDelete', `Delete report "${report.title}"? This action cannot be undone.`))) {
      deleteReport.mutate(report.id, {
        onSuccess: () => {
          toast.success(t('reportDetail.deleted', 'Report deleted.'));
          navigate('/reports/social-media');
        },
        onError: () => toast.error(t('reportDetail.deleteFailed', 'Failed to delete report.')),
      });
    }
  };

  const setStatus = (status: ReportStatus) => {
    if (!report) return;
    updateStatus.mutate(
      { id: report.id, status },
      {
        onSuccess: () =>
          toast.success(
            status === 'DRAFT'
              ? t('reportActions.revert.done', 'Report moved back to draft. It is no longer visible to the client.')
              : t('reportDetail.statusUpdated', 'Report status updated.'),
          ),
        onError: (e) => toast.error(reportErrorText(e, t('reportDetail.statusFailed', 'Failed to update status.'))),
      },
    );
  };

  const handleRevertToDraft = () => {
    if (!report) return;
    if (
      confirm(
        t(
          'reportActions.revert.confirm',
          'Move this report back to draft? It will disappear from the client portal until you complete or send it again.',
        ),
      )
    ) {
      setStatus('DRAFT');
    }
  };

  if (isLoading) {
    return (
      <Shell user={user}>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </Shell>
    );
  }

  if (error || !report) {
    return (
      <Shell user={user}>
        <EmptyState
          icon={<FileBarChart className="h-12 w-12" />}
          title={t('reportDetail.notFound.title', 'Report not found')}
          description={
            error instanceof Error
              ? error.message
              : t('reportDetail.notFound.desc', 'This report may have been deleted or you may not have access.')
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/reports/social-media')}>
                <ArrowLeft className="h-4 w-4" />
                {t('reportDetail.backToList', 'Back to Reports')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>{t('common.retry', 'Retry')}</Button>
            </div>
          }
        />
      </Shell>
    );
  }

  const canEdit = ReportUtils.canEdit(report.status);
  const canGenPdf = ReportUtils.canGeneratePDF(report.sections?.length ?? 0);
  const editHref = `/reports/${report.id}/edit`;

  return (
    <Shell user={user}>
      <div className="mb-4">
        <Link
          to="/reports/social-media"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors max-sm:min-h-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('reportBuilder.backToList', 'Back to Reports')}
        </Link>
      </div>

      <PageHeader
        title={report.title || '—'}
        description={report.description || t('reportDetail.subtitle2', 'This is the report as the client sees it.')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <GuideHelpLink slug="laporan-bulanan" anchor="tayangkan" />
            <Badge
              variant="outline"
              className={cn('border-transparent px-3 h-7 text-[11px] font-medium uppercase tracking-wider', statusChipClass(report.status))}
            >
              {statusLabel(report.status)}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label={t('reportDetail.refresh', 'Refresh')}>
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">{t('reportDetail.refresh', 'Refresh')}</span>
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => navigate(editHref)}>
                <Pencil className="h-4 w-4" />
                {t('reportDetail.editData', 'Edit data')}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.moreActions', 'More Actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => navigate(`/reports/${report.id}/preview`)}>
                  <Eye className="h-3.5 w-3.5" />
                  {t('reportPreview.button', 'Preview as client')}
                </DropdownMenuItem>
                {canGenPdf && (
                  <>
                    <DropdownMenuItem onClick={() => void runPdf(true)} disabled={pdfPending}>
                      <FileText className="h-3.5 w-3.5" />
                      {t('reportPreview.pdf', 'Preview PDF')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void runPdf(false)} disabled={pdfPending}>
                      <Download className={cn('h-3.5 w-3.5', pdfPending && 'animate-pulse')} />
                      {pdfPending ? t('reportDetail.generatePdfPending', 'Generating…') : t('reportDetail.downloadPdf', 'Download PDF')}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSendOpen(true)}>
                  <Mail className="h-3.5 w-3.5" />
                  {report.status === 'SENT'
                    ? t('reportActions.send.again', 'Send to client again')
                    : t('reportActions.send.menu', 'Send to client')}
                </DropdownMenuItem>
                {report.status === 'DRAFT' && (
                  <DropdownMenuItem onClick={() => setStatus('COMPLETED')}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('reportActions.publish', 'Publish to portal (no email)')}
                  </DropdownMenuItem>
                )}
                {report.status !== 'DRAFT' && (
                  <DropdownMenuItem onClick={handleRevertToDraft}>
                    <EyeOff className="h-3.5 w-3.5" />
                    {t('reportActions.revert.menu', 'Back to draft')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  {t('reportActions.edit.menu', 'Edit title & period')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCopyOpen(true)}>
                  <Copy className="h-3.5 w-3.5" />
                  {t('reportActions.duplicate.menu', 'Copy to next month')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-danger focus:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete', 'Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Client visibility: COMPLETED/SENT reports are live in the client portal. */}
      {report.status === 'DRAFT' ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border-subtle bg-bg-sunken px-4 py-3 text-sm text-text-secondary">
          <EyeOff className="h-4 w-4 shrink-0 text-text-tertiary" />
          <span className="min-w-0 flex-1">
            {t('reportActions.banner.draft', 'Draft: not visible to the client yet.')}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/reports/${report.id}/preview`)}>
              <Eye className="h-4 w-4" />
              {t('reportPreview.button', 'Preview as client')}
            </Button>
            <Button size="sm" onClick={() => setSendOpen(true)}>
              <Mail className="h-4 w-4" />
              {t('reportActions.send.menu', 'Send to client')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-text-secondary">
          <Globe className="h-4 w-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1">
            {t('reportActions.banner.live', 'Live in the client portal. Edits are visible to the client immediately.')}{' '}
            {report.emailedAt
              ? t('reportActions.banner.emailed', 'Emailed to {{to}} on {{date}}.', {
                  to: (report.emailedTo ?? []).join(', ') || '—',
                  date: fmtDate(new Date(report.emailedAt), 'medium'),
                })
              : t('reportActions.banner.notEmailed', 'The client has not been emailed about it.')}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSendOpen(true)}>
              <Mail className="h-4 w-4" />
              {report.emailedAt ? t('reportActions.send.again', 'Send to client again') : t('reportActions.send.menu', 'Send to client')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRevertToDraft} disabled={updateStatus.isPending}>
              <EyeOff className="h-4 w-4" />
              {t('reportActions.revert.menu', 'Back to draft')}
            </Button>
          </div>
        </div>
      )}
      <EditReportDialog report={report} open={editOpen} onOpenChange={setEditOpen} />
      <SendReportDialog report={report} open={sendOpen} onOpenChange={setSendOpen} />
      <CopyReportDialog
        source={{ id: report.id, projectId: report.projectId, month: report.month, year: report.year, title: report.title }}
        open={copyOpen}
        onOpenChange={setCopyOpen}
      />

      {/* Identity strip */}
      <GlassPanel surface="glass" padding="md" className="mb-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{t('reportDetail.period', 'Period')}</dt>
            <dd className="mt-1 text-sm font-medium text-text-primary">{ReportUtils.formatPeriod(report.month, report.year)}</dd>
          </div>
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{t('reportDetail.project', 'Project')}</dt>
            <dd className="mt-1 min-w-0 text-sm text-text-primary">
              {report.project ? (
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${report.project!.id}`)}
                  className="max-w-full break-words text-left hover:text-text-secondary transition-colors"
                >
                  {report.project.description}
                </button>
              ) : '—'}
              {report.project?.client?.name && <span className="block text-xs text-text-tertiary">{report.project.client.name}</span>}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{t('reportDetail.contents', 'Contents')}</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {t('reportDetail.contentsValue', '{{sections}} sections, {{charts}} charts, {{rows}} rows', {
                sections: totals.sections, charts: totals.visualizations, rows: totals.rows,
              })}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{t('reportDetail.updated', 'Updated')}</dt>
            <dd className="mt-1"><DateDisplay date={report.updatedAt} className="text-sm text-text-secondary" /></dd>
          </div>
        </dl>
      </GlassPanel>

      {(!report.sections || report.sections.length === 0) ? (
        <GlassPanel surface="glass" padding="lg">
          <EmptyState
            icon={<FileBarChart className="h-12 w-12" />}
            title={t('reportDetail.noSections.title', 'No sections yet')}
            description={t('reportDetail.noSections.desc2', 'Add data (upload a file or type the numbers) in the report editor.')}
            action={
              <Button size="sm" onClick={() => navigate(editHref)}>
                <Pencil className="h-4 w-4" />
                {t('reportDetail.openBuilder', 'Open Editor')}
              </Button>
            }
          />
        </GlassPanel>
      ) : (
        <ClientReportBody report={report} editHref={editHref} />
      )}
    </Shell>
  );
}
