import { Controller, UseGuards, Post, Get, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MediaCommentsService } from '../services/media-comments.service';
import { CreateFrameCommentDto } from '../dto/create-frame-comment.dto';
import { UpdateFrameCommentDto } from '../dto/update-frame-comment.dto';
import { AuthenticatedRequest } from '../types/authenticated-request.interface';

@ApiTags('Media Collaboration - Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-collab/comments')
export class MediaCommentsController {
  constructor(private readonly commentsService: MediaCommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  async createComment(@Body() createDto: CreateFrameCommentDto, @Req() req: AuthenticatedRequest) {
    return this.commentsService.create({
      ...createDto,
      authorId: req.user.id,
    });
  }

  @Get('frame/:frameId')
  @ApiOperation({ summary: 'Get all comments for a frame' })
  async getCommentsByFrame(@Param('frameId') frameId: string) {
    return this.commentsService.findByFrame(frameId);
  }

  @Get('asset/:assetId')
  @ApiOperation({ summary: 'Get all comments for an asset' })
  async getCommentsByAsset(@Param('assetId') assetId: string) {
    return this.commentsService.findByAsset(assetId);
  }

  @Put(':commentId')
  @ApiOperation({ summary: 'Update a comment' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateDto: UpdateFrameCommentDto,
  ) {
    return this.commentsService.update(commentId, updateDto.content || '');
  }

  @Post(':commentId/resolve')
  @ApiOperation({ summary: 'Resolve a comment' })
  async resolveComment(@Param('commentId') commentId: string, @Req() req: AuthenticatedRequest) {
    return this.commentsService.resolve(commentId, req.user.id);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Param('commentId') commentId: string) {
    return this.commentsService.remove(commentId);
  }
}
