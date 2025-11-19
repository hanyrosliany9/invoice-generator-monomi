import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { MediaProjectsService } from './services/media-projects.service';
import { MediaAssetsService } from './services/media-assets.service';
import { MetadataService } from './services/metadata.service';
import { MediaFramesService } from './services/media-frames.service';
import { MediaCommentsService } from './services/media-comments.service';
import { MediaProcessingService } from './services/media-processing.service';
import { CollectionsService } from './services/collections.service';
import { ComparisonService } from './services/comparison.service';
import { VersionControlService } from './services/version-control.service';
import { MediaCollaboratorsService } from './services/media-collaborators.service';
import { MediaFoldersService } from './services/folders.service';
import { MediaProjectsController } from './controllers/media-projects.controller';
import { MediaAssetsController } from './controllers/media-assets.controller';
import { MediaFramesController } from './controllers/media-frames.controller';
import { MediaCommentsController } from './controllers/media-comments.controller';
import { MediaCollaboratorsController } from './controllers/media-collaborators.controller';
import { CollectionsController } from './controllers/collections.controller';
import { MetadataController } from './controllers/metadata.controller';
import { ComparisonController } from './controllers/comparison.controller';
import { GuestController } from './controllers/guest.controller';
import { PublicController } from './controllers/public.controller';
import { MediaFoldersController } from './controllers/folders.controller';
import { MediaCollabGateway } from './gateways/media-collab.gateway';
import { GuestAuthGuard } from './guards/guest-auth.guard';
import { PublicViewGuard } from './guards/public-view.guard';

/**
 * MediaCollabModule - Frame.io-like Media Collaboration Platform
 *
 * Provides comprehensive media review and collaboration features for videos and photos.
 *
 * Features:
 * - Project-based media organization
 * - Video and photo upload with processing
 * - Hierarchical folder system (Google Drive/Frame.io-style)
 * - Star rating system (1-5 stars)
 * - Smart Collections (dynamic filtering)
 * - Frame annotations and comments
 * - Side-by-side photo comparison
 * - EXIF metadata extraction
 * - Version control
 * - Collaborator management with RBAC
 *
 * Services:
 * - MediaProjectsService: Project CRUD operations
 * - MediaAssetsService: Video/photo upload and management
 * - MediaFoldersService: Hierarchical folder/album management
 * - MetadataService: EXIF extraction and star ratings
 * - MediaFramesService: Frame annotations
 * - MediaCommentsService: Threaded comments
 * - MediaProcessingService: FFmpeg and Sharp processing
 * - CollectionsService: Smart folders
 * - ComparisonService: Side-by-side comparison logic
 *
 * Controllers:
 * - MediaProjectsController: /api/v1/media-collab/projects
 * - MediaAssetsController: /api/v1/media-collab/assets
 * - MediaFoldersController: /api/v1/media-collab/folders
 * - MediaFramesController: /api/v1/media-collab/frames
 * - MediaCommentsController: /api/v1/media-collab/comments
 * - MediaCollaboratorsController: /api/v1/media-collab/collaborators
 * - CollectionsController: /api/v1/media-collab/collections
 * - MetadataController: /api/v1/media-collab/metadata
 * - ComparisonController: /api/v1/media-collab/compare
 */
@Module({
  imports: [
    PrismaModule,
    MediaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [
    MediaProjectsController,
    MediaAssetsController,
    MediaFoldersController,
    MediaFramesController,
    MediaCommentsController,
    MediaCollaboratorsController,
    CollectionsController,
    MetadataController,
    ComparisonController,
    GuestController,
    PublicController,
  ],
  providers: [
    MediaProjectsService,
    MediaAssetsService,
    MediaFoldersService,
    MetadataService,
    MediaFramesService,
    MediaCommentsService,
    MediaCollaboratorsService,
    MediaProcessingService,
    CollectionsService,
    ComparisonService,
    VersionControlService,
    MediaCollabGateway,
    GuestAuthGuard,
    PublicViewGuard,
  ],
  exports: [
    MediaProjectsService,
    MediaAssetsService,
    MediaFoldersService,
    MetadataService,
    MediaFramesService,
    MediaCommentsService,
    MediaProcessingService,
    CollectionsService,
    ComparisonService,
  ],
})
export class MediaCollabModule {}
