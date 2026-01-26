import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Queue, Job } from "bullmq";
import { Redis } from "ioredis";
import * as crypto from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE_NAMES, BULLMQ_CONNECTION } from "../../queue/queue.module";
import { CreateBulkDownloadJobDto } from "../dto/create-bulk-download-job.dto";
import {
  BulkDownloadJobCreatedDto,
  BulkDownloadJobStatusDto,
  BulkDownloadJobStatus,
} from "../dto/bulk-download-job.dto";

/**
 * Cache entry for a bulk download ZIP
 */
interface ZipCacheEntry {
  contentHash: string;
  zipKey: string;
  downloadUrl: string;
  expiresAt: string;
  createdAt: string;
  fileCount: number;
  zipSize: number;
}

const ZIP_CACHE_PREFIX = "bulk-download:cache:";
const ZIP_CACHE_TTL = 23 * 60 * 60; // 23 hours (slightly less than presigned URL expiry)

/**
 * Job data structure for bulk download queue
 */
export interface BulkDownloadJobData {
  assetIds: string[];
  userId: string;
  projectId: string;
  zipFilename: string;
  contentHash?: string; // Hash of asset IDs for caching
}

/**
 * BulkDownloadService
 *
 * Manages async bulk download jobs using BullMQ.
 *
 * Flow:
 * 1. User calls createJob() with asset IDs
 * 2. Job is added to BullMQ queue
 * 3. Worker processes job (fetches files, creates ZIP, uploads to R2)
 * 4. Worker emits WebSocket events for progress
 * 5. User receives presigned URL when complete
 */
@Injectable()
export class BulkDownloadService {
  private readonly logger = new Logger(BulkDownloadService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_NAMES.BULK_DOWNLOAD) private readonly downloadQueue: Queue,
    @Inject(BULLMQ_CONNECTION) private readonly redisConnection: Redis,
  ) {
    this.redis = redisConnection;
  }

  /**
   * Generate a content hash from asset IDs
   * Same assets in any order = same hash
   */
  generateContentHash(assetIds: string[]): string {
    const sorted = [...assetIds].sort();
    return crypto.createHash("md5").update(sorted.join(",")).digest("hex");
  }

  /**
   * Get cached ZIP if exists and not expired
   */
  async getCachedZip(contentHash: string): Promise<ZipCacheEntry | null> {
    const key = `${ZIP_CACHE_PREFIX}${contentHash}`;
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      const entry = JSON.parse(cached) as ZipCacheEntry;

      // Double-check expiry (Redis TTL should handle this, but be safe)
      if (new Date(entry.expiresAt) < new Date()) {
        this.logger.debug(`Cached ZIP expired: ${contentHash}`);
        await this.redis.del(key);
        return null;
      }

      this.logger.log(`Cache hit for content hash: ${contentHash}`);
      return entry;
    } catch (error) {
      this.logger.error(`Failed to parse cache entry: ${error}`);
      return null;
    }
  }

  /**
   * Save ZIP to cache
   */
  async saveZipToCache(entry: ZipCacheEntry): Promise<void> {
    const key = `${ZIP_CACHE_PREFIX}${entry.contentHash}`;
    await this.redis.setex(key, ZIP_CACHE_TTL, JSON.stringify(entry));
    this.logger.log(`Saved ZIP to cache: ${entry.contentHash} (${entry.fileCount} files, ${entry.zipSize} bytes)`);
  }

  /**
   * Create a new bulk download job
   */
  async createJob(
    dto: CreateBulkDownloadJobDto,
    userId: string,
  ): Promise<BulkDownloadJobCreatedDto> {
    const { assetIds, projectId, zipFilename } = dto;

    this.logger.log(`Creating bulk download job for ${assetIds.length} assets`);

    // Validate user has access to the project
    const hasAccess = await this.verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      throw new ForbiddenException("Access denied to this project");
    }

    // Validate that all assets exist and belong to the project
    const validAssets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: assetIds },
        projectId,
      },
      select: { id: true },
    });

    if (validAssets.length === 0) {
      throw new NotFoundException("No valid assets found in the project");
    }

    const validAssetIds = validAssets.map((a) => a.id);

    if (validAssetIds.length !== assetIds.length) {
      this.logger.warn(
        `${assetIds.length - validAssetIds.length} assets were not found or don't belong to the project`,
      );
    }

    // Check cache for existing ZIP with same content
    const contentHash = this.generateContentHash(validAssetIds);
    const cachedZip = await this.getCachedZip(contentHash);

    if (cachedZip) {
      this.logger.log(`Returning cached ZIP for ${validAssetIds.length} assets (hash: ${contentHash})`);
      return {
        jobId: `cached-${contentHash}`,
        status: BulkDownloadJobStatus.COMPLETED,
        totalFiles: cachedZip.fileCount,
        message: "Download ready (cached)",
        downloadUrl: cachedZip.downloadUrl,
        expiresAt: cachedZip.expiresAt,
      };
    }

    // Generate unique job ID (include content hash for traceability)
    const jobId = `download-${Date.now()}-${contentHash.substring(0, 8)}`;

    // Create job data
    const jobData: BulkDownloadJobData = {
      assetIds: validAssetIds,
      userId,
      projectId,
      zipFilename: zipFilename || `media-download-${contentHash}`,
      contentHash, // Include hash for cache storage after completion
    } as BulkDownloadJobData;

    // Add job to queue
    await this.downloadQueue.add(jobId, jobData, {
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000, // 5 seconds initial delay
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    });

    this.logger.log(`Job ${jobId} added to queue with ${validAssetIds.length} assets`);

    return {
      jobId,
      status: BulkDownloadJobStatus.PENDING,
      totalFiles: validAssetIds.length,
      message: "Download job created. You will be notified via WebSocket when ready.",
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, userId: string): Promise<BulkDownloadJobStatusDto> {
    const job = await this.downloadQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    // Verify user owns the job
    const jobData = job.data as BulkDownloadJobData;
    if (jobData.userId !== userId) {
      throw new ForbiddenException("Access denied to this job");
    }

    const state = await job.getState();
    const progress = (job.progress as any) || { current: 0, total: 0, percent: 0 };

    // Map BullMQ state to our status enum
    let status: BulkDownloadJobStatus;
    switch (state) {
      case "waiting":
      case "delayed":
        status = BulkDownloadJobStatus.PENDING;
        break;
      case "active":
        status = BulkDownloadJobStatus.ACTIVE;
        break;
      case "completed":
        status = BulkDownloadJobStatus.COMPLETED;
        break;
      case "failed":
        status = BulkDownloadJobStatus.FAILED;
        break;
      default:
        status = BulkDownloadJobStatus.PENDING;
    }

    const response: BulkDownloadJobStatusDto = {
      jobId,
      status,
      processedFiles: progress.current || 0,
      totalFiles: jobData.assetIds.length,
      progress: progress.percent || 0,
      createdAt: new Date(job.timestamp).toISOString(),
    };

    // Add completion data if job is completed
    if (state === "completed" && job.returnvalue) {
      const result = job.returnvalue as any;
      response.downloadUrl = result.downloadUrl;
      response.expiresAt = result.expiresAt;
      response.completedAt = result.completedAt;
    }

    // Add error data if job failed
    if (state === "failed") {
      response.error = job.failedReason || "Unknown error";
    }

    return response;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const job = await this.downloadQueue.getJob(jobId);

      if (!job) {
        // Job might have been removed or never existed - don't throw, return success
        this.logger.warn(`Cancel requested for non-existent job: ${jobId}`);
        return {
          success: true,
          message: `Job ${jobId} not found (may have already completed or been cancelled)`,
        };
      }

      // Verify user owns the job
      const jobData = job.data as BulkDownloadJobData;
      if (jobData.userId !== userId) {
        throw new ForbiddenException("Access denied to this job");
      }

      const state = await job.getState();

      // Can only cancel pending or active jobs
      if (state === "completed" || state === "failed") {
        this.logger.log(`Cannot cancel ${state} job ${jobId}`);
        return {
          success: false,
          message: `Cannot cancel a ${state} job`,
        };
      }

      // Remove the job
      await job.remove();

      this.logger.log(`Job ${jobId} cancelled by user ${userId}`);

      return {
        success: true,
        message: `Job ${jobId} has been cancelled`,
      };
    } catch (error) {
      // Handle BullMQ errors gracefully (don't throw 500 for internal errors)
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error cancelling job ${jobId}:`, error);
      return {
        success: false,
        message: `Failed to cancel job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
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
