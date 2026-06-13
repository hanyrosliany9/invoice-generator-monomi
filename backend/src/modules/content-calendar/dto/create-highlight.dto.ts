import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HighlightMediaDto {
  @ApiProperty() @IsString() @IsNotEmpty() url: string;
  @ApiProperty() @IsString() @IsNotEmpty() key: string;
  @ApiProperty() @IsString() @IsNotEmpty() mimeType: string;
  @ApiProperty() @IsNotEmpty() size: number;
  @ApiPropertyOptional() @IsOptional() width?: number;
  @ApiPropertyOptional() @IsOptional() height?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailKey?: string;
}

export class CreateHighlightDto {
  @ApiProperty({ description: "Highlight title (shown under the circle)" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: "Cover image (first media is used if omitted)", type: HighlightMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HighlightMediaDto)
  cover?: HighlightMediaDto;

  @ApiProperty({ description: "Highlight media (9:16 images/videos)", type: [HighlightMediaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HighlightMediaDto)
  media: HighlightMediaDto[];
}
