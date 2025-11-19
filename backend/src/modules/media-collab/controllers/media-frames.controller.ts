import { Controller, UseGuards, Post, Get, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MediaFramesService } from '../services/media-frames.service';
import { CreateFrameDrawingDto } from '../dto/create-frame-drawing.dto';
import { UpdateFrameDrawingDto } from '../dto/update-frame-drawing.dto';
import { AuthenticatedRequest } from '../types/authenticated-request.interface';

@ApiTags('Media Collaboration - Frames & Drawings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-collab/frames')
export class MediaFramesController {
  constructor(private readonly framesService: MediaFramesService) {}

  @Get('asset/:assetId')
  @ApiOperation({ summary: 'Get all frames for an asset' })
  async getFramesByAsset(@Param('assetId') assetId: string) {
    return this.framesService.findByAsset(assetId);
  }

  @Post('drawings')
  @ApiOperation({ summary: 'Create a new drawing on a frame' })
  async createDrawing(@Body() createDto: CreateFrameDrawingDto, @Req() req: AuthenticatedRequest) {
    return this.framesService.createDrawing(req.user.id, createDto);
  }

  @Get('drawings/asset/:assetId')
  @ApiOperation({ summary: 'Get all drawings for an asset' })
  async getDrawingsByAsset(@Param('assetId') assetId: string) {
    return this.framesService.getDrawingsByAsset(assetId);
  }

  @Get('drawings/timecode/:assetId/:timecode')
  @ApiOperation({ summary: 'Get drawings at specific timecode' })
  async getDrawingsAtTimecode(
    @Param('assetId') assetId: string,
    @Param('timecode') timecode: string,
  ) {
    return this.framesService.getDrawingsAtTimecode(assetId, parseFloat(timecode));
  }

  @Put('drawings/:drawingId')
  @ApiOperation({ summary: 'Update a drawing' })
  async updateDrawing(
    @Param('drawingId') drawingId: string,
    @Body() updateDto: UpdateFrameDrawingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.framesService.updateDrawing(drawingId, req.user.id, updateDto);
  }

  @Delete('drawings/:drawingId')
  @ApiOperation({ summary: 'Delete a drawing' })
  async deleteDrawing(@Param('drawingId') drawingId: string, @Req() req: AuthenticatedRequest) {
    return this.framesService.deleteDrawing(drawingId, req.user.id);
  }

  @Delete(':frameId')
  @ApiOperation({ summary: 'Delete a frame and all associated data' })
  async deleteFrame(@Param('frameId') frameId: string) {
    return this.framesService.removeFrame(frameId);
  }
}
