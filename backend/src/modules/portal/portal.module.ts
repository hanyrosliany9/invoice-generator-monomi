import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MediaModule } from "../media/media.module";
import { ContentCalendarModule } from "../content-calendar/content-calendar.module";
import { MediaCollabModule } from "../media-collab/media-collab.module";
import { DecksModule } from "../decks/decks.module";
import { SocialMediaReportsModule } from "../reports/social-media-reports.module";
import { PortalAuthService } from "./portal-auth.service";
import { PortalScopeService } from "./portal-scope.service";
import { PortalReportsService } from "./portal-reports.service";
import { PortalContactsService } from "./portal-contacts.service";
import { PortalAuthController } from "./portal-auth.controller";
import { PortalDataController } from "./portal-data.controller";
import { PortalContactsController } from "./portal-contacts.controller";
import { PortalSessionGuard } from "./guards/portal-session.guard";
import { assertPortalConfig } from "./portal.config";

/**
 * Client portal: external client contacts log in with an emailed one-time code
 * and see read-only views of their own client's content planner, social media
 * reports, media projects and decks (plus comment/rate/download).
 *
 * The JwtModule here has NO default secret: PortalAuthService always passes
 * PORTAL_JWT_SECRET explicitly, so it can never fall back to JWT_SECRET.
 */
@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    MediaModule,
    ContentCalendarModule,
    MediaCollabModule,
    DecksModule,
    SocialMediaReportsModule,
    JwtModule.register({}),
  ],
  controllers: [PortalAuthController, PortalDataController, PortalContactsController],
  providers: [
    PortalAuthService,
    PortalScopeService,
    PortalReportsService,
    PortalContactsService,
    PortalSessionGuard,
  ],
  // Used by other modules' portal routes (e.g. Instagram connect).
  exports: [PortalAuthService, PortalScopeService, PortalSessionGuard],
})
export class PortalModule {
  constructor() {
    // Fail fast at boot (production) when PORTAL_JWT_SECRET is missing, weak
    // or equal to JWT_SECRET. Runs during DI init, after ConfigModule has
    // loaded .env, so NestFactory.create() rejects and bootstrap exits(1).
    assertPortalConfig();
  }
}
