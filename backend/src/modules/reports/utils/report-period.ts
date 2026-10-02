/**
 * Pre-import checks that compare the data of a file with the report it goes
 * into, so a wrong-month export (October report showing November data) is
 * caught BEFORE it is saved, and so replacing data never silently throws away
 * charts. Pure helpers; the service exposes the results on parse-preview.
 */
import { Row, toDate, VizConfig } from "./report-insights";

export interface PeriodMismatch {
  /** Date column that holds the dates. */
  column: string;
  /** Rows with a readable date in that column. */
  total: number;
  /** Rows whose date is not in the report's month/year. */
  outside: number;
  /** Earliest / latest date in the column, as YYYY-MM-DD. */
  min: string;
  max: string;
}

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The first date column (by file column order) with rows outside the report's
 * month/year, or null when everything is inside (or there is no date column).
 */
export function findPeriodMismatch(
  data: { headers: string[]; columnTypes: Record<string, string>; rows: Row[] },
  month: number,
  year: number,
): PeriodMismatch | null {
  for (const column of data.headers) {
    if (data.columnTypes[column] !== "DATE") continue;
    const dates = data.rows
      .map((r) => toDate(r[column]))
      .filter((d): d is Date => d !== null);
    if (dates.length === 0) continue;
    const outside = dates.filter(
      (d) => d.getMonth() + 1 !== month || d.getFullYear() !== year,
    ).length;
    if (outside === 0) continue;
    const times = dates.map((d) => d.getTime());
    return {
      column,
      total: dates.length,
      outside,
      min: iso(new Date(Math.min(...times))),
      max: iso(new Date(Math.max(...times))),
    };
  }
  return null;
}

export interface ChartImpact {
  /** Charts (everything except tables) configured before the replacement. */
  before: number;
  /** Titles of the charts that survive. */
  kept: string[];
  /** Titles of the charts that will be removed. */
  removed: string[];
  /** True when the old charts are replaced by automatically suggested ones. */
  regenerated: boolean;
  /** Number of automatically suggested charts that will be created. */
  created: number;
}

export const vizTitle = (v: VizConfig | any): string =>
  String(v?.title ?? v?.type ?? "grafik");
