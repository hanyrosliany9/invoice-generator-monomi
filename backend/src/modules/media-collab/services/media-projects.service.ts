import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";
import { CreateMediaProjectDto } from "../dto/create-media-project.dto";
import { UpdateMediaProjectDto } from "../dto/update-media-project.dto";
import {
  generatePublicShareToken,
  generatePublicShareUrl,
} from "../utils/public-share.util";

/**
 * MediaProjectsService
 *
 * Handles business logic for media collaboration projects.
 * Projects group related video and photo assets for review workflows.
 */
@Injectable()
export class MediaProjectsService {
  private readonly logger = new Logger(MediaProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new media project
   */
  async create(userId: string, createDto: CreateMediaProjectDto) {
    // Verify client exists if provided
    if (createDto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: createDto.clientId },
      });
      if (!client) {
        throw new NotFoundException("Client not found");
      }
    }

    // Verify project exists if provided
    if (createDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createDto.projectId },
      });
      if (!project) {
        throw new NotFoundException("Project not found");
      }
    }

    // Verify folder exists if provided
    if (createDto.folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: createDto.folderId },
      });
      if (!folder) {
        throw new NotFoundException("Folder not found");
      }
    }

    // Create project
    const mediaProject = await this.prisma.mediaProject.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        clientId: createDto.clientId,
        projectId: createDto.projectId,
        folderId: createDto.folderId,
        createdBy: userId,
      },
      include: {
        client: true,
        project: true,
        parentFolder: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Automatically add creator as OWNER collaborator
    await this.prisma.mediaCollaborator.create({
      data: {
        projectId: mediaProject.id,
        userId: userId,
        role: "OWNER",
        invitedBy: userId,
      },
    });

    // Media collaboration is the videographers' workspace, so every
    // videographer is auto-granted EDITOR access to each project — no manual
    // per-project invite needed. Guests stay invite-only via the guest flow.
    await this.grantVideographersEditorAccess(mediaProject.id, userId);

    return mediaProject;
  }

  /**
   * Add every active VIDEOGRAPHER as an EDITOR collaborator on a project.
   * Idempotent — skips users who are already collaborators (e.g. the creator).
   * `invitedBy` is the project owner/creator. Failures are logged, never
   * thrown: auto-sharing must not break project creation.
   */
  private async grantVideographersEditorAccess(
    projectId: string,
    invitedBy: string,
  ) {
    try {
      const videographers = await this.prisma.user.findMany({
        where: { role: "VIDEOGRAPHER", isActive: true },
        select: { id: true },
      });
      if (videographers.length === 0) return;

      const existing = await this.prisma.mediaCollaborator.findMany({
        where: {
          projectId,
          userId: { in: videographers.map((v) => v.id) },
        },
        select: { userId: true },
      });
      const existingIds = new Set(existing.map((e) => e.userId));

      const toAdd = videographers
        .filter((v) => !existingIds.has(v.id))
        .map((v) => ({
          projectId,
          userId: v.id,
          role: "EDITOR" as const,
          invitedBy,
        }));

      if (toAdd.length > 0) {
        await this.prisma.mediaCollaborator.createMany({
          data: toAdd,
          skipDuplicates: true,
        });
        this.logger.log(
          `Auto-added ${toAdd.length} videographer(s) as EDITOR to media project ${projectId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to auto-add videographers to media project ${projectId}: ${err}`,
      );
    }
  }

  /**
   * Get all projects accessible by user
   */
  async findAll(userId: string) {
    const projects = await this.prisma.mediaProject.findMany({
      where: {
        collaborators: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        client: true,
        project: true,
        parentFolder: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            assets: true,
            collaborators: true,
            collections: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return projects;
  }

  /**
   * Get all media projects linked to a business project
   */
  async findByBizProject(bizProjectId: string) {
    return this.prisma.mediaProject.findMany({
      where: { projectId: bizProjectId },
      include: {
        client: true,
        project: { select: { id: true, number: true, description: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { assets: true, collaborators: true, collections: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Get a single project by ID
   */
  async findOne(projectId: string, userId: string) {
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        project: true,
        parentFolder: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            inviter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assets: {
          take: 10,
          orderBy: {
            uploadedAt: "desc",
          },
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            metadata: true,
          },
        },
        collections: {
          take: 5,
          orderBy: {
            updatedAt: "desc",
          },
        },
        _count: {
          select: {
            assets: true,
            collaborators: true,
            collections: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Media project not found");
    }

    // Verify user has access
    const hasAccess = project.collaborators.some(
      (collab) => collab.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to this project");
    }

    return project;
  }

  /**
   * Update a media project
   */
  async update(
    projectId: string,
    userId: string,
    updateDto: UpdateMediaProjectDto,
  ) {
    // Check if user has OWNER or EDITOR role
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!collaborator) {
      throw new ForbiddenException("Access denied to this project");
    }

    if (collaborator.role === "VIEWER" || collaborator.role === "COMMENTER") {
      throw new ForbiddenException(
        "Only OWNER or EDITOR can update project details",
      );
    }

    // Verify new relationships if provided
    if (updateDto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: updateDto.clientId },
      });
      if (!client) {
        throw new NotFoundException("Client not found");
      }
    }

    if (updateDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: updateDto.projectId },
      });
      if (!project) {
        throw new NotFoundException("Project not found");
      }
    }

    if (updateDto.folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: updateDto.folderId },
      });
      if (!folder) {
        throw new NotFoundException("Folder not found");
      }
    }

    const updatedProject = await this.prisma.mediaProject.update({
      where: { id: projectId },
      data: updateDto,
      include: {
        client: true,
        project: true,
        parentFolder: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedProject;
  }

  /**
   * Delete a media project (OWNER only)
   * CRITICAL: Also deletes all R2 files (assets, versions, thumbnails)
   */
  async remove(projectId: string, userId: string) {
    // Check if user is OWNER
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!collaborator) {
      throw new ForbiddenException("Access denied to this project");
    }

    if (collaborator.role !== "OWNER") {
      throw new ForbiddenException("Only OWNER can delete the project");
    }

    this.logger.log(
      `Starting project deletion with R2 cleanup for project: ${projectId}`,
    );

    // Step 1: Get all assets in this project
    const assets = await this.prisma.mediaAsset.findMany({
      where: { projectId },
      select: {
        id: true,
        key: true,
        thumbnailUrl: true,
      },
    });

    // Step 2: Get all versions for all assets in this project
    const versions = await this.prisma.mediaVersion.findMany({
      where: {
        asset: { projectId },
      },
      select: {
        id: true,
        key: true,
        thumbnailUrl: true,
      },
    });

    this.logger.log(
      `Found ${assets.length} assets and ${versions.length} versions to delete`,
    );

    // Step 3: Delete R2 files for all assets
    let deletedAssetFiles = 0;
    for (const asset of assets) {
      try {
        // Delete main asset file
        await this.mediaService.deleteFile(asset.key);
        deletedAssetFiles++;

        // Delete asset thumbnail if it exists
        if (asset.thumbnailUrl) {
          const thumbnailKey = this.extractKeyFromUrl(asset.thumbnailUrl);
          if (thumbnailKey) {
            await this.mediaService.deleteFile(thumbnailKey);
            deletedAssetFiles++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to delete R2 files for asset ${asset.id}:`,
          error,
        );
        // Continue with other deletions even if one fails
      }
    }

    // Step 4: Delete R2 files for all versions
    let deletedVersionFiles = 0;
    for (const version of versions) {
      try {
        // Delete version file
        await this.mediaService.deleteFile(version.key);
        deletedVersionFiles++;

        // Delete version thumbnail if it exists
        if (version.thumbnailUrl) {
          const thumbnailKey = this.extractKeyFromUrl(version.thumbnailUrl);
          if (thumbnailKey) {
            await this.mediaService.deleteFile(thumbnailKey);
            deletedVersionFiles++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to delete R2 files for version ${version.id}:`,
          error,
        );
        // Continue with other deletions even if one fails
      }
    }

    // Step 5: Delete project from database (CASCADE handles all related records)
    // This deletes: assets, versions, collaborators, folders, collections, frames, comments
    await this.prisma.mediaProject.delete({
      where: { id: projectId },
    });

    this.logger.log(
      `Project ${projectId} deleted successfully. Removed ${deletedAssetFiles} asset files and ${deletedVersionFiles} version files from R2`,
    );

    return {
      message: "Project deleted successfully",
      deletedAssets: assets.length,
      deletedVersions: versions.length,
      deletedR2Files: deletedAssetFiles + deletedVersionFiles,
    };
  }

  /**
   * Helper method to extract R2 key from proxy URL
   * Handles both old and new URL formats
   */
  private extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    // Format: http://localhost:5000/api/v1/media/proxy/{key}
    const match = url.match(/\/api\/v1\/media\/proxy\/(.+)$/);
    if (match && match[1]) {
      return match[1];
    }

    // If no match, might already be a key
    if (!url.startsWith("http")) {
      return url;
    }

    return null;
  }

  /**
   * Verify if user has access to a project
   */
  async verifyProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return !!collaborator;
  }

  /**
   * Get user's role in a project
   */
  async getUserRole(userId: string, projectId: string) {
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return collaborator?.role || null;
  }

  /**
   * Enable public sharing for a project
   */
  async enablePublicSharing(
    projectId: string,
    userId: string,
    expiresAt?: string | null,
  ) {
    // Verify user is owner
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        "Only project owner can enable public sharing",
      );
    }

    // Generate token if not exists
    const publicShareToken =
      project.publicShareToken || generatePublicShareToken();
    const publicShareUrl = generatePublicShareUrl(publicShareToken);

    return this.prisma.mediaProject.update({
      where: { id: projectId },
      data: {
        isPublic: true,
        publicShareToken,
        publicShareUrl,
        publicSharedAt: project.publicSharedAt || new Date(),
        // `expiresAt` omitted → leave existing; explicit null → clear (never expires).
        ...(expiresAt !== undefined
          ? { publicShareExpiresAt: expiresAt ? new Date(expiresAt) : null }
          : {}),
      },
    });
  }

  /**
   * Disable public sharing for a project
   */
  async disablePublicSharing(projectId: string, userId: string) {
    // Verify user is owner
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        "Only project owner can disable public sharing",
      );
    }

    return this.prisma.mediaProject.update({
      where: { id: projectId },
      data: {
        isPublic: false,
        // Keep token for re-enabling (don't regenerate)
      },
    });
  }

  /**
   * Regenerate public share link (invalidate old one)
   */
  async regeneratePublicShareLink(projectId: string, userId: string) {
    // Verify user is owner
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException("Only project owner can regenerate link");
    }

    const publicShareToken = generatePublicShareToken();
    const publicShareUrl = generatePublicShareUrl(publicShareToken);

    return this.prisma.mediaProject.update({
      where: { id: projectId },
      data: {
        publicShareToken,
        publicShareUrl,
        publicViewCount: 0, // Reset view count
      },
    });
  }

  /**
   * Get project by public share token (no auth required)
   */
  async getPublicProject(token: string) {
    const project = await this.prisma.mediaProject.findUnique({
      where: { publicShareToken: token },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        publicAccessLevel: true,
        publicViewCount: true,
        publicShareExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        // createdBy is kept internally for authorId usage but NOT exposed in the return shape
        createdBy: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    if (!project || !project.isPublic) {
      throw new NotFoundException("Public share link not found or disabled");
    }

    if (
      project.publicShareExpiresAt &&
      project.publicShareExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException("This public share link has expired");
    }

    // Increment view count
    await this.prisma.mediaProject.update({
      where: { id: project.id },
      data: { publicViewCount: { increment: 1 } },
    });

    // Strip internal fields before returning to anonymous callers
    const { createdBy, ...publicProject } = project;
    // Re-attach createdBy as a non-enumerable property so internal callers
    // (e.g. public.controller.ts) can still read project.createdBy for authorId.
    Object.defineProperty(publicProject, 'createdBy', { value: createdBy, enumerable: false });

    return publicProject as typeof publicProject & { createdBy: string };
  }

  /**
   * Get public project assets (no auth required)
   */
  async getPublicProjectAssets(token: string) {
    const project = await this.prisma.mediaProject.findUnique({
      where: { publicShareToken: token },
    });

    if (!project || !project.isPublic) {
      throw new NotFoundException("Public share link not found or disabled");
    }

    if (
      project.publicShareExpiresAt &&
      project.publicShareExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException("This public share link has expired");
    }

    return this.prisma.mediaAsset.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        projectId: true,
        folderId: true,
        filename: true,
        originalName: true,
        description: true,
        url: true,
        // key (internal R2 path) intentionally omitted from public responses
        thumbnailUrl: true,
        mediaType: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        duration: true,
        fps: true,
        codec: true,
        bitrate: true,
        status: true,
        starRating: true,
        uploadedBy: true,
        uploadedAt: true,
        updatedAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
        metadata: true,
      },
      orderBy: { uploadedAt: "desc" },
    });
  }

  /**
   * Return the unique R2 key prefixes (folder/date/ segments) for all assets in a
   * public project.  Used when issuing a scoped media-access JWT so the Cloudflare
   * Worker can enforce that a public-share token only unlocks its own project's files.
   *
   * Example return value: ["content/2025-01-08/", "thumbnails/2025-01-08/"]
   */
  async getPublicProjectKeyPrefixes(token: string): Promise<string[]> {
    const project = await this.prisma.mediaProject.findUnique({
      where: { publicShareToken: token },
      select: { id: true, isPublic: true },
    });

    if (!project || !project.isPublic) {
      throw new NotFoundException("Public share link not found or disabled");
    }

    // Fetch the R2 `key` for every asset in this project.
    // `thumbnailUrl` is stored as a full URL (not a bare R2 key), so we only
    // need the asset's primary key here.  Thumbnail R2 keys follow the same
    // folder/date/ prefix pattern ("thumbnails/YYYY-MM-DD/…") and would match
    // the same prefix extracted from a sibling asset key if uploads happen on
    // the same day; for robustness we also include "thumbnails/" as a blanket
    // prefix whenever the project contains at least one VIDEO asset.
    const assets = await this.prisma.mediaAsset.findMany({
      where: { projectId: project.id },
      select: { key: true, mediaType: true },
    });

    const prefixSet = new Set<string>();
    let hasVideos = false;
    for (const asset of assets) {
      if (asset.key) {
        prefixSet.add(this.extractKeyPrefix(asset.key));
      }
      // Track whether any video assets exist so we can add the thumbnails prefix
      if (asset.mediaType === 'VIDEO') {
        hasVideos = true;
      }
    }

    // If the project has video assets, their thumbnails are stored under
    // "thumbnails/{date}/…".  We add a broader prefix to cover all thumbnail
    // dates rather than trying to enumerate them from a non-keyed URL field.
    if (hasVideos) {
      prefixSet.add('thumbnails/');
    }

    return Array.from(prefixSet);
  }

  /**
   * Derive the folder/date/ prefix from a full R2 key.
   * Key format: "{folder}/{date}/{hash}-{filename}.ext"
   * Returns: "{folder}/{date}/" (the first two path segments + trailing slash)
   */
  private extractKeyPrefix(key: string): string {
    const parts = key.split('/');
    // At minimum take the first two segments (folder + date), fall back to first segment
    if (parts.length >= 3) {
      return `${parts[0]}/${parts[1]}/`;
    }
    if (parts.length >= 2) {
      return `${parts[0]}/`;
    }
    return '';
  }

  /**
   * Get public project folders (no auth required)
   */
  async getPublicProjectFolders(token: string) {
    const project = await this.prisma.mediaProject.findUnique({
      where: { publicShareToken: token },
    });

    if (!project || !project.isPublic) {
      throw new NotFoundException("Public share link not found or disabled");
    }

    return this.prisma.mediaFolder.findMany({
      where: { projectId: project.id },
      include: {
        _count: {
          select: {
            assets: true,
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }
}
