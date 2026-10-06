import { Logger, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaModule } from "../media/media.module";
import { MetaGraphClient } from "./meta-graph.client";
import { MetaAccountsService } from "./meta-accounts.service";
import { MediaUrlSigner } from "./media-url.signer";
import { InstagramPublisher } from "./instagram.publisher";
import { FacebookPublisher } from "./facebook.publisher";
import { SocialPublishingService } from "./social-publishing.service";
import { SocialPublishingScheduler } from "./social-publishing.scheduler";
import { SocialPublishingController } from "./social-publishing.controller";
import { AutoPublishPolicy } from "./auto-publish.policy";
import {
  loadSocialPublishingConfig,
  SOCIAL_PUBLISHING_CONFIG,
  SocialPublishingConfigState,
} from "./social-publishing.config";

/**
 * Auto-publishing of the internal client's content-calendar posts to
 * Instagram and the Facebook Page via a Meta system user token. Optional:
 * without META_SYSTEM_USER_TOKEN / META_PAGE_ID / META_IG_USER_ID the app
 * boots, the scheduler is a no-op and the UI says "not configured".
 */
@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [SocialPublishingController],
  providers: [
    {
      provide: SOCIAL_PUBLISHING_CONFIG,
      useFactory: (): SocialPublishingConfigState => {
        const state = loadSocialPublishingConfig();
        const logger = new Logger("SocialPublishingModule");
        if (state.status === "not_configured")
          logger.log("Auto-publishing to Meta not configured");
        else if (state.status === "invalid")
          logger.warn(`Auto-publishing disabled: ${state.reason}`);
        else
          logger.log(
            `Auto-publishing to Meta configured (page ${state.config.pageId}, ${state.config.graphVersion})`,
          );
        return state;
      },
    },
    MetaGraphClient,
    MetaAccountsService,
    MediaUrlSigner,
    InstagramPublisher,
    FacebookPublisher,
    SocialPublishingService,
    SocialPublishingScheduler,
    AutoPublishPolicy,
  ],
  exports: [AutoPublishPolicy, SocialPublishingService],
})
export class SocialPublishingModule {}
