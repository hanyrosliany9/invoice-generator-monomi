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
import { Transform, Readable } from "stream";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";
import { MediaCollabGateway } from "../gateways/media-collab.gateway";
import { QUEUE_NAMES, BULLMQ_CONNECTION } from "../../queue/queue.module";
import {
  BulkDownloadJobData,
  BulkDownloadService,
} from "../services/bulk-download.service";
import {
  BulkDownloadProgressEvent,
  BulkDownloadCompleteEvent,
  BulkDownloadFailedEvent,
} from "../dto/bulk-download-job.dto";

/**
 * How long the job may go without any forward progress (an archiver
 * "entry" event or bytes draining out of the upload PassThrough) before the
 * stall watchdog fails it. Generous on purpose: large ZIPs can legitimately
 * spend minutes compressing/uploading a single big file.
 */
const STALL_TIMEOUT_MS = 10 * 60 * 1000;
const STALL_CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Replicates archiver-utils' `sanitizePath()` (backslash -> forward slash,
 * strip a leading drive/scheme like "C:" or "http:", strip any leading "/"
 * or "../" sequences) so the name we hand to `archive.append()` is already
 * exactly what archiver will store as the entry name. This is what makes
 * dedupe correct and prevents a path-y originalName (e.g. "/x.jpg",
 * "../x.jpg", "C:\\x.jpg") from silently changing shape between the name we
 * track and the name archiver actually emits on "entry".
 *
 * We intentionally don't import `archiver-utils` directly — it's a
 * transitive dependency of `archiver`, not one we declare ourselves.
 */
function sanitizeArchiveEntryName(name: string): string {
  if (!name) return "";
  const normalized = name.split(/[/\\]+/).join("/");
  return normalized.replace(/^\w+:/, "").replace(/^(\.\.\/|\/)+/, "");
}

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
    @Inject(BULLMQ_CONNECTION) private readonly redisConnection: any,
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

    // Declared here (rather than inside the try) so the `finally` below can
    // always clear it, on every terminal path (success or failure).
    let watchdog: ReturnType<typeof setInterval> | undefined;

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

      // 2. Create ZIP archive and stream it straight to R2 (no in-memory buffering).
      // `marker` is what archiver writes into; uploadStream() consumes it via a
      // multipart upload, which provides real backpressure back through archiver
      // and into the per-file source streams below.
      //
      // This is a Transform (not a PassThrough with a 'data' listener bolted on
      // for the stall watchdog): attaching 'data' switches a stream into flowing
      // mode the instant it's attached, and anything archiver already wrote
      // before the real consumer (uploadStream's Upload/pipeline) attaches is
      // delivered to that listener and silently dropped, corrupting the head of
      // the ZIP. Piping through a Transform preserves backpressure and can't
      // drop a chunk — `markActivity` below observes every byte that actually
      // flows through to uploadStream, nothing more, nothing less.
      const archive = archiver("zip", {
        zlib: { level: 6 }, // Balanced compression
      });

      // Stall watchdog (defense in depth): if BullMQ's lock keeps renewing
      // but nothing is actually happening — no archive "entry" and no bytes
      // draining out through `marker` — fail the job explicitly instead of
      // wedging the queue (concurrency: 2) forever. Cleared on every
      // terminal path in `finally` below. Declared before `marker` so its
      // transform can call `markActivity` directly.
      let lastActivityAt = Date.now();
      const markActivity = () => {
        lastActivityAt = Date.now();
      };

      const marker = new Transform({
        transform(chunk, _enc, cb) {
          markActivity();
          cb(null, chunk);
        },
      });
      // Destroying marker with an error (done from failFatal below) emits
      // "error" on it. Without a listener that's an unhandled error event,
      // which is fatal to the process — the real error is always observed
      // via `fatalError`/`uploadPromise` instead, so this is a deliberate
      // no-op sink.
      marker.on("error", () => {});

      // Every source stream we hand to archiver, tracked so a fatal error
      // can destroy any still-open R2 sockets instead of leaking them.
      const activeSourceStreams = new Set<Readable>();

      /**
       * Destroys a fetched-but-never-appended source stream (N2: a fetch
       * that was still in flight when the job went fatal, or that resolved
       * in the gap right after). It never reached the point below that
       * attaches its own "error" -> failFatal listener, so destroying it
       * with an error here would otherwise emit an unhandled "error" event
       * and crash the process. Give it the same deliberate no-op sink the
       * archive/marker streams get.
       */
      const destroyAbandonedStream = (stream: Readable, err: Error) => {
        if (stream.destroyed) return;
        stream.on("error", () => {});
        try {
          stream.destroy(err);
        } catch {
          // best effort
        }
      };

      // Single shared "fatal error" channel. Anything that should abort the
      // whole job — an archiver error/fatal-warning, an upload failure, or
      // a mid-stream source error — funnels into this one promise, which
      // every blocking `await` in this method races against. This is what
      // F1/F3 fix: previously an upload failure (and a source-stream error)
      // were NOT in this race, so they could never unblock a pool worker
      // stuck waiting on `entry`.
      let fatalErr: Error | null = null;
      let rejectFatal: (err: Error) => void;
      const fatalError = new Promise<never>((_, reject) => {
        rejectFatal = (err: Error) => {
          if (!fatalErr) {
            fatalErr = err;
            reject(err);
          }
        };
      });
      // Prevent an unhandled-rejection warning if this promise settles
      // before something else is awaiting it below.
      fatalError.catch(() => {});

      /**
       * Records the first fatal error and forcibly unwinds everything that
       * could otherwise be left sitting on backpressure forever: the
       * archiver instance, the upload PassThrough, and any R2 source
       * streams still open. Idempotent — only the first call has effect.
       */
      const failFatal = (err: Error) => {
        if (fatalErr) return;
        rejectFatal(err);
        if (!archive.destroyed) {
          try {
            archive.destroy(err);
          } catch {
            // best effort
          }
        }
        if (!marker.destroyed) {
          try {
            marker.destroy(err);
          } catch {
            // best effort
          }
        }
        for (const s of activeSourceStreams) {
          if (!s.destroyed) {
            try {
              s.destroy(err);
            } catch {
              // best effort
            }
          }
        }
        activeSourceStreams.clear();
      };

      archive.on("error", (err) => {
        this.logger.error(`Archiver error: ${err.message}`);
        failFatal(err);
      });

      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          this.logger.warn(`Archiver warning: ${err.message}`);
        } else {
          this.logger.error(`Archiver warning (fatal): ${err.message}`);
          failFatal(err);
        }
      });

      archive.pipe(marker);

      watchdog = setInterval(() => {
        if (Date.now() - lastActivityAt > STALL_TIMEOUT_MS) {
          failFatal(
            new Error(
              `Bulk download job stalled: no progress for over ${STALL_TIMEOUT_MS / 60000} minutes`,
            ),
          );
        }
      }, STALL_CHECK_INTERVAL_MS);
      // Don't let the watchdog's own timer keep the process alive.
      watchdog.unref?.();

      // Start the streaming upload immediately and WITHOUT awaiting it.
      // Consuming `marker` is what drives backpressure through archiver;
      // awaiting it now would deadlock since nothing has been written yet.
      //
      // zipKey is generated server-side (date folder + random hex prefix +
      // sanitized basename), the same non-guessable scheme uploadFile()
      // uses — zipFilename (client-supplied) only contributes the
      // human-readable basename, never the literal key, so two jobs that
      // happen to pick the same zipFilename can never collide (F4).
      //
      // onProgress -> markActivity: after archive.finalize() the marker
      // stream ends and stops producing activity, but lib-storage can still
      // be flushing up to queueSize x partSize (4 x 10MB) of buffered parts
      // to R2. Without this, the watchdog sees no activity during that tail
      // and can kill an otherwise-healthy job. Real upload progress counts
      // as activity too.
      const zipKey = this.mediaService.generateDownloadZipKey(zipFilename);
      const uploadPromise = this.mediaService.uploadStream(
        marker,
        zipKey,
        "application/zip",
        undefined,
        markActivity,
      );
      // Route an upload failure into the same fatal channel the pool races
      // on (F1) instead of silently swallowing it — this is what lets a
      // pool worker stuck on `await Promise.race([entryWritten, ...])`
      // actually unblock when the upload dies mid-job.
      uploadPromise.catch((err) => {
        failFatal(err instanceof Error ? err : new Error(String(err)));
      });

      // 3. Feed files into the archive with a bounded number of concurrently
      // open R2 source streams (MAX_CONCURRENT_STREAMS), so a 1800-file job
      // never has more than a handful of HTTP sockets to R2 open at once.
      let processed = 0; // entries actually written to the archive (not just queued)
      const usedNames = new Map<string, number>();

      // Helper to get unique filename (operates on the already-sanitized
      // name, so "/a.jpg" and "a.jpg" can no longer both dedupe to "a.jpg").
      const getUniqueFilename = (sanitizedName: string): string => {
        const existingCount = usedNames.get(sanitizedName) || 0;
        let fileName = sanitizedName;
        if (existingCount > 0) {
          const ext = sanitizedName.lastIndexOf(".");
          if (ext > 0) {
            fileName = `${sanitizedName.substring(0, ext)}_${existingCount}${sanitizedName.substring(ext)}`;
          } else {
            fileName = `${sanitizedName}_${existingCount}`;
          }
        }
        usedNames.set(sanitizedName, existingCount + 1);
        return fileName;
      };

      // FIFO queue of resolvers, one per appended entry, resolved in the
      // order archiver's "entry" event fires. Archiver processes appended
      // entries through a concurrency-1 internal queue, so append order and
      // entry order are always the same — this makes the pairing immune to
      // archiver silently renaming an entry during its own sanitization
      // (F2), unlike the previous name-keyed Map which relied on the name
      // we appended with matching the name archiver actually emitted.
      const pendingEntries: Array<() => void> = [];
      archive.on("entry", (entry) => {
        processed++;
        markActivity();

        const resolveEntry = pendingEntries.shift();
        if (resolveEntry) {
          resolveEntry();
        }

        const progress: BulkDownloadProgressEvent = {
          jobId,
          current: processed,
          total: assets.length,
          percent: Math.round((processed / assets.length) * 100),
          currentFile: entry.name,
        };

        job.updateProgress(progress).catch((err) => {
          this.logger.warn(`Failed to update job progress: ${err}`);
        });
        this.emitToUser(userId, "bulk-download:progress", progress);

        this.logger.debug(
          `Archived: ${entry.name} (${processed}/${assets.length})`,
        );
      });

      const MAX_CONCURRENT_STREAMS = 4;
      let nextAssetIndex = 0;

      const runWorker = async (): Promise<void> => {
        while (nextAssetIndex < assets.length) {
          const asset = assets[nextAssetIndex++];

          // Per-file fetch failures are tolerated: log and move on so a few
          // unreadable assets don't kill the whole ZIP.
          let stream: Readable;
          try {
            const fetchPromise = this.mediaService.getFileStream(asset.key, {
              timeoutMs: 30000,
            });
            // This fetch wasn't previously raced against `fatalError`, so a
            // fatal error elsewhere (upload failure, archiver error,
            // another source's mid-stream error) couldn't unblock a pool
            // worker sitting on this await. Worse, once it eventually
            // resolved it would register into the just-cleared
            // `activeSourceStreams` and get appended to an already-
            // destroyed archive, leaking an open R2 socket. Guard the
            // late-resolution case here: if we're already fatal by the
            // time the fetch completes, destroy the stream instead of
            // handing it back.
            fetchPromise
              .then((r) => {
                if (fatalErr && !r.stream.destroyed) {
                  destroyAbandonedStream(r.stream, fatalErr);
                }
              })
              .catch(() => {
                // Fetch failed after we'd already stopped waiting on it
                // (fatal or otherwise) - nothing to clean up.
              });
            const result = await Promise.race([fetchPromise, fatalError]);
            stream = result.stream;
          } catch (err) {
            if (fatalErr) {
              // The whole job is already unwinding - stop this worker's
              // loop instead of treating it as "this one file failed".
              return;
            }
            this.logger.error(
              `Failed to fetch file ${asset.key}: ${err instanceof Error ? err.message : err}`,
            );
            continue;
          }

          // A fatal error can also land in the gap between the fetch
          // resolving and this check. Don't register/append into an
          // already-destroyed archive.
          if (fatalErr) {
            destroyAbandonedStream(stream, fatalErr);
            return;
          }

          // A source stream that errors mid-transfer (e.g. R2 socket reset
          // after headers) is otherwise unhandled: archiver-utils normalizes
          // it via a bare `source.pipe(new PassThrough())`, and pipe() never
          // forwards source errors, so nothing catches it and Node kills the
          // whole process on the unhandled "error" event (F3). Route it into
          // the shared fatal channel instead — the job fails cleanly.
          activeSourceStreams.add(stream);
          stream.once("close", () => activeSourceStreams.delete(stream));
          stream.on("error", (err) => {
            this.logger.error(
              `Source stream error for ${asset.key}: ${err instanceof Error ? err.message : err}`,
            );
            failFatal(err instanceof Error ? err : new Error(String(err)));
          });

          const sanitizedBase =
            sanitizeArchiveEntryName(asset.originalName || asset.filename) ||
            `file-${asset.id}`;
          const fileName = getUniqueFilename(sanitizedBase);

          const entryWritten = new Promise<void>((resolve) => {
            pendingEntries.push(resolve);
          });

          archive.append(stream, { name: fileName });

          // Wait for archiver to fully consume this file (or for a fatal
          // error anywhere in the pipeline) before opening the next R2
          // stream. This is what bounds concurrently-open R2 streams to
          // MAX_CONCURRENT_STREAMS.
          await Promise.race([entryWritten, fatalError]);
        }
      };

      const workerCount = Math.min(MAX_CONCURRENT_STREAMS, assets.length);
      const workerPool = Promise.all(
        Array.from({ length: workerCount }, () => runWorker()),
      );

      await Promise.race([workerPool, fatalError]);

      // A total failure (every fetch failed) must not look like success: no
      // entries means finalize() would emit a valid, empty 22-byte ZIP that
      // uploads fine and would otherwise get cached for 24h (F5).
      if (processed === 0 && assets.length > 0) {
        throw new Error(
          `All ${assets.length} file(s) failed to download; nothing to archive`,
        );
      }

      // 4. Finalize archive and wait for the upload to complete.
      this.logger.debug("Finalizing archive...");
      await Promise.race([archive.finalize(), fatalError]);

      this.logger.debug("Waiting for R2 upload to complete...");
      const uploadResult = await Promise.race([uploadPromise, fatalError]);
      const zipSize = uploadResult.size;

      this.logger.log(
        `ZIP uploaded to R2: ${uploadResult.key} (${zipSize} bytes)`,
      );

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

      this.logger.log(
        `Job ${jobId} completed: ${processed} files, ${zipSize} bytes`,
      );

      // 8. Save to cache for future requests with same assets. Only cache a
      // FULL success (F5) — a partial ZIP (some per-file fetches failed) is
      // still returned to this caller as a real download, but must not be
      // handed out to every future request for the same asset selection.
      const { contentHash } = job.data;
      if (contentHash && processed === assets.length) {
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);

      // Emit failure event
      const failedEvent: BulkDownloadFailedEvent = {
        jobId,
        error: errorMessage,
        failedAt: new Date().toISOString(),
      };

      this.emitToUser(userId, "bulk-download:failed", failedEvent);

      throw error;
    } finally {
      // Must run on every terminal path — a leaked interval would keep the
      // stall watchdog alive (and able to fire) indefinitely.
      if (watchdog) {
        clearInterval(watchdog);
      }
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
