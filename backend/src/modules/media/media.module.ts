import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import r2Config from "../../config/r2.config";
import { MediaService } from "./media.service";
import { MediaController } from "./media.controller";
import { MediaCleanupService } from "./services/media-cleanup.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * MediaModule - Cloudflare R2 Media Storage
 *
 * Provides:
 * - MediaService for R2 file operations
 * - MediaController for upload/delete REST API
 * - MediaCleanupService for automated thumbnail cleanup
 * - R2 configuration loading
 *
 * Dependencies:
 * - @aws-sdk/client-s3 (S3-compatible API)
 * - @nestjs/config (environment variables)
 * - @nestjs/schedule (cron jobs)
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 * - R2_PUBLIC_URL
 * - R2_ENDPOINT
 */
@Module({
  imports: [
    ConfigModule.forFeature(r2Config),
    ScheduleModule.forRoot(), // Enable cron jobs
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaCleanupService, PrismaService],
  exports: [MediaService, MediaCleanupService], // Export for use in other modules
})
export class MediaModule {}
