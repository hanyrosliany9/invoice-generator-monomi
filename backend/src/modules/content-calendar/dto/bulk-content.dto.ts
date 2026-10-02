import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentStatus } from "@prisma/client";

export const BULK_ACTIONS = ["STATUS", "SHIFT", "DELETE"] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

/** Bulk operation over several content items (list / agenda multi-select). */
export class BulkContentDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({ enum: BULK_ACTIONS })
  @IsIn(BULK_ACTIONS as unknown as string[])
  action: BulkAction;

  @ApiPropertyOptional({ enum: ContentStatus, description: "Target status for action=STATUS" })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ description: "Days to move the schedule by (negative = earlier) for action=SHIFT" })
  @IsInt()
  @Min(-365)
  @Max(365)
  @IsOptional()
  days?: number;
}
