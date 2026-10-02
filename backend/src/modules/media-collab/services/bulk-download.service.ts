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
import { QUEUE_NAMES, REDIS_CLIENT } from "../../queue/queue.module";
import {
  BULK_DOWNLOAD_MAX_ASSETS,
  CreateBulkDownloadJobDto,
} from "../dto/create-bulk-download-job.dto";
import { hasGlobalMediaReadAccess } from "../utils/media-access.util";
import { assertActivePublicShare } from "../utils/public-share.util";
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
  shareToken?: string;  // Set for public jobs — used to verify status requests
  portalScope?: string; // Set for client-portal jobs — `${clientId}:${email}`
}

/** Who a share-originated (non-staff) bulk download job is bound to. */
export type ShareJobBinding =
  | { kind: "public"; shareToken: string }
  | { kind: "portal"; portalScope: string };

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
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {
    this.redis = redisClient;
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
   * Get cached ZIP if exists and not expired.
   * Returns null (cache miss) on any Redis error so the caller falls through
   * to regenerating the ZIP rather than surfacing a 500.
   */
  async getCachedZip(contentHash: string): Promise<ZipCacheEntry | null> {
    if (!this.redis) return null; // Redis not configured

    const key = `${ZIP_CACHE_PREFIX}${contentHash}`;
    let cached: string | null;
    try {
      cached = await this.redis.get(key);
    } catch (redisErr) {
      this.logger.warn(`Redis unavailable during getCachedZip — falling through to regenerate: ${redisErr}`);
      return null;
    }

    if (!cached) {
      return null;
    }

    try {
      const entry = JSON.parse(cached) as ZipCacheEntry;

      // Double-check expiry (Redis TTL should handle this, but be safe)
      if (new Date(entry.expiresAt) < new Date()) {
        this.logger.debug(`Cached ZIP expired: ${contentHash}`);
        try { await this.redis.del(key); } catch { /* ignore cleanup errors */ }
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
   * Save ZIP to cache.
   * Failures are logged and swallowed — a cache write error must not fail
   * the download response.
   */
  async saveZipToCache(entry: ZipCacheEntry): Promise<void> {
    if (!this.redis) return; // Redis not configured

    const key = `${ZIP_CACHE_PREFIX}${entry.contentHash}`;
    try {
      await this.redis.setex(key, ZIP_CACHE_TTL, JSON.stringify(entry));
      this.logger.log(`Saved ZIP to cache: ${entry.contentHash} (${entry.fileCount} files, ${entry.zipSize} bytes)`);
    } catch (redisErr) {
      this.logger.warn(`Redis unavailable during saveZipToCache — continuing without caching: ${redisErr}`);
    }
  }

  /**
   * Create a new bulk download job
   */
  async createJob(
    dto: CreateBulkDownloadJobDto,
    userId: string,
    userRole?: string,
  ): Promise<BulkDownloadJobCreatedDto> {
    const { assetIds, projectId, zipFilename } = dto;

    this.logger.log(`Creating bulk download job for ${assetIds.length} assets`);

    // Validate user has access to the project (downloading is a read, so the
    // SUPER_ADMIN read bypass applies)
    const hasAccess = await this.verifyProjectAccess(
      userId,
      projectId,
      userRole,
    );
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
   * Resolve the project behind a public share token and ensure the link is
   * currently active (public + not expired). Does not bump the view counter.
   */
  private async resolveActivePublicProject(shareToken: string) {
    if (typeof shareToken !== "string" || shareToken.length === 0) {
      throw new NotFoundException("Public share link not found or disabled");
    }
    const project = await this.prisma.mediaProject.findUnique({
      where: { publicShareToken: shareToken },
      select: {
        id: true,
        isPublic: true,
        publicShareExpiresAt: true,
        createdBy: true,
      },
    });
    assertActivePublicShare(project);
    return project;
  }

  /**
   * Create a bulk download job for a public share link (no auth required)
   * Validates via shareToken; uses project creator's userId for R2 access.
   *
   * Every active public link may download, whatever its publicAccessLevel
   * (owner decision) — VIEW_ONLY links are intentionally NOT rejected here.
   */
  async createPublicJob(
    shareToken: string,
    assetIds: string[],
    zipFilename?: string,
  ): Promise<BulkDownloadJobCreatedDto> {
    // Defensive re-check of the DTO constraints (the controller validates
    // them too) so a non-array / oversized list can never reach Prisma.
    if (
      !Array.isArray(assetIds) ||
      assetIds.length === 0 ||
      assetIds.length > BULK_DOWNLOAD_MAX_ASSETS ||
      !assetIds.every((id) => typeof id === "string")
    ) {
      throw new BadRequestException(
        `assetIds must be 1-${BULK_DOWNLOAD_MAX_ASSETS} asset ID strings`,
      );
    }

    // Validate share token (public + not expired) and get project
    const project = await this.resolveActivePublicProject(shareToken);

    return this.createShareJob(
      project,
      { kind: "public", shareToken },
      assetIds,
      zipFilename,
    );
  }

  /**
   * Create a bulk download job for a project whose access the caller has
   * already authorised (public share token or client-portal scope). The job
   * is bound to `binding` so only the same share/portal scope can poll it.
   */
  async createShareJob(
    project: { id: string; createdBy: string },
    binding: ShareJobBinding,
    assetIds: string[],
    zipFilename?: string,
  ): Promise<BulkDownloadJobCreatedDto> {
    if (
      !Array.isArray(assetIds) ||
      assetIds.length === 0 ||
      assetIds.length > BULK_DOWNLOAD_MAX_ASSETS ||
      !assetIds.every((id) => typeof id === "string")
    ) {
      throw new BadRequestException(
        `assetIds must be 1-${BULK_DOWNLOAD_MAX_ASSETS} asset ID strings`,
      );
    }

    // Security (IDOR guard): only assets that belong to the project resolved
    // from the token are kept; foreign IDs are silently dropped, matching the
    // authenticated createJob behaviour.
    const validAssets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: assetIds },
        projectId: project.id,
      },
      select: { id: true },
    });

    if (validAssets.length === 0) {
      throw new NotFoundException("No valid assets found");
    }

    const validAssetIds = validAssets.map((a) => a.id);

    if (validAssetIds.length !== new Set(assetIds).size) {
      this.logger.warn(
        `[Public] ${new Set(assetIds).size - validAssetIds.length} requested assets were not found or don't belong to the shared project`,
      );
    }

    // Check cache first
    const contentHash = this.generateContentHash(validAssetIds);
    const cachedZip = await this.getCachedZip(contentHash);
    if (cachedZip) {
      this.logger.log(`[Public] Cache hit for ${validAssetIds.length} assets`);
      return {
        jobId: `cached-${contentHash}`,
        status: BulkDownloadJobStatus.COMPLETED,
        totalFiles: cachedZip.fileCount,
        message: "Download ready (cached)",
        downloadUrl: cachedZip.downloadUrl,
        expiresAt: cachedZip.expiresAt,
      };
    }

    const prefix = binding.kind === "portal" ? "portal-download" : "public-download";
    const jobId = `${prefix}-${Date.now()}-${contentHash.substring(0, 8)}`;
    const jobData: BulkDownloadJobData = {
      assetIds: validAssetIds,
      userId: project.createdBy, // Use project owner's userId for R2 access checks
      projectId: project.id,
      zipFilename: zipFilename || `media-download-${Date.now()}`,
      contentHash,
      // Store the binding so the status endpoints can verify ownership
      ...(binding.kind === "public"
        ? { shareToken: binding.shareToken }
        : { portalScope: binding.portalScope }),
    };

    await this.downloadQueue.add(jobId, jobData, {
      jobId,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86400 },
    });

    this.logger.log(`[Public] Job ${jobId} created for ${validAssetIds.length} assets`);

    return {
      jobId,
      status: BulkDownloadJobStatus.PENDING,
      totalFiles: validAssetIds.length,
      message: "Download job created. Poll for status updates.",
    };
  }

  /**
   * Get job status for a public share link (no auth required)
   * Validates that the job was created for this shareToken.
   */
  async getPublicJobStatus(jobId: string, shareToken: string): Promise<BulkDownloadJobStatusDto> {
    // The link must still be active: disabling, expiring or regenerating a
    // share also stops polling (and thus handing out the ZIP URL) for jobs
    // created through it.
    const project = await this.resolveActivePublicProject(shareToken);

    return this.getShareJobStatus(jobId, project.id, {
      kind: "public",
      shareToken,
    });
  }

  /**
   * Job status for a share-originated job. The job must have been created for
   * this project through the SAME binding (share token or portal scope);
   * authenticated jobs and jobs of other bindings never match.
   */
  async getShareJobStatus(
    jobId: string,
    projectId: string,
    binding: ShareJobBinding,
  ): Promise<BulkDownloadJobStatusDto> {
    const job = await this.downloadQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const jobData = job.data as BulkDownloadJobData;
    const bindingMatches =
      binding.kind === "public"
        ? typeof jobData.shareToken === "string" &&
          jobData.shareToken === binding.shareToken
        : typeof jobData.portalScope === "string" &&
          jobData.portalScope === binding.portalScope;
    if (!bindingMatches || jobData.projectId !== projectId) {
      throw new ForbiddenException("Access denied to this job");
    }

    const state = await job.getState();
    const progress = (job.progress as any) || { current: 0, total: 0, percent: 0 };

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

    if (state === "completed" && job.returnvalue) {
      const result = job.returnvalue as any;
      response.downloadUrl = result.downloadUrl;
      response.expiresAt = result.expiresAt;
      response.completedAt = result.completedAt;
    }

    if (state === "failed") {
      response.error = job.failedReason || "Unknown error";
    }

    return response;
  }

  /**
   * Verify if user has access to project
   */
  private async verifyProjectAccess(
    userId: string,
    projectId: string,
    userRole?: string,
  ): Promise<boolean> {
    if (hasGlobalMediaReadAccess(userRole)) {
      return true;
    }
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
