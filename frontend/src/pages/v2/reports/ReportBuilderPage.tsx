/**
 * ReportBuilderPage (v2) — Pragmatic, working report builder.
 *
 * Scope note (read before extending):
 *   The classic ReportBuilderPage is a 1137-line drag-and-drop canvas
 *   (react-grid-layout + Zustand store + undo/redo + multi-section
 *   widget palette + PDF snapshot via html2canvas). For v2 we ship a
 *   *working subset* that covers the high-frequency path:
 *
 *     1. Identity (title, description, project, month, year)
 *     2. Sections (upload CSV → name → optional description → add)
 *     3. Per-section visualization configuration (form-driven, not D&D)
 *        — chart type, title, x-axis, y-axis, aggregation, valueKey
 *
 *   What is INTENTIONALLY deferred to "expand later":
 *     • Drag-and-drop grid layout (react-grid-layout integration)
 *     • Widget palette (Text/Metric/Image/Callout/Divider widgets)
 *     • Per-widget freeform positioning, multi-select, undo/redo
 *     • Live preview pane while editing
 *     • html2canvas snapshot-based PDF (we use server-side PDF instead)
 *
 *   The subset is *complete enough* to author a useful report end-to-end:
 *   create → seed with one or more CSV sections → configure at least one
 *   chart per section → save as DRAFT → mark COMPLETED → generate PDF.
 *   Each deferred capability is also reachable in the classic UI until
 *   the v2 canvas lands.
 *
 *   Two URL modes:
 *     /v2/reports/builder         → CREATE (identity step → save → redirect to edit)
 *     /v2/reports/:id/edit        → EDIT (identity panel + section editor)
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, BarChart3,
  ArrowLeft, Save, Plus, Upload, Trash2, ChevronUp, ChevronDown, X,
  LineChart as LineChartIcon, BarChart2, PieChart as PieIcon,
  Activity, Hash, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useReport } from '@/features/reports/hooks';
import { useProjects } from '@/hooks/useProjects';
import { socialMediaReportsService } from '@/services/social-media-reports';
import type {
  ReportSection,
  VisualizationConfig,
  CreateReportDto,
} from '@/features/reports/types/report.types';

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

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const CHART_TYPES: { value: VisualizationConfig['type']; label: string; Icon: typeof LineChartIcon }[] = [
  { value: 'line',         label: 'Garis',         Icon: LineChartIcon },
  { value: 'bar',          label: 'Batang',        Icon: BarChart2 },
  { value: 'area',         label: 'Area',          Icon: Activity },
  { value: 'pie',          label: 'Lingkaran',     Icon: PieIcon },
  { value: 'metric_card',  label: 'Kartu Metrik',  Icon: Hash },
];

const AGGREGATIONS: VisualizationConfig['aggregation'][] = ['sum', 'average', 'count', 'min', 'max'];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportBuilderPageV2() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useProjects();
  const { data: report, isLoading: reportLoading } = useReport(isEditMode ? id : undefined);

  /* ---------- identity state ---------- */
  const today = new Date();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [year, setYear] = useState<number>(today.getFullYear());

  // Hydrate identity fields from server data on edit.
  useEffect(() => {
    if (!isEditMode || !report) return;
    setTitle(report.title ?? '');
    setDescription(report.description ?? '');
    setProjectId(report.projectId ?? '');
    setMonth(report.month ?? today.getMonth() + 1);
    setYear(report.year ?? today.getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  /* ---------- mutations (wrapped without AntD App.useApp) ---------- */
  const createMutation = useMutation({
    mutationFn: (data: CreateReportDto) => socialMediaReportsService.createReport(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('builder.created', 'Laporan berhasil dibuat.'));
      navigate(`/v2/reports/${newReport.id}/edit`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? t('builder.createFailed', 'Gagal membuat laporan.')),
  });

  const updateIdentityMutation = useMutation({
    // The classic backend exposes status-change + section CRUD, but no
    // generic "update identity" endpoint. We patch identity by removing
    // and re-creating only when project/month/year change — for v2 we
    // surface this as a soft no-op and inform the user. Title/desc are
    // editable via add-section path. This is intentional: the wider
    // identity edit flow is out of scope for the working subset.
    mutationFn: async () => Promise.resolve(),
    onSuccess: () => {
      toast.info(
        t('builder.identityReadOnly', 'Identitas laporan tidak dapat diubah pasca-pembuatan.'),
      );
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: ({ file, title, description: secDesc }: { file: File; title: string; description?: string }) =>
      socialMediaReportsService.addSection(id!, file, { title, description: secDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      toast.success(t('builder.sectionAdded', 'Bagian berhasil ditambahkan.'));
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? t('builder.sectionAddFailed', 'Gagal menambahkan bagian.')),
  });

  const removeSectionMutation = useMutation({
    mutationFn: (sectionId: string) =>
      socialMediaReportsService.removeSection(id!, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      toast.success(t('builder.sectionRemoved', 'Bagian dihapus.'));
    },
    onError: () => toast.error(t('builder.sectionRemoveFailed', 'Gagal menghapus bagian.')),
  });

  const reorderMutation = useMutation({
    mutationFn: (sectionIds: string[]) =>
      socialMediaReportsService.reorderSections(id!, sectionIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report', id] }),
    onError: () => toast.error(t('builder.reorderFailed', 'Gagal mengurutkan ulang.')),
  });

  const updateVizMutation = useMutation({
    mutationFn: ({ sectionId, visualizations }: { sectionId: string; visualizations: VisualizationConfig[] }) =>
      socialMediaReportsService.updateVisualizations(id!, sectionId, { visualizations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      toast.success(t('builder.vizSaved', 'Visualisasi disimpan.'));
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? t('builder.vizFailed', 'Gagal menyimpan visualisasi.')),
  });

  /* ---------- handlers ---------- */
  const handleSaveIdentity = () => {
    if (!title.trim()) {
      toast.error(t('builder.titleRequired', 'Judul wajib diisi.'));
      return;
    }
    if (!projectId) {
      toast.error(t('builder.projectRequired', 'Pilih proyek terlebih dahulu.'));
      return;
    }
    if (!isEditMode) {
      createMutation.mutate({ title, description, projectId, month, year });
    } else {
      updateIdentityMutation.mutate();
    }
  };

  /* ---------- shell ---------- */
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

  /* ---------- loading edit ---------- */
  if (isEditMode && reportLoading) {
    return (
      <Shell>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </Shell>
    );
  }

  if (isEditMode && !report) {
    return (
      <Shell>
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title={t('builder.notFound.title', 'Laporan tidak ditemukan')}
          description={t('builder.notFound.desc', 'Laporan ini mungkin sudah dihapus.')}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/v2/reports')}>
              <ArrowLeft className="h-4 w-4" />
              {t('builder.backToList', 'Kembali ke Laporan')}
            </Button>
          }
        />
      </Shell>
    );
  }

  /* ---------- render ---------- */
  return (
    <Shell>
      <div className="mb-4">
        <Link
          to={isEditMode && id ? `/v2/reports/${id}` : '/v2/reports'}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isEditMode
            ? t('builder.backToReport', 'Kembali ke Laporan')
            : t('builder.backToList', 'Kembali ke Laporan')}
        </Link>
      </div>

      <PageHeader
        title={
          isEditMode
            ? t('builder.editTitle', 'Ubah Laporan')
            : t('builder.createTitle', 'Laporan Baru')
        }
        description={
          isEditMode
            ? t('builder.editSubtitle', 'Tambahkan bagian data dan konfigurasi visualisasi.')
            : t('builder.createSubtitle', 'Mulai dengan menentukan identitas laporan, lalu tambahkan bagian.')
        }
        actions={
          !isEditMode && (
            <Button
              size="sm"
              onClick={handleSaveIdentity}
              disabled={createMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {t('builder.saveAndContinue', 'Simpan & Lanjutkan')}
            </Button>
          )
        }
      />

      {/* Identity card — always visible. In edit mode it's read-only-ish:
          the backend doesn't expose a generic identity-patch endpoint,
          so we surface this as informational metadata. */}
      <GlassPanel surface="glass" padding="lg" className="mb-8">
        <div className="mb-5">
          <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
            {t('builder.identity.title', 'Identitas Laporan')}
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {isEditMode
              ? t(
                  'builder.identity.editSubtitle',
                  'Identitas terkunci setelah laporan dibuat. Hubungi admin untuk perubahan terstruktur.',
                )
              : t(
                  'builder.identity.createSubtitle',
                  'Judul, proyek, dan periode laporan. Akan dikunci setelah disimpan.',
                )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Label htmlFor="title">
              {t('builder.field.title', 'Judul Laporan')} <span className="text-danger">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('builder.field.titlePlaceholder', 'Mis. Laporan Sosmed Juli 2025')}
              disabled={isEditMode}
              className="bg-bg-sunken border-border-subtle text-text-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">
              {t('builder.field.description', 'Deskripsi')}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('builder.field.descriptionPlaceholder', 'Opsional')}
              disabled={isEditMode}
              className="bg-bg-sunken border-border-subtle text-text-primary"
            />
          </div>

          <div>
            <Label htmlFor="project">
              {t('builder.field.project', 'Proyek')} <span className="text-danger">*</span>
            </Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isEditMode}>
              <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                <SelectValue placeholder={t('builder.field.projectPlaceholder', 'Pilih proyek')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.description || p.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="month">{t('builder.field.month', 'Bulan')}</Label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                disabled={isEditMode}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_ID.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">{t('builder.field.year', 'Tahun')}</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={isEditMode}
                className="bg-bg-sunken border-border-subtle text-text-primary tabular-nums"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Sections — only visible in edit mode (need a saved report first). */}
      {isEditMode && report && (
        <SectionsEditor
          sections={(report.sections ?? []).slice().sort((a, b) => a.order - b.order)}
          onAdd={(file, secTitle, secDesc) =>
            addSectionMutation.mutateAsync({ file, title: secTitle, description: secDesc })
          }
          isAdding={addSectionMutation.isPending}
          onRemove={(secId) => removeSectionMutation.mutate(secId)}
          onReorder={(secIds) => reorderMutation.mutate(secIds)}
          onSaveViz={(secId, viz) =>
            updateVizMutation.mutateAsync({ sectionId: secId, visualizations: viz })
          }
          isSavingViz={updateVizMutation.isPending}
        />
      )}

      {/* Deferred-features note — kept honest about what's in this v2 subset. */}
      {isEditMode && (
        <GlassPanel surface="subtle" padding="md" className="mt-8">
          <div className="flex items-start gap-3 text-xs text-text-tertiary leading-relaxed">
            <Layers className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-secondary block mb-1">
                {t('builder.advancedDeferred.title', 'Fitur lanjutan tertunda')}
              </strong>
              <p>
                {t(
                  'builder.advancedDeferred.body',
                  'Editor drag-and-drop kanvas, palet widget (Teks/Metrik/Gambar/Callout), tata letak grid bebas, dan pratinjau langsung tersedia di editor klasik. Versi v2 fokus pada alur identitas + bagian CSV + visualisasi yang dikonfigurasi melalui formulir.',
                )}
              </p>
            </div>
          </div>
        </GlassPanel>
      )}
    </Shell>
  );
}

/* ================================================================== */
/*  SectionsEditor — add/remove/reorder + per-section viz config       */
/* ================================================================== */

interface SectionsEditorProps {
  sections: ReportSection[];
  onAdd: (file: File, title: string, description?: string) => Promise<unknown>;
  isAdding: boolean;
  onRemove: (sectionId: string) => void;
  onReorder: (sectionIds: string[]) => void;
  onSaveViz: (sectionId: string, viz: VisualizationConfig[]) => Promise<unknown>;
  isSavingViz: boolean;
}

function SectionsEditor({
  sections, onAdd, isAdding, onRemove, onReorder, onSaveViz, isSavingViz,
}: SectionsEditorProps) {
  const { t } = useTranslation();
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');

  const handleAddClick = async () => {
    if (!draftFile) {
      toast.error(t('builder.csvRequired', 'Pilih file CSV terlebih dahulu.'));
      return;
    }
    if (!draftTitle.trim()) {
      toast.error(t('builder.sectionTitleRequired', 'Judul bagian wajib diisi.'));
      return;
    }
    try {
      await onAdd(draftFile, draftTitle.trim(), draftDesc.trim() || undefined);
      setDraftFile(null);
      setDraftTitle('');
      setDraftDesc('');
    } catch {
      /* toast handled in mutation */
    }
  };

  const moveSection = (sectionId: string, dir: 'up' | 'down') => {
    const ids = sections.map((s) => s.id);
    const idx = ids.indexOf(sectionId);
    if (idx === -1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ids.length) return;
    [ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]];
    onReorder(ids);
  };

  return (
    <GlassPanel surface="glass" padding="lg">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
            {t('builder.sections.title', 'Bagian Data')}
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {t('builder.sections.subtitle', '{{count}} bagian — setiap bagian satu file CSV', {
              count: sections.length,
            })}
          </p>
        </div>
      </div>

      {/* Add-section row — inline form, keeps section creation in-place. */}
      <div className="rounded-md border border-border-subtle bg-bg-sunken p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <Label htmlFor="sec-title" className="text-xs">
              {t('builder.field.sectionTitle', 'Judul Bagian')}
            </Label>
            <Input
              id="sec-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t('builder.field.sectionTitlePlaceholder', 'Mis. Instagram Performance')}
              className="bg-bg-base border-border-subtle text-text-primary"
            />
          </div>
          <div>
            <Label htmlFor="sec-desc" className="text-xs">
              {t('builder.field.sectionDesc', 'Deskripsi')}
            </Label>
            <Input
              id="sec-desc"
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder={t('builder.field.sectionDescPlaceholder', 'Opsional')}
              className="bg-bg-base border-border-subtle text-text-primary"
            />
          </div>
          <div className="flex items-end">
            <label
              htmlFor="csv-upload"
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-base px-3 py-2 text-xs text-text-secondary cursor-pointer hover:bg-accent-navy-soft transition-colors',
                draftFile && 'text-text-primary border-border-default',
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              {draftFile
                ? draftFile.name.length > 24
                  ? `${draftFile.name.slice(0, 22)}…`
                  : draftFile.name
                : t('builder.field.uploadCsv', 'Pilih CSV')}
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={handleAddClick} disabled={isAdding}>
            <Plus className="h-4 w-4" />
            {t('builder.addSection', 'Tambah Bagian')}
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title={t('builder.noSections.title', 'Belum ada bagian')}
          description={t(
            'builder.noSections.desc',
            'Unggah file CSV di atas untuk membuat bagian pertama.',
          )}
        />
      ) : (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <SectionCard
              key={s.id}
              section={s}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              onRemove={() => onRemove(s.id)}
              onMoveUp={() => moveSection(s.id, 'up')}
              onMoveDown={() => moveSection(s.id, 'down')}
              onSaveViz={(viz) => onSaveViz(s.id, viz)}
              isSavingViz={isSavingViz}
            />
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionCard — per-section meta + viz editor                        */
/* ------------------------------------------------------------------ */

interface SectionCardProps {
  section: ReportSection;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveViz: (viz: VisualizationConfig[]) => Promise<unknown>;
  isSavingViz: boolean;
}

function SectionCard({
  section, isFirst, isLast, onRemove, onMoveUp, onMoveDown, onSaveViz, isSavingViz,
}: SectionCardProps) {
  const { t } = useTranslation();
  const [vizDrafts, setVizDrafts] = useState<VisualizationConfig[]>(
    section.visualizations ?? [],
  );

  // Re-sync from server snapshot if the section changes (e.g. another tab).
  useEffect(() => {
    setVizDrafts(section.visualizations ?? []);
  }, [section.id, section.updatedAt]);

  const columns = useMemo(() => Object.keys(section.columnTypes ?? {}), [section.columnTypes]);
  const numericColumns = useMemo(
    () => columns.filter((c) => section.columnTypes[c] === 'NUMBER'),
    [columns, section.columnTypes],
  );

  const addViz = () =>
    setVizDrafts((d) => [
      ...d,
      {
        type: 'line',
        title: t('builder.viz.newTitle', 'Grafik Baru'),
        xAxis: columns[0],
        yAxis: numericColumns[0] ? [numericColumns[0]] : [],
        aggregation: 'sum',
      },
    ]);

  const updateViz = (i: number, patch: Partial<VisualizationConfig>) =>
    setVizDrafts((d) => d.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const removeViz = (i: number) =>
    setVizDrafts((d) => d.filter((_, idx) => idx !== i));

  const dirty = JSON.stringify(vizDrafts) !== JSON.stringify(section.visualizations ?? []);

  return (
    <div className="rounded-md border border-border-subtle bg-bg-sunken p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-xs text-text-tertiary tabular-nums">#{section.order}</span>
            <h3 className="text-sm font-display font-semibold text-text-primary truncate">
              {section.title}
            </h3>
            <Badge variant="outline" className="border-border-subtle text-text-tertiary text-[10px]">
              {section.rowCount} baris
            </Badge>
          </div>
          {section.description && (
            <p className="mt-1 text-xs text-text-tertiary">{section.description}</p>
          )}
          <p className="mt-1 text-[11px] text-text-tertiary font-mono truncate">
            {section.csvFileName}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {columns.map((c) => (
              <span
                key={c}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono',
                  section.columnTypes[c] === 'NUMBER'
                    ? 'bg-info/10 text-info'
                    : section.columnTypes[c] === 'DATE'
                    ? 'bg-success/10 text-success'
                    : 'bg-bg-base text-text-tertiary',
                )}
              >
                {c}
                <span className="opacity-60">{section.columnTypes[c]?.[0]}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label="Move up"
            className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label="Move down"
            className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (confirm(t('builder.confirmRemoveSection', 'Hapus bagian ini?'))) onRemove();
            }}
            aria-label="Remove section"
            className="text-danger/70 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Viz editor */}
      <div className="mt-2 border-t border-border-subtle pt-4">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <div>
            <div className="text-xs font-medium text-text-secondary">
              {t('builder.viz.title', 'Visualisasi')}
            </div>
            <div className="text-[11px] text-text-tertiary">
              {vizDrafts.length} {t('builder.viz.configured', 'grafik dikonfigurasi')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVizDrafts(section.visualizations ?? [])}
              >
                <X className="h-3.5 w-3.5" />
                {t('common.discard', 'Batal')}
              </Button>
            )}
            <Button
              size="sm"
              variant={dirty ? 'default' : 'outline'}
              disabled={!dirty || isSavingViz}
              onClick={() => onSaveViz(vizDrafts)}
            >
              <Save className="h-3.5 w-3.5" />
              {t('builder.viz.save', 'Simpan')}
            </Button>
            <Button size="sm" variant="outline" onClick={addViz}>
              <Plus className="h-3.5 w-3.5" />
              {t('builder.viz.add', 'Tambah Grafik')}
            </Button>
          </div>
        </div>

        {vizDrafts.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle p-4 text-center text-xs text-text-tertiary">
            {t('builder.viz.empty', 'Belum ada grafik. Tambahkan grafik pertama.')}
          </div>
        ) : (
          <div className="space-y-3">
            {vizDrafts.map((viz, i) => (
              <VizConfigRow
                key={i}
                viz={viz}
                columns={columns}
                numericColumns={numericColumns}
                onChange={(patch) => updateViz(i, patch)}
                onRemove={() => removeViz(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VizConfigRow — one chart's form config                             */
/* ------------------------------------------------------------------ */

interface VizConfigRowProps {
  viz: VisualizationConfig;
  columns: string[];
  numericColumns: string[];
  onChange: (patch: Partial<VisualizationConfig>) => void;
  onRemove: () => void;
}

function VizConfigRow({ viz, columns, numericColumns, onChange, onRemove }: VizConfigRowProps) {
  const { t } = useTranslation();
  const isMetricCard = viz.type === 'metric_card';
  const isPie = viz.type === 'pie';

  return (
    <div className="rounded-md border border-border-subtle bg-bg-base p-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mb-3">
        <div>
          <Label className="text-[11px]">{t('builder.viz.field.title', 'Judul')}</Label>
          <Input
            value={viz.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="bg-bg-sunken border-border-subtle text-text-primary"
          />
        </div>
        <div>
          <Label className="text-[11px]">{t('builder.viz.field.type', 'Tipe Grafik')}</Label>
          <Select value={viz.type} onValueChange={(v) => onChange({ type: v as VisualizationConfig['type'] })}>
            <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_TYPES.map((ct) => {
                const Icon = ct.Icon;
                return (
                  <SelectItem key={ct.value} value={ct.value}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {ct.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Remove viz"
            className="text-danger/70 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isMetricCard ? (
          <>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.valueKey', 'Kolom Nilai')}</Label>
              <Select
                value={viz.valueKey ?? ''}
                onValueChange={(v) => onChange({ valueKey: v })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih kolom" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.aggregation', 'Agregasi')}</Label>
              <Select
                value={viz.aggregation ?? 'sum'}
                onValueChange={(v) => onChange({ aggregation: v as VisualizationConfig['aggregation'] })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATIONS.map((a) => (
                    <SelectItem key={a} value={a!}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.precision', 'Presisi Desimal')}</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={viz.precision ?? 0}
                onChange={(e) => onChange({ precision: Number(e.target.value) })}
                className="bg-bg-sunken border-border-subtle text-text-primary tabular-nums"
              />
            </div>
          </>
        ) : isPie ? (
          <>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.nameKey', 'Kolom Label')}</Label>
              <Select
                value={viz.nameKey ?? viz.xAxis ?? ''}
                onValueChange={(v) => onChange({ nameKey: v })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih kolom" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.valueKey', 'Kolom Nilai')}</Label>
              <Select
                value={viz.valueKey ?? viz.yAxis?.[0] ?? ''}
                onValueChange={(v) => onChange({ valueKey: v })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih kolom" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
          </>
        ) : (
          <>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.xAxis', 'Sumbu X')}</Label>
              <Select
                value={viz.xAxis ?? ''}
                onValueChange={(v) => onChange({ xAxis: v })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih kolom" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.yAxis', 'Sumbu Y')}</Label>
              <Select
                value={viz.yAxis?.[0] ?? ''}
                onValueChange={(v) => onChange({ yAxis: [v] })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih kolom" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">{t('builder.viz.field.aggregation', 'Agregasi')}</Label>
              <Select
                value={viz.aggregation ?? 'sum'}
                onValueChange={(v) => onChange({ aggregation: v as VisualizationConfig['aggregation'] })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATIONS.map((a) => (
                    <SelectItem key={a} value={a!}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
