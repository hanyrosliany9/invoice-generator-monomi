import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PinterestService } from './pinterest.service';
import { StartDownloadDto, DownloadProgressDto } from './dto/download.dto';
import { PinterestJobDto, PinterestJobListResponseDto } from './dto/job.dto';
import { PinterestPinDto, PinterestPinListResponseDto } from './dto/pin.dto';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Pinterest')
@ApiBearerAuth()
@Controller('pinterest')
@UseGuards(JwtAuthGuard)
export class PinterestController {
  private readonly logger = new Logger(PinterestController.name);

  constructor(private readonly pinterestService: PinterestService) {}

  /**
   * Start a new Pinterest download job
   */
  @Post('download')
  @ApiOperation({ summary: 'Start a new Pinterest download job' })
  @ApiResponse({ status: 201, description: 'Download job created', type: PinterestJobDto })
  @ApiResponse({ status: 400, description: 'Invalid Pinterest URL' })
  async startDownload(
    @Body() dto: StartDownloadDto,
    @Req() req: any,
  ): Promise<PinterestJobDto> {
    this.logger.log(`Starting download for URL: ${dto.url}`);
    return this.pinterestService.startDownload(req.user.id, dto);
  }

  /**
   * Get all download jobs for the current user
   */
  @Get('jobs')
  @ApiOperation({ summary: 'Get all download jobs for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'List of download jobs', type: PinterestJobListResponseDto })
  async getJobs(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PinterestJobListResponseDto> {
    return this.pinterestService.getJobs(req.user.id, page, limit);
  }

  /**
   * Get a specific download job
   */
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get a specific download job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Download job details', type: PinterestJobDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<PinterestJobDto> {
    return this.pinterestService.getJob(id, req.user.id);
  }

  /**
   * Cancel a running download job
   */
  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a running download job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Job is not running' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancelJob(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    await this.pinterestService.cancelJob(id, req.user.id);
    return { message: 'Job cancelled successfully' };
  }

  /**
   * Delete a download job and its files
   */
  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete a download job and its files' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async deleteJob(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    await this.pinterestService.deleteJob(id, req.user.id);
    return { message: 'Job deleted successfully' };
  }

  /**
   * Get pins for a download job
   */
  @Get('pins')
  @ApiOperation({ summary: 'Get pins for a download job' })
  @ApiQuery({ name: 'downloadId', required: true, description: 'Download job ID' })
  @ApiResponse({ status: 200, description: 'List of pins', type: PinterestPinListResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getPins(
    @Query('downloadId') downloadId: string,
    @Req() req: any,
  ): Promise<PinterestPinListResponseDto> {
    return this.pinterestService.getPins(downloadId, req.user.id);
  }

  /**
   * Serve a downloaded pin file
   */
  @Get('pins/:id/file')
  @ApiOperation({ summary: 'Get the downloaded file for a pin' })
  @ApiParam({ name: 'id', description: 'Pin ID' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'Pin or file not found' })
  async getPinFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const filePath = await this.pinterestService.getPinFile(id, req.user.id);
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();

    // Set content type based on extension
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    const fileStream = fs.createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  /**
   * Download all pins as a ZIP file
   */
  @Get('jobs/:id/download')
  @ApiOperation({ summary: 'Download all pins from a job as a ZIP file' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'ZIP file containing all downloaded pins' })
  @ApiResponse({ status: 404, description: 'Job not found or no files available' })
  async downloadJobZip(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const { stream: archive, filename } = await this.pinterestService.createJobZip(id, req.user.id);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    archive.pipe(res);
    archive.finalize();
  }

  /**
   * Get the output folder path for a job
   */
  @Get('jobs/:id/path')
  @ApiOperation({ summary: 'Get the local folder path where pins are stored' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Folder path' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobPath(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ path: string }> {
    const outputPath = await this.pinterestService.getJobOutputPath(id, req.user.id);
    return { path: outputPath };
  }

  /**
   * Quick download a single pin - streams file directly to browser
   * The browser will save it to the user's Downloads folder
   */
  @Post('quick-download')
  @ApiOperation({ summary: 'Download a single pin directly to browser' })
  @ApiResponse({ status: 200, description: 'Binary file data' })
  @ApiResponse({ status: 400, description: 'Invalid URL or pin not found' })
  async quickDownload(
    @Body('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Quick download request for URL: ${url}`);
    const result = await this.pinterestService.quickDownloadPin(url);

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.data.length,
    });

    res.send(result.data);
  }

  /**
   * Get info about a pin without downloading
   */
  @Post('pin-info')
  @ApiOperation({ summary: 'Get information about a pin URL' })
  @ApiResponse({ status: 200, description: 'Pin information' })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  async getPinInfo(
    @Body('url') url: string,
  ): Promise<{
    pinId: string;
    title?: string;
    description?: string;
    mediaType: 'image' | 'video';
    previewUrl?: string;
    isPin: boolean;
    urlType: string;
  }> {
    this.logger.log(`Pin info request for URL: ${url}`);

    // First check URL type
    try {
      const parsed = this.pinterestService.parseUrl(url);

      if (parsed.type !== 'pin') {
        return {
          pinId: '',
          mediaType: 'image',
          isPin: false,
          urlType: parsed.type,
        };
      }

      const pinInfo = await this.pinterestService.getPinInfo(url);
      return {
        ...pinInfo,
        isPin: true,
        urlType: 'pin',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Pin info error: ${msg}`);
      throw error;
    }
  }
}
