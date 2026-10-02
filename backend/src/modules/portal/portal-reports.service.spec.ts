import { NotFoundException } from "@nestjs/common";
import { PortalReportsService } from "./portal-reports.service";
import { PortalScopeService } from "./portal-scope.service";
import { SocialMediaReportService } from "../reports/services/social-media-report.service";

/**
 * "Back to draft" must hide a report from the client portal (list, detail and
 * PDF), and the PDF is always rendered on demand.
 */
function setup() {
  const store: Record<string, any> = {
    r1: {
      id: "r1",
      projectId: "p1",
      title: "Laporan September",
      description: null,
      month: 9,
      year: 2026,
      status: "COMPLETED",
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: "p1", number: "PRJ-1", description: "Proj", clientId: "c1", client: { id: "c1", name: "K", status: "active", isInternal: false } },
      sections: [{ id: "s1", title: "Harian", order: 1, rowCount: 3 }],
    },
  };
  const matches = (r: any, where: any): boolean => {
    if (where.id && r.id !== where.id) return false;
    if (where.status?.in && !where.status.in.includes(r.status)) return false;
    if (where.project?.clientId && r.project.clientId !== where.project.clientId) return false;
    return true;
  };
  const prisma: any = {
    socialMediaReport: {
      findMany: jest.fn(async ({ where }: any) =>
        Object.values(store)
          .filter((r) => matches(r, where))
          .map((r) => ({ ...r, _count: { sections: r.sections.length } })),
      ),
      findFirst: jest.fn(async ({ where }: any) => Object.values(store).find((r) => matches(r, where)) ?? null),
      findUnique: jest.fn(async ({ where }: any) => {
        const r = store[where.id];
        return r ? { ...r, _count: { sections: r.sections.length } } : null;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(store[where.id], data)),
    },
  };
  const pdf = { generateFullReportPDFFromData: jest.fn(async () => Buffer.from("%PDF-1.4 fake")) };
  const scope = new PortalScopeService(prisma);
  const portal = new PortalReportsService(prisma, scope, pdf as any);
  const staff = new SocialMediaReportService(prisma, {} as any, {} as any);
  return { portal, staff, store, pdf };
}

const res = () => {
  const headers: Record<string, any> = {};
  return { headers, setHeader: (k: string, v: any) => (headers[k] = v), send: jest.fn() } as any;
};

describe("portal report visibility", () => {
  it("a COMPLETED report is visible to the client", async () => {
    const { portal } = setup();
    expect((await portal.list("c1")).map((r) => r.id)).toEqual(["r1"]);
    expect((await portal.detail("c1", "r1")).id).toBe("r1");
  });

  it("reverting to DRAFT hides it from the portal list, detail and PDF", async () => {
    const { portal, staff, store, pdf } = setup();
    await staff.updateStatus("r1", "DRAFT");
    expect(store.r1.status).toBe("DRAFT");

    expect(await portal.list("c1")).toEqual([]);
    await expect(portal.detail("c1", "r1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(portal.sendPdf("c1", "r1", res())).rejects.toBeInstanceOf(NotFoundException);
    expect(pdf.generateFullReportPDFFromData).not.toHaveBeenCalled();

    // and it comes back when completed again
    await staff.updateStatus("r1", "COMPLETED");
    expect((await portal.list("c1")).map((r) => r.id)).toEqual(["r1"]);
  });

  it("always renders the PDF on demand (no stored-PDF path)", async () => {
    const { portal, pdf } = setup();
    const r = res();
    await portal.sendPdf("c1", "r1", r);
    expect(pdf.generateFullReportPDFFromData).toHaveBeenCalledWith("r1");
    expect(r.headers["Content-Type"]).toBe("application/pdf");
    expect(r.headers["Content-Disposition"]).toMatch(/Laporan-September-2026-09\.pdf/);
    expect(r.send).toHaveBeenCalled();
  });
});
