import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SocialMediaReportService } from "./social-media-report.service";

type Row = Record<string, any>;

/** Tiny in-memory prisma for the report tables used by the service. */
function makePrisma(seed: { reports: Row[]; contacts?: Row[] }) {
  const reports = seed.reports.map((r) => ({ ...r }));
  const contacts = seed.contacts ?? [];
  const sameKey = (a: Row, b: Row) => a.projectId === b.projectId && a.year === b.year && a.month === b.month;
  const withRelations = (r: Row) => ({
    ...r,
    project: r.project,
    sections: r.sections ?? [],
  });
  const prisma: any = {
    socialMediaReport: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.projectId_year_month) {
          return reports.find((r) => sameKey(r, where.projectId_year_month)) ?? null;
        }
        const r = reports.find((x) => x.id === where.id);
        return r ? withRelations(r) : null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `new-${reports.length + 1}`,
          ...data,
          sections: (data.sections?.create ?? []).map((s: Row, i: number) => ({ id: `ns-${i}`, ...s })),
          project: reports.find((r) => r.projectId === data.projectId)?.project,
        };
        reports.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const r = reports.find((x) => x.id === where.id)!;
        Object.assign(r, data);
        return r;
      }),
    },
    reportSection: {
      findUnique: jest.fn(async ({ where }: any) =>
        reports.flatMap((r) => r.sections ?? []).find((s: Row) => s.id === where.id) ?? null,
      ),
    },
    clientPortalContact: {
      findMany: jest.fn(async () => contacts.filter((c) => c.isActive)),
    },
  };
  return { prisma, reports };
}

const project = (over: Row = {}) => ({
  id: "p1",
  number: "PRJ-1",
  description: "Social media",
  client: { id: "c1", name: "Kopi Senja", status: "active", isInternal: false, ...over },
});
const sectionRow = (over: Row = {}) => ({
  id: "sec1",
  reportId: "r1",
  order: 1,
  title: "Performa Harian",
  description: "Harian",
  csvFileName: "harian.csv",
  columnTypes: { Tanggal: "DATE", Reach: "NUMBER" },
  rawData: [{ Tanggal: "2026-09-01", Reach: 10 }],
  rowCount: 1,
  layout: { widgets: [] },
  visualizations: [{ type: "line", title: "Reach", xAxis: "Tanggal", yAxis: ["Reach"] }],
  ...over,
});
const baseReport = (over: Row = {}) => ({
  id: "r1",
  projectId: "p1",
  title: "Laporan September 2026",
  description: "Ringkasan September 2026",
  month: 9,
  year: 2026,
  status: "COMPLETED",
  emailedAt: null,
  emailedTo: [],
  project: project(),
  sections: [sectionRow()],
  ...over,
});

const make = (seed: { reports: Row[]; contacts?: Row[] }, notify?: jest.Mock) => {
  const { prisma, reports } = makePrisma(seed);
  const notifications = { sendReportReady: notify ?? jest.fn(async () => undefined) };
  const csv = { parseFile: jest.fn(), suggestVisualizations: jest.fn() };
  const service = new SocialMediaReportService(prisma, csv as any, notifications as any);
  return { service, prisma, reports, notifications, csv };
};

describe("SocialMediaReportService.sendToClient", () => {
  const contacts = [
    { id: "k1", name: "Rina", email: "rina@kopisenja.id", isActive: true },
    { id: "k2", name: "Budi", email: "budi@kopisenja.id", isActive: true },
    { id: "k3", name: "Off", email: "off@kopisenja.id", isActive: false },
  ];

  it("emails active portal contacts with a portal link and marks the report SENT", async () => {
    const { service, notifications, reports } = make({ reports: [baseReport()], contacts });
    const res = await service.sendToClient("r1");

    expect(notifications.sendReportReady).toHaveBeenCalledTimes(2);
    const [to, data, reportId] = notifications.sendReportReady.mock.calls[0];
    expect(to).toBe("rina@kopisenja.id");
    expect(data.reportUrl).toMatch(/\/c\/c1\/reports\/r1$/);
    expect(data.reportTitle).toBe("Laporan September 2026");
    expect(data.period).toBe("September 2026");
    expect(reportId).toBe("r1");
    expect(res.sent).toBe(2);
    expect(res.failed).toBe(0);
    expect(reports[0].status).toBe("SENT");
    expect(reports[0].emailedAt).toBeInstanceOf(Date);
    expect(reports[0].emailedTo).toEqual(["rina@kopisenja.id", "budi@kopisenja.id"]);
  });

  it("surfaces SMTP failure and does NOT mark SENT when no email was delivered", async () => {
    const notify = jest.fn(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:587");
    });
    const { service, reports } = make({ reports: [baseReport()], contacts }, notify);

    let error: any;
    try {
      await service.sendToClient("r1");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const body = error.getResponse();
    expect(body.message).toMatch(/gagal dikirim/i);
    expect(body.details.code).toBe("EMAIL_FAILED");
    expect(body.details.results).toHaveLength(2);
    expect(body.details.results[0]).toMatchObject({ ok: false });
    expect(reports[0].status).toBe("COMPLETED");
    expect(reports[0].emailedAt).toBeNull();
    expect(reports[0].emailedTo).toEqual([]);
  });

  it("on partial failure marks SENT with only the delivered recipients and reports the rest", async () => {
    const notify = jest.fn(async (to: string) => {
      if (to.startsWith("budi")) throw new Error("550 mailbox unavailable");
    });
    const { service, reports } = make({ reports: [baseReport()], contacts }, notify);
    const res = await service.sendToClient("r1");
    expect(res.sent).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results.find((r) => !r.ok)?.email).toBe("budi@kopisenja.id");
    expect(reports[0].status).toBe("SENT");
    expect(reports[0].emailedTo).toEqual(["rina@kopisenja.id"]);
  });

  it("explains when the client has no active portal contacts (with the client id)", async () => {
    const { service, notifications } = make({ reports: [baseReport()], contacts: [contacts[2]] });
    let error: any;
    try {
      await service.sendToClient("r1");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse().details).toEqual({ code: "NO_PORTAL_CONTACTS", clientId: "c1" });
    expect(notifications.sendReportReady).not.toHaveBeenCalled();
  });

  it("refuses internal clients and reports without data", async () => {
    const internal = make({ reports: [baseReport({ project: project({ isInternal: true }) })], contacts });
    await expect(internal.service.sendToClient("r1")).rejects.toBeInstanceOf(BadRequestException);

    const empty = make({ reports: [baseReport({ sections: [sectionRow({ rowCount: 0 })] })], contacts });
    await expect(empty.service.sendToClient("r1")).rejects.toThrow(/belum memiliki data/);
    expect(empty.notifications.sendReportReady).not.toHaveBeenCalled();
  });

  it("lists the recipients that would be notified", async () => {
    const { service } = make({ reports: [baseReport()], contacts });
    const res = await service.getSendRecipients("r1");
    expect(res.contacts.map((c: Row) => c.email)).toEqual(["rina@kopisenja.id", "budi@kopisenja.id"]);
    expect(res.reportUrl).toMatch(/\/c\/c1\/reports\/r1$/);
  });
});

describe("SocialMediaReportService.duplicateReport", () => {
  it("copies title pattern, description and section structure WITHOUT data into the next month", async () => {
    const { service, prisma } = make({
      reports: [
        baseReport({
          sections: [
            sectionRow(),
            sectionRow({ id: "sec2", order: 2, title: "Format", description: null, visualizations: [{ type: "pie", title: "Share", nameKey: "Format", valueKey: "Post" }] }),
          ],
        }),
      ],
    });
    const copy: any = await service.duplicateReport("r1");

    const data = prisma.socialMediaReport.create.mock.calls[0][0].data;
    expect(data.projectId).toBe("p1");
    expect(data.month).toBe(10);
    expect(data.year).toBe(2026);
    expect(data.status).toBe("DRAFT");
    expect(data.title).toBe("Laporan Oktober 2026");
    expect(data.description).toBe("Ringkasan Oktober 2026");
    const secs = data.sections.create;
    expect(secs).toHaveLength(2);
    expect(secs.map((s: Row) => s.title)).toEqual(["Performa Harian", "Format"]);
    expect(secs[0].description).toBe("Harian");
    expect(secs[0].visualizations).toEqual(sectionRow().visualizations);
    expect(secs[1].visualizations[0].type).toBe("pie");
    for (const s of secs) {
      expect(s.rawData).toEqual([]);
      expect(s.rowCount).toBe(0);
      expect(s.columnTypes).toEqual({});
      expect(s.csvFileName).toBe("");
      expect(s.layout).toBeUndefined();
    }
    expect(copy.status).toBe("DRAFT");
  });

  it("skips months that already have a report and honours an explicit target", async () => {
    const oct = baseReport({ id: "r2", month: 10 });
    const { service } = make({ reports: [baseReport(), oct] });
    const auto: any = await service.duplicateReport("r1");
    expect(auto.month).toBe(11);

    await expect(service.duplicateReport("r1", { month: 10, year: 2026 })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("SocialMediaReportService.previewFile (period + chart impact)", () => {
  const file = { buffer: Buffer.from(""), originalname: "nov.csv" } as any;
  const parsed = (cols: string[], dates: string[]) => ({
    headers: cols,
    columnTypes: Object.fromEntries(cols.map((c) => [c, c === "Tanggal" ? "DATE" : "NUMBER"])),
    columnKinds: {},
    rowCount: dates.length,
    rows: dates.map((d) => ({ Tanggal: d, Share: 1, Likes: 2 })),
    warnings: [],
  });

  it("flags dates outside the report month before anything is saved", async () => {
    const { service, csv, prisma } = make({ reports: [baseReport({ month: 10 })] });
    csv.parseFile.mockResolvedValue(parsed(["Tanggal", "Reach"], ["2026-11-01", "2026-11-02"]));
    const res = await service.previewFile(file, { reportId: "r1" });
    expect(res.period).toEqual({ month: 10, year: 2026 });
    expect(res.periodMismatch).toMatchObject({ column: "Tanggal", outside: 2, total: 2 });
    expect(res.chartImpact).toBeNull();
    expect(prisma.socialMediaReport.update).not.toHaveBeenCalled();
  });

  it("lists the charts a replacement would remove when the columns are unrelated", async () => {
    const { service, csv } = make({ reports: [baseReport({ month: 10 })] });
    csv.parseFile.mockResolvedValue(parsed(["Tanggal", "Share"], ["2026-10-01"]));
    csv.suggestVisualizations.mockReturnValue([{ type: "line", title: "Tren Share" }]);
    const res = await service.previewFile(file, { reportId: "r1", sectionId: "sec1" });
    expect(res.periodMismatch).toBeNull();
    expect(res.chartImpact).toEqual({
      before: 1,
      kept: [],
      removed: ["Reach"],
      regenerated: true,
      created: 1,
    });
  });

  it("keeps charts whose columns still exist", async () => {
    const { service, csv } = make({ reports: [baseReport()] });
    csv.parseFile.mockResolvedValue(parsed(["Tanggal", "Reach"], ["2026-09-01"]));
    const res = await service.previewFile(file, { reportId: "r1", sectionId: "sec1" });
    expect(res.chartImpact).toMatchObject({ kept: ["Reach"], removed: [], regenerated: false });
  });
});

describe("SocialMediaReportService.updateReport / updateStatus", () => {
  it("edits title, description and period of a completed report", async () => {
    const { service, reports } = make({ reports: [baseReport()] });
    await service.updateReport("r1", { title: "  Laporan Baru  ", month: 8, description: "" });
    expect(reports[0].title).toBe("Laporan Baru");
    expect(reports[0].month).toBe(8);
    expect(reports[0].description).toBeNull();
    expect(reports[0].status).toBe("COMPLETED");
  });

  it("rejects a period that another report of the same project already uses", async () => {
    const { service } = make({ reports: [baseReport(), baseReport({ id: "r2", month: 8 })] });
    await expect(service.updateReport("r1", { month: 8 })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.updateReport("r1", { title: "   " })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("moves a completed report back to DRAFT and validates the status", async () => {
    const { service, reports } = make({ reports: [baseReport()] });
    await service.updateStatus("r1", "DRAFT");
    expect(reports[0].status).toBe("DRAFT");
    await expect(service.updateStatus("r1", "BOGUS" as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
