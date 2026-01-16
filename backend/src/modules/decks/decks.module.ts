import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaModule } from "../media/media.module";

// Services
import { DecksService } from "./services/decks.service";
import { DeckSlidesService } from "./services/deck-slides.service";
import { DeckElementsService } from "./services/deck-elements.service";
import { DeckCommentsService } from "./services/deck-comments.service";
import { DeckCollaboratorsService } from "./services/deck-collaborators.service";
import { DeckExportService } from "./services/deck-export.service";

// Controllers
import { DecksController } from "./controllers/decks.controller";
import { DeckSlidesController } from "./controllers/deck-slides.controller";
import { DeckElementsController } from "./controllers/deck-elements.controller";
import { DeckCommentsController } from "./controllers/deck-comments.controller";
import { DeckCollaboratorsController } from "./controllers/deck-collaborators.controller";
import { DeckPublicController } from "./controllers/deck-public.controller";
import { DeckExportController } from "./controllers/deck-export.controller";

// Gateway
import { DeckCollaborationGateway } from "./deck-collaboration.gateway";

/**
 * DecksModule - Presentation Deck Builder
 *
 * Google Slides-like presentation system optimized for video production.
 *
 * Features:
 * - Slide-based presentations with templates
 * - Drag-drop element positioning
 * - Integration with MediaProject assets
 * - RBAC collaboration (OWNER/EDITOR/COMMENTER/VIEWER)
 * - Public sharing with access tokens
 * - Guest invites with expiration
 * - Slide-level comments with threading
 *
 * Templates:
 * - TITLE: Large title + subtitle
 * - TITLE_CONTENT: Title with content area
 * - TWO_COLUMN: Two equal columns
 * - FULL_MEDIA: Full-bleed image/video
 * - MOOD_BOARD: Grid of images
 * - CHARACTER: Character profile
 * - SHOT_LIST: Tabular shot breakdown
 * - SCHEDULE: Timeline/stripboard
 * - COMPARISON: Side-by-side
 * - BLANK: Empty canvas
 */
@Module({
  imports: [
    PrismaModule,
    MediaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "24h" },
      }),
    }),
  ],
  controllers: [
    DecksController,
    DeckSlidesController,
    DeckElementsController,
    DeckCommentsController,
    DeckCollaboratorsController,
    DeckPublicController,
    DeckExportController,
  ],
  providers: [
    DecksService,
    DeckSlidesService,
    DeckElementsService,
    DeckCommentsService,
    DeckCollaboratorsService,
    DeckExportService,
    DeckCollaborationGateway,
  ],
  exports: [
    DecksService,
    DeckSlidesService,
    DeckElementsService,
    DeckCommentsService,
    DeckCollaboratorsService,
    DeckExportService,
  ],
})
export class DecksModule {}
