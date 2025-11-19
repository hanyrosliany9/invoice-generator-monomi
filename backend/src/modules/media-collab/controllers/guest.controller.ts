import {
  Controller,
  UseGuards,
  Get,
  Post,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import { MediaCollaboratorsService } from '../services/media-collaborators.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestCollaborator } from '../decorators/guest-collaborator.decorator';

/**
 * Guest API Controller
 * Handles guest-only endpoints (no JWT auth required, token-based access)
 */
@ApiTags('Guest Collaboration')
@Controller('media-collab/guest')
export class GuestController {
  constructor(
    private readonly collaboratorsService: MediaCollaboratorsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Accept guest invite (no auth required)
   */
  @Post('accept')
  @ApiOperation({ summary: 'Accept guest invite and get project access' })
  @ApiQuery({ name: 'token', description: 'Guest invite token' })
  @ApiResponse({ status: 200, description: 'Invite accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invite expired' })
  @ApiResponse({ status: 403, description: 'Invite revoked' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  async acceptInvite(@Query('token') token: string) {
    const collaborator = await this.collaboratorsService.acceptGuestInvite(token);
    return {
      data: collaborator,
      message: 'Invite accepted successfully',
    };
  }

  /**
   * Get project assets (guest token required)
   */
  @Get('projects/:projectId/assets')
  @UseGuards(GuestAuthGuard)
  @ApiOperation({ summary: 'Get media assets for guest' })
  @ApiQuery({ name: 'token', description: 'Guest access token', required: false })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 403, description: 'Access denied to this project' })
  async getAssets(
    @Param('projectId') projectId: string,
    @GuestCollaborator() collaborator: any,
  ) {
    // Verify guest has access to this project
    if (collaborator.projectId !== projectId) {
      throw new ForbiddenException('Access denied to this project');
    }

    // Directly query assets (access already verified by GuestAuthGuard)
    const assets = await this.prisma.mediaAsset.findMany({
      where: { projectId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        metadata: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return {
      data: assets,
      message: 'Assets retrieved successfully',
    };
  }

  /**
   * Get project details (guest token required)
   */
  @Get('projects/:projectId')
  @UseGuards(GuestAuthGuard)
  @ApiOperation({ summary: 'Get project details for guest' })
  @ApiQuery({ name: 'token', description: 'Guest access token', required: false })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 403, description: 'Access denied to this project' })
  async getProject(
    @Param('projectId') projectId: string,
    @GuestCollaborator() collaborator: any,
  ) {
    // Verify guest has access to this project
    if (collaborator.projectId !== projectId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return {
      data: {
        project: collaborator.project,
        role: collaborator.role,
        guestName: collaborator.guestName,
      },
      message: 'Project retrieved successfully',
    };
  }
}
