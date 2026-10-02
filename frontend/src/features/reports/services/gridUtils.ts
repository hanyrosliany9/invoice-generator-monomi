/**
 * Helpers for the report builder's data entry: column order/kind of a stored
 * section, the editable grid state, and light client-side guesses
 * (the server stays the source of truth when saving).
 */
import type {
  ColumnKind,
  GridCell,
  GridColumn,
  ReportSection,
  SectionSource,
} from '@/types/report';

export const KIND_OPTIONS: ColumnKind[] = ['date', 'number', 'percent', 'currency', 'text'];

/** Column names in the order of the original file (JSON storage loses key order). */
export function orderedColumns(section: Pick<ReportSection, 'columnTypes' | 'layout' | 'rawData'>): string[] {
  const known = Object.keys(section.columnTypes ?? {});
  const saved = (section.layout?.columnOrder ?? []).filter((c) => known.includes(c));
  const rest = known.filter((c) => !saved.includes(c));
  return [...saved, ...rest];
}

export function sectionSource(section: Pick<ReportSection, 'layout' | 'csvFileName'>): SectionSource {
  const s = section.layout?.source;
  if (s === 'file' || s === 'manual' || s === 'metrics') return s;
  return section.csvFileName === 'Input manual' ? 'manual' : section.csvFileName === 'Ringkasan angka' ? 'metrics' : 'file';
}

/** Kind of a column as the importer stored it ("12.5%" = percent, "Rp1500" = currency). */
export function kindOfColumn(
  section: Pick<ReportSection, 'columnTypes' | 'rawData'>,
  col: string,
): ColumnKind {
  const t = section.columnTypes?.[col];
  if (t === 'DATE') return 'date';
  if (t !== 'NUMBER') return 'text';
  const vals = (section.rawData ?? []).slice(0, 30).map((r) => r?.[col]);
  if (vals.some((v) => typeof v === 'string' && v.trim().endsWith('%'))) return 'percent';
  if (vals.some((v) => typeof v === 'string' && /^\s*(rp|idr)/i.test(v))) return 'currency';
  return 'number';
}

export interface GridState {
  columns: GridColumn[];
  rows: GridCell[][];
}

export function gridFromSection(section: ReportSection): GridState {
  const cols = orderedColumns(section);
  return {
    columns: cols.map((name) => ({ name, type: kindOfColumn(section, name) })),
    rows: (section.rawData ?? []).map((r) =>
      cols.map((c) => {
        const v = r?.[c];
        return typeof v === 'number' || typeof v === 'string' ? v : '';
      }),
    ),
  };
}

/** Strip the unit prefix/suffix so a stored "Rp1500" / "3.4%" shows as a plain number to edit. */
export function displayCell(v: GridCell, kind: ColumnKind): string {
  if (typeof v === 'number') return String(v);
  if (kind === 'percent') return v.replace(/%\s*$/, '');
  if (kind === 'currency') return v.replace(/^\s*(rp\.?|idr)\s*/i, '');
  return v;
}

/* ------------------------------------------------------------------ */
/*  Light validation (mirrors the importer's tolerance, not its rules)   */
/* ------------------------------------------------------------------ */

const NUM_RE = /^[+-]?\s*\(?\s*(rp\.?|idr)?\s*\d[\d.,\s]*\)?\s*(%|k|rb|ribu|jt|juta|m|mn|b|miliar)?$/i;
const MONTH_WORD = '(jan|feb|mar|apr|mei|may|jun|jul|agu|agt|ags|aug|sep|okt|oct|nov|nop|des|dec)[a-z]*\\.?';
const DATE_RES = [
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}([T\s].*)?$/,
  /^\d{1,2}[-/.]\d{1,2}[-/.](\d{2}|\d{4})$/,
  new RegExp(`^(\\w+,\\s*)?\\d{1,2}[\\s\\-./]*${MONTH_WORD}[\\s\\-./,']*(\\d{2}|\\d{4})$`, 'i'),
  new RegExp(`^${MONTH_WORD}\\s+\\d{1,2},?\\s+\\d{4}$`, 'i'),
  new RegExp(`^${MONTH_WORD}[\\s\\-./']*\\d{4}$`, 'i'),
];

export const looksNumber = (s: string): boolean => NUM_RE.test(s.trim());
export const looksDate = (s: string): boolean => DATE_RES.some((re) => re.test(s.trim()));

/** True when a typed cell is clearly not valid for its column. Blank is fine. */
export function cellProblem(v: GridCell, kind: ColumnKind): boolean {
  if (typeof v === 'number') return kind === 'date';
  const s = v.trim();
  if (s === '' || /^(-+|–|—|n\/?a)$/i.test(s)) return false;
  if (kind === 'text') return false;
  if (kind === 'date') return !looksDate(s);
  return !looksNumber(s);
}

export function guessKind(cells: string[]): ColumnKind {
  const vals = cells.map((c) => c.trim()).filter((c) => c !== '' && !/^(-+|–|—|n\/?a)$/i.test(c));
  if (vals.length === 0) return 'text';
  const share = (fn: (s: string) => boolean) => vals.filter(fn).length / vals.length;
  if (share(looksDate) >= 0.85) return 'date';
  if (share(looksNumber) >= 0.85) {
    if (vals.filter((v) => v.endsWith('%')).length >= vals.length / 2) return 'percent';
    if (vals.filter((v) => /^\s*(rp|idr)/i.test(v)).length >= vals.length / 2) return 'currency';
    return 'number';
  }
  return 'text';
}

/** Parse text copied from Excel / Google Sheets (tab separated) or a CSV snippet. */
export function parseClipboard(text: string): string[][] {
  const t = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (t === '') return [];
  const delim = t.includes('\t') ? '\t' : (t.split('\n')[0].match(/;/g)?.length ?? 0) > 0 ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

/** Turn pasted rows into a grid; the first row is the header when it holds no numbers/dates. */
export function gridFromPaste(rows: string[][], firstRowIsHeader?: boolean): GridState {
  const width = Math.max(...rows.map((r) => r.length), 1);
  const padded = rows.map((r) => Array.from({ length: width }, (_, i) => (r[i] ?? '').trim()));
  const header =
    firstRowIsHeader ?? padded[0].every((c) => c === '' || (!looksNumber(c) && !looksDate(c)));
  const names = header
    ? padded[0].map((c, i) => c || `Kolom ${i + 1}`)
    : padded[0].map((_, i) => `Kolom ${i + 1}`);
  const body = header ? padded.slice(1) : padded;
  return {
    columns: names.map((name, i) => ({ name, type: guessKind(body.map((r) => r[i])) })),
    rows: body,
  };
}

/** Every day of a month as YYYY-MM-DD (the grid pre-fills these for daily presets). */
export function daysOfMonth(month: number, year: number): string[] {
  const n = new Date(year, month, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
}

export interface GridPreset {
  key: string;
  /** Daily presets get one pre-filled row per day of the report month. */
  daily: boolean;
  columns: GridColumn[];
}

export const GRID_PRESETS: GridPreset[] = [
  {
    key: 'instagram-harian',
    daily: true,
    columns: [
      { name: 'Tanggal', type: 'date' },
      { name: 'Jangkauan', type: 'number' },
      { name: 'Tayangan', type: 'number' },
      { name: 'Kunjungan Profil', type: 'number' },
      { name: 'Pengikut', type: 'number' },
      { name: 'Engagement Rate', type: 'percent' },
    ],
  },
  {
    key: 'tiktok-harian',
    daily: true,
    columns: [
      { name: 'Tanggal', type: 'date' },
      { name: 'Tayangan Video', type: 'number' },
      { name: 'Suka', type: 'number' },
      { name: 'Komentar', type: 'number' },
      { name: 'Dibagikan', type: 'number' },
      { name: 'Pengikut', type: 'number' },
    ],
  },
  {
    key: 'konten-teratas',
    daily: false,
    columns: [
      { name: 'Konten', type: 'text' },
      { name: 'Jenis', type: 'text' },
      { name: 'Tayangan', type: 'number' },
      { name: 'Suka', type: 'number' },
      { name: 'Komentar', type: 'number' },
    ],
  },
  {
    key: 'kosong',
    daily: false,
    columns: [
      { name: 'Kolom 1', type: 'text' },
      { name: 'Kolom 2', type: 'number' },
    ],
  },
];

export function gridFromPreset(preset: GridPreset, month: number, year: number): GridState {
  const blank = (): GridCell[] => preset.columns.map(() => '');
  if (preset.daily) {
    return {
      columns: preset.columns.map((c) => ({ ...c })),
      rows: daysOfMonth(month, year).map((d) => {
        const r = blank();
        r[0] = d;
        return r;
      }),
    };
  }
  return { columns: preset.columns.map((c) => ({ ...c })), rows: Array.from({ length: 5 }, blank) };
}
