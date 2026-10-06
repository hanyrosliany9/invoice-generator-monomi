import { Logger, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisThrottlerStorageModule } from "../../common/throttler/redis-throttler.module";
import { PortalModule } from "../portal/portal.module";
import { SocialMediaReportsModule } from "../reports/social-media-reports.module";
import { InstagramGraphClient } from "./instagram-graph.client";
import { INSTAGRAM_CONFIG, InstagramApiService } from "./instagram-api.service";
import { InstagramTokenService } from "./instagram-token.service";
import { InstagramSyncService } from "./instagram-sync.service";
import { InstagramOAuthService } from "./instagram-oauth.service";
import { InstagramReportService } from "./instagram-report.service";
import { InstagramController } from "./instagram.controller";
import { PortalInstagramController } from "./portal-instagram.controller";
import { assertInstagramConfig, InstagramConfig, loadInstagramConfig } from "./instagram.config";

/**
 * Instagram API with Instagram Login: connect a client's Business/Creator
 * account, sync insights (daily 02:00 WIB + hourly stories), auto-fill
 * monthly social media reports, and Meta's deauthorize / data-deletion
 * callbacks. Optional: without META_APP_ID/META_APP_SECRET every endpoint
 * reports "not configured" and the jobs are no-ops.
 */
@Module({
  imports: [PrismaModule, PortalModule, SocialMediaReportsModule, RedisThrottlerStorageModule],
  controllers: [InstagramController, PortalInstagramController],
  providers: [
    {
      provide: INSTAGRAM_CONFIG,
      useFactory: (): InstagramConfig | null => {
        // Never aborts boot: an invalid configuration disables Instagram only
        // (assertInstagramConfig logs why).
        if (assertInstagramConfig()) return null;
        try {
          return loadInstagramConfig();
        } catch (error) {
          new Logger("InstagramModule").warn(`Instagram disabled: ${(error as Error).message}`);
          return null;
        }
      },
    },
    InstagramGraphClient,
    InstagramApiService,
    InstagramTokenService,
    InstagramSyncService,
    InstagramOAuthService,
    InstagramReportService,
  ],
  exports: [InstagramOAuthService],
})
export class InstagramModule {}
