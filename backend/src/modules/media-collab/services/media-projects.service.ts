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

    return mediaProject;
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
  async enablePublicSharing(projectId: string, userId: string) {
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
      include: {
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

    // Increment view count
    await this.prisma.mediaProject.update({
      where: { id: project.id },
      data: { publicViewCount: { increment: 1 } },
    });

    return project;
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
        key: true,
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
