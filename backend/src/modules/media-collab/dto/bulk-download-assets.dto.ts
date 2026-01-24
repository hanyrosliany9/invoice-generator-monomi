import {
  IsArray,
  IsString,
  ArrayMaxSize,
  ArrayMinSize,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for bulk download assets operation
 *
 * Generates a ZIP file containing selected media assets.
 * Server-side ZIP generation prevents CORS issues and handles
 * large files more reliably than client-side solutions.
 *
 * Limits:
 * - Maximum 500 assets per download (to prevent timeout)
 * - ZIP is streamed to client, no server-side storage needed
 */
export class BulkDownloadAssetsDto {
  @ApiProperty({
    description: "Array of asset IDs to download",
    example: [
      "cmi65bkbh006xrlrp39n0rn0q",
      "cmi65eq9p00a9rlrp38r72rwu",
      "cmi65bn5v0071rlrpr8r20l5i",
    ],
    type: [String],
    minItems: 1,
    maxItems: 500,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one asset ID is required" })
  @ArrayMaxSize(500, { message: "Maximum 500 assets can be downloaded at once" })
  @IsString({ each: true })
  assetIds: string[];

  @ApiPropertyOptional({
    description: "Custom filename for the ZIP archive (without .zip extension)",
    example: "project-media-export",
    default: "media-download",
  })
  @IsOptional()
  @IsString()
  zipFilename?: string;
}
