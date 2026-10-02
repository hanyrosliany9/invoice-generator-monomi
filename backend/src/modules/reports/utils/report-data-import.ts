/**
 * Pure helpers that turn a spreadsheet-like matrix (CSV / Excel / manual grid)
 * into the section data shape used by reports: ordered headers, row objects,
 * column types and human-readable warnings.
 *
 * Staff in Indonesia get exports in many dialects, so this module decides per
 * COLUMN (not per cell) how to read the values:
 *   - numbers:  "12,5" "1.234" "1.234.567" "1,234.5" "Rp 1.250.000" "3,4%" "1,2rb" "(42)"
 *   - dates:    "2026-09-01" "01/09/2026" "1 Okt 2026" "1 Oktober 2026" "Okt 2026" "Sep 1, 2026"
 *   - blanks:   "", "-", "n/a" ...
 * and stores canonical values so the staff UI, the client portal and the PDF
 * all read exactly the same thing:
 *   - number   -> JS number
 *   - percent  -> "12.5%"     (kept as text so the unit survives)
 *   - currency -> "Rp151000"  (kept as text so the unit survives)
 *   - date     -> "2026-09-01" (or "2026-09-01 14:30" when the source has a time)
 *   - text     -> trimmed string
 * Canonical values re-normalise to themselves (idempotent), which is what lets
 * the manual grid edit an existing section safely.
 */

export type DataType = "DATE" | "NUMBER" | "STRING";
export type ColumnKind = "date" | "number" | "percent" | "currency" | "text";

/** A raw cell: text from CSV, typed values from Excel / the manual grid. */
export type RawCell =
  | string
  | number
  | boolean
  | null
  | undefined
  | { pct: number };

export interface NormalizedData {
  headers: string[];
  rows: Record<string, string | number>[];
  rowCount: number;
  columnTypes: Record<string, DataType>;
  columnKinds: Record<string, ColumnKind>;
  warnings: string[];
}

export interface NormalizeOptions {
  /** Force a kind per column (manual grid). Unlisted columns are auto-detected. */
  forcedKinds?: Record<string, ColumnKind>;
  /** Treat the first row as the header (default) or generate headers. */
  headerRow?: "auto" | "first";
  /** Throw instead of blanking when a forced column has unreadable cells. */
  strict?: boolean;
}

export class ImportError extends Error {}

const TYPE_THRESHOLD = 0.85;

/*
 * Import limits. One report section holds a summary table (daily / weekly
 * metrics), not a raw data dump; the caps also bound the CPU and memory spent
 * on one upload, since parsing runs synchronously on the event loop.
 */
/** Maximum columns in one section. */
export const MAX_IMPORT_COLUMNS = 60;
/** Maximum data rows (below the header) in one section. */
export const MAX_IMPORT_ROWS = 5000;
/** Maximum data cells (rows x kept columns) in one section. */
export const MAX_IMPORT_CELLS = 150_000;
/**
 * Maximum raw lines read from a file: room for title lines, blank spacer rows
 * and the header above MAX_IMPORT_ROWS data rows. Anything longer is refused.
 */
export const MAX_SOURCE_ROWS = MAX_IMPORT_ROWS * 2;
/**
 * Maximum characters in one manually typed cell. Long enough for a full
 * Instagram caption, since editing an imported section round-trips its text.
 */
export const MAX_MANUAL_CELL_CHARS = 2200;
const MAX_COLUMNS = MAX_IMPORT_COLUMNS;

/** 5000 -> "5.000" (Indonesian digit grouping, no ICU dependency). */
export const fmtCount = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const ROW_LIMIT_MESSAGE =
  `Data berisi lebih dari ${fmtCount(MAX_IMPORT_ROWS)} baris. Maksimum ${fmtCount(MAX_IMPORT_ROWS)} baris per bagian laporan. ` +
  "Bagi data menjadi beberapa bagian atau ringkas per minggu/bulan, lalu unggah lagi.";
const PLACEHOLDER_RE = /^(-+|–|—|n\/?a|na|null|none|nan|#n\/a|#div\/0!|#value!|\?|tidak ada|belum ada)$/i;

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

const cellText = (v: RawCell): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return `${v.pct}%`;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v)
    .replace(/\u0000/g, "")
    .replace(/[   ]/g, " ")
    .trim();
};

const isBlank = (s: string): boolean => s === "" || PLACEHOLDER_RE.test(s);

/* ------------------------------------------------------------------ */
/*  Numbers                                                            */
/* ------------------------------------------------------------------ */

interface NumInfo {
  value: number;
  percent: boolean;
  currency: boolean;
}

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  rb: 1e3,
  ribu: 1e3,
  m: 1e6,
  mn: 1e6,
  jt: 1e6,
  juta: 1e6,
  b: 1e9,
  miliar: 1e9,
};

interface Prepared {
  body: string;
  percent: boolean;
  currency: boolean;
  negative: boolean;
  multiplier: number;
}

function prepareNumber(raw: string): Prepared | null {
  let s = raw.trim();
  if (s === "") return null;
  let negative = false;
  if (/^\(.+\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  let currency = false;
  const cur = /^([+-]?)\s*(?:rp\.?|idr)\s*/i.exec(s);
  if (cur !== null) {
    currency = true;
    s = (cur[1] ?? "") + s.slice(cur[0].length);
  }
  s = s.replace(/^([+-]?)\s*[$€£¥₹]\s*/, "$1");
  let percent = false;
  if (/%$/.test(s)) {
    percent = true;
    s = s.slice(0, -1).trim();
  } else if (/%/.test(s)) {
    return null;
  }
  let multiplier = 1;
  const suf = /^(.*?\d)\s*(k|rb|ribu|mn|m|jt|juta|b|miliar)$/i.exec(s);
  if (suf !== null) {
    multiplier = MULTIPLIERS[suf[2].toLowerCase()] ?? 1;
    s = suf[1];
  }
  if (s.startsWith("-") || s.startsWith("+")) {
    if (s.startsWith("-")) negative = !negative;
    s = s.slice(1).trim();
  }
  s = s.replace(/\s+/g, "");
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  return { body: s, percent, currency, negative, multiplier };
}

type Decimal = "." | "," | "auto";

/** Is "1.234" / "12.345.678" style (dot or comma as thousands group)? */
const groupedBy = (s: string, sep: "." | ","): boolean =>
  new RegExp(`^[1-9]\\d{0,2}(\\${sep}\\d{3})+$`).test(s);

/**
 * Decide, for a whole column, which character is the decimal separator.
 * "auto" means mixed evidence: fall back to a per-cell decision.
 */
function decideDecimal(bodies: string[]): Decimal {
  let commaDecimal = 0;
  let dotDecimal = 0;
  let dotGrouped = 0;
  let commaGrouped = 0;
  for (const s of bodies) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) {
      if (lastComma > lastDot) commaDecimal++;
      else dotDecimal++;
    } else if (lastComma >= 0) {
      if (groupedBy(s, ",")) commaGrouped++;
      else if ((s.match(/,/g) ?? []).length === 1) commaDecimal++;
    } else if (lastDot >= 0) {
      if (groupedBy(s, ".")) dotGrouped++;
      else if ((s.match(/\./g) ?? []).length === 1) dotDecimal++;
    }
  }
  if (commaDecimal > 0 && dotDecimal === 0) return ",";
  if (dotDecimal > 0 && commaDecimal === 0) return ".";
  if (commaDecimal > 0 && dotDecimal > 0) return "auto";
  // No decisive cell: only whole numbers and/or grouped thousands.
  if (dotGrouped > 0 && commaGrouped === 0) return ","; // "1.234" => 1234 (Indonesian)
  if (commaGrouped > 0 && dotGrouped === 0) return "."; // "1,234" => 1234 (English)
  return "auto";
}

function toNumber(p: Prepared, decimal: Decimal): number | null {
  let s = p.body;
  let d: "." | ",";
  if (decimal === "auto") {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) d = lastComma > lastDot ? "," : ".";
    else if (lastComma >= 0) d = groupedBy(s, ",") ? "." : ",";
    else if (lastDot >= 0) d = groupedBy(s, ".") ? "," : ".";
    else d = ".";
  } else {
    d = decimal;
  }
  s = d === "," ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  let n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  n *= p.multiplier;
  if (p.negative) n = -n;
  return Number(n.toPrecision(15));
}

/** Parse one number the way the column decision says. */
export function parseNumberCell(raw: string, decimal: Decimal = "auto"): NumInfo | null {
  const p = prepareNumber(raw);
  if (p === null) return null;
  const value = toNumber(p, decimal);
  if (value === null) return null;
  return { value, percent: p.percent, currency: p.currency };
}

/* ------------------------------------------------------------------ */
/*  Dates                                                              */
/* ------------------------------------------------------------------ */

const MONTH_PREFIX: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  agu: 8, agt: 8, ags: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, nop: 11, des: 12, dec: 12,
};
const MONTH_FULL = new Set([
  "januari", "februari", "maret", "april", "juni", "juli", "agustus", "september",
  "oktober", "november", "nopember", "desember", "january", "february", "march",
  "june", "july", "august", "october", "december",
]);
const WEEKDAY_RE =
  /^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+/i;

function monthOf(word: string): number | null {
  const w = word.toLowerCase().replace(/\./g, "");
  const m = MONTH_PREFIX[w.slice(0, 3)];
  if (m === undefined) return null;
  if (w.length <= 4 || MONTH_FULL.has(w)) return m;
  return null;
}

const pad = (n: number): string => String(n).padStart(2, "0");

function validYMD(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const TIME_RE = String.raw`(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(?:Z|[+-]\d{2}:?\d{2})?)?`;
const ISO_RE = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${TIME_RE}$`);
const NUMERIC_RE = new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})${TIME_RE}$`);
const D_MON_Y_RE = /^(\d{1,2})[\s\-./]*([A-Za-z]{3,10})\.?[\s\-./,']*(\d{4}|\d{2})$/;
const MON_D_Y_RE = /^([A-Za-z]{3,10})\.?\s+(\d{1,2}),?\s+(\d{4})$/;
const MON_Y_RE = /^([A-Za-z]{3,10})\.?[\s\-./']*(\d{4})$/;
const YM_RE = /^(\d{4})[-/](\d{1,2})$/;

export type DateOrder = "DMY" | "MDY";

const fullYear = (y: number): number => (y < 100 ? 2000 + y : y);

function fmtDate(y: number, m: number, d: number, time?: [string, string, string | undefined]): string {
  const base = `${y}-${pad(m)}-${pad(d)}`;
  if (time === undefined || time[0] === undefined) return base;
  const hh = +time[0];
  const mm = +time[1];
  const ss = time[2] === undefined ? 0 : +time[2];
  if (hh === 0 && mm === 0 && ss === 0) return base;
  if (hh > 23 || mm > 59 || ss > 59) return base;
  return `${base} ${pad(hh)}:${pad(mm)}${ss > 0 ? `:${pad(ss)}` : ""}`;
}

/**
 * Parse a date cell to canonical "YYYY-MM-DD" (or "YYYY-MM-DD HH:mm").
 * `order` resolves ambiguous 01/02/2026 (default: Indonesian DD/MM).
 */
export function parseDateCell(raw: string, order: DateOrder = "DMY"): string | null {
  let s = raw.trim().replace(WEEKDAY_RE, "");
  if (s === "" || /^\d+$/.test(s) || s.length < 6) return null;

  let m = ISO_RE.exec(s);
  if (m !== null) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return validYMD(y, mo, d) ? fmtDate(y, mo, d, [m[4], m[5], m[6]]) : null;
  }
  m = NUMERIC_RE.exec(s);
  if (m !== null) {
    const a = +m[1];
    const b = +m[2];
    const y = fullYear(+m[3]);
    const [d, mo] = order === "DMY" ? [a, b] : [b, a];
    return validYMD(y, mo, d) ? fmtDate(y, mo, d, [m[4], m[5], m[6]]) : null;
  }
  s = s.replace(/\s+/g, " ");
  m = D_MON_Y_RE.exec(s);
  if (m !== null) {
    const mo = monthOf(m[2]);
    const y = fullYear(+m[3]);
    if (mo !== null && validYMD(y, mo, +m[1])) return fmtDate(y, mo, +m[1]);
    return null;
  }
  m = MON_D_Y_RE.exec(s);
  if (m !== null) {
    const mo = monthOf(m[1]);
    if (mo !== null && validYMD(+m[3], mo, +m[2])) return fmtDate(+m[3], mo, +m[2]);
    return null;
  }
  m = MON_Y_RE.exec(s);
  if (m !== null) {
    const mo = monthOf(m[1]);
    return mo !== null && validYMD(+m[2], mo, 1) ? fmtDate(+m[2], mo, 1) : null;
  }
  m = YM_RE.exec(s);
  if (m !== null && validYMD(+m[1], +m[2], 1)) return fmtDate(+m[1], +m[2], 1);
  return null;
}

/** Column-wide choice for ambiguous numeric dates. Indonesian DD/MM unless proven otherwise. */
export function decideDateOrder(cells: string[]): DateOrder {
  let firstOver12 = 0;
  let secondOver12 = 0;
  for (const c of cells) {
    const m = NUMERIC_RE.exec(c.trim().replace(WEEKDAY_RE, ""));
    if (m === null) continue;
    if (+m[1] > 12) firstOver12++;
    if (+m[2] > 12) secondOver12++;
  }
  return secondOver12 > 0 && firstOver12 === 0 ? "MDY" : "DMY";
}

/** True when the column has numeric dates that are valid both ways (DD/MM vs MM/DD). */
function hasAmbiguousDates(cells: string[]): boolean {
  let numeric = 0;
  let decisive = 0;
  for (const c of cells) {
    const m = NUMERIC_RE.exec(c.trim().replace(WEEKDAY_RE, ""));
    if (m === null) continue;
    numeric++;
    if (+m[1] > 12 || +m[2] > 12 || +m[1] === +m[2]) decisive++;
  }
  return numeric > 0 && decisive === 0;
}

/* ------------------------------------------------------------------ */
/*  Matrix -> section data                                             */
/* ------------------------------------------------------------------ */

const lastFilled = (row: RawCell[]): number => {
  for (let i = row.length - 1; i >= 0; i--) if (cellText(row[i]) !== "") return i + 1;
  return 0;
};

/** Find the header row: skips title lines above the table. */
function findHeaderIndex(lens: number[]): number {
  const counts = new Map<number, number>();
  for (const l of lens) if (l > 0) counts.set(l, (counts.get(l) ?? 0) + 1);
  if (counts.size === 0) return -1;
  const maxCount = Math.max(...counts.values());
  const need = Math.max(2, Math.ceil(maxCount / 2));
  let eligible = [...counts.entries()].filter(([, c]) => c >= need).map(([w]) => w);
  if (eligible.length === 0) {
    const first = lens.find((l) => l >= 2) ?? lens.find((l) => l > 0) ?? 1;
    eligible = [first];
  }
  const width = Math.max(...eligible);
  return lens.findIndex((l) => l === width);
}

function cleanHeaders(raw: string[], filledColumns: boolean[], warnings: string[]): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  let renamed = 0;
  raw.forEach((h0, i) => {
    let h = h0.replace(/\s+/g, " ").trim().slice(0, 80);
    if (h === "") {
      h = `Kolom ${i + 1}`;
      if (filledColumns[i]) renamed++;
    }
    const key = h.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) {
      h = `${h} ${n}`;
      renamed++;
      seen.set(h.toLowerCase(), 1);
    }
    out.push(h);
  });
  if (renamed > 0) {
    warnings.push(
      `${renamed} judul kolom kosong atau kembar diberi nama otomatis (misalnya "Kolom 3"). Ubah di file lalu unggah ulang jika perlu.`,
    );
  }
  return out;
}

const KIND_TO_TYPE: Record<ColumnKind, DataType> = {
  date: "DATE",
  number: "NUMBER",
  percent: "NUMBER",
  currency: "NUMBER",
  text: "STRING",
};

const fmtNumberPlain = (n: number, maxDec: number): string => String(Number(n.toFixed(maxDec)));

/**
 * Normalise a matrix. `matrix[0]` is the header unless `headerRow: "auto"`
 * finds title lines above it.
 */
export function normalizeMatrix(
  matrix: RawCell[][],
  opts: NormalizeOptions = {},
): NormalizedData {
  const warnings: string[] = [];
  if (matrix.length > MAX_SOURCE_ROWS) throw new ImportError(ROW_LIMIT_MESSAGE);
  const rowsAll = matrix.filter((r) => r.some((c) => cellText(c) !== ""));
  if (rowsAll.length === 0) {
    throw new ImportError("File kosong: tidak ada data yang bisa dibaca.");
  }
  const lens = rowsAll.map(lastFilled);
  const hIdx = opts.headerRow === "first" ? 0 : findHeaderIndex(lens);
  if (hIdx < 0) throw new ImportError("File kosong: tidak ada data yang bisa dibaca.");
  if (hIdx > 0) {
    warnings.push(
      `${hIdx} baris di atas judul kolom diabaikan (catatan atau judul laporan dari aplikasi asal).`,
    );
  }
  const headerCells = rowsAll[hIdx];
  const width = Math.max(lens[hIdx], 1);
  const dataRows = rowsAll.slice(hIdx + 1);
  if (dataRows.length === 0) {
    throw new ImportError(
      "File hanya berisi judul kolom tanpa baris data. Isi data di bawah judul kolom lalu unggah lagi.",
    );
  }
  if (width > MAX_COLUMNS) {
    throw new ImportError(
      `File memiliki lebih dari ${MAX_COLUMNS} kolom; maksimum ${MAX_COLUMNS} kolom per bagian. Hapus kolom yang tidak dipakai lalu unggah lagi.`,
    );
  }
  if (dataRows.length > MAX_IMPORT_ROWS) throw new ImportError(ROW_LIMIT_MESSAGE);

  // Columns that carry any data below the header (headers can be blank).
  const filled: boolean[] = Array.from({ length: width }, (_, c) =>
    dataRows.some((r) => cellText(r[c]) !== ""),
  );
  const headersAll = cleanHeaders(
    Array.from({ length: width }, (_, c) => cellText(headerCells[c])),
    filled,
    warnings,
  );
  // Drop columns that are empty everywhere (stray separators, formatting columns).
  const keep = headersAll
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => filled[i] || cellText(headerCells[i]) !== "");
  const dropped = width - keep.length;
  if (dropped > 0) warnings.push(`${dropped} kolom kosong dilewati.`);
  if (keep.length === 0) {
    throw new ImportError("Tidak ada kolom berisi data yang bisa dibaca.");
  }
  if (keep.length * dataRows.length > MAX_IMPORT_CELLS) {
    throw new ImportError(
      `Data terlalu besar: ${fmtCount(dataRows.length)} baris x ${keep.length} kolom = ${fmtCount(
        keep.length * dataRows.length,
      )} sel. Maksimum ${fmtCount(MAX_IMPORT_CELLS)} sel per bagian laporan. Kurangi kolom atau baris, lalu unggah lagi.`,
    );
  }

  const longRows = dataRows.filter((r) => lastFilled(r) > width).length;
  if (longRows > 0) {
    warnings.push(`${longRows} baris memiliki lebih banyak kolom daripada judul; kolom lebih diabaikan.`);
  }

  const headers = keep.map((k) => k.h);
  const columnTypes: Record<string, DataType> = {};
  const columnKinds: Record<string, ColumnKind> = {};
  const columns: Record<string, string | number>[] = dataRows.map(() => ({}));
  const ambiguousDateCols: string[] = [];

  keep.forEach(({ h, i }) => {
    const raw = dataRows.map((r) => r[i]);
    const texts = raw.map(cellText);
    const nonBlank = texts.filter((t) => !isBlank(t));
    const forced = opts.forcedKinds?.[h];

    // Excel-typed percents ({pct}) and numbers are unambiguous.
    const typedPct = raw.some((c) => typeof c === "object" && c !== null);

    const bodies: string[] = [];
    for (const t of nonBlank) {
      const p = prepareNumber(t);
      if (p !== null) bodies.push(p.body);
    }
    const decimal = decideDecimal(bodies);
    const numInfos = raw.map((c, idx) => {
      if (typeof c === "number") {
        return Number.isFinite(c) ? ({ value: c, percent: false, currency: false } as NumInfo) : null;
      }
      if (typeof c === "object" && c !== null) {
        return { value: c.pct, percent: true, currency: false } as NumInfo;
      }
      const t = texts[idx];
      return isBlank(t) ? null : parseNumberCell(t, decimal);
    });
    const numOk = numInfos.filter((n) => n !== null).length;

    const order = decideDateOrder(nonBlank);
    const dateInfos = texts.map((t) => (isBlank(t) ? null : parseDateCell(t, order)));
    const dateOk = dateInfos.filter((d) => d !== null).length;

    const denom = Math.max(nonBlank.length, typedPct ? numOk : 0, 1);
    let kind: ColumnKind;
    if (forced !== undefined) {
      kind = forced;
    } else if (nonBlank.length === 0 && !typedPct) {
      kind = "text";
    } else if (numOk / denom >= TYPE_THRESHOLD) {
      const pct = numInfos.filter((n) => n?.percent === true).length;
      const cur = numInfos.filter((n) => n?.currency === true).length;
      kind = pct >= numOk / 2 ? "percent" : cur >= numOk / 2 ? "currency" : "number";
    } else if (dateOk / denom >= TYPE_THRESHOLD) {
      kind = "date";
    } else {
      kind = "text";
    }

    columnKinds[h] = kind;
    columnTypes[h] = KIND_TO_TYPE[kind];
    if (kind === "date" && hasAmbiguousDates(nonBlank)) ambiguousDateCols.push(h);
    // A time of day that is identical on every row (Excel stores dates as
    // midnight in some timezones) is noise, not data.
    const stripTimes =
      kind === "date" &&
      (() => {
        const times = dateInfos.filter((d): d is string => d !== null).map((d) => d.slice(10));
        return times.length > 0 && times.every((t) => t === times[0]);
      })();

    let invalid = 0;
    const badSamples: string[] = [];
    dataRows.forEach((_, ri) => {
      const t = texts[ri];
      let out: string | number = "";
      if (kind === "text") {
        out = t;
      } else if (isBlank(t) && typeof raw[ri] !== "number" && !(typeof raw[ri] === "object" && raw[ri] !== null)) {
        out = "";
      } else if (kind === "date") {
        const d = dateInfos[ri] ?? parseDateCell(t, order);
        if (d === null) {
          invalid++;
          if (badSamples.length < 3) badSamples.push(t);
        } else out = stripTimes ? d.slice(0, 10) : d;
      } else {
        const n = numInfos[ri];
        if (n === null || n === undefined) {
          invalid++;
          if (badSamples.length < 3) badSamples.push(t);
        } else if (kind === "percent") {
          out = `${fmtNumberPlain(n.value, 2)}%`;
        } else if (kind === "currency") {
          out = `Rp${fmtNumberPlain(n.value, 2)}`;
        } else {
          out = n.value;
        }
      }
      columns[ri][h] = out;
    });
    if (invalid > 0) {
      const label = kind === "date" ? "tanggal" : "angka";
      const msg = `Kolom "${h}": ${invalid} nilai bukan ${label} yang valid (${badSamples
        .map((b) => `"${b.slice(0, 20)}"`)
        .join(", ")}).`;
      if (opts.strict && forced !== undefined) throw new ImportError(msg);
      warnings.push(`${msg} Nilai tersebut dikosongkan.`);
    }
  });

  if (ambiguousDateCols.length > 0) {
    warnings.push(
      `Tanggal pada kolom ${ambiguousDateCols.map((c) => `"${c}"`).join(", ")} dibaca sebagai HARI/BULAN/TAHUN (mis. 03/09/2026 = 3 September). Periksa jika file Anda memakai urutan bulan/hari.`,
    );
  }

  // Drop rows that ended up fully empty.
  const rows = columns.filter((r) => headers.some((h) => r[h] !== "" && r[h] !== undefined));
  const skipped = columns.length - rows.length;
  if (skipped > 0) warnings.push(`${skipped} baris kosong dilewati.`);
  if (rows.length === 0) {
    throw new ImportError("Tidak ada baris data yang bisa dibaca dari file.");
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
    columnTypes,
    columnKinds,
    warnings,
  };
}
