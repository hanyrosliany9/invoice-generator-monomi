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
import { assertWhatsAppConfig } from "./whatsapp.config";

/**
 * CRM phase B: WhatsApp Business Platform (Cloud API) inbox with coexistence
 * mirroring, automatic lead capture with Click-to-WhatsApp attribution, and
 * the Conversions API for Business Messaging sender (MetaEventOutbox).
 *
 * Optional: without WHATSAPP_* env vars every endpoint reports "not
 * configured", the webhook answers 404 and the CAPI sender is a no-op.
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
    // Production: a switched-on but invalid configuration aborts boot.
    assertWhatsAppConfig();
    new Logger(WhatsAppModule.name).log("WhatsApp module ready");
  }
}
