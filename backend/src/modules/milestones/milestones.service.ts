import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ProjectMilestone, MilestoneStatus, Prisma } from '@prisma/client';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new project milestone
   */
  async create(dto: CreateMilestoneDto): Promise<ProjectMilestone> {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    // Validate milestone number is unique within project
    const existingMilestone = await this.prisma.projectMilestone.findUnique({
      where: {
        projectId_milestoneNumber: {
          projectId: dto.projectId,
          milestoneNumber: dto.milestoneNumber,
        },
      },
    });

    if (existingMilestone) {
      throw new ConflictException(
        `Milestone number ${dto.milestoneNumber} already exists for this project`
      );
    }

    // Validate predecessor exists if specified
    if (dto.predecessorId) {
      const predecessor = await this.prisma.projectMilestone.findUnique({
        where: { id: dto.predecessorId },
      });

      if (!predecessor) {
        throw new NotFoundException(
          `Predecessor milestone with ID ${dto.predecessorId} not found`
        );
      }

      if (predecessor.projectId !== dto.projectId) {
        throw new BadRequestException(
          'Predecessor milestone must be from the same project'
        );
      }
    }

    // Validate dates
    const plannedStart = new Date(dto.plannedStartDate);
    const plannedEnd = new Date(dto.plannedEndDate);

    if (plannedEnd <= plannedStart) {
      throw new BadRequestException(
        'Planned end date must be after planned start date'
      );
    }

    // AUTO-CALCULATE REVENUE if not provided
    const plannedRevenue = await this.calculatePlannedRevenue(
      dto.projectId,
      dto.plannedRevenue
    );

    // Create milestone
    return this.prisma.projectMilestone.create({
      data: {
        projectId: dto.projectId,
        milestoneNumber: dto.milestoneNumber,
        name: dto.name,
        nameId: dto.nameId,
        description: dto.description,
        descriptionId: dto.descriptionId,
        plannedStartDate: plannedStart,
        plannedEndDate: plannedEnd,
        plannedRevenue: new Prisma.Decimal(plannedRevenue),
        recognizedRevenue: new Prisma.Decimal(0),
        remainingRevenue: new Prisma.Decimal(plannedRevenue),
        estimatedCost: dto.estimatedCost
          ? new Prisma.Decimal(dto.estimatedCost)
          : null,
        actualCost: new Prisma.Decimal(0),
        priority: dto.priority || 'MEDIUM',
        predecessorId: dto.predecessorId,
        deliverables: dto.deliverables || null,
        notes: dto.notes,
        notesId: dto.notesId,
        status: 'PENDING',
      },
      include: {
        project: {
          select: {
            id: true,
            number: true,
            description: true,
          },
        },
        predecessor: {
          select: {
            id: true,
            milestoneNumber: true,
            name: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Find all milestones for a project
   */
  async findByProject(projectId: string): Promise<ProjectMilestone[]> {
    return this.prisma.projectMilestone.findMany({
      where: { projectId },
      include: {
        predecessor: {
          select: {
            id: true,
            milestoneNumber: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { milestoneNumber: 'asc' },
    });
  }

  /**
   * Find one milestone by ID
   */
  async findOne(id: string): Promise<ProjectMilestone> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            number: true,
            description: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        predecessor: {
          select: {
            id: true,
            milestoneNumber: true,
            name: true,
            status: true,
            plannedEndDate: true,
          },
        },
        successors: {
          select: {
            id: true,
            milestoneNumber: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }

    return milestone;
  }

  /**
   * Update milestone
   */
  async update(
    id: string,
    dto: UpdateMilestoneDto
  ): Promise<ProjectMilestone> {
    const milestone = await this.findOne(id);

    // Validate predecessor if changed
    if (dto.predecessorId && dto.predecessorId !== milestone.predecessorId) {
      const predecessor = await this.prisma.projectMilestone.findUnique({
        where: { id: dto.predecessorId },
      });

      if (!predecessor) {
        throw new NotFoundException(
          `Predecessor milestone with ID ${dto.predecessorId} not found`
        );
      }

      if (predecessor.projectId !== milestone.projectId) {
        throw new BadRequestException(
          'Predecessor milestone must be from the same project'
        );
      }

      // Check for circular dependencies
      if (await this.wouldCreateCircularDependency(id, dto.predecessorId)) {
        throw new BadRequestException(
          'Cannot set predecessor: would create circular dependency'
        );
      }
    }

    // Validate dates if provided
    if (dto.plannedStartDate || dto.plannedEndDate) {
      const startDate = dto.plannedStartDate
        ? new Date(dto.plannedStartDate)
        : milestone.plannedStartDate;
      const endDate = dto.plannedEndDate
        ? new Date(dto.plannedEndDate)
        : milestone.plannedEndDate;

      if (endDate && startDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Calculate delay if actual dates provided
    let delayDays = dto.delayDays;
    if (dto.actualEndDate && milestone.plannedEndDate) {
      const actual = new Date(dto.actualEndDate);
      const planned = new Date(milestone.plannedEndDate);
      const diffTime = actual.getTime() - planned.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      delayDays = diffDays > 0 ? diffDays : 0;
    }

    // Update milestone
    const updateData: any = {
      ...dto,
      delayDays,
    };

    // Convert numeric fields to Prisma.Decimal
    if (dto.plannedRevenue !== undefined) {
      updateData.plannedRevenue = new Prisma.Decimal(dto.plannedRevenue);
    }
    if (dto.estimatedCost !== undefined) {
      updateData.estimatedCost = new Prisma.Decimal(dto.estimatedCost);
    }
    if (dto.actualCost !== undefined) {
      updateData.actualCost = new Prisma.Decimal(dto.actualCost);
    }
    if (dto.completionPercentage !== undefined) {
      updateData.completionPercentage = new Prisma.Decimal(
        dto.completionPercentage
      );
    }

    // Convert date strings to Date objects
    if (dto.plannedStartDate) {
      updateData.plannedStartDate = new Date(dto.plannedStartDate);
    }
    if (dto.plannedEndDate) {
      updateData.plannedEndDate = new Date(dto.plannedEndDate);
    }
    if (dto.actualStartDate) {
      updateData.actualStartDate = new Date(dto.actualStartDate);
    }
    if (dto.actualEndDate) {
      updateData.actualEndDate = new Date(dto.actualEndDate);
    }
    if (dto.acceptedAt) {
      updateData.acceptedAt = new Date(dto.acceptedAt);
    }

    return this.prisma.projectMilestone.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            number: true,
            description: true,
          },
        },
        predecessor: true,
        successors: true,
      },
    });
  }

  /**
   * Delete milestone
   */
  async remove(id: string): Promise<void> {
    // First check if this milestone is a predecessor to any other milestones
    const successorCount = await this.prisma.projectMilestone.count({
      where: { predecessorId: id },
    });

    if (successorCount > 0) {
      throw new BadRequestException(
        'Cannot delete milestone: it is a predecessor to other milestones. Remove dependencies first.'
      );
    }

    await this.prisma.projectMilestone.delete({
      where: { id },
    });
  }

  /**
   * Update milestone progress
   */
  async updateProgress(
    id: string,
    percentage: number
  ): Promise<ProjectMilestone> {
    if (percentage < 0 || percentage > 100) {
      throw new BadRequestException(
        'Completion percentage must be between 0 and 100'
      );
    }

    // Auto-update status based on percentage
    let status: MilestoneStatus;
    if (percentage === 0) {
      status = 'PENDING';
    } else if (percentage < 100) {
      status = 'IN_PROGRESS';
    } else {
      status = 'COMPLETED';
    }

    return this.prisma.projectMilestone.update({
      where: { id },
      data: {
        completionPercentage: new Prisma.Decimal(percentage),
        status,
        actualStartDate: percentage > 0 ? new Date() : null,
        actualEndDate: percentage === 100 ? new Date() : null,
      },
    });
  }

  /**
   * Mark milestone as completed
   */
  async markAsCompleted(id: string): Promise<ProjectMilestone> {
    const milestone = await this.findOne(id);

    // Check if predecessor is completed (if exists)
    if (milestone.predecessorId) {
      const predecessor = await this.prisma.projectMilestone.findUnique({
        where: { id: milestone.predecessorId },
      });

      if (
        predecessor &&
        predecessor.status !== 'COMPLETED' &&
        predecessor.status !== 'ACCEPTED'
      ) {
        throw new BadRequestException(
          `Cannot complete milestone: predecessor milestone ${predecessor.milestoneNumber} is not completed`
        );
      }
    }

    return this.prisma.projectMilestone.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completionPercentage: new Prisma.Decimal(100),
        actualEndDate: new Date(),
      },
    });
  }

  /**
   * Check dependencies for a milestone
   */
  async checkDependencies(milestoneId: string): Promise<{
    canStart: boolean;
    reasons: string[];
    predecessorStatus: any;
  }> {
    const milestone = await this.findOne(milestoneId);

    const reasons: string[] = [];
    let canStart = true;
    let predecessorStatus = null;

    if (milestone.predecessorId) {
      const predecessor = await this.prisma.projectMilestone.findUnique({
        where: { id: milestone.predecessorId },
      });

      if (predecessor) {
        predecessorStatus = {
          id: predecessor.id,
          milestoneNumber: predecessor.milestoneNumber,
          name: predecessor.name,
          status: predecessor.status,
          completionPercentage: predecessor.completionPercentage,
        };

        if (
          predecessor.status !== 'COMPLETED' &&
          predecessor.status !== 'ACCEPTED' &&
          predecessor.status !== 'BILLED'
        ) {
          canStart = false;
          reasons.push(
            `Predecessor milestone ${predecessor.milestoneNumber} (${predecessor.name}) is not completed yet`
          );
        }
      }
    }

    return {
      canStart,
      reasons,
      predecessorStatus,
    };
  }

  /**
   * Check if setting a predecessor would create a circular dependency
   */
  private async wouldCreateCircularDependency(
    milestoneId: string,
    predecessorId: string
  ): Promise<boolean> {
    // A circular dependency exists if the predecessor (or any of its predecessors)
    // eventually depends on the current milestone

    const visited = new Set<string>();
    let currentId: string | null = predecessorId;

    while (currentId) {
      if (currentId === milestoneId) {
        return true; // Circular dependency found
      }

      if (visited.has(currentId)) {
        break; // Already visited, stop to prevent infinite loop
      }

      visited.add(currentId);

      const milestone: { predecessorId: string | null } | null =
        await this.prisma.projectMilestone.findUnique({
          where: { id: currentId },
          select: { predecessorId: true },
        });

      currentId = milestone?.predecessorId ?? null;
    }

    return false;
  }

  /**
   * Auto-calculate milestone revenue from project budget
   * Distributes project estimatedBudget equally across all milestones
   *
   * PSAK 72 Note: This is initial allocation only.
   * Finance team can adjust via Project Detail Page → Financial Tab
   *
   * @param projectId - Project ID
   * @param providedRevenue - Optional revenue value from form
   * @returns Calculated revenue value
   */
  private async calculatePlannedRevenue(
    projectId: string,
    providedRevenue?: number | null
  ): Promise<number> {
    // If revenue explicitly provided, use it
    if (providedRevenue !== undefined && providedRevenue !== null) {
      return Number(providedRevenue);
    }

    // Otherwise, auto-calculate from project budget
    // First get the project budget
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        estimatedBudget: true,
      },
    });

    if (!project?.estimatedBudget) {
      // No budget = zero revenue allocation
      console.warn(
        `Project ${projectId} has no estimatedBudget. Setting milestone revenue to 0.`
      );
      return 0;
    }

    // Count existing milestones
    const existingMilestonesCount = await this.prisma.projectMilestone.count({
      where: { projectId },
    });

    // Equal distribution across all milestones (including this one being created)
    const totalMilestones = existingMilestonesCount + 1;
    const budgetNumber = Number(project.estimatedBudget);
    const revenuePerMilestone = budgetNumber / totalMilestones;

    console.log(
      `Auto-calculated milestone revenue: ${revenuePerMilestone} ` +
        `(Project budget: ${budgetNumber} / ${totalMilestones} milestones)`
    );

    return Math.round(revenuePerMilestone);
  }
}
