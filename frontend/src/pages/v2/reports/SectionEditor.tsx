/**
 * SectionEditor — one report section in the builder:
 *   • title/description (rename in place)
 *   • where the data came from + "view & edit data" (grid), "replace with a
 *     file", quick preview of the first rows
 *   • charts, each with a LIVE preview rendered by the same components the
 *     client portal uses, so staff see what the client will see
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, BarChart2, ChevronDown, ChevronUp, Hash, LineChart as LineChartIcon,
  Loader2, Pencil, PieChart as PieIcon, Plus, Save, Table2, Trash2, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { socialMediaReportsService } from '@/services/social-media-reports';
import { PortalChart } from '@/portal/reports/PortalChart';
import { DataTable, KpiTile } from '@/portal/reports/ReportSections';
import { hasPlottableData, metricKpi, rowsOf } from '@/portal/reports/reportData';
import type { ColumnKind, FilePreview, ImportedSection, ManualSectionDto, ReportSection, VisualizationConfig } from '@/types/report';
import {
  daysOfMonth, gridFromSection, kindOfColumn, orderedColumns, sectionSource, type GridState,
} from '@/features/reports/services/gridUtils';
import { DataGridEditor, MAX_GRID_COLUMNS, MAX_GRID_ROWS } from './DataGridEditor';
import { MetricsEditor, metricsFromSection, metricsToGrid, type MetricItem } from './MetricsEditor';
import { DataPreviewTable, KindChip } from './ReportDataPreview';
import { SectionNotes, trimGrid } from './AddSectionPanel';
import { reportErrorText } from './ReportActionDialogs';
import { chartImpactNotes, DataConfirmDialog } from './DataConfirmDialog';
import { gridPeriodMismatch } from './reportPeriod';

/* ------------------------------------------------------------------ */
/*  Labels                                                             */
/* ------------------------------------------------------------------ */

const CHART_TYPES: { value: VisualizationConfig['type']; key: string; label: string; Icon: typeof LineChartIcon }[] = [
  { value: 'line', key: 'line', label: 'Line', Icon: LineChartIcon },
  { value: 'bar', key: 'bar', label: 'Bar', Icon: BarChart2 },
  { value: 'area', key: 'area', label: 'Area', Icon: Activity },
  { value: 'pie', key: 'pie', label: 'Pie', Icon: PieIcon },
  { value: 'metric_card', key: 'metric', label: 'Number card', Icon: Hash },
  { value: 'table', key: 'table', label: 'Table', Icon: Table2 },
];

const AGGREGATIONS: NonNullable<VisualizationConfig['aggregation']>[] = ['sum', 'average', 'latest', 'max', 'min', 'count'];

function useAggLabel() {
  const { t } = useTranslation();
  return (a: string): string => {
    switch (a) {
      case 'sum': return t('reportViz.agg.sum', 'Total (sum)');
      case 'average': return t('reportViz.agg.average', 'Average');
      case 'latest': return t('reportViz.agg.latest', 'Latest value');
      case 'max': return t('reportViz.agg.max', 'Highest');
      case 'min': return t('reportViz.agg.min', 'Lowest');
      default: return t('reportViz.agg.count', 'Number of rows');
    }
  };
}

/** Columns a chart refers to (for "this column no longer exists" warnings). */
function vizColumns(v: VisualizationConfig): string[] {
  const ys = Array.isArray(v.yAxis) ? v.yAxis : typeof v.yAxis === 'string' ? [v.yAxis] : [];
  return [v.xAxis, v.valueKey, v.nameKey, v.metric, ...ys].filter((c): c is string => typeof c === 'string' && c !== '');
}

/* ------------------------------------------------------------------ */
/*  Data edit dialog                                                   */
/* ------------------------------------------------------------------ */

function columnsFromViz(section: ReportSection): { name: string; type: ColumnKind }[] {
  const out = new Map<string, ColumnKind>();
  for (const v of section.visualizations ?? []) {
    if (v.xAxis) out.set(v.xAxis, v.type === 'bar' || v.type === 'pie' ? out.get(v.xAxis) ?? 'text' : 'date');
    if (v.nameKey) out.set(v.nameKey, out.get(v.nameKey) ?? 'text');
    for (const y of Array.isArray(v.yAxis) ? v.yAxis : []) out.set(y, out.get(y) ?? 'number');
    if (v.valueKey) out.set(v.valueKey, out.get(v.valueKey) ?? 'number');
  }
  return [...out.entries()].map(([name, type]) => ({ name, type }));
}

function initialGrid(section: ReportSection, month: number, year: number): GridState {
  if ((section.rowCount ?? 0) > 0) return gridFromSection(section);
  const columns = columnsFromViz(section);
  if (columns.length === 0) {
    return { columns: [{ name: 'Tanggal', type: 'date' }, { name: 'Nilai', type: 'number' }], rows: [['', '']] };
  }
  const dateIdx = columns.findIndex((c) => c.type === 'date');
  const blank = () => columns.map(() => '' as string | number);
  if (dateIdx >= 0) {
    return {
      columns,
      rows: daysOfMonth(month, year).map((d) => {
        const r = blank();
        r[dateIdx] = d;
        return r;
      }),
    };
  }
  return { columns, rows: Array.from({ length: 5 }, blank) };
}

export function DataEditDialog({
  reportId, section, month, year, open, onOpenChange,
}: {
  reportId: string;
  section: ReportSection;
  month: number;
  year: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isMetrics = sectionSource(section) === 'metrics';
  const [grid, setGrid] = useState<GridState>(() => initialGrid(section, month, year));
  const [metrics, setMetrics] = useState<MetricItem[]>(() => (isMetrics ? metricsFromSection(section) : []));
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setGrid(initialGrid(section, month, year));
      setMetrics(isMetrics ? metricsFromSection(section) : []);
      setNotes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, section.id, section.updatedAt]);

  const save = useMutation({
    mutationFn: (dto: ManualSectionDto) => socialMediaReportsService.replaceManualData(reportId, section.id, dto),
    onSuccess: (res: ImportedSection) => {
      void qc.invalidateQueries({ queryKey: ['report', reportId] });
      void qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('reportData.dataSaved', 'Data saved.'));
      const msgs = [...(res.warnings ?? []), ...chartImpactNotes(t, res.chartImpact)];
      if (msgs.length > 0) toast.warning(msgs[0], { duration: 8000 });
      onOpenChange(false);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportData.dataSaveFailed', 'Could not save the data.')), { duration: 10000 }),
  });

  const [pendingGrid, setPendingGrid] = useState<{ dto: ManualSectionDto; mismatch: NonNullable<ReturnType<typeof gridPeriodMismatch>> } | null>(null);
  const submit = () => {
    if (isMetrics) {
      const g = metricsToGrid(metrics);
      if (g.columns.length === 0) {
        toast.error(t('reportData.noMetrics', 'Enter at least one number.'));
        return;
      }
      save.mutate({ kind: 'metrics', columns: g.columns, rows: g.rows });
      return;
    }
    const g = trimGrid(grid);
    if (g.rows.length === 0) {
      toast.error(t('reportData.noRows', 'Fill in at least one row of numbers first.'));
      return;
    }
    const dto: ManualSectionDto = { kind: 'table', columns: g.columns, rows: g.rows };
    const mismatch = gridPeriodMismatch(g, month, year);
    if (mismatch) setPendingGrid({ dto, mismatch });
    else save.mutate(dto);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl" srTitle={t('reportData.editData', 'Edit data')}>
        <DialogHeader>
          <DialogTitle>{section.title}</DialogTitle>
          <DialogDescription>
            {(section.rowCount ?? 0) > 0
              ? t('reportData.editDataHint', 'Fix a wrong number or add rows, then save. Charts are kept.')
              : t('reportData.fillDataHint', 'Type this month\'s numbers (or paste them from Excel), then save. The charts are already set up.')}
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0">
          {isMetrics ? <MetricsEditor items={metrics} onChange={setMetrics} /> : <DataGridEditor value={grid} onChange={setGrid} disabled={save.isPending} />}
          <div className="mt-3"><SectionNotes warnings={notes} /></div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button type="button" onClick={submit} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('reportData.saveData', 'Save data')}
          </Button>
        </DialogFooter>
      </DialogContent>
      <DataConfirmDialog
        open={pendingGrid !== null}
        title={t('reportData.confirmSaveTitle', 'Save data from another month?')}
        month={month}
        year={year}
        mismatch={pendingGrid?.mismatch}
        busy={save.isPending}
        onCancel={() => setPendingGrid(null)}
        onConfirm={() => { if (pendingGrid) save.mutate(pendingGrid.dto, { onSettled: () => setPendingGrid(null) }); }}
      />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Live chart preview (same components as the client portal)          */
/* ------------------------------------------------------------------ */

function VizPreview({ section, viz }: { section: ReportSection; viz: VisualizationConfig }) {
  const { t } = useTranslation();
  if ((section.rowCount ?? 0) === 0) {
    return <div className="py-6 text-center text-xs text-text-tertiary">{t('reportViz.noDataPreview', 'The preview appears once this section has data.')}</div>;
  }
  if (viz.type === 'metric_card') {
    const k = metricKpi(section, viz);
    return k ? <div className="max-w-xs"><KpiTile kpi={k} compact /></div> : <div className="py-4 text-xs text-text-tertiary">{t('reportViz.pickColumn', 'Choose a column to see the number.')}</div>;
  }
  if (viz.type === 'table') return <DataTable section={section} />;
  if (!hasPlottableData(viz, rowsOf(section))) {
    return (
      <div role="status" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-3 text-xs text-text-secondary">
        {t('reportViz.noPlottable', 'No data for this chart. It is hidden from the client until the column has values.')}
      </div>
    );
  }
  return <PortalChart section={section} viz={viz} />;
}

/* ------------------------------------------------------------------ */
/*  One chart's settings                                               */
/* ------------------------------------------------------------------ */

function VizConfigRow({
  viz, section, columns, numericColumns, onChange, onRemove,
}: {
  viz: VisualizationConfig;
  section: ReportSection;
  columns: string[];
  numericColumns: string[];
  onChange: (patch: Partial<VisualizationConfig>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const aggLabel = useAggLabel();
  const [showPreview, setShowPreview] = useState(viz.type !== 'metric_card');
  const isMetric = viz.type === 'metric_card';
  const isPie = viz.type === 'pie';
  const isTable = viz.type === 'table';
  const ys = Array.isArray(viz.yAxis) ? viz.yAxis : [];
  const hasData = (section.rowCount ?? 0) > 0;
  const missing = hasData ? vizColumns(viz).filter((c) => !columns.includes(c)) : [];

  const colSelect = (label: string, value: string | undefined, list: string[], on: (v: string) => void) => (
    <div className="min-w-0">
      <Label className="text-[11px]">{label}</Label>
      <Select value={value ?? ''} onValueChange={on}>
        <SelectTrigger className="w-full min-w-0 bg-bg-sunken border-border-subtle text-text-secondary *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate">
          <SelectValue placeholder={t('reportBuilder.selectColumn', 'Select column')} />
        </SelectTrigger>
        <SelectContent>
          {list.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="rounded-md border border-border-subtle bg-bg-base p-3 sm:p-4">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <Label className="text-[11px]">{t('reportBuilder.viz.field.title', 'Title')}</Label>
          <Input
            value={viz.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="bg-bg-sunken border-border-subtle text-text-primary"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-[11px]">{t('reportBuilder.viz.field.type', 'Chart Type')}</Label>
          <Select value={viz.type} onValueChange={(v) => onChange({ type: v as VisualizationConfig['type'] })}>
            <SelectTrigger className="w-full min-w-0 bg-bg-sunken border-border-subtle text-text-secondary *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>
                  <span className="inline-flex items-center gap-2">
                    <ct.Icon className="h-3.5 w-3.5" />
                    {t(`reportViz.type.${ct.key}`, ct.label)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={t('reportViz.remove', 'Remove chart')}
            className="text-danger/70 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {missing.length > 0 && (
        <p role="alert" className="mb-3 rounded border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[11px] text-text-secondary">
          {t('reportViz.missingColumns', 'This chart uses a column that is not in the data: {{cols}}. Pick another column.', { cols: missing.join(', ') })}
        </p>
      )}

      {!isTable && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {isMetric ? (
            <>
              {colSelect(t('reportBuilder.viz.field.valueKey', 'Value Column'), viz.valueKey, numericColumns, (v) => onChange({ valueKey: v }))}
              <div className="min-w-0">
                <Label className="text-[11px]">{t('reportViz.howToCombine', 'How to combine the rows')}</Label>
                <Select value={viz.aggregation ?? 'sum'} onValueChange={(v) => onChange({ aggregation: v as VisualizationConfig['aggregation'] })}>
                  <SelectTrigger className="w-full min-w-0 bg-bg-sunken border-border-subtle text-text-secondary *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((a) => <SelectItem key={a} value={a}>{aggLabel(a)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label className="text-[11px]">{t('reportBuilder.viz.field.precision', 'Decimal Precision')}</Label>
                <Input
                  type="number" min={0} max={6}
                  value={viz.precision ?? 0}
                  onChange={(e) => onChange({ precision: Number(e.target.value) })}
                  className="bg-bg-sunken border-border-subtle text-text-primary tabular-nums"
                />
              </div>
            </>
          ) : isPie ? (
            <>
              {colSelect(t('reportBuilder.viz.field.nameKey', 'Label Column'), viz.nameKey ?? viz.xAxis, columns, (v) => onChange({ nameKey: v }))}
              {colSelect(t('reportBuilder.viz.field.valueKey', 'Value Column'), viz.valueKey ?? viz.yAxis?.[0], numericColumns, (v) => onChange({ valueKey: v }))}
            </>
          ) : (
            <>
              {colSelect(t('reportBuilder.viz.field.xAxis', 'X Axis'), viz.xAxis, columns, (v) => onChange({ xAxis: v }))}
              <div className="min-w-0 sm:col-span-2">
                <Label className="text-[11px]">{t('reportViz.yAxisMulti', 'Values (tap to choose one or more)')}</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {numericColumns.length === 0 && (
                    <span className="text-xs text-text-tertiary">{t('reportViz.noNumeric', 'No numeric columns in this data yet.')}</span>
                  )}
                  {numericColumns.map((c) => {
                    const on = ys.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange({ yAxis: on ? ys.filter((y) => y !== c) : [...ys, c] })}
                        className={cn(
                          'max-w-full truncate rounded-full border px-3 py-1 text-xs transition-colors max-sm:min-h-8',
                          on ? 'border-border-strong bg-bg-raised text-text-primary' : 'border-border-subtle text-text-secondary hover:bg-bg-raised/60',
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-border-subtle pt-2">
        <button
          type="button"
          aria-expanded={showPreview}
          onClick={() => setShowPreview((s) => !s)}
          className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary max-sm:min-h-8"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !showPreview && '-rotate-90')} />
          {t('reportViz.preview', 'Preview as the client sees it')}
        </button>
        {showPreview && (
          <div className="mt-2 min-w-0 rounded-lg border border-border-subtle bg-bg-sunken/60 p-3">
            {viz.title !== '' && viz.type !== 'metric_card' && <div className="mb-2 text-sm font-medium text-text-primary">{viz.title}</div>}
            <VizPreview section={section} viz={viz} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section card                                                       */
/* ------------------------------------------------------------------ */

interface SectionCardProps {
  reportId: string;
  section: ReportSection;
  month: number;
  year: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveViz: (viz: VisualizationConfig[]) => Promise<unknown>;
  isSavingViz: boolean;
  onDirtyChange: (sectionId: string, dirty: boolean) => void;
}

export function SectionCard({
  reportId, section, month, year, isFirst, isLast, onRemove, onMoveUp, onMoveDown, onSaveViz, isSavingViz, onDirtyChange,
}: SectionCardProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [vizDrafts, setVizDrafts] = useState<VisualizationConfig[]>(section.visualizations ?? []);
  const [editOpen, setEditOpen] = useState(false);
  const [showData, setShowData] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.title);
  const [desc, setDesc] = useState(section.description ?? '');
  const [notes, setNotes] = useState<string[]>([]);
  const [chartsOpen, setChartsOpen] = useState(
    () => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 639px)').matches,
  );

  useEffect(() => {
    setVizDrafts(section.visualizations ?? []);
    setName(section.title);
    setDesc(section.description ?? '');
  }, [section.id, section.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo(() => orderedColumns(section), [section]);
  const numericColumns = useMemo(() => columns.filter((c) => section.columnTypes?.[c] === 'NUMBER'), [columns, section.columnTypes]);
  const kinds = useMemo(() => Object.fromEntries(columns.map((c) => [c, kindOfColumn(section, c)])) as Record<string, ColumnKind>, [columns, section]);
  const source = sectionSource(section);
  const hasData = (section.rowCount ?? 0) > 0;
  const tooBig = (section.rowCount ?? 0) > MAX_GRID_ROWS || columns.length > MAX_GRID_COLUMNS;

  const dirty = JSON.stringify(vizDrafts) !== JSON.stringify(section.visualizations ?? []);
  useEffect(() => {
    onDirtyChange(section.id, dirty);
    return () => onDirtyChange(section.id, false);
  }, [dirty, section.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A replacement is read first (nothing saved) and only applied straight away
  // when it is harmless; wrong-month dates or charts that would be removed need
  // an explicit confirmation.
  const [pendingReplace, setPendingReplace] = useState<{ file: File; preview: FilePreview } | null>(null);
  const checkReplace = useMutation({
    mutationFn: async (file: File) => ({ file, preview: await socialMediaReportsService.previewFile(file, { reportId, sectionId: section.id }) }),
    onSuccess: ({ file, preview }) => {
      const risky = (preview.periodMismatch ?? null) !== null || (preview.chartImpact?.removed.length ?? 0) > 0;
      if (risky) setPendingReplace({ file, preview });
      else replaceFile.mutate(file);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportData.readFailed', 'The file could not be read.')), { duration: 10000 }),
  });

  const replaceFile = useMutation({
    mutationFn: (file: File) => socialMediaReportsService.replaceSectionData(reportId, section.id, file),
    onSettled: () => setPendingReplace(null),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['report', reportId] });
      void qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('reportBuilder.dataReplaced', 'Data uploaded.'));
      setNotes([...(res.warnings ?? []), ...chartImpactNotes(t, res.chartImpact)]);
    },
    onError: (e) => {
      setNotes([]);
      toast.error(reportErrorText(e, t('reportBuilder.dataReplaceFailed', 'Failed to upload data.')), { duration: 10000 });
    },
  });

  const rename = useMutation({
    mutationFn: () => socialMediaReportsService.updateSection(reportId, section.id, { title: name.trim(), description: desc.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report', reportId] });
      setRenaming(false);
      toast.success(t('reportData.renamed', 'Section updated.'));
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportData.renameFailed', 'Could not update the section.'))),
  });

  const updateViz = (i: number, patch: Partial<VisualizationConfig>) =>
    setVizDrafts((d) => d.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const addChart = () => {
    const dateCol = columns.find((c) => section.columnTypes?.[c] === 'DATE');
    const textCol = columns.find((c) => section.columnTypes?.[c] === 'STRING');
    const y = numericColumns[0];
    const x = dateCol ?? textCol ?? columns[0];
    setVizDrafts((d) => [
      ...d,
      {
        type: dateCol ? 'line' : 'bar',
        title: y ? (dateCol ? t('reportViz.autoTrend', 'Trend {{y}}', { y }) : t('reportViz.autoPer', '{{y}} per {{x}}', { y, x })) : t('reportBuilder.viz.newTitle', 'New Chart'),
        xAxis: x,
        yAxis: y ? [y] : [],
      },
    ]);
  };
  const addCard = () => {
    const y = numericColumns[0];
    setVizDrafts((d) => [...d, { type: 'metric_card', title: y ?? t('reportViz.newCard', 'New number'), valueKey: y, aggregation: 'sum', precision: 0 }]);
  };

  const sourceLabel =
    source === 'metrics' ? t('reportData.source.metrics', 'Headline numbers')
    : source === 'manual' ? t('reportData.source.manual', 'Typed in')
    : t('reportData.source.file', 'File: {{name}}', { name: section.csvFileName });

  const fileButton = (label: string, primary?: boolean) => (
    <label
      className={cn(
        'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
        primary ? 'border-border-strong bg-bg-raised text-text-primary hover:bg-accent-navy-soft' : 'border-border-subtle bg-bg-base text-text-secondary hover:bg-bg-raised hover:text-text-primary',
        (replaceFile.isPending || checkReplace.isPending) && 'pointer-events-none opacity-60',
      )}
    >
      {replaceFile.isPending || checkReplace.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      {replaceFile.isPending || checkReplace.isPending ? t('reportBuilder.uploading', 'Uploading…') : label}
      <input
        type="file"
        accept=".csv,.xlsx,.xls,text/csv"
        className="sr-only"
        disabled={replaceFile.isPending || checkReplace.isPending}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) checkReplace.mutate(f);
        }}
      />
    </label>
  );

  return (
    <div id={`section-${section.id}`} className="scroll-mt-28 rounded-lg border border-border-strong bg-bg-sunken p-3 shadow-sm sm:p-5">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <div className="min-w-[min(100%,14rem)] flex-1">
          {renaming ? (
            <div className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('reportBuilder.field.sectionTitle', 'Section Title')} className="bg-bg-base border-border-subtle text-text-primary" />
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('reportBuilder.field.sectionDescPlaceholder', 'Optional')} aria-label={t('reportBuilder.field.sectionDesc', 'Description')} className="bg-bg-base border-border-subtle text-text-primary" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => rename.mutate()} disabled={rename.isPending || name.trim() === ''}>
                  <Save className="h-3.5 w-3.5" />{t('common.save', 'Save')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRenaming(false); setName(section.title); setDesc(section.description ?? ''); }}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <span
                  className="mt-px inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-raised px-1.5 text-xs font-semibold tabular-nums text-text-primary"
                  aria-label={t('reportBuilder.sectionNumber', 'Section {{n}}', { n: section.order })}
                >
                  {section.order}
                </span>
                <h3 className="min-w-0 break-words text-base font-display font-semibold text-text-primary">{section.title}</h3>
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  aria-label={t('reportData.rename', 'Rename section')}
                  className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded p-0.5 text-text-tertiary hover:text-text-primary max-sm:-my-1 max-sm:size-8"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {section.description && <p className="mt-1 text-xs text-text-tertiary">{section.description}</p>}
              <p className="mt-1 break-all text-[11px] text-text-tertiary">
                {sourceLabel}
                {hasData && ` · ${t('reportData.rowsCols', '{{rows}} rows, {{cols}} columns', { rows: section.rowCount, cols: columns.length })}`}
              </p>
            </>
          )}
        </div>
        <div className="-mr-1 ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon-sm" disabled={isFirst} onClick={onMoveUp} aria-label={t('reportBuilder.moveUp', 'Move up')} className="text-text-tertiary hover:text-text-primary disabled:opacity-30">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={isLast} onClick={onMoveDown} aria-label={t('reportBuilder.moveDown', 'Move down')} className="text-text-tertiary hover:text-text-primary disabled:opacity-30">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (confirm(t('reportBuilder.confirmRemoveSection', 'Remove this section?'))) onRemove();
            }}
            aria-label={t('reportBuilder.removeSection', 'Remove section')}
            className="text-danger/70 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* data */}
      {!hasData ? (
        <div className="mb-4 rounded-md border border-dashed border-warning/40 bg-warning/5 p-3">
          <p className="mb-2 text-xs text-text-secondary">
            {t('reportBuilder.noDataYet', 'No data yet. The charts are kept; add this month\'s data to fill them. Clients do not see empty sections.')}
          </p>
          <div className="flex flex-wrap gap-2">
            {fileButton(t('reportBuilder.uploadData', 'Upload data'), true)}
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              {t('reportData.typeData', 'Type the data')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {columns.map((c) => <KindChip key={c} name={c} kind={kinds[c]} />)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={tooBig} title={tooBig ? t('reportData.tooBig', 'Too large to edit here. Replace it with a file instead.') : undefined}>
              <Pencil className="h-3.5 w-3.5" />
              {source === 'metrics' ? t('reportData.editNumbers', 'Edit numbers') : t('reportData.viewEdit', 'View & edit data')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowData((s) => !s)} aria-expanded={showData} className="text-text-secondary">
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showData && 'rotate-180')} />
              {showData ? t('reportData.hideRows', 'Hide rows') : t('reportData.showRows', 'Show rows')}
            </Button>
            {source !== 'metrics' && fileButton(t('reportBuilder.replaceData', 'Replace data'))}
          </div>
          {showData && (
            <div className="mt-3">
              <DataPreviewTable headers={columns} kinds={kinds} rows={section.rawData ?? []} total={section.rowCount} maxRows={10} />
            </div>
          )}
        </div>
      )}
      {notes.length > 0 && (
        <div className="mb-4">
          <SectionNotes warnings={notes} />
          <button type="button" onClick={() => setNotes([])} className="mt-1 text-[11px] text-text-tertiary underline-offset-2 hover:underline max-sm:min-h-8">
            {t('reportData.dismiss', 'Dismiss')}
          </button>
        </div>
      )}
      <DataEditDialog reportId={reportId} section={section} month={month} year={year} open={editOpen} onOpenChange={setEditOpen} />
      <DataConfirmDialog
        open={pendingReplace !== null}
        title={t('reportData.confirmReplaceTitle', 'Replace the data of "{{title}}"?', { title: section.title })}
        month={month}
        year={year}
        mismatch={pendingReplace?.preview.periodMismatch}
        impact={pendingReplace?.preview.chartImpact}
        busy={replaceFile.isPending}
        onCancel={() => setPendingReplace(null)}
        onConfirm={() => pendingReplace && replaceFile.mutate(pendingReplace.file)}
      />

      {/* charts */}
      <div className="border-t border-border-subtle pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-text-secondary">{t('reportBuilder.viz.title', 'Visualizations')}</div>
            <div className="text-[11px] text-text-tertiary">
              {vizDrafts.length} {t('reportBuilder.viz.configured', 'charts configured')}
              {dirty && <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-warning">{t('reportViz.unsaved', 'Not saved yet')}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <Button size="sm" variant="outline" onClick={() => setVizDrafts(section.visualizations ?? [])}>
                <X className="h-3.5 w-3.5" />{t('common.discard', 'Discard')}
              </Button>
            )}
            <Button size="sm" variant={dirty ? 'default' : 'outline'} disabled={!dirty || isSavingViz} onClick={() => void onSaveViz(vizDrafts)}>
              {isSavingViz ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('reportBuilder.viz.save', 'Save')}
            </Button>
            <Button size="sm" variant="outline" onClick={addChart} disabled={!hasData}>
              <Plus className="h-3.5 w-3.5" />{t('reportBuilder.viz.add', 'Add Chart')}
            </Button>
            <Button size="sm" variant="outline" onClick={addCard} disabled={!hasData}>
              <Plus className="h-3.5 w-3.5" />{t('reportViz.addCard', 'Add number card')}
            </Button>
          </div>
        </div>

        {vizDrafts.length > 0 && (
          <button type="button" aria-expanded={chartsOpen} onClick={() => setChartsOpen((o) => !o)} className={cn('mb-3 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary max-sm:min-h-8', vizDrafts.length <= 3 && 'sm:hidden')}>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !chartsOpen && '-rotate-90')} />
            {chartsOpen ? t('reportViz.collapse', 'Hide chart settings') : t('reportViz.expand', 'Show chart settings ({{count}})', { count: vizDrafts.length })}
          </button>
        )}
        {vizDrafts.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle p-4 text-center text-xs text-text-tertiary">
            {t('reportBuilder.viz.empty', 'No charts yet. Add your first chart.')}
          </div>
        ) : chartsOpen ? (
          <div className="space-y-3">
            {vizDrafts.map((viz, i) => (
              <VizConfigRow
                key={i}
                viz={viz}
                section={section}
                columns={columns}
                numericColumns={numericColumns}
                onChange={(patch) => updateViz(i, patch)}
                onRemove={() => setVizDrafts((d) => d.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
