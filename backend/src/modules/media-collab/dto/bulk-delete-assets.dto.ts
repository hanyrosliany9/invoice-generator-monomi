import { IsArray, IsString, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for bulk delete assets operation
 *
 * Follows industry best practices from Google Drive and Dropbox:
 * - Google Drive: Max 100 operations per batch
 * - Dropbox: Async job queue for large batches
 * - Frame.io: Dedicated bulk endpoints
 *
 * Phase 1: Synchronous processing for up to 100 assets
 * Phase 2: Async job queue with BullMQ for 100+ assets
 */
export class BulkDeleteAssetsDto {
  @ApiProperty({
    description: 'Array of asset IDs to delete',
    example: [
      'cmi65bkbh006xrlrp39n0rn0q',
      'cmi65eq9p00a9rlrp38r72rwu',
      'cmi65bn5v0071rlrpr8r20l5i'
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one asset ID is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 assets can be deleted at once' })
  @IsString({ each: true })
  assetIds: string[];
}
