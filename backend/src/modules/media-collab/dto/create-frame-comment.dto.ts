import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFrameCommentDto {
  @ApiProperty({
    description: "ID of the asset this comment belongs to",
    example: "clk1234567890",
  })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({
    description: "Timecode in seconds for video comments",
    example: 45.5,
  })
  @IsInt()
  @Min(0)
  timecode: number;

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
  @IsInt()
  @Min(0)
  markerX?: number;

  @ApiPropertyOptional({
    description: "Y coordinate for marker position (percentage 0-100)",
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  markerY?: number;

  @ApiPropertyOptional({
    description: "Parent comment ID for replies",
    example: "clk9876543210",
  })
  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
