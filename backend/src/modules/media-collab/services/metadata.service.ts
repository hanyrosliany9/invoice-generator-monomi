import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
const ExifParser = require("exif-parser");

/**
 * MetadataService
 *
 * Handles EXIF extraction, star ratings, and metadata management.
 */
@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract EXIF data from photo file
   */
  async extractExifData(file: Express.Multer.File): Promise<any> {
    try {
      if (!file.buffer) {
        return null;
      }

      const parser = ExifParser.create(file.buffer);
      const result = parser.parse();

      if (!result || !result.tags) {
        return null;
      }

      const tags = result.tags;

      // Extract relevant EXIF data
      const exifData: any = {};

      // Camera information
      if (tags.Make) exifData.cameraMake = tags.Make;
      if (tags.Model) exifData.cameraModel = tags.Model;
      if (tags.LensModel) exifData.lens = tags.LensModel;

      // Camera settings
      if (tags.ISO) exifData.iso = tags.ISO;
      if (tags.FNumber) exifData.aperture = tags.FNumber;
      if (tags.ExposureTime) {
        exifData.shutterSpeed = this.formatShutterSpeed(tags.ExposureTime);
      }
      if (tags.FocalLength) exifData.focalLength = tags.FocalLength;

      // Date/time
      if (tags.DateTimeOriginal) {
        exifData.capturedAt = new Date(tags.DateTimeOriginal * 1000);
      } else if (tags.CreateDate) {
        exifData.capturedAt = new Date(tags.CreateDate * 1000);
      }

      // GPS data
      if (tags.GPSLatitude) exifData.gpsLatitude = tags.GPSLatitude;
      if (tags.GPSLongitude) exifData.gpsLongitude = tags.GPSLongitude;

      // Copyright
      if (tags.Copyright) exifData.copyright = tags.Copyright;

      this.logger.log("EXIF data extracted:", Object.keys(exifData));
      return exifData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn("EXIF extraction failed (non-critical):", errorMessage);
      return null;
    }
  }

  /**
   * Format shutter speed for display (e.g., 0.0125 -> "1/80")
   */
  private formatShutterSpeed(exposureTime: number): string {
    if (exposureTime >= 1) {
      return `${exposureTime}s`;
    }

    const denominator = Math.round(1 / exposureTime);
    return `1/${denominator}`;
  }

  /**
   * Create or update asset metadata
   */
  async createOrUpdateMetadata(assetId: string, metadata: any) {
    return this.prisma.assetMetadata.upsert({
      where: { assetId },
      create: {
        assetId,
        ...metadata,
      },
      update: metadata,
    });
  }

  /**
   * Bulk update metadata for multiple assets
   */
  async bulkUpdateMetadata(assetIds: string[], metadata: any) {
    const updates = assetIds.map((assetId) =>
      this.prisma.assetMetadata.upsert({
        where: { assetId },
        create: {
          assetId,
          ...metadata,
        },
        update: metadata,
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true, updated: assetIds.length };
  }

  /**
   * Update star rating for an asset
   */
  async updateStarRating(assetId: string, starRating: number, userId: string) {
    if (starRating < 0 || starRating > 5) {
      throw new BadRequestException("Star rating must be between 0 and 5");
    }

    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { starRating: starRating === 0 ? null : starRating },
    });
  }

  /**
   * Bulk update star rating for multiple assets
   */
  async bulkUpdateStarRating(
    assetIds: string[],
    starRating: number,
    userId: string,
  ) {
    if (starRating < 0 || starRating > 5) {
      throw new BadRequestException("Star rating must be between 0 and 5");
    }

    await this.prisma.mediaAsset.updateMany({
      where: { id: { in: assetIds } },
      data: { starRating: starRating === 0 ? null : starRating },
    });

    return { success: true, updated: assetIds.length };
  }
}
