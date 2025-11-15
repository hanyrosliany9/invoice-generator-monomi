import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { MediaService } from "./media.service";

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

  constructor(private readonly mediaService: MediaService) {}

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

    const { stream, contentType, contentLength, originalName } = await this.mediaService.getFileStream(key);

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow CORS

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
}
