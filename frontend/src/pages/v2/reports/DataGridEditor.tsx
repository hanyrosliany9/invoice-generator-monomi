/**
 * DataGridEditor — a small spreadsheet for typing report numbers by hand
 * (or fixing a wrong value in imported data).
 *
 *   • typed columns (date / number / percent / rupiah / text)
 *   • add / remove rows and columns
 *   • paste from Excel / Google Sheets straight into any cell (fills down/right)
 *   • Enter/arrows move between cells; Tab moves right
 *   • cells that are clearly wrong for their column are outlined in red
 *
 * The server does the real parsing (Indonesian "1.234" / "12,5" / "1 Okt 2026").
 */
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardPaste, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ColumnKind, GridCell } from '@/types/report';
import {
  KIND_OPTIONS, cellProblem, displayCell, gridFromPaste, parseClipboard, type GridState,
} from '@/features/reports/services/gridUtils';

export const MAX_GRID_ROWS = 400;
export const MAX_GRID_COLUMNS = 30;

export function useKindLabel() {
  const { t } = useTranslation();
  return (k: ColumnKind): string => {
    switch (k) {
      case 'date': return t('reportData.kind.date', 'Date');
      case 'number': return t('reportData.kind.number', 'Number');
      case 'percent': return t('reportData.kind.percent', 'Percent');
      case 'currency': return t('reportData.kind.currency', 'Rupiah');
      default: return t('reportData.kind.text', 'Text');
    }
  };
}

interface Props {
  value: GridState;
  onChange: (next: GridState) => void;
  /** Cells outside this many columns/rows cannot be added (server limits). */
  disabled?: boolean;
}

export function DataGridEditor({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const kindLabel = useKindLabel();
  const root = useRef<HTMLDivElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const { columns, rows } = value;

  const focusCell = useCallback((r: number, c: number) => {
    const el = root.current?.querySelector<HTMLInputElement>(`[data-cell="${r}-${c}"]`);
    el?.focus();
    el?.select();
  }, []);

  const setCell = (r: number, c: number, v: GridCell) => {
    const next = rows.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row));
    onChange({ columns, rows: next });
  };

  const addRow = () => {
    if (rows.length >= MAX_GRID_ROWS) return;
    onChange({ columns, rows: [...rows, columns.map(() => '')] });
    setTimeout(() => focusCell(rows.length, 0), 0);
  };
  const removeRow = (r: number) => onChange({ columns, rows: rows.filter((_, i) => i !== r) });
  const addColumn = () => {
    if (columns.length >= MAX_GRID_COLUMNS) return;
    onChange({
      columns: [...columns, { name: `${t('reportData.column', 'Column')} ${columns.length + 1}`, type: 'number' }],
      rows: rows.map((row) => [...row, '']),
    });
  };
  const removeColumn = (c: number) =>
    onChange({
      columns: columns.filter((_, i) => i !== c),
      rows: rows.map((row) => row.filter((_, i) => i !== c)),
    });
  const patchColumn = (c: number, patch: Partial<GridState['columns'][number]>) =>
    onChange({ columns: columns.map((col, i) => (i === c ? { ...col, ...patch } : col)), rows });

  /** Paste Excel cells into the grid starting at (r, c); grows rows/columns as needed. */
  const pasteAt = (r: number, c: number, text: string) => {
    const block = parseClipboard(text);
    if (block.length === 0) return;
    const needCols = Math.min(MAX_GRID_COLUMNS, Math.max(columns.length, c + Math.max(...block.map((b) => b.length))));
    const needRows = Math.min(MAX_GRID_ROWS, Math.max(rows.length, r + block.length));
    const cols = [...columns];
    while (cols.length < needCols) cols.push({ name: `${t('reportData.column', 'Column')} ${cols.length + 1}`, type: 'text' });
    const grid: GridCell[][] = Array.from({ length: needRows }, (_, ri) =>
      Array.from({ length: needCols }, (_, ci) => rows[ri]?.[ci] ?? ''),
    );
    block.forEach((line, bi) => {
      line.forEach((cell, bj) => {
        if (r + bi < needRows && c + bj < needCols) grid[r + bi][c + bj] = cell.trim();
      });
    });
    onChange({ columns: cols, rows: grid });
  };

  const applyPasteDialog = () => {
    const parsed = parseClipboard(pasteText);
    if (parsed.length === 0) return;
    const g = gridFromPaste(parsed);
    onChange({
      columns: g.columns.slice(0, MAX_GRID_COLUMNS),
      rows: g.rows.slice(0, MAX_GRID_ROWS).map((r) => r.slice(0, MAX_GRID_COLUMNS)),
    });
    setPasteText('');
    setPasteOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (r + 1 < rows.length) focusCell(r + 1, c);
      else if (e.key === 'Enter') addRow();
    } else if (e.key === 'ArrowUp' && r > 0) {
      e.preventDefault();
      focusCell(r - 1, c);
    }
  };

  return (
    <div ref={root} className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setPasteOpen((o) => !o)} disabled={disabled}>
          <ClipboardPaste className="h-3.5 w-3.5" />
          {t('reportData.pasteTable', 'Paste from Excel')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addRow} disabled={disabled || rows.length >= MAX_GRID_ROWS}>
          <Plus className="h-3.5 w-3.5" />
          {t('reportData.addRow', 'Add row')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addColumn} disabled={disabled || columns.length >= MAX_GRID_COLUMNS}>
          <Plus className="h-3.5 w-3.5" />
          {t('reportData.addColumn', 'Add column')}
        </Button>
        <span className="text-[11px] text-text-tertiary">
          {t('reportData.gridCount', '{{rows}} rows, {{cols}} columns', { rows: rows.length, cols: columns.length })}
        </span>
      </div>

      {pasteOpen && (
        <div className="mb-3 rounded-md border border-border-default bg-bg-sunken p-3">
          <p className="mb-2 text-xs text-text-secondary">
            {t(
              'reportData.pasteHelp',
              'Copy the table from Excel or Google Sheets (including the header row) and paste it here. This replaces the grid below.',
            )}
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            aria-label={t('reportData.pasteTable', 'Paste from Excel')}
            className="w-full rounded-md border border-border-subtle bg-bg-base p-2 font-mono text-xs text-text-primary outline-none focus:border-border-default"
            placeholder={'Tanggal\tJangkauan\tTayangan\n01/09/2026\t12.370\t34.910'}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setPasteOpen(false); setPasteText(''); }}>
              <X className="h-3.5 w-3.5" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="button" size="sm" onClick={applyPasteDialog} disabled={pasteText.trim() === ''}>
              {t('reportData.usePasted', 'Use pasted table')}
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[52vh] overflow-auto rounded-md border border-border-subtle">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-9 border-b border-border-default bg-bg-panel" aria-hidden />
              {columns.map((col, c) => (
                <th key={c} scope="col" className="sticky top-0 z-20 min-w-[9.5rem] border-b border-l border-border-default bg-bg-panel p-1.5 text-left align-top font-normal">
                  <div className="flex items-center gap-1">
                    <input
                      value={col.name}
                      onChange={(e) => patchColumn(c, { name: e.target.value })}
                      aria-label={t('reportData.columnName', 'Column name')}
                      disabled={disabled}
                      className="h-8 min-w-0 flex-1 rounded border border-border-subtle bg-bg-base px-2 text-xs font-medium text-text-primary outline-none focus:border-border-default"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(c)}
                      disabled={disabled || columns.length <= 1}
                      aria-label={t('reportData.removeColumn', 'Remove column')}
                      className="rounded p-1 text-text-tertiary hover:text-danger disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Select value={col.type} onValueChange={(v) => patchColumn(c, { type: v as ColumnKind })} disabled={disabled}>
                    <SelectTrigger className="mt-1 h-7 border-border-subtle bg-bg-base px-2 text-[11px] text-text-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((k) => (
                        <SelectItem key={k} value={k}>{kindLabel(k)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <th scope="row" className="sticky left-0 z-10 border-b border-border-subtle bg-bg-panel px-1 text-center text-[10px] font-normal text-text-tertiary tabular-nums">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    disabled={disabled}
                    aria-label={t('reportData.removeRow', 'Remove row {{n}}', { n: r + 1 })}
                    title={t('reportData.removeRow', 'Remove row {{n}}', { n: r + 1 })}
                    className="group/rm flex h-8 w-7 items-center justify-center"
                  >
                    <span className="group-hover/rm:hidden group-focus-visible/rm:hidden">{r + 1}</span>
                    <Trash2 className="hidden h-3.5 w-3.5 text-danger group-hover/rm:block group-focus-visible/rm:block" />
                  </button>
                </th>
                {columns.map((col, c) => {
                  const v = row[c] ?? '';
                  const bad = cellProblem(v, col.type);
                  return (
                    <td key={c} className="border-b border-l border-border-subtle p-0">
                      <input
                        data-cell={`${r}-${c}`}
                        value={displayCell(v, col.type)}
                        inputMode={col.type === 'text' || col.type === 'date' ? 'text' : 'decimal'}
                        disabled={disabled}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, r, c)}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (/[\t\n]/.test(text.trim())) {
                            e.preventDefault();
                            pasteAt(r, c, text);
                          }
                        }}
                        aria-label={`${col.name} ${r + 1}`}
                        aria-invalid={bad}
                        className={cn(
                          'h-8 w-full bg-transparent px-2 text-sm text-text-primary outline-none focus:bg-accent-navy-soft',
                          col.type !== 'text' && col.type !== 'date' && 'text-right tabular-nums',
                          bad && 'bg-danger/10 text-danger',
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
        {t(
          'reportData.gridHelp',
          'Type numbers the way they appear in the app (1.234 or 12,5 are both fine). Dates: 01/09/2026 or 1 Sep 2026. You can paste cells copied from Excel into any cell.',
        )}
      </p>
    </div>
  );
}
