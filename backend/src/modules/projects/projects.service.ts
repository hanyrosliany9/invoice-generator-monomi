import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus, ProjectType } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    // Generate unique project number if not provided
    const projectNumber = createProjectDto.number || await this.generateProjectNumber(createProjectDto.type);
    
    // Calculate base price from products if provided
    let basePrice = null;
    let priceBreakdown = null;
    
    if (createProjectDto.products && createProjectDto.products.length > 0) {
      basePrice = createProjectDto.products.reduce((total, product) => {
        const quantity = product.quantity || 1;
        return total + (product.price * quantity);
      }, 0);
      
      priceBreakdown = {
        products: createProjectDto.products.map(product => ({
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
    
    const { products, ...projectData } = createProjectDto;
    
    return this.prisma.project.create({
      data: {
        ...projectData,
        number: projectNumber,
        basePrice: basePrice,
        priceBreakdown: priceBreakdown,
      },
      include: {
        client: true,
      },
    });
  }

  async findAll(page = 1, limit = 10, status?: ProjectStatus, type?: ProjectType) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          _count: {
            select: {
              quotations: true,
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
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
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        client: true,
      },
    });
  }

  async remove(id: string) {
    const project = await this.findOne(id);

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

    if (hasRecords._count.quotations > 0 || hasRecords._count.invoices > 0) {
      throw new Error('Tidak dapat menghapus proyek yang memiliki quotation atau invoice');
    }

    return this.prisma.project.delete({
      where: { id },
    });
  }

  async generateProjectNumber(projectType: ProjectType): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Add project type prefix
    const typePrefix = projectType === ProjectType.SOCIAL_MEDIA ? 'SM' : 'PH';
    
    // Count existing projects for this type and month
    const existingProjects = await this.prisma.project.count({
      where: {
        number: {
          startsWith: `PRJ-${typePrefix}-${year}${month}-`
        }
      }
    });
    
    const sequence = (existingProjects + 1).toString().padStart(3, '0');
    return `PRJ-${typePrefix}-${year}${month}-${sequence}`;
  }

  async getProjectStats() {
    const [total, byStatus, byType] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      this.prisma.project.groupBy({
        by: ['type'],
        _count: {
          type: true,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = byType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byStatus: statusCounts,
      byType: typeCounts,
    };
  }
}