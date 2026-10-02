import { nextPeriod, retitleForPeriod } from "./report-duplicate";

describe("report period helpers", () => {
  it("rolls December over to January of the next year", () => {
    expect(nextPeriod({ month: 12, year: 2026 })).toEqual({ month: 1, year: 2027 });
    expect(nextPeriod({ month: 9, year: 2026 })).toEqual({ month: 10, year: 2026 });
  });

  it("moves the month and year in an Indonesian title", () => {
    expect(
      retitleForPeriod("Laporan Media Sosial September 2026", { month: 9, year: 2026 }, { month: 10, year: 2026 }),
    ).toBe("Laporan Media Sosial Oktober 2026");
  });

  it("keeps the language and handles a year rollover in English", () => {
    expect(
      retitleForPeriod("Social Media Report DECEMBER 2026", { month: 12, year: 2026 }, { month: 1, year: 2027 }),
    ).toBe("Social Media Report JANUARY 2027");
  });

  it("leaves other months and untitled periods alone", () => {
    expect(retitleForPeriod("Perbandingan Agustus vs September", { month: 9, year: 2026 }, { month: 10, year: 2026 })).toBe(
      "Perbandingan Agustus vs Oktober",
    );
    expect(retitleForPeriod("Laporan Bulanan", { month: 9, year: 2026 }, { month: 10, year: 2026 })).toBe("Laporan Bulanan");
  });
});
