import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { RedisThrottlerStorageModule } from "../../common/throttler/redis-throttler.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { AdClickService } from "./ad-click.service";
import { AutoLeadService } from "./auto-lead.service";
import { AdTrackingAdminController } from "./ad-tracking-admin.controller";
import { reportAdTrackingConfig } from "./ad-tracking.config";
import { PublicTrackController } from "./public-track.controller";
import { RedisTrackCounters, TrackCounters } from "./track-limits";
import { WebCapiService } from "./web-capi.service";
import { TikTokEventsService } from "./tiktok-events.service";
import { TikTokAdminController } from "./tiktok-admin.controller";
import { reportTikTokEventsConfig } from "./tiktok-events.config";

/**
 * Landing-page tracking: the public click endpoint + drop-in snippet, ad click
 * storage / linking, and the website Conversions API sender (action_source
 * "website", Pixel dataset). Optional and gated: a missing or invalid
 * META_WEB_CAPI_* configuration never blocks boot — clicks are still stored
 * and linked, and events wait as PENDING_CONFIG.
 */
@Module({
  imports: [PrismaModule, RedisThrottlerStorageModule],
  controllers: [PublicTrackController, AdTrackingAdminController, TikTokAdminController],
  providers: [
    AdClickService,
    AutoLeadService,
    WebCapiService,
    TikTokEventsService,
    WhatsAppGraphClient,
    // abuse counters (global new-row cap, Lead gating, auto-lead cap) on the app's Redis
    { provide: TrackCounters, useClass: RedisTrackCounters },
  ],
  exports: [AdClickService, AutoLeadService, TikTokEventsService],
})
export class AdTrackingModule implements OnModuleInit {
  onModuleInit(): void {
    const cfg = reportAdTrackingConfig();
    reportTikTokEventsConfig();
    new Logger(AdTrackingModule.name).log(
      `Ad tracking module loaded (website CAPI ${cfg?.state ?? "UNKNOWN"})`,
    );
  }
}
