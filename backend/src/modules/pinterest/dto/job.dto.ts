import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PinterestJobDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  boardName?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  totalPins: number;

  @ApiProperty()
  downloadedPins: number;

  @ApiProperty()
  failedPins: number;

  @ApiProperty()
  skippedPins: number;

  @ApiPropertyOptional()
  outputPath?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class PinterestJobListResponseDto {
  @ApiProperty({ type: [PinterestJobDto] })
  data: PinterestJobDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
