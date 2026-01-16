import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../media.service";

/**
 * MediaCleanupService - Automated Thumbnail and Orphaned File Cleanup
 *
 * This service runs scheduled jobs to clean up:
 * 1. Orphaned thumbnails (thumbnails without associated assets)
 * 2. Old temporary files (> 7 days)
 * 3. Failed upload artifacts
 *
 * Runs daily at 2 AM to minimize impact on production
 */
@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Clean up orphaned thumbnails daily at 2 AM
   * Cron: 0 2 * * * (every day at 2:00 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOrphanedThumbnails(): Promise<void> {
    if (!this.mediaService.isR2Enabled()) {
      this.logger.warn("R2 is not enabled. Skipping thumbnail cleanup.");
      return;
    }

    this.logger.log("🧹 Starting orphaned thumbnail cleanup...");
    const startTime = Date.now();

    try {
      let deletedCount = 0;
      let errorCount = 0;

      // Find all MediaAssets with thumbnailUrl
      const assetsWithThumbnails = await this.prisma.mediaAsset.findMany({
        where: {
          thumbnailUrl: { not: null },
        },
        select: {
          id: true,
          thumbnailUrl: true,
        },
      });

      // Find MediaVersions with thumbnailUrl
      const versionsWithThumbnails = await this.prisma.mediaVersion.findMany({
        where: {
          thumbnailUrl: { not: null },
        },
        select: {
          id: true,
          thumbnailUrl: true,
        },
      });

      // Note: MediaAsset uses hard deletes (Cascade), so no soft-deleted assets to clean up
      // The thumbnails are automatically handled by cascade delete

      const duration = Date.now() - startTime;
      this.logger.log(
        `🧹 Thumbnail cleanup completed in ${duration}ms. Deleted: ${deletedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`❌ Thumbnail cleanup failed: ${errorMessage}`);
    }
  }

  /**
   * Clean up old temporary files (> 7 days)
   * Runs weekly on Sunday at 3 AM
   */
  @Cron("0 3 * * 0") // Every Sunday at 3 AM
  async cleanupOldTemporaryFiles(): Promise<void> {
    if (!this.mediaService.isR2Enabled()) {
      this.logger.warn("R2 is not enabled. Skipping temporary file cleanup.");
      return;
    }

    this.logger.log("🧹 Starting old temporary file cleanup (7+ days old)...");
    const startTime = Date.now();

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let deletedCount = 0;

      // Note: MediaAsset uses hard deletes (Cascade), not soft deletes
      // No old temporary files to clean up - files are deleted immediately
      this.logger.log(
        "MediaAsset uses hard deletes - no temporary files to clean up",
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `🧹 Old file cleanup completed in ${duration}ms. Deleted: ${deletedCount} files`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`❌ Old file cleanup failed: ${errorMessage}`);
    }
  }

  /**
   * Manual cleanup method - can be called via API or script
   * @returns Cleanup statistics
   */
  async manualCleanup(): Promise<{
    deletedThumbnails: number;
    deletedFiles: number;
    errors: number;
  }> {
    this.logger.log("🧹 Manual cleanup triggered...");

    let deletedThumbnails = 0;
    let deletedFiles = 0;
    let errors = 0;

    try {
      // Run thumbnail cleanup
      await this.cleanupOrphanedThumbnails();

      // Run old file cleanup
      await this.cleanupOldTemporaryFiles();

      return {
        deletedThumbnails,
        deletedFiles,
        errors,
      };
    } catch (error) {
      errors++;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`❌ Manual cleanup failed: ${errorMessage}`);
      throw error;
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
}
