import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { MediaProjectsService } from "./media-projects.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";

/**
 * Minimal in-memory evaluator for the MediaProject `where` shapes produced by
 * mediaProjectReadWhere(), so the tests assert on *which projects come back*
 * rather than on the exact Prisma query object.
 */
type FakeProject = {
  id: string;
  createdBy: string;
  isPublic: boolean;
  collaboratorIds: string[];
  /** Linked business project (MediaProject.projectId). */
  bizProjectId?: string;
};

function matches(project: FakeProject, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.AND) return where.AND.every((w: any) => matches(project, w));
  if (where.projectId !== undefined) return project.bizProjectId === where.projectId;
  if (where.OR) return where.OR.some((w: any) => matches(project, w));
  if (where.collaborators?.some?.userId) {
    return project.collaboratorIds.includes(where.collaborators.some.userId);
  }
  if (where.createdBy !== undefined) return project.createdBy === where.createdBy;
  if (where.isPublic !== undefined) return project.isPublic === where.isPublic;
  throw new Error(`Unsupported where in test: ${JSON.stringify(where)}`);
}

describe("MediaProjectsService (SUPER_ADMIN read access)", () => {
  let service: MediaProjectsService;

  const projects: FakeProject[] = [
    {
      id: "project-mine",
      createdBy: "videographer-1",
      isPublic: false,
      collaboratorIds: ["videographer-1"],
      bizProjectId: "biz-1",
    },
    {
      id: "project-other",
      createdBy: "someone-else",
      isPublic: false,
      collaboratorIds: ["someone-else"],
      bizProjectId: "biz-1",
    },
    {
      id: "project-unlinked",
      createdBy: "videographer-1",
      isPublic: false,
      collaboratorIds: ["videographer-1"],
    },
  ];

  const mockPrismaService = {
    mediaProject: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(projects.filter((p) => matches(p, where))),
      ),
      findUnique: jest.fn(({ where }) => {
        const p = projects.find((x) => x.id === where.id);
        return Promise.resolve(
          p
            ? {
                ...p,
                collaborators: p.collaboratorIds.map((userId) => ({ userId })),
              }
            : null,
        );
      }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mediaCollaborator: {
      findUnique: jest.fn(({ where }) => {
        const { projectId, userId } = where.projectId_userId;
        const p = projects.find((x) => x.id === projectId);
        return Promise.resolve(
          p && p.collaboratorIds.includes(userId)
            ? { projectId, userId, role: "OWNER" }
            : null,
        );
      }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MediaService, useValue: { deleteFile: jest.fn() } },
      ],
    }).compile();

    service = module.get<MediaProjectsService>(MediaProjectsService);
  });

  describe("findAll", () => {
    it("SUPER_ADMIN sees every project, including ones they don't collaborate on", async () => {
      const result = await service.findAll("super-admin-1", "SUPER_ADMIN");

      expect(result.map((p: any) => p.id).sort()).toEqual([
        "project-mine",
        "project-other",
        "project-unlinked",
      ]);
    });

    it("a normal user only sees projects they collaborate on", async () => {
      const result = await service.findAll("videographer-1", "VIDEOGRAPHER");

      expect(result.map((p: any) => p.id).sort()).toEqual([
        "project-mine",
        "project-unlinked",
      ]);
    });

    it("ADMIN does not get the SUPER_ADMIN bypass", async () => {
      const result = await service.findAll("admin-1", "ADMIN");

      expect(result).toEqual([]);
    });

    it("no role (unknown caller) falls back to collaborator-only", async () => {
      const result = await service.findAll("super-admin-1");

      expect(result).toEqual([]);
    });
  });

  describe("findByBizProject (GET /media-collab/projects?bizProjectId=)", () => {
    it("a normal user only sees linked projects they collaborate on", async () => {
      const result = await service.findByBizProject(
        "biz-1",
        "videographer-1",
        "VIDEOGRAPHER",
      );

      expect(result.map((p: any) => p.id)).toEqual(["project-mine"]);
    });

    it("a user who collaborates on none of the linked projects gets an empty list", async () => {
      const result = await service.findByBizProject("biz-1", "admin-1", "ADMIN");

      expect(result).toEqual([]);
    });

    it("no role (unknown caller) falls back to collaborator-only", async () => {
      const result = await service.findByBizProject("biz-1", "super-admin-1");

      expect(result).toEqual([]);
    });

    it("SUPER_ADMIN sees every project linked to the business project, and only those", async () => {
      const result = await service.findByBizProject(
        "biz-1",
        "super-admin-1",
        "SUPER_ADMIN",
      );

      expect(result.map((p: any) => p.id).sort()).toEqual([
        "project-mine",
        "project-other",
      ]);
    });

    it("always scopes the query to the requested business project", async () => {
      await service.findByBizProject("biz-1", "videographer-1", "VIDEOGRAPHER");

      const { where } = mockPrismaService.mediaProject.findMany.mock.calls[0][0];
      expect(where.AND).toEqual(
        expect.arrayContaining([{ projectId: "biz-1" }]),
      );
    });
  });

  describe("findOne", () => {
    it("SUPER_ADMIN can open a project they don't collaborate on", async () => {
      const result = await service.findOne(
        "project-other",
        "super-admin-1",
        "SUPER_ADMIN",
      );

      expect(result.id).toBe("project-other");
    });

    it("a non-collaborator without SUPER_ADMIN is denied", async () => {
      await expect(
        service.findOne("project-other", "admin-1", "ADMIN"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("write paths keep collaborator checks (no SUPER_ADMIN bypass)", () => {
    it("SUPER_ADMIN cannot delete a project they are not OWNER of", async () => {
      await expect(
        service.remove("project-other", "super-admin-1"),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.mediaProject.delete).not.toHaveBeenCalled();
    });

    it("SUPER_ADMIN cannot update a project they don't collaborate on", async () => {
      await expect(
        service.update("project-other", "super-admin-1", { name: "x" } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.mediaProject.update).not.toHaveBeenCalled();
    });
  });
});
