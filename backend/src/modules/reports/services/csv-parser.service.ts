import { Injectable, BadRequestException } from "@nestjs/common";
import { isPercentLikeName, isStockLikeName } from "../utils/report-insights";
import {
  ColumnKind,
  DataType,
  ImportError,
  MAX_IMPORT_COLUMNS,
  MAX_MANUAL_CELL_CHARS,
  MAX_SOURCE_ROWS,
  NormalizedData,
  ROW_LIMIT_MESSAGE,
  RawCell,
  normalizeMatrix,
} from "../utils/report-data-import";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

export type { DataType } from "../utils/report-data-import";

export interface ColumnTypes {
  [columnName: string]: DataType;
}

export interface ParsedCSVData {
  /** Column names in the order of the source file. */
  headers: string[];
  rows: any[];
  rowCount: number;
  columnTypes: ColumnTypes;
  columnKinds: Record<string, ColumnKind>;
  /** Plain-language notes for the person importing (never fatal). */
  warnings: string[];
}

export interface VisualizationSuggestion {
  type: "line" | "bar" | "pie" | "area" | "table" | "metric_card";
  title: string;
  xAxis?: string;
  yAxis?: string | string[];
  nameKey?: string; // For pie charts
  valueKey?: string; // For pie charts and metric cards
  aggregation?: "sum" | "average" | "count" | "min" | "max" | "latest";
  precision?: number; // For metric cards
  color?: string;
}

export interface GridColumn {
  name: string;
  type: ColumnKind;
}

const PALETTE = [
  "#1890ff",
  "#52c41a",
  "#faad14",
  "#eb2f96",
  "#722ed1",
  "#13c2c2",
  "#fa8c16",
  "#a0d911",
];

const DELIMITERS = [",", ";", "\t", "|"] as const;

/** Decode bytes: BOMs, then UTF-8, then Windows-1252 (Excel "CSV (comma delimited)"). */
export function decodeText(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

/** Pick the delimiter whose first lines split into the most consistent multi-column rows. */
export function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .slice(0, 40);
  let best = ",";
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => {
      // Ignore delimiters inside quotes.
      let n = 0;
      let q = false;
      for (const ch of l) {
        if (ch === '"') q = !q;
        else if (!q && ch === d) n++;
      }
      return n;
    });
    const freq = new Map<number, number>();
    for (const c of counts) if (c > 0) freq.set(c, (freq.get(c) ?? 0) + 1);
    for (const [c, f] of freq) {
      const score = f * 10 + c;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
  }
  return best;
}

@Injectable()
export class UniversalCSVParserService {
  /**
   * Parse an uploaded CSV / Excel file into the normalised section data.
   * Throws BadRequestException with an Indonesian, actionable message.
   */
  async parseFile(file: Buffer, filename: string): Promise<ParsedCSVData> {
    const extension = filename.split(".").pop()?.toLowerCase();
    if (!file || file.length === 0) {
      throw new BadRequestException(
        "File kosong. Pilih file CSV atau Excel yang berisi data.",
      );
    }

    let matrix: RawCell[][];
    let sourceWarnings: string[] = [];
    if (extension === "csv" || extension === "txt" || extension === "tsv") {
      matrix = this.csvToMatrix(file);
    } else if (extension === "xlsx" || extension === "xls") {
      ({ matrix, warnings: sourceWarnings } = this.excelToMatrix(file));
    } else {
      throw new BadRequestException(
        "Format file tidak didukung. Unggah file CSV (.csv) atau Excel (.xlsx / .xls).",
      );
    }
    const parsed = this.normalize(matrix, {});
    parsed.warnings.push(...sourceWarnings);
    return parsed;
  }

  /**
   * Manual entry: a grid of typed columns. Unreadable cells are rejected so
   * the person can fix them (instead of silently dropping them).
   */
  parseGrid(columns: GridColumn[], rows: RawCell[][]): ParsedCSVData {
    const names = columns.map((c) => c.name.trim());
    const forced: Record<string, ColumnKind> = {};
    const seen = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      if (names[i] === "") {
        throw new BadRequestException(`Kolom ke-${i + 1} belum diberi nama.`);
      }
      const key = names[i].toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException(
          `Nama kolom "${names[i]}" dipakai dua kali. Beri nama yang berbeda.`,
        );
      }
      seen.add(key);
      forced[names[i]] = columns[i].type;
    }
    // Manual cells arrive as JSON: accept only plain values (the DTO checks
    // this too; repeated here so every caller of parseGrid is covered).
    for (const r of rows) {
      if (!Array.isArray(r)) throw new BadRequestException("Format baris tidak valid.");
      for (let i = 0; i < names.length; i++) {
        const v: unknown = r[i];
        const ok =
          v === null ||
          v === undefined ||
          typeof v === "boolean" ||
          (typeof v === "number" && Number.isFinite(v)) ||
          (typeof v === "string" && v.length <= MAX_MANUAL_CELL_CHARS);
        if (!ok) {
          throw new BadRequestException(
            typeof v === "string"
              ? `Isi sel pada kolom "${names[i]}" terlalu panjang (maksimum ${MAX_MANUAL_CELL_CHARS} karakter).`
              : `Isi sel pada kolom "${names[i]}" tidak valid.`,
          );
        }
      }
    }
    const matrix: RawCell[][] = [names, ...rows.map((r) => names.map((_, i) => r[i] ?? null))];
    return this.normalize(matrix, { forcedKinds: forced, strict: true, headerRow: "first" });
  }

  private normalize(
    matrix: RawCell[][],
    opts: Parameters<typeof normalizeMatrix>[1],
  ): ParsedCSVData {
    let n: NormalizedData;
    try {
      n = normalizeMatrix(matrix, opts);
    } catch (e) {
      if (e instanceof ImportError) throw new BadRequestException(e.message);
      throw e;
    }
    return {
      headers: n.headers,
      rows: n.rows,
      rowCount: n.rowCount,
      columnTypes: n.columnTypes,
      columnKinds: n.columnKinds,
      warnings: n.warnings,
    };
  }

  private csvToMatrix(buffer: Buffer): RawCell[][] {
    let text = decodeText(buffer);
    // Excel's "sep=;" hint line is not data.
    let delimiter: string | undefined;
    const sep = /^\s*sep=(.)\s*(\r?\n|$)/i.exec(text);
    if (sep !== null) {
      delimiter = sep[1];
      text = text.slice(sep[0].length);
    }
    if (text.trim() === "") {
      throw new BadRequestException(
        "File kosong. Pilih file CSV atau Excel yang berisi data.",
      );
    }
    delimiter ??= detectDelimiter(text);
    const result = Papa.parse<string[]>(text, {
      delimiter,
      skipEmptyLines: "greedy",
      header: false,
      dynamicTyping: false,
      // Stop reading past the row cap instead of materialising the whole file.
      preview: MAX_SOURCE_ROWS + 1,
    });
    if (result.meta.truncated || result.data.length > MAX_SOURCE_ROWS) {
      throw new BadRequestException(ROW_LIMIT_MESSAGE);
    }
    // Field-count mismatches and delimiter hints are tolerated (ragged exports);
    // only a structurally broken file (e.g. unbalanced quotes) is refused.
    const fatal = result.errors.find((e) => e.type === "Quotes");
    if (fatal !== undefined && result.data.length === 0) {
      throw new BadRequestException(
        "File CSV rusak: tanda kutip tidak berpasangan. Buka di Excel lalu simpan ulang sebagai CSV.",
      );
    }
    return result.data;
  }

  /**
   * First sheet with data; dates, percents and numbers keep their real values.
   *
   * The sheet's declared range (`!ref`, from the file's <dimension> record) is
   * attacker controlled: a few-KB file can claim A1:XFD1048576 (17 billion
   * cells). So the declared range is ignored (`nodim`), SheetJS stops after
   * MAX_SOURCE_ROWS + 1 rows (`sheetRows`), and the matrix is built only from
   * the bounds of the cells that actually hold a value, clamped to the column
   * cap, before anything is iterated.
   */
  private excelToMatrix(buffer: Buffer): { matrix: RawCell[][]; warnings: string[] } {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: "buffer",
        cellNF: true, // number formats tell dates and percents apart
        cellText: false, // formatted text (.w) is not used
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
        bookVBA: false,
        dense: true, // rows as arrays: only stored cells are visited
        nodim: true, // never trust the declared <dimension>
        sheetRows: MAX_SOURCE_ROWS + 1,
      });
    } catch (error) {
      throw new BadRequestException(
        `File Excel tidak bisa dibuka (${String((error as Error)?.message ?? error).slice(0, 200)}). Pastikan file tidak diberi kata sandi atau rusak.`,
      );
    }
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (!ws) continue;
      const cells = this.storedCells(ws);
      if (cells.length === 0) continue;

      let minR = Infinity;
      let maxR = -1;
      let minC = Infinity;
      let maxC = -1;
      for (const { r, c } of cells) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
      // A value on the extra row SheetJS was allowed to read means the sheet
      // is longer than the cap (the rest was never parsed). Values that sit
      // only beyond that row, after 5,000+ blank rows, are not read at all.
      if (maxR >= MAX_SOURCE_ROWS) throw new BadRequestException(ROW_LIMIT_MESSAGE);

      // One column past the cap so a too-wide header still gets the column
      // error from normalizeMatrix; stray cells further right are dropped.
      const lastC = Math.min(maxC, minC + MAX_IMPORT_COLUMNS);
      const height = maxR - minR + 1;
      const width = lastC - minC + 1;
      const matrix: RawCell[][] = Array.from({ length: height }, () =>
        new Array<RawCell>(width).fill(null),
      );
      let dropped = 0;
      for (const { r, c, v } of cells) {
        if (c > lastC) dropped++;
        else matrix[r - minR][c - minC] = v;
      }
      const warnings =
        dropped > 0
          ? [
              `${dropped} sel di sebelah kanan kolom ke-${MAX_IMPORT_COLUMNS + 1} diabaikan (maksimum ${MAX_IMPORT_COLUMNS} kolom).`,
            ]
          : [];
      return { matrix, warnings };
    }
    throw new BadRequestException(
      "File Excel kosong: tidak ada lembar yang berisi data.",
    );
  }

  /**
   * Cells that hold a value, with 0-based coordinates. Uses Object.keys so the
   * cost follows the number of stored cells, never an index range (a dense row
   * holding one cell at column XFD is a sparse array of length 16384).
   */
  private storedCells(ws: XLSX.WorkSheet): { r: number; c: number; v: RawCell }[] {
    const out: { r: number; c: number; v: RawCell }[] = [];
    const push = (r: number, c: number, cell: XLSX.CellObject | undefined) => {
      if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) return;
      const v = this.excelCell(cell);
      if (v !== null && v !== "") out.push({ r, c, v });
    };
    const data = (ws as { "!data"?: XLSX.CellObject[][] })["!data"];
    if (Array.isArray(data)) {
      for (const rk of Object.keys(data)) {
        const row = data[Number(rk)];
        if (!Array.isArray(row)) continue;
        for (const ck of Object.keys(row)) push(Number(rk), Number(ck), row[Number(ck)]);
      }
    } else {
      // Sparse sheet (a parser that ignored `dense`): keys are A1 addresses.
      for (const key of Object.keys(ws)) {
        if (key.startsWith("!")) continue;
        const { r, c } = XLSX.utils.decode_cell(key);
        push(r, c, ws[key] as XLSX.CellObject); // rows past the cap trip the row check
      }
    }
    return out;
  }

  private excelCell(cell: XLSX.CellObject | undefined): RawCell {
    if (cell === undefined || cell.v === undefined || cell.v === null) return null;
    switch (cell.t) {
      case "n": {
        const v = cell.v as number;
        const fmt = typeof cell.z === "string" ? cell.z : "";
        if (fmt !== "" && XLSX.SSF.is_date(fmt)) {
          const d = XLSX.SSF.parse_date_code(v);
          if (d !== null && d !== undefined) {
            const date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
            return d.H || d.M || d.S
              ? `${date} ${String(d.H).padStart(2, "0")}:${String(d.M).padStart(2, "0")}`
              : date;
          }
        }
        if (fmt.includes("%")) return { pct: Number((v * 100).toPrecision(12)) };
        return v;
      }
      case "d": {
        const dt = cell.v as unknown as Date;
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      }
      case "b":
        return cell.v ? "TRUE" : "FALSE";
      case "e":
        return null;
      default:
        return String(cell.v);
    }
  }

  /**
   * Generate visualization suggestions based on column types.
   * `headers` keeps the file's column order (JSON storage does not).
   */
  suggestVisualizations(
    data: any[],
    columnTypes: ColumnTypes,
    headers?: string[],
  ): VisualizationSuggestion[] {
    const suggestions: VisualizationSuggestion[] = [];
    const order = headers ?? Object.keys(columnTypes);
    const cols = order.filter((c) => c in columnTypes);
    const dateColumns = cols.filter((k) => columnTypes[k] === "DATE");
    const numberColumns = cols.filter((k) => columnTypes[k] === "NUMBER");
    const stringColumns = cols.filter((k) => columnTypes[k] === "STRING");
    let colorIdx = 0;
    const color = () => PALETTE[colorIdx++ % PALETTE.length];

    const isPercent = (col: string) =>
      isPercentLikeName(col) ||
      data.some((r) => typeof r?.[col] === "string" && String(r[col]).includes("%"));
    const fractional = (col: string) =>
      data.some((r) => typeof r?.[col] === "number" && !Number.isInteger(r[col]));
    const additive = (col: string) =>
      !isPercent(col) && !isStockLikeName(col);

    // 1. Time series (date + numbers)
    if (dateColumns.length > 0 && numberColumns.length > 0) {
      numberColumns.slice(0, 3).forEach((numCol) => {
        suggestions.push({
          type: "line",
          title: `Tren ${numCol}`,
          xAxis: dateColumns[0],
          yAxis: [numCol],
          color: color(),
        });
      });
    }

    // 2. Category comparison (text + numbers)
    if (stringColumns.length > 0 && numberColumns.length > 0) {
      const stringCol = stringColumns[0];
      const numCol = numberColumns[0];
      suggestions.push({
        type: "bar",
        title: `${numCol} per ${stringCol}`,
        xAxis: stringCol,
        yAxis: [numCol],
        color: color(),
      });
      const pieCol = numberColumns.find(additive);
      if (pieCol !== undefined && data.length >= 3 && data.length <= 12) {
        suggestions.push({
          type: "pie",
          title: `Komposisi ${pieCol} per ${stringCol}`,
          nameKey: stringCol,
          valueKey: pieCol,
          color: color(),
        });
      }
    }

    // 3. Only numbers: first numeric column is the X axis
    if (numberColumns.length >= 2 && dateColumns.length === 0 && stringColumns.length === 0) {
      const xCol = numberColumns[0];
      numberColumns.slice(1, 4).forEach((yCol) => {
        suggestions.push({
          type: "bar",
          title: `${yCol} vs ${xCol}`,
          xAxis: xCol,
          yAxis: [yCol],
          color: color(),
        });
      });
    }

    // 4. Headline numbers. Percentages average, follower-style levels use the
    // latest value, additive counts sum (same rule as portal/PDF).
    numberColumns.slice(0, 4).forEach((numCol) => {
      const precision = fractional(numCol) ? 2 : 0;
      if (isPercent(numCol)) {
        suggestions.push({
          type: "metric_card",
          title: /^(rata|average|avg|mean)\b/i.test(numCol) ? numCol : `Rata-rata ${numCol}`,
          valueKey: numCol,
          aggregation: "average",
          precision: 2,
        });
      } else if (isStockLikeName(numCol)) {
        suggestions.push({
          type: "metric_card",
          title: /terkini|saat ini|terakhir|latest|current/i.test(numCol)
            ? numCol
            : `${numCol} terkini`,
          valueKey: numCol,
          aggregation: "latest",
          precision: 0,
        });
      } else {
        suggestions.push({
          type: "metric_card",
          title: /^(total|jumlah|sum)\b/i.test(numCol) ? numCol : `Total ${numCol}`,
          valueKey: numCol,
          aggregation: "sum",
          precision,
        });
      }
    });

    suggestions.push({ type: "table", title: "Tabel Data" });
    return suggestions;
  }

  /**
   * "Metrics only" sections hold one row of headline numbers; every column
   * becomes a metric card showing that value as it is.
   */
  metricVisualizations(
    headers: string[],
    columnTypes: ColumnTypes,
    rows: any[],
  ): VisualizationSuggestion[] {
    return headers
      .filter((h) => columnTypes[h] === "NUMBER")
      .map((h) => ({
        type: "metric_card" as const,
        title: h,
        valueKey: h,
        aggregation: "latest" as const,
        precision: rows.some((r) => typeof r?.[h] === "number" && !Number.isInteger(r[h]))
          ? 2
          : 0,
      }));
  }
}
