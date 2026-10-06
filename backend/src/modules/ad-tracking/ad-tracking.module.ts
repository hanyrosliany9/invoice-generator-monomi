import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { AdClickService } from "./ad-click.service";
import { AdTrackingAdminController } from "./ad-tracking-admin.controller";
import { reportAdTrackingConfig } from "./ad-tracking.config";
import { PublicTrackController } from "./public-track.controller";
import { WebCapiService } from "./web-capi.service";

/**
 * Landing-page tracking: the public click endpoint + drop-in snippet, ad click
 * storage / linking, and the website Conversions API sender (action_source
 * "website", Pixel dataset). Optional and gated: a missing or invalid
 * META_WEB_CAPI_* configuration never blocks boot — clicks are still stored
 * and linked, and events wait as PENDING_CONFIG.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PublicTrackController, AdTrackingAdminController],
  providers: [AdClickService, WebCapiService, WhatsAppGraphClient],
  exports: [AdClickService],
})
export class AdTrackingModule implements OnModuleInit {
  onModuleInit(): void {
    const cfg = reportAdTrackingConfig();
    new Logger(AdTrackingModule.name).log(
      `Ad tracking module loaded (website CAPI ${cfg?.state ?? "UNKNOWN"})`,
    );
  }
}
