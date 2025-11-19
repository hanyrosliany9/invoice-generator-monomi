import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { MediaProcessingService } from './media-processing.service';
import { MetadataService } from './metadata.service';

/**
 * MediaAssetsService
 *
 * Handles video and photo upload, storage, and management.
 * Integrates with R2 storage, FFmpeg for videos, Sharp for photos.
 */
@Injectable()
export class MediaAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly processingService: MediaProcessingService,
    private readonly metadataService: MetadataService,
  ) {}

  /**
   * Check for duplicate files in a project
   * Returns existing assets with matching originalName
   */
  async checkDuplicates(
    projectId: string,
    userId: string,
    filenames: string[],
  ) {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    // Find existing assets with matching filenames
    const existingAssets = await this.prisma.mediaAsset.findMany({
      where: {
        projectId,
        originalName: {
          in: filenames,
        },
      },
      select: {
        id: true,
        originalName: true,
        filename: true,
        url: true,
        size: true,
        uploadedAt: true,
        uploadedBy: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create a map of filename -> existing asset
    const duplicatesMap = new Map();
    existingAssets.forEach((asset) => {
      duplicatesMap.set(asset.originalName, {
        id: asset.id,
        originalName: asset.originalName,
        size: asset.size.toString(),
        uploadedAt: asset.uploadedAt,
        uploadedBy: asset.uploader.name,
        url: asset.url,
      });
    });

    return duplicatesMap;
  }

  /**
   * Upload a video or photo asset
   * Supports conflict resolution for duplicate files
   */
  async upload(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
    description?: string,
    folderId?: string,
    conflictResolution?: 'skip' | 'replace' | 'keep-both',
  ) {
    try {
      console.log('[MediaAssetsService] Upload called:', {
        projectId,
        userId,
        filename: file?.originalname,
        size: file?.size,
        conflictResolution
      });

      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Check for duplicates and handle conflict resolution
      if (conflictResolution) {
        const existingAsset = await this.prisma.mediaAsset.findFirst({
          where: {
            projectId,
            originalName: file.originalname,
          },
        });

        if (existingAsset) {
          if (conflictResolution === 'skip') {
            // Skip upload, return existing asset
            console.log('[MediaAssetsService] Skipping duplicate file:', file.originalname);
            return await this.findOne(existingAsset.id, userId);
          } else if (conflictResolution === 'replace') {
            // Delete existing asset and its R2 files
            console.log('[MediaAssetsService] Replacing existing file:', file.originalname);
            await this.remove(existingAsset.id, userId);
            // Continue with upload below
          } else if (conflictResolution === 'keep-both') {
            // Rename file with timestamp
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
            const nameParts = file.originalname.split('.');
            const extension = nameParts.pop();
            const baseName = nameParts.join('.');
            file.originalname = `${baseName}_${timestamp}.${extension}`;
            console.log('[MediaAssetsService] Renaming duplicate to:', file.originalname);
          }
        }
      }

      // Verify project exists and user has access
      const project = await this.prisma.mediaProject.findUnique({
        where: { id: projectId },
        include: {
          collaborators: true,
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      const hasAccess = project.collaborators.some(
        (collab) => collab.userId === userId,
      );

      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this project');
      }

      // Check user role (OWNER, EDITOR can upload)
      const collaborator = project.collaborators.find(
        (collab) => collab.userId === userId,
      );

      if (!collaborator) {
        throw new ForbiddenException('You are not a collaborator on this project');
      }

      if (
        collaborator.role === 'VIEWER' ||
        collaborator.role === 'COMMENTER'
      ) {
        throw new ForbiddenException('Only OWNER or EDITOR can upload assets');
      }

      console.log('[MediaAssetsService] Uploading file to R2...');
      // Upload to R2
      const uploadResult = await this.mediaService.uploadFile(file);
      console.log('[MediaAssetsService] R2 upload complete:', uploadResult.key);

      // Determine media type
      const mediaType = this.determineMediaType(file.mimetype);

      // Process media based on type
      let processedData: any = {};
      let thumbnailUrl: string | undefined = undefined;

      if (mediaType === 'VIDEO') {
        console.log('[MediaAssetsService] Processing video...');

        // FFmpeg needs access to the actual video file, not a proxy URL
        // Solution: Use the uploaded file buffer directly or write to temp file
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        // Write video to temporary file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${file.originalname}`);

        try {
          // Write buffer to temp file
          fs.writeFileSync(tempFilePath, file.buffer);
          console.log('[MediaAssetsService] Video written to temp file:', tempFilePath);

          // Extract video metadata (duration, fps, codec, bitrate)
          processedData = await this.processingService.extractVideoMetadata(tempFilePath);

          // Generate video thumbnail at 1 second
          console.log('[MediaAssetsService] Generating video thumbnail...');
          const thumbnailBuffer = await this.processingService.generateVideoThumbnail(
            tempFilePath,
            1, // Extract frame at 1 second
          );

          // Upload thumbnail to R2
          const thumbnailUpload = await this.mediaService.uploadFile(
            {
              buffer: thumbnailBuffer,
              originalname: `thumb-${file.originalname}.jpg`,
              mimetype: 'image/jpeg',
              size: thumbnailBuffer.length,
            } as Express.Multer.File,
            'thumbnails',
          );

          thumbnailUrl = thumbnailUpload.url;
          console.log('[MediaAssetsService] Video thumbnail generated:', thumbnailUpload.key);
        } catch (error) {
          console.error('[MediaAssetsService] Failed to process video:', error);
          // Continue without thumbnail/metadata - video will still work
        } finally {
          // Clean up temp file
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log('[MediaAssetsService] Temp file cleaned up');
            }
          } catch (cleanupError) {
            console.error('[MediaAssetsService] Failed to cleanup temp file:', cleanupError);
          }
        }
      } else if (mediaType === 'IMAGE' || mediaType === 'RAW_IMAGE') {
        console.log('[MediaAssetsService] Processing image and generating thumbnails...');

        // Process photo to generate thumbnails and get dimensions
        try {
          const photoResult = await this.processingService.processPhoto(file.buffer);
          processedData.width = photoResult.width;
          processedData.height = photoResult.height;

          // Upload thumbnail to R2
          const thumbnailBuffer = photoResult.thumbnail;
          const thumbnailUpload = await this.mediaService.uploadFile(
            {
              buffer: thumbnailBuffer,
              originalname: `thumb-${file.originalname}`,
              mimetype: 'image/jpeg',
              size: thumbnailBuffer.length,
            } as Express.Multer.File,
            'thumbnails',
          );

          thumbnailUrl = thumbnailUpload.url;
          console.log('[MediaAssetsService] Thumbnail generated:', thumbnailUpload.key);
        } catch (error) {
          console.error('[MediaAssetsService] Failed to generate thumbnail:', error);
          // Continue without thumbnail
        }

        // Extract EXIF data
        const exifData = await this.metadataService.extractExifData(file);
        processedData.exifData = exifData;
      }

      console.log('[MediaAssetsService] Creating database record...');
      // Create media asset record
      const asset = await this.prisma.mediaAsset.create({
        data: {
          projectId,
          folderId: folderId || null,
          filename: uploadResult.key,
          originalName: file.originalname,
          description,
          url: uploadResult.url,
          key: uploadResult.key,
          thumbnailUrl: thumbnailUrl || uploadResult.thumbnailUrl,
          mediaType,
          mimeType: file.mimetype,
          size: BigInt(file.size),
          width: uploadResult.width || processedData.width,
          height: uploadResult.height || processedData.height,
          duration: processedData.duration,
          fps: processedData.fps,
          codec: processedData.codec,
          bitrate: processedData.bitrate,
          uploadedBy: userId,
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
      });

      // If EXIF data exists, create metadata record
      if (processedData.exifData) {
        await this.metadataService.createOrUpdateMetadata(asset.id, {
          ...processedData.exifData,
        });
      }

      console.log('[MediaAssetsService] Upload complete:', asset.id);
      return asset;
    } catch (error) {
      console.error('[MediaAssetsService] Upload error:', error);
      throw error;
    }
  }

  /**
   * Get all assets in a project
   */
  async findAll(projectId: string, userId: string, filters?: any) {
    // Verify access
    const hasAccess = await this.verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    // Build where clause
    const where: any = {
      projectId,
    };

    if (filters?.mediaType) {
      where.mediaType = filters.mediaType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.starRating) {
      where.starRating = filters.starRating;
    }

    if (filters?.search) {
      where.OR = [
        { originalName: { contains: filters.search, mode: 'insensitive' } },
        { filename: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.uploadedAt = 'desc'; // Default sort
    }

    const assets = await this.prisma.mediaAsset.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        metadata: true,
        _count: {
          select: {
            frames: true,
            versions: true,
          },
        },
      },
      orderBy,
    });

    return assets;
  }

  /**
   * Get a single asset by ID
   */
  async findOne(assetId: string, userId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        project: {
          include: {
            collaborators: true,
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
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
        frames: {
          include: {
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            timestamp: 'asc',
          },
        },
        _count: {
          select: {
            frames: true,
            versions: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Verify access
    const hasAccess = asset.project.collaborators.some(
      (collab) => collab.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this asset');
    }

    return asset;
  }

  /**
   * Update asset status
   */
  async updateStatus(assetId: string, userId: string, status: string) {
    // Verify access and permissions
    const asset = await this.findOne(assetId, userId);

    const updatedAsset = await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: status as any },
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
    });

    return updatedAsset;
  }

  /**
   * Delete an asset (OWNER/EDITOR only)
   * CRITICAL: Also deletes all version files from R2
   */
  async remove(assetId: string, userId: string) {
    const asset = await this.findOne(assetId, userId);

    // Check permissions
    const collaborator = asset.project.collaborators.find(
      (collab) => collab.userId === userId,
    );

    if (!collaborator) {
      throw new ForbiddenException('You are not a collaborator on this project');
    }

    if (
      collaborator.role === 'VIEWER' ||
      collaborator.role === 'COMMENTER'
    ) {
      throw new ForbiddenException('Only OWNER or EDITOR can delete assets');
    }

    // Step 1: Get all versions before deleting asset
    const versions = await this.prisma.mediaVersion.findMany({
      where: { assetId },
      select: {
        id: true,
        key: true,
        thumbnailUrl: true,
      },
    });

    // Step 2: Delete R2 files for all versions
    let deletedVersionFiles = 0;
    for (const version of versions) {
      try {
        // Delete version main file
        await this.mediaService.deleteFile(version.key);
        deletedVersionFiles++;

        // Delete version thumbnail if it exists
        if (version.thumbnailUrl) {
          const thumbnailKey = version.thumbnailUrl.replace(/^https?:\/\/[^\/]+\/api\/v1\/media\/proxy\//, '');
          if (thumbnailKey) {
            await this.mediaService.deleteFile(thumbnailKey);
            deletedVersionFiles++;
          }
        }
      } catch (error) {
        console.error(`Failed to delete R2 files for version ${version.id}:`, error);
        // Continue with other deletions even if one fails
      }
    }

    // Step 3: Delete asset main file from R2
    await this.mediaService.deleteFile(asset.key);

    // Step 4: Delete asset thumbnail if it exists
    if (asset.thumbnailUrl) {
      // Extract thumbnail key from URL (format: http://localhost:5000/api/v1/media/proxy/{key})
      const thumbnailKey = asset.thumbnailUrl.replace(/^https?:\/\/[^\/]+\/api\/v1\/media\/proxy\//, '');
      if (thumbnailKey) {
        await this.mediaService.deleteFile(thumbnailKey);
      }
    }

    // Step 5: Delete from database (cascade will handle versions, frames, comments, etc.)
    await this.prisma.mediaAsset.delete({
      where: { id: assetId },
    });

    return {
      message: 'Asset deleted successfully',
      deletedVersions: versions.length,
      deletedVersionFiles,
    };
  }

  /**
   * Determine media type from MIME type
   */
  private determineMediaType(mimeType: string): 'VIDEO' | 'IMAGE' | 'RAW_IMAGE' {
    if (mimeType.startsWith('video/')) {
      return 'VIDEO';
    }

    // RAW image formats
    const rawFormats = [
      'image/x-canon-cr2',
      'image/x-canon-cr3',
      'image/x-nikon-nef',
      'image/x-sony-arw',
      'image/x-fuji-raf',
      'image/x-olympus-orf',
      'image/x-panasonic-rw2',
      'image/x-pentax-pef',
      'image/x-adobe-dng',
    ];

    if (rawFormats.includes(mimeType)) {
      return 'RAW_IMAGE';
    }

    return 'IMAGE';
  }

  /**
   * Verify if user has access to project
   */
  private async verifyProjectAccess(
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
}
