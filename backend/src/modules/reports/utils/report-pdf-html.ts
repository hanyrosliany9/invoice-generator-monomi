/**
 * Self-contained, print-friendly HTML (A4, light theme) for a social media
 * report. Charts are inline SVG generated here, so rendering needs no scripts,
 * fonts or network access (the production container has no internet guarantee).
 *
 * Content mirrors the client-portal report view: cover, "Ringkasan" KPI tiles,
 * then every section with its description, charts, a one-line takeaway per
 * chart and a compact data table.
 */
import { escapeHtml as esc } from "../../pdf/templates/escape-html.util";
import {
  buildKpis,
  describe,
  fmtCell,
  fmtCompact,
  fmtValue,
  hasPlottableData,
  InsightSection,
  isDateColumn,
  Kpi,
  kpiNoteText,
  LOCALE,
  metricKpi,
  pieSlices,
  prepareViz,
  Prepared,
  prettyLabel,
  rowsOf,
  Series,
  toNum,
  VizConfig,
  vizOf,
} from "./report-insights";

export interface PdfReportInput {
  title: string;
  description?: string | null;
  month: number;
  year: number;
  clientName?: string | null;
  projectNumber?: string | null;
  projectName?: string | null;
  sections: InsightSection[];
  generatedAt?: Date;
}

/** Colour-blind-friendly palette, dark enough for white paper. */
export const PDF_PALETTE = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#DB2777",
  "#7C3AED",
  "#EA580C",
] as const;
const OTHERS = "#9CA3AF";
const INK = "#111827";
const MUTED = "#6B7280";
const GRID = "#E5E7EB";

const W = 674; // content width of an A4 page with 20mm side margins (px)
const MAX_TABLE_ROWS = 31;
const MAX_TABLE_COLS = 9;

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString();
const trunc = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function periodLabel(month: number, year: number): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

/* ------------------------------------------------------------------ */
/*  Scales                                                             */
/* ------------------------------------------------------------------ */

/** "Nice" axis for [lo, hi] with about `count` intervals. */
export function niceScale(lo: number, hi: number, count = 4): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, ticks: [0, 1] };
  if (hi === lo) {
    const pad = Math.max(1, Math.abs(hi) * 0.1);
    lo -= pad;
    hi += pad;
  }
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { min, max, ticks };
}

const allValues = (prep: Prepared): number[] =>
  prep.series.flatMap((s) => prep.points.map((p) => p[s.id]).filter((v): v is number => typeof v === "number"));

/** Whole numbers read better than "4,6 rb" until values get big. */
const smallScale = (prep: Prepared): boolean => allValues(prep).every((v) => Math.abs(v) < 100000);

/* ------------------------------------------------------------------ */
/*  Charts (inline SVG)                                                */
/* ------------------------------------------------------------------ */

function legend(series: Series[]): string {
  if (series.length < 2) return "";
  return `<ul class="legend">${series
    .map(
      (s, i) =>
        `<li><span class="sw" style="background:${PDF_PALETTE[i % PDF_PALETTE.length]}"></span>${esc(s.label)}</li>`,
    )
    .join("")}</ul>`;
}

function timeChart(viz: VizConfig, prep: Prepared): string {
  const { series, points } = prep;
  const unit = series[0].unit;
  const dec = series[0].dec;
  const small = smallScale(prep);
  const H = 210;
  const vals = allValues(prep);
  const zero = viz.type === "area";
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const sc = niceScale(zero ? 0 : lo, hi, 4);
  const fmtTick = (n: number): string => fmtCompact(n, unit, small);
  const labelW = Math.max(...sc.ticks.map((t) => fmtTick(t).length)) * 6.2 + 12;
  const padL = Math.max(34, labelW);
  const padR = 36;
  const padT = 24;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = points.length;
  const xAt = (i: number): number => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yAt = (v: number): number => padT + ih - ((v - sc.min) / (sc.max - sc.min || 1)) * ih;

  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">`;
  sc.ticks.forEach((t) => {
    const y = yAt(t);
    out += `<line x1="${padL}" y1="${f1(y)}" x2="${W - padR + 8}" y2="${f1(y)}" stroke="${GRID}" stroke-width="1"${t === sc.min ? "" : ' stroke-dasharray="2 3"'}/>`;
    out += `<text x="${padL - 6}" y="${f1(y + 3.5)}" text-anchor="end" font-size="10" fill="${MUTED}">${esc(fmtTick(t))}</text>`;
  });
  // x labels
  const few = n <= 8;
  const maxLabels = Math.max(2, Math.floor(iw / 62));
  const idxs = few
    ? points.map((_, i) => i)
    : Array.from({ length: Math.min(maxLabels, n) }, (_, k) => Math.round((k * (n - 1)) / (Math.min(maxLabels, n) - 1)));
  Array.from(new Set(idxs)).forEach((i) => {
    out += `<text x="${f1(xAt(i))}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${MUTED}">${esc(trunc(points[i].x, 12))}</text>`;
  });

  const gid = `g${Math.abs(hash(viz.title ?? "") + n)}`;
  series.forEach((s, si) => {
    const color = PDF_PALETTE[si % PDF_PALETTE.length];
    const pts = points
      .map((p, i) => ({ i, v: p[s.id] }))
      .filter((p): p is { i: number; v: number } => typeof p.v === "number");
    if (pts.length === 0) return;
    const line = pts.map((p) => `${f1(xAt(p.i))},${f1(yAt(p.v))}`).join(" ");
    if (series.length === 1) {
      const base = yAt(Math.max(sc.min, Math.min(0, sc.max)));
      out += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
      out += `<polygon points="${f1(xAt(pts[0].i))},${f1(base)} ${line} ${f1(xAt(pts[pts.length - 1].i))},${f1(base)}" fill="url(#${gid})"/>`;
    }
    out += `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p, k) => {
      const isLast = k === pts.length - 1;
      if (!isLast && !few) return;
      out += `<circle cx="${f1(xAt(p.i))}" cy="${f1(yAt(p.v))}" r="${isLast ? 4 : 2.8}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
      if (isLast && series.length === 1) {
        out += `<text x="${f1(xAt(p.i))}" y="${f1(yAt(p.v) - 9)}" text-anchor="end" font-size="11.5" font-weight="700" fill="${INK}">${esc(fmtValue(p.v, unit, dec))}</text>`;
      }
    });
  });
  return `${out}</svg>`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100000;
}

function barsChart(prep: Prepared): string {
  const { series, points, isDate } = prep;
  const unit = series[0].unit;
  const small = smallScale(prep);
  const single = series.length === 1;
  const maxLabel = Math.max(...points.map((p) => p.x.length));
  const horizontal = !isDate && (points.length > 5 || (points.length > 3 && maxLabel > 6) || maxLabel > 10);
  const vals = allValues(prep);
  const hi = Math.max(0, ...vals);
  const labelFmt = (v: number): string => fmtCompact(v, unit, small);
  let topIdx = -1;
  if (single) {
    let best = -Infinity;
    points.forEach((p, i) => {
      const v = p[series[0].id];
      if (typeof v === "number" && v > best) {
        best = v;
        topIdx = i;
      }
    });
  }

  if (horizontal) {
    const rowH = single ? 26 : series.length * 14 + 12;
    const H = Math.max(120, points.length * rowH + 12);
    const labelW = Math.min(150, Math.max(70, maxLabel * 6.2));
    const padR = 54;
    const iw = W - labelW - padR;
    const scale = hi === 0 ? 1 : iw / hi;
    let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">`;
    points.forEach((p, i) => {
      const y0 = 6 + i * rowH;
      out += `<text x="${labelW - 8}" y="${f1(y0 + rowH / 2 + 3.5)}" text-anchor="end" font-size="10.5" fill="${INK}">${esc(trunc(p.full, 22))}</text>`;
      const bh = single ? 15 : (rowH - 10) / series.length - 1;
      series.forEach((s, si) => {
        const v = p[s.id];
        if (typeof v !== "number") return;
        const w = Math.max(1, v * scale);
        const y = single ? y0 + (rowH - bh) / 2 : y0 + 4 + si * (bh + 1);
        const color = PDF_PALETTE[si % PDF_PALETTE.length];
        const op = single ? (i === topIdx ? 1 : 0.6) : 1;
        out += `<rect x="${labelW}" y="${f1(y)}" width="${f1(w)}" height="${f1(bh)}" rx="3" fill="${color}" fill-opacity="${op}"/>`;
        if (single || points.length * series.length <= 24) {
          out += `<text x="${f1(labelW + w + 5)}" y="${f1(y + bh / 2 + 3.5)}" font-size="10" fill="${INK}">${esc(labelFmt(v))}</text>`;
        }
      });
    });
    return `${out}</svg>`;
  }

  const H = 220;
  const sc = niceScale(0, hi, 4);
  const labelWd = Math.max(...sc.ticks.map((t) => labelFmt(t).length)) * 6.2 + 12;
  const padL = Math.max(34, labelWd);
  const padR = 10;
  const padT = 22;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const yAt = (v: number): number => padT + ih - (v / (sc.max || 1)) * ih;
  const slot = iw / points.length;
  const group = Math.min(52 * series.length, slot * 0.72);
  const bw = group / series.length;
  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">`;
  sc.ticks.forEach((t) => {
    const y = yAt(t);
    out += `<line x1="${padL}" y1="${f1(y)}" x2="${W - padR}" y2="${f1(y)}" stroke="${GRID}" stroke-width="1"${t === 0 ? "" : ' stroke-dasharray="2 3"'}/>`;
    out += `<text x="${padL - 6}" y="${f1(y + 3.5)}" text-anchor="end" font-size="10" fill="${MUTED}">${esc(labelFmt(t))}</text>`;
  });
  points.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    out += `<text x="${f1(cx)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${MUTED}">${esc(trunc(p.x, 12))}</text>`;
    series.forEach((s, si) => {
      const v = p[s.id];
      if (typeof v !== "number") return;
      const x = cx - group / 2 + si * bw + 1;
      const y = yAt(Math.max(0, v));
      const h = Math.max(1, yAt(0) - y);
      const color = PDF_PALETTE[si % PDF_PALETTE.length];
      const op = single ? (i === topIdx ? 1 : 0.62) : 1;
      out += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(2, bw - 2))}" height="${f1(h)}" rx="3" fill="${color}" fill-opacity="${op}"/>`;
      if (single && points.length <= 8) {
        out += `<text x="${f1(x + (bw - 2) / 2)}" y="${f1(y - 5)}" text-anchor="middle" font-size="10" font-weight="600" fill="${INK}">${esc(labelFmt(v))}</text>`;
      }
    });
  });
  return `${out}</svg>`;
}

function donutChart(prep: Prepared): string {
  const s = prep.series[0];
  const sl = pieSlices(prep);
  if (sl.list.length === 0) return "";
  const R = 62;
  const SW = 26;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = sl.list
    .map((p, i) => {
      const len = (p.pct / 100) * C;
      const gap = sl.list.length > 1 ? 1.5 : 0;
      const color = p.other ? OTHERS : PDF_PALETTE[i % PDF_PALETTE.length];
      const el = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${color}" stroke-width="${SW}" stroke-dasharray="${f1(Math.max(0, len - gap))} ${f1(C - Math.max(0, len - gap))}" stroke-dashoffset="${f1(-acc)}" transform="rotate(-90 90 90)"/>`;
      acc += len;
      return el;
    })
    .join("");
  const svg = `<svg viewBox="0 0 180 180" width="170" height="170" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">${arcs}<text x="90" y="84" text-anchor="middle" font-size="10" fill="${MUTED}">Total</text><text x="90" y="104" text-anchor="middle" font-size="17" font-weight="700" fill="${INK}">${esc(fmtCompact(sl.total, s.unit, sl.total < 100000))}</text></svg>`;
  const rows = sl.list
    .map((p, i) => {
      const color = p.other ? OTHERS : PDF_PALETTE[i % PDF_PALETTE.length];
      const pct = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(p.pct);
      return `<li><span class="sw" style="background:${color}"></span><span class="nm">${esc(p.name)}</span><span class="v">${esc(fmtValue(p.value, s.unit, s.dec))}</span><span class="pc">${pct}%</span></li>`;
    })
    .join("");
  return `<div class="donut">${svg}<ul class="slices">${rows}</ul></div>`;
}

/* ------------------------------------------------------------------ */
/*  Blocks                                                             */
/* ------------------------------------------------------------------ */

function kpiTile(k: Kpi): string {
  let delta = "";
  if (k.delta !== undefined) {
    const d = k.delta;
    const dir = Math.abs(d.change) < 0.05 ? 0 : d.change > 0 ? 1 : -1;
    const abs = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(Math.abs(d.change));
    delta = `<div class="delta ${dir > 0 ? "up" : dir < 0 ? "down" : "flat"}">${dir > 0 ? "▲" : dir < 0 ? "▼" : "–"} ${esc(d.points ? `${abs} poin` : `${abs}%`)} <span>dibanding ${esc(d.since)}</span></div>`;
  }
  return `<div class="tile"><div class="tl">${esc(k.label)}</div><div class="tv">${esc(fmtValue(k.value, k.unit, k.dec))}</div><div class="tn">${esc(kpiNoteText(k))}</div>${delta}</div>`;
}

function dataTable(section: InsightSection): string {
  const rows = rowsOf(section);
  if (rows.length === 0) return "";
  const all = Object.keys(rows[0]);
  const isNum = (c: string): boolean => {
    const vals = rows
      .slice(0, 30)
      .map((r) => r[c])
      .filter((v) => v !== "" && v !== null && v !== undefined);
    return vals.length > 0 && !isDateColumn(section, c) && vals.every((v) => toNum(v) !== null);
  };
  const ordered = [...all.filter((c) => !isNum(c)), ...all.filter(isNum)].slice(0, MAX_TABLE_COLS);
  const meta = ordered.map((c) => ({ c, date: isDateColumn(section, c), numeric: isNum(c) }));
  const shown = rows.slice(0, MAX_TABLE_ROWS);
  const head = meta
    .map(({ c, numeric }) => `<th class="${numeric ? "r" : ""}">${esc(prettyLabel(c))}</th>`)
    .join("");
  const body = shown
    .map(
      (r) =>
        `<tr>${meta
          .map(({ c, date, numeric }) => `<td class="${numeric ? "r" : ""}">${esc(fmtCell(r[c], c, rows, c, date))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const notes: string[] = [];
  if (rows.length > shown.length) notes.push(`Menampilkan ${shown.length} dari ${rows.length} baris.`);
  if (all.length > ordered.length) notes.push(`${ordered.length} dari ${all.length} kolom ditampilkan.`);
  return `<table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${
    notes.length > 0 ? `<p class="tnote">${esc(notes.join(" "))}</p>` : ""
  }`;
}

function figure(section: InsightSection, viz: VizConfig): string {
  const title = typeof viz.title === "string" ? viz.title : "";
  const cap = title !== "" ? `<div class="fc">${esc(title)}</div>` : "";
  if (viz.type === "table") {
    return `<figure class="fig tablefig">${cap}${dataTable(section)}</figure>`;
  }
  const prep = prepareViz(section, viz);
  if (prep.points.length === 0 || prep.series.length === 0) {
    return `<figure class="fig">${cap}<p class="empty">Belum ada data untuk ditampilkan.</p></figure>`;
  }
  const lines = describe(viz, prep).slice(0, 2);
  const chart =
    viz.type === "pie" ? donutChart(prep) : viz.type === "bar" ? barsChart(prep) : timeChart(viz, prep);
  const take =
    lines.length > 0
      ? `<p class="take"><b>${esc(lines[0])}</b>${lines[1] !== undefined ? ` <span>${esc(lines[1])}</span>` : ""}</p>`
      : "";
  return `<figure class="fig">${cap}${viz.type === "pie" ? "" : legend(prep.series)}${chart}${take}</figure>`;
}

function sectionBlock(section: InsightSection, index: number): string {
  const vizzes = vizOf(section);
  const tiles = vizzes
    .filter((v) => v.type === "metric_card")
    .map((v) => metricKpi(section, v))
    .filter((k): k is Kpi => k !== null);
  // Skip charts whose plotted columns are empty, matching the portal/preview.
  const charts = vizzes.filter(
    (v) => v.type !== "metric_card" && hasPlottableData(v, rowsOf(section)),
  );
  const hasData = rowsOf(section).length > 0;
  const hasTableViz = charts.some((v) => v.type === "table");
  const desc =
    typeof section.description === "string" && section.description !== ""
      ? `<p class="sd">${esc(section.description)}</p>`
      : "";
  const tileHtml = tiles.length > 0 ? `<div class="tiles t${Math.min(3, tiles.length)}">${tiles.map(kpiTile).join("")}</div>` : "";
  const figs = charts.map((v) => figure(section, v)).join("");
  const fallback =
    charts.length === 0 && tiles.length === 0 && hasData
      ? `<figure class="fig tablefig">${dataTable(section)}</figure>`
      : "";
  // Compact data appendix for chart-only sections (Lihat data in the portal).
  const appendix =
    hasData && !hasTableViz && charts.length > 0
      ? `<figure class="fig tablefig"><div class="fc">Data</div>${dataTable(section)}</figure>`
      : "";
  return `<section class="sec"><header class="sh"><span class="num">${index + 1}</span><div><h2>${esc(section.title)}</h2>${desc}</div></header>${tileHtml}${figs}${fallback}${appendix}</section>`;
}

/* ------------------------------------------------------------------ */
/*  Document                                                           */
/* ------------------------------------------------------------------ */

const CSS = `
@page { size: A4; margin: 16mm 20mm 18mm 20mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "Helvetica Neue", Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif; color: ${INK}; font-size: 12px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3, p, ul, figure { margin: 0; padding: 0; }
.cover { height: 255mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; break-after: page; }
.brand { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: ${MUTED}; font-weight: 700; }
.cover .mid { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.eyebrow { display: inline-block; font-size: 11px; font-weight: 600; color: #374151; background: #F3F4F6; border-radius: 999px; padding: 4px 12px; margin-bottom: 18px; }
.cover h1 { font-size: 36px; line-height: 1.12; letter-spacing: -.02em; font-weight: 800; max-width: 150mm; }
.cover .desc { margin-top: 16px; font-size: 14px; color: #374151; max-width: 140mm; line-height: 1.55; }
.meta { border-top: 2px solid ${INK}; padding-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
.meta .k { font-size: 9.5px; text-transform: uppercase; letter-spacing: .14em; color: ${MUTED}; margin-bottom: 2px; }
.meta .v { font-size: 13px; font-weight: 600; }
h2.sum { font-size: 22px; letter-spacing: -.01em; margin-bottom: 2px; }
.hint { color: ${MUTED}; margin-bottom: 12px; font-size: 12px; }
.summary { margin-bottom: 22px; }
.tiles { display: grid; gap: 10px; margin-bottom: 14px; grid-template-columns: repeat(3, 1fr); }
.tiles.t1 { grid-template-columns: minmax(0, 1fr); max-width: 220px; }
.tiles.t2 { grid-template-columns: repeat(2, 1fr); }
.tile { border: 1px solid ${GRID}; background: #F9FAFB; border-radius: 10px; padding: 12px 14px; break-inside: avoid; }
.tl { font-size: 10.5px; color: #4B5563; line-height: 1.3; }
.tv { margin-top: 5px; font-size: 24px; font-weight: 800; letter-spacing: -.02em; line-height: 1.05; overflow-wrap: anywhere; }
.tn { margin-top: 6px; font-size: 9.5px; color: ${MUTED}; }
.delta { margin-top: 6px; font-size: 10px; font-weight: 700; }
.delta span { font-weight: 400; color: ${MUTED}; }
.delta.up { color: #047857; } .delta.down { color: #B91C1C; } .delta.flat { color: #4B5563; }
.sec { margin-bottom: 26px; }
.sh { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; break-after: avoid; page-break-after: avoid; }
.num { flex: none; width: 24px; height: 24px; border-radius: 50%; background: ${INK}; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
.sec h2 { font-size: 17px; line-height: 1.25; letter-spacing: -.01em; }
.sd { margin-top: 3px; color: #4B5563; font-size: 12px; }
.fig { border: 1px solid ${GRID}; border-radius: 10px; padding: 12px 14px 10px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
.fig.tablefig { break-inside: auto; page-break-inside: auto; }
.fc { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
.fig svg { display: block; width: 100%; height: auto; }
.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 4px 14px; margin-bottom: 6px; font-size: 10.5px; color: #374151; }
.legend .sw, .slices .sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.take { margin-top: 8px; padding-top: 8px; border-top: 1px solid ${GRID}; font-size: 11.5px; line-height: 1.5; color: #374151; }
.take b { color: ${INK}; font-weight: 700; }
.empty { color: ${MUTED}; text-align: center; padding: 22px 0; font-size: 11px; }
.donut { display: flex; align-items: center; gap: 24px; }
.donut svg { width: 170px; flex: none; }
.slices { list-style: none; flex: 1; font-size: 11.5px; }
.slices li { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.slices .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #374151; }
.slices .v { color: ${MUTED}; font-variant-numeric: tabular-nums; }
.slices .pc { width: 46px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
table.data { width: 100%; border-collapse: collapse; font-size: 10px; }
table.data th { text-align: left; font-weight: 600; color: #4B5563; border-bottom: 1.5px solid #9CA3AF; padding: 5px 6px; white-space: nowrap; }
table.data td { padding: 4px 6px; border-bottom: 1px solid #F0F1F3; font-variant-numeric: tabular-nums; }
table.data thead { display: table-header-group; }
table.data tr { break-inside: avoid; page-break-inside: avoid; }
table.data .r { text-align: right; }
.tnote { margin-top: 6px; font-size: 9.5px; color: ${MUTED}; }
.empty-report { padding: 40px 0; text-align: center; color: ${MUTED}; }
`;

export function buildReportHtml(input: PdfReportInput): string {
  const sections = input.sections;
  const kpis = buildKpis(sections);
  const generated = new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(input.generatedAt ?? new Date());
  const project = [input.projectNumber, input.projectName].filter((x) => typeof x === "string" && x !== "").join(" · ");
  const metaCell = (k: string, v?: string | null): string =>
    v !== undefined && v !== null && v !== "" ? `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>` : "";

  const cover = `<div class="cover">
  <div class="brand">Monomi · Laporan Media Sosial</div>
  <div class="mid">
    <span class="eyebrow">${esc(periodLabel(input.month, input.year))}</span>
    <h1>${esc(input.title)}</h1>
    ${input.description ? `<p class="desc">${esc(input.description)}</p>` : ""}
  </div>
  <div class="meta">
    ${metaCell("Klien", input.clientName)}
    ${metaCell("Proyek", project)}
    ${metaCell("Periode", periodLabel(input.month, input.year))}
    ${metaCell("Dibuat", generated)}
  </div>
</div>`;

  const summary =
    kpis.length > 0
      ? `<div class="summary"><h2 class="sum">Ringkasan</h2><p class="hint">Angka-angka utama dari laporan ini.</p><div class="tiles">${kpis.map(kpiTile).join("")}</div></div>`
      : "";
  const body =
    sections.length > 0
      ? sections.map((s, i) => sectionBlock(s, i)).join("\n")
      : `<p class="empty-report">Laporan ini belum memiliki isi.</p>`;

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${esc(input.title)}</title><style>${CSS}</style></head><body>${cover}${summary}${body}</body></html>`;
}
