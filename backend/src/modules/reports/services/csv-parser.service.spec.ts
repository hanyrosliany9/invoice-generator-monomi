import { BadRequestException } from "@nestjs/common";
import * as XLSX from "xlsx";
import {
  UniversalCSVParserService,
  decodeText,
  detectDelimiter,
} from "./csv-parser.service";
import {
  parseDateCell,
  parseNumberCell,
  normalizeMatrix,
} from "../utils/report-data-import";

const svc = new UniversalCSVParserService();
const csv = (text: string | Buffer, name = "data.csv") =>
  svc.parseFile(typeof text === "string" ? Buffer.from(text, "utf8") : text, name);

describe("number cells", () => {
  it.each([
    ["12,5", "auto", 12.5],
    ["1.234", ",", 1234],
    ["1.234.567", "auto", 1234567],
    ["1,234", "auto", 1234],
    ["1,234.5", "auto", 1234.5],
    ["1.234,5", "auto", 1234.5],
    ["Rp 1.250.000", "auto", 1250000],
    ["3,4%", "auto", 3.4],
    ["(42)", "auto", -42],
    ["-7,5", ",", -7.5],
    ["1,2rb", "auto", 1200],
    ["2.5K", ".", 2500],
    ["1,5 jt", "auto", 1500000],
  ])("%s -> %s", (raw, decimal, expected) => {
    expect(parseNumberCell(raw, decimal as any)?.value).toBe(expected);
  });

  it("rejects non numbers", () => {
    expect(parseNumberCell("abc")).toBeNull();
    expect(parseNumberCell("12-3")).toBeNull();
    expect(parseNumberCell("1.2.3a")).toBeNull();
  });
});

describe("date cells", () => {
  it.each([
    ["2026-09-01", "2026-09-01"],
    ["01/09/2026", "2026-09-01"],
    ["1/9/26", "2026-09-01"],
    ["31/12/2026", "2026-12-31"],
    ["1 Okt 2026", "2026-10-01"],
    ["01 Oktober 2026", "2026-10-01"],
    ["17-Agu-26", "2026-08-17"],
    ["17 Agustus 2026", "2026-08-17"],
    ["Sep 1, 2026", "2026-09-01"],
    ["September 1, 2026", "2026-09-01"],
    ["Okt 2026", "2026-10-01"],
    ["Rabu, 2 Des 2026", "2026-12-02"],
    ["2026-09-01T00:00:00", "2026-09-01"],
    ["2026-09-01 14:30:00", "2026-09-01 14:30"],
    ["2026/09/01", "2026-09-01"],
    ["01.09.2026", "2026-09-01"],
  ])("%s -> %s", (raw, expected) => {
    expect(parseDateCell(raw)).toBe(expected);
  });

  it("reads MM/DD when the data proves it", () => {
    expect(parseDateCell("12/31/2026", "MDY")).toBe("2026-12-31");
    expect(parseDateCell("31/02/2026")).toBeNull();
  });

  it("does not treat plain integers or words as dates", () => {
    expect(parseDateCell("2026")).toBeNull();
    expect(parseDateCell("42")).toBeNull();
    expect(parseDateCell("Reels")).toBeNull();
  });
});

describe("encoding and delimiters", () => {
  it("strips a UTF-8 BOM from the first header", () => {
    const text = decodeText(Buffer.from("﻿Tanggal;Reach\n", "utf8"));
    expect(text.startsWith("Tanggal")).toBe(true);
  });

  it("falls back to windows-1252 for non UTF-8 files", () => {
    const text = decodeText(Buffer.from("Kota\nSão Paulo\n", "latin1"));
    expect(text).toContain("São Paulo");
  });

  it("decodes UTF-16 LE with BOM", () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("A;B\n1;2\n", "utf16le")]);
    expect(decodeText(buf)).toBe("A;B\n1;2\n");
  });

  it("detects the delimiter, ignoring quoted commas", () => {
    expect(detectDelimiter('a;b\n"x,y";2\n"p,q";3\n')).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3\n")).toBe(",");
    expect(detectDelimiter("a\tb\n1\t2\n")).toBe("\t");
  });
});

describe("parseFile CSV", () => {
  it("reads a semicolon CSV from Indonesian Excel (BOM, decimal commas, thousand dots)", async () => {
    const p = await csv(
      "﻿Tanggal;Jangkauan;Engagement Rate;Biaya Iklan\r\n" +
        "01/09/2026;12.370;3,4%;Rp 151.000\r\n" +
        "02/09/2026;12.740;3,8%;Rp 152.000\r\n",
    );
    expect(p.headers).toEqual(["Tanggal", "Jangkauan", "Engagement Rate", "Biaya Iklan"]);
    expect(p.columnTypes).toEqual({
      Tanggal: "DATE",
      Jangkauan: "NUMBER",
      "Engagement Rate": "NUMBER",
      "Biaya Iklan": "NUMBER",
    });
    expect(p.rows[0]).toEqual({
      Tanggal: "2026-09-01",
      Jangkauan: 12370,
      "Engagement Rate": "3.4%",
      "Biaya Iklan": "Rp151000",
    });
    expect(p.rows[1].Jangkauan).toBe(12740);
  });

  it("reads Indonesian month names and quoted thousand dots", async () => {
    const p = await csv('Tanggal,Video Views,Followers Baru\n1 Sep 2026,"2.100",1\n2 Sep 2026,"2.200",2\n');
    expect(p.columnTypes.Tanggal).toBe("DATE");
    expect(p.rows[0]["Video Views"]).toBe(2100);
    expect(p.rows[1].Tanggal).toBe("2026-09-02");
  });

  it("treats 1.234 as thousands only when the whole column says so", async () => {
    const thousands = await csv("Konten;Tayangan\nA;1.500\nB;620\n");
    expect(thousands.rows.map((r) => r.Tayangan)).toEqual([1500, 620]);
    const decimals = await csv("Konten,Rasio\nA,1.5\nB,0.25\n");
    expect(decimals.rows.map((r) => r.Rasio)).toEqual([1.5, 0.25]);
  });

  it("resolves ambiguous dates as DD/MM, and MM/DD when a month > 12 proves it", async () => {
    const dmy = await csv("Tanggal,Reach\n03/09/2026,1\n04/09/2026,2\n");
    expect(dmy.rows[0].Tanggal).toBe("2026-09-03");
    expect(dmy.warnings.join(" ")).toMatch(/HARI\/BULAN\/TAHUN/);
    const mdy = await csv("Date,Reach\n09/03/2026,1\n09/30/2026,2\n");
    expect(mdy.rows[0].Date).toBe("2026-09-03");
    expect(mdy.rows[1].Date).toBe("2026-09-30");
  });

  it("skips the Excel sep= line and title lines above the header", async () => {
    const a = await csv("sep=;\nTanggal;Reach\n01/09/2026;100\n02/09/2026;150\n");
    expect(a.headers).toEqual(["Tanggal", "Reach"]);
    const b = await csv(
      "Laporan Instagram September 2026\nDiekspor dari Meta Business Suite\n\nTanggal,Reach,Views\n2026-09-01,100,200\n2026-09-02,150,210\n",
    );
    expect(b.headers).toEqual(["Tanggal", "Reach", "Views"]);
    expect(b.rowCount).toBe(2);
    expect(b.warnings.join(" ")).toMatch(/2 baris di atas judul/);
  });

  it("tolerates ragged rows instead of rejecting the file", async () => {
    const p = await csv("Tanggal,Reach,Views\n2026-09-01,100,200\n2026-09-02,150\n2026-09-03,170,260,999\n");
    expect(p.rowCount).toBe(3);
    expect(p.rows[1].Views).toBe("");
    expect(p.warnings.join(" ")).toMatch(/lebih banyak kolom/);
  });

  it("accepts a single-column CSV", async () => {
    const p = await csv("Reach\n100\n200\n300\n");
    expect(p.headers).toEqual(["Reach"]);
    expect(p.rows.map((r) => r.Reach)).toEqual([100, 200, 300]);
  });

  it("names blank and duplicate headers and keeps the file's column order", async () => {
    const p = await csv("Tanggal,Reach,Reach,,Views\n2026-09-01,100,5,x,200\n");
    expect(p.headers).toEqual(["Tanggal", "Reach", "Reach 2", "Kolom 4", "Views"]);
    expect(p.warnings.join(" ")).toMatch(/diberi nama otomatis/);
  });

  it("treats dashes and n/a as empty numbers, not as errors", async () => {
    const p = await csv("Tanggal,Reach\n2026-09-01,100\n2026-09-02,-\n2026-09-03,n/a\n2026-09-04,120\n2026-09-05,130\n2026-09-06,140\n2026-09-07,150\n");
    expect(p.columnTypes.Reach).toBe("NUMBER");
    expect(p.rows[1].Reach).toBe("");
  });

  it("decodes windows-1252 text", async () => {
    const p = await csv(Buffer.from("Kota;Pengikut\nSão Paulo;300\nMünchen;150\n", "latin1"));
    expect(p.rows[0].Kota).toBe("São Paulo");
  });

  it("explains empty and header-only files in Indonesian", async () => {
    await expect(csv("")).rejects.toThrow(/File kosong/);
    await expect(csv("Tanggal,Reach\n")).rejects.toThrow(/hanya berisi judul kolom/);
    await expect(csv("hello", "notes.txt")).rejects.toThrow(/hanya berisi judul kolom/);
    await expect(csv("x", "a.pdf")).rejects.toBeInstanceOf(BadRequestException);
    await expect(csv("x", "a.pdf")).rejects.toThrow(/Format file tidak didukung/);
  });
});

describe("parseFile Excel", () => {
  const book = (aoa: unknown[][], fmts: Record<string, string> = {}) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    for (const [addr, z] of Object.entries(fmts)) ws[addr].z = z;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Harian");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  };

  it("reads real date serials, percent cells and plain numbers", async () => {
    // 46266 = 2026-09-01
    const buf = book(
      [
        ["Tanggal", "Jangkauan", "Engagement Rate"],
        [46266, 1050, 0.031],
        [46267, 1100, 0.0325],
      ],
      { A2: "yyyy-mm-dd", A3: "yyyy-mm-dd", C2: "0.0%", C3: "0.0%" },
    );
    const p = await svc.parseFile(buf, "ig.xlsx");
    expect(p.columnTypes).toEqual({
      Tanggal: "DATE",
      Jangkauan: "NUMBER",
      "Engagement Rate": "NUMBER",
    });
    expect(p.rows[0]).toEqual({
      Tanggal: "2026-09-01",
      Jangkauan: 1050,
      "Engagement Rate": "3.1%",
    });
    expect(p.rows[1].Tanggal).toBe("2026-09-02");
    expect(p.rows[1]["Engagement Rate"]).toBe("3.25%");
  });
});

describe("suggestVisualizations", () => {
  const sug = async (text: string) => {
    const p = await csv(text);
    return svc.suggestVisualizations(p.rows, p.columnTypes, p.headers);
  };

  it("uses Indonesian titles with no duplicated words or double spaces", async () => {
    const s = await sug(
      "Tanggal,Total Reach,Video  Views,Engagement Rate,Followers\n" +
        "2026-09-01,10,20,3.4%,100\n2026-09-02,11,22,3.8%,101\n",
    );
    const titles = s.map((v) => v.title);
    expect(titles).toContain("Total Reach");
    expect(titles).not.toContain("Total Total Reach");
    expect(titles).toContain("Rata-rata Engagement Rate");
    expect(titles).toContain("Followers terkini");
    expect(titles.some((t) => /Over Time|Distribution of|\s{2,}/.test(t))).toBe(false);
    expect(titles).toContain("Tabel Data");
    expect(s.find((v) => v.valueKey === "Followers")?.aggregation).toBe("latest");
    expect(s.find((v) => v.title === "Rata-rata Engagement Rate")?.aggregation).toBe("average");
  });

  it("suggests a time series for Indonesian-dated data (not a bar over dates)", async () => {
    const s = await sug("Tanggal;Tayangan\n1 Okt 2026;1.500\n2 Okt 2026;2.250\n3 Okt 2026;1.980\n");
    expect(s[0]).toMatchObject({ type: "line", xAxis: "Tanggal", yAxis: ["Tayangan"] });
  });

  it("is deterministic (no random colours)", async () => {
    const a = await sug("Tanggal,Reach\n2026-09-01,1\n2026-09-02,2\n");
    const b = await sug("Tanggal,Reach\n2026-09-01,1\n2026-09-02,2\n");
    expect(a).toEqual(b);
  });
});

describe("parseGrid (manual entry)", () => {
  it("produces the same shape as a file import, typed per column", () => {
    const p = svc.parseGrid(
      [
        { name: "Tanggal", type: "date" },
        { name: "Jangkauan", type: "number" },
        { name: "Engagement Rate", type: "percent" },
        { name: "Biaya", type: "currency" },
        { name: "Catatan", type: "text" },
      ],
      [
        ["01/09/2026", "12.370", "3,4", "Rp 150.000", "Promo"],
        ["2 Sep 2026", 12740, "3,8%", "152000", ""],
      ],
    );
    expect(p.headers).toEqual(["Tanggal", "Jangkauan", "Engagement Rate", "Biaya", "Catatan"]);
    expect(p.columnTypes).toEqual({
      Tanggal: "DATE",
      Jangkauan: "NUMBER",
      "Engagement Rate": "NUMBER",
      Biaya: "NUMBER",
      Catatan: "STRING",
    });
    expect(p.rows[0]).toEqual({
      Tanggal: "2026-09-01",
      Jangkauan: 12370,
      "Engagement Rate": "3.4%",
      Biaya: "Rp150000",
      Catatan: "Promo",
    });
    expect(p.rows[1]["Engagement Rate"]).toBe("3.8%");
    expect(p.rows[1].Biaya).toBe("Rp152000");
  });

  it("is idempotent: stored values re-normalise to themselves", () => {
    const first = svc.parseGrid(
      [
        { name: "Tanggal", type: "date" },
        { name: "N", type: "number" },
        { name: "P", type: "percent" },
        { name: "C", type: "currency" },
      ],
      [["01/09/2026", "123,456", "12,5", "Rp 1.500"]],
    );
    const again = svc.parseGrid(
      [
        { name: "Tanggal", type: "date" },
        { name: "N", type: "number" },
        { name: "P", type: "percent" },
        { name: "C", type: "currency" },
      ],
      [Object.values(first.rows[0]) as any],
    );
    expect(again.rows[0]).toEqual(first.rows[0]);
  });

  it("rejects unreadable cells in typed columns with a clear message", () => {
    expect(() =>
      svc.parseGrid(
        [
          { name: "Tanggal", type: "date" },
          { name: "Reach", type: "number" },
        ],
        [["01/09/2026", "banyak"]],
      ),
    ).toThrow(/Kolom "Reach": 1 nilai bukan angka/);
    expect(() =>
      svc.parseGrid([{ name: "Tanggal", type: "date" }], [["kemarin"]]),
    ).toThrow(/bukan tanggal/);
  });

  it("rejects empty or duplicate column names", () => {
    expect(() => svc.parseGrid([{ name: " ", type: "text" }], [["x"]])).toThrow(/belum diberi nama/);
    expect(() =>
      svc.parseGrid(
        [
          { name: "A", type: "text" },
          { name: "a", type: "text" },
        ],
        [["x", "y"]],
      ),
    ).toThrow(/dipakai dua kali/);
  });

  it("builds headline-number cards with the latest value", () => {
    const p = svc.parseGrid(
      [
        { name: "Pengikut", type: "number" },
        { name: "Engagement Rate", type: "percent" },
      ],
      [["51.005", "3,9"]],
    );
    const viz = svc.metricVisualizations(p.headers, p.columnTypes, p.rows);
    expect(viz.map((v) => [v.title, v.valueKey, v.aggregation])).toEqual([
      ["Pengikut", "Pengikut", "latest"],
      ["Engagement Rate", "Engagement Rate", "latest"],
    ]);
  });
});

describe("normalizeMatrix", () => {
  it("drops an identical time of day on every date (Excel midnight offsets)", () => {
    const n = normalizeMatrix([
      ["Tanggal", "X"],
      ["2026-09-01 07:00", 1],
      ["2026-09-02 07:00", 2],
    ]);
    expect(n.rows.map((r) => r.Tanggal)).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("drops fully empty columns and rows", () => {
    const n = normalizeMatrix([
      ["A", "B", "", "C"],
      ["1", "x", "", "2"],
      ["", "", "", ""],
      ["3", "y", "", "4"],
    ]);
    expect(n.headers).toEqual(["A", "B", "C"]);
    expect(n.rowCount).toBe(2);
  });
});

describe("import limits and hostile spreadsheets", () => {
  const sheetXmlPath = "/xl/worksheets/sheet1.xml";
  /** Write a normal workbook, then rewrite its sheet XML (a crafted file). */
  const craft = (aoa: unknown[][], patch: (xml: string) => string): Buffer => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Data");
    const zip = XLSX.CFB.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), {
      type: "buffer",
    });
    const entry = XLSX.CFB.find(zip, sheetXmlPath);
    if (entry === null) throw new Error("sheet entry not found");
    entry.content = Buffer.from(patch(Buffer.from(entry.content as Uint8Array).toString("utf8")));
    return XLSX.CFB.write(zip, { fileType: "zip", type: "buffer", compression: true }) as Buffer;
  };
  const extraCell = (ref: string) => (xml: string) =>
    xml.replace(
      "</sheetData>",
      `<row r="${ref.replace(/^[A-Z]+/, "")}"><c r="${ref}" t="inlineStr"><is><t>x</t></is></c></row></sheetData>`,
    );
  const table = [
    ["Tanggal", "Views"],
    ["2026-09-01", 10],
    ["2026-09-02", 12],
  ];

  it("ignores a declared A1:XFD1048576 dimension and finishes well under 1s", async () => {
    const buf = craft(table, (xml) =>
      xml.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:XFD1048576"/>'),
    );
    expect(buf.length).toBeLessThan(20_000);
    const started = Date.now();
    const p = await svc.parseFile(buf, "bomb.xlsx");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(p.headers).toEqual(["Tanggal", "Views"]);
    expect(p.rowCount).toBe(2);
  });

  it("drops a stray value far to the right (column XFD) without iterating up to it", async () => {
    const started = Date.now();
    const p = await svc.parseFile(craft(table, extraCell("XFD2")), "wide.xlsx");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(p.headers).toEqual(["Tanggal", "Views"]);
    expect(p.warnings.join(" ")).toMatch(/sel di sebelah kanan kolom ke-61 diabaikan/);
  });

  it("never reads past row 10,001: a value on row 1048576 costs nothing", async () => {
    const started = Date.now();
    const p = await svc.parseFile(craft(table, extraCell("A1048576")), "tall.xlsx");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(p.rowCount).toBe(2);
  });

  it("refuses a sheet whose data reaches the row after the cap", async () => {
    await expect(svc.parseFile(craft(table, extraCell("A10001")), "tall.xlsx")).rejects.toThrow(
      /Maksimum 5\.000 baris per bagian/,
    );
  });

  it("caps CSV imports at 5,000 data rows per section", async () => {
    const rows = (n: number) =>
      "Hari,Views\n" + Array.from({ length: n }, (_, i) => `${i + 1},${i}`).join("\n");
    await expect(csv(rows(5000))).resolves.toMatchObject({ rowCount: 5000 });
    await expect(csv(rows(5001))).rejects.toThrow(/lebih dari 5\.000 baris/);
    // Far beyond the cap: the parser stops early instead of reading everything.
    await expect(csv(rows(50_000))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("caps the total number of cells per section", async () => {
    const header = Array.from({ length: 60 }, (_, i) => `K${i + 1}`).join(",");
    const line = Array.from({ length: 60 }, (_, i) => String(i)).join(",");
    const text = header + "\n" + Array.from({ length: 2600 }, () => line).join("\n");
    await expect(csv(text)).rejects.toThrow(/Maksimum 150\.000 sel per bagian/);
  });

  it("applies the same row cap to Excel files", async () => {
    const aoa: unknown[][] = [["Hari", "Views"]];
    for (let i = 0; i < 5001; i++) aoa.push([i + 1, i]);
    await expect(svc.parseFile(book2(aoa), "big.xlsx")).rejects.toThrow(/lebih dari 5\.000 baris/);
  });

  it("rejects non-plain or oversized manual cells", () => {
    const cols = [{ name: "Catatan", type: "text" as const }];
    expect(() => svc.parseGrid(cols, [[{ pct: 1 } as never]])).toThrow(/tidak valid/);
    expect(() => svc.parseGrid(cols, [["x".repeat(2201)]])).toThrow(/terlalu panjang/);
    expect(svc.parseGrid(cols, [["x".repeat(2200)]]).rowCount).toBe(1);
  });

  function book2(aoa: unknown[][]): Buffer {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Data");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
});

describe("ManualSectionDto rows validation", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { plainToInstance } = require("class-transformer");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { validateSync } = require("class-validator");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ManualSectionDto } = require("../dto/manual-section.dto");
  const errorsFor = (rows: unknown) =>
    validateSync(
      plainToInstance(ManualSectionDto, { columns: [{ name: "A", type: "text" }], rows }),
    ).map((e: { property: string }) => e.property);

  it("accepts plain cells and rejects objects, long text, wide rows", () => {
    expect(errorsFor([["a", 1, null, true]])).toEqual([]);
    expect(errorsFor([[{ a: 1 }]])).toContain("rows");
    expect(errorsFor([["x".repeat(2201)]])).toContain("rows");
    expect(errorsFor([Array.from({ length: 31 }, () => "x")])).toContain("rows");
    expect(errorsFor(["not-a-row"])).toContain("rows");
  });
});
