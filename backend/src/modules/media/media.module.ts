import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { JwtModule } from "@nestjs/jwt";
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
 * - Media access token generation (for Cloudflare Workers)
 *
 * Dependencies:
 * - @aws-sdk/client-s3 (S3-compatible API)
 * - @nestjs/config (environment variables)
 * - @nestjs/schedule (cron jobs)
 * - @nestjs/jwt (token generation)
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 * - R2_PUBLIC_URL
 * - R2_ENDPOINT
 * - JWT_SECRET (for media token signing)
 */
@Module({
  imports: [
    ConfigModule.forFeature(r2Config),
    ScheduleModule.forRoot(), // Enable cron jobs
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' }, // Media tokens valid for 24 hours
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaCleanupService, PrismaService],
  exports: [MediaService, MediaCleanupService, JwtModule], // Export for use in other modules
})
export class MediaModule {}
