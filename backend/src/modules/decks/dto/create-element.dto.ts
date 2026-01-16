import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateElementDto {
  @ApiProperty({ description: "Slide ID" })
  @IsString()
  slideId: string;

  @ApiProperty({ description: "Element type: TEXT, IMAGE, VIDEO, SHAPE, ICON" })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: "X position (% from left)", default: 0 })
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ description: "Y position (% from top)", default: 0 })
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional({ description: "Width (% of slide)", default: 100 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: "Height (% of slide)", default: 100 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: "Rotation in degrees", default: 0 })
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiPropertyOptional({ description: "Z-index for layering", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  zIndex?: number;

  @ApiPropertyOptional({ description: "Type-specific content JSON" })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({
    description: "Lock element from editing",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
