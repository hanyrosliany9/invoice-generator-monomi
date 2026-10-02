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
import { BulkContentDto } from "./dto/bulk-content.dto";
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

/**
 * Statuses a client may see through the public share link and the portal.
 * Internal ideas (DRAFT), rejected posts (FAILED) and ARCHIVED items stay
 * staff-only.
 */
export const CLIENT_VISIBLE_STATUSES: ContentStatus[] = [
  ContentStatus.SCHEDULED,
  ContentStatus.PUBLISHED,
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * publishedAt for an item being marked published: an explicit value wins; else
 * the scheduled time when it is already in the past (the post went live then);
 * else now. Never in the future.
 */
export function resolvePublishedAt(
  scheduledAt: Date | null | undefined,
  explicit?: string | Date | null,
  now: Date = new Date(),
): Date {
  if (explicit) {
    const d = new Date(explicit);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException("publishedAt is not a valid date");
    }
    // 5 min tolerance for client/server clock skew
    if (d.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw new BadRequestException("publishedAt cannot be in the future");
    }
    return d;
  }
  if (scheduledAt && new Date(scheduledAt).getTime() < now.getTime()) {
    return new Date(scheduledAt);
  }
  return now;
}

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
   * a null handle when the client has none (never invented). Available to all
   * authenticated users.
   */
  async getSocialProfile(
    clientId: string,
    platform: ContentPlatform = ContentPlatform.INSTAGRAM,
  ): Promise<{
    handle: string | null;
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
      // Never invent a handle: when the client has none the UI shows the name.
      handle: fields.handle || null,
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

  private static readonly SHARE_CLIENT_SELECT = {
    id: true, name: true, contentShareEnabled: true,
    instagramHandle: true, instagramAvatarUrl: true, instagramBio: true,
    tiktokHandle: true, tiktokAvatarUrl: true, tiktokBio: true,
  } as const;

  /** Resolve an active share token to its client (or throw). */
  private async clientForShareToken(token: string) {
    if (!token) throw new BadRequestException("Share token required");
    const client = await this.prisma.client.findUnique({
      where: { contentShareToken: token },
      select: ContentCalendarService.SHARE_CLIENT_SELECT,
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

    return this.buildSharedContentPayload(client);
  }

  /**
   * Same payload as getPublicContent for a client the caller has already
   * authorised (client portal). Does not require the public share to be
   * enabled and does not count a public view.
   */
  async getClientSharedContent(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: ContentCalendarService.SHARE_CLIENT_SELECT,
    });
    if (!client) throw new NotFoundException("Client not found");
    return this.buildSharedContentPayload(client);
  }

  /** Read-only content-planner payload shared by the public link and portal. */
  private async buildSharedContentPayload(client: {
    id: string;
    name: string;
    instagramHandle: string | null;
    instagramAvatarUrl: string | null;
    instagramBio: string | null;
    tiktokHandle: string | null;
    tiktokAvatarUrl: string | null;
    tiktokBio: string | null;
  }) {
    const items = await this.prisma.contentCalendarItem.findMany({
      where: { clientId: client.id, status: { in: CLIENT_VISIBLE_STATUSES } },
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

    return {
      client: { name: client.name },
      highlights,
      instagram: {
        handle: client.instagramHandle || null,
        avatarUrl: client.instagramAvatarUrl ?? null,
        bio: client.instagramBio ?? null,
        companyName: client.name,
        postCount: items.filter((i) => i.platforms.includes(ContentPlatform.INSTAGRAM)).length,
      },
      tiktok: {
        handle: client.tiktokHandle || null,
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
    await this.assertClientOwnsMediaKey(client.id, key);
  }

  /**
   * Throws 404 unless the R2 key belongs to this client's own content media,
   * highlight media or a highlight cover. Used by the public share and the
   * client portal before streaming a file.
   */
  async assertClientOwnsMediaKey(clientId: string, key: string): Promise<void> {
    if (!key || typeof key !== "string") {
      throw new BadRequestException("No media key provided");
    }
    const client = { id: clientId };

    // The key must belong to this client's own content media, highlight media,
    // or a highlight cover — never another client's.
    const [contentOwns, highlightOwns, coverOwns] = await Promise.all([
      this.prisma.contentMedia.findFirst({
        where: {
          content: { clientId: client.id, status: { in: CLIENT_VISIBLE_STATUSES } },
          OR: [{ key }, { thumbnailKey: key }],
        },
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

    const updated = await this.prisma.storyHighlight.update({
      where: { id: highlightId },
      data,
      include: { media: { orderBy: { order: "asc" } } },
    });

    // Only after the DB write: drop old objects that nothing references anymore
    // (kept files, and files shared with posts/other highlights, survive).
    const oldKeys: string[] = [];
    if (hl.coverKey) oldKeys.push(hl.coverKey);
    if (dto.media) {
      hl.media.forEach((m) => {
        oldKeys.push(m.key);
        if (m.thumbnailKey) oldKeys.push(m.thumbnailKey);
      });
    }
    await this.deleteUnreferencedKeys(oldKeys);
    return updated;
  }

  async deleteHighlight(highlightId: string) {
    const hl = await this.prisma.storyHighlight.findUnique({
      where: { id: highlightId },
      include: { media: true },
    });
    if (!hl) throw new NotFoundException("Highlight tidak ditemukan");

    const keys: string[] = [];
    if (hl.coverKey) keys.push(hl.coverKey);
    hl.media.forEach((m) => {
      keys.push(m.key);
      if (m.thumbnailKey) keys.push(m.thumbnailKey);
    });
    await this.prisma.storyHighlight.delete({ where: { id: highlightId } });
    // Clean up R2 after the DB delete; files a post still references are kept.
    await this.deleteUnreferencedKeys(keys);
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
    await this.validateClientScope(createDto.clientId, createDto.projectId);

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

    const status = createDto.status || ContentStatus.DRAFT;
    const scheduledAt = createDto.scheduledAt
      ? new Date(createDto.scheduledAt)
      : null;
    if (status === ContentStatus.SCHEDULED && !scheduledAt) {
      throw new BadRequestException(
        "scheduledAt is required when status is SCHEDULED",
      );
    }
    // New posts go to the top-left of the Instagram grid, even after a manual
    // rearrange (which numbers every existing post).
    const gridOrder =
      createDto.gridOrder !== undefined
        ? createDto.gridOrder
        : await this.nextTopGridOrder(createDto.clientId);

    // Create content with media
    const content = await this.prisma.contentCalendarItem.create({
      data: {
        caption: createDto.caption,
        scheduledAt,
        publishedAt:
          status === ContentStatus.PUBLISHED
            ? resolvePublishedAt(scheduledAt, createDto.publishedAt)
            : null,
        status,
        format: createDto.format || ContentFormat.FEED,
        gridOrder,
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
   * Client scope rules for a new item (create and duplicate): the client and
   * project must exist and the project must belong to the client.
   */
  private async validateClientScope(
    clientId?: string | null,
    projectId?: string | null,
  ): Promise<void> {
    if (clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client) {
        throw new BadRequestException(`Client with ID ${clientId} not found`);
      }
    }

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { client: true },
      });
      if (!project) {
        throw new BadRequestException(`Project with ID ${projectId} not found`);
      }

      // Validate client-project relationship
      if (clientId && project.clientId !== clientId) {
        throw new BadRequestException(
          `Project "${project.description}" belongs to client "${project.client.name}", not the selected client. Please select a matching project.`,
        );
      }
    }
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
  /**
   * Persist grid order. Moving an item is an edit of that item, so every item
   * in the request must pass the same permission check as update (admins:
   * any item; others: only items they created). All-or-nothing: one item the
   * caller may not edit rejects the whole request before anything is written.
   */
  async reorder(
    items: { id: string; gridOrder: number }[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ updated: number }> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("No items provided to reorder");
    }

    const ids = items.map((i) => i.id);
    if (
      items.some(
        (i) => typeof i?.id !== "string" || !Number.isInteger(i.gridOrder),
      )
    ) {
      throw new BadRequestException(
        "Each item needs a string id and an integer gridOrder",
      );
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Duplicate ids in reorder request");
    }
    const existing = await this.prisma.contentCalendarItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, clientId: true, createdBy: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const missing = ids.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Content not found: ${missing.join(", ")}`,
      );
    }

    if (new Set(existing.map((e) => e.clientId)).size > 1) {
      throw new BadRequestException(
        "Reorder must only contain items of a single client",
      );
    }

    for (const item of existing) this.checkPermission(item, userId, userRole);

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

    // Schedule handling. `scheduledAt: null` clears the schedule; a status that
    // is not sent is derived: a DRAFT that gets a (future) date becomes
    // SCHEDULED, a SCHEDULED item whose date is cleared goes back to DRAFT.
    const clearingSchedule = updateDto.scheduledAt === null;
    const newScheduledAt = updateDto.scheduledAt
      ? new Date(updateDto.scheduledAt)
      : undefined;
    let nextStatus: ContentStatus | undefined = updateDto.status;
    if (nextStatus === undefined) {
      if (clearingSchedule && existing.status === ContentStatus.SCHEDULED) {
        nextStatus = ContentStatus.DRAFT;
      } else if (
        newScheduledAt &&
        existing.status === ContentStatus.DRAFT &&
        newScheduledAt.getTime() > Date.now()
      ) {
        nextStatus = ContentStatus.SCHEDULED;
      }
    }
    const effectiveStatus = nextStatus ?? existing.status;
    const finalScheduledAt = clearingSchedule
      ? null
      : (newScheduledAt ?? existing.scheduledAt);

    if (effectiveStatus === ContentStatus.SCHEDULED && !finalScheduledAt) {
      throw new BadRequestException(
        "scheduledAt is required when status is SCHEDULED",
      );
    }
    // Reject a past scheduledAt only when the schedule is actually CHANGING to
    // a new past date (or being newly scheduled). Editing other fields of an
    // item whose existing schedule is already in the past must not be blocked.
    if (
      effectiveStatus === ContentStatus.SCHEDULED &&
      newScheduledAt &&
      !updateDto.allowPastSchedule
    ) {
      const scheduleChanged =
        !existing.scheduledAt ||
        newScheduledAt.getTime() !== new Date(existing.scheduledAt).getTime();
      if (scheduleChanged && newScheduledAt < new Date()) {
        throw new BadRequestException(
          "scheduledAt must be a future date when status is SCHEDULED",
        );
      }
    }

    // Validate media count against platform limits (if both are being updated).
    // Use !== undefined so an explicitly-empty media array reports 0 (not the
    // stale existing count) and the limit check reflects the real new state.
    const platforms = updateDto.platforms || existing.platforms;
    const mediaCount =
      updateDto.media !== undefined
        ? updateDto.media.length
        : (existing.media?.length ?? 0);

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

    // Update content
    const content = await this.prisma.contentCalendarItem.update({
      where: { id },
      data: {
        ...(updateDto.caption !== undefined && { caption: updateDto.caption }),
        ...(clearingSchedule && { scheduledAt: null }),
        ...(newScheduledAt && { scheduledAt: newScheduledAt }),
        ...(nextStatus && { status: nextStatus }),
        // Published: stamp the real post date, not the moment it was marked.
        // An explicit publishedAt can also correct an already published item.
        ...(effectiveStatus === ContentStatus.PUBLISHED &&
          (updateDto.publishedAt || !existing.publishedAt) && {
            publishedAt: resolvePublishedAt(
              finalScheduledAt,
              updateDto.publishedAt,
            ),
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

    // Only now that the DB write succeeded: delete files that were removed from
    // the post (not the kept ones) and that nothing else still references.
    if (updateDto.media && existing.media && existing.media.length > 0) {
      const keep = new Set<string>();
      updateDto.media.forEach((m) => {
        keep.add(m.key);
        if (m.thumbnailKey) keep.add(m.thumbnailKey);
      });
      const removed: string[] = [];
      existing.media.forEach((m) => {
        if (!keep.has(m.key)) removed.push(m.key);
        if (m.thumbnailKey && !keep.has(m.thumbnailKey)) {
          removed.push(m.thumbnailKey);
        }
      });
      await this.deleteUnreferencedKeys(removed);
    }

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

    const keys = this.collectMediaKeys(content.media ?? []);

    // Delete content (cascade deletes media records in DB)
    await this.prisma.contentCalendarItem.delete({
      where: { id },
    });

    // After the commit: remove files nothing else references (a duplicated post
    // may share the same objects).
    await this.deleteUnreferencedKeys(keys);

    this.logger.log(`✅ Content deleted: ${id}`);
  }

  /**
   * Publish a scheduled content (mark as PUBLISHED)
   */
  async publish(
    id: string,
    userId: string,
    userRole: UserRole,
    publishedAt?: string,
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
        publishedAt: resolvePublishedAt(content.scheduledAt, publishedAt),
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
   * Duplicate an item as a new DRAFT (no schedule). Media rows point at the
   * SAME R2 objects (no copy); deletion is reference-counted so removing or
   * editing either post never deletes a file the other still uses.
   */
  /**
   * Copy an item as a new DRAFT owned by the caller. Requires read access to
   * the source and re-applies create's client scope rules (the source's
   * project may have moved to another client since it was created).
   */
  async duplicate(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<ContentWithRelations> {
    const src = await this.findOne(id);
    this.checkReadPermission(userRole);
    await this.validateClientScope(src.clientId, src.projectId);
    const gridOrder = src.clientId
      ? await this.nextTopGridOrder(src.clientId)
      : null;
    const copy = await this.prisma.contentCalendarItem.create({
      data: {
        caption: src.caption,
        scheduledAt: null,
        status: ContentStatus.DRAFT,
        format: src.format,
        gridOrder,
        platforms: src.platforms,
        clientId: src.clientId,
        projectId: src.projectId,
        createdBy: userId,
        media: {
          create: (src.media ?? []).map((m) => ({
            url: m.url,
            key: m.key,
            type: m.type,
            mimeType: m.mimeType,
            size: m.size,
            width: m.width,
            height: m.height,
            duration: m.duration,
            originalName: m.originalName,
            thumbnailUrl: m.thumbnailUrl,
            thumbnailKey: m.thumbnailKey,
            order: m.order,
          })),
        },
      },
      include: {
        media: { orderBy: { order: "asc" } },
        client: true,
        project: true,
        createdByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    this.logger.log(`✅ Content duplicated: ${id} -> ${copy.id}`);
    return copy;
  }

  /**
   * Apply one action to many items. Best effort per item: returns which ids
   * succeeded and, for the rest, the reason (permission, invalid transition,
   * past schedule ...), so the UI can report precisely.
   */
  async bulk(
    dto: BulkContentDto,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    succeeded: string[];
    failed: { id: string; reason: string }[];
  }> {
    const ids = [...new Set(dto.ids)];
    if (dto.action === "STATUS" && !dto.status) {
      throw new BadRequestException("status is required for action STATUS");
    }
    if (dto.action === "SHIFT" && (!dto.days || !Number.isInteger(dto.days))) {
      throw new BadRequestException(
        "days (non-zero integer) is required for action SHIFT",
      );
    }

    const items = await this.prisma.contentCalendarItem.findMany({
      where: { id: { in: ids } },
      include: { media: true },
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    const keysToClean: string[] = [];
    const now = new Date();

    for (const id of ids) {
      const item = byId.get(id);
      if (!item) {
        failed.push({ id, reason: "Content not found" });
        continue;
      }
      try {
        this.checkPermission(item, userId, userRole);

        if (dto.action === "DELETE") {
          await this.prisma.contentCalendarItem.delete({ where: { id } });
          keysToClean.push(...this.collectMediaKeys(item.media));
        } else if (dto.action === "SHIFT") {
          if (!item.scheduledAt) {
            throw new BadRequestException("Item has no schedule");
          }
          if (item.status === ContentStatus.ARCHIVED) {
            throw new BadRequestException("Archived items cannot be rescheduled");
          }
          const next = new Date(item.scheduledAt.getTime() + dto.days! * DAY_MS);
          if (item.status === ContentStatus.SCHEDULED && next < now) {
            throw new BadRequestException(
              "New schedule would be in the past for a SCHEDULED item",
            );
          }
          await this.prisma.contentCalendarItem.update({
            where: { id },
            data: { scheduledAt: next },
          });
        } else {
          const target = dto.status!;
          if (
            item.status === ContentStatus.ARCHIVED &&
            target !== ContentStatus.ARCHIVED
          ) {
            throw new BadRequestException("Archived items cannot change status");
          }
          if (target === ContentStatus.SCHEDULED) {
            if (!item.scheduledAt) {
              throw new BadRequestException("Item has no schedule");
            }
            if (item.scheduledAt < now) {
              throw new BadRequestException("Schedule is in the past");
            }
          }
          await this.prisma.contentCalendarItem.update({
            where: { id },
            data: {
              status: target,
              ...(target === ContentStatus.PUBLISHED && !item.publishedAt
                ? { publishedAt: resolvePublishedAt(item.scheduledAt) }
                : {}),
            },
          });
        }
        succeeded.push(id);
      } catch (e: any) {
        failed.push({ id, reason: e?.message ?? "Failed" });
      }
    }

    await this.deleteUnreferencedKeys(keysToClean);
    this.logger.log(
      `✅ Bulk ${dto.action}: ${succeeded.length} ok, ${failed.length} failed`,
    );
    return { succeeded, failed };
  }

  /** gridOrder that puts a new item before every arranged item of the client. */
  private async nextTopGridOrder(
    clientId?: string | null,
  ): Promise<number | null> {
    if (!clientId) return null;
    const agg = await this.prisma.contentCalendarItem.aggregate({
      where: { clientId, gridOrder: { not: null } },
      _min: { gridOrder: true },
    });
    const min = agg._min.gridOrder;
    return min === null || min === undefined ? null : min - 1;
  }

  private collectMediaKeys(
    media: { key: string; thumbnailKey?: string | null }[],
  ): string[] {
    const keys: string[] = [];
    media.forEach((m) => {
      keys.push(m.key);
      if (m.thumbnailKey) keys.push(m.thumbnailKey);
    });
    return keys;
  }

  /**
   * Delete R2 objects, skipping any key still referenced by a post's media,
   * a highlight's media or a highlight cover. Call AFTER the DB write that
   * removed the reference. Best effort: R2 failures are logged, never thrown.
   */
  async deleteUnreferencedKeys(keys: string[]): Promise<string[]> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (unique.length === 0) return [];
    try {
      const mediaWhere = {
        OR: [{ key: { in: unique } }, { thumbnailKey: { in: unique } }],
      };
      const [content, highlight, covers] = await Promise.all([
        this.prisma.contentMedia.findMany({
          where: mediaWhere,
          select: { key: true, thumbnailKey: true },
        }),
        this.prisma.highlightMedia.findMany({
          where: mediaWhere,
          select: { key: true, thumbnailKey: true },
        }),
        this.prisma.storyHighlight.findMany({
          where: { coverKey: { in: unique } },
          select: { coverKey: true },
        }),
      ]);
      const referenced = new Set<string>();
      [...content, ...highlight].forEach((m) => {
        referenced.add(m.key);
        if (m.thumbnailKey) referenced.add(m.thumbnailKey);
      });
      covers.forEach((c) => c.coverKey && referenced.add(c.coverKey));

      const toDelete = unique.filter((k) => !referenced.has(k));
      if (toDelete.length > 0) {
        await this.mediaService.deleteMultipleFiles(toDelete);
        this.logger.log(
          `Deleted ${toDelete.length} unreferenced media files from R2`,
        );
      }
      return toDelete;
    } catch (error) {
      this.logger.error(`Failed to delete media from R2: ${error}`);
      return [];
    }
  }

  /**
   * Check if user has permission to modify content
   */
  private checkPermission(
    content: Pick<ContentCalendarItem, "createdBy">,
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
   * Read access to calendar items. Today every staff role reads every item
   * (findOne / findAll are unscoped: the calendar is shared by the team), so
   * this only rejects a caller without a known role. Kept as the single read
   * rule so a future per-role restriction also covers duplicate.
   */
  private checkReadPermission(userRole: UserRole | undefined): void {
    if (!userRole || !(Object.values(UserRole) as string[]).includes(userRole)) {
      throw new ForbiddenException("You do not have permission to read this content.");
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
