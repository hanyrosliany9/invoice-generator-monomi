import { Module, Global, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, QueueEvents } from "bullmq";

/**
 * Queue names used throughout the application
 */
export const QUEUE_NAMES = {
  BULK_DOWNLOAD: "bulk-download",
} as const;

/**
 * QueueModule - BullMQ Integration for Background Job Processing
 *
 * Provides queue infrastructure for async tasks like:
 * - Bulk media downloads (ZIP generation)
 * - Large file processing
 * - Email notifications
 *
 * Uses Redis as the backing store via REDIS_URL environment variable.
 */
@Global()
@Module({
  providers: [
    {
      provide: "BULLMQ_CONNECTION",
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");

        if (!redisUrl) {
          throw new Error("REDIS_URL environment variable is required for BullMQ");
        }

        // Parse Redis URL
        const url = new URL(redisUrl);

        return {
          host: url.hostname,
          port: parseInt(url.port, 10) || 6379,
          password: url.password || undefined,
          db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
        };
      },
    },
    {
      provide: QUEUE_NAMES.BULK_DOWNLOAD,
      inject: ["BULLMQ_CONNECTION"],
      useFactory: (connection: any) => {
        const logger = new Logger("BulkDownloadQueue");
        const queue = new Queue(QUEUE_NAMES.BULK_DOWNLOAD, { connection });

        logger.log(`BullMQ queue "${QUEUE_NAMES.BULK_DOWNLOAD}" initialized`);

        return queue;
      },
    },
  ],
  exports: ["BULLMQ_CONNECTION", QUEUE_NAMES.BULK_DOWNLOAD],
})
export class QueueModule {}
