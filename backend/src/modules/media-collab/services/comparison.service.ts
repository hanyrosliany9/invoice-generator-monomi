import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CollaboratorRole } from '@prisma/client';
import { MediaAssetWithProject, MediaAssetWithVersions } from '../types/prisma-extended.types';

/**
 * ComparisonService
 *
 * Handles side-by-side photo/video comparison logic.
 * Supports comparing 2-4 assets or multiple versions of the same asset.
 */
@Injectable()
export class ComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compare multiple assets side-by-side
   * Validates that user has access and assets are same type
   */
  async compareAssets(assetIds: string[], userId: string) {
    // Validate input
    if (assetIds.length < 2 || assetIds.length > 4) {
      throw new BadRequestException('Can compare 2-4 assets at a time');
    }

    // Fetch assets with project and collaborator info
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: assetIds } },
      include: {
        project: {
          include: {
            collaborators: {
              where: { userId },
            },
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        metadata: true,
      },
    }) as MediaAssetWithProject[];

    // Check if all assets were found
    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more assets not found');
    }

    // Check user has access to all assets
    for (const asset of assets) {
      const hasAccess =
        asset.project.createdBy === userId ||
        asset.project.collaborators.length > 0;

      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to one or more assets');
      }
    }

    // Check if all assets belong to same project (recommended but not required)
    const projectIds = [...new Set(assets.map((a) => a.projectId))];
    if (projectIds.length > 1) {
      // Just warn in logs, don't fail - users might want to compare across projects
      console.warn(`Comparing assets from ${projectIds.length} different projects`);
    }

    // Check if all assets are same media type
    const mediaTypes = [...new Set(assets.map((a) => a.mediaType))];
    if (mediaTypes.length > 1) {
      throw new BadRequestException('All assets must be the same type (all photos or all videos)');
    }

    return {
      assets,
      comparisonType: assets[0].mediaType,
      canCompare: true,
      sameProject: projectIds.length === 1,
      projectId: projectIds.length === 1 ? projectIds[0] : null,
    };
  }

  /**
   * Compare multiple versions of the same asset
   * Useful for reviewing edits/iterations
   */
  async compareVersions(assetId: string, versionNumbers: number[], userId: string) {
    // Fetch the asset with versions and access info
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        project: {
          include: {
            collaborators: {
              where: { userId },
            },
          },
        },
        versions: {
          where: {
            versionNumber: { in: versionNumbers },
          },
          orderBy: {
            versionNumber: 'asc',
          },
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }) as MediaAssetWithVersions | null;

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check user has access
    const hasAccess =
      asset.project.createdBy === userId ||
      asset.project.collaborators.length > 0;

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this asset');
    }

    // Validate versions were found
    if (asset.versions.length !== versionNumbers.length) {
      throw new NotFoundException('One or more versions not found');
    }

    return {
      asset: {
        id: asset.id,
        filename: asset.filename,
        originalName: asset.originalName,
        mediaType: asset.mediaType,
      },
      versions: asset.versions,
      comparisonType: 'versions',
    };
  }
}
