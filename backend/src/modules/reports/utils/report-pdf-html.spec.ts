import { buildReportHtml, niceScale } from "./report-pdf-html";

const rows = Array.from({ length: 6 }, (_, i) => ({
  Tanggal: `2026-09-0${i + 1}`,
  Reach: 1000 + i * 250,
  Format: ["Reels", "Foto", "Story", "Carousel", "Live", "Kolab"][i],
  "Engagement Rate": `${4 + i}%`,
}));

const section = {
  id: "s1",
  title: "Performa Harian",
  description: "Jangkauan harian akun.",
  columnTypes: { Tanggal: "DATE", Reach: "NUMBER", Format: "STRING", "Engagement Rate": "NUMBER" },
  rawData: rows,
  // Only `visualizations`, exactly what the v2 builder writes (no `layout`).
  visualizations: [
    { type: "metric_card", title: "Total Reach", valueKey: "Reach", aggregation: "sum" },
    { type: "metric_card", title: "Total Engagement Rate", valueKey: "Engagement Rate", aggregation: "sum" },
    { type: "line", title: "Reach harian", xAxis: "Tanggal", yAxis: ["Reach"] },
    { type: "area", title: "Reach area", xAxis: "Tanggal", yAxis: ["Reach"] },
    { type: "bar", title: "Reach per format", xAxis: "Format", yAxis: ["Reach"] },
    { type: "pie", title: "Porsi reach", nameKey: "Format", valueKey: "Reach" },
    { type: "table", title: "Data" },
  ],
};

describe("buildReportHtml (report PDF content)", () => {
  const html = buildReportHtml({
    title: "Laporan September 2026",
    description: "Ringkasan bulan ini",
    month: 9,
    year: 2026,
    clientName: "Kopi Senja",
    projectNumber: "PRJ-1",
    projectName: "Social media",
    sections: [section],
  });

  it("renders cover, summary tiles, section heading and description", () => {
    expect(html).toContain("Laporan September 2026");
    expect(html).toContain("Kopi Senja");
    expect(html).toContain("Ringkasan");
    expect(html).toContain("Performa Harian");
    expect(html).toContain("Jangkauan harian akun.");
    expect(html).toContain("9.750"); // total reach, Indonesian grouping
  });

  it("renders every chart type as inline SVG (no scripts or external resources)", () => {
    const svgs = html.match(/<svg /g) ?? [];
    expect(svgs.length).toBe(4); // line, area, bar, donut
    expect(html).not.toMatch(/<script|https?:\/\/(?!www\.w3\.org)/);
  });

  it("uses the same rule as the portal: percentages average, with a takeaway per chart", () => {
    expect(html).toContain("Rata-rata Engagement Rate");
    expect(html).toContain("6,5%"); // (4..9)/6, not 39%
    expect(html).toContain("Reach naik");
    expect(html).toContain("Kolab terbesar");
  });

  it("includes a compact data table with Indonesian formatting", () => {
    expect(html).toContain('<table class="data"');
    expect(html).toContain("1 September 2026");
  });

  it("escapes user text", () => {
    const evil = buildReportHtml({ title: "<img src=x onerror=alert(1)>", month: 1, year: 2026, sections: [] });
    expect(evil).not.toContain("<img src=x");
    expect(evil).toContain("belum memiliki isi");
  });

  it("niceScale returns round ticks covering the data", () => {
    const s = niceScale(0, 9623, 4);
    expect(s.min).toBe(0);
    expect(s.max).toBeGreaterThanOrEqual(9623);
    expect(s.ticks.length).toBeGreaterThanOrEqual(3);
  });
});
