/**
 * ReportBuilderPage (v2) — fill in a monthly social media report.
 *
 *   /reports/builder      → CREATE (title, project, period → save → edit)
 *   /reports/:id/edit     → EDIT   (details + data sections + charts)
 *
 * A non-technical staff member should be able to finish a month in minutes:
 *   • new report: sensible defaults (last month, a ready title), "copy last
 *     month's structure" when the project already has a report
 *   • sections: upload an export (previewed first), type numbers in a grid
 *     (pre-filled with the month's dates, paste from Excel), or enter a few
 *     headline numbers; CSV/XLSX templates are one click away
 *   • charts: suggested automatically, each with a live preview that matches
 *     what the client sees; "Preview as client" opens the real client view
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, AlertTriangle, Layers, Eye, Copy, Loader2, ExternalLink,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { useReport } from '@/features/reports/hooks';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { useProjects } from '@/hooks/useProjects';
import { socialMediaReportsService } from '@/services/social-media-reports';
import type {
  ReportSection,
  VisualizationConfig,
  CreateReportDto,
} from '@/features/reports/types/report.types';
import { AddSectionPanel } from './AddSectionPanel';
import { SectionCard } from './SectionEditor';
import { reportErrorText } from './ReportActionDialogs';

/* ------------------------------------------------------------------ */
/*  Shell — MUST be module-level. Defining it inside the page          */
/*  component re-created it on every render, so each keystroke         */
/*  remounted the whole form subtree and inputs lost focus.            */
/* ------------------------------------------------------------------ */

const BuilderShell = ({
  user,
  children,
}: {
  user: { name: string; role: string } | null | undefined;
  children: React.ReactNode;
}) => (
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

function projectLabel(p: any): string {
  return `${p.description || p.number}${p.client?.name ? ` · ${p.client.name}` : ''}`;
}

/** The month people normally report on: the previous one. */
function defaultPeriod(): { month: number; year: number } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportBuilderPageV2() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleDateString(i18n.language?.startsWith('id') ? 'id-ID' : 'en-US', { month: 'long' }),
      ),
    [i18n.language],
  );

  const { data: projects = [] } = useProjects();
  const { data: report, isLoading: reportLoading } = useReport(isEditMode ? id : undefined);

  /* ---------- identity state ---------- */
  const initial = useMemo(defaultPeriod, []);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [month, setMonth] = useState<number>(initial.month);
  const [year, setYear] = useState<number>(initial.year);
  const [submitted, setSubmitted] = useState(false);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now + 1 - 2020 + 1 }, (_, i) => 2020 + i).reverse();
  }, []);

  const project = useMemo(() => projects.find((p: any) => p.id === projectId), [projects, projectId]);

  // Pre-fill the title from client + period until the user types their own.
  useEffect(() => {
    if (isEditMode || titleTouched) return;
    const client = project?.client?.name as string | undefined;
    const period = ReportUtils.formatPeriod(month, year, 'id-ID');
    setTitle(`Laporan Media Sosial${client ? ` ${client.replace(/^\[[^\]]*\]\s*/, '')}` : ''} ${period}`);
  }, [isEditMode, titleTouched, project, month, year]);

  // Hydrate identity fields from server data on edit.
  useEffect(() => {
    if (!isEditMode || !report) return;
    setTitle(report.title ?? '');
    setDescription(report.description ?? '');
    setProjectId(report.projectId ?? '');
    setMonth(report.month ?? initial.month);
    setYear(report.year ?? initial.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  // Reports of the chosen project: offer "copy the last one" and catch duplicates early.
  const { data: projectReports = [] } = useQuery({
    queryKey: ['reports', { projectId }],
    queryFn: () => socialMediaReportsService.getReports({ projectId }),
    enabled: !isEditMode && projectId !== '',
  });
  const latest = projectReports[0];
  const clash = projectReports.find((r) => r.month === month && r.year === year);

  /* ---------- unsaved chart edits ---------- */
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const onDirtyChange = (sectionId: string, isDirty: boolean) =>
    setDirty((prev) => {
      if (prev.has(sectionId) === isDirty) return prev;
      const next = new Set(prev);
      if (isDirty) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  useEffect(() => {
    if (dirty.size === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty.size]);
  const confirmLeave = (e: React.MouseEvent) => {
    if (dirty.size > 0 && !confirm(t('reportViz.leaveConfirm', 'You have chart changes that are not saved. Leave without saving?'))) {
      e.preventDefault();
    }
  };

  /* ---------- mutations ---------- */
  const createMutation = useMutation({
    mutationFn: (data: CreateReportDto) => socialMediaReportsService.createReport(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('reportBuilder.created', 'Report created successfully.'));
      navigate(`/reports/${newReport.id}/edit`);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportBuilder.createFailed', 'Failed to create report.'))),
  });

  const copyMutation = useMutation({
    mutationFn: () => socialMediaReportsService.duplicateReport(latest!.id, { month, year }),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(
        t('reportActions.duplicate.done', 'Copied to {{period}} as a draft. Upload new data to each section.', {
          period: ReportUtils.formatPeriod(copy.month, copy.year),
        }),
      );
      navigate(`/reports/${copy.id}/edit`);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportActions.duplicate.failed', 'Failed to copy the report.'))),
  });

  const updateIdentityMutation = useMutation({
    mutationFn: () =>
      socialMediaReportsService.updateReport(id!, {
        title: title.trim(),
        description: description.trim(),
        month,
        year,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('reportBuilder.identitySaved', 'Report details saved.'));
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportBuilder.identitySaveFailed', 'Failed to save report details.'))),
  });

  const removeSectionMutation = useMutation({
    mutationFn: (sectionId: string) => socialMediaReportsService.removeSection(id!, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      toast.success(t('reportBuilder.sectionRemoved', 'Section removed.'));
    },
    onError: () => toast.error(t('reportBuilder.sectionRemoveFailed', 'Failed to remove section.')),
  });

  const reorderMutation = useMutation({
    mutationFn: (sectionIds: string[]) => socialMediaReportsService.reorderSections(id!, sectionIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report', id] }),
    onError: () => toast.error(t('reportBuilder.reorderFailed', 'Failed to reorder sections.')),
  });

  const updateVizMutation = useMutation({
    mutationFn: ({ sectionId, visualizations }: { sectionId: string; visualizations: VisualizationConfig[] }) =>
      socialMediaReportsService.updateVisualizations(id!, sectionId, { visualizations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      toast.success(t('reportBuilder.vizSaved', 'Visualization saved.'));
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportBuilder.vizFailed', 'Failed to save visualization.'))),
  });

  /* ---------- handlers ---------- */
  const titleError = submitted && title.trim() === '';
  const projectError = submitted && !isEditMode && projectId === '';

  const handleSaveIdentity = () => {
    setSubmitted(true);
    if (!title.trim() || (!isEditMode && !projectId)) {
      toast.error(!title.trim() ? t('reportBuilder.titleRequired', 'Title is required.') : t('reportBuilder.projectRequired', 'Please select a project.'));
      return;
    }
    if (!isEditMode) {
      createMutation.mutate({ title: title.trim(), description: description.trim() || undefined, projectId, month, year });
      return;
    }
    if (
      report && report.status !== 'DRAFT' &&
      !confirm(
        t(
          'reportBuilder.liveEditConfirm',
          'This report is live in the client portal. Your changes will be visible to the client immediately. Save anyway?',
        ),
      )
    ) {
      return;
    }
    updateIdentityMutation.mutate();
  };

  const scrollToSection = (sectionId: string) => {
    setTimeout(() => document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
  };

  /* ---------- loading edit ---------- */
  if (isEditMode && reportLoading) {
    return (
      <BuilderShell user={user}>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </BuilderShell>
    );
  }

  if (isEditMode && !report) {
    return (
      <BuilderShell user={user}>
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title={t('reportBuilder.notFound.title', 'Report not found')}
          description={t('reportBuilder.notFound.desc', 'This report may have been deleted.')}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4" />
              {t('reportBuilder.backToList', 'Back to Reports')}
            </Button>
          }
        />
      </BuilderShell>
    );
  }

  const sections = (report?.sections ?? []).slice().sort((a, b) => a.order - b.order);
  const identityDirty = isEditMode && report
    ? title.trim() !== report.title || description.trim() !== (report.description ?? '') || month !== report.month || year !== report.year
    : false;

  /* ---------- render ---------- */
  return (
    <BuilderShell user={user}>
      <div className="mb-4">
        <Link
          to={isEditMode && id ? `/reports/${id}` : '/reports/social-media'}
          onClick={confirmLeave}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors max-sm:min-h-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isEditMode
            ? t('reportBuilder.backToReport', 'Back to Report')
            : t('reportBuilder.backToList', 'Back to Reports')}
        </Link>
      </div>

      <PageHeader
        title={isEditMode ? t('reportBuilder.editTitle', 'Edit Report') : t('reportBuilder.createTitle', 'New Report')}
        description={
          isEditMode
            ? t('reportBuilder.editSubtitle2', 'Add this month\'s data, check the charts, then preview as the client and send.')
            : t('reportBuilder.createSubtitle', 'Start by defining the report identity, then add sections.')
        }
        actions={
          isEditMode && report ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/reports/${report.id}/preview`} onClick={confirmLeave}>
                  <Eye className="h-4 w-4" />
                  {t('reportPreview.button', 'Preview as client')}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to={`/reports/${report.id}`} onClick={confirmLeave}>
                  {t('reportBuilder.finish', 'Done: view report')}
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Identity */}
      <GlassPanel surface="glass" padding="lg" className="mb-6">
        <div className="mb-5">
          <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
            {t('reportBuilder.identity.title', 'Report Identity')}
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {isEditMode
              ? t('reportBuilder.identity.editSubtitle2', 'Title, description and period can be changed. The project is fixed.')
              : t('reportBuilder.identity.createSubtitle2', 'Title, project, and reporting period.')}
          </p>
        </div>

        {isEditMode && report && report.status !== 'DRAFT' && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              {t(
                'reportBuilder.liveWarning',
                'This report is live in the client portal. Every change you save (details, sections, charts) is visible to the client immediately. Move it back to draft from the report page to edit privately.',
              )}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="min-w-0">
            <Label htmlFor="project">
              {t('reportBuilder.field.project', 'Project')} {!isEditMode && <span className="text-danger">*</span>}
            </Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isEditMode}>
              <SelectTrigger id="project" aria-invalid={projectError} title={project ? projectLabel(project) : undefined} className={`w-full min-w-0 bg-bg-sunken border-border-subtle text-text-secondary *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate ${projectError ? 'border-danger' : ''}`}>
                <SelectValue placeholder={t('reportBuilder.field.projectPlaceholder', 'Select project')} />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} title={projectLabel(p)} className="items-start break-words whitespace-normal">
                    {projectLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projectError && <p className="mt-1 text-xs text-danger">{t('reportBuilder.projectRequired', 'Please select a project.')}</p>}
          </div>

          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
            <div className="min-w-0">
              <Label htmlFor="month">{t('reportBuilder.field.month', 'Month')}</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger id="month" className="w-full min-w-0 bg-bg-sunken border-border-subtle text-text-secondary *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="year">{t('reportBuilder.field.year', 'Year')}</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger id="year" className="w-full min-w-0 bg-bg-sunken border-border-subtle text-text-secondary tabular-nums *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="title">
              {t('reportBuilder.field.title', 'Report Title')} <span className="text-danger">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
              aria-invalid={titleError}
              placeholder={t('reportBuilder.field.titlePlaceholder', 'e.g. Social Media Report July 2025')}
              className={`bg-bg-sunken border-border-subtle text-text-primary ${titleError ? 'border-danger' : ''}`}
            />
            {titleError && <p className="mt-1 text-xs text-danger">{t('reportBuilder.titleRequired', 'Title is required.')}</p>}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">{t('reportBuilder.field.description', 'Description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('reportBuilder.field.descriptionPlaceholder', 'Optional')}
              className="bg-bg-sunken border-border-subtle text-text-primary"
            />
          </div>
        </div>

        {/* New report: catch duplicates and offer to copy the last month. */}
        {!isEditMode && clash && (
          <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span className="min-w-0 flex-1">
              {t('reportBuilder.clash', 'A report for this project in {{period}} already exists: {{title}}.', {
                period: ReportUtils.formatPeriod(month, year), title: clash.title,
              })}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to={`/reports/${clash.id}/edit`}><ExternalLink className="h-3.5 w-3.5" />{t('reportBuilder.openExisting', 'Open it')}</Link>
            </Button>
          </div>
        )}
        {!isEditMode && latest && !clash && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-bg-sunken p-3 text-xs text-text-secondary">
            <Copy className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="min-w-0 flex-1">
              {t('reportBuilder.copyHint', 'Last report for this project: {{title}} ({{period}}). Copy its sections and charts to {{target}} and only fill in the new numbers.', {
                title: latest.title,
                period: ReportUtils.formatPeriod(latest.month, latest.year),
                target: ReportUtils.formatPeriod(month, year),
              })}
            </span>
            <Button size="sm" variant="outline" onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending}>
              {copyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
              {t('reportBuilder.copyAction', 'Copy last report')}
            </Button>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          {isEditMode ? (
            <Button size="sm" onClick={handleSaveIdentity} disabled={updateIdentityMutation.isPending || !report || !identityDirty}>
              <Save className="h-4 w-4" />
              {t('reportBuilder.saveDetails', 'Save details')}
            </Button>
          ) : (
            <Button onClick={handleSaveIdentity} disabled={createMutation.isPending || !!clash}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('reportBuilder.saveAndContinue', 'Save & Continue')}
            </Button>
          )}
        </div>
      </GlassPanel>

      {/* Sections: only in edit mode (a saved report is needed first). */}
      {isEditMode && report && (
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5">
            <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
              {t('reportBuilder.sections.title', 'Data Sections')}
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {t('reportBuilder.sections.subtitle2', '{{count}} sections. Each section is one table of numbers with its charts.', { count: sections.length })}
            </p>
          </div>

          {sections.length > 1 && (
            <nav
              aria-label={t('reportBuilder.jumpToSection', 'Jump to section')}
              className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-2 border-y border-border-default bg-bg-base/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
            >
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-text-tertiary max-sm:sr-only">
                {t('reportBuilder.jumpToSection', 'Jump to section')}
              </span>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.title}
                    onClick={() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex min-h-8 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-bg-sunken px-3 text-xs text-text-secondary hover:bg-bg-raised hover:text-text-primary sm:min-h-7"
                  >
                    <span className="font-semibold tabular-nums text-text-primary">{s.order}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}

          <AddSectionPanel
            reportId={report.id}
            month={report.month}
            year={report.year}
            defaultOpen={sections.length === 0}
            onAdded={(s) => {
              queryClient.invalidateQueries({ queryKey: ['report', id] });
              queryClient.invalidateQueries({ queryKey: ['reports'] });
              scrollToSection(s.id);
            }}
          />

          {sections.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-12 w-12" />}
              title={t('reportBuilder.noSections.title', 'No sections yet')}
              description={t('reportBuilder.noSections.desc2', 'Upload a file, type the numbers in a table, or enter a few headline numbers above to create your first section.')}
            />
          ) : (
            <div className="space-y-6">
              {sections.map((s: ReportSection, i) => (
                <SectionCard
                  key={s.id}
                  reportId={report.id}
                  section={s}
                  month={report.month}
                  year={report.year}
                  isFirst={i === 0}
                  isLast={i === sections.length - 1}
                  onRemove={() => removeSectionMutation.mutate(s.id)}
                  onMoveUp={() => reorderMutation.mutate(move(sections, i, -1))}
                  onMoveDown={() => reorderMutation.mutate(move(sections, i, 1))}
                  onSaveViz={(viz) => updateVizMutation.mutateAsync({ sectionId: s.id, visualizations: viz })}
                  isSavingViz={updateVizMutation.isPending && updateVizMutation.variables?.sectionId === s.id}
                  onDirtyChange={onDirtyChange}
                />
              ))}
            </div>
          )}
        </GlassPanel>
      )}

      {isEditMode && report && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-2 border-t border-border-default bg-bg-base/95 px-4 py-2.5 backdrop-blur sm:hidden">
          {identityDirty && (
            <Button size="sm" variant="outline" className="min-h-10 flex-1" onClick={handleSaveIdentity} disabled={updateIdentityMutation.isPending}>
              <Save className="h-4 w-4" />
              {t('reportBuilder.saveDetails', 'Save details')}
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="min-h-10 flex-1">
            <Link to={`/reports/${report.id}/preview`} onClick={confirmLeave}>
              <Eye className="h-4 w-4" />
              {t('reportPreview.button', 'Preview as client')}
            </Link>
          </Button>
          <Button asChild size="sm" className="min-h-10 flex-1">
            <Link to={`/reports/${report.id}`} onClick={confirmLeave}>
              {t('reportBuilder.finishShort', 'Done')}
            </Link>
          </Button>
        </div>
      )}
    </BuilderShell>
  );
}

/** Section ids with the item at `i` swapped with its neighbour. */
function move(sections: ReportSection[], i: number, dir: -1 | 1): string[] {
  const ids = sections.map((s) => s.id);
  const j = i + dir;
  if (j < 0 || j >= ids.length) return ids;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}
