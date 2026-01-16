import { IsString, IsUrl, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StartDownloadDto {
  @ApiProperty({
    description: "Pinterest URL (board, user profile, or single pin)",
    example: "https://pinterest.com/username/board-name",
  })
  @IsString()
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: "Download images",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  downloadImages?: boolean = true;

  @ApiPropertyOptional({
    description: "Download videos",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  downloadVideos?: boolean = true;
}

export class DownloadProgressDto {
  @ApiProperty()
  jobId: string;

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

  @ApiProperty()
  percentage: number;

  @ApiPropertyOptional()
  currentPin?: string;
}
