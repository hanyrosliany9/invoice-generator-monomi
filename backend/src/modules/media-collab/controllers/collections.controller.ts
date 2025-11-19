import { Controller, UseGuards, Post, Get, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CollectionsService } from '../services/collections.service';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@ApiTags('Media Collaboration - Collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-collab/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post('project/:projectId')
  @ApiOperation({ summary: 'Create a new collection' })
  async createCollection(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCollectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.collectionsService.create(projectId, createDto, req.user.id);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all collections for a project' })
  async getCollections(@Param('projectId') projectId: string) {
    return this.collectionsService.findByProject(projectId);
  }

  @Get(':collectionId')
  @ApiOperation({ summary: 'Get a collection with details' })
  async getCollection(@Param('collectionId') collectionId: string) {
    return this.collectionsService.findOne(collectionId);
  }

  @Get(':collectionId/assets')
  @ApiOperation({ summary: 'Get assets in a collection' })
  async getCollectionAssets(@Param('collectionId') collectionId: string) {
    return this.collectionsService.getAssetsForCollection(collectionId);
  }

  @Put(':collectionId')
  @ApiOperation({ summary: 'Update a collection' })
  async updateCollection(
    @Param('collectionId') collectionId: string,
    @Body() updateDto: UpdateCollectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.collectionsService.update(collectionId, updateDto, req.user.id);
  }

  @Delete(':collectionId')
  @ApiOperation({ summary: 'Delete a collection' })
  async deleteCollection(@Param('collectionId') collectionId: string, @Req() req: AuthenticatedRequest) {
    return this.collectionsService.delete(collectionId, req.user.id);
  }

  @Post(':collectionId/assets')
  @ApiOperation({ summary: 'Add assets to collection' })
  async addAssets(
    @Param('collectionId') collectionId: string,
    @Body() body: { assetIds: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.collectionsService.addAssetsToCollection(
      collectionId,
      body.assetIds,
      req.user.id,
    );
  }

  @Delete(':collectionId/assets')
  @ApiOperation({ summary: 'Remove assets from collection' })
  async removeAssets(
    @Param('collectionId') collectionId: string,
    @Body() body: { assetIds: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.collectionsService.removeAssetsFromCollection(
      collectionId,
      body.assetIds,
      req.user.id,
    );
  }

  @Get('smart/rating/:projectId')
  @ApiOperation({ summary: 'Smart collection: Assets by minimum star rating' })
  async getByRating(
    @Param('projectId') projectId: string,
    @Query('minRating') minRating: string,
  ) {
    return this.collectionsService.getAssetsByStarRating(projectId, parseInt(minRating, 10));
  }

  @Get('smart/status/:projectId')
  @ApiOperation({ summary: 'Smart collection: Assets by status' })
  async getByStatus(
    @Param('projectId') projectId: string,
    @Query('status') status: string,
  ) {
    return this.collectionsService.getAssetsByStatus(projectId, status);
  }

  @Get('smart/unresolved/:projectId')
  @ApiOperation({ summary: 'Smart collection: Assets with unresolved comments' })
  async getUnresolved(@Param('projectId') projectId: string) {
    return this.collectionsService.getAssetsWithUnresolvedComments(projectId);
  }
}
