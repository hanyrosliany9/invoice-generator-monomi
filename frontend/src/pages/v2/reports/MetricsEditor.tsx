/**
 * MetricsEditor — "just a few headline numbers" (Followers, Reach, Views,
 * Engagement rate...) read off the Instagram/TikTok insights screen.
 * Saved as a one-row section whose columns become metric cards, so it flows
 * through the same data shape as an uploaded file.
 */
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ColumnKind, GridCell, ReportSection } from '@/types/report';
import { useKindLabel } from './DataGridEditor';
import { cellProblem, displayCell, kindOfColumn, orderedColumns, type GridState } from '@/features/reports/services/gridUtils';

export interface MetricItem {
  name: string;
  type: Extract<ColumnKind, 'number' | 'percent' | 'currency'>;
  value: GridCell;
}

const SUGGESTED: Pick<MetricItem, 'name' | 'type'>[] = [
  { name: 'Pengikut', type: 'number' },
  { name: 'Jangkauan', type: 'number' },
  { name: 'Tayangan', type: 'number' },
  { name: 'Kunjungan Profil', type: 'number' },
  { name: 'Suka', type: 'number' },
  { name: 'Komentar', type: 'number' },
  { name: 'Engagement Rate', type: 'percent' },
];

export const defaultMetrics = (): MetricItem[] =>
  [SUGGESTED[0], SUGGESTED[1], SUGGESTED[2], SUGGESTED[6]].map((m) => ({ ...m, value: '' }));

export function metricsToGrid(items: MetricItem[]): GridState {
  const used = items.filter((m) => m.name.trim() !== '');
  return {
    columns: used.map((m) => ({ name: m.name.trim(), type: m.type })),
    rows: [used.map((m) => m.value)],
  };
}

export function metricsFromSection(section: ReportSection): MetricItem[] {
  const row = (section.rawData ?? [])[0] ?? {};
  return orderedColumns(section).map((name) => {
    const kind = kindOfColumn(section, name);
    const v = row[name];
    return {
      name,
      type: kind === 'percent' || kind === 'currency' ? kind : 'number',
      value: typeof v === 'number' || typeof v === 'string' ? v : '',
    };
  });
}

interface Props {
  items: MetricItem[];
  onChange: (items: MetricItem[]) => void;
}

export function MetricsEditor({ items, onChange }: Props) {
  const { t } = useTranslation();
  const kindLabel = useKindLabel();
  const patch = (i: number, p: Partial<MetricItem>) =>
    onChange(items.map((m, idx) => (idx === i ? { ...m, ...p } : m)));
  const unused = SUGGESTED.filter((s) => !items.some((m) => m.name.toLowerCase() === s.name.toLowerCase()));

  return (
    <div className="min-w-0">
      <p className="mb-3 text-xs text-text-secondary">
        {t(
          'reportData.metricsHelp',
          'Enter the headline numbers for this month. Each one becomes a card in the report. No file needed.',
        )}
      </p>
      <div className="space-y-2">
        {items.map((m, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_8.5rem_auto]">
            <Input
              value={m.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              aria-label={t('reportData.metricName', 'Metric name')}
              placeholder={t('reportData.metricName', 'Metric name')}
              className="col-span-2 bg-bg-base border-border-subtle text-text-primary sm:col-span-1"
            />
            <Input
              value={displayCell(m.value, m.type)}
              onChange={(e) => patch(i, { value: e.target.value })}
              inputMode="decimal"
              aria-label={t('reportData.metricValue', 'Value')}
              aria-invalid={cellProblem(m.value, m.type)}
              placeholder={m.type === 'percent' ? '3,9' : '51.005'}
              className={`bg-bg-base border-border-subtle text-right tabular-nums text-text-primary ${cellProblem(m.value, m.type) ? 'border-danger text-danger' : ''}`}
            />
            <Select value={m.type} onValueChange={(v) => patch(i, { type: v as MetricItem['type'] })}>
              <SelectTrigger className="bg-bg-base border-border-subtle text-text-secondary" aria-label={t('reportData.metricKind', 'Type')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['number', 'percent', 'currency'] as const).map((k) => (
                  <SelectItem key={k} value={k}>{kindLabel(k)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label={t('reportData.removeMetric', 'Remove metric')}
              className="text-danger/70 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { name: '', type: 'number', value: '' }])} disabled={items.length >= 20}>
          <Plus className="h-3.5 w-3.5" />
          {t('reportData.addMetric', 'Add metric')}
        </Button>
        {unused.slice(0, 5).map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onChange([...items, { ...s, value: '' }])}
            className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
          >
            + {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
