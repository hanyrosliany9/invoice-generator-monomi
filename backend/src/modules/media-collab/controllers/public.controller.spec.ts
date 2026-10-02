import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PublicController } from "./public.controller";
import { MediaProjectsService } from "../services/media-projects.service";
import { MediaAssetsService } from "../services/media-assets.service";
import { MetadataService } from "../services/metadata.service";
import { MediaCommentsService } from "../services/media-comments.service";
import { BulkDownloadService } from "../services/bulk-download.service";
import { MediaService } from "../../media/media.service";
import { MediaShareService } from "../services/media-share.service";

/**
 * IDOR guards on the public (share-link) asset routes: a live share token for
 * project A must never read or write anything on an asset of project B.
 */
describe("PublicController (share-link asset scoping)", () => {
  let controller: PublicController;

  const sharedProject = {
    id: "project-shared",
    createdBy: "owner-1",
    publicAccessLevel: "COMMENT",
  };

  const assets: Record<string, { id: string; projectId: string }> = {
    "asset-in-share": { id: "asset-in-share", projectId: "project-shared" },
    "asset-elsewhere": { id: "asset-elsewhere", projectId: "project-private" },
  };

  // commentId -> assetId
  const comments: Record<string, string> = {
    "comment-on-shared-asset": "asset-in-share",
    "comment-on-private-asset": "asset-elsewhere",
  };

  const mockProjectsService = {
    getPublicProject: jest.fn(() => Promise.resolve({ ...sharedProject })),
  };
  const mockAssetsService = {
    findOneRaw: jest.fn((id: string) => Promise.resolve(assets[id] ?? null)),
    updateStatus: jest.fn(() => Promise.resolve({ ok: true })),
  };
  const mockMetadataService = {
    updateStarRating: jest.fn(() => Promise.resolve({ ok: true })),
  };
  const mockCommentsService = {
    findByAsset: jest.fn(() => Promise.resolve([{ id: "c1" }])),
    create: jest.fn((data: any) => Promise.resolve({ id: "new", ...data })),
    getCommentAssetId: jest.fn((id: string) =>
      Promise.resolve(comments[id] ?? null),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        { provide: MediaProjectsService, useValue: mockProjectsService },
        { provide: MediaAssetsService, useValue: mockAssetsService },
        { provide: MetadataService, useValue: mockMetadataService },
        { provide: MediaCommentsService, useValue: mockCommentsService },
        { provide: JwtService, useValue: {} },
        { provide: BulkDownloadService, useValue: {} },
        { provide: MediaService, useValue: {} },
        // Real shared service (the public routes delegate their IDOR guards
        // to it), wired to the mocks above.
        MediaShareService,
      ],
    }).compile();

    controller = module.get<PublicController>(PublicController);
  });

  describe("GET :token/assets/:assetId/comments", () => {
    it("returns comments for an asset in the shared project", async () => {
      const result = await controller.getPublicAssetComments(
        "tok",
        "asset-in-share",
      );

      expect(result).toEqual([{ id: "c1" }]);
      expect(mockCommentsService.findByAsset).toHaveBeenCalledWith(
        "asset-in-share",
      );
    });

    it("404s for an asset in a different project and never reads its comments", async () => {
      await expect(
        controller.getPublicAssetComments("tok", "asset-elsewhere"),
      ).rejects.toThrow(NotFoundException);
      expect(mockCommentsService.findByAsset).not.toHaveBeenCalled();
    });

    it("404s for an unknown asset", async () => {
      await expect(
        controller.getPublicAssetComments("tok", "does-not-exist"),
      ).rejects.toThrow(NotFoundException);
      expect(mockCommentsService.findByAsset).not.toHaveBeenCalled();
    });

    it("propagates an invalid/disabled share token before touching assets", async () => {
      mockProjectsService.getPublicProject.mockRejectedValueOnce(
        new NotFoundException("Link not found"),
      );

      await expect(
        controller.getPublicAssetComments("bad", "asset-in-share"),
      ).rejects.toThrow(NotFoundException);
      expect(mockAssetsService.findOneRaw).not.toHaveBeenCalled();
      expect(mockCommentsService.findByAsset).not.toHaveBeenCalled();
    });
  });

  describe("POST :token/assets/:assetId/comments", () => {
    it("creates a top-level guest comment on an asset in the shared project", async () => {
      await controller.createPublicComment("tok", "asset-in-share", {
        content: "hi",
        guestName: "Client",
      });

      expect(mockCommentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: "asset-in-share",
          content: "[Client]: hi",
          authorId: "owner-1",
        }),
      );
    });

    it("404s for an asset in a different project", async () => {
      await expect(
        controller.createPublicComment("tok", "asset-elsewhere", {
          content: "hi",
          guestName: "Client",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCommentsService.create).not.toHaveBeenCalled();
    });

    it("allows a reply whose parent comment is on the same asset", async () => {
      await controller.createPublicComment("tok", "asset-in-share", {
        content: "reply",
        guestName: "Client",
        parentId: "comment-on-shared-asset",
      });

      expect(mockCommentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: "comment-on-shared-asset" }),
      );
    });

    it("404s a reply whose parent comment belongs to an asset in another project", async () => {
      await expect(
        controller.createPublicComment("tok", "asset-in-share", {
          content: "reply",
          guestName: "Client",
          parentId: "comment-on-private-asset",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCommentsService.create).not.toHaveBeenCalled();
    });

    it("404s a reply to a non-existent parent comment", async () => {
      await expect(
        controller.createPublicComment("tok", "asset-in-share", {
          content: "reply",
          guestName: "Client",
          parentId: "nope",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCommentsService.create).not.toHaveBeenCalled();
    });

    it("400s a non-string parentId", async () => {
      await expect(
        controller.createPublicComment("tok", "asset-in-share", {
          content: "reply",
          guestName: "Client",
          parentId: { in: ["x"] } as any,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockCommentsService.getCommentAssetId).not.toHaveBeenCalled();
      expect(mockCommentsService.create).not.toHaveBeenCalled();
    });

    it("rejects VIEW_ONLY links", async () => {
      mockProjectsService.getPublicProject.mockResolvedValueOnce({
        ...sharedProject,
        publicAccessLevel: "VIEW_ONLY",
      });

      await expect(
        controller.createPublicComment("tok", "asset-in-share", {
          content: "hi",
          guestName: "Client",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("PUT :token/assets/:assetId/status", () => {
    it("404s for an asset in a different project", async () => {
      await expect(
        controller.updatePublicAssetStatus("tok", "asset-elsewhere", "APPROVED"),
      ).rejects.toThrow(NotFoundException);
      expect(mockAssetsService.updateStatus).not.toHaveBeenCalled();
    });

    it("updates an asset in the shared project", async () => {
      await controller.updatePublicAssetStatus("tok", "asset-in-share", "APPROVED");

      expect(mockAssetsService.updateStatus).toHaveBeenCalledWith(
        "asset-in-share",
        "owner-1",
        "APPROVED",
      );
    });
  });

  describe("PUT :token/assets/:assetId/rating", () => {
    it("404s for an asset in a different project", async () => {
      await expect(
        controller.updatePublicAssetRating("tok", "asset-elsewhere", 5),
      ).rejects.toThrow(NotFoundException);
      expect(mockMetadataService.updateStarRating).not.toHaveBeenCalled();
    });

    it("rates an asset in the shared project", async () => {
      await controller.updatePublicAssetRating("tok", "asset-in-share", 4);

      expect(mockMetadataService.updateStarRating).toHaveBeenCalledWith(
        "asset-in-share",
        4,
        "owner-1",
      );
    });
  });
});
