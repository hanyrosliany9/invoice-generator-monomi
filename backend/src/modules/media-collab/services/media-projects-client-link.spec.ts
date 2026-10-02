import { BadRequestException } from "@nestjs/common";
import { MediaProjectsService } from "./media-projects.service";

/**
 * Write-time client/project consistency for media projects: an explicit
 * clientId must match the linked business project's client (the client portal
 * treats clientId as authoritative), judged on the values after the write.
 */
describe("MediaProjectsService client/project consistency", () => {
  const stored: Record<string, { clientId: string | null; projectId: string | null }> = {};
  const prisma = {
    client: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
    project: {
      findUnique: jest.fn(async ({ where }: any) =>
        ({
          "proj-a": { id: "proj-a", clientId: "client-a" },
          "proj-b": { id: "proj-b", clientId: "client-b" },
        } as any)[where.id] ?? null,
      ),
    },
    mediaFolder: { findUnique: jest.fn(async () => ({ id: "f" })) },
    mediaProject: {
      create: jest.fn(async ({ data }: any) => ({ id: "mp-new", ...data })),
      findUnique: jest.fn(async ({ where }: any) => stored[where.id] ?? null),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    },
    mediaCollaborator: {
      create: jest.fn(async () => ({})),
      findUnique: jest.fn(async () => ({ role: "OWNER" })),
      findMany: jest.fn(async () => []),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    user: { findMany: jest.fn(async () => []) },
  };
  let service: MediaProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(stored)) delete stored[k];
    service = new MediaProjectsService(prisma as any, {} as any);
  });

  describe("create", () => {
    it("rejects a clientId that disagrees with the project's client (400, nothing written)", async () => {
      await expect(
        service.create("u1", { name: "x", clientId: "client-b", projectId: "proj-a" } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.mediaProject.create).not.toHaveBeenCalled();
    });

    it.each([
      [{ clientId: "client-a", projectId: "proj-a" }],
      [{ projectId: "proj-a" }],
      [{ clientId: "client-b" }],
      [{}],
    ])("accepts consistent / partial links %p", async (links) => {
      await expect(service.create("u1", { name: "x", ...links } as any)).resolves.toHaveProperty("id");
    });
  });

  describe("update (judged on the merged values)", () => {
    it("rejects changing only clientId to disagree with the stored project", async () => {
      stored["mp-1"] = { clientId: "client-a", projectId: "proj-a" };
      await expect(service.update("mp-1", "u1", { clientId: "client-b" } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.mediaProject.update).not.toHaveBeenCalled();
    });

    it("rejects changing only projectId to one of another client", async () => {
      stored["mp-1"] = { clientId: "client-a", projectId: null };
      await expect(service.update("mp-1", "u1", { projectId: "proj-b" } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("accepts moving both together, or clearing clientId", async () => {
      stored["mp-1"] = { clientId: "client-a", projectId: "proj-a" };
      await expect(
        service.update("mp-1", "u1", { clientId: "client-b", projectId: "proj-b" } as any),
      ).resolves.toHaveProperty("id");
      await expect(service.update("mp-1", "u1", { clientId: null } as any)).resolves.toHaveProperty("id");
    });

    it("does not re-check when neither link changes (legacy rows stay editable)", async () => {
      stored["mp-legacy"] = { clientId: "client-b", projectId: "proj-a" };
      await expect(service.update("mp-legacy", "u1", { name: "renamed" } as any)).resolves.toHaveProperty("id");
      expect(prisma.project.findUnique).not.toHaveBeenCalled();
    });
  });
});
