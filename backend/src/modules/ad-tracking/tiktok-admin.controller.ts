import { Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { TikTokEventsService } from "./tiktok-events.service";

/** CRM settings "TikTok" card (Events API half): status, counts, "send now". Admin only. */
@ApiTags("crm")
@ApiBearerAuth()
@RequireAdmin()
@Controller("crm/tracking/tiktok")
export class TikTokAdminController {
  constructor(private readonly events: TikTokEventsService) {}

  @Get("summary")
  async summary() {
    const cfg = this.events.config();
    const stats = await this.events.stats();
    return {
      state: cfg.state,
      problems: cfg.problems,
      pixelConfigured: !!cfg.pixelId,
      pixelId: cfg.pixelId,
      tokenConfigured: !!cfg.token,
      testMode: !!cfg.testEventCode,
      maxAgeDays: cfg.maxAgeDays,
      envVars: [
        "TIKTOK_PIXEL_ID",
        "TIKTOK_EVENTS_ACCESS_TOKEN",
        "TIKTOK_EVENTS_ENABLED",
        "TIKTOK_TEST_EVENT_CODE",
        "TIKTOK_EVENTS_MAX_AGE_DAYS",
      ],
      ...stats,
    };
  }

  @Post("send-now")
  @HttpCode(200)
  async sendNow() {
    const [outbox, visits] = await Promise.all([this.events.run(), this.events.flushVisitEvents()]);
    return { ...outbox, visitSent: visits.sent };
  }
}
