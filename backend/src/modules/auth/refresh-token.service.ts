import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";

interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Generate a new refresh token for a user
   * Returns: { token: string, expiresAt: Date }
   */
  async generateRefreshToken(
    userId: string,
    deviceInfo?: DeviceInfo,
  ): Promise<{ token: string; expiresAt: Date }> {
    // Generate cryptographically secure random token
    const token = randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        deviceId: deviceInfo?.deviceId,
      },
    });

    this.logger.log(`Generated refresh token for user ${userId}`);
    return { token, expiresAt };
  }

  /**
   * Validate refresh token and return user ID
   * Throws UnauthorizedException if invalid
   */
  async validateRefreshToken(token: string): Promise<string> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token tidak valid");
    }

    // Check if revoked
    if (refreshToken.isRevoked) {
      this.logger.warn(
        `Attempted use of revoked refresh token: ${token.slice(0, 10)}...`,
      );
      throw new UnauthorizedException("Refresh token telah dibatalkan");
    }

    // Check if expired
    if (refreshToken.expiresAt < new Date()) {
      // Auto-revoke expired token
      await this.revokeToken(token, "expired");
      throw new UnauthorizedException("Refresh token telah kedaluwarsa");
    }

    // Check if user is still active
    if (!refreshToken.user.isActive) {
      throw new UnauthorizedException("Akun Anda telah dinonaktifkan");
    }

    // Update last used timestamp
    await this.prisma.refreshToken.update({
      where: { token },
      data: { lastUsedAt: new Date() },
    });

    return refreshToken.userId;
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(token: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    this.logger.log(`Revoked refresh token: ${reason}`);
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    this.logger.log(
      `Revoked ${result.count} refresh tokens for user ${userId}`,
    );
    return result.count;
  }

  /**
   * Rotate refresh token (revoke old, create new)
   * Used when refreshing access token
   */
  async rotateRefreshToken(
    oldToken: string,
    deviceInfo?: DeviceInfo,
  ): Promise<{ token: string; expiresAt: Date; userId: string }> {
    // Validate old token first
    const userId = await this.validateRefreshToken(oldToken);

    // Generate new token
    const newTokenData = await this.generateRefreshToken(userId, deviceInfo);

    // Revoke old token and link to new one
    await this.prisma.refreshToken.updateMany({
      where: { token: oldToken },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "replaced",
        replacedBy: newTokenData.token,
      },
    });

    return { ...newTokenData, userId };
  }

  /**
   * Clean up expired tokens (run as cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isRevoked: true,
            revokedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          }, // 90 days old
        ],
      },
    });
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
    return result.count;
  }

  /**
   * Get user's active sessions (devices)
   */
  async getUserActiveSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
        deviceId: true,
      },
      orderBy: { lastUsedAt: "desc" },
    });
  }
}
