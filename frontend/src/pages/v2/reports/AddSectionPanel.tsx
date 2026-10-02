/**
 * AddSectionPanel — the one place staff add data to a report.
 *   1. Upload a file (CSV / Excel): parsed first, shown as a preview with the
 *      detected column types and any notes, THEN added.
 *   2. Type it in a spreadsheet-like grid (pre-filled with the month's dates).
 *   3. Headline numbers only (Followers, Reach, Views, Engagement rate...).
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Plus, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { socialMediaReportsService } from '@/services/social-media-reports';
import type { FilePreview, ImportedSection, ManualSectionDto } from '@/types/report';
import {
  GRID_PRESETS, gridFromPreset, type GridState,
} from '@/features/reports/services/gridUtils';
import { DataGridEditor } from './DataGridEditor';
import { MetricsEditor, defaultMetrics, metricsToGrid, type MetricItem } from './MetricsEditor';
import { DataPreviewTable, KindChip, TemplateLinks } from './ReportDataPreview';
import { reportErrorText } from './ReportActionDialogs';
import { DataConfirmDialog, PeriodMismatchText } from './DataConfirmDialog';
import { gridPeriodMismatch } from './reportPeriod';

type Mode = 'file' | 'manual' | 'metrics';

/** "ig-semicolon_id.csv" -> "Ig semicolon id" (a starting point the user can edit). */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base === '' ? '' : base.charAt(0).toUpperCase() + base.slice(1);
}

/** Drop rows that only hold the pre-filled date (nothing typed yet). */
export function trimGrid(g: GridState): GridState {
  const nonDate = g.columns.map((c, i) => (c.type === 'date' ? -1 : i)).filter((i) => i >= 0);
  const check = nonDate.length > 0 ? nonDate : g.columns.map((_, i) => i);
  return { columns: g.columns, rows: g.rows.filter((r) => check.some((i) => String(r[i] ?? '').trim() !== '')) };
}

export function SectionNotes({ warnings }: { warnings?: string[] }) {
  const { t } = useTranslation();
  if (!warnings || warnings.length === 0) return null;
  return (
    <div role="status" className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-text-primary">
        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        {t('reportData.notes', 'Please check')}
      </div>
      <ul className="list-disc space-y-0.5 pl-4">
        {warnings.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

interface Props {
  reportId: string;
  month: number;
  year: number;
  /** Called with the new section after it was saved. */
  onAdded: (section: ImportedSection) => void;
  /** First section of the report: shown expanded by default. */
  defaultOpen?: boolean;
}

export function AddSectionPanel({ reportId, month, year, onAdded, defaultOpen = true }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<Mode>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridState>({ columns: [], rows: [] });
  const [metrics, setMetrics] = useState<MetricItem[]>(defaultMetrics());
  // The person has accepted data whose dates are outside the report's month.
  const [periodOk, setPeriodOk] = useState(false);
  const [pendingManual, setPendingManual] = useState<{ dto: ManualSectionDto; mismatch: NonNullable<ReturnType<typeof gridPeriodMismatch>> } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setPreview(null);
    setFileError(null);
    setPresetKey(null);
    setGrid({ columns: [], rows: [] });
    setMetrics(defaultMetrics());
    setPeriodOk(false);
    setPendingManual(null);
    if (input.current) input.current.value = '';
  };

  const previewMutation = useMutation({
    mutationFn: (f: File) => socialMediaReportsService.previewFile(f, { reportId }),
    onSuccess: (p, f) => {
      setPreview(p);
      setFileError(null);
      setTitle((cur) => (cur.trim() === '' ? titleFromFileName(f.name) : cur));
    },
    onError: (e) => {
      setPreview(null);
      setFileError(reportErrorText(e, t('reportData.readFailed', 'The file could not be read.')));
    },
  });

  const done = (section: ImportedSection) => {
    toast.success(t('reportBuilder.sectionAdded', 'Section added successfully.'));
    if (section.warnings && section.warnings.length > 0) {
      toast.warning(section.warnings[0], { duration: 8000 });
    }
    reset();
    onAdded(section);
  };

  const addFile = useMutation({
    mutationFn: () => socialMediaReportsService.addSection(reportId, file as File, { title: title.trim(), description: description.trim() || undefined }),
    onSuccess: done,
    onError: (e) => toast.error(reportErrorText(e, t('reportBuilder.sectionAddFailed', 'Failed to add section.'))),
  });
  const addManual = useMutation({
    mutationFn: (dto: ManualSectionDto) => socialMediaReportsService.addManualSection(reportId, dto),
    onSuccess: done,
    onError: (e) => toast.error(reportErrorText(e, t('reportBuilder.sectionAddFailed', 'Failed to add section.'))),
  });

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setFileError(null);
    setPeriodOk(false);
    previewMutation.mutate(f);
  };

  const choosePreset = (key: string) => {
    const preset = GRID_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setPresetKey(key);
    setGrid(gridFromPreset(preset, month, year));
    const suggested: Record<string, string> = {
      'instagram-harian': 'Instagram',
      'tiktok-harian': 'TikTok',
      'konten-teratas': t('reportData.suggest.content', 'Top content'),
    };
    setTitle((cur) => (cur.trim() === '' && suggested[key] ? suggested[key] : cur));
  };

  const submit = () => {
    if (title.trim() === '') {
      toast.error(t('reportBuilder.sectionTitleRequired', 'Section title is required.'));
      return;
    }
    const base = { title: title.trim(), description: description.trim() || undefined };
    if (mode === 'file') {
      if (!file || !preview) {
        toast.error(t('reportBuilder.csvRequired', 'Please select a CSV file first.'));
        return;
      }
      if (preview.periodMismatch && !periodOk) {
        toast.error(t('reportData.periodConfirmFirst', 'Confirm that you want to use data from another month first.'));
        return;
      }
      addFile.mutate();
    } else if (mode === 'manual') {
      const g = trimGrid(grid);
      if (g.rows.length === 0) {
        toast.error(t('reportData.noRows', 'Fill in at least one row of numbers first.'));
        return;
      }
      const dto: ManualSectionDto = { ...base, kind: 'table', columns: g.columns, rows: g.rows };
      const mismatch = gridPeriodMismatch(g, month, year);
      if (mismatch) setPendingManual({ dto, mismatch });
      else addManual.mutate(dto);
    } else {
      const g = metricsToGrid(metrics);
      if (g.columns.length === 0 || g.rows[0].every((v) => String(v).trim() === '')) {
        toast.error(t('reportData.noMetrics', 'Enter at least one number.'));
        return;
      }
      addManual.mutate({ ...base, kind: 'metrics', columns: g.columns, rows: g.rows });
    }
  };

  const busy = addFile.isPending || addManual.isPending;
  const modes: { id: Mode; label: string; hint: string }[] = [
    { id: 'file', label: t('reportData.mode.file', 'Upload file'), hint: t('reportData.mode.fileHint', 'CSV or Excel export') },
    { id: 'manual', label: t('reportData.mode.manual', 'Type in a table'), hint: t('reportData.mode.manualHint', 'Spreadsheet-style entry') },
    { id: 'metrics', label: t('reportData.mode.metrics', 'Headline numbers'), hint: t('reportData.mode.metricsHint', 'Just a few totals') },
  ];

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="mb-5">
        <Plus className="h-4 w-4" />
        {t('reportData.addSectionOpen', 'Add data section')}
      </Button>
    );
  }

  return (
    <div className="mb-5 rounded-md border border-border-default bg-bg-sunken p-4 sm:p-5" data-testid="add-section-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-display font-semibold text-text-primary">
            {t('reportData.addSectionTitle', 'Add data section')}
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {t('reportData.addSectionHint', 'A section is one table of numbers (for example Instagram daily) with its charts.')}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label={t('common.close', 'Close')} className="shrink-0 text-text-tertiary">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div role="tablist" aria-label={t('reportData.addSectionTitle', 'Add data section')} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'rounded-md border px-3 py-2 text-left transition-colors',
              mode === m.id
                ? 'border-border-strong bg-bg-raised text-text-primary'
                : 'border-border-subtle text-text-secondary hover:bg-bg-raised/60',
            )}
          >
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-[11px] text-text-tertiary">{m.hint}</div>
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="sec-title" className="text-xs">{t('reportBuilder.field.sectionTitle', 'Section Title')} <span className="text-danger">*</span></Label>
          <Input
            id="sec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('reportBuilder.field.sectionTitlePlaceholder', 'e.g. Instagram Performance')}
            className="bg-bg-base border-border-subtle text-text-primary"
          />
        </div>
        <div>
          <Label htmlFor="sec-desc" className="text-xs">{t('reportBuilder.field.sectionDesc', 'Description')}</Label>
          <Input
            id="sec-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('reportBuilder.field.sectionDescPlaceholder', 'Optional')}
            className="bg-bg-base border-border-subtle text-text-primary"
          />
        </div>
      </div>

      {mode === 'file' && (
        <div className="space-y-3">
          <label
            htmlFor="csv-upload"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
              dragOver ? 'border-border-strong bg-bg-raised' : 'border-border-default bg-bg-base hover:bg-bg-raised/60',
            )}
          >
            {previewMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" /> : <Upload className="h-5 w-5 text-text-tertiary" />}
            <span className="max-w-full break-words text-sm text-text-primary">
              {file ? file.name : t('reportData.dropFile', 'Choose a file or drop it here')}
            </span>
            <span className="text-[11px] text-text-tertiary">.csv, .xlsx, .xls</span>
            <input
              ref={input}
              id="csv-upload"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>

          {fileError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-text-primary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <span>{fileError}</span>
            </div>
          )}

          {preview && (
            <div className="space-y-3 rounded-md border border-border-subtle bg-bg-base p-3">
              <div className="text-xs text-text-secondary">
                {t('reportData.previewSummary', '{{rows}} rows, {{cols}} columns read from {{name}}', {
                  rows: preview.rowCount, cols: preview.headers.length, name: preview.fileName,
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.headers.map((h) => (
                  <KindChip key={h} name={h} kind={preview.columnKinds[h] ?? 'text'} />
                ))}
              </div>
              {preview.periodMismatch && (
                <div role="alert" className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div className="min-w-0"><PeriodMismatchText mismatch={preview.periodMismatch} month={month} year={year} /></div>
                  </div>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-text-primary">
                    <Checkbox checked={periodOk} onCheckedChange={(v) => setPeriodOk(v === true)} />
                    {t('reportData.periodUseAnyway', 'Yes, use this data anyway')}
                  </label>
                </div>
              )}
              <SectionNotes warnings={preview.warnings} />
              <DataPreviewTable headers={preview.headers} kinds={preview.columnKinds} rows={preview.rows} total={preview.rowCount} />
            </div>
          )}

          {!preview && <TemplateLinks />}
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">{t('reportData.startFrom', 'Start from')}</span>
            {GRID_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => choosePreset(p.key)}
                aria-pressed={presetKey === p.key}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  presetKey === p.key ? 'border-border-strong bg-bg-raised text-text-primary' : 'border-border-subtle text-text-secondary hover:bg-bg-raised/60',
                )}
              >
                {p.key === 'instagram-harian' ? t('reportData.tpl.instagram', 'Instagram daily')
                  : p.key === 'tiktok-harian' ? t('reportData.tpl.tiktok', 'TikTok daily')
                  : p.key === 'konten-teratas' ? t('reportData.tpl.content', 'Top content')
                  : t('reportData.blank', 'Blank table')}
              </button>
            ))}
          </div>
          {presetKey === null ? (
            <p className="rounded-md border border-dashed border-border-subtle p-4 text-center text-xs text-text-tertiary">
              {t('reportData.choosePreset', 'Pick a starting table above. Daily tables come with every date of the report month already filled in.')}
            </p>
          ) : (
            <DataGridEditor value={grid} onChange={setGrid} disabled={busy} />
          )}
        </div>
      )}

      {mode === 'metrics' && <MetricsEditor items={metrics} onChange={setMetrics} />}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={submit}
          disabled={busy || (mode === 'file' && (previewMutation.isPending || !preview || (!!preview.periodMismatch && !periodOk))) || (mode === 'manual' && presetKey === null)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('reportBuilder.addSection', 'Add Section')}
        </Button>
      </div>
      <DataConfirmDialog
        open={pendingManual !== null}
        title={t('reportData.confirmAddTitle', 'Add data from another month?')}
        month={month}
        year={year}
        mismatch={pendingManual?.mismatch}
        busy={addManual.isPending}
        onCancel={() => setPendingManual(null)}
        onConfirm={() => { if (pendingManual) addManual.mutate(pendingManual.dto, { onSettled: () => setPendingManual(null) }); }}
      />
    </div>
  );
}
