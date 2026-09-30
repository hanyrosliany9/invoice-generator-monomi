import {
  IsArray,
  IsString,
  ArrayMaxSize,
  ArrayMinSize,
  IsOptional,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Upper bound on asset IDs per async bulk-download job. Shared by the
 * authenticated and public-share endpoints so "Download All" behaves the same
 * on both (raised from 500 so every asset in a project can be archived).
 */
export const BULK_DOWNLOAD_MAX_ASSETS = 10000;

/**
 * DTO for creating an async bulk download job
 *
 * Creates a background job that:
 * 1. Fetches files from R2 storage
 * 2. Creates a ZIP archive
 * 3. Uploads the ZIP to R2
 * 4. Returns a presigned URL for download
 *
 * Progress is reported via WebSocket events.
 */
export class CreateBulkDownloadJobDto {
  @ApiProperty({
    description: "Array of asset IDs to download",
    example: [
      "cmi65bkbh006xrlrp39n0rn0q",
      "cmi65eq9p00a9rlrp38r72rwu",
      "cmi65bn5v0071rlrpr8r20l5i",
    ],
    type: [String],
    minItems: 1,
    maxItems: BULK_DOWNLOAD_MAX_ASSETS,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one asset ID is required" })
  @ArrayMaxSize(BULK_DOWNLOAD_MAX_ASSETS, {
    message: `Maximum ${BULK_DOWNLOAD_MAX_ASSETS} assets can be downloaded at once`,
  })
  @IsString({ each: true })
  assetIds: string[];

  @ApiProperty({
    description: "Project ID for access validation",
    example: "cmi65abc123projectid456",
  })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: "Custom filename for the ZIP archive (without .zip extension)",
    example: "project-media-export",
    default: "media-download",
  })
  @IsOptional()
  @IsString()
  zipFilename?: string;
}

/**
 * DTO for creating an async bulk download job through a public share link
 * (POST /media-collab/public/:token/async-bulk-download).
 *
 * Same limits as the authenticated job. There is no projectId: the project is
 * resolved from the share token, and asset IDs outside that project are
 * dropped by the service.
 */
export class CreatePublicBulkDownloadJobDto {
  @ApiProperty({
    description: "Array of asset IDs to download (must belong to the shared project)",
    type: [String],
    minItems: 1,
    maxItems: BULK_DOWNLOAD_MAX_ASSETS,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one asset ID is required" })
  @ArrayMaxSize(BULK_DOWNLOAD_MAX_ASSETS, {
    message: `Maximum ${BULK_DOWNLOAD_MAX_ASSETS} assets can be downloaded at once`,
  })
  @IsString({ each: true })
  assetIds: string[];

  @ApiPropertyOptional({
    description: "Custom filename for the ZIP archive (without .zip extension)",
    example: "project-media-export",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  zipFilename?: string;
}
