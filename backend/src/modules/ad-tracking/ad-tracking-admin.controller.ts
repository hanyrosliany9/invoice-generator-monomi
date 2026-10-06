import { Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { AdClickService } from "./ad-click.service";
import { resolveAdTrackingConfig } from "./ad-tracking.config";
import { WebCapiService } from "./web-capi.service";

/** CRM settings card: landing-page tracking status, counts, "send now". Admin only. */
@ApiTags("crm")
@ApiBearerAuth()
@RequireAdmin()
@Controller("crm/tracking")
export class AdTrackingAdminController {
  constructor(
    private readonly clicks: AdClickService,
    private readonly sender: WebCapiService,
  ) {}

  @Get("summary")
  async summary() {
    const cfg = resolveAdTrackingConfig();
    const stats = await this.clicks.stats();
    return {
      state: cfg.state,
      problems: cfg.problems,
      pixelConfigured: !!cfg.pixelId,
      pixelId: cfg.pixelId,
      tokenConfigured: !!cfg.token,
      testMode: !!cfg.testEventCode,
      landingPageUrl: cfg.landingPageUrl,
      allowedOrigins: cfg.allowedOrigins,
      scriptPath: "/api/v1/public/track/monomi-track.js",
      envVars: [
        "META_PIXEL_ID",
        "META_WEB_CAPI_TOKEN",
        "META_WEB_CAPI_ENABLED",
        "META_WEB_CAPI_TEST_EVENT_CODE",
        "PUBLIC_TRACK_ALLOWED_ORIGINS",
        "LANDING_PAGE_URL",
      ],
      ...stats,
    };
  }

  @Post("send-now")
  @HttpCode(200)
  async sendNow() {
    return this.sender.run();
  }
}
