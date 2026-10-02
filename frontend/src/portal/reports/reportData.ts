/**
 * Pure helpers for the client-portal report view: number/date parsing,
 * Indonesian formatting, and plain-language insights derived ONLY from the
 * section data that already exists (no new metrics sources, nothing invented).
 */
import i18n from 'i18next';
import type { ReportSection, VisualizationConfig } from '@/types/report';

export type Unit = 'percent' | 'currency' | 'number';
export type Row = Record<string, unknown>;

export const locale = (): string => (i18n.language.startsWith('en') ? 'en-US' : 'id-ID');

/* ------------------------------------------------------------------ */
/*  Parsing                                                            */
/* ------------------------------------------------------------------ */

/** Numeric value of a CSV cell, or null when it is not a number. */
export function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/[Rp$€£¥%\s]/g, '');
  if (s === '') return null;
  const neg = /^\(.+\)$/.test(s);
  if (neg) s = s.slice(1, -1);
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // "1.234,5" (id) or "1,234.5" (en): the later separator is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // "1,234" / "1,234,567" are thousands; "12,5" is a decimal comma.
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, '');
  }
  if (!/^[+-]?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Date from the formats the CSV importer accepts; null when unsure. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m !== null) return mk(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m !== null) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    if (a > 12) return mk(y, b, a); // DD/MM
    if (b > 12) return mk(y, a, b); // MM/DD
    return mk(y, b, a); // ambiguous: Indonesian convention DD/MM
  }
  if (/^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/.test(s) || /^\d{1,2}[\s-][A-Za-z]{3,9}\.?[\s-]\d{2,4}$/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
function mk(y: number, mo: number, d: number): Date | null {
  const dt = new Date(y, mo - 1, d);
  return dt.getMonth() === mo - 1 && dt.getFullYear() === y ? dt : null;
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

const PERCENT_RE = /%|rate|persen|percent|ratio|rasio/i;
const CURRENCY_RE = /\b(rp|idr|rupiah)\b|biaya|cost|spend|revenue|pendapatan|anggaran|budget|harga|price|omzet|penjualan|sales/i;

/** Cells stored with a rupiah prefix ("Rp151000") are money whatever the column is called. */
const RP_PREFIX_RE = /^\s*(rp\.?|idr)\s*[\d-]/i;

export function columnUnit(label: string, rows: Row[], key: string): Unit {
  if (PERCENT_RE.test(label) || rows.slice(0, 20).some((r) => typeof r[key] === 'string' && (r[key] as string).includes('%'))) return 'percent';
  if (CURRENCY_RE.test(label) || rows.slice(0, 20).some((r) => typeof r[key] === 'string' && RP_PREFIX_RE.test(r[key] as string))) return 'currency';
  return 'number';
}

/** Decimals worth showing for a column: none for whole numbers. */
export function columnDecimals(rows: Row[], key: string, unit: Unit): number {
  const frac = rows.some((r) => {
    const n = toNum(r[key]);
    return n !== null && !Number.isInteger(n);
  });
  return unit === 'percent' ? 1 : frac ? 2 : 0;
}

export function fmtNum(n: number, dec = 0): string {
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(n);
}

export function fmtValue(n: number, unit: Unit, dec = 0): string {
  const s = fmtNum(n, dec);
  if (unit === 'percent') return `${s}%`;
  if (unit === 'currency') return `Rp ${s}`;
  return s;
}

/** Short form for axis ticks: 12 rb, 1,2 jt. */
export function fmtCompact(n: number, unit: Unit, full = false): string {
  const s = full
    ? fmtNum(n, Math.abs(n) < 100 && !Number.isInteger(n) ? 1 : 0)
    : new Intl.NumberFormat(locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  return unit === 'percent' ? `${s}%` : unit === 'currency' ? `Rp ${s}` : s;
}

export function fmtDate(d: Date, style: 'short' | 'long' | 'shortYear' | 'medium' = 'long'): string {
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : style === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : style === 'shortYear'
          ? { day: 'numeric', month: 'short', year: '2-digit' }
          : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(locale(), opts).format(d);
}

/** "2 Oct 2026, 18:30": unambiguous in every UI language (never 2/10/2026). */
export function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

/** Display a raw cell for the "data" table. */
export function fmtCell(v: unknown, label: string, rows: Row[], key: string, isDate: boolean): string {
  if (v === null || v === undefined || v === '') return '—';
  if (isDate) {
    const d = toDate(v);
    return d !== null ? fmtDate(d, 'long') : String(v);
  }
  const n = toNum(v);
  if (n === null) return String(v);
  const unit = columnUnit(label, rows, key);
  return fmtValue(n, unit, columnDecimals(rows, key, unit));
}

/**
 * Chart/KPI titles are generated when a section is imported ("Tren Reach",
 * "Rata-rata ...") and stored as text. In English they are shown translated;
 * titles staff typed themselves never match these patterns and stay as typed.
 */
export function localizeChartTitle(title: string): string {
  if (locale() !== 'en-US') return title;
  let m = /^Tren (.+)$/.exec(title);
  if (m !== null) return `Trend ${m[1]}`;
  m = /^Rata-rata (.+)$/.exec(title);
  if (m !== null) return `Average ${m[1]}`;
  m = /^Komposisi (.+?) per (.+)$/.exec(title);
  if (m !== null) return `${m[1]} breakdown by ${m[2]}`;
  if (title === 'Tabel Data') return 'Data table';
  return title;
}

/** "engagement_rate" / "reachPerDay" → readable label; leaves normal labels alone. */
export function prettyLabel(s: string): string {
  if (/\s/.test(s) || !/[_]|[a-z][A-Z]/.test(s)) return s;
  const spaced = s.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/* ------------------------------------------------------------------ */
/*  Series                                                             */
/* ------------------------------------------------------------------ */

/** Rows of a section, tolerating a missing payload. */
export const rowsOf = (section: ReportSection): Row[] => (Array.isArray(section.rawData) ? (section.rawData as Row[]) : []);

export const asArray = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v : typeof v === 'string' && v !== '' ? [v] : [];

export interface Series {
  /** Safe key used in chart rows (column names may contain dots). */
  id: string;
  column: string;
  label: string;
  unit: Unit;
  dec: number;
}

export interface Point {
  /** Short x label (axis). */
  x: string;
  /** Full x label (tooltip / captions). */
  full: string;
  /** Series id → value. */
  [seriesId: string]: string | number | null;
}

export interface Prepared {
  series: Series[];
  points: Point[];
  isDate: boolean;
}

export function isDateColumn(section: ReportSection, key: string | undefined): boolean {
  if (key === undefined || key === '') return false;
  if ((section.columnTypes as Record<string, string> | undefined)?.[key] === 'DATE') return true;
  const rows = rowsOf(section);
  const sample = rows.slice(0, 12).map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== '');
  return sample.length > 0 && sample.every((v) => toNum(v) === null && toDate(v) !== null);
}

export function prepare(section: ReportSection, xKey: string | undefined, yKeys: string[]): Prepared {
  const rows = rowsOf(section);
  const isDate = isDateColumn(section, xKey);
  const series: Series[] = yKeys.map((column, i) => {
    const unit = columnUnit(column, rows, column);
    return { id: `s${i}`, column, label: prettyLabel(column), unit, dec: columnDecimals(rows, column, unit) };
  });
  let items = rows.map((r, idx) => ({ r, idx, d: isDate && xKey !== undefined && xKey !== '' ? toDate(r[xKey]) : null }));
  if (isDate) items = items.filter((it) => it.d !== null).sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
  const years = new Set(items.map((it) => it.d?.getFullYear()));
  const points: Point[] = items.map(({ r, idx, d }) => {
    const raw = xKey !== undefined && xKey !== '' ? r[xKey] : idx + 1;
    const p: Point = {
      x: d !== null ? fmtDate(d, years.size > 1 ? 'shortYear' : 'short') : String(raw ?? ''),
      full: d !== null ? fmtDate(d, 'long') : String(raw ?? ''),
    };
    series.forEach((s) => {
      p[s.id] = toNum(r[s.column]);
    });
    return p;
  });
  return { series, points, isDate };
}

/**
 * True when a visualization has something to draw: at least one numeric value in
 * the column(s) it plots (pie: a positive value; metric_card: its value column;
 * table: any row). Charts failing this render as an empty frame, so the portal,
 * the client preview and the PDF skip them. Mirrors hasPlottableData in
 * backend/src/modules/reports/utils/report-insights.ts.
 */
export function hasPlottableData(viz: VisualizationConfig, rows: Row[]): boolean {
  if (viz.type === 'table') return rows.length > 0;
  const keys = Object.keys(rows[0] ?? {});
  const anyNum = (cols: string[], positive: boolean): boolean =>
    cols.some((c) =>
      rows.some((r) => {
        const n = toNum(r[c]);
        return n !== null && (!positive || n > 0);
      }),
    );
  if (viz.type === 'metric_card') {
    const key = viz.valueKey ?? viz.metric;
    return key !== undefined && key !== '' && anyNum([key], false);
  }
  const ys = asArray(viz.yAxis as string | string[] | undefined);
  if (viz.type === 'pie') {
    const valueKey: string | undefined = viz.valueKey ?? (ys as (string | undefined)[])[0] ?? (keys as (string | undefined)[])[1];
    return valueKey !== undefined && anyNum([valueKey], true);
  }
  return anyNum(ys.length > 0 ? ys : keys.slice(1, 2), false);
}

/* ------------------------------------------------------------------ */
/*  Statistics                                                         */
/* ------------------------------------------------------------------ */

export interface Stat {
  first: { v: number; full: string };
  last: { v: number; full: string };
  max: { v: number; full: string };
  min: { v: number; full: string };
  /** % change first→last, or points for percent units; null if undefined. */
  change: number | null;
}

export function seriesStat(points: Point[], s: Series): Stat | null {
  const vals = points
    .map((p) => ({ v: p[s.id] as number | null, full: p.full }))
    .filter((p): p is { v: number; full: string } => typeof p.v === 'number');
  if (vals.length === 0) return null;
  let max = vals[0];
  let min = vals[0];
  vals.forEach((p) => {
    if (p.v > max.v) max = p;
    if (p.v < min.v) min = p;
  });
  const first = vals[0];
  const last = vals[vals.length - 1];
  return { first, last, max, min, change: changeBetween(first.v, last.v, s.unit) };
}

export function changeBetween(from: number, to: number, unit: Unit): number | null {
  if (unit === 'percent') return to - from;
  if (from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

/* ------------------------------------------------------------------ */
/*  KPI tiles                                                          */
/* ------------------------------------------------------------------ */

export type KpiNote = 'total' | 'average' | 'highest' | 'lowest' | 'count' | 'latest' | 'lastValue';

export interface Kpi {
  id: string;
  sectionId: string;
  label: string;
  value: number;
  unit: Unit;
  dec: number;
  note: KpiNote;
  asOf?: string;
  delta?: { change: number; points: boolean; since: string };
}

export type Agg = 'sum' | 'average' | 'count' | 'min' | 'max' | 'latest';

const normAgg = (a: string | undefined): Agg => {
  switch (a) {
    case 'avg':
    case 'average': return 'average';
    case 'count':
    case 'min':
    case 'max':
    case 'latest': return a;
    default: return 'sum';
  }
};

/** Follower-style columns are a running level, not something to add up. */
const STOCK_RE = /follower|pengikut|subscriber|pelanggan tetap/i;
const STOCK_DELTA_RE = /baru|new|tambah|gain|growth|naik|net|selisih|change|perubahan|hilang|lost|unfollow/i;
const CURRENT_TITLE_RE = /saat ini|terakhir|terkini|current|latest|per hari ini/i;
const PEAK_TITLE_RE = /tertinggi|terendah|highest|lowest|peak|puncak/i;

export const isPercentLikeName = (name: string): boolean => PERCENT_RE.test(name);
export const isStockLikeName = (name: string): boolean => STOCK_RE.test(name) && !STOCK_DELTA_RE.test(name);

/**
 * The honest aggregation for a metric (kept identical to the backend PDF util,
 * backend/src/modules/reports/utils/report-insights.ts): percentages are never
 * summed (average); follower-style levels are never summed or "maxed" (latest
 * value) unless the title explicitly asks for a peak.
 */
export function resolveAggregation(column: string, title: string, unit: Unit, requested: string | undefined): Agg {
  let agg = normAgg(requested);
  if (unit === 'percent' && agg === 'sum') agg = 'average';
  const stock = isStockLikeName(column) || CURRENT_TITLE_RE.test(title);
  if (stock && (agg === 'sum' || agg === 'max' || agg === 'latest') && !PEAK_TITLE_RE.test(title) && unit !== 'percent') {
    agg = 'latest';
  }
  return agg;
}

function aggregateValues(values: number[], agg: Exclude<Agg, 'latest'>): number {
  switch (agg) {
    case 'count': return values.length;
    case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return values.reduce((a, b) => a + b, 0);
  }
}

/** Rows in chronological order when the section has a date column. */
function chronological(section: ReportSection): { rows: Row[]; dateKey?: string } {
  const rows = rowsOf(section);
  const types = (section.columnTypes ?? {}) as Record<string, string>;
  const dateKey = Object.keys(types).find((k) => types[k] === 'DATE') ?? Object.keys(rows[0] ?? {}).find((k) => isDateColumn(section, k));
  if (dateKey === undefined) return { rows };
  const dated = rows
    .map((r) => ({ r, d: toDate(r[dateKey]) }))
    .filter((x): x is { r: Row; d: Date } => x.d !== null)
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  return dated.length === 0 ? { rows } : { rows: dated.map((x) => x.r), dateKey };
}

/** A leading "Total" in a title follows the aggregation actually used. */
export function kpiLabel(title: string, key: string, agg: Agg): string {
  if (title === '') return prettyLabel(key);
  if (agg === 'sum' || !/^total\s+/i.test(title)) return title;
  const rest = title.replace(/^total\s+/i, '');
  return agg === 'average' ? `Rata-rata ${rest}` : rest;
}

/** KPI for one metric_card visualization (null when the column is not numeric). */
export function metricKpi(section: ReportSection, viz: VisualizationConfig): Kpi | null {
  const key = viz.valueKey ?? viz.metric;
  if (key === undefined || key === '') return null;
  const rows = rowsOf(section);
  const values = rows.map((r) => toNum(r[key])).filter((n): n is number => n !== null);
  if (values.length === 0) return null;
  const unit = columnUnit(key, rows, key);
  const title = typeof viz.title === 'string' ? viz.title.trim() : '';
  const agg = resolveAggregation(key, title, unit, viz.aggregation);
  const baseDec = columnDecimals(rows, key, unit);
  const label = kpiLabel(title, key, agg);
  const id = `${section.id}:${key}:m`;

  if (agg === 'latest') {
    const ch = chronological(section);
    let lastRow: Row | undefined;
    for (let i = ch.rows.length - 1; i >= 0; i--) {
      if (toNum(ch.rows[i][key]) !== null) { lastRow = ch.rows[i]; break; }
    }
    if (lastRow === undefined) return null;
    const d = ch.dateKey !== undefined ? toDate(lastRow[ch.dateKey]) : null;
    return {
      id, sectionId: section.id, label, value: toNum(lastRow[key]) as number, unit, dec: baseDec,
      note: 'lastValue', asOf: d !== null ? fmtDate(d, 'long') : undefined,
    };
  }

  const value = aggregateValues(values, agg);
  const dec = agg === 'count' ? 0 : agg === 'average' ? Math.max(baseDec, Number.isInteger(value) ? 0 : 1) : baseDec;
  const note: KpiNote =
    agg === 'sum' ? 'total' : agg === 'max' ? 'highest' : agg === 'min' ? 'lowest' : agg === 'count' ? 'count' : 'average';
  return { id, sectionId: section.id, label, value, unit, dec, note };
}

/** KPI = latest value of a date-indexed series, with change vs the previous data point. */
export function latestKpi(section: ReportSection, viz: VisualizationConfig): Kpi | null {
  const ys = asArray(viz.yAxis as string | string[] | undefined);
  if (ys.length === 0) return null;
  const prep = prepare(section, viz.xAxis, [ys[0]]);
  if (!prep.isDate) return null;
  const s = prep.series[0];
  const vals = prep.points.filter((p) => typeof p[s.id] === 'number');
  if (vals.length === 0) return null;
  const last = vals[vals.length - 1];
  const kpi: Kpi = {
    id: `${section.id}:${s.column}:l`,
    sectionId: section.id,
    label: s.label,
    value: last[s.id] as number,
    unit: s.unit,
    dec: s.dec,
    note: 'latest',
    asOf: last.full,
  };
  if (vals.length >= 2) {
    const prev = vals[vals.length - 2];
    const change = changeBetween(prev[s.id] as number, kpi.value, s.unit);
    if (change !== null) kpi.delta = { change, points: s.unit === 'percent', since: prev.full };
  }
  return kpi;
}

/** Up to `max` headline numbers for the top of the report. */
export function buildKpis(sections: ReportSection[], max = 6): Kpi[] {
  const out: Kpi[] = [];
  const seen = new Set<string>();
  const push = (k: Kpi | null): boolean => {
    if (k === null) return false;
    const sig = k.label.toLowerCase();
    if (seen.has(sig)) return false;
    seen.add(sig);
    out.push(k);
    return true;
  };
  for (const section of sections) {
    const vizzes = Array.isArray(section.visualizations) ? section.visualizations : [];
    let perSection = 0;
    const metricCols = new Set<string>();
    for (const v of vizzes) {
      if (v.type !== 'metric_card') continue;
      metricCols.add(v.valueKey ?? v.metric ?? '');
      if (perSection < 2 && push(metricKpi(section, v))) perSection++;
    }
    if (perSection === 0) {
      vizzes.some((v) => {
        if (v.type !== 'line' && v.type !== 'area') return false;
        const col = (asArray(v.yAxis as string | string[] | undefined) as (string | undefined)[])[0];
        return col !== undefined && !metricCols.has(col) && push(latestKpi(section, v));
      });
    }
  }
  return out.slice(0, max);
}
