import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MediaAssetsService } from '../services/media-assets.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { AssetFilters } from '../types/asset-filters.interface';

@ApiTags('Media Collaboration - Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-collab/assets')
export class MediaAssetsController {
  constructor(private readonly assetsService: MediaAssetsService) {}

  @Post('check-duplicates/:projectId')
  @ApiOperation({ summary: 'Check for duplicate files before uploading' })
  @ApiResponse({ status: 200, description: 'Returns map of filename -> existing asset data' })
  async checkDuplicates(
    @Request() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body('filenames') filenames: string[],
  ) {
    const duplicatesMap = await this.assetsService.checkDuplicates(
      projectId,
      req.user.id,
      filenames,
    );

    // Convert Map to plain object for JSON response
    const duplicates: Record<string, any> = {};
    duplicatesMap.forEach((value, key) => {
      duplicates[key] = value;
    });

    return {
      success: true,
      data: duplicates,
    };
  }

  @Post('upload/:projectId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a video or photo to a project' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        description: { type: 'string' },
        folderId: { type: 'string', format: 'uuid', description: 'Optional folder ID to upload to' },
        conflictResolution: {
          type: 'string',
          enum: ['skip', 'replace', 'keep-both'],
          description: 'How to handle duplicate files: skip (don\'t upload), replace (delete old), keep-both (rename new)',
        },
      },
    },
  })
  upload(
    @Request() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description?: string,
    @Body('folderId') folderId?: string,
    @Body('conflictResolution') conflictResolution?: 'skip' | 'replace' | 'keep-both',
  ) {
    return this.assetsService.upload(
      projectId,
      req.user.id,
      file,
      description,
      folderId,
      conflictResolution,
    );
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all assets in a project' })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Query() filters: AssetFilters,
  ) {
    return this.assetsService.findAll(projectId, req.user.id, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID' })
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assetsService.findOne(id, req.user.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update asset review status' })
  updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.assetsService.updateStatus(id, req.user.id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an asset (OWNER/EDITOR only)' })
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assetsService.remove(id, req.user.id);
  }
}
