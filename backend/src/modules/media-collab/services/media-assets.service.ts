import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";
import { MediaProcessingService } from "./media-processing.service";
import { MetadataService } from "./metadata.service";
import archiver from "archiver";
import { PassThrough } from "stream";

/**
 * MediaAssetsService
 *
 * Handles video and photo upload, storage, and management.
 * Integrates with R2 storage, FFmpeg for videos, Sharp for photos.
 */
@Injectable()
export class MediaAssetsService {
  private readonly logger = new Logger(MediaAssetsService.name);

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
      throw new ForbiddenException("Access denied to this project");
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
    conflictResolution?: "skip" | "replace" | "keep-both",
  ) {
    try {
      console.log("[MediaAssetsService] Upload called:", {
        projectId,
        userId,
        filename: file?.originalname,
        size: file?.size,
        conflictResolution,
      });

      if (!file) {
        throw new BadRequestException("No file provided");
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
          if (conflictResolution === "skip") {
            // Skip upload, return existing asset
            console.log(
              "[MediaAssetsService] Skipping duplicate file:",
              file.originalname,
            );
            return await this.findOne(existingAsset.id, userId);
          } else if (conflictResolution === "replace") {
            // Delete existing asset and its R2 files
            console.log(
              "[MediaAssetsService] Replacing existing file:",
              file.originalname,
            );
            await this.remove(existingAsset.id, userId);
            // Continue with upload below
          } else if (conflictResolution === "keep-both") {
            // Rename file with timestamp
            const timestamp = new Date()
              .toISOString()
              .replace(/[-:]/g, "")
              .replace(/\..+/, "")
              .replace("T", "_");
            const nameParts = file.originalname.split(".");
            const extension = nameParts.pop();
            const baseName = nameParts.join(".");
            file.originalname = `${baseName}_${timestamp}.${extension}`;
            console.log(
              "[MediaAssetsService] Renaming duplicate to:",
              file.originalname,
            );
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
        throw new NotFoundException("Project not found");
      }

      const hasAccess = project.collaborators.some(
        (collab) => collab.userId === userId,
      );

      if (!hasAccess) {
        throw new ForbiddenException("Access denied to this project");
      }

      // Check user role (OWNER, EDITOR can upload)
      const collaborator = project.collaborators.find(
        (collab) => collab.userId === userId,
      );

      if (!collaborator) {
        throw new ForbiddenException(
          "You are not a collaborator on this project",
        );
      }

      if (collaborator.role === "VIEWER" || collaborator.role === "COMMENTER") {
        throw new ForbiddenException("Only OWNER or EDITOR can upload assets");
      }

      console.log("[MediaAssetsService] Uploading file to R2...");
      // Upload to R2
      const uploadResult = await this.mediaService.uploadFile(file);
      console.log("[MediaAssetsService] R2 upload complete:", uploadResult.key);

      // Determine media type
      const mediaType = this.determineMediaType(file.mimetype);

      // Process media based on type
      let processedData: any = {};
      let thumbnailUrl: string | undefined = undefined;

      if (mediaType === "VIDEO") {
        console.log("[MediaAssetsService] Processing video...");

        // FFmpeg needs access to the actual video file, not a proxy URL
        // Solution: Use the uploaded file buffer directly or write to temp file
        const fs = require("fs");
        const path = require("path");
        const os = require("os");

        // Write video to temporary file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(
          tempDir,
          `temp-${Date.now()}-${file.originalname}`,
        );

        try {
          // Write buffer to temp file
          fs.writeFileSync(tempFilePath, file.buffer);
          console.log(
            "[MediaAssetsService] Video written to temp file:",
            tempFilePath,
          );

          // Extract video metadata (duration, fps, codec, bitrate)
          processedData =
            await this.processingService.extractVideoMetadata(tempFilePath);

          // Generate video thumbnail at 1 second
          console.log("[MediaAssetsService] Generating video thumbnail...");
          const thumbnailBuffer =
            await this.processingService.generateVideoThumbnail(
              tempFilePath,
              1, // Extract frame at 1 second
            );

          // Upload thumbnail to R2
          const thumbnailUpload = await this.mediaService.uploadFile(
            {
              buffer: thumbnailBuffer,
              originalname: `thumb-${file.originalname}.jpg`,
              mimetype: "image/jpeg",
              size: thumbnailBuffer.length,
            } as Express.Multer.File,
            "thumbnails",
          );

          thumbnailUrl = thumbnailUpload.url;
          console.log(
            "[MediaAssetsService] Video thumbnail generated:",
            thumbnailUpload.key,
          );
        } catch (error) {
          console.error("[MediaAssetsService] Failed to process video:", error);
          // Continue without thumbnail/metadata - video will still work
        } finally {
          // Clean up temp file
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log("[MediaAssetsService] Temp file cleaned up");
            }
          } catch (cleanupError) {
            console.error(
              "[MediaAssetsService] Failed to cleanup temp file:",
              cleanupError,
            );
          }
        }
      } else if (mediaType === "IMAGE" || mediaType === "RAW_IMAGE") {
        console.log(
          "[MediaAssetsService] Processing image and generating thumbnails...",
        );

        // Process photo to generate thumbnails and get dimensions
        try {
          const photoResult = await this.processingService.processPhoto(
            file.buffer,
          );
          processedData.width = photoResult.width;
          processedData.height = photoResult.height;

          // Upload thumbnail to R2
          const thumbnailBuffer = photoResult.thumbnail;
          const thumbnailUpload = await this.mediaService.uploadFile(
            {
              buffer: thumbnailBuffer,
              originalname: `thumb-${file.originalname}`,
              mimetype: "image/jpeg",
              size: thumbnailBuffer.length,
            } as Express.Multer.File,
            "thumbnails",
          );

          thumbnailUrl = thumbnailUpload.url;
          console.log(
            "[MediaAssetsService] Thumbnail generated:",
            thumbnailUpload.key,
          );
        } catch (error) {
          console.error(
            "[MediaAssetsService] Failed to generate thumbnail:",
            error,
          );
          // Continue without thumbnail
        }

        // Extract EXIF data
        const exifData = await this.metadataService.extractExifData(file);
        processedData.exifData = exifData;
      }

      console.log("[MediaAssetsService] Creating database record...");
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

      console.log("[MediaAssetsService] Upload complete:", asset.id);
      return asset;
    } catch (error) {
      console.error("[MediaAssetsService] Upload error:", error);
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
      throw new ForbiddenException("Access denied to this project");
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
        { originalName: { contains: filters.search, mode: "insensitive" } },
        { filename: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "desc";
    } else {
      orderBy.uploadedAt = "desc"; // Default sort
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
            versionNumber: "desc",
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
            timestamp: "asc",
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
      throw new NotFoundException("Asset not found");
    }

    // Verify access
    const hasAccess = asset.project.collaborators.some(
      (collab) => collab.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to this asset");
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
      throw new ForbiddenException(
        "You are not a collaborator on this project",
      );
    }

    if (collaborator.role === "VIEWER" || collaborator.role === "COMMENTER") {
      throw new ForbiddenException("Only OWNER or EDITOR can delete assets");
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
          const thumbnailKey = version.thumbnailUrl.replace(
            /^https?:\/\/[^\/]+\/api\/v1\/media\/proxy\//,
            "",
          );
          if (thumbnailKey) {
            await this.mediaService.deleteFile(thumbnailKey);
            deletedVersionFiles++;
          }
        }
      } catch (error) {
        console.error(
          `Failed to delete R2 files for version ${version.id}:`,
          error,
        );
        // Continue with other deletions even if one fails
      }
    }

    // Step 3: Delete asset main file from R2
    await this.mediaService.deleteFile(asset.key);

    // Step 4: Delete asset thumbnail if it exists
    if (asset.thumbnailUrl) {
      // Extract thumbnail key from URL (format: http://localhost:5000/api/v1/media/proxy/{key})
      const thumbnailKey = asset.thumbnailUrl.replace(
        /^https?:\/\/[^\/]+\/api\/v1\/media\/proxy\//,
        "",
      );
      if (thumbnailKey) {
        await this.mediaService.deleteFile(thumbnailKey);
      }
    }

    // Step 5: Delete from database (cascade will handle versions, frames, comments, etc.)
    await this.prisma.mediaAsset.delete({
      where: { id: assetId },
    });

    return {
      message: "Asset deleted successfully",
      deletedVersions: versions.length,
      deletedVersionFiles,
    };
  }

  /**
   * Bulk delete multiple assets
   * Follows industry best practices: Google Drive (batch), Dropbox (async), Frame.io (bulk endpoint)
   *
   * Phase 1: Synchronous processing for up to 100 assets
   * Returns detailed results with success/failure status per asset
   *
   * @param assetIds Array of asset IDs to delete (max 100)
   * @param userId User performing the delete
   * @returns Summary of deletion results with per-asset status
   */
  async bulkDeleteAssets(
    assetIds: string[],
    userId: string,
  ): Promise<{
    total: number;
    deleted: number;
    failed: number;
    results: Array<{ assetId: string; success: boolean; error?: string }>;
  }> {
    console.log(
      `[MediaAssetsService] Bulk delete started: ${assetIds.length} assets`,
    );
    const results = [];

    for (const assetId of assetIds) {
      try {
        await this.remove(assetId, userId);
        results.push({ assetId, success: true });
        console.log(
          `[MediaAssetsService] Successfully deleted asset: ${assetId}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[MediaAssetsService] Failed to delete asset ${assetId}: ${errorMessage}`,
        );
        results.push({ assetId, success: false, error: errorMessage });
      }
    }

    const deleted = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `[MediaAssetsService] Bulk delete completed: ${deleted}/${assetIds.length} successful, ${failed} failed`,
    );

    return {
      total: assetIds.length,
      deleted,
      failed,
      results: results.filter((r) => !r.success), // Only return failures for debugging
    };
  }

  /**
   * Bulk download multiple assets as a ZIP archive
   * Streams the ZIP directly to the response to avoid memory issues
   *
   * @param assetIds Array of asset IDs to download (max 500)
   * @param userId User performing the download
   * @returns PassThrough stream containing the ZIP archive
   */
  async bulkDownloadAssets(
    assetIds: string[],
    userId: string,
  ): Promise<{
    stream: PassThrough;
    filename: string;
    assetCount: number;
  }> {
    this.logger.log(
      `[MediaAssetsService] Bulk download started: ${assetIds.length} assets`,
    );

    // 1. Fetch all asset records to validate access and get metadata
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: assetIds },
      },
      select: {
        id: true,
        key: true,
        originalName: true,
        filename: true,
        projectId: true,
        mimeType: true,
      },
    });

    if (assets.length === 0) {
      throw new NotFoundException("No assets found");
    }

    // 2. Verify user has access to all projects (assets may span multiple projects)
    const projectIds = [...new Set(assets.map((a) => a.projectId))];
    for (const projectId of projectIds) {
      const hasAccess = await this.verifyProjectAccess(userId, projectId);
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to project containing some assets`,
        );
      }
    }

    // 3. Create ZIP archive stream
    const passThrough = new PassThrough();
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Balance between speed and compression
    });

    // Handle archive errors
    archive.on("error", (err: Error) => {
      this.logger.error(`Archive error: ${err.message}`, err.stack);
      passThrough.destroy(err);
    });

    archive.on("warning", (err: archiver.ArchiverError) => {
      if (err.code === "ENOENT") {
        this.logger.warn(`Archive warning: ${err.message}`);
      } else {
        passThrough.destroy(err);
      }
    });

    // Pipe archive to passthrough stream
    archive.pipe(passThrough);

    // 4. Add files to archive with parallel fetching (limited concurrency)
    const addFilesToArchive = async () => {
      let addedCount = 0;
      const usedNames = new Map<string, number>();
      const CONCURRENCY_LIMIT = 10; // Fetch 10 files at a time

      // Helper to get unique filename
      const getUniqueFilename = (originalName: string): string => {
        const existingCount = usedNames.get(originalName) || 0;
        let fileName = originalName;
        if (existingCount > 0) {
          const ext = originalName.lastIndexOf(".");
          if (ext > 0) {
            fileName = `${originalName.substring(0, ext)}_${existingCount}${originalName.substring(ext)}`;
          } else {
            fileName = `${originalName}_${existingCount}`;
          }
        }
        usedNames.set(originalName, existingCount + 1);
        return fileName;
      };

      // Process files in batches for parallel fetching
      for (let i = 0; i < assets.length; i += CONCURRENCY_LIMIT) {
        const batch = assets.slice(i, i + CONCURRENCY_LIMIT);

        // Fetch all files in batch concurrently
        const results = await Promise.allSettled(
          batch.map(async (asset) => {
            const fileStream = await this.mediaService.getFileStream(asset.key);
            return {
              asset,
              stream: fileStream.stream,
            };
          }),
        );

        // Add successfully fetched files to archive
        for (const result of results) {
          if (result.status === "fulfilled") {
            const { asset, stream } = result.value;
            const fileName = getUniqueFilename(
              asset.originalName || asset.filename,
            );
            archive.append(stream, { name: fileName });
            addedCount++;
            this.logger.debug(`Added to archive: ${fileName}`);
          } else {
            this.logger.error(`Failed to fetch file: ${result.reason}`);
          }
        }
      }

      // Finalize the archive
      await archive.finalize();
      this.logger.log(
        `[MediaAssetsService] Bulk download completed: ${addedCount}/${assets.length} files added to archive`,
      );
    };

    // Start adding files (don't await - let it stream)
    addFilesToArchive().catch((err) => {
      this.logger.error(`Failed to create archive: ${err.message}`, err.stack);
      passThrough.destroy(err);
    });

    return {
      stream: passThrough,
      filename: `media-download-${Date.now()}.zip`,
      assetCount: assets.length,
    };
  }

  /**
   * Determine media type from MIME type
   */
  private determineMediaType(
    mimeType: string,
  ): "VIDEO" | "IMAGE" | "RAW_IMAGE" {
    if (mimeType.startsWith("video/")) {
      return "VIDEO";
    }

    // RAW image formats
    const rawFormats = [
      "image/x-canon-cr2",
      "image/x-canon-cr3",
      "image/x-nikon-nef",
      "image/x-sony-arw",
      "image/x-fuji-raf",
      "image/x-olympus-orf",
      "image/x-panasonic-rw2",
      "image/x-pentax-pef",
      "image/x-adobe-dng",
    ];

    if (rawFormats.includes(mimeType)) {
      return "RAW_IMAGE";
    }

    return "IMAGE";
  }

  /**
   * Generate presigned upload URLs for batch upload
   * Allows clients to upload files directly to R2 without going through the backend
   *
   * @param projectId Project ID
   * @param userId User performing the upload
   * @param files Array of file metadata (max 100)
   * @returns Array of presigned upload URLs with keys
   */
  async generatePresignedUploadUrls(
    projectId: string,
    userId: string,
    files: Array<{ filename: string; mimeType: string; size: number }>,
  ): Promise<{
    urls: Array<{
      filename: string;
      key: string;
      uploadUrl: string;
      expiresIn: number;
    }>;
  }> {
    // Validate batch size
    if (!files || files.length === 0) {
      throw new BadRequestException("Files array cannot be empty");
    }

    if (files.length > 100) {
      throw new BadRequestException(
        "Maximum 100 files per batch. Please split into smaller batches.",
      );
    }

    // Verify project access and permissions
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const collaborator = project.collaborators.find(
      (collab) => collab.userId === userId,
    );

    if (!collaborator) {
      throw new ForbiddenException(
        "You are not a collaborator on this project",
      );
    }

    if (collaborator.role === "VIEWER" || collaborator.role === "COMMENTER") {
      throw new ForbiddenException("Only OWNER or EDITOR can upload assets");
    }

    // Generate presigned URLs for each file
    const expiresIn = 3600; // 1 hour expiration
    const urls = await Promise.all(
      files.map(async (file) => {
        const { url, key } =
          await this.mediaService.generatePresignedUploadUrl(
            file.filename,
            file.mimeType,
            "content",
            expiresIn,
          );

        return {
          filename: file.filename,
          key,
          uploadUrl: url,
          expiresIn,
        };
      }),
    );

    this.logger.log(
      `Generated ${urls.length} presigned upload URLs for project ${projectId}`,
    );

    return { urls };
  }

  /**
   * Register batch assets in database after direct R2 upload
   * Called after client has uploaded files directly to R2 using presigned URLs
   *
   * @param projectId Project ID
   * @param userId User who uploaded the files
   * @param assets Array of asset metadata to register (max 100)
   * @returns Summary of registration results
   */
  async registerBatchAssets(
    projectId: string,
    userId: string,
    assets: Array<{
      key: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      folderId?: string;
      description?: string;
    }>,
  ): Promise<{
    total: number;
    registered: number;
    failed: number;
    assets: Array<{ id: string; key: string; originalName: string }>;
  }> {
    // Validate batch size
    if (!assets || assets.length === 0) {
      throw new BadRequestException("Assets array cannot be empty");
    }

    if (assets.length > 100) {
      throw new BadRequestException(
        "Maximum 100 assets per batch. Please split into smaller batches.",
      );
    }

    // Verify project access and permissions
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const collaborator = project.collaborators.find(
      (collab) => collab.userId === userId,
    );

    if (!collaborator) {
      throw new ForbiddenException(
        "You are not a collaborator on this project",
      );
    }

    if (collaborator.role === "VIEWER" || collaborator.role === "COMMENTER") {
      throw new ForbiddenException("Only OWNER or EDITOR can upload assets");
    }

    // Register each asset in the database
    const registeredAssets = [];
    let failedCount = 0;

    for (const asset of assets) {
      try {
        const mediaType = this.determineMediaType(asset.mimeType);
        const url = this.mediaService.getPublicUrl(asset.key);

        const createdAsset = await this.prisma.mediaAsset.create({
          data: {
            projectId,
            folderId: asset.folderId || null,
            filename: asset.filename,
            originalName: asset.originalName,
            description: asset.description || null,
            url,
            key: asset.key,
            mediaType,
            mimeType: asset.mimeType,
            size: BigInt(asset.size),
            uploadedBy: userId,
            status: "DRAFT",
          },
          select: {
            id: true,
            key: true,
            originalName: true,
          },
        });

        registeredAssets.push(createdAsset);
      } catch (error) {
        this.logger.error(
          `Failed to register asset ${asset.originalName}:`,
          error,
        );
        failedCount++;
      }
    }

    this.logger.log(
      `Registered ${registeredAssets.length}/${assets.length} assets for project ${projectId}`,
    );

    // Trigger async thumbnail generation in background (fire-and-forget)
    // Files are already in R2 from presigned upload — fetch and process each one
    const assetMap = new Map(assets.map((a) => [a.key, a]));
    setImmediate(async () => {
      for (const { id, key } of registeredAssets) {
        const meta = assetMap.get(key);
        if (!meta) continue;
        await this.generateThumbnailForRegisteredAsset(
          id,
          key,
          meta.mimeType,
          meta.originalName,
        );
      }
    });

    return {
      total: assets.length,
      registered: registeredAssets.length,
      failed: failedCount,
      assets: registeredAssets,
    };
  }

  /**
   * Background thumbnail generation for assets uploaded via presigned URL.
   * Fetches the file from R2, generates a thumbnail (and video metadata),
   * uploads the thumbnail, then updates the DB record.
   */
  private async generateThumbnailForRegisteredAsset(
    assetId: string,
    key: string,
    mimeType: string,
    originalName: string,
  ): Promise<void> {
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const mediaType = this.determineMediaType(mimeType);

    try {
      if (mediaType === "VIDEO") {
        const { stream } = await this.mediaService.getFileStream(key, {
          timeoutMs: 120000,
        });

        // Stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        const tempPath = path.join(
          os.tmpdir(),
          `thumb-${Date.now()}-${originalName}`,
        );
        try {
          fs.writeFileSync(tempPath, buffer);

          const processedData =
            await this.processingService.extractVideoMetadata(tempPath);
          const thumbnailBuffer =
            await this.processingService.generateVideoThumbnail(tempPath, 1);

          const thumbnailUpload = await this.mediaService.uploadFile(
            {
              buffer: thumbnailBuffer,
              originalname: `thumb-${originalName}.jpg`,
              mimetype: "image/jpeg",
              size: thumbnailBuffer.length,
            } as Express.Multer.File,
            "thumbnails",
          );

          await this.prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
              thumbnailUrl: thumbnailUpload.url,
              duration: processedData.duration,
              fps: processedData.fps,
              codec: processedData.codec,
              bitrate: processedData.bitrate,
            },
          });

          this.logger.log(`Thumbnail generated for video asset ${assetId}`);
        } finally {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
      } else if (mediaType === "IMAGE" || mediaType === "RAW_IMAGE") {
        const { stream } = await this.mediaService.getFileStream(key, {
          timeoutMs: 60000,
        });

        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        const photoResult = await this.processingService.processPhoto(buffer);

        const thumbnailUpload = await this.mediaService.uploadFile(
          {
            buffer: photoResult.thumbnail,
            originalname: `thumb-${originalName}`,
            mimetype: "image/jpeg",
            size: photoResult.thumbnail.length,
          } as Express.Multer.File,
          "thumbnails",
        );

        await this.prisma.mediaAsset.update({
          where: { id: assetId },
          data: {
            thumbnailUrl: thumbnailUpload.url,
            width: photoResult.width,
            height: photoResult.height,
          },
        });

        this.logger.log(`Thumbnail generated for image asset ${assetId}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to generate thumbnail for asset ${assetId} (${key}):`,
        err,
      );
      // Non-fatal: asset is still accessible, just without thumbnail
    }
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
