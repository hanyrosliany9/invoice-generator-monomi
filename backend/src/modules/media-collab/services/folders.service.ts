import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { MoveAssetsDto } from '../dto/move-assets.dto';

@Injectable()
export class MediaFoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new folder in a project
   */
  async createFolder(userId: string, createFolderDto: CreateFolderDto) {
    const { name, description, projectId, parentId } = createFolderDto;

    // Verify user has access to the project
    const project = await this.prisma.mediaProject.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId } } },
        ],
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // If parentId is provided, verify it exists and belongs to the same project
    if (parentId) {
      const parentFolder = await this.prisma.mediaFolder.findFirst({
        where: {
          id: parentId,
          projectId,
        },
      });

      if (!parentFolder) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    // Check for duplicate folder names at the same level
    const existingFolder = await this.prisma.mediaFolder.findFirst({
      where: {
        name,
        projectId,
        parentId: parentId || null,
      },
    });

    if (existingFolder) {
      throw new BadRequestException('A folder with this name already exists at this level');
    }

    // Create the folder
    const folder = await this.prisma.mediaFolder.create({
      data: {
        name,
        description,
        projectId,
        parentId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            assets: true,
          },
        },
      },
    });

    return folder;
  }

  /**
   * Get folder tree for a project
   */
  async getFolderTree(userId: string, projectId: string) {
    // Verify user has access to the project
    const project = await this.prisma.mediaProject.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId } } },
          { isPublic: true },
        ],
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Get all folders for the project with their hierarchy
    const folders = await this.prisma.mediaFolder.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            children: true,
            assets: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    // Build tree structure
    return this.buildFolderTree(folders);
  }

  /**
   * Get folder contents (subfolders and assets)
   */
  async getFolderContents(userId: string, folderId: string) {
    // Get folder with access check
    const folder = await this.prisma.mediaFolder.findFirst({
      where: {
        id: folderId,
        project: {
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
            { isPublic: true },
          ],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                children: true,
                assets: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        assets: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                frames: true,
                versions: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            children: true,
            assets: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found or access denied');
    }

    return folder;
  }

  /**
   * Get folder breadcrumb path
   */
  async getFolderPath(userId: string, folderId: string) {
    const folder = await this.prisma.mediaFolder.findFirst({
      where: {
        id: folderId,
        project: {
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
            { isPublic: true },
          ],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found or access denied');
    }

    // Build path from root to current folder
    const path = [];
    let currentFolder: any = folder;

    while (currentFolder) {
      path.unshift({
        id: currentFolder.id,
        name: currentFolder.name,
      });

      if (currentFolder.parentId) {
        currentFolder = await this.prisma.mediaFolder.findUnique({
          where: { id: currentFolder.parentId },
        });
      } else {
        currentFolder = null;
      }
    }

    return {
      project: folder.project,
      path,
    };
  }

  /**
   * Update folder
   */
  async updateFolder(userId: string, folderId: string, updateFolderDto: UpdateFolderDto) {
    // Get folder with access check
    const folder = await this.prisma.mediaFolder.findFirst({
      where: {
        id: folderId,
        project: {
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
          ],
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found or access denied');
    }

    // If moving to a new parent, validate
    if (updateFolderDto.parentId !== undefined) {
      // Cannot move folder into itself
      if (updateFolderDto.parentId === folderId) {
        throw new BadRequestException('Cannot move folder into itself');
      }

      // Cannot move folder into its own descendant
      if (updateFolderDto.parentId) {
        const isDescendant = await this.isDescendant(folderId, updateFolderDto.parentId);
        if (isDescendant) {
          throw new BadRequestException('Cannot move folder into its own descendant');
        }

        // Verify parent exists in same project
        const parentFolder = await this.prisma.mediaFolder.findFirst({
          where: {
            id: updateFolderDto.parentId,
            projectId: folder.projectId,
          },
        });

        if (!parentFolder) {
          throw new NotFoundException('Parent folder not found');
        }
      }

      // Check for duplicate name at new location
      if (updateFolderDto.name || updateFolderDto.parentId) {
        const name = updateFolderDto.name || folder.name;
        const parentId = updateFolderDto.parentId;

        const existingFolder = await this.prisma.mediaFolder.findFirst({
          where: {
            name,
            projectId: folder.projectId,
            parentId: parentId || null,
            NOT: { id: folderId },
          },
        });

        if (existingFolder) {
          throw new BadRequestException('A folder with this name already exists at the target location');
        }
      }
    }

    // Update folder
    const updatedFolder = await this.prisma.mediaFolder.update({
      where: { id: folderId },
      data: {
        ...(updateFolderDto.name && { name: updateFolderDto.name }),
        ...(updateFolderDto.description !== undefined && { description: updateFolderDto.description }),
        ...(updateFolderDto.parentId !== undefined && { parentId: updateFolderDto.parentId }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            assets: true,
          },
        },
      },
    });

    return updatedFolder;
  }

  /**
   * Delete folder (with R2 cleanup and asset deletion)
   * Deletes:
   * - All assets in folder and nested folders (from DB and R2)
   * - All nested child folders
   * - The folder itself
   */
  async deleteFolder(userId: string, folderId: string) {
    // Get folder with access check - first check access
    const folder = await this.prisma.mediaFolder.findFirst({
      where: {
        id: folderId,
        project: {
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
          ],
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found or access denied');
    }

    // Get all folder IDs recursively (current folder + all descendants)
    const allFolderIds = await this.getAllNestedFolderIds(folderId);

    // Get all assets in this folder and all nested folders
    const assetsToDelete = await this.prisma.mediaAsset.findMany({
      where: {
        folderId: { in: allFolderIds },
      },
      select: {
        id: true,
        key: true,
        thumbnailUrl: true,
      },
    });

    // Step 1: Delete all R2 files for assets
    let deletedR2FilesCount = 0;
    for (const asset of assetsToDelete) {
      try {
        // Delete main file from R2
        await this.mediaService.deleteFile(asset.key);
        deletedR2FilesCount++;

        // Delete thumbnail if it exists
        if (asset.thumbnailUrl) {
          // Extract thumbnail key from URL (format: http://localhost:5000/api/v1/media/proxy/{key})
          const thumbnailKey = asset.thumbnailUrl.replace(/^https?:\/\/[^\/]+\/api\/v1\/media\/proxy\//, '');
          if (thumbnailKey && thumbnailKey !== asset.thumbnailUrl) {
            await this.mediaService.deleteFile(thumbnailKey);
            deletedR2FilesCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to delete R2 file for asset ${asset.id}:`, error);
        // Continue deleting other files even if one fails
      }
    }

    // Step 2: Delete all asset database records
    // This also deletes related records (comments, frames, etc.) via CASCADE
    if (assetsToDelete.length > 0) {
      await this.prisma.mediaAsset.deleteMany({
        where: {
          id: { in: assetsToDelete.map(a => a.id) },
        },
      });
    }

    // Get counts for response
    const childrenCount = allFolderIds.length - 1; // Exclude the main folder
    const assetsCount = assetsToDelete.length;

    // Step 3: Delete folder from database (cascade will handle child folders)
    await this.prisma.mediaFolder.delete({
      where: { id: folderId },
    });

    return {
      message: 'Folder deleted successfully',
      deletedFolderId: folderId,
      deletedChildFolders: childrenCount,
      deletedAssets: assetsCount,
      deletedR2Files: deletedR2FilesCount,
    };
  }

  /**
   * Recursively get all folder IDs (current folder + all nested descendants)
   */
  private async getAllNestedFolderIds(folderId: string): Promise<string[]> {
    const folderIds: string[] = [folderId];

    // Get direct children
    const children = await this.prisma.mediaFolder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    });

    // Recursively get descendants of each child
    for (const child of children) {
      const childFolderIds = await this.getAllNestedFolderIds(child.id);
      folderIds.push(...childFolderIds);
    }

    return folderIds;
  }

  /**
   * Move assets to a folder
   */
  async moveAssets(userId: string, projectId: string, moveAssetsDto: MoveAssetsDto) {
    const { assetIds, folderId } = moveAssetsDto;

    // Verify user has access to the project
    const project = await this.prisma.mediaProject.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // If folderId is provided, verify it exists in the project
    if (folderId) {
      const folder = await this.prisma.mediaFolder.findFirst({
        where: {
          id: folderId,
          projectId,
        },
      });

      if (!folder) {
        throw new NotFoundException('Target folder not found');
      }
    }

    // Verify all assets exist and belong to the project
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: assetIds },
        projectId,
      },
    });

    if (assets.length !== assetIds.length) {
      throw new BadRequestException('One or more assets not found or do not belong to this project');
    }

    // Move assets
    await this.prisma.mediaAsset.updateMany({
      where: {
        id: { in: assetIds },
      },
      data: {
        folderId: folderId || null,
      },
    });

    return {
      message: 'Assets moved successfully',
      movedCount: assetIds.length,
      targetFolderId: folderId || null,
    };
  }

  /**
   * Helper: Check if targetId is a descendant of folderId
   */
  private async isDescendant(folderId: string, targetId: string): Promise<boolean> {
    let current = await this.prisma.mediaFolder.findUnique({
      where: { id: targetId },
    });

    while (current && current.parentId) {
      if (current.parentId === folderId) {
        return true;
      }
      current = await this.prisma.mediaFolder.findUnique({
        where: { id: current.parentId },
      });
    }

    return false;
  }

  /**
   * Helper: Build hierarchical folder tree
   */
  private buildFolderTree(folders: any[]): any[] {
    const folderMap = new Map();
    const rootFolders: any[] = [];

    // First pass: create map
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build tree
    folders.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  }
}
