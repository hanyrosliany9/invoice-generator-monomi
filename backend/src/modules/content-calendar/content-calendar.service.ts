import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";
import {
  ContentCalendarItem,
  ContentStatus,
  ContentPlatform,
  UserRole,
  Prisma,
} from "@prisma/client";
import { validateMediaForPlatforms } from "./content-calendar.constants";

/**
 * ContentCalendarService - Business Logic for Content Planning
 *
 * Features:
 * - CRUD operations for content calendar items
 * - Media management integration with R2
 * - Filtering by status, platform, client, project, campaign
 * - Scheduling and publishing workflows
 * - Cascade deletion of associated media
 *
 * Security:
 * - Role-based access control
 * - Users can only edit/delete their own content (unless SUPER_ADMIN)
 */

export interface ContentWithRelations extends ContentCalendarItem {
  media?: any[];
  client?: any;
  project?: any;
  // DELETED: campaign relation - 2025-11-09
  creator?: any;
}

@Injectable()
export class ContentCalendarService {
  private readonly logger = new Logger(ContentCalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new content calendar item
   */
  async create(
    createDto: CreateContentDto,
    userId: string,
  ): Promise<ContentWithRelations> {
    // Validate media count against platform limits
    if (
      createDto.platforms &&
      createDto.platforms.length > 0 &&
      createDto.media &&
      createDto.media.length > 0
    ) {
      const validation = validateMediaForPlatforms(
        createDto.platforms,
        createDto.media.length,
      );
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }
    }

    // Validate references if provided
    if (createDto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: createDto.clientId },
      });
      if (!client) {
        throw new BadRequestException(
          `Client with ID ${createDto.clientId} not found`,
        );
      }
    }

    if (createDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createDto.projectId },
        include: { client: true },
      });
      if (!project) {
        throw new BadRequestException(
          `Project with ID ${createDto.projectId} not found`,
        );
      }

      // Validate client-project relationship
      if (createDto.clientId && project.clientId !== createDto.clientId) {
        throw new BadRequestException(
          `Project "${project.description}" belongs to client "${project.client.name}", not the selected client. Please select a matching project.`,
        );
      }
    }

    // DELETED: Campaign validation - 2025-11-09
    // if (createDto.campaignId) {
    //   const campaign = await this.prisma.campaign.findUnique({
    //     where: { id: createDto.campaignId },
    //   });
    //   if (!campaign) {
    //     throw new BadRequestException(
    //     `Campaign with ID ${createDto.campaignId} not found`,
    //   );
    // }
    // }

    // Create content with media
    const content = await this.prisma.contentCalendarItem.create({
      data: {
        caption: createDto.caption,
        scheduledAt: createDto.scheduledAt
          ? new Date(createDto.scheduledAt)
          : null,
        status: createDto.status || ContentStatus.DRAFT,
        platforms: createDto.platforms || [],
        clientId: createDto.clientId,
        projectId: createDto.projectId,
        // DELETED: campaignId - 2025-11-09
        createdBy: userId,
        media: {
          create: createDto.media?.map((m, index) => ({
            url: m.url,
            key: m.key,
            type: this.determineMediaType(m.mimeType),
            mimeType: m.mimeType,
            size: m.size,
            width: m.width,
            height: m.height,
            duration: m.duration,
            originalName: m.originalName,
            thumbnailUrl: m.thumbnailUrl,
            thumbnailKey: m.thumbnailKey,
            order: m.order !== undefined ? m.order : index, // Use provided order or fallback to index
          })),
        },
      },
      include: {
        media: {
          orderBy: { order: "asc" }, // Order media by carousel order
        },
        client: true,
        project: true,
        // DELETED: campaign include - 2025-11-09
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(
      `✅ Content created: ${content.id} - ${content.caption.substring(0, 50)}...`,
    );

    return content;
  }

  /**
   * Find all content calendar items with optional filters
   */
  async findAll(filters?: {
    status?: ContentStatus;
    platform?: ContentPlatform;
    clientId?: string;
    projectId?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ContentWithRelations[]> {
    const where: Prisma.ContentCalendarItemWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.platform) {
      where.platforms = {
        has: filters.platform,
      };
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    // DELETED: Campaign filter - 2025-11-09

    if (filters?.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledAt = {};
      if (filters.startDate) {
        where.scheduledAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.scheduledAt.lte = filters.endDate;
      }
    }

    const contents = await this.prisma.contentCalendarItem.findMany({
      where,
      include: {
        media: {
          orderBy: { order: "asc" }, // Order media by carousel order
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            number: true,
            description: true,
          },
        },
        // DELETED: campaign include - 2025-11-09
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    });

    return contents;
  }

  /**
   * Find a single content calendar item by ID
   */
  async findOne(id: string): Promise<ContentWithRelations> {
    const content = await this.prisma.contentCalendarItem.findUnique({
      where: { id },
      include: {
        media: {
          orderBy: { order: "asc" }, // Order media by carousel order
        },
        client: true,
        project: true,
        // DELETED: campaign include - 2025-11-09
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    return content;
  }

  /**
   * Update a content calendar item
   */
  async update(
    id: string,
    updateDto: UpdateContentDto,
    userId: string,
    userRole: UserRole,
  ): Promise<ContentWithRelations> {
    // Check if content exists and user has permission
    const existing = await this.findOne(id);
    this.checkPermission(existing, userId, userRole);

    // Validate media count against platform limits (if both are being updated)
    const platforms = updateDto.platforms || existing.platforms;
    const mediaCount = updateDto.media?.length || existing.media?.length || 0;

    if (platforms && platforms.length > 0 && mediaCount > 0) {
      const validation = validateMediaForPlatforms(platforms, mediaCount);
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }
    }

    // Validate client-project relationship if being updated
    if (updateDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: updateDto.projectId },
        include: { client: true },
      });
      if (!project) {
        throw new BadRequestException(
          `Project with ID ${updateDto.projectId} not found`,
        );
      }

      const clientId =
        updateDto.clientId !== undefined
          ? updateDto.clientId
          : existing.clientId;
      if (clientId && project.clientId !== clientId) {
        throw new BadRequestException(
          `Project "${project.description}" belongs to client "${project.client.name}", not the selected client. Please select a matching project.`,
        );
      }
    }

    // If media is being updated, delete old media files from R2 first
    if (updateDto.media && existing.media && existing.media.length > 0) {
      const oldMediaKeys: string[] = [];

      // Collect all old media keys and thumbnail keys
      existing.media.forEach((m) => {
        oldMediaKeys.push(m.key);
        if (m.thumbnailKey) {
          oldMediaKeys.push(m.thumbnailKey);
        }
      });

      try {
        await this.mediaService.deleteMultipleFiles(oldMediaKeys);
        this.logger.log(
          `✅ Deleted ${oldMediaKeys.length} old media files (including thumbnails) from R2 during update`,
        );
      } catch (error) {
        this.logger.error(`⚠️  Failed to delete old media from R2:`, error);
        // Continue with update even if R2 deletion fails
      }
    }

    // Update content
    const content = await this.prisma.contentCalendarItem.update({
      where: { id },
      data: {
        ...(updateDto.caption && { caption: updateDto.caption }),
        ...(updateDto.scheduledAt && {
          scheduledAt: new Date(updateDto.scheduledAt),
        }),
        ...(updateDto.status && { status: updateDto.status }),
        ...(updateDto.platforms && { platforms: updateDto.platforms }),
        ...(updateDto.clientId !== undefined && {
          clientId: updateDto.clientId,
        }),
        ...(updateDto.projectId !== undefined && {
          projectId: updateDto.projectId,
        }),
        // DELETED: campaignId - 2025-11-09
        // Handle media updates if provided
        ...(updateDto.media && {
          media: {
            deleteMany: {}, // Delete existing media records from DB
            create: updateDto.media.map((m, index) => ({
              url: m.url,
              key: m.key,
              type: this.determineMediaType(m.mimeType),
              mimeType: m.mimeType,
              size: m.size,
              width: m.width,
              height: m.height,
              duration: m.duration,
              originalName: m.originalName,
              thumbnailUrl: m.thumbnailUrl,
              thumbnailKey: m.thumbnailKey,
              order: m.order !== undefined ? m.order : index, // Use provided order or fallback to index
            })),
          },
        }),
      },
      include: {
        media: {
          orderBy: { order: "asc" }, // Order media by carousel order
        },
        client: true,
        project: true,
        // DELETED: campaign include - 2025-11-09
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(`✅ Content updated: ${id}`);

    return content;
  }

  /**
   * Delete a content calendar item and its media
   */
  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    // Check if content exists and user has permission
    const content = await this.findOne(id);
    this.checkPermission(content, userId, userRole);

    // Delete media from R2 first (including thumbnails)
    if (content.media && content.media.length > 0) {
      const keys: string[] = [];

      // Collect all media keys and thumbnail keys
      content.media.forEach((m) => {
        keys.push(m.key);
        if (m.thumbnailKey) {
          keys.push(m.thumbnailKey);
        }
      });

      try {
        await this.mediaService.deleteMultipleFiles(keys);
        this.logger.log(
          `✅ Deleted ${keys.length} media files (including thumbnails) from R2`,
        );
      } catch (error) {
        this.logger.error(`⚠️  Failed to delete media from R2:`, error);
        // Continue with database deletion even if R2 deletion fails
      }
    }

    // Delete content (cascade deletes media records in DB)
    await this.prisma.contentCalendarItem.delete({
      where: { id },
    });

    this.logger.log(`✅ Content deleted: ${id}`);
  }

  /**
   * Publish a scheduled content (mark as PUBLISHED)
   */
  async publish(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<ContentWithRelations> {
    const content = await this.findOne(id);
    this.checkPermission(content, userId, userRole);

    if (content.status === ContentStatus.PUBLISHED) {
      throw new BadRequestException("Content is already published");
    }

    const updated = await this.prisma.contentCalendarItem.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        media: {
          orderBy: { order: "asc" }, // Order media by carousel order
        },
        client: true,
        project: true,
        // DELETED: campaign include - 2025-11-09
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(`✅ Content published: ${id}`);

    return updated;
  }

  /**
   * Archive a content item
   */
  async archive(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<ContentWithRelations> {
    const content = await this.findOne(id);
    this.checkPermission(content, userId, userRole);

    const updated = await this.prisma.contentCalendarItem.update({
      where: { id },
      data: {
        status: ContentStatus.ARCHIVED,
      },
      include: {
        media: {
          orderBy: { order: "asc" }, // Order media by carousel order
        },
        client: true,
        project: true,
        // DELETED: campaign include - 2025-11-09
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(`✅ Content archived: ${id}`);

    return updated;
  }

  /**
   * Check if user has permission to modify content
   */
  private checkPermission(
    content: ContentCalendarItem,
    userId: string,
    userRole: UserRole,
  ): void {
    // SUPER_ADMIN can modify anything
    if (userRole === UserRole.SUPER_ADMIN) {
      return;
    }

    // Other users can only modify their own content
    if (content.createdBy !== userId) {
      throw new ForbiddenException(
        "You do not have permission to modify this content. Only the creator or SUPER_ADMIN can modify it.",
      );
    }
  }

  /**
   * Determine MediaType from MIME type
   */
  private determineMediaType(mimeType: string): any {
    if (mimeType.startsWith("image/")) {
      return "IMAGE";
    } else if (mimeType.startsWith("video/")) {
      return "VIDEO";
    } else {
      return "IMAGE"; // Default fallback
    }
  }
}
