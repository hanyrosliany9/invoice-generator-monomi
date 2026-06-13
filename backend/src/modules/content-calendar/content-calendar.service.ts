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
  ContentFormat,
  UserRole,
  Prisma,
} from "@prisma/client";
import { validateMediaForPlatforms } from "./content-calendar.constants";
import { CreateHighlightDto } from "./dto/create-highlight.dto";
import { randomBytes } from "crypto";

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
   * Get a client's social profile (non-sensitive fields only) for a platform's
   * grid preview header (Instagram, TikTok, …). Content is client-scoped, so
   * the profile is per-client: handle/avatar/bio come from the Client row, with
   * a handle derived from the client name as a fallback. Available to all
   * authenticated users.
   */
  async getSocialProfile(
    clientId: string,
    platform: ContentPlatform = ContentPlatform.INSTAGRAM,
  ): Promise<{
    handle: string;
    avatarUrl: string | null;
    bio: string | null;
    companyName: string;
    postCount: number;
  }> {
    if (!clientId) {
      throw new BadRequestException("clientId is required");
    }

    const [client, postCount] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: {
          name: true,
          instagramHandle: true,
          instagramAvatarUrl: true,
          instagramBio: true,
          tiktokHandle: true,
          tiktokAvatarUrl: true,
          tiktokBio: true,
        },
      }),
      this.prisma.contentCalendarItem.count({
        where: { clientId, platforms: { has: platform } },
      }),
    ]);

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const fields =
      platform === ContentPlatform.TIKTOK
        ? { handle: client.tiktokHandle, avatar: client.tiktokAvatarUrl, bio: client.tiktokBio }
        : { handle: client.instagramHandle, avatar: client.instagramAvatarUrl, bio: client.instagramBio };

    const fallbackName = client.name || "Klien";
    return {
      handle:
        fields.handle ||
        "@" +
          fallbackName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "")
            .slice(0, 24),
      avatarUrl: fields.avatar ?? null,
      bio: fields.bio ?? null,
      companyName: fallbackName,
      postCount,
    };
  }

  // ==========================================================================
  // PUBLIC SHARING — read-only per-client share of the content planner
  // ==========================================================================

  /** Enable (and lazily create) a client's public share link. Admin only. */
  async enableShare(clientId: string): Promise<{
    enabled: boolean;
    token: string;
    path: string;
    views: number;
  }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, contentShareToken: true, contentSharedAt: true, contentShareViews: true },
    });
    if (!client) throw new NotFoundException(`Client with ID ${clientId} not found`);

    const token = client.contentShareToken || randomBytes(24).toString("hex");
    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        contentShareToken: token,
        contentShareEnabled: true,
        ...(client.contentSharedAt ? {} : { contentSharedAt: new Date() }),
      },
      select: { contentShareToken: true, contentShareViews: true },
    });
    return {
      enabled: true,
      token: updated.contentShareToken!,
      path: `/shared/content/${updated.contentShareToken}`,
      views: updated.contentShareViews,
    };
  }

  /** Disable a client's public share link (keeps the token for re-enabling). */
  async disableShare(clientId: string): Promise<{ enabled: false }> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new NotFoundException(`Client with ID ${clientId} not found`);
    await this.prisma.client.update({ where: { id: clientId }, data: { contentShareEnabled: false } });
    return { enabled: false };
  }

  /** Current share status for a client. Admin only. */
  async getShareStatus(clientId: string): Promise<{
    enabled: boolean;
    token: string | null;
    path: string | null;
    views: number;
  }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, contentShareToken: true, contentShareEnabled: true, contentShareViews: true },
    });
    if (!client) throw new NotFoundException(`Client with ID ${clientId} not found`);
    return {
      enabled: client.contentShareEnabled,
      token: client.contentShareEnabled ? client.contentShareToken : null,
      path: client.contentShareEnabled && client.contentShareToken ? `/shared/content/${client.contentShareToken}` : null,
      views: client.contentShareViews,
    };
  }

  /** Resolve an active share token to its client (or throw). */
  private async clientForShareToken(token: string) {
    if (!token) throw new BadRequestException("Share token required");
    const client = await this.prisma.client.findUnique({
      where: { contentShareToken: token },
      select: {
        id: true, name: true, contentShareEnabled: true,
        instagramHandle: true, instagramAvatarUrl: true, instagramBio: true,
        tiktokHandle: true, tiktokAvatarUrl: true, tiktokBio: true,
      },
    });
    if (!client || !client.contentShareEnabled) {
      throw new NotFoundException("Share link not found or disabled");
    }
    return client;
  }

  /** Public read-only payload for a shared client (no auth). */
  async getPublicContent(token: string) {
    const client = await this.clientForShareToken(token);

    // count the view (best-effort, don't block the response)
    this.prisma.client
      .update({ where: { id: client.id }, data: { contentShareViews: { increment: 1 } } })
      .catch(() => undefined);

    const items = await this.prisma.contentCalendarItem.findMany({
      where: { clientId: client.id },
      select: {
        id: true, caption: true, scheduledAt: true, publishedAt: true,
        status: true, format: true, gridOrder: true, platforms: true, createdAt: true,
        media: {
          select: { id: true, url: true, key: true, type: true, mimeType: true, thumbnailUrl: true, thumbnailKey: true, order: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    });

    const highlights = await this.listHighlights(client.id);

    const deriveHandle = (h: string | null) =>
      h || "@" + (client.name || "klien").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);

    return {
      client: { name: client.name },
      highlights,
      instagram: {
        handle: deriveHandle(client.instagramHandle),
        avatarUrl: client.instagramAvatarUrl ?? null,
        bio: client.instagramBio ?? null,
        companyName: client.name,
        postCount: items.filter((i) => i.platforms.includes(ContentPlatform.INSTAGRAM)).length,
      },
      tiktok: {
        handle: deriveHandle(client.tiktokHandle),
        avatarUrl: client.tiktokAvatarUrl ?? null,
        bio: client.tiktokBio ?? null,
        companyName: client.name,
        postCount: items.filter((i) => i.platforms.includes(ContentPlatform.TIKTOK)).length,
      },
      items,
    };
  }

  /**
   * Validate that an R2 key belongs to the shared client's own content before
   * streaming it publicly — so each share can only access its own media.
   */
  async assertPublicMediaAccess(token: string, key: string): Promise<void> {
    if (!key) throw new BadRequestException("No media key provided");
    const client = await this.clientForShareToken(token);

    // The key must belong to this client's own content media, highlight media,
    // or a highlight cover — never another client's.
    const [contentOwns, highlightOwns, coverOwns] = await Promise.all([
      this.prisma.contentMedia.findFirst({
        where: { content: { clientId: client.id }, OR: [{ key }, { thumbnailKey: key }] },
        select: { id: true },
      }),
      this.prisma.highlightMedia.findFirst({
        where: { highlight: { clientId: client.id }, OR: [{ key }, { thumbnailKey: key }] },
        select: { id: true },
      }),
      this.prisma.storyHighlight.findFirst({
        where: { clientId: client.id, coverKey: key },
        select: { id: true },
      }),
    ]);
    if (!contentOwns && !highlightOwns && !coverOwns) {
      throw new NotFoundException("Media not found for this share");
    }
  }

  // ==========================================================================
  // STORY HIGHLIGHTS — per-client saved story collections (own uploaded media)
  // ==========================================================================

  async listHighlights(clientId: string) {
    return this.prisma.storyHighlight.findMany({
      where: { clientId },
      include: { media: { orderBy: { order: "asc" } } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }

  async createHighlight(clientId: string, dto: CreateHighlightDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new NotFoundException(`Client with ID ${clientId} not found`);
    if (!dto.media || dto.media.length === 0) {
      throw new BadRequestException("Highlight butuh minimal satu media");
    }

    const last = await this.prisma.storyHighlight.findFirst({
      where: { clientId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const cover = dto.cover ?? dto.media[0];

    return this.prisma.storyHighlight.create({
      data: {
        clientId,
        title: dto.title.trim(),
        coverUrl: cover?.url ?? null,
        coverKey: cover?.key ?? null,
        order: (last?.order ?? -1) + 1,
        media: {
          create: dto.media.map((m, index) => ({
            url: m.url,
            key: m.key,
            type: this.determineMediaType(m.mimeType),
            mimeType: m.mimeType,
            size: m.size,
            width: m.width,
            height: m.height,
            thumbnailUrl: m.thumbnailUrl,
            thumbnailKey: m.thumbnailKey,
            order: index,
          })),
        },
      },
      include: { media: { orderBy: { order: "asc" } } },
    });
  }

  async updateHighlight(highlightId: string, dto: Partial<CreateHighlightDto>) {
    const hl = await this.prisma.storyHighlight.findUnique({
      where: { id: highlightId },
      include: { media: true },
    });
    if (!hl) throw new NotFoundException("Highlight tidak ditemukan");

    const data: Prisma.StoryHighlightUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();

    // Replacing media: drop the old media (and old cover) from R2, then recreate.
    if (dto.media) {
      if (dto.media.length === 0) {
        throw new BadRequestException("Highlight butuh minimal satu media");
      }
      const keys: string[] = [];
      if (hl.coverKey) keys.push(hl.coverKey);
      hl.media.forEach((m) => {
        keys.push(m.key);
        if (m.thumbnailKey) keys.push(m.thumbnailKey);
      });
      if (keys.length > 0) {
        try {
          await this.mediaService.deleteMultipleFiles([...new Set(keys)]);
        } catch (e) {
          this.logger.warn(`Failed to delete old highlight media from R2: ${e}`);
        }
      }
      const cover = dto.cover ?? dto.media[0];
      data.coverUrl = cover?.url ?? null;
      data.coverKey = cover?.key ?? null;
      data.media = {
        deleteMany: {},
        create: dto.media.map((m, index) => ({
          url: m.url,
          key: m.key,
          type: this.determineMediaType(m.mimeType),
          mimeType: m.mimeType,
          size: m.size,
          width: m.width,
          height: m.height,
          thumbnailUrl: m.thumbnailUrl,
          thumbnailKey: m.thumbnailKey,
          order: index,
        })),
      };
    } else if (dto.cover) {
      data.coverUrl = dto.cover.url;
      data.coverKey = dto.cover.key;
    }

    return this.prisma.storyHighlight.update({
      where: { id: highlightId },
      data,
      include: { media: { orderBy: { order: "asc" } } },
    });
  }

  async deleteHighlight(highlightId: string) {
    const hl = await this.prisma.storyHighlight.findUnique({
      where: { id: highlightId },
      include: { media: true },
    });
    if (!hl) throw new NotFoundException("Highlight tidak ditemukan");

    // Clean up R2 (cover + media + thumbnails). Best-effort.
    const keys: string[] = [];
    if (hl.coverKey) keys.push(hl.coverKey);
    hl.media.forEach((m) => {
      keys.push(m.key);
      if (m.thumbnailKey) keys.push(m.thumbnailKey);
    });
    if (keys.length > 0) {
      try {
        await this.mediaService.deleteMultipleFiles([...new Set(keys)]);
      } catch (e) {
        this.logger.warn(`Failed to delete highlight media from R2: ${e}`);
      }
    }
    await this.prisma.storyHighlight.delete({ where: { id: highlightId } });
    return { deleted: true };
  }

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

    // Fix 6: reject past scheduledAt when status is SCHEDULED
    if (
      createDto.status === ContentStatus.SCHEDULED ||
      (!createDto.status && createDto.scheduledAt)
    ) {
      if (createDto.scheduledAt && new Date(createDto.scheduledAt) < new Date()) {
        throw new BadRequestException(
          "scheduledAt must be a future date when status is SCHEDULED",
        );
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
        format: createDto.format || ContentFormat.FEED,
        gridOrder: createDto.gridOrder,
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
    format?: ContentFormat;
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

    if (filters?.format) {
      where.format = filters.format;
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
   * Persist a manual drag-to-rearrange order for the Instagram grid preview.
   * Accepts the full ordered list of ids (or a subset) and writes each item's
   * gridOrder to its index. Done in a single transaction so the grid never
   * shows a half-applied order.
   */
  async reorder(
    items: { id: string; gridOrder: number }[],
  ): Promise<{ updated: number }> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("No items provided to reorder");
    }

    const ids = items.map((i) => i.id);
    const existing = await this.prisma.contentCalendarItem.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const missing = ids.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Content not found: ${missing.join(", ")}`,
      );
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.contentCalendarItem.update({
          where: { id: item.id },
          data: { gridOrder: item.gridOrder },
        }),
      ),
    );

    this.logger.log(`✅ Reordered ${items.length} content items (grid)`);
    return { updated: items.length };
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

    // Fix 4: validate status transitions when status is changing
    if (updateDto.status !== undefined && updateDto.status !== existing.status) {
      const TERMINAL_STATES: ContentStatus[] = [
        ContentStatus.ARCHIVED,
      ];
      if (TERMINAL_STATES.includes(existing.status as ContentStatus)) {
        throw new BadRequestException(
          `Cannot change status from terminal state "${existing.status}"`,
        );
      }
      // Setting PUBLISHED via PUT: enforce publishedAt
      if (updateDto.status === ContentStatus.PUBLISHED) {
        // publishedAt will be set below if not provided
      }
    }

    // Reject a past scheduledAt only when the schedule is actually CHANGING to
    // a new past date (or being newly scheduled). Editing other fields of an
    // item whose existing schedule is already in the past must not be blocked.
    const effectiveStatus = updateDto.status ?? existing.status;
    if (effectiveStatus === ContentStatus.SCHEDULED && updateDto.scheduledAt) {
      const newAt = new Date(updateDto.scheduledAt);
      const scheduleChanged =
        !existing.scheduledAt ||
        newAt.getTime() !== new Date(existing.scheduledAt).getTime();
      if (scheduleChanged && newAt < new Date()) {
        throw new BadRequestException(
          "scheduledAt must be a future date when status is SCHEDULED",
        );
      }
    }

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
        ...(updateDto.status && {
          status: updateDto.status,
          // Fix 4: auto-set publishedAt when transitioning to PUBLISHED
          ...(updateDto.status === ContentStatus.PUBLISHED &&
            !existing.publishedAt && { publishedAt: new Date() }),
        }),
        ...(updateDto.format && { format: updateDto.format }),
        ...(updateDto.gridOrder !== undefined && {
          gridOrder: updateDto.gridOrder,
        }),
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

    if (
      content.status === ContentStatus.PUBLISHED ||
      content.status === ContentStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        `Content cannot be published from its current state "${content.status}"`,
      );
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
    // ADMIN / SUPER_ADMIN can modify anything (admin == super-admin).
    if (
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.ADMIN
    ) {
      return;
    }

    // Other users can only modify their own content
    if (content.createdBy !== userId) {
      throw new ForbiddenException(
        "You do not have permission to modify this content. Only the creator or an admin can modify it.",
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
