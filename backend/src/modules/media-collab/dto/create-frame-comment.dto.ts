import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFrameCommentDto {
  @ApiProperty({
    description: "ID of the asset this comment belongs to",
    example: "clk1234567890",
  })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiPropertyOptional({
    description:
      "Timecode in seconds for video comments (omit for image/photo assets)",
    example: 45.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timestamp?: number;

  @ApiProperty({
    description: "Comment content/text",
    example: "Please adjust the color grading here",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "X coordinate for marker position (percentage 0-100)",
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  x?: number;

  @ApiPropertyOptional({
    description: "Y coordinate for marker position (percentage 0-100)",
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  y?: number;

  @ApiPropertyOptional({
    description: "Parent comment ID for replies",
    example: "clk9876543210",
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
