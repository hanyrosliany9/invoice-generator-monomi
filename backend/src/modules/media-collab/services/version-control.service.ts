import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { MediaProcessingService } from './media-processing.service';
import { MetadataService } from './metadata.service';

/**
 * VersionControlService
 *
 * Manages asset version history and rollback functionality.
 * Automatically creates version snapshots when assets are updated.
 */
@Injectable()
export class VersionControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly processingService: MediaProcessingService,
    private readonly metadataService: MetadataService,
  ) {}

  /**
   * Create a new version of an asset
   */
  async createVersion(
    assetId: string,
    file: Express.Multer.File,
    changeNotes: string,
    userId: string,
  ) {
    // Verify asset exists and user has access
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        project: {
          include: {
            collaborators: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check user has EDITOR or OWNER role
    const collaborator = asset.project.collaborators.find((c) => c.userId === userId);
    if (!collaborator || (collaborator.role !== 'EDITOR' && collaborator.role !== 'OWNER')) {
      throw new ForbiddenException('Only editors can upload new versions');
    }

    // Upload new file to R2
    const uploadResult = await this.mediaService.uploadFile(file, 'media-collab');

    // Determine version number
    const latestVersion = asset.versions[0];
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Extract metadata based on file type
    let duration: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let thumbnailUrl: string | undefined;

    if (asset.mediaType === 'VIDEO') {
      const metadata = await this.processingService.extractVideoMetadata(uploadResult.url);
      duration = metadata.duration;
      width = metadata.width;
      height = metadata.height;

      // Generate thumbnail
      const thumbnailBuffer = await this.processingService.generateVideoThumbnail(
        uploadResult.url,
        0,
      );
      const thumbnailUpload = await this.mediaService.uploadFile(
        {
          buffer: thumbnailBuffer,
          originalname: `${uploadResult.key}_thumb.jpg`,
          mimetype: 'image/jpeg',
        } as any,
        'media-collab/thumbnails',
      );
      thumbnailUrl = thumbnailUpload.url;
    } else if (asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE') {
      const processed = await this.processingService.processPhoto(file.buffer);
      width = processed.width;
      height = processed.height;

      // Upload thumbnail
      const thumbnailUpload = await this.mediaService.uploadFile(
        {
          buffer: processed.thumbnail,
          originalname: `${uploadResult.key}_thumb.jpg`,
          mimetype: 'image/jpeg',
        } as any,
        'media-collab/thumbnails',
      );
      thumbnailUrl = thumbnailUpload.url;
    }

    // Create version record
    const version = await this.prisma.mediaVersion.create({
      data: {
        assetId,
        versionNumber,
        filename: file.originalname,
        url: uploadResult.url,
        key: uploadResult.key,
        thumbnailUrl,
        size: BigInt(file.size),
        duration: duration ? duration.toString() : null,
        width,
        height,
        changeNotes,
        uploadedBy: userId,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update asset to point to latest version
    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        thumbnailUrl,
        size: BigInt(file.size),
        duration: duration ? duration.toString() : null,
        width,
        height,
      },
    });

    return version;
  }

  /**
   * Get all versions for an asset
   */
  async getVersions(assetId: string) {
    const versions = await this.prisma.mediaVersion.findMany({
      where: { assetId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return versions;
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string) {
    const version = await this.prisma.mediaVersion.findUnique({
      where: { id: versionId },
      include: {
        asset: {
          include: {
            project: true,
          },
        },
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(assetId: string, versionId: string, userId: string) {
    // Verify asset exists and user has access
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        project: {
          include: {
            collaborators: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check user has EDITOR or OWNER role
    const collaborator = asset.project.collaborators.find((c) => c.userId === userId);
    if (!collaborator || (collaborator.role !== 'EDITOR' && collaborator.role !== 'OWNER')) {
      throw new ForbiddenException('Only editors can rollback versions');
    }

    // Get target version
    const targetVersion = await this.prisma.mediaVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion || targetVersion.assetId !== assetId) {
      throw new NotFoundException('Version not found');
    }

    // Update asset to use this version's file
    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        url: targetVersion.url,
        key: targetVersion.key,
        thumbnailUrl: targetVersion.thumbnailUrl,
        size: targetVersion.size,
        duration: targetVersion.duration,
        width: targetVersion.width,
        height: targetVersion.height,
      },
    });

    return { success: true, rolledBackTo: targetVersion.versionNumber };
  }

  /**
   * Delete a version (only if not the current active version)
   */
  async deleteVersion(versionId: string, userId: string) {
    const version = await this.prisma.mediaVersion.findUnique({
      where: { id: versionId },
      include: {
        asset: {
          include: {
            project: {
              include: {
                collaborators: true,
              },
            },
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Check user has OWNER role
    const collaborator = version.asset.project.collaborators.find((c) => c.userId === userId);
    if (!collaborator || collaborator.role !== 'OWNER') {
      throw new ForbiddenException('Only project owners can delete versions');
    }

    // Don't allow deleting if it's the current active version
    if (version.asset.url === version.url) {
      throw new ForbiddenException('Cannot delete the current active version');
    }

    // Delete from R2
    await this.mediaService.deleteFile(version.key);
    if (version.thumbnailUrl) {
      const thumbnailKey = version.key + '_thumb.jpg';
      await this.mediaService.deleteFile(thumbnailKey);
    }

    // Delete version record
    await this.prisma.mediaVersion.delete({
      where: { id: versionId },
    });

    return { success: true };
  }

  /**
   * Compare two versions
   */
  async compareVersions(versionId1: string, versionId2: string) {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    // Ensure both versions belong to the same asset
    if (version1.assetId !== version2.assetId) {
      throw new ForbiddenException('Versions must belong to the same asset');
    }

    return {
      version1: {
        ...version1,
        versionNumber: version1.versionNumber,
        uploader: version1.uploader,
      },
      version2: {
        ...version2,
        versionNumber: version2.versionNumber,
        uploader: version2.uploader,
      },
      differences: {
        sizeChange: Number(version2.size) - Number(version1.size),
        durationChange: version2.duration && version1.duration
          ? Number(version2.duration) - Number(version1.duration)
          : null,
        resolutionChanged: version1.width !== version2.width || version1.height !== version2.height,
      },
    };
  }
}
