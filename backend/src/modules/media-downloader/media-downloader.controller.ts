import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { YtdlpService, MediaInfo } from './ytdlp.service';
import {
  QuickDownloadDto,
  MediaInfoDto,
  MediaInfoRequestDto,
  SupportedPlatformsDto,
  PlatformDetectionDto,
  VideoQuality,
} from './dto/media-download.dto';

@ApiTags('Media Downloader')
@ApiBearerAuth()
@Controller('media-downloader')
@UseGuards(JwtAuthGuard)
export class MediaDownloaderController {
  private readonly logger = new Logger(MediaDownloaderController.name);

  constructor(private readonly ytdlpService: YtdlpService) {}

  /**
   * Get list of supported platforms
   */
  @Get('platforms')
  @ApiOperation({ summary: 'Get list of supported platforms' })
  @ApiResponse({ status: 200, type: SupportedPlatformsDto })
  getSupportedPlatforms(): SupportedPlatformsDto {
    return {
      platforms: this.ytdlpService.getSupportedPlatforms(),
    };
  }

  /**
   * Detect platform from URL
   */
  @Get('detect')
  @ApiOperation({ summary: 'Detect platform from URL' })
  @ApiQuery({ name: 'url', required: true, description: 'URL to detect' })
  @ApiResponse({ status: 200, type: PlatformDetectionDto })
  async detectPlatform(@Query('url') url: string): Promise<PlatformDetectionDto> {
    const platform = this.ytdlpService.detectPlatform(url);

    // Pinterest uses custom scraping, not yt-dlp
    if (platform === 'pinterest') {
      return {
        platform: 'pinterest',
        isSupported: true,
        contentType: url.includes('/pin/') ? 'pin' : 'board',
      };
    }

    const isSupported = await this.ytdlpService.isSupported(url);

    let contentType: string | undefined;
    if (platform === 'youtube') {
      if (url.includes('/shorts/')) contentType = 'short';
      else if (url.includes('playlist')) contentType = 'playlist';
      else contentType = 'video';
    } else if (platform === 'instagram') {
      if (url.includes('/reel/')) contentType = 'reel';
      else if (url.includes('/stories/')) contentType = 'story';
      else contentType = 'post';
    } else if (platform === 'tiktok') {
      contentType = 'video';
    }

    return {
      platform,
      isSupported,
      contentType,
    };
  }

  /**
   * Get media information without downloading
   */
  @Post('info')
  @ApiOperation({ summary: 'Get media information from URL' })
  @ApiResponse({ status: 200, type: MediaInfoDto })
  async getMediaInfo(@Body() dto: MediaInfoRequestDto): Promise<MediaInfoDto> {
    this.logger.log(`Getting info for: ${dto.url}`);

    const info = await this.ytdlpService.getInfo(dto.url);

    // Extract available qualities from formats
    const availableQualities = this.extractAvailableQualities(info);

    return {
      id: info.id,
      title: info.title,
      description: info.description,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      viewCount: info.viewCount,
      platform: info.extractor,
      url: info.webpageUrl,
      width: info.width,
      height: info.height,
      filesize: info.filesize || info.filesizeApprox,
      availableQualities,
    };
  }

  /**
   * Quick download - streams file directly to browser
   */
  @Post('download')
  @ApiOperation({ summary: 'Download media directly to browser' })
  @ApiResponse({ status: 200, description: 'Binary file data' })
  async quickDownload(
    @Body() dto: QuickDownloadDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Download request: ${dto.url} (quality: ${dto.quality || 'best'})`);

    const result = await this.ytdlpService.quickDownload(dto.url, {
      quality: dto.quality as any || 'best',
      audioOnly: dto.audioOnly,
    });

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
      'Content-Length': result.data.length,
    });

    res.send(result.data);
  }

  /**
   * Get available formats for a URL
   */
  @Post('formats')
  @ApiOperation({ summary: 'Get available download formats' })
  async getFormats(@Body() dto: MediaInfoRequestDto): Promise<any> {
    const formats = await this.ytdlpService.getFormats(dto.url);

    // Group and simplify formats for frontend
    const videoFormats = formats
      .filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
      .reduce((acc, f) => {
        const key = `${f.height}p`;
        if (!acc[key] || (f.filesize || 0) > (acc[key].filesize || 0)) {
          acc[key] = f;
        }
        return acc;
      }, {} as Record<string, any>);

    const audioFormats = formats
      .filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
      .slice(0, 5);

    return {
      video: Object.entries(videoFormats)
        .map(([quality, format]) => ({
          quality,
          format: format.formatId,
          ext: format.ext,
          filesize: format.filesize || format.filesizeApprox,
        }))
        .sort((a, b) => parseInt(b.quality) - parseInt(a.quality)),
      audio: audioFormats.map(f => ({
        quality: f.formatNote || 'audio',
        format: f.formatId,
        ext: f.ext,
        filesize: f.filesize || f.filesizeApprox,
        bitrate: f.abr,
      })),
    };
  }

  /**
   * Extract available quality options from formats
   */
  private extractAvailableQualities(info: MediaInfo): string[] {
    if (!info.formats) return ['best'];

    const heights = new Set<number>();
    for (const format of info.formats) {
      if (format.height && format.vcodec && format.vcodec !== 'none') {
        heights.add(format.height);
      }
    }

    const qualities = Array.from(heights)
      .sort((a, b) => b - a)
      .map(h => `${h}p`);

    // Add standard options
    return ['best', ...qualities, 'audio'];
  }
}
