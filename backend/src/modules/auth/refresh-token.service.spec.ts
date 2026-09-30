import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RefreshTokenService } from "./refresh-token.service";
import { PrismaService } from "../prisma/prisma.service";

describe("RefreshTokenService", () => {
  let service: RefreshTokenService;

  const mockPrismaService = {
    refreshToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  describe("validateRefreshToken", () => {
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["empty string", ""],
      ["object (query-filter injection)", { not: "x" }],
    ])(
      "should throw UnauthorizedException without querying Prisma for %s",
      async (_label, token) => {
        await expect(
          service.validateRefreshToken(token as any),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockPrismaService.refreshToken.findUnique).not.toHaveBeenCalled();
      },
    );

    it("should throw UnauthorizedException for an unknown token", async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.validateRefreshToken("unknown")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should return the userId for a valid token", async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        token: "valid",
        userId: "user-1",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        user: { isActive: true },
      });

      await expect(service.validateRefreshToken("valid")).resolves.toBe(
        "user-1",
      );
    });
  });

  describe("revokeToken", () => {
    it("should be a no-op for a missing/non-string token (never revoke other users' tokens)", async () => {
      await service.revokeToken(undefined as any, "logout");
      await service.revokeToken({ not: "x" } as any, "logout");

      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("should revoke exactly the given token", async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeToken("tok", "logout");

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token: "tok", isRevoked: false } }),
      );
    });
  });
});
