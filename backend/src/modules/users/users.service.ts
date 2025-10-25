import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { TransformationUtil } from "../../common/utils/transformation.util";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

    return this.transformToResponse(user);
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
      createdAt: TransformationUtil.dateToString(user.createdAt) || new Date().toISOString(),
      updatedAt: TransformationUtil.dateToString(user.updatedAt) || new Date().toISOString(),
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
