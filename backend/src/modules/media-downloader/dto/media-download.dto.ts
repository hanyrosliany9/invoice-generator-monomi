import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUrl, IsOptional, IsEnum, IsBoolean } from "class-validator";

export enum VideoQuality {
  BEST = "best",
  HD_1080 = "1080p",
  HD_720 = "720p",
  SD_480 = "480p",
  SD_360 = "360p",
  WORST = "worst",
  AUDIO_ONLY = "audio",
}

export class QuickDownloadDto {
  @ApiProperty({
    description: "URL of the media to download",
    example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: "Video quality to download",
    enum: VideoQuality,
    default: VideoQuality.BEST,
  })
  @IsOptional()
  @IsEnum(VideoQuality)
  quality?: VideoQuality;

  @ApiPropertyOptional({
    description: "Download audio only (MP3)",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  audioOnly?: boolean;
}

export class MediaInfoDto {
  @ApiProperty({ description: "Media ID from the platform" })
  id: string;

  @ApiProperty({ description: "Title of the media" })
  title: string;

  @ApiPropertyOptional({ description: "Description" })
  description?: string;

  @ApiPropertyOptional({ description: "Thumbnail URL" })
  thumbnail?: string;

  @ApiPropertyOptional({ description: "Duration in seconds" })
  duration?: number;

  @ApiPropertyOptional({ description: "Uploader name" })
  uploader?: string;

  @ApiPropertyOptional({ description: "View count" })
  viewCount?: number;

  @ApiProperty({ description: "Platform/extractor name" })
  platform: string;

  @ApiProperty({ description: "Original URL" })
  url: string;

  @ApiPropertyOptional({ description: "Video width" })
  width?: number;

  @ApiPropertyOptional({ description: "Video height" })
  height?: number;

  @ApiPropertyOptional({ description: "File size in bytes" })
  filesize?: number;

  @ApiPropertyOptional({ description: "Available quality options" })
  availableQualities?: string[];
}

export class MediaInfoRequestDto {
  @ApiProperty({
    description: "URL to get info for",
    example: "https://www.instagram.com/reel/ABC123/",
  })
  @IsUrl()
  url: string;
}

export class SupportedPlatformsDto {
  @ApiProperty({ description: "List of supported platforms" })
  platforms: string[];
}

export class PlatformDetectionDto {
  @ApiProperty({ description: "Detected platform name" })
  platform: string;

  @ApiProperty({ description: "Whether the URL is supported" })
  isSupported: boolean;

  @ApiPropertyOptional({
    description: "Content type (video, reel, short, etc.)",
  })
  contentType?: string;
}
