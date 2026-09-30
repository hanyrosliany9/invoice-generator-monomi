import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BulkDownloadService } from "./bulk-download.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE_NAMES, REDIS_CLIENT } from "../../queue/queue.module";
import {
  BULK_DOWNLOAD_MAX_ASSETS,
  CreatePublicBulkDownloadJobDto,
} from "../dto/create-bulk-download-job.dto";
import { BulkDownloadJobStatus } from "../dto/bulk-download-job.dto";

describe("BulkDownloadService", () => {
  let service: BulkDownloadService;

  const SHARE_TOKEN = "share-token-a";
  const OTHER_TOKEN = "share-token-b";

  // Two projects; only project-a is behind SHARE_TOKEN.
  const assets = [
    { id: "asset-a1", projectId: "project-a" },
    { id: "asset-a2", projectId: "project-a" },
    { id: "asset-b1", projectId: "project-b" },
  ];

  let shareProjects: Record<string, any>;

  const mockPrismaService = {
    mediaProject: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(shareProjects[where.publicShareToken] ?? null),
      ),
    },
    mediaAsset: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          assets
            .filter(
              (a) =>
                where.id.in.includes(a.id) && a.projectId === where.projectId,
            )
            .map((a) => ({ id: a.id })),
        ),
      ),
    },
    mediaCollaborator: {
      findUnique: jest.fn().mockResolvedValue(null), // caller is not a collaborator
    },
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn(),
    del: jest.fn(),
  };

  const fakeJob = (data: any) => ({
    data,
    progress: { current: 0, total: data.assetIds.length, percent: 0 },
    timestamp: Date.now(),
    getState: jest.fn().mockResolvedValue("waiting"),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    shareProjects = {
      [SHARE_TOKEN]: {
        id: "project-a",
        isPublic: true,
        publicShareExpiresAt: null,
        publicAccessLevel: "VIEW_ONLY", // every live link is VIEW_ONLY
        createdBy: "owner-a",
      },
      [OTHER_TOKEN]: {
        id: "project-b",
        isPublic: true,
        publicShareExpiresAt: null,
        publicAccessLevel: "VIEW_ONLY",
        createdBy: "owner-b",
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkDownloadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QUEUE_NAMES.BULK_DOWNLOAD, useValue: mockQueue },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<BulkDownloadService>(BulkDownloadService);
  });

  describe("createPublicJob", () => {
    it("allows a VIEW_ONLY link to download", async () => {
      const result = await service.createPublicJob(SHARE_TOKEN, [
        "asset-a1",
        "asset-a2",
      ]);

      expect(result.status).toBe(BulkDownloadJobStatus.PENDING);
      expect(result.totalFiles).toBe(2);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it("drops asset IDs that belong to another project (IDOR guard)", async () => {
      const result = await service.createPublicJob(SHARE_TOKEN, [
        "asset-a1",
        "asset-b1",
      ]);

      expect(result.totalFiles).toBe(1);
      const [, jobData] = mockQueue.add.mock.calls[0];
      expect(jobData.assetIds).toEqual(["asset-a1"]);
      expect(jobData.projectId).toBe("project-a");
      expect(jobData.shareToken).toBe(SHARE_TOKEN);
      // Asset lookup is always scoped to the token's project
      expect(mockPrismaService.mediaAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: "project-a" }),
        }),
      );
    });

    it("rejects a request made up only of another project's asset IDs", async () => {
      await expect(
        service.createPublicJob(SHARE_TOKEN, ["asset-b1"]),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("rejects a disabled share link", async () => {
      shareProjects[SHARE_TOKEN].isPublic = false;

      await expect(
        service.createPublicJob(SHARE_TOKEN, ["asset-a1"]),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("rejects an expired share link", async () => {
      shareProjects[SHARE_TOKEN].publicShareExpiresAt = new Date(
        Date.now() - 1000,
      );

      await expect(
        service.createPublicJob(SHARE_TOKEN, ["asset-a1"]),
      ).rejects.toThrow("This public share link has expired");
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("rejects malformed or oversized assetIds before touching the DB", async () => {
      await expect(
        service.createPublicJob(SHARE_TOKEN, "asset-a1" as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPublicJob(SHARE_TOKEN, [{ not: "x" }] as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPublicJob(
          SHARE_TOKEN,
          Array.from({ length: BULK_DOWNLOAD_MAX_ASSETS + 1 }, (_, i) => `a${i}`),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.mediaAsset.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getPublicJobStatus", () => {
    it("returns status for a job created through the same share link", async () => {
      mockQueue.getJob.mockResolvedValue(
        fakeJob({
          assetIds: ["asset-a1"],
          projectId: "project-a",
          shareToken: SHARE_TOKEN,
        }),
      );

      const status = await service.getPublicJobStatus("job-1", SHARE_TOKEN);

      expect(status.jobId).toBe("job-1");
      expect(status.status).toBe(BulkDownloadJobStatus.PENDING);
      expect(status.totalFiles).toBe(1);
    });

    it("forbids reading another share link's job", async () => {
      mockQueue.getJob.mockResolvedValue(
        fakeJob({
          assetIds: ["asset-b1"],
          projectId: "project-b",
          shareToken: OTHER_TOKEN,
        }),
      );

      await expect(
        service.getPublicJobStatus("job-b", SHARE_TOKEN),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids reading an authenticated (non-public) job", async () => {
      mockQueue.getJob.mockResolvedValue(
        fakeJob({
          assetIds: ["asset-a1"],
          projectId: "project-a",
          userId: "someone",
        }),
      );

      await expect(
        service.getPublicJobStatus("job-auth", SHARE_TOKEN),
      ).rejects.toThrow(ForbiddenException);
    });

    it("stops serving job status once the share link is disabled", async () => {
      shareProjects[SHARE_TOKEN].isPublic = false;

      await expect(
        service.getPublicJobStatus("job-1", SHARE_TOKEN),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueue.getJob).not.toHaveBeenCalled();
    });
  });

  describe("createJob (authenticated) SUPER_ADMIN read access", () => {
    const dto = { assetIds: ["asset-b1"], projectId: "project-b" };

    it("lets SUPER_ADMIN download from a project they don't collaborate on", async () => {
      const result = await service.createJob(dto, "super-admin-1", "SUPER_ADMIN");

      expect(result.totalFiles).toBe(1);
      expect(mockPrismaService.mediaCollaborator.findUnique).not.toHaveBeenCalled();
    });

    it("still denies a non-collaborator ADMIN", async () => {
      await expect(service.createJob(dto, "admin-1", "ADMIN")).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("CreatePublicBulkDownloadJobDto", () => {
    const check = (body: object) =>
      validate(plainToInstance(CreatePublicBulkDownloadJobDto, body));

    it("accepts up to the shared limit (parity with the authenticated job)", async () => {
      const ids = Array.from({ length: BULK_DOWNLOAD_MAX_ASSETS }, (_, i) => `a${i}`);
      expect(await check({ assetIds: ids })).toHaveLength(0);
      expect(BULK_DOWNLOAD_MAX_ASSETS).toBeGreaterThan(500);
    });

    it("rejects empty, non-string and oversized lists", async () => {
      expect((await check({ assetIds: [] })).length).toBeGreaterThan(0);
      expect((await check({ assetIds: [1, 2] })).length).toBeGreaterThan(0);
      expect(
        (
          await check({
            assetIds: Array.from(
              { length: BULK_DOWNLOAD_MAX_ASSETS + 1 },
              (_, i) => `a${i}`,
            ),
          })
        ).length,
      ).toBeGreaterThan(0);
    });
  });
});
