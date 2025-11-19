import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";
import * as path from "path";
import { Readable } from "stream";

/**
 * MediaService - Cloudflare R2 Integration
 *
 * Handles media file uploads, deletions, and URL generation using Cloudflare R2.
 * R2 is S3-compatible with zero egress fees.
 *
 * Features:
 * - Upload images/videos to R2
 * - Delete media from R2
 * - Generate presigned URLs (optional)
 * - File validation (size, type)
 * - Unique filename generation with timestamps
 *
 * Supported file types:
 * - Images: JPEG, PNG, GIF, WebP
 * - Videos: MP4, MOV, AVI, WebM
 */

export interface UploadResult {
  url: string; // Public URL to access the file
  key: string; // R2 object key (for deletion)
  size: number; // File size in bytes
  mimeType: string; // MIME type
  width?: number; // Image/video width (if available)
  height?: number; // Image/video height (if available)
  thumbnailUrl?: string; // Thumbnail URL for videos
  thumbnailKey?: string; // Thumbnail R2 key for deletion
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly maxFileSizeMB: number;

  // Allowed MIME types for uploads
  private readonly allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Videos
    "video/mp4",
    "video/quicktime", // .mov
    "video/x-msvideo", // .avi
    "video/webm",
    // Documents
    "application/pdf", // PDF files
  ];

  constructor(private readonly configService: ConfigService) {
    // Load R2 configuration
    const r2Config = {
      accountId: this.configService.get<string>("R2_ACCOUNT_ID"),
      accessKeyId: this.configService.get<string>("R2_ACCESS_KEY_ID"),
      secretAccessKey: this.configService.get<string>("R2_SECRET_ACCESS_KEY"),
      bucketName:
        this.configService.get<string>("R2_BUCKET_NAME") || "content-media",
      publicUrl: this.configService.get<string>("R2_PUBLIC_URL"),
      endpoint: this.configService.get<string>("R2_ENDPOINT"),
      maxFileSizeMB: parseInt(
        this.configService.get<string>("MAX_FILE_SIZE_MB") || "100",
        10,
      ),
    };

    this.bucketName = r2Config.bucketName || "content-media";
    // ✅ CORS FIX: Use relative URL instead of absolute to allow Vite proxy to intercept requests
    // This prevents cross-origin issues when frontend (port 3000) requests from backend (port 5000)
    // Vite proxy will convert /api/* requests to http://localhost:5000/api/*
    this.publicUrl = `/api/v1/media/proxy`;
    this.maxFileSizeMB = r2Config.maxFileSizeMB;

    // Initialize S3 client for R2
    if (r2Config.accessKeyId && r2Config.secretAccessKey && r2Config.endpoint) {
      this.s3Client = new S3Client({
        region: "auto", // R2 uses 'auto' region
        endpoint: r2Config.endpoint,
        credentials: {
          accessKeyId: r2Config.accessKeyId,
          secretAccessKey: r2Config.secretAccessKey,
        },
      });
      this.logger.log(`✅ R2 client initialized for bucket: ${this.bucketName}`);
      this.logger.log(`✅ Media proxy URL: ${this.publicUrl}`);
    } else {
      this.logger.warn(
        "⚠️  R2 credentials not configured. Media upload will be disabled.",
      );
    }
  }

  /**
   * Check if R2 is configured and available
   */
  isR2Enabled(): boolean {
    return !!this.s3Client;
  }

  /**
   * Upload a single file to R2
   *
   * @param file - Multer file object
   * @param folder - Folder path in R2 (e.g., 'content', 'avatars')
   * @returns Upload result with URL, key, and metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = "content",
  ): Promise<UploadResult> {
    if (!this.isR2Enabled()) {
      throw new InternalServerErrorException(
        "Media upload is not available. R2 storage is not configured.",
      );
    }

    // Validate file
    this.validateFile(file);

    // Generate unique key
    const key = this.generateKey(file.originalname, folder);

    try {
      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Optional: Add metadata
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Construct public URL
      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`✅ File uploaded successfully: ${key}`);

      return {
        url,
        key,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to upload file to R2:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to upload file: ${errorMessage}`,
      );
    }
  }

  /**
   * Upload a thumbnail from base64 string to R2
   *
   * @param base64Data - Base64 encoded image data (with or without data URI prefix)
   * @param originalVideoName - Original video filename for naming
   * @param folder - Folder path in R2
   * @returns Upload result with URL and key
   */
  async uploadThumbnail(
    base64Data: string,
    originalVideoName: string,
    folder: string = "thumbnails",
  ): Promise<{ url: string; key: string }> {
    if (!this.isR2Enabled()) {
      throw new InternalServerErrorException(
        "Thumbnail upload is not available. R2 storage is not configured.",
      );
    }

    try {
      // Remove data URI prefix if present (data:image/jpeg;base64,...)
      const base64String = base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;

      // Convert base64 to buffer
      const buffer = Buffer.from(base64String, "base64");

      // Generate unique key for thumbnail
      const hash = crypto.randomBytes(4).toString("hex");
      const date = new Date().toISOString().split("T")[0];
      const videoBasename = path.basename(originalVideoName, path.extname(originalVideoName));
      const key = `${folder}/${date}/${hash}-${videoBasename}-thumb.jpg`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
        Metadata: {
          originalVideo: originalVideoName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`✅ Thumbnail uploaded successfully: ${key}`);

      return { url, key };
    } catch (error) {
      this.logger.error(`❌ Failed to upload thumbnail to R2:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new InternalServerErrorException(
        `Failed to upload thumbnail: ${errorMessage}`,
      );
    }
  }

  /**
   * Upload multiple files to R2
   *
   * @param files - Array of Multer file objects
   * @param folder - Folder path in R2
   * @returns Array of upload results
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = "content",
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, folder);
      results.push(result);
    }

    return results;
  }

  /**
   * Delete a file from R2
   *
   * @param key - R2 object key (from UploadResult)
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.isR2Enabled()) {
      throw new InternalServerErrorException(
        "Media deletion is not available. R2 storage is not configured.",
      );
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`✅ File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete file from R2:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to delete file: ${errorMessage}`,
      );
    }
  }

  /**
   * Delete multiple files from R2
   *
   * @param keys - Array of R2 object keys
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.deleteFile(key);
    }
  }

  /**
   * Delete a file and its associated thumbnail from R2
   *
   * @param key - Primary file R2 object key
   * @param thumbnailUrl - Optional thumbnail URL to delete
   */
  async deleteFileWithThumbnail(key: string, thumbnailUrl?: string): Promise<void> {
    // Delete main file
    await this.deleteFile(key);

    // Delete thumbnail if provided
    if (thumbnailUrl) {
      const thumbnailKey = this.extractKeyFromUrl(thumbnailUrl);
      if (thumbnailKey) {
        try {
          await this.deleteFile(thumbnailKey);
          this.logger.log(`✅ Thumbnail deleted: ${thumbnailKey}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`⚠️  Failed to delete thumbnail ${thumbnailKey}: ${errorMessage}`);
          // Don't throw - main file deletion succeeded
        }
      }
    }
  }

  /**
   * Extract R2 key from proxy URL
   * Example: /api/v1/media/proxy/thumbnails/2025-01-08/abc123-video-thumb.jpg
   * Returns: thumbnails/2025-01-08/abc123-video-thumb.jpg
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      // Handle both full URLs and relative paths
      const match = url.match(/\/api\/v1\/media\/proxy\/(.+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get file stream from R2 for proxying
   *
   * @param key - R2 object key
   * @returns Stream, content type, content length, and original filename
   */
  async getFileStream(key: string): Promise<{
    stream: Readable;
    contentType: string;
    contentLength: number;
    originalName?: string;
  }> {
    if (!this.isR2Enabled()) {
      throw new InternalServerErrorException(
        "Media streaming is not available. R2 storage is not configured.",
      );
    }

    try {
      // Get object from R2
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new NotFoundException(`File not found: ${key}`);
      }

      // Convert to Node.js Readable stream
      const stream = response.Body as Readable;

      // Extract original filename from metadata if available
      const originalName = response.Metadata?.originalName || response.Metadata?.originalname;

      return {
        stream,
        contentType: response.ContentType || "application/octet-stream",
        contentLength: response.ContentLength || 0,
        originalName,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`❌ Failed to get file stream from R2:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to get file stream: ${errorMessage}`,
      );
    }
  }

  /**
   * Generate a presigned URL for temporary access (optional)
   *
   * @param key - R2 object key
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isR2Enabled()) {
      throw new InternalServerErrorException(
        "Presigned URL generation is not available. R2 storage is not configured.",
      );
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return url;
    } catch (error) {
      this.logger.error(`❌ Failed to generate presigned URL:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to generate presigned URL: ${errorMessage}`,
      );
    }
  }

  /**
   * Validate uploaded file
   *
   * @param file - Multer file object
   * @throws BadRequestException if validation fails
   */
  private validateFile(file: Express.Multer.File): void {
    // Check if file exists
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Check file size
    const maxSizeBytes = this.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSizeMB}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(", ")}`,
      );
    }
  }

  /**
   * Generate unique file key for R2
   *
   * Format: {folder}/{date}/{randomHash}-{filename}
   * Example: content/2025-01-08/abc123def456-image.jpg
   *
   * @param originalName - Original filename
   * @param folder - Folder path
   * @returns Unique key
   */
  private generateKey(originalName: string, folder: string): string {
    // Generate random hash (8 characters)
    const hash = crypto.randomBytes(4).toString("hex");

    // Get current date (YYYY-MM-DD)
    const date = new Date().toISOString().split("T")[0];

    // Sanitize filename (remove special characters, keep extension)
    const ext = path.extname(originalName);
    const basename = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    // Construct key
    return `${folder}/${date}/${hash}-${basename}${ext}`;
  }
}
