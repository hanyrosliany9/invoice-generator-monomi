import { Module, Global, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";

/**
 * Queue names used throughout the application
 */
export const QUEUE_NAMES = {
  BULK_DOWNLOAD: "bulk-download",
} as const;

/**
 * Injection token for the BullMQ Redis connection config
 */
export const BULLMQ_CONNECTION = "BULLMQ_CONNECTION";

/**
 * Injection token for the Redis client instance (for caching)
 */
export const REDIS_CLIENT = "REDIS_CLIENT";

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
      provide: BULLMQ_CONNECTION,
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
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger("RedisClient");
        const redisUrl = configService.get<string>("REDIS_URL");

        if (!redisUrl) {
          logger.warn(
            "REDIS_URL is not set — caching features will be degraded",
          );
          // Return a stub so dependent services can degrade gracefully.
          return null;
        }

        const client = new Redis(redisUrl, {
          // Fail fast on individual commands rather than queuing them
          // indefinitely; this prevents request pile-up during outages.
          maxRetriesPerRequest: 1,
          // Do not buffer commands while the connection is down.
          enableOfflineQueue: false,
          // Limit reconnection attempts to avoid log spam.
          retryStrategy: (times: number) => {
            if (times > 5) return null; // Stop retrying
            return Math.min(times * 500, 3000);
          },
        });

        client.on("connect", () => {
          logger.log("Redis client connected");
        });

        client.on("error", (err) => {
          // Log but do not crash — callers wrap Redis calls in try/catch.
          logger.error(`Redis client error: ${err.message}`);
        });

        return client;
      },
    },
    {
      provide: QUEUE_NAMES.BULK_DOWNLOAD,
      inject: [BULLMQ_CONNECTION],
      useFactory: (connection: any) => {
        const logger = new Logger("BulkDownloadQueue");
        const queue = new Queue(QUEUE_NAMES.BULK_DOWNLOAD, { connection });

        logger.log(`BullMQ queue "${QUEUE_NAMES.BULK_DOWNLOAD}" initialized`);

        return queue;
      },
    },
  ],
  exports: [BULLMQ_CONNECTION, REDIS_CLIENT, QUEUE_NAMES.BULK_DOWNLOAD],
})
export class QueueModule {}
