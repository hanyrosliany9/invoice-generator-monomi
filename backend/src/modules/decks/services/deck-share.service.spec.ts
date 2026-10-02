import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { DeckShareService, ResolvedDeckShare } from "./deck-share.service";

describe("DeckShareService", () => {
  const jobs: Record<string, any> = {};
  const exportService = {
    startPdfGeneration: jest.fn(async () => "job-1"),
    getJobStatus: jest.fn((id: string) => jobs[id] ?? null),
    getJobResult: jest.fn((id: string) => jobs[id] ?? null),
    cleanupJob: jest.fn(),
  };
  const prisma = {
    deck: { findUnique: jest.fn() },
    deckSlide: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === "slide-a" && where.deckId === "deck-a" ? { id: "slide-a" } : null,
      ),
    },
    deckSlideComment: {
      findUnique: jest.fn(async ({ where }: any) =>
        ({ "c-on-a": { slideId: "slide-a" }, "c-elsewhere": { slideId: "slide-z" } } as any)[where.id] ?? null,
      ),
      create: jest.fn(async ({ data }: any) => ({ id: "new", ...data })),
      findMany: jest.fn(async (_args: any) => [] as any[]),
    },
  };
  let service: DeckShareService;
  const portal = (scope: string): ResolvedDeckShare => ({
    deckId: "deck-a",
    createdById: "owner",
    canComment: true,
    canDownload: true,
    binding: { kind: "portal", portalScope: scope },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(jobs)) delete jobs[k];
    service = new DeckShareService(prisma as any, exportService as any);
  });

  it("public link without COMMENT level cannot comment", async () => {
    prisma.deck.findUnique.mockResolvedValueOnce({ id: "deck-a", isPublic: true, publicAccessLevel: "DOWNLOAD", createdById: "o" });
    const share = await service.resolvePublic("tok");
    await expect(
      service.createComment(share, { slideId: "slide-a", content: "x" }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("404s for a slide of another deck and for a reply parent on another slide", async () => {
    await expect(
      service.createComment(portal("s"), { slideId: "slide-z", content: "x" }, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.createComment(portal("s"), { slideId: "slide-a", content: "x", parentId: "c-elsewhere" }, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.createComment(portal("s"), { slideId: "slide-a", content: "x", parentId: "c-on-a" }, { name: "Budi" }),
    ).resolves.toMatchObject({ guestName: "Budi", parentId: "c-on-a" });
  });

  it("comment listing for public/portal never selects staff or guest emails", async () => {
    await service.listComments(portal("s"), "slide-a");
    const args: any = prisma.deckSlideComment.findMany.mock.calls[0][0];
    expect(args.include).toBeUndefined();
    const fields = JSON.stringify(args.select);
    expect(fields).not.toMatch(/email/i);
    expect(args.select.user).toEqual({ select: { id: true, name: true } });
    expect(args.select.replies.select.user).toEqual({ select: { id: true, name: true } });
    expect(args.select.guestName).toBe(true);
  });

  it("binds portal export jobs to the scope that started them", async () => {
    await service.startExport(portal("client-a:budi@alpha.co"));
    jobs["job-1"] = { id: "job-1", deckId: "deck-a", status: "completed", filePath: "/tmp/x.pdf", filename: "x.pdf" };

    expect(service.getExportStatus(portal("client-a:budi@alpha.co"), "job-1")).toMatchObject({ id: "job-1" });
    expect(() => service.getExportStatus(portal("client-a:eve@alpha.co"), "job-1")).toThrow(NotFoundException);
    expect(() => service.getExportFile(portal("client-a:eve@alpha.co"), "job-1")).toThrow(NotFoundException);
    expect(service.getExportFile(portal("client-a:budi@alpha.co"), "job-1")).toEqual({
      filePath: "/tmp/x.pdf",
      filename: "x.pdf",
    });
  });

  it("portal cannot read a job it did not start (e.g. a staff export of the same deck)", () => {
    jobs["staff-job"] = { id: "staff-job", deckId: "deck-a", status: "completed", filePath: "/tmp/s.pdf" };
    expect(() => service.getExportStatus(portal("client-a:budi@alpha.co"), "staff-job")).toThrow(NotFoundException);
  });

  it("job of another deck is 404", async () => {
    await service.startExport(portal("scope"));
    jobs["job-1"] = { id: "job-1", deckId: "deck-other", status: "completed" };
    expect(() => service.getExportStatus(portal("scope"), "job-1")).toThrow(NotFoundException);
  });

  describe("export job binding is never mutated by a mismatched poll", () => {
    const OWNER = "client-a:budi@alpha.co";
    const portalOn = (deckId: string, scope: string): ResolvedDeckShare => ({
      ...portal(scope),
      deckId,
    });
    const publicOn = (deckId: string): ResolvedDeckShare => ({
      deckId,
      createdById: "owner",
      canComment: false,
      canDownload: true,
      binding: { kind: "public", token: `tok-${deckId}` },
    });

    beforeEach(async () => {
      await service.startExport(portal(OWNER));
      jobs["job-1"] = { id: "job-1", deckId: "deck-a", status: "completed", filePath: "/tmp/x.pdf", filename: "x.pdf" };
    });

    const ownerStillWorks = () => {
      expect(service.getExportStatus(portal(OWNER), "job-1")).toMatchObject({ id: "job-1" });
      expect(service.getExportFile(portal(OWNER), "job-1")).toEqual({ filePath: "/tmp/x.pdf", filename: "x.pdf" });
      expect(exportService.cleanupJob).not.toHaveBeenCalled();
    };

    it("wrong-deck poll through the portal (same scope, another deck) is 404 and harmless", () => {
      expect(() => service.getExportStatus(portalOn("deck-b", OWNER), "job-1")).toThrow(NotFoundException);
      expect(() => service.getExportFile(portalOn("deck-b", OWNER), "job-1")).toThrow(NotFoundException);
      ownerStillWorks();
    });

    it("wrong-deck poll through a public DOWNLOAD link is 404 and harmless", () => {
      expect(() => service.getExportStatus(publicOn("deck-b"), "job-1")).toThrow(NotFoundException);
      ownerStillWorks();
    });

    it("a portal job is not visible through a public link of the SAME deck, and stays bound", () => {
      expect(() => service.getExportStatus(publicOn("deck-a"), "job-1")).toThrow(NotFoundException);
      ownerStillWorks();
    });

    it("another portal scope polling the job is 404 and harmless", () => {
      expect(() => service.getExportStatus(portal("client-b:eve@beta.co"), "job-1")).toThrow(NotFoundException);
      ownerStillWorks();
    });

    it("bad job ids are 404 without side effects", () => {
      for (const id of ["", "nope", undefined as any, 42 as any]) {
        expect(() => service.getExportStatus(portal(OWNER), id)).toThrow(NotFoundException);
      }
      ownerStillWorks();
    });

    it("the owner's download cleans up the job file and the binding", () => {
      service.getExportFile(portal(OWNER), "job-1");
      service.cleanupExport("job-1");
      expect(exportService.cleanupJob).toHaveBeenCalledWith("job-1");
      expect((service as any).portalExportJobs.has("job-1")).toBe(false);
    });

    it("bindings of jobs removed by the export TTL sweep are pruned", async () => {
      delete jobs["job-1"]; // DeckExportService.cleanupOldJobs removed job + file
      expect(() => service.getExportStatus(portal(OWNER), "job-1")).toThrow(NotFoundException);
      exportService.startPdfGeneration.mockResolvedValueOnce("job-2");
      await service.startExport(portal(OWNER));
      expect([...(service as any).portalExportJobs.keys()]).toEqual(["job-2"]);
    });

    it("public-started jobs still work through the public link", async () => {
      exportService.startPdfGeneration.mockResolvedValueOnce("job-pub");
      const { jobId } = await service.startExport(publicOn("deck-a"));
      jobs[jobId] = { id: jobId, deckId: "deck-a", status: "processing" };
      expect(service.getExportStatus(publicOn("deck-a"), jobId)).toMatchObject({ id: "job-pub" });
      expect(() => service.getExportStatus(portal(OWNER), jobId)).toThrow(NotFoundException);
    });
  });
});
