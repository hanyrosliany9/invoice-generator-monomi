import { Controller, Get, Param, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MediaProjectsService } from '../services/media-projects.service';
import { MediaAssetsService } from '../services/media-assets.service';
import { MetadataService } from '../services/metadata.service';

/**
 * Public API Controller
 * No authentication required - anyone with link can access
 */
@ApiTags('Public Sharing')
@Controller('media-collab/public')
export class PublicController {
  constructor(
    private readonly projectsService: MediaProjectsService,
    private readonly assetsService: MediaAssetsService,
    private readonly metadataService: MetadataService,
  ) {}

  /**
   * Get public project by share token
   */
  @Get(':token')
  @ApiOperation({ summary: 'Get public project (no auth required)' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or disabled' })
  async getPublicProject(@Param('token') token: string) {
    // Return data directly - ResponseInterceptor will wrap it
    return await this.projectsService.getPublicProject(token);
  }

  /**
   * Get public project assets
   */
  @Get(':token/assets')
  @ApiOperation({ summary: 'Get public project assets (no auth required)' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or disabled' })
  async getPublicAssets(@Param('token') token: string) {
    // Return data directly - ResponseInterceptor will wrap it
    return await this.projectsService.getPublicProjectAssets(token);
  }

  /**
   * Get public project folders
   */
  @Get(':token/folders')
  @ApiOperation({ summary: 'Get public project folders (no auth required)' })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or disabled' })
  async getPublicFolders(@Param('token') token: string) {
    // Return data directly - ResponseInterceptor will wrap it
    return await this.projectsService.getPublicProjectFolders(token);
  }

  /**
   * Update asset status (public - no auth required)
   */
  @Put(':token/assets/:assetId/status')
  @ApiOperation({ summary: 'Update asset status via public link (no auth required)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or asset not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'IN_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'ARCHIVED'],
          description: 'New status for the asset',
        },
      },
      required: ['status'],
    },
  })
  async updatePublicAssetStatus(
    @Param('token') token: string,
    @Param('assetId') assetId: string,
    @Body('status') status: string,
  ) {
    // Verify token is valid and get project
    const project = await this.projectsService.getPublicProject(token);

    // Update asset status (using guest user ID from project creator)
    return await this.assetsService.updateStatus(assetId, project.createdBy, status);
  }

  /**
   * Update asset star rating (public - no auth required)
   */
  @Put(':token/assets/:assetId/rating')
  @ApiOperation({ summary: 'Update asset star rating via public link (no auth required)' })
  @ApiResponse({ status: 200, description: 'Rating updated successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or asset not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        starRating: {
          type: 'number',
          minimum: 0,
          maximum: 5,
          description: 'Star rating (0-5, where 0 means no rating)',
        },
      },
      required: ['starRating'],
    },
  })
  async updatePublicAssetRating(
    @Param('token') token: string,
    @Param('assetId') assetId: string,
    @Body('starRating') starRating: number,
  ) {
    // Verify token is valid and get project
    const project = await this.projectsService.getPublicProject(token);

    // Update star rating (using guest user ID from project creator)
    return await this.metadataService.updateStarRating(assetId, starRating, project.createdBy);
  }
}
