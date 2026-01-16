import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentStatus, ContentPlatform } from "@prisma/client";

/**
 * DTO for content media attachment
 */
export class ContentMediaDto {
  @ApiProperty({ description: "Public URL from R2" })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: "R2 object key for deletion" })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: "MIME type (e.g., image/jpeg, video/mp4)" })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: "File size in bytes" })
  @IsNotEmpty()
  size: number;

  @ApiPropertyOptional({ description: "Image/video width in pixels" })
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: "Image/video height in pixels" })
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: "Video duration in seconds" })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: "Original filename" })
  @IsOptional()
  originalName?: string;

  @ApiPropertyOptional({ description: "Thumbnail URL for videos" })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: "Thumbnail R2 key for deletion" })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({
    description: "Carousel order (0 = first, 1 = second, etc.)",
    default: 0,
  })
  @IsOptional()
  order?: number;
}

/**
 * DTO for creating a content calendar item
 */
export class CreateContentDto {
  @ApiProperty({
    description: "Social media caption/post text",
    example:
      "Check out our summer sale! 🌞\n\nUp to 50% off on selected items.\n\n#SummerSale #Shopping",
  })
  @IsString()
  @IsNotEmpty()
  caption: string;

  @ApiPropertyOptional({
    description: "Scheduled publish date/time",
    example: "2025-01-15T10:00:00Z",
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({
    description: "Content status",
    enum: ContentStatus,
    example: ContentStatus.DRAFT,
  })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus = ContentStatus.DRAFT;

  @ApiProperty({
    description: "Target platforms",
    enum: ContentPlatform,
    isArray: true,
    example: [ContentPlatform.INSTAGRAM, ContentPlatform.FACEBOOK],
  })
  @IsArray()
  @IsEnum(ContentPlatform, { each: true })
  @IsOptional()
  platforms?: ContentPlatform[] = [];

  @ApiPropertyOptional({ description: "Client ID" })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: "Project ID" })
  @IsString()
  @IsOptional()
  projectId?: string;

  // DELETED: campaignId - 2025-11-09

  @ApiPropertyOptional({
    description: "Media attachments",
    type: [ContentMediaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentMediaDto)
  @IsOptional()
  media?: ContentMediaDto[] = [];
}
