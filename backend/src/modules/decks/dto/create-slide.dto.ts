import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum SlideTemplate {
  TITLE = "TITLE",
  TITLE_CONTENT = "TITLE_CONTENT",
  TWO_COLUMN = "TWO_COLUMN",
  FULL_MEDIA = "FULL_MEDIA",
  MOOD_BOARD = "MOOD_BOARD",
  CHARACTER = "CHARACTER",
  SHOT_LIST = "SHOT_LIST",
  SCHEDULE = "SCHEDULE",
  COMPARISON = "COMPARISON",
  BLANK = "BLANK",
}

export class CreateSlideDto {
  @ApiProperty({ description: "Deck ID" })
  @IsString()
  deckId: string;

  @ApiPropertyOptional({ description: "Slide order" })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ description: "Slide template", enum: SlideTemplate })
  @IsOptional()
  @IsEnum(SlideTemplate)
  template?: SlideTemplate;

  @ApiPropertyOptional({ description: "Slide title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "Slide subtitle" })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: "Template-specific content JSON" })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({ description: "Background color hex" })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: "Speaker notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
