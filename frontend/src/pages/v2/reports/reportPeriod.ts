/**
 * Client-side twin of backend/src/modules/reports/utils/report-period.ts for
 * data that never goes through a file (the typed grid): are the dates inside
 * the report's month?
 */
import { toDate } from '@/portal/reports/reportData';
import type { GridState } from '@/features/reports/services/gridUtils';
import type { PeriodMismatch } from '@/types/report';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** First date column of the grid with rows outside `month`/`year`, else null. */
export function gridPeriodMismatch(grid: GridState, month: number, year: number): PeriodMismatch | null {
  for (let c = 0; c < grid.columns.length; c++) {
    if (grid.columns[c].type !== 'date') continue;
    const dates = grid.rows
      .map((r) => toDate(String(r[c] ?? '')))
      .filter((d): d is Date => d !== null);
    if (dates.length === 0) continue;
    const outside = dates.filter((d) => d.getMonth() + 1 !== month || d.getFullYear() !== year).length;
    if (outside === 0) continue;
    const times = dates.map((d) => d.getTime());
    return {
      column: grid.columns[c].name,
      total: dates.length,
      outside,
      min: iso(new Date(Math.min(...times))),
      max: iso(new Date(Math.max(...times))),
    };
  }
  return null;
}
