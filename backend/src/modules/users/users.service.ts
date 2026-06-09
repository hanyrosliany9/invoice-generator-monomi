import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { TransformationUtil } from "../../common/utils/transformation.util";
import { RefreshTokenService } from "../auth/refresh-token.service";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.create({
      data: createUserDto,
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
            auditLogs: true,
          },
        },
        preferences: true,
      },
    });

    // A videographer's workspace is Media Collaboration, so grant a new
    // videographer EDITOR access to every existing media project (mirrors the
    // auto-grant done at project-creation time).
    if (user.role === "VIDEOGRAPHER") {
      await this.syncVideographerMediaAccess(user.id);
    }

    return this.transformToResponse(user);
  }

  /**
   * Ensure a videographer is an EDITOR collaborator on every media project.
   * Called when a user is created as — or promoted to — VIDEOGRAPHER, so the
   * Media Collaboration list is never empty for them. Idempotent; failures are
   * logged, never thrown (the user write has already succeeded).
   */
  private async syncVideographerMediaAccess(userId: string): Promise<void> {
    try {
      const projects = await this.prisma.mediaProject.findMany({
        select: { id: true, createdBy: true },
      });
      if (projects.length === 0) return;

      const existing = await this.prisma.mediaCollaborator.findMany({
        where: { userId, projectId: { in: projects.map((p) => p.id) } },
        select: { projectId: true },
      });
      const have = new Set(existing.map((e) => e.projectId));

      const toAdd = projects
        .filter((p) => !have.has(p.id))
        .map((p) => ({
          projectId: p.id,
          userId,
          role: "EDITOR" as const,
          invitedBy: p.createdBy,
        }));

      if (toAdd.length > 0) {
        await this.prisma.mediaCollaborator.createMany({
          data: toAdd,
          skipDuplicates: true,
        });
        this.logger.log(
          `Granted videographer ${userId} EDITOR access to ${toAdd.length} media project(s)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to sync media access for videographer ${userId}: ${err}`,
      );
    }
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<UserResponseDto[]> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
            auditLogs: true,
          },
        },
        preferences: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return users.map((user) => this.transformToResponse(user));
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
            auditLogs: true,
          },
        },
        preferences: true,
      },
    });

    return user ? this.transformToResponse(user) : null;
  }

  async findByEmail(email: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmailForAuth(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const isPasswordChange = !!updateUserDto.password;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
            auditLogs: true,
          },
        },
        preferences: true,
      },
    });

    // Revoke all existing refresh tokens when password is changed so that
    // sessions on other devices are invalidated immediately.
    if (isPasswordChange) {
      try {
        const revoked = await this.refreshTokenService.revokeAllUserTokens(
          id,
          "password_changed",
        );
        this.logger.log(
          `Revoked ${revoked} refresh token(s) for user ${id} after password change`,
        );
      } catch (err) {
        // Log but do not fail the update — the password has already been saved.
        this.logger.error(
          `Failed to revoke refresh tokens for user ${id} after password change: ${err}`,
        );
      }
    }

    // If this update promotes the user to VIDEOGRAPHER, backfill their Media
    // Collaboration access just like a freshly-created videographer.
    if (updateUserDto.role === "VIDEOGRAPHER") {
      await this.syncVideographerMediaAccess(id);
    }

    return this.transformToResponse(user);
  }

  async remove(id: string): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    roleDistribution: Record<string, any>;
    recentUsers: any[];
  }> {
    const [totalUsers, roleStats, activeUsers, recentUsers] = await Promise.all(
      [
        this.prisma.user.count(),
        this.prisma.user.groupBy({
          by: ["role"],
          _count: true,
        }),
        this.prisma.user.count({
          where: { isActive: true },
        }),
        this.prisma.user.findMany({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
      ],
    );

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleDistribution: roleStats.reduce(
        (acc, stat) => {
          acc[stat.role] = stat._count;
          return acc;
        },
        {} as Record<string, any>,
      ),
      recentUsers: recentUsers.map((user) => ({
        ...user,
        createdAt: TransformationUtil.dateToString(user.createdAt),
      })),
    };
  }

  private transformToResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt:
        TransformationUtil.dateToString(user.createdAt) ||
        new Date().toISOString(),
      updatedAt:
        TransformationUtil.dateToString(user.updatedAt) ||
        new Date().toISOString(),
      _count: user._count,
      preferences: user.preferences
        ? {
            timezone: user.preferences.timezone,
            language: user.preferences.language,
            emailNotifications: user.preferences.emailNotifications,
            pushNotifications: user.preferences.pushNotifications,
            theme: user.preferences.theme,
          }
        : undefined,
    };
  }
}
