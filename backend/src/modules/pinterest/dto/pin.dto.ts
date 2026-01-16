import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PinterestPinDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pinId: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  localPath?: string;

  @ApiProperty()
  mediaType: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  fileSize?: number;

  @ApiProperty()
  downloaded: boolean;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  createdAt: Date;
}

export class PinterestPinListResponseDto {
  @ApiProperty({ type: [PinterestPinDto] })
  data: PinterestPinDto[];

  @ApiProperty()
  total: number;
}
