import { BadRequestException, ConflictException } from "@nestjs/common";
import { UniversalCSVParserService } from "../reports/services/csv-parser.service";
import { SocialMediaReportService } from "../reports/services/social-media-report.service";
import { InstagramReportService } from "./instagram-report.service";
import {
  buildDailySection,
  buildInstagramSections,
  buildMetricsSection,
  buildTopContentSection,
  COVERAGE_THRESHOLD,
  engagementRate,
  TOTAL_VIEWS_LABEL,
} from "./utils/instagram-report-builder";
import { FakePrisma } from "./testing/instagram-fakes.helper-spec";

const day = (d: string) => new Date(`${d}T00:00:00Z`);

const daily = [
  { date: day("2026-08-31"), followersCount: 990, metrics: { reach: 1, views: 1 } }, // previous month
  { date: day("2026-09-01"), followersCount: 1000, metrics: { reach: 200, views: 500, total_interactions: 20, likes: 15, comments: 3, shares: 1, saves: 1, follower_count: 4 } },
  { date: day("2026-09-02"), followersCount: null, metrics: { reach: 100, views: 300, total_interactions: 5, likes: 4, comments: 1, follower_count: 2 } },
  { date: day("2026-09-03"), followersCount: 1010, metrics: {} },
];
const media = [
  { mediaId: "a", mediaType: "VIDEO", mediaProductType: "REELS", permalink: "https://www.instagram.com/reel/a/", caption: "Reel peluncuran\nmenu baru", timestamp: new Date("2026-09-04T03:00:00Z"), metrics: { views: 5000, reach: 3000, total_interactions: 300, likes: 250, comments: 20, shares: 10, saved: 20, total_views: 6200 } },
  { mediaId: "b", mediaType: "CAROUSEL_ALBUM", mediaProductType: "FEED", permalink: "https://www.instagram.com/p/b/", caption: null, timestamp: new Date("2026-09-10T03:00:00Z"), metrics: { views: 800, reach: 600, likes: 50, comments: 5 } },
  { mediaId: "c", mediaType: "IMAGE", mediaProductType: "FEED", permalink: "javascript:alert(1)", caption: "Akhir bulan", timestamp: new Date("2026-09-30T18:00:00Z"), metrics: { views: 9999 } }, // 1 Oct WIB
  { mediaId: "d", mediaType: "IMAGE", mediaProductType: "FEED", permalink: "javascript:alert(1)", caption: "Promo", timestamp: new Date("2026-09-15T03:00:00Z"), metrics: { views: 10 } },
  { mediaId: "s", mediaType: "IMAGE", mediaProductType: "STORY", permalink: null, caption: null, timestamp: new Date("2026-09-12T03:00:00Z"), metrics: { reach: 70 } },
];
const input = { month: 9, year: 2026, username: "brandco", daily, media, today: "2026-10-03" };

/** Every day of September 2026 except the listed ones, with full metrics. */
function fullSeptember(skip: number[] = []) {
  const out = [];
  for (let d = 1; d <= 30; d++) {
    if (skip.includes(d)) continue;
    const date = day(`2026-09-${String(d).padStart(2, "0")}`);
    out.push({ date, followersCount: 1000 + d, metrics: { reach: 100, views: 200, total_interactions: 10, follower_count: 1 } });
  }
  return out;
}
const metricsRow = (s: ReturnType<typeof buildMetricsSection>) => Object.fromEntries(s.columns.map((c, i) => [c.name, s.rows[0][i]]));

describe("instagram report builder", () => {
  const parser = new UniversalCSVParserService();

  it("daily table: month days only, WIB dates, empty columns dropped, ER per day", () => {
    const s = buildDailySection(input);
    expect(s.columns.map((c) => c.name)).toEqual([
      "Tanggal", "Pengikut", "Jangkauan", "Tayangan", "Interaksi", "Suka", "Komentar", "Dibagikan", "Disimpan", "Pengikut Baru", "Engagement Rate",
    ]);
    expect(s.rows.map((r) => r[0])).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(s.rows[0][10]).toBe("10%");
    expect(s.rows[1][1]).toBeNull();
    expect(s.visualizations.map((v) => v.type)).toEqual(expect.arrayContaining(["line", "bar", "metric_card", "table"]));
    expect(engagementRate(5, 0)).toBeNull();
  });

  it("top content: organic views first, stories excluded, unsafe permalinks dropped, total views labelled", () => {
    const s = buildTopContentSection(input);
    expect(s.rows.map((r) => r[0])).toEqual(["Reel peluncuran menu baru", "(tanpa caption) Carousel", "Promo"]);
    const cols = s.columns.map((c) => c.name);
    expect(cols).toContain(TOTAL_VIEWS_LABEL);
    expect(cols[cols.length - 1]).toBe("Tautan");
    expect(s.rows[0][cols.indexOf("Tautan")]).toBe("https://www.instagram.com/reel/a/");
    expect(s.rows[0][cols.indexOf("Jenis")]).toBe("Reels");
    expect(s.rows[2][cols.indexOf("Tautan")]).toBeNull();
  });

  it("headline metrics: followers at month end, sums, average daily ER, post and story counts (partial data included on request)", () => {
    const s = buildMetricsSection({ ...input, includePartial: true });
    const row = metricsRow(s);
    expect(row).toEqual({
      Pengikut: 1010,
      "Pengikut Baru": 6,
      "Total Jangkauan": 300,
      "Total Tayangan": 800,
      "Total Interaksi": 25,
      "Engagement Rate": "7.5%", // avg(10%, 5%)
      "Jumlah Postingan": 3,
      "Jumlah Story": 1,
    });
    expect(s.description).toMatch(/Engagement rate = total interaksi/);
    // Included, but labelled as partial.
    expect(s.description).toMatch(/Dihitung dari data tidak lengkap: Pengikut Baru 2 dari 30 hari/);
    expect(s.visualizations.find((v) => v.valueKey === "Pengikut")!.title).toBe("Pengikut per 3 Sep 2026");
  });

  it("headline metrics below the coverage threshold are omitted by default, with a note", () => {
    const s = buildMetricsSection(input);
    const row = metricsRow(s);
    expect(row).toEqual({ "Jumlah Postingan": 3, "Jumlah Story": 1 });
    expect(s.coverage.find((c) => c.column === "Pengikut Baru")).toMatchObject({ days: 2, total: 30, omitted: true });
    expect(s.coverage.find((c) => c.column === "Pengikut")).toMatchObject({ omitted: true });
    expect(s.description).toMatch(/Data 2 dari 30 hari\./);
    expect(s.description).toMatch(/Tidak ditampilkan karena data bulan ini tidak lengkap: Pengikut Akhir Bulan, Pengikut Baru/);
    expect(s.notes.join(" ")).toMatch(/Pengikut Baru \(2 dari 30 hari\)/);
    expect(s.notes.join(" ")).toMatch(/30 hari terakhir/);
  });

  it("a (nearly) complete month keeps every headline; 27/30 days is above the threshold but labelled", () => {
    const full = buildMetricsSection({ ...input, daily: fullSeptember(), media: [] });
    expect(metricsRow(full)).toMatchObject({ Pengikut: 1030, "Pengikut Baru": 30, "Total Jangkauan": 3000 });
    expect(full.coverage.every((c) => !c.omitted)).toBe(true);
    expect(full.description).toMatch(/Data 30 dari 30 hari\./);
    expect(full.description).not.toMatch(/tidak lengkap/);

    const most = buildMetricsSection({ ...input, daily: fullSeptember([5, 6, 7]), media: [] });
    expect(27 / 30).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD);
    expect(metricsRow(most)["Pengikut Baru"]).toBe(27);
    expect(most.description).toMatch(/Data 27 dari 30 hari\./);
    expect(most.description).toMatch(/Pengikut Baru 27 dari 30 hari/);

    const few = buildMetricsSection({ ...input, daily: fullSeptember([1, 2, 3, 4, 5, 6, 7]), media: [] });
    expect(metricsRow(few)).not.toHaveProperty("Pengikut Baru"); // 23/30 < 80%
    expect(metricsRow(few)).toHaveProperty("Pengikut", 1030); // month-end snapshot present
  });

  it("explains that follower history starts at the connection date", () => {
    const s = buildMetricsSection({ ...input, daily: [], media: [], connectedAt: new Date("2026-10-02T03:00:00Z") });
    expect(s.description).toMatch(/Jumlah pengikut harian tercatat sejak akun dihubungkan \(2 Okt 2026\); bulan ini belum memiliki riwayat pengikut/);
    const d = buildDailySection({ ...input, connectedAt: new Date("2026-09-02T03:00:00Z") });
    expect(d.notes.join(" ")).toMatch(/sejak akun dihubungkan \(2 Sep 2026\)/);
  });

  it("daily section: coverage note, and month-total cards only when the data is complete enough", () => {
    const partial = buildDailySection(input);
    expect(partial.description).toMatch(/Data 2 dari 30 hari\./);
    expect(partial.visualizations.some((v) => v.type === "metric_card" && v.aggregation === "sum")).toBe(false);
    const confirmed = buildDailySection({ ...input, includePartial: true });
    expect(confirmed.visualizations.some((v) => v.type === "metric_card" && v.aggregation === "sum")).toBe(true);
    const full = buildDailySection({ ...input, daily: fullSeptember() });
    expect(full.visualizations.filter((v) => v.aggregation === "sum").map((v) => v.title)).toEqual([
      "Total Jangkauan",
      "Total Tayangan",
      "Total Interaksi",
    ]);
  });

  it("every generated section parses through the manual-grid parser", () => {
    for (const s of buildInstagramSections(input)) {
      const parsed = parser.parseGrid(s.columns, s.rows as any);
      expect(parsed.rowCount).toBe(s.rows.length);
      expect(parsed.headers).toEqual(s.columns.map((c) => c.name));
    }
  });
});

describe("InstagramReportService", () => {
  function setup(withConnection = true) {
    const prisma = new FakePrisma();
    prisma.socialMediaReport.rows.push({
      id: "rep-1",
      projectId: "p1",
      month: 9,
      year: 2026,
      project: { id: "p1", client: { id: "client-a", isInternal: false } },
      sections: [],
    });
    if (withConnection) {
      prisma.instagramConnection.rows.push({ id: "conn-1", clientId: "client-a", igUserId: "1784", igScopedUserId: "9001", username: "brandco", status: "ACTIVE", lastSyncAt: new Date(), createdAt: new Date("2026-08-01T00:00:00Z") });
      daily.forEach((d, i) => prisma.instagramDailyMetric.rows.push({ id: `d${i}`, connectionId: "conn-1", ...d }));
      media.forEach((m, i) => prisma.instagramMediaSnapshot.rows.push({ id: `m${i}`, connectionId: "conn-1", ...m }));
    }
    const parser = new UniversalCSVParserService();
    const reports = new SocialMediaReportService(prisma as any, parser, { sendReportReady: jest.fn() } as any);
    const svc = new InstagramReportService(prisma as any, reports, parser);
    svc.now = () => new Date("2026-10-03T03:00:00Z");
    return { prisma, reports, svc };
  }

  it("preview lists the three sections without saving anything", async () => {
    const { svc, prisma } = setup();
    const p = await svc.preview("rep-1");
    expect(p.available).toBe(true);
    expect(p.periodMismatch).toBeNull();
    expect(p.sections.map((s) => s.key)).toEqual(["metrics", "daily", "top"]);
    expect(p.sections.every((s) => !s.empty)).toBe(true);
    expect(prisma.reportSection.rows).toHaveLength(0);
    const m = p.sections.find((s) => s.key === "metrics")!;
    expect(m.hasOmitted).toBe(true);
    expect(m.notes.join(" ")).toMatch(/dari 30 hari/);
    expect(m.headers).not.toContain("Pengikut Baru");
    const confirmed = await svc.preview("rep-1", { includePartial: true });
    expect(confirmed.includePartial).toBe(true);
    expect(confirmed.sections.find((s) => s.key === "metrics")!.headers).toContain("Pengikut Baru");
  });

  it("not connected -> available=false; adding throws", async () => {
    const { svc } = setup(false);
    expect((await svc.preview("rep-1")).available).toBe(false);
    await expect(svc.addSections("rep-1", ["daily"])).rejects.toBeInstanceOf(BadRequestException);
  });

  it("stores exactly the same section shape as the manual grid (layout.source = instagram)", async () => {
    const { svc, reports, prisma } = setup();
    const { created } = await svc.addSections("rep-1", ["daily", "metrics", "top"]);
    expect(created.map((c) => c.title)).toEqual(["Instagram — Ringkasan", "Instagram — Harian", "Konten teratas"]);

    const daily: any = created[1];
    const generated = buildDailySection(input);
    const manual: any = await reports.addManualSection("rep-1", {
      title: "Manual",
      kind: "table",
      columns: generated.columns as any,
      rows: generated.rows as any,
    });
    for (const k of ["columnTypes", "rawData", "rowCount"] as const) {
      expect(daily[k]).toEqual((manual as any)[k]);
    }
    expect(daily.layout.columnOrder).toEqual(manual.layout.columnOrder);
    expect(daily.layout.source).toBe("instagram");
    expect(manual.layout.source).toBe("manual");
    expect(daily.layout.instagramKind).toBe("table");

    const metrics: any = created[0];
    expect(metrics.rowCount).toBe(1);
    expect(metrics.layout.instagramKind).toBe("metrics");
    expect(metrics.visualizations.every((v: any) => v.type === "metric_card")).toBe(true);
    // Chart configs went through the same sanitiser as user-edited charts.
    expect(prisma.reportSection.rows.every((r) => Array.isArray(r.visualizations))).toBe(true);
    // Provenance for Meta data-deletion requests.
    expect(daily.layout).toMatchObject({ instagramConnectionId: "conn-1", instagramUserId: "1784", instagramScopedUserId: "9001" });
  });

  it("re-adding is idempotent: 409 without confirmation, replace updates the same sections in place", async () => {
    const { svc, prisma } = setup();
    const first = await svc.addSections("rep-1", ["metrics", "daily"]);
    const ids = first.created.map((c: any) => c.id);
    expect(prisma.reportSection.rows).toHaveLength(2);

    const conflict = svc.addSections("rep-1", ["daily", "top"]);
    await expect(conflict).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.addSections("rep-1", ["daily"])).rejects.toMatchObject({
      response: { details: { code: "INSTAGRAM_SECTIONS_EXIST" } },
    });
    expect(prisma.reportSection.rows).toHaveLength(2);

    // A duplicate left over from before (pre-idempotency) is cleaned up on replace.
    prisma.reportSection.rows.push({ ...prisma.reportSection.rows[1], id: "dup-daily" });
    const again = await svc.addSections("rep-1", ["metrics", "daily", "top"], { replace: true, includePartial: true });
    expect(again.replaced.map((r: any) => r.id)).toEqual(ids);
    expect(again.created.map((c: any) => c.title)).toEqual(["Konten teratas"]);
    expect(prisma.reportSection.rows.map((r) => r.id).sort()).toEqual([...ids, again.created[0].id].sort());
    const metrics = prisma.reportSection.rows.find((r) => r.id === ids[0])!;
    expect(metrics.layout.columnOrder).toContain("Pengikut Baru"); // regenerated with partial data confirmed
    const preview = await svc.preview("rep-1");
    expect(preview.existing.map((e) => e.key).sort()).toEqual(["daily", "metrics", "top"]);
  });

  it("replace never touches non-Instagram sections", async () => {
    const { svc, reports, prisma } = setup();
    await reports.addManualSection("rep-1", { title: "Manual", kind: "metrics", columns: [{ name: "Pengikut", type: "number" }] as any, rows: [[1]] as any });
    const manualId = prisma.reportSection.rows[0].id;
    await svc.addSections("rep-1", ["metrics"], { replace: true });
    await expect(reports.replaceGeneratedSection("rep-1", manualId, {
      title: "x", csvFileName: "x", parsed: { headers: [], rows: [], columnTypes: {}, rowCount: 0, warnings: [] } as any, visualizations: [], source: "instagram",
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reportSection.rows.find((r) => r.id === manualId)!.title).toBe("Manual");
  });

  it("a month without data adds nothing and explains why", async () => {
    const { svc, prisma } = setup();
    prisma.socialMediaReport.rows[0].month = 1;
    await expect(svc.addSections("rep-1", ["daily", "top"])).rejects.toThrow(/Belum ada data Instagram/);
  });
});
