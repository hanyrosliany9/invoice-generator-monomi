import {
  buildKpis,
  describe as describeViz,
  metricKpi,
  prepareViz,
  resolveAggregation,
  toNum,
} from "./report-insights";

const rows = Array.from({ length: 5 }, (_, i) => ({
  Tanggal: `2026-09-0${i + 1}`,
  Reach: 1000 + i * 100,
  "Engagement Rate": `${4 + i}%`,
  Pengikut: 13000 + i * 10,
}));
const section = {
  id: "s1",
  title: "Harian",
  columnTypes: { Tanggal: "DATE", Reach: "NUMBER", "Engagement Rate": "NUMBER", Pengikut: "NUMBER" },
  rawData: rows,
  visualizations: [],
};

describe("report aggregation rule (shared by staff, portal and PDF)", () => {
  it("averages percent-like columns even when sum was requested", () => {
    const k = metricKpi(section, { type: "metric_card", title: "Total Engagement Rate", valueKey: "Engagement Rate", aggregation: "sum" });
    expect(k).not.toBeNull();
    expect(k!.value).toBeCloseTo(6, 5); // (4+5+6+7+8)/5, NOT 30
    expect(k!.unit).toBe("percent");
    expect(k!.note).toBe("average");
    expect(k!.label).toBe("Rata-rata Engagement Rate");
  });

  it("sums additive counts", () => {
    const k = metricKpi(section, { type: "metric_card", title: "Total Reach", valueKey: "Reach", aggregation: "sum" });
    expect(k!.value).toBe(5000 + 1000);
    expect(k!.note).toBe("total");
    expect(k!.label).toBe("Total Reach");
  });

  it("shows the LATEST value (not 'highest') for follower columns", () => {
    const shuffled = { ...section, rawData: [...rows].reverse() }; // order must not matter: dates decide
    const k = metricKpi(shuffled, { type: "metric_card", title: "Pengikut saat ini", valueKey: "Pengikut", aggregation: "max" });
    expect(k!.value).toBe(13040);
    expect(k!.note).toBe("lastValue");
    expect(k!.asOf).toContain("2026");
  });

  it("keeps an explicit peak request for followers", () => {
    expect(resolveAggregation("Pengikut", "Pengikut tertinggi", "number", "max")).toBe("max");
  });

  it("does not treat follower gains as a level", () => {
    expect(resolveAggregation("Pengikut Baru", "Total Pengikut Baru", "number", "sum")).toBe("sum");
  });

  it("accepts the backend alias avg", () => {
    expect(resolveAggregation("Likes", "Rata-rata Likes", "number", "avg")).toBe("average");
  });

  it("buildKpis never lists a summed percentage", () => {
    const sec = {
      ...section,
      visualizations: [{ type: "metric_card", title: "Total Engagement Rate", valueKey: "Engagement Rate", aggregation: "sum" }],
    };
    const [k] = buildKpis([sec]);
    expect(k.value).toBeCloseTo(6, 5);
  });
});

describe("plain-language takeaways", () => {
  it("describes a rising time series in Indonesian", () => {
    const prep = prepareViz(section, { type: "line", xAxis: "Tanggal", yAxis: ["Reach"] });
    const lines = describeViz({ type: "line" }, prep);
    expect(lines[0]).toMatch(/^Reach naik 40% dari 1 September 2026 \(1\.000\) ke 5 September 2026 \(1\.400\)\.$/);
  });

  it("parses Indonesian and English number formats", () => {
    expect(toNum("1.234,5")).toBe(1234.5);
    expect(toNum("1,234.5")).toBe(1234.5);
    expect(toNum("7,4%")).toBe(7.4);
  });
});

describe("canonical import values (shared by staff, portal and PDF)", () => {
  it("treats rupiah-prefixed cells as currency and reads stored values", () => {
    const sec = {
      ...section,
      columnTypes: { Tanggal: "DATE", Nilai: "NUMBER" },
      rawData: [
        { Tanggal: "2026-09-01", Nilai: "Rp150000" },
        { Tanggal: "2026-09-02", Nilai: "Rp152000" },
      ],
    };
    const k = metricKpi(sec, { type: "metric_card", title: "Total Nilai", valueKey: "Nilai", aggregation: "sum" });
    expect(k!.value).toBe(302000);
    expect(k!.unit).toBe("currency");
  });

  it("reads percent strings stored by the importer as percent", () => {
    expect(toNum("3.4%")).toBe(3.4);
    expect(toNum("Rp151000")).toBe(151000);
  });
});
