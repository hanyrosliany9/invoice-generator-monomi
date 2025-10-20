import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectStatus } from "@prisma/client";
import { ProfitCalculationService } from "./profit-calculation.service";

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private profitCalc: ProfitCalculationService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    // Get project type to generate number
    const projectType = await this.prisma.projectTypeConfig.findUnique({
      where: { id: createProjectDto.projectTypeId },
    });

    if (!projectType) {
      throw new NotFoundException("Project type not found");
    }

    // Generate unique project number if not provided
    const projectNumber =
      createProjectDto.number ||
      (await this.generateProjectNumber(projectType.prefix));

    // Calculate base price from products if provided
    let basePrice = null;
    let priceBreakdown = null;

    if (createProjectDto.products && createProjectDto.products.length > 0) {
      basePrice = createProjectDto.products.reduce((total, product) => {
        const quantity = product.quantity || 1;
        return total + product.price * quantity;
      }, 0);

      priceBreakdown = {
        products: createProjectDto.products.map((product) => ({
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity || 1,
          subtotal: product.price * (product.quantity || 1),
        })),
        total: basePrice,
        calculatedAt: new Date().toISOString(),
      };
    }

    const {
      products: _products,
      clientId,
      projectTypeId,
      ...projectData
    } = createProjectDto;

    return this.prisma.project.create({
      data: {
        ...projectData,
        number: projectNumber,
        basePrice: basePrice,
        priceBreakdown: priceBreakdown || undefined,
        output: projectData.output || "", // Provide default empty string if not provided
        client: {
          connect: { id: clientId },
        },
        projectType: {
          connect: { id: projectTypeId },
        },
      },
      include: {
        client: true,
        projectType: true,
      },
    });
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: ProjectStatus,
    projectTypeId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (projectTypeId) where.projectTypeId = projectTypeId;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          projectType: true,
          _count: {
            select: {
              quotations: true,
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        projectType: true,
        quotations: {
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            quotations: true,
            invoices: true,
            expenses: true,
            costAllocations: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Proyek tidak ditemukan");
    }

    // Auto-calculate profit if needed (not calculated recently)
    const needsRecalc = await this.profitCalc.needsRecalculation(id);
    if (needsRecalc) {
      await this.profitCalc.calculateProjectProfitMargin(id);
      // Re-fetch with updated metrics
      return this.prisma.project.findUnique({
        where: { id },
        include: {
          client: true,
          projectType: true,
          quotations: {
            orderBy: { createdAt: "desc" },
          },
          invoices: {
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              quotations: true,
              invoices: true,
              expenses: true,
              costAllocations: true,
            },
          },
        },
      });
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const _project = await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        client: true,
        projectType: true,
      },
    });
  }

  async remove(id: string) {
    const _project = await this.findOne(id);

    // Check if project has associated records
    const hasRecords = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
          },
        },
      },
    });

    if (
      hasRecords &&
      (hasRecords._count.quotations > 0 || hasRecords._count.invoices > 0)
    ) {
      throw new Error(
        "Tidak dapat menghapus proyek yang memiliki quotation atau invoice",
      );
    }

    return this.prisma.project.delete({
      where: { id },
    });
  }

  async generateProjectNumber(typePrefix: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    // Count existing projects for this type and month
    const existingProjects = await this.prisma.project.count({
      where: {
        number: {
          startsWith: `PRJ-${typePrefix}-${year}${month}-`,
        },
      },
    });

    const sequence = (existingProjects + 1).toString().padStart(3, "0");
    return `PRJ-${typePrefix}-${year}${month}-${sequence}`;
  }

  async getProjectStats() {
    const [total, byStatus, byType] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      this.prisma.project.groupBy({
        by: ["projectTypeId"],
        _count: {
          projectTypeId: true,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get project type names for better display
    const projectTypes = await this.prisma.projectTypeConfig.findMany();
    const typeNameMap = projectTypes.reduce(
      (acc, type) => {
        acc[type.id] = type.name;
        return acc;
      },
      {} as Record<string, string>,
    );

    const typeCounts = byType.reduce(
      (acc, item) => {
        const typeName = typeNameMap[item.projectTypeId] || item.projectTypeId;
        acc[typeName] = item._count.projectTypeId;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Profitability statistics
    const profitableProjects = await this.prisma.project.count({
      where: { netMarginPercent: { gte: 0 } },
    });

    const avgMargins = await this.prisma.project.aggregate({
      _avg: {
        grossMarginPercent: true,
        netMarginPercent: true,
      },
      where: {
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
        profitCalculatedAt: { not: null },
      },
    });

    return {
      total,
      byStatus: statusCounts,
      byType: typeCounts,
      profitability: {
        profitable: profitableProjects,
        avgGrossMargin: avgMargins._avg.grossMarginPercent || 0,
        avgNetMargin: avgMargins._avg.netMarginPercent || 0,
      },
    };
  }

  /**
   * Manually recalculate profit margins for a specific project
   */
  async recalculateProfit(id: string, userId?: string) {
    const _project = await this.findOne(id);
    return this.profitCalc.calculateProjectProfitMargin(id, userId);
  }

  /**
   * Get cost breakdown for a project
   */
  async getCostBreakdown(id: string) {
    const _project = await this.findOne(id);
    return this.profitCalc.getCostBreakdown(id);
  }

  /**
   * Get profitability report with filtering
   */
  async getProfitabilityReport(filters?: {
    status?: string;
    minMargin?: number;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.minMargin !== undefined) {
      where.netMarginPercent = { gte: filters.minMargin };
    }

    // Only include projects with calculated profit
    where.profitCalculatedAt = { not: null };

    const projects = await this.prisma.project.findMany({
      where,
      select: {
        id: true,
        number: true,
        description: true,
        status: true,
        grossMarginPercent: true,
        netMarginPercent: true,
        totalPaidAmount: true,
        totalAllocatedCosts: true,
        netProfit: true,
        profitCalculatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
      orderBy: {
        netMarginPercent: "desc",
      },
    });

    return {
      projects,
      summary: {
        count: projects.length,
        avgGrossMargin:
          projects.reduce(
            (sum, p) =>
              sum + parseFloat(p.grossMarginPercent?.toString() || "0"),
            0,
          ) / (projects.length || 1),
        avgNetMargin:
          projects.reduce(
            (sum, p) => sum + parseFloat(p.netMarginPercent?.toString() || "0"),
            0,
          ) / (projects.length || 1),
      },
    };
  }
}
