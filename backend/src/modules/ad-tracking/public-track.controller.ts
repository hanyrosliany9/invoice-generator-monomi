import {
  BadRequestException,
  Controller,
  ConflictException,
  Get,
  HttpCode,
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
import { parseWaClickPayload } from "./wa-click.payload";

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
  constructor(private readonly clicks: AdClickService) {}

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

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("wa-click")
  @HttpCode(200)
  async waClick(@Req() req: Request) {
    const parsed = parseWaClickPayload(req.body);
    if (!parsed) throw new BadRequestException("Invalid request");
    const outcome = await this.clicks.record(parsed, {
      // req.ip honours the app's trust-proxy setting (Cloudflare -> nginx -> app).
      ip: cleanIp(req.ip),
      userAgent: headerString(req.headers["user-agent"], 400),
    });
    if (outcome === "conflict") throw new ConflictException("Conflict");
    return { ok: true };
  }
}
