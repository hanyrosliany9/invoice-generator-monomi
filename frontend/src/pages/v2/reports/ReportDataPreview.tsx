/**
 * Small building blocks used by the report builder to show data:
 *   • DataPreviewTable — first rows of a section / parsed file, in file order
 *   • KindChip — column name with the detected type
 *   • TemplateLinks — downloadable CSV/XLSX starter files
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { socialMediaReportsService } from '@/services/social-media-reports';
import type { ColumnKind } from '@/types/report';
import { useKindLabel } from './DataGridEditor';

const NUM = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });

export function previewCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return NUM.format(v);
  return String(v);
}

const KIND_STYLE: Record<ColumnKind, string> = {
  date: 'bg-success/10 text-success',
  number: 'bg-info/10 text-info',
  percent: 'bg-info/10 text-info',
  currency: 'bg-info/10 text-info',
  text: 'bg-bg-base text-text-tertiary',
};

export function KindChip({ name, kind }: { name: string; kind: ColumnKind }) {
  const kindLabel = useKindLabel();
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px]', KIND_STYLE[kind])}>
      <span className="truncate font-mono">{name}</span>
      <span className="shrink-0 opacity-70">{kindLabel(kind)}</span>
    </span>
  );
}

export function DataPreviewTable({
  headers,
  kinds,
  rows,
  total,
  maxRows = 8,
}: {
  headers: string[];
  kinds: Record<string, ColumnKind>;
  rows: Record<string, unknown>[];
  total: number;
  maxRows?: number;
}) {
  const { t } = useTranslation();
  const shown = rows.slice(0, maxRows);
  return (
    <div className="min-w-0">
      <div className="max-h-72 overflow-auto rounded-md border border-border-subtle">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    'sticky top-0 whitespace-nowrap border-b border-border-default bg-bg-panel px-3 py-1.5 font-medium text-text-secondary',
                    kinds[h] === 'text' || kinds[h] === 'date' ? 'text-left' : 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-b border-border-subtle last:border-0">
                {headers.map((h) => (
                  <td
                    key={h}
                    className={cn(
                      'max-w-[16rem] truncate whitespace-nowrap px-3 py-1.5 text-text-primary',
                      kinds[h] !== 'text' && kinds[h] !== 'date' && 'text-right tabular-nums',
                    )}
                  >
                    {previewCell(r[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > shown.length && (
        <p className="mt-1.5 text-[11px] text-text-tertiary">
          {t('reportData.previewMore', 'Showing the first {{shown}} of {{total}} rows.', { shown: shown.length, total })}
        </p>
      )}
    </div>
  );
}

const TEMPLATES: { key: string; label: string; fallback: string }[] = [
  { key: 'instagram-harian', label: 'reportData.tpl.instagram', fallback: 'Instagram daily' },
  { key: 'tiktok-harian', label: 'reportData.tpl.tiktok', fallback: 'TikTok daily' },
  { key: 'konten-teratas', label: 'reportData.tpl.content', fallback: 'Top content' },
  { key: 'ringkasan-bulanan', label: 'reportData.tpl.summary', fallback: 'Monthly summary' },
  { key: 'audiens', label: 'reportData.tpl.audience', fallback: 'Audience' },
];

export function TemplateLinks({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const get = async (key: string, format: 'xlsx' | 'csv') => {
    setBusy(`${key}.${format}`);
    try {
      await socialMediaReportsService.downloadTemplate(key, format);
    } catch {
      toast.error(t('reportData.tplFailed', 'Could not download the template. Try again.'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={cn('rounded-md border border-border-subtle bg-bg-base p-3', className)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        {t('reportData.tplTitle', 'No file yet? Download a template with the right columns')}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => (
          <li key={tpl.key} className="flex items-center justify-between gap-2 rounded bg-bg-sunken px-2.5 py-1.5 text-xs">
            <span className="min-w-0 truncate text-text-primary">{t(tpl.label, tpl.fallback)}</span>
            <span className="flex shrink-0 items-center gap-1">
              {(['xlsx', 'csv'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => void get(tpl.key, f)}
                  disabled={busy !== null}
                  aria-label={`${t(tpl.label, tpl.fallback)} ${f.toUpperCase()}`}
                  className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-[11px] uppercase text-text-secondary hover:bg-bg-raised hover:text-text-primary disabled:opacity-50"
                >
                  <Download className="h-3 w-3" />
                  {f}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
        {t(
          'reportData.formatHelp',
          'Accepted: .csv (comma or semicolon) and Excel .xlsx/.xls, max 5 MB. One row per day (or per post). Dates like 2026-09-01, 01/09/2026 or 1 Sep 2026; numbers like 1234, 1.234, 12,5 or 3,4%. The first row holds the column names.',
        )}
      </p>
    </div>
  );
}
