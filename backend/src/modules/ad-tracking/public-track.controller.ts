import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createHash } from "crypto";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { AdClickService } from "./ad-click.service";
import { headerString } from "./public-track.http";
import { MONOMI_TRACK_JS } from "./monomi-track.snippet";
import { parseTrackEvent } from "./track-event.payload";
import { publicTrackTracker } from "./track-limits";
import { isBotUserAgent } from "./track-utils";
import { USER_AGENT_MAX } from "./web-capi.payload";
import { WebCapiService } from "./web-capi.service";

const SCRIPT_ETAG = `"${createHash("sha256").update(MONOMI_TRACK_JS).digest("hex").slice(0, 24)}"`;

/** "::ffff:1.2.3.4" -> "1.2.3.4"; junk -> null. */
function cleanIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const v = ip.replace(/^::ffff:/i, "").slice(0, 64);
  return /^[0-9a-fA-F:.]+$/.test(v) ? v : null;
}

/**
 * Unauthenticated endpoints used by the landing page snippet.
 * CORS (origin allowlist), the 4 KB body cap and the raw-text body parser are
 * middleware registered in main.ts (public-track.http.ts); this controller
 * validates everything again and never echoes input in an error.
 */
@ApiExcludeController()
@Controller("public/track")
export class PublicTrackController {
  private readonly logger = new Logger(PublicTrackController.name);

  constructor(
    private readonly clicks: AdClickService,
    private readonly sender: WebCapiService,
  ) {}

  @Public()
  @Get("monomi-track.js")
  script(@Req() req: Request, @Res() res: Response) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Short cache so a fixed snippet reaches landing pages within minutes.
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.setHeader("ETag", SCRIPT_ETAG);
    if (req.headers["if-none-match"] === SCRIPT_ETAG) {
      res.status(304).end();
      return;
    }
    res.status(200).send(MONOMI_TRACK_JS);
  }

  /**
   * One landing-page event (PageView, ViewContent, EngagedVisit, Lead).
   * Obvious bots are acknowledged and dropped: nothing stored, nothing sent
   * to Meta. The limit is per network (IPv4 address, IPv6 /64) and generous
   * because one visit sends several events and mobile carriers put many
   * visitors behind one address; a global cap on new rows sits behind it.
   * Every accepted body answers the same 200 {ok:true}, whether it was stored,
   * a duplicate, dropped by the cap, or clashed with another tap's code (so
   * codes cannot be probed).
   */
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000, getTracker: publicTrackTracker } })
  @Post("event")
  @HttpCode(200)
  async event(@Req() req: Request) {
    const parsed = parseTrackEvent(req.body);
    if (!parsed) throw new BadRequestException("Invalid request");
    const userAgent = headerString(req.headers["user-agent"], USER_AGENT_MAX);
    if (isBotUserAgent(userAgent)) return { ok: true };
    const result = await this.clicks.recordEvent(parsed, {
      // req.ip honours the app's trust-proxy setting (Cloudflare -> nginx -> app).
      ip: cleanIp(req.ip),
      userAgent,
    });
    if (result.outcome === "conflict") {
      // never log the submitted code / ids
      this.logger.warn("Landing-page Lead ignored: its code or event id belongs to another tap");
    }
    if (result.visitEvent) this.sender.enqueueVisitEvent(result.visitEvent);
    return { ok: true };
  }
}
