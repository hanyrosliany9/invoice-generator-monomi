import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectTypeDto } from "./dto/create-project-type.dto";
import { UpdateProjectTypeDto } from "./dto/update-project-type.dto";

@Injectable()
export class ProjectTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectTypeDto: CreateProjectTypeDto) {
    // Check if code already exists
    const existingType = await this.prisma.projectTypeConfig.findUnique({
      where: { code: createProjectTypeDto.code },
    });

    if (existingType) {
      throw new ConflictException(
        `Project type with code '${createProjectTypeDto.code}' already exists`,
      );
    }

    // If this is set as default, remove default from other types
    if (createProjectTypeDto.isDefault) {
      await this.prisma.projectTypeConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.projectTypeConfig.create({
      data: {
        ...createProjectTypeDto,
        color: createProjectTypeDto.color || "#1890ff",
      },
    });
  }

  async findAll() {
    return this.prisma.projectTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async findOne(id: string) {
    const projectType = await this.prisma.projectTypeConfig.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            number: true,
            description: true,
            status: true,
          },
        },
      },
    });

    if (!projectType) {
      throw new NotFoundException(`Project type with ID '${id}' not found`);
    }

    return projectType;
  }

  async update(id: string, updateProjectTypeDto: UpdateProjectTypeDto) {
    const existingType = await this.prisma.projectTypeConfig.findUnique({
      where: { id },
    });

    if (!existingType) {
      throw new NotFoundException(`Project type with ID '${id}' not found`);
    }

    // Check if code already exists (excluding current type)
    if (
      updateProjectTypeDto.code &&
      updateProjectTypeDto.code !== existingType.code
    ) {
      const codeExists = await this.prisma.projectTypeConfig.findUnique({
        where: { code: updateProjectTypeDto.code },
      });

      if (codeExists) {
        throw new ConflictException(
          `Project type with code '${updateProjectTypeDto.code}' already exists`,
        );
      }
    }

    // If this is set as default, remove default from other types
    if (updateProjectTypeDto.isDefault) {
      await this.prisma.projectTypeConfig.updateMany({
        where: {
          isDefault: true,
          NOT: { id: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.projectTypeConfig.update({
      where: { id },
      data: updateProjectTypeDto,
    });
  }

  async remove(id: string) {
    const existingType = await this.prisma.projectTypeConfig.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });

    if (!existingType) {
      throw new NotFoundException(`Project type with ID '${id}' not found`);
    }

    // Check if there are projects using this type
    if (existingType.projects.length > 0) {
      throw new ConflictException(
        `Cannot delete project type '${existingType.name}' because it is used by ${existingType.projects.length} project(s)`,
      );
    }

    return this.prisma.projectTypeConfig.delete({
      where: { id },
    });
  }

  async toggleActive(id: string) {
    const existingType = await this.prisma.projectTypeConfig.findUnique({
      where: { id },
    });

    if (!existingType) {
      throw new NotFoundException(`Project type with ID '${id}' not found`);
    }

    return this.prisma.projectTypeConfig.update({
      where: { id },
      data: { isActive: !existingType.isActive },
    });
  }

  async updateSortOrder(updates: { id: string; sortOrder: number }[]) {
    const operations = updates.map((update) =>
      this.prisma.projectTypeConfig.update({
        where: { id: update.id },
        data: { sortOrder: update.sortOrder },
      }),
    );

    await this.prisma.$transaction(operations);
    return this.findAll();
  }

  async getProjectTypeStats() {
    const projectTypes = await this.prisma.projectTypeConfig.findMany({
      where: { isActive: true },
      include: {
        projects: {
          select: {
            id: true,
            status: true,
            basePrice: true,
            createdAt: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return projectTypes.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      color: type.color,
      totalProjects: type.projects.length,
      activeProjects: type.projects.filter((p) => p.status === "IN_PROGRESS")
        .length,
      completedProjects: type.projects.filter((p) => p.status === "COMPLETED")
        .length,
      totalRevenue: type.projects.reduce(
        (sum, p) => sum + (p.basePrice?.toNumber() || 0),
        0,
      ),
      recentProjects: type.projects
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 3),
    }));
  }
}
