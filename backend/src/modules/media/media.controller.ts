import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Logger,
  BadRequestException,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { MediaService } from "./media.service";
import { MediaCleanupService } from "./services/media-cleanup.service";

/**
 * MediaController - File Upload/Delete Endpoints
 *
 * Provides REST API for:
 * - Single file upload (POST /media/upload)
 * - Multiple files upload (POST /media/upload-multiple)
 * - File deletion (DELETE /media/:key)
 *
 * Security:
 * - JWT authentication required
 * - SUPER_ADMIN and PROJECT_MANAGER can upload/delete
 *
 * File limits:
 * - Max 100MB per file (configurable)
 * - Supported: JPEG, PNG, GIF, WebP, MP4, MOV, AVI, WebM
 */
@ApiTags("Media")
@ApiBearerAuth()
@Controller("media")
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaCleanupService: MediaCleanupService,
  ) {}

  /**
   * Upload a single file to R2 with optional thumbnail
   *
   * POST /media/upload
   * Body: multipart/form-data with 'file' field and optional 'thumbnail' field
   * Returns: { url, key, size, mimeType, thumbnailUrl?, thumbnailKey? }
   */
  @Post("upload")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a single file to R2 with optional thumbnail" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File to upload (images or videos)",
        },
        thumbnail: {
          type: "string",
          description: "Optional base64-encoded thumbnail for videos",
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes)`);

    const result = await this.mediaService.uploadFile(file, "content");

    // Extract thumbnail from request body if provided
    const thumbnailBase64 = req.body?.thumbnail;

    // If thumbnail is provided (as base64 string), upload it too
    if (thumbnailBase64 && file.mimetype.startsWith("video/")) {
      try {
        this.logger.log(`Uploading thumbnail for ${file.originalname}`);
        const thumbnailResult = await this.mediaService.uploadThumbnail(
          thumbnailBase64,
          file.originalname,
          "thumbnails"
        );
        result.thumbnailUrl = thumbnailResult.url;
        result.thumbnailKey = thumbnailResult.key;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to upload thumbnail: ${errorMessage}`);
        // Continue without thumbnail
      }
    }

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Upload multiple files to R2
   *
   * POST /media/upload-multiple
   * Body: multipart/form-data with 'files' field (array)
   * Returns: { urls: [...] }
   */
  @Post("upload-multiple")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF)
  @UseInterceptors(FilesInterceptor("files", 10)) // Max 10 files at once
  @ApiOperation({ summary: "Upload multiple files to R2" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description: "Files to upload (max 10)",
        },
      },
    },
  })
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    if (files.length > 10) {
      throw new BadRequestException("Maximum 10 files allowed per upload");
    }

    this.logger.log(`Uploading ${files.length} files`);

    const results = await this.mediaService.uploadMultipleFiles(files, "content");

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Generate media access token for Cloudflare Workers
   *
   * POST /media/access-token
   * Requires: JWT authentication
   *
   * Returns a token that can be used in media URLs served by Cloudflare Workers.
   * Token is valid for 24 hours and tied to the authenticated user.
   *
   * Usage: https://media.monomiagency.com/view/{TOKEN}/{key}
   *
   * Rate Limiting: Exempt from global rate limiting since:
   * - Tokens last 24 hours (low request frequency)
   * - Frontend uses global singleton store (request deduplication)
   * - Critical for media loading across the app
   */
  @Post("access-token")
  @SkipThrottle() // Exempt from rate limiting
  @ApiOperation({ summary: "Generate media access token for Cloudflare Workers" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateMediaAccessToken(@Req() req: any) {
    const userId = req.user.id;

    this.logger.log(`Generating media access token for user: ${userId}`);

    const token = await this.mediaService.generateMediaAccessToken(userId);

    return {
      success: true,
      data: {
        token,
        expiresIn: 86400, // 24 hours in seconds
        expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        usage: `https://media.monomiagency.com/view/${token}/content/file.jpg`,
      },
    };
  }

  /**
   * Validate media access token
   *
   * GET /media/validate-token?token=xxx
   * Query: token - Media access token to validate
   *
   * Returns user ID if token is valid, otherwise throws error.
   * Used by Cloudflare Workers to validate tokens before serving media.
   */
  @Get("validate-token")
  @ApiOperation({ summary: "Validate media access token" })
  async validateMediaAccessToken(@Query("token") token: string) {
    if (!token) {
      throw new BadRequestException("No token provided");
    }

    this.logger.log(`Validating media access token`);

    const userId = await this.mediaService.validateMediaAccessToken(token);

    return {
      success: true,
      data: {
        userId,
        valid: true,
      },
    };
  }

  /**
   * Generate presigned URL for secure, temporary access to media
   *
   * GET /media/presigned-url?key=xxx&expiresIn=3600
   * Query: key - R2 object key
   * Query: expiresIn - Expiration time in seconds (optional, default: 3600 = 1 hour)
   *
   * Returns a temporary signed URL that expires after the specified time.
   * This keeps R2 bucket private while providing secure access.
   *
   * NOTE: This endpoint is deprecated in favor of Cloudflare Workers approach.
   * Use /media/access-token instead for better performance and caching.
   */
  @Get("presigned-url")
  @ApiOperation({ summary: "Generate presigned URL for private R2 access (DEPRECATED)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(
    @Query("key") key: string,
    @Query("expiresIn") expiresIn?: string,
  ) {
    if (!key) {
      throw new BadRequestException("No file key provided");
    }

    const expiry = expiresIn ? parseInt(expiresIn, 10) : 3600; // Default: 1 hour

    if (expiry < 60 || expiry > 604800) {
      throw new BadRequestException("expiresIn must be between 60 (1 min) and 604800 (7 days)");
    }

    const url = await this.mediaService.getPresignedUrl(key, expiry);

    return {
      url,
      expiresIn: expiry,
      expiresAt: new Date(Date.now() + expiry * 1000).toISOString(),
    };
  }

  /**
   * Proxy R2 files to avoid CORS issues
   *
   * GET /media/proxy/:key
   * Param: key - R2 object key (URL-encoded)
   *
   * This endpoint streams R2 files through the backend,
   * avoiding CORS errors when R2 bucket doesn't have CORS configured
   */
  @Get("proxy/:key(*)")
  @ApiOperation({ summary: "Proxy R2 file to avoid CORS" })
  async proxyFile(@Param("key") key: string, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException("No file key provided");
    }

    this.logger.log(`Proxying file: ${key}`);

    const { stream, contentType, contentLength, originalName} = await this.mediaService.getFileStream(key);

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", contentLength);
    // ✅ CORS FIX: Use shorter cache with revalidation to prevent caching 404 errors
    // When thumbnails are requested before upload completes, browser caches 404
    // Solution: must-revalidate ensures browser checks with server even if cached
    res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate"); // Cache for 1 day with revalidation
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow CORS
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // Allow cross-origin resource loading

    // Set Content-Disposition header with original filename to preserve filename on download
    if (originalName) {
      // Encode filename for proper handling of special characters and non-ASCII characters
      const encodedFilename = encodeURIComponent(originalName);
      res.setHeader("Content-Disposition", `inline; filename="${originalName}"; filename*=UTF-8''${encodedFilename}`);
      this.logger.log(`Setting original filename: ${originalName}`);
    }

    // Stream the file
    stream.pipe(res);
  }

  /**
   * Delete a file from R2
   *
   * DELETE /media/:key
   * Param: key - R2 object key (URL-encoded)
   *
   * Note: The key should be URL-encoded before sending
   * Example: content/2025-01-08/abc123-image.jpg → content%2F2025-01-08%2Fabc123-image.jpg
   */
  @Delete(":key(*)")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: "Delete a file from R2" })
  async deleteFile(@Param("key") key: string) {
    if (!key) {
      throw new BadRequestException("No file key provided");
    }

    this.logger.log(`Deleting file: ${key}`);

    await this.mediaService.deleteFile(key);

    return {
      success: true,
      message: "File deleted successfully",
    };
  }

  /**
   * Manual cleanup trigger for orphaned thumbnails and old files
   *
   * POST /media/cleanup
   * Requires SUPER_ADMIN role
   *
   * This endpoint manually triggers the cleanup job that normally runs daily at 2 AM.
   * Useful for testing or immediate cleanup needs.
   */
  @Post("cleanup")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Manually trigger thumbnail and file cleanup" })
  async manualCleanup() {
    this.logger.log("Manual cleanup triggered by admin");

    const result = await this.mediaCleanupService.manualCleanup();

    return {
      success: true,
      message: "Cleanup completed",
      data: result,
    };
  }
}
