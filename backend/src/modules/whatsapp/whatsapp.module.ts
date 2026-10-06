import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisThrottlerStorageModule } from "../../common/throttler/redis-throttler.module";
import { CrmModule } from "../crm/crm.module";
import { WhatsAppGraphClient } from "./whatsapp-graph.client";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { WhatsAppIngestService } from "./whatsapp-ingest.service";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";
import { WhatsAppInboxService } from "./whatsapp-inbox.service";
import { WhatsAppStatusService } from "./whatsapp-status.service";
import { MetaCapiService } from "./meta-capi.service";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { reportWhatsAppConfig } from "./whatsapp.config";

/**
 * CRM phase B: WhatsApp Business Platform (Cloud API) inbox with coexistence
 * mirroring, automatic lead capture with Click-to-WhatsApp attribution, and
 * the Conversions API for Business Messaging sender (MetaEventOutbox).
 *
 * Optional and feature-gated: the configuration is classified OFF /
 * INCOMPLETE / INVALID / READY (whatsapp.config.ts). Anything but READY never
 * blocks boot — it is logged, shown in the settings card, the webhook answers
 * 404 (OFF) or 503, Graph calls report "not configured" and the CAPI sender
 * is a no-op.
 * Hard rule: the Graph client refuses phone number registration / code
 * verification / deregistration / two-step PIN / migration endpoints.
 */
@Module({
  imports: [PrismaModule, CrmModule, RedisThrottlerStorageModule],
  controllers: [WhatsAppWebhookController, WhatsAppController],
  providers: [
    WhatsAppGraphClient,
    WhatsAppApiService,
    WhatsAppIngestService,
    WhatsAppWebhookService,
    WhatsAppInboxService,
    WhatsAppStatusService,
    MetaCapiService,
  ],
})
export class WhatsAppModule implements OnModuleInit {
  onModuleInit(): void {
    // Never throws: a partial/invalid WhatsApp config only disables WhatsApp.
    const cfg = reportWhatsAppConfig();
    new Logger(WhatsAppModule.name).log(
      `WhatsApp module loaded (configuration ${cfg?.state ?? "UNKNOWN"})`,
    );
  }
}
