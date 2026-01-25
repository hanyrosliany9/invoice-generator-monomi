import {
  IsArray,
  IsString,
  ArrayMaxSize,
  ArrayMinSize,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one asset ID is required" })
  @ArrayMaxSize(1000, { message: "Maximum 1000 assets can be downloaded at once" })
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
