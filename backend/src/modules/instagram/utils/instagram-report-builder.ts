/**
 * Turns synced Instagram data for one report month into report sections in the
 * SAME input shape the manual grid uses (columns + rows of plain cells). The
 * service runs them through UniversalCSVParserService.parseGrid, so the stored
 * section (columnTypes/rawData/rowCount/layout.columnOrder) is identical to a
 * typed or CSV-imported section and the portal / PDF render it unchanged.
 *
 * Column names follow the downloadable "instagram-harian" / "konten-teratas" /
 * "ringkasan-bulanan" templates so the report-insights name heuristics apply
 * (Pengikut = latest value, Pengikut Baru = additive, Engagement Rate = average).
 */

export type GridKind = "date" | "number" | "percent" | "currency" | "text";
export type Cell = string | number | null;

export interface GeneratedSection {
  key: InstagramSectionKey;
  title: string;
  description: string;
  kind: "table" | "metrics";
  columns: { name: string; type: GridKind }[];
  rows: Cell[][];
  /** Chart configs referencing the column names above. */
  visualizations: Record<string, unknown>[];
  /** Per-metric data coverage for the month (headline/daily sections). */
  coverage: MetricCoverage[];
  /** Staff-facing notes for the preview (coverage, omitted metrics, follower history). */
  notes: string[];
}

/**
 * Headline numbers built from fewer than this share of the month's days are
 * left out (a sum over 12 of 30 days is not "the month") unless staff
 * explicitly includes partial data.
 */
export const COVERAGE_THRESHOLD = 0.8;

export interface MetricCoverage {
  /** Column / metric name as shown in the report. */
  column: string;
  /** Days of the month that have a value. */
  days: number;
  /** Completed days of the month (whole month for past months). */
  total: number;
  ratio: number;
  /** True when the metric was left out of the headline numbers. */
  omitted: boolean;
}

export type InstagramSectionKey = "daily" | "top" | "metrics";
export const INSTAGRAM_SECTION_KEYS: InstagramSectionKey[] = ["metrics", "daily", "top"];

export interface DailyInput {
  date: Date | string; // @db.Date (UTC midnight) or "YYYY-MM-DD"
  followersCount: number | null;
  metrics: unknown;
}

export interface MediaInput {
  mediaId: string;
  mediaType: string | null;
  mediaProductType: string | null;
  permalink: string | null;
  caption: string | null;
  timestamp: Date | null;
  metrics: unknown;
}

export interface BuildInput {
  month: number;
  year: number;
  username: string;
  daily: DailyInput[];
  media: MediaInput[];
  /** Top-content rows (default 10). */
  topN?: number;
  /** When the Instagram account was connected (follower history starts there). */
  connectedAt?: Date | null;
  /** Today's WIB date "YYYY-MM-DD" (defaults to now); days up to yesterday count as complete. */
  today?: string;
  /** Keep headline metrics below COVERAGE_THRESHOLD (staff confirmed). */
  includePartial?: boolean;
}

/** total_views / total_views_count include Facebook cross-posts and promoted views. */
export const TOTAL_VIEWS_LABEL = "Tayangan Total (termasuk Facebook & promosi)";

function inMonth(media: MediaInput[], first: string, last: string): MediaInput[] {
  return media.filter((m) => m.timestamp && wibDay(m.timestamp) >= first && wibDay(m.timestamp) <= last);
}

const COLORS = ["#1890ff", "#52c41a", "#faad14", "#eb2f96", "#722ed1", "#13c2c2"];
const MAX_CONTENT_LABEL = 80;

/** Engagement rate definition shown to staff and clients. */
export const ENGAGEMENT_DEFINITION =
  "Engagement rate = total interaksi (suka, komentar, dibagikan, disimpan, balasan) dibagi jangkauan, dikali 100%.";

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round2 = (x: number): number => Math.round(x * 100) / 100;

export function dayKey(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** WIB "YYYY-MM-DD" of an instant. */
export function wibDay(d: Date): string {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function monthBounds(month: number, year: number): { first: string; last: string } {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { first: `${year}-${mm}-01`, last: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

function addDaysStr(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

/** Indonesian short date, e.g. "3 Okt 2026". */
export function idDate(day: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

/** Completed days of the report month: first .. min(last, yesterday WIB). */
export function completedDays(month: number, year: number, today: string): string[] {
  const { first, last } = monthBounds(month, year);
  const yesterday = addDaysStr(today, -1);
  const end = last < yesterday ? last : yesterday;
  const out: string[] = [];
  for (let d = first; d <= end; d = addDaysStr(d, 1)) out.push(d);
  return out;
}

function coverageOf(column: string, days: number, total: number, includePartial: boolean): MetricCoverage {
  const ratio = total > 0 ? Math.round((days / total) * 1000) / 1000 : 0;
  return { column, days, total, ratio, omitted: !includePartial && days > 0 && ratio < COVERAGE_THRESHOLD };
}

const coverageText = (c: MetricCoverage) => `${c.days} dari ${c.total} hari`;

/** Why follower counts may be missing: history only starts when the account was connected. */
function followerHistoryNote(connectedAt: Date | null | undefined, first: string, last: string): string | null {
  if (!connectedAt) return null;
  const since = wibDay(connectedAt);
  if (since > last) {
    return `Jumlah pengikut harian tercatat sejak akun dihubungkan (${idDate(since)}); bulan ini belum memiliki riwayat pengikut.`;
  }
  if (since > first) return `Jumlah pengikut harian tercatat sejak akun dihubungkan (${idDate(since)}).`;
  return null;
}

export function engagementRate(interactions: number | null, reach: number | null): number | null {
  if (interactions === null || reach === null || reach <= 0) return null;
  return round2((interactions / reach) * 100);
}

/** Drop columns (except the first `keep`) whose every row is empty. */
function pruneEmpty(columns: GeneratedSection["columns"], rows: Cell[][], keep = 1) {
  const idx = columns
    .map((_, i) => i)
    .filter((i) => i < keep || rows.some((r) => r[i] !== null && r[i] !== ""));
  return { columns: idx.map((i) => columns[i]), rows: rows.map((r) => idx.map((i) => r[i])) };
}

const pct = (v: number | null): Cell => (v === null ? null : `${v}%`);

function mediaKind(m: MediaInput): string {
  if (m.mediaProductType === "REELS") return "Reels";
  if (m.mediaType === "CAROUSEL_ALBUM") return "Carousel";
  if (m.mediaType === "VIDEO") return "Video";
  if (m.mediaType === "IMAGE") return "Foto";
  return m.mediaProductType ?? m.mediaType ?? "Konten";
}

function contentLabel(m: MediaInput): string {
  const c = (m.caption ?? "").replace(/\s+/g, " ").trim();
  if (c === "") return `(tanpa caption) ${mediaKind(m)}`;
  return c.length > MAX_CONTENT_LABEL ? `${c.slice(0, MAX_CONTENT_LABEL - 1)}…` : c;
}

function mediaInteractions(mt: Record<string, unknown>): number | null {
  const total = n(mt.total_interactions);
  if (total !== null) return total;
  const parts = [n(mt.likes), n(mt.comments), n(mt.shares), n(mt.saved)].filter((x): x is number => x !== null);
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null;
}

export function buildDailySection(input: BuildInput): GeneratedSection {
  const { first, last } = monthBounds(input.month, input.year);
  const today = input.today ?? wibDay(new Date());
  const includePartial = input.includePartial === true;
  const complete = new Set(completedDays(input.month, input.year, today));
  const monthDaily = input.daily
    .map((d) => ({ day: dayKey(d.date), m: rec(d.metrics) }))
    .filter(({ day }) => complete.has(day));
  const daysWith = (pred: (m: Record<string, unknown>) => boolean) => monthDaily.filter(({ m }) => pred(m)).length;
  const total = complete.size;
  const coverage: MetricCoverage[] = [
    coverageOf("Jangkauan", daysWith((m) => n(m.reach) !== null), total, includePartial),
    coverageOf("Tayangan", daysWith((m) => n(m.views) !== null), total, includePartial),
    coverageOf("Interaksi", daysWith((m) => n(m.total_interactions) !== null), total, includePartial),
    coverageOf(
      "Engagement Rate",
      daysWith((m) => engagementRate(n(m.total_interactions), n(m.reach)) !== null),
      total,
      includePartial,
    ),
  ];
  const omitted = new Set(coverage.filter((c) => c.omitted).map((c) => c.column));
  const anyDays = daysWith((m) => Object.values(m).some((v) => n(v) !== null));
  const rows: Cell[][] = input.daily
    .map((d) => ({ day: dayKey(d.date), d }))
    .filter(({ day }) => day >= first && day <= last)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map(({ day, d }) => {
      const m = rec(d.metrics);
      const interactions = n(m.total_interactions);
      const reach = n(m.reach);
      return [
        day,
        n(d.followersCount),
        reach,
        n(m.views),
        interactions,
        n(m.likes),
        n(m.comments),
        n(m.shares),
        n(m.saves),
        n(m.follower_count),
        pct(engagementRate(interactions, reach)),
      ];
    })
    // A day with only a follower snapshot and nothing else is still useful;
    // a day with nothing at all is not.
    .filter((r) => r.slice(1).some((c) => c !== null));
  const pruned = pruneEmpty(
    [
      { name: "Tanggal", type: "date" },
      { name: "Pengikut", type: "number" },
      { name: "Jangkauan", type: "number" },
      { name: "Tayangan", type: "number" },
      { name: "Interaksi", type: "number" },
      { name: "Suka", type: "number" },
      { name: "Komentar", type: "number" },
      { name: "Dibagikan", type: "number" },
      { name: "Disimpan", type: "number" },
      { name: "Pengikut Baru", type: "number" },
      { name: "Engagement Rate", type: "percent" },
    ],
    rows,
  );
  const has = (c: string) => pruned.columns.some((x) => x.name === c);
  const viz: Record<string, unknown>[] = [];
  if (has("Pengikut")) {
    viz.push({ type: "line", title: "Tren Pengikut", xAxis: "Tanggal", yAxis: ["Pengikut"], color: COLORS[0] });
  }
  const reachViews = ["Jangkauan", "Tayangan"].filter(has);
  if (reachViews.length > 0) {
    viz.push({
      type: "line",
      title: reachViews.length === 2 ? "Jangkauan & Tayangan harian" : `${reachViews[0]} harian`,
      xAxis: "Tanggal",
      yAxis: reachViews,
      color: COLORS[1],
      colors: [COLORS[1], COLORS[2]],
    });
  }
  if (has("Interaksi")) {
    viz.push({ type: "bar", title: "Interaksi harian", xAxis: "Tanggal", yAxis: ["Interaksi"], color: COLORS[3] });
  }
  if (has("Pengikut")) {
    viz.push({ type: "metric_card", title: "Pengikut terkini", valueKey: "Pengikut", aggregation: "latest", precision: 0 });
  }
  // Month totals only when the month's data is (nearly) complete.
  for (const c of ["Jangkauan", "Tayangan", "Interaksi"].filter((x) => has(x) && !omitted.has(x))) {
    viz.push({ type: "metric_card", title: `Total ${c}`, valueKey: c, aggregation: "sum", precision: 0 });
  }
  if (has("Engagement Rate") && !omitted.has("Engagement Rate")) {
    viz.push({
      type: "metric_card",
      title: "Rata-rata Engagement Rate",
      valueKey: "Engagement Rate",
      aggregation: "average",
      precision: 2,
    });
  }
  viz.push({ type: "table", title: "Tabel Data" });
  const notes: string[] = [];
  const descParts: string[] = [];
  if (total > 0 && anyDays > 0) {
    const inProgress = today <= last;
    descParts.push(`Data ${anyDays} dari ${total} hari${inProgress ? ` (bulan berjalan, sampai ${idDate([...complete].pop() as string)})` : ""}.`);
    notes.push(`Data ${anyDays} dari ${total} hari.`);
  }
  if (omitted.size > 0) {
    const list = coverage.filter((c) => c.omitted).map((c) => `${c.column} (${coverageText(c)})`).join(", ");
    notes.push(`Kartu total tidak ditampilkan karena data kurang dari ${COVERAGE_THRESHOLD * 100}% hari: ${list}.`);
  }
  const followerNote = followerHistoryNote(input.connectedAt, first, last);
  if (followerNote) {
    notes.push(followerNote);
    descParts.push(followerNote);
  }
  return {
    key: "daily",
    title: "Instagram — Harian",
    description: [
      `Data harian akun @${input.username} dari Instagram (otomatis).`,
      ...descParts,
      `Jangkauan = akun unik yang melihat konten per hari. ${ENGAGEMENT_DEFINITION}`,
    ].join(" "),
    kind: "table",
    columns: pruned.columns,
    rows: pruned.rows,
    visualizations: viz,
    coverage,
    notes,
  };
}

export function buildTopContentSection(input: BuildInput): GeneratedSection {
  const { first, last } = monthBounds(input.month, input.year);
  const topN = input.topN ?? 10;
  const items = inMonth(input.media, first, last)
    .filter((m) => m.mediaProductType !== "STORY")
    .map((m) => {
      const mt = rec(m.metrics);
      return {
        m,
        mt,
        views: n(mt.views),
        totalViews: n(mt.total_views) ?? n(mt.total_views_count),
        interactions: mediaInteractions(mt),
      };
    })
    .sort(
      (a, b) =>
        (b.views ?? -1) - (a.views ?? -1) ||
        (b.totalViews ?? -1) - (a.totalViews ?? -1) ||
        (b.interactions ?? -1) - (a.interactions ?? -1) ||
        (b.m.timestamp?.getTime() ?? 0) - (a.m.timestamp?.getTime() ?? 0),
    )
    .slice(0, topN);
  const rows: Cell[][] = items.map(({ m, mt, views, totalViews, interactions }) => [
    contentLabel(m),
    mediaKind(m),
    m.timestamp ? wibDay(m.timestamp) : null,
    views,
    totalViews,
    n(mt.reach),
    interactions,
    n(mt.likes),
    n(mt.comments),
    n(mt.shares),
    n(mt.saved),
    pct(engagementRate(interactions, n(mt.reach))),
    m.permalink && /^https:\/\//.test(m.permalink) ? m.permalink : null,
  ]);
  const pruned = pruneEmpty(
    [
      { name: "Konten", type: "text" },
      { name: "Jenis", type: "text" },
      { name: "Tanggal Posting", type: "date" },
      { name: "Tayangan", type: "number" },
      { name: TOTAL_VIEWS_LABEL, type: "number" },
      { name: "Jangkauan", type: "number" },
      { name: "Interaksi", type: "number" },
      { name: "Suka", type: "number" },
      { name: "Komentar", type: "number" },
      { name: "Dibagikan", type: "number" },
      { name: "Disimpan", type: "number" },
      { name: "Engagement Rate", type: "percent" },
      { name: "Tautan", type: "text" },
    ],
    rows,
    2,
  );
  const has = (c: string) => pruned.columns.some((x) => x.name === c);
  const rankBy = has("Tayangan") ? "Tayangan" : has("Interaksi") ? "Interaksi" : null;
  const viz: Record<string, unknown>[] = [];
  if (rankBy) {
    viz.push({ type: "bar", title: `${rankBy} per konten`, xAxis: "Konten", yAxis: [rankBy], color: COLORS[4] });
  }
  viz.push({ type: "table", title: "Konten teratas" });
  return {
    key: "top",
    title: "Konten teratas",
    description: `${topN} konten @${input.username} (postingan & Reels) dengan tayangan tertinggi yang diposting bulan ini, diurutkan menurut tayangan organik Instagram lalu interaksi. Angka adalah total sejak konten diposting hingga sinkronisasi terakhir; "${TOTAL_VIEWS_LABEL}" juga menghitung tayangan Facebook dan promosi.`,
    kind: "table",
    columns: pruned.columns,
    rows: pruned.rows,
    visualizations: viz,
    coverage: [],
    notes: [],
  };
}

export function buildMetricsSection(input: BuildInput): GeneratedSection {
  const { first, last } = monthBounds(input.month, input.year);
  const today = input.today ?? wibDay(new Date());
  const includePartial = input.includePartial === true;
  const days = input.daily
    .map((d) => ({ day: dayKey(d.date), d, m: rec(d.metrics) }))
    .filter(({ day }) => day >= first && day <= last)
    .sort((a, b) => a.day.localeCompare(b.day));
  const complete = new Set(completedDays(input.month, input.year, today));
  const total = complete.size;
  // Daily totals: only completed days count (today's partial row is ignored).
  const done = days.filter(({ day }) => complete.has(day));
  const valuesOf = (key: string) => done.map(({ m }) => n(m[key])).filter((x): x is number => x !== null);
  const sum = (key: string): number | null => {
    const vals = valuesOf(key);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const followerDay = [...days].reverse().find(({ d }) => n(d.followersCount) !== null);
  const followers = followerDay ? (followerDay.d.followersCount as number) : null;
  const rates = done
    .map(({ m }) => engagementRate(n(m.total_interactions), n(m.reach)))
    .filter((x): x is number => x !== null);
  const avgRate = rates.length > 0 ? round2(rates.reduce((a, b) => a + b, 0) / rates.length) : null;

  // Coverage per headline metric.
  const coverage: MetricCoverage[] = [
    coverageOf("Pengikut Baru", valuesOf("follower_count").length, total, includePartial),
    coverageOf("Total Jangkauan", valuesOf("reach").length, total, includePartial),
    coverageOf("Total Tayangan", valuesOf("views").length, total, includePartial),
    coverageOf("Total Interaksi", valuesOf("total_interactions").length, total, includePartial),
    coverageOf("Engagement Rate", rates.length, total, includePartial),
  ];
  // "Pengikut" is a snapshot: good when the last one is within 2 days of the
  // month end (or of today for the running month).
  const snapshotEnd = last < today ? last : today;
  const followersStale = followerDay !== undefined && followerDay.day < addDaysStr(snapshotEnd, -2);
  const snapshotDays = days.filter(({ d }) => n(d.followersCount) !== null).length;
  coverage.unshift({
    column: "Pengikut",
    days: snapshotDays,
    total,
    ratio: total > 0 ? Math.round((Math.min(snapshotDays, total) / total) * 1000) / 1000 : 0,
    omitted: followersStale && !includePartial,
  });
  const omitted = new Set(coverage.filter((c) => c.omitted).map((c) => c.column));
  const keep = <T>(column: string, v: T): T | null => (omitted.has(column) ? null : v);
  const monthMedia = inMonth(input.media, first, last);
  const posts = monthMedia.filter((m) => m.mediaProductType !== "STORY").length;
  const stories = monthMedia.filter((m) => m.mediaProductType === "STORY").length;
  const pruned = pruneEmpty(
    [
      { name: "Pengikut", type: "number" },
      { name: "Pengikut Baru", type: "number" },
      { name: "Total Jangkauan", type: "number" },
      { name: "Total Tayangan", type: "number" },
      { name: "Total Interaksi", type: "number" },
      { name: "Engagement Rate", type: "percent" },
      { name: "Jumlah Postingan", type: "number" },
      { name: "Jumlah Story", type: "number" },
    ],
    [
      [
        keep("Pengikut", followers),
        keep("Pengikut Baru", sum("follower_count")),
        keep("Total Jangkauan", sum("reach")),
        keep("Total Tayangan", sum("views")),
        keep("Total Interaksi", sum("total_interactions")),
        keep("Engagement Rate", pct(avgRate)),
        posts,
        stories > 0 ? stories : null,
      ],
    ],
    0,
  );
  const titles: Record<string, string> = {
    // Capitalised: the portal drops a leading "Total" on latest-value cards.
    Pengikut: "Pengikut Akhir Bulan",
    "Pengikut Baru": "Pengikut Baru",
    "Total Jangkauan": "Total Jangkauan",
    "Total Tayangan": "Total Tayangan",
    "Total Interaksi": "Total Interaksi",
    "Engagement Rate": "Rata-rata Engagement Rate",
    "Jumlah Postingan": "Jumlah Postingan & Reels",
    "Jumlah Story": "Jumlah Story",
  };
  if (followersStale && followerDay && !omitted.has("Pengikut")) {
    titles.Pengikut = `Pengikut per ${idDate(followerDay.day)}`;
  }
  const present = new Set(pruned.columns.map((c) => c.name));
  const partialShown = coverage.filter((c) => c.column !== "Pengikut" && present.has(c.column) && c.total > 0 && c.days < c.total);
  const omittedList = coverage.filter((c) => c.omitted);

  const descParts: string[] = [];
  const notes: string[] = [];
  if (total > 0 && done.length > 0) {
    const inProgress = today <= last;
    const daysWithData = done.filter(({ m }) => Object.values(m).some((v) => n(v) !== null)).length;
    const line = `Data ${daysWithData} dari ${total} hari${inProgress ? " (bulan berjalan)" : ""}.`;
    descParts.push(line);
    notes.push(line);
  }
  if (partialShown.length > 0) {
    const line = `Dihitung dari data tidak lengkap: ${partialShown.map((c) => `${c.column} ${coverageText(c)}`).join(", ")}.`;
    descParts.push(line);
    notes.push(line);
  }
  if (omittedList.length > 0) {
    const names = omittedList.map((c) => (c.column === "Pengikut" ? "Pengikut Akhir Bulan" : c.column));
    descParts.push(`Tidak ditampilkan karena data bulan ini tidak lengkap: ${names.join(", ")}.`);
    notes.push(
      `Tidak ditampilkan (data kurang dari ${COVERAGE_THRESHOLD * 100}% hari): ${omittedList
        .map((c) =>
          c.column === "Pengikut"
            ? `Pengikut Akhir Bulan (data terakhir ${followerDay ? idDate(followerDay.day) : "-"})`
            : `${c.column} (${coverageText(c)})`,
        )
        .join(", ")}.`,
    );
  }
  if (coverage.some((c) => c.column === "Pengikut Baru" && c.days < c.total && (c.omitted || present.has(c.column)))) {
    notes.push("Instagram hanya menyediakan data pengikut baru harian untuk 30 hari terakhir; bulan yang lebih lama bisa tidak lengkap.");
  }
  const followerNote = followers === null ? followerHistoryNote(input.connectedAt, first, last) : null;
  if (followerNote) {
    descParts.push(followerNote);
    notes.push(followerNote);
  }
  return {
    key: "metrics",
    title: "Instagram — Ringkasan",
    description: [
      `Angka utama @${input.username} bulan ini.`,
      ...descParts,
      `Total jangkauan = jumlah jangkauan harian (akun yang sama bisa terhitung di beberapa hari). Rata-rata engagement rate = rata-rata engagement rate harian. ${ENGAGEMENT_DEFINITION}`,
    ].join(" "),
    kind: "metrics",
    columns: pruned.columns,
    rows: pruned.columns.length > 0 ? pruned.rows : [],
    visualizations: pruned.columns.map((c) => ({
      type: "metric_card",
      title: titles[c.name] ?? c.name,
      valueKey: c.name,
      aggregation: "latest",
      precision: c.type === "percent" ? 2 : 0,
    })),
    coverage,
    notes,
  };
}

export function buildInstagramSections(input: BuildInput): GeneratedSection[] {
  return [buildMetricsSection(input), buildDailySection(input), buildTopContentSection(input)];
}
