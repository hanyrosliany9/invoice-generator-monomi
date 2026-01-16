import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDeckDto {
  @ApiProperty({ description: "Deck title" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Deck description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Link to client" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: "Link to project" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: "Link to media project for asset access",
  })
  @IsOptional()
  @IsString()
  mediaProjectId?: string;

  @ApiPropertyOptional({ description: "Theme settings JSON" })
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @ApiPropertyOptional({ description: "Slide width in pixels", default: 1920 })
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(3840)
  slideWidth?: number;

  @ApiPropertyOptional({ description: "Slide height in pixels", default: 1080 })
  @IsOptional()
  @IsInt()
  @Min(600)
  @Max(2160)
  slideHeight?: number;
}
