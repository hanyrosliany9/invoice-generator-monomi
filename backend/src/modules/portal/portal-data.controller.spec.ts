import { NotFoundException } from "@nestjs/common";
import { PortalDataController } from "./portal-data.controller";
import { PortalScopeService } from "./portal-scope.service";
import { PortalReportsService } from "./portal-reports.service";
import { PortalSession } from "./portal-auth.service";
import { MediaShareService } from "../media-collab/services/media-share.service";
import { DeckShareService } from "../decks/services/deck-share.service";

/**
 * Cross-client isolation of the portal data API: a contact of client A must
 * get 404 for client B's content, reports, media projects, decks, assets and
 * media keys — and for B's resources addressed through A's own clientId.
 */

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, cond]: [string, any]) => {
    if (k === "OR") return (cond as any[]).some((w) => matches(row, w));
    const v = row?.[k];
    if (cond === null) return v === null;
    if (typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return cond.in.includes(v);
      if ("notIn" in cond) return !cond.notIn.includes(v);
      if ("not" in cond) return v !== cond.not;
      return v != null && matches(v, cond);
    }
    return v === cond;
  });
}

const projects = [
  { id: "proj-a", clientId: "client-a" },
  { id: "proj-b", clientId: "client-b" },
];
const projectById = (id: string | null) => projects.find((p) => p.id === id) ?? null;

const mediaProjects = [
  { id: "mp-a", clientId: "client-a", projectId: null, createdBy: "owner" },
  { id: "mp-a-via-project", clientId: null, projectId: "proj-a", createdBy: "owner" },
  { id: "mp-b", clientId: "client-b", projectId: null, createdBy: "owner" },
  // Mislinked legacy row: explicit client B, business project of client A.
  // The explicit clientId is authoritative -> B only.
  { id: "mp-mislinked", clientId: "client-b", projectId: "proj-a", createdBy: "owner" },
].map((m) => ({ ...m, project: projectById(m.projectId) }));

const decks = [
  { id: "deck-a", clientId: "client-a", projectId: null, status: "PUBLISHED", createdById: "owner" },
  { id: "deck-a-draft", clientId: "client-a", projectId: null, status: "DRAFT", createdById: "owner" },
  { id: "deck-b", clientId: "client-b", projectId: null, status: "PUBLISHED", createdById: "owner" },
  { id: "deck-a-via-project", clientId: null, projectId: "proj-a", status: "PUBLISHED", createdById: "owner" },
  // Mislinked legacy row: explicit client B, business project of client A.
  { id: "deck-mislinked", clientId: "client-b", projectId: "proj-a", status: "PUBLISHED", createdById: "owner" },
].map((d) => ({ ...d, project: projectById(d.projectId) }));

const reports = [
  { id: "rep-a", projectId: "proj-a", status: "COMPLETED" },
  { id: "rep-a-draft", projectId: "proj-a", status: "DRAFT" },
  { id: "rep-b", projectId: "proj-b", status: "SENT" },
].map((r) => ({ ...r, project: projectById(r.projectId) }));

const assets: Record<string, { id: string; projectId: string }> = {
  "asset-a": { id: "asset-a", projectId: "mp-a" },
  "asset-b": { id: "asset-b", projectId: "mp-b" },
  "asset-mis": { id: "asset-mis", projectId: "mp-mislinked" },
};

const mediaKeys: Record<string, string> = {
  "content/2026-01-01/a.jpg": "client-a",
  "content/2026-01-01/b.jpg": "client-b",
};

const pick = (row: any, select: any) =>
  row && select
    ? Object.fromEntries(Object.keys(select).filter((k) => k in row).map((k) => [k, row[k]]))
    : row;

describe("PortalDataController (cross-client isolation)", () => {
  let controller: PortalDataController;
  const session: PortalSession = {
    email: "budi@alpha.co",
    expiresAt: new Date(Date.now() + 3600_000),
    contacts: [
      {
        id: "ct-a",
        clientId: "client-a",
        name: "Budi",
        email: "budi@alpha.co",
        tokenVersion: 0,
        client: { id: "client-a", name: "Alpha", instagramHandle: null, instagramAvatarUrl: null, tiktokHandle: null },
      },
    ],
  };

  const prisma = {
    mediaProject: {
      findFirst: jest.fn(async ({ where, select }: any) => pick(mediaProjects.find((m) => matches(m, where)) ?? null, select)),
      findMany: jest.fn(async ({ where }: any) =>
        mediaProjects.filter((m) => matches(m, where)).map((m) => ({
          id: m.id, name: m.id, description: null, updatedAt: new Date(), _count: { assets: 0 }, assets: [],
        })),
      ),
    },
    deck: {
      findFirst: jest.fn(async ({ where, select }: any) => pick(decks.find((d) => matches(d, where)) ?? null, select)),
      findMany: jest.fn(async ({ where }: any) =>
        decks.filter((d) => matches(d, where)).map((d) => ({
          id: d.id, title: d.id, status: d.status, updatedAt: new Date(), _count: { slides: 1 },
        })),
      ),
    },
    deckSlide: { findFirst: jest.fn(async () => ({ id: "slide" })) },
    deckSlideComment: { findMany: jest.fn(async () => []) },
    socialMediaReport: {
      findFirst: jest.fn(async ({ where, select }: any) => pick(reports.find((r) => matches(r, where)) ?? null, select)),
      findMany: jest.fn(async ({ where }: any) =>
        reports.filter((r) => matches(r, where)).map((r) => ({
          id: r.id, title: r.id, description: null, month: 1, year: 2026, status: r.status, pdfUrl: null,
          projectId: r.projectId, createdAt: new Date(), updatedAt: new Date(),
          project: { number: "P-1", description: "Proj" }, _count: { sections: 1 }, sections: [{ title: "S" }],
        })),
      ),
      findUnique: jest.fn(async ({ where }: any) => ({
        id: where.id, pdfUrl: null, sections: [], project: {},
      })),
    },
  };

  const contentCalendar = {
    getClientSharedContent: jest.fn(async (clientId: string) => ({ client: { name: clientId }, items: [] })),
    assertClientOwnsMediaKey: jest.fn(async (clientId: string, key: string) => {
      if (mediaKeys[key] !== clientId) throw new NotFoundException("Media not found for this share");
    }),
  };
  const mediaService = { getFileStream: jest.fn(), generatePublicShareMediaToken: jest.fn(() => "media-jwt") };
  const mediaProjectsService = {
    getShareProjectById: jest.fn(async (id: string) => ({ id })),
    listShareAssets: jest.fn(async () => []),
    listShareFolders: jest.fn(async () => []),
    getProjectKeyPrefixes: jest.fn(async () => []),
  };
  const assetsService = {
    findOneRaw: jest.fn(async (id: string) => assets[id] ?? null),
    updateStatus: jest.fn(async () => ({ ok: true })),
  };
  const metadataService = { updateStarRating: jest.fn(async () => ({ ok: true })) };
  const commentsService = {
    findByAsset: jest.fn(async () => [{ id: "c1" }]),
    create: jest.fn(async (d: any) => ({ id: "new", ...d })),
    getCommentAssetId: jest.fn(async () => null),
  };
  const bulkDownloadService = {
    createShareJob: jest.fn(async () => ({ jobId: "j1" })),
    getShareJobStatus: jest.fn(async () => ({ jobId: "j1" })),
  };
  const exportService = { startPdfGeneration: jest.fn(), getJobStatus: jest.fn(), getJobResult: jest.fn(), cleanupJob: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    const scope = new PortalScopeService(prisma as any);
    const mediaShare = new MediaShareService(
      mediaProjectsService as any,
      assetsService as any,
      metadataService as any,
      commentsService as any,
      bulkDownloadService as any,
      mediaService as any,
    );
    const deckShare = new DeckShareService(prisma as any, exportService as any);
    const reportsService = new PortalReportsService(prisma as any, scope, {} as any);
    controller = new PortalDataController(
      prisma as any,
      scope,
      contentCalendar as any,
      mediaService as any,
      mediaProjectsService as any,
      mediaShare,
      deckShare,
      reportsService,
    );
  });

  describe("client B addressed directly", () => {
    it.each([
      ["content", () => controller.getContent(session, "client-b")],
      ["reports", () => controller.listReports(session, "client-b")],
      ["report", () => controller.getReport(session, "client-b", "rep-b")],
      ["media-projects", () => controller.listMediaProjects(session, "client-b")],
      ["media-project", () => controller.getMediaProject(session, "client-b", "mp-b")],
      ["asset comments", () => controller.getAssetComments(session, "client-b", "mp-b", "asset-b")],
      ["decks", () => controller.listDecks(session, "client-b")],
      ["deck", () => controller.getDeck(session, "client-b", "deck-b")],
    ])("404s for %s", async (_label, call) => {
      await expect(call()).rejects.toBeInstanceOf(NotFoundException);
    });

    it("never resolves client B's data", async () => {
      await controller.getContent(session, "client-b").catch(() => undefined);
      expect(contentCalendar.getClientSharedContent).not.toHaveBeenCalled();
    });
  });

  describe("client B ids addressed through client A", () => {
    it("404s for B's report", async () => {
      await expect(controller.getReport(session, "client-a", "rep-b")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("404s for B's media project (and every nested media route)", async () => {
      const calls = [
        () => controller.getMediaProject(session, "client-a", "mp-b"),
        () => controller.getMediaAssets(session, "client-a", "mp-b"),
        () => controller.getMediaFolders(session, "client-a", "mp-b"),
        () => controller.getMediaToken(session, "client-a", "mp-b"),
        () => controller.getAssetComments(session, "client-a", "mp-b", "asset-b"),
        () => controller.createAssetComment(session, "client-a", "mp-b", "asset-b", { content: "x" }),
        () => controller.updateAssetStatus(session, "client-a", "mp-b", "asset-b", { status: "APPROVED" }),
        () => controller.updateAssetRating(session, "client-a", "mp-b", "asset-b", { starRating: 5 }),
        () => controller.createBulkDownload(session, "client-a", "mp-b", { assetIds: ["asset-b"] } as any),
        () => controller.getBulkDownload(session, "client-a", "mp-b", "job"),
      ];
      for (const call of calls) {
        await expect(call()).rejects.toBeInstanceOf(NotFoundException);
      }
      expect(mediaProjectsService.getShareProjectById).not.toHaveBeenCalled();
      expect(commentsService.create).not.toHaveBeenCalled();
      expect(bulkDownloadService.createShareJob).not.toHaveBeenCalled();
    });

    it("404s for B's asset inside A's own media project (IDOR)", async () => {
      await expect(
        controller.getAssetComments(session, "client-a", "mp-a", "asset-b"),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        controller.createAssetComment(session, "client-a", "mp-a", "asset-b", { content: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        controller.updateAssetStatus(session, "client-a", "mp-a", "asset-b", { status: "APPROVED" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        controller.updateAssetRating(session, "client-a", "mp-a", "asset-b", { starRating: 3 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(commentsService.findByAsset).not.toHaveBeenCalled();
      expect(assetsService.updateStatus).not.toHaveBeenCalled();
      expect(metadataService.updateStarRating).not.toHaveBeenCalled();
    });

    it("404s for B's deck (and nested deck routes)", async () => {
      const calls = [
        () => controller.getDeck(session, "client-a", "deck-b"),
        () => controller.createDeckComment(session, "client-a", "deck-b", { slideId: "s", content: "x" }),
        () => controller.getDeckComments(session, "client-a", "deck-b", "s"),
        () => controller.startDeckExport(session, "client-a", "deck-b"),
        () => controller.getDeckExportStatus(session, "client-a", "deck-b", "job"),
      ];
      for (const call of calls) {
        await expect(call()).rejects.toBeInstanceOf(NotFoundException);
      }
      expect(exportService.startPdfGeneration).not.toHaveBeenCalled();
    });

    it("404s for B's content media key", async () => {
      await expect(
        controller.getContentMedia(session, "client-a", "content/2026-01-01/b.jpg", {} as any, {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mediaService.getFileStream).not.toHaveBeenCalled();
    });
  });

  describe("client A's own scope", () => {
    it("lists only A's media projects (direct or via business project)", async () => {
      const list = await controller.listMediaProjects(session, "client-a");
      expect(list.map((p) => p.id).sort()).toEqual(["mp-a", "mp-a-via-project"]);
    });

    it("lists only A's non-draft decks (direct or via business project)", async () => {
      const list = await controller.listDecks(session, "client-a");
      expect(list.map((d) => d.id).sort()).toEqual(["deck-a", "deck-a-via-project"]);
      await expect(controller.getDeck(session, "client-a", "deck-a-draft")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lists only A's completed/sent reports", async () => {
      const list = await controller.listReports(session, "client-a");
      expect(list.map((r) => r.id)).toEqual(["rep-a"]);
      await expect(controller.getReport(session, "client-a", "rep-a-draft")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("comments use the contact's name, not a client-supplied guestName", async () => {
      await controller.createAssetComment(session, "client-a", "mp-a", "asset-a", {
        content: "Looks good",
        guestName: "CEO of Monomi",
      });
      expect(commentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: "asset-a", content: "[Budi]: Looks good", authorId: "owner" }),
      );
    });

    it("binds bulk-download jobs to the portal scope (client + email)", async () => {
      await controller.createBulkDownload(session, "client-a", "mp-a", { assetIds: ["asset-a"] } as any);
      expect(bulkDownloadService.createShareJob).toHaveBeenCalledWith(
        { id: "mp-a", createdBy: "owner" },
        { kind: "portal", portalScope: "client-a:budi@alpha.co" },
        ["asset-a"],
        undefined,
      );
    });

    it("never issues a media token with an empty (allow-all) prefix list", async () => {
      await controller.getMediaToken(session, "client-a", "mp-a");
      const prefixes = (mediaService.generatePublicShareMediaToken.mock.calls[0] as unknown as unknown[])[2] as string[];
      expect(prefixes.length).toBeGreaterThan(0);
    });
  });
  describe("mislinked records (explicit clientId B + business project of A)", () => {
    const sessionB: PortalSession = {
      email: "eve@beta.co",
      expiresAt: new Date(Date.now() + 3600_000),
      contacts: [
        {
          id: "ct-b",
          clientId: "client-b",
          name: "Eve",
          email: "eve@beta.co",
          tokenVersion: 0,
          client: { id: "client-b", name: "Beta", instagramHandle: null, instagramAvatarUrl: null, tiktokHandle: null },
        },
      ],
    };

    it("are listed for the explicit client B only, never for A", async () => {
      const mediaA = await controller.listMediaProjects(session, "client-a");
      const mediaB = await controller.listMediaProjects(sessionB, "client-b");
      expect(mediaA.map((p) => p.id)).not.toContain("mp-mislinked");
      expect(mediaB.map((p) => p.id).sort()).toEqual(["mp-b", "mp-mislinked"]);

      const decksA = await controller.listDecks(session, "client-a");
      const decksB = await controller.listDecks(sessionB, "client-b");
      expect(decksA.map((d) => d.id)).not.toContain("deck-mislinked");
      expect(decksB.map((d) => d.id).sort()).toEqual(["deck-b", "deck-mislinked"]);
    });

    it("404 for A on every media detail / asset / comment / download / job route", async () => {
      const calls = [
        () => controller.getMediaProject(session, "client-a", "mp-mislinked"),
        () => controller.getMediaAssets(session, "client-a", "mp-mislinked"),
        () => controller.getMediaFolders(session, "client-a", "mp-mislinked"),
        () => controller.getMediaToken(session, "client-a", "mp-mislinked"),
        () => controller.getAssetComments(session, "client-a", "mp-mislinked", "asset-mis"),
        () => controller.createAssetComment(session, "client-a", "mp-mislinked", "asset-mis", { content: "x" }),
        () => controller.updateAssetStatus(session, "client-a", "mp-mislinked", "asset-mis", { status: "APPROVED" }),
        () => controller.updateAssetRating(session, "client-a", "mp-mislinked", "asset-mis", { starRating: 5 }),
        () => controller.createBulkDownload(session, "client-a", "mp-mislinked", { assetIds: ["asset-mis"] } as any),
        () => controller.getBulkDownload(session, "client-a", "mp-mislinked", "job"),
      ];
      for (const call of calls) {
        await expect(call()).rejects.toBeInstanceOf(NotFoundException);
      }
      expect(mediaProjectsService.getShareProjectById).not.toHaveBeenCalled();
      expect(commentsService.findByAsset).not.toHaveBeenCalled();
      expect(commentsService.create).not.toHaveBeenCalled();
      expect(assetsService.updateStatus).not.toHaveBeenCalled();
      expect(metadataService.updateStarRating).not.toHaveBeenCalled();
      expect(bulkDownloadService.createShareJob).not.toHaveBeenCalled();
      expect(bulkDownloadService.getShareJobStatus).not.toHaveBeenCalled();
    });

    it("404 for A on every deck detail / comment / export route", async () => {
      const calls = [
        () => controller.getDeck(session, "client-a", "deck-mislinked"),
        () => controller.createDeckComment(session, "client-a", "deck-mislinked", { slideId: "s", content: "x" }),
        () => controller.getDeckComments(session, "client-a", "deck-mislinked", "s"),
        () => controller.startDeckExport(session, "client-a", "deck-mislinked"),
        () => controller.getDeckExportStatus(session, "client-a", "deck-mislinked", "job"),
        () => controller.downloadDeckExport(session, "client-a", "deck-mislinked", "job", {} as any),
      ];
      for (const call of calls) {
        await expect(call()).rejects.toBeInstanceOf(NotFoundException);
      }
      expect(exportService.startPdfGeneration).not.toHaveBeenCalled();
    });

    it("remain fully usable by the explicit client B", async () => {
      await expect(controller.getMediaProject(sessionB, "client-b", "mp-mislinked")).resolves.toMatchObject({
        id: "mp-mislinked",
      });
      await expect(
        controller.getAssetComments(sessionB, "client-b", "mp-mislinked", "asset-mis"),
      ).resolves.toEqual([{ id: "c1" }]);
      exportService.startPdfGeneration.mockResolvedValueOnce("job-b");
      await expect(controller.startDeckExport(sessionB, "client-b", "deck-mislinked")).resolves.toEqual({
        jobId: "job-b",
      });
    });

    it("scope builders: explicit clientId wins, project fallback only when clientId is null", () => {
      const scope = new PortalScopeService(prisma as any);
      expect(scope.mediaProjectsWhere("client-a")).toEqual({
        OR: [{ clientId: "client-a" }, { clientId: null, project: { clientId: "client-a" } }],
      });
      expect(scope.decksWhere("client-a")).toMatchObject({
        OR: [{ clientId: "client-a" }, { clientId: null, project: { clientId: "client-a" } }],
      });
    });
  });
});
