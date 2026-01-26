import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Worker, Job } from "bullmq";
import archiver from "archiver";
import { PassThrough } from "stream";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";
import { MediaCollabGateway } from "../gateways/media-collab.gateway";
import { QUEUE_NAMES } from "../../queue/queue.module";
import { BulkDownloadJobData, BulkDownloadService } from "../services/bulk-download.service";
import {
  BulkDownloadProgressEvent,
  BulkDownloadCompleteEvent,
  BulkDownloadFailedEvent,
} from "../dto/bulk-download-job.dto";

/**
 * BulkDownloadWorker
 *
 * Processes bulk download jobs from the BullMQ queue.
 *
 * Processing steps:
 * 1. Fetch asset metadata from database
 * 2. Stream files from R2 in parallel batches
 * 3. Create ZIP archive
 * 4. Upload ZIP to R2 (downloads folder)
 * 5. Generate presigned URL (24 hour expiry)
 * 6. Emit completion event via WebSocket
 *
 * Progress events are emitted via WebSocket as files are processed.
 */
@Injectable()
export class BulkDownloadWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BulkDownloadWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly gateway: MediaCollabGateway,
    @Inject("BULLMQ_CONNECTION") private readonly redisConnection: any,
    @Inject(forwardRef(() => BulkDownloadService))
    private readonly bulkDownloadService: BulkDownloadService,
  ) {}

  async onModuleInit() {
    this.logger.log("Initializing BulkDownloadWorker...");

    this.worker = new Worker(
      QUEUE_NAMES.BULK_DOWNLOAD,
      async (job: Job<BulkDownloadJobData>) => {
        return this.processJob(job);
      },
      {
        connection: this.redisConnection,
        concurrency: 2, // Process up to 2 downloads concurrently
        limiter: {
          max: 5,
          duration: 60000, // Max 5 jobs per minute
        },
      },
    );

    // Handle worker events
    this.worker.on("completed", (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`, err.stack);
    });

    this.worker.on("error", (err) => {
      this.logger.error(`Worker error: ${err.message}`, err.stack);
    });

    this.logger.log("BulkDownloadWorker initialized");
  }

  async onModuleDestroy() {
    if (this.worker) {
      this.logger.log("Shutting down BulkDownloadWorker...");
      await this.worker.close();
      this.logger.log("BulkDownloadWorker shut down");
    }
  }

  /**
   * Process a bulk download job
   */
  private async processJob(job: Job<BulkDownloadJobData>) {
    const { assetIds, userId, projectId, zipFilename } = job.data;
    const jobId = job.id!;

    this.logger.log(`Processing job ${jobId}: ${assetIds.length} assets`);

    try {
      // 1. Fetch asset metadata
      const assets = await this.prisma.mediaAsset.findMany({
        where: { id: { in: assetIds } },
        select: {
          id: true,
          key: true,
          originalName: true,
          filename: true,
          mimeType: true,
        },
      });

      if (assets.length === 0) {
        throw new Error("No assets found");
      }

      // 2. Create ZIP archive in memory and collect chunks
      const zipChunks: Buffer[] = [];
      const archive = archiver("zip", {
        zlib: { level: 6 }, // Balanced compression
      });

      const passThrough = new PassThrough();

      // Set up ALL event listeners BEFORE piping/finalizing (race condition fix)
      // The 'end' promise must be created before archive.finalize() is called
      const streamComplete = new Promise<void>((resolve, reject) => {
        passThrough.on("data", (chunk: Buffer) => {
          zipChunks.push(chunk);
        });
        passThrough.on("end", () => {
          this.logger.debug("PassThrough stream ended");
          resolve();
        });
        passThrough.on("error", (err) => {
          this.logger.error(`PassThrough stream error: ${err.message}`);
          reject(err);
        });
      });

      // Handle archiver errors
      archive.on("error", (err) => {
        this.logger.error(`Archiver error: ${err.message}`);
        throw err;
      });

      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          this.logger.warn(`Archiver warning: ${err.message}`);
        } else {
          throw err;
        }
      });

      archive.pipe(passThrough);

      // 3. Process files in batches
      const BATCH_SIZE = 10;
      let processed = 0;
      const usedNames = new Map<string, number>();

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

      // Helper to fetch file with timeout using AbortController
      // This properly cancels the S3 request rather than just racing promises
      const fetchWithTimeout = async (asset: typeof assets[0], timeoutMs = 30000) => {
        const { stream } = await this.mediaService.getFileStream(asset.key, { timeoutMs });
        return { asset, stream };
      };

      // Process assets in batches
      for (let i = 0; i < assets.length; i += BATCH_SIZE) {
        const batch = assets.slice(i, i + BATCH_SIZE);

        // Fetch files in parallel with timeout
        const results = await Promise.allSettled(
          batch.map((asset) => fetchWithTimeout(asset, 30000)),
        );

        // Add successfully fetched files to archive
        for (const result of results) {
          if (result.status === "fulfilled") {
            const { asset, stream } = result.value;
            const fileName = getUniqueFilename(
              asset.originalName || asset.filename,
            );
            archive.append(stream, { name: fileName });
            processed++;

            // Update progress
            const progress: BulkDownloadProgressEvent = {
              jobId,
              current: processed,
              total: assets.length,
              percent: Math.round((processed / assets.length) * 100),
              currentFile: fileName,
            };

            await job.updateProgress(progress);

            // Emit progress via WebSocket
            this.emitToUser(userId, "bulk-download:progress", progress);

            this.logger.debug(`Added to archive: ${fileName} (${processed}/${assets.length})`);
          } else {
            this.logger.error(`Failed to fetch file: ${result.reason}`);
          }
        }
      }

      // 4. Finalize archive and wait for stream to complete
      this.logger.debug("Finalizing archive...");
      await archive.finalize();

      // Wait for all data to be collected (listener was set up before finalize)
      this.logger.debug("Waiting for stream to complete...");
      await streamComplete;

      // Create buffer from chunks
      const zipBuffer = Buffer.concat(zipChunks);
      const zipSize = zipBuffer.length;

      this.logger.log(`ZIP created: ${zipSize} bytes`);

      // 5. Upload ZIP to R2
      const zipKey = `downloads/${zipFilename}.zip`;
      const uploadResult = await this.mediaService.uploadFile(
        {
          buffer: zipBuffer,
          originalname: `${zipFilename}.zip`,
          mimetype: "application/zip",
          size: zipSize,
        } as Express.Multer.File,
        "downloads",
      );

      this.logger.log(`ZIP uploaded to R2: ${uploadResult.key}`);

      // 6. Generate presigned URL (24 hour expiry)
      const expiresIn = 86400; // 24 hours
      const downloadUrl = await this.mediaService.getPresignedUrl(
        uploadResult.key,
        expiresIn,
      );

      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const completedAt = new Date().toISOString();

      // 7. Emit completion event
      const completeEvent: BulkDownloadCompleteEvent = {
        jobId,
        downloadUrl,
        expiresAt,
        fileCount: processed,
        zipSize,
      };

      this.emitToUser(userId, "bulk-download:complete", completeEvent);

      this.logger.log(`Job ${jobId} completed: ${processed} files, ${zipSize} bytes`);

      // 8. Save to cache for future requests with same assets
      const { contentHash } = job.data;
      if (contentHash) {
        try {
          await this.bulkDownloadService.saveZipToCache({
            contentHash,
            zipKey: uploadResult.key,
            downloadUrl,
            expiresAt,
            createdAt: new Date().toISOString(),
            fileCount: processed,
            zipSize,
          });
          this.logger.log(`Cached ZIP for content hash: ${contentHash}`);
        } catch (cacheError) {
          // Don't fail the job if caching fails - just log the error
          this.logger.error(`Failed to cache ZIP: ${cacheError}`);
        }
      }

      // Return result (stored in job.returnvalue)
      return {
        downloadUrl,
        expiresAt,
        completedAt,
        fileCount: processed,
        zipSize,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);

      // Emit failure event
      const failedEvent: BulkDownloadFailedEvent = {
        jobId,
        error: errorMessage,
        failedAt: new Date().toISOString(),
      };

      this.emitToUser(userId, "bulk-download:failed", failedEvent);

      throw error;
    }
  }

  /**
   * Emit event to a specific user via WebSocket
   */
  private emitToUser(userId: string, event: string, data: any) {
    try {
      // Use the gateway's server to emit to user's room
      // Users automatically join a room named "user:{userId}" on connection
      this.gateway.server.to(`user:${userId}`).emit(event, data);
    } catch (error) {
      this.logger.error(`Failed to emit ${event} to user ${userId}: ${error}`);
    }
  }
}
