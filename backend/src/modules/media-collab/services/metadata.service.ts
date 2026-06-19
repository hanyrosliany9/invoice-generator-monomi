import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import JSZip from "jszip";
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
   * Update star rating for an asset.
   * When projectId is supplied the asset must belong to that project (IDOR guard).
   */
  async updateStarRating(assetId: string, starRating: number, userId: string, projectId?: string) {
    if (starRating < 0 || starRating > 5) {
      throw new BadRequestException("Star rating must be between 0 and 5");
    }

    if (projectId) {
      const asset = await this.prisma.mediaAsset.findUnique({
        where: { id: assetId },
        select: { id: true, projectId: true },
      });
      if (!asset || asset.projectId !== projectId) {
        throw new NotFoundException("Asset not found");
      }
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

  /**
   * Export XMP sidecar files for all rated assets in a project as a ZIP buffer.
   * Only assets with starRating >= minRating are included.
   */
  async exportXmpZip(
    projectId: string,
    userId: string,
    minRating: number,
  ): Promise<Buffer> {
    // Verify the project exists and the user has access
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        collaborators: {
          where: { userId },
          select: { id: true },
        },
        createdBy: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Media project not found");
    }

    const isOwner = project.createdBy === userId;
    const isCollaborator = project.collaborators.length > 0;
    if (!isOwner && !isCollaborator) {
      throw new NotFoundException("Media project not found");
    }

    // Query rated assets
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        projectId,
        starRating: {
          not: null,
          gte: minRating,
        },
      },
      select: {
        id: true,
        originalName: true,
        starRating: true,
      },
    });

    const zip = new JSZip();

    for (const asset of assets) {
      const xmpContent = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 6.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:Rating>${asset.starRating}</xmp:Rating>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

      // Replace original extension with .xmp
      const dotIndex = asset.originalName.lastIndexOf(".");
      const baseName =
        dotIndex !== -1
          ? asset.originalName.substring(0, dotIndex)
          : asset.originalName;
      const xmpFilename = `${baseName}.xmp`;

      zip.file(xmpFilename, xmpContent);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return zipBuffer;
  }
}
