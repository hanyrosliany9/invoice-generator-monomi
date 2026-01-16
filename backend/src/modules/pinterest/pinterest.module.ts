import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PinterestController } from "./pinterest.controller";
import { PinterestService } from "./pinterest.service";
import { PinterestGateway } from "./pinterest.gateway";
import { PrismaService } from "../prisma/prisma.service";

/**
 * PinterestModule - Pinterest Media Downloader
 *
 * Provides:
 * - PinterestService for downloading Pinterest boards/pins
 * - PinterestController for REST API endpoints
 * - PinterestGateway for real-time progress via WebSocket
 *
 * Features:
 * - Download entire boards, user profiles, or single pins
 * - Multi-threaded downloads with retry logic
 * - Real-time progress updates via WebSocket
 * - Job management (start, cancel, delete)
 * - Downloaded files served via API
 *
 * Endpoints:
 * - POST /api/v1/pinterest/download - Start download
 * - GET  /api/v1/pinterest/jobs - List jobs
 * - GET  /api/v1/pinterest/jobs/:id - Get job details
 * - POST /api/v1/pinterest/jobs/:id/cancel - Cancel job
 * - DELETE /api/v1/pinterest/jobs/:id - Delete job
 * - GET  /api/v1/pinterest/pins - List pins
 * - GET  /api/v1/pinterest/pins/:id/file - Get pin file
 *
 * WebSocket namespace: /pinterest
 * - Event: download:progress - Real-time progress updates
 * - Event: download:completed - Job completion notification
 * - Event: download:error - Error notification
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "24h" },
      }),
    }),
  ],
  controllers: [PinterestController],
  providers: [PinterestService, PinterestGateway, PrismaService],
  exports: [PinterestService],
})
export class PinterestModule {}
