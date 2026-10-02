import { findPeriodMismatch } from "./report-period";
import { hasPlottableData } from "./report-insights";

describe("findPeriodMismatch", () => {
  const data = (dates: string[]) => ({
    headers: ["Tanggal", "Views"],
    columnTypes: { Tanggal: "DATE", Views: "NUMBER" },
    rows: dates.map((d, i) => ({ Tanggal: d, Views: i })),
  });

  it("is null when every date is inside the report month", () => {
    expect(findPeriodMismatch(data(["2026-10-01", "2026-10-31"]), 10, 2026)).toBeNull();
  });

  it("reports the range and the number of rows outside the month", () => {
    const res = findPeriodMismatch(data(["2026-11-01", "2026-11-02", "2026-10-31"]), 10, 2026);
    expect(res).toEqual({
      column: "Tanggal",
      total: 3,
      outside: 2,
      min: "2026-10-31",
      max: "2026-11-02",
    });
  });

  it("treats the wrong year as outside", () => {
    expect(findPeriodMismatch(data(["2025-10-05"]), 10, 2026)?.outside).toBe(1);
  });

  it("ignores files without a date column", () => {
    expect(
      findPeriodMismatch(
        { headers: ["A"], columnTypes: { A: "NUMBER" }, rows: [{ A: 1 }] },
        10,
        2026,
      ),
    ).toBeNull();
  });
});

describe("hasPlottableData", () => {
  const rows = [
    { Tanggal: "2026-09-01", Views: 10, Komentar: "" },
    { Tanggal: "2026-09-02", Views: 12, Komentar: "" },
  ];
  it("is false when the plotted column has no values", () => {
    expect(hasPlottableData({ type: "line", yAxis: ["Komentar"], xAxis: "Tanggal" }, rows)).toBe(false);
    expect(hasPlottableData({ type: "bar", yAxis: ["Missing"] }, rows)).toBe(false);
  });
  it("is true when a plotted column has a number", () => {
    expect(hasPlottableData({ type: "line", yAxis: ["Views"], xAxis: "Tanggal" }, rows)).toBe(true);
  });
  it("needs a positive value for a pie and any row for a table", () => {
    expect(hasPlottableData({ type: "pie", nameKey: "Tanggal", valueKey: "Komentar" }, rows)).toBe(false);
    expect(hasPlottableData({ type: "table" }, rows)).toBe(true);
    expect(hasPlottableData({ type: "table" }, [])).toBe(false);
  });
});
