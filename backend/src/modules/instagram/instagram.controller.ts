import {
  applyDecorators,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { UserThrottle, UserThrottleGuard } from "../../common/throttler/user-throttle.guard";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { CallbackReason, InstagramOAuthService } from "./instagram-oauth.service";
import { InstagramSyncService } from "./instagram-sync.service";
import { InstagramReportService } from "./instagram-report.service";
import { AddInstagramSectionsDto, ConnectInstagramDto, DisconnectInstagramDto } from "./dto/instagram.dto";
import { clearBindCookie, readBindCookies, setBindCookie } from "./utils/bind-cookie";

export const MANUAL_SYNC_MIN_INTERVAL_MS = 2 * 60 * 1000;

/**
 * ADMIN/SUPER_ADMIN route with a per-user rate limit that is only counted
 * AFTER authentication + role checks (guard order matters: one @UseGuards
 * call, auth first). Unauthenticated or VIDEOGRAPHER requests are rejected
 * before they can consume an admin's quota.
 */
function AdminWithUserThrottle(limit: number, ttl: number) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, UserThrottleGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    UserThrottle({ limit, ttl }),
  );
}

const PAGE_TEXT: Record<string, { id: string; en: string }> = {
  state: {
    id: "Tautan untuk menghubungkan Instagram tidak valid atau sudah dipakai. Silakan mulai lagi dari Monomi.",
    en: "This Instagram connection link is invalid or was already used. Please start again from Monomi.",
  },
  not_configured: {
    id: "Integrasi Instagram belum diaktifkan di server Monomi.",
    en: "The Instagram integration is not enabled on this Monomi server.",
  },
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function resultPage(reason: CallbackReason): string {
  const t = PAGE_TEXT[reason] ?? PAGE_TEXT.state;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monomi — Instagram</title><style>body{font-family:system-ui,sans-serif;background:#0f0f10;color:#eee;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px}main{max-width:480px}p{line-height:1.5}small{color:#aaa}</style></head><body><main><h1>Instagram</h1><p>${escapeHtml(t.id)}</p><p><small>${escapeHtml(t.en)}</small></p></main></body></html>`;
}

/**
 * Staff Instagram API + the unauthenticated endpoints Meta calls (OAuth
 * redirect, deauthorize, data deletion). Staff routes require
 * ADMIN/SUPER_ADMIN; the internal Monomi client is allowed like any other.
 */
@ApiTags("Instagram")
@Controller("instagram")
export class InstagramController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: InstagramOAuthService,
    private readonly sync: InstagramSyncService,
    private readonly reports: InstagramReportService,
  ) {}

  // ─── Staff ────────────────────────────────────────────────────────────────

  @Get("clients/:clientId")
  @RequireAdmin()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Instagram connection status for a client (never includes tokens)" })
  async status(@Param("clientId") clientId: string) {
    await this.assertClient(clientId);
    return this.oauth.status(clientId);
  }

  @Post("connect/:clientId")
  @AdminWithUserThrottle(10, 60000)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start the Instagram Login flow; returns the authorize URL" })
  async connect(
    @Param("clientId") clientId: string,
    @Body() dto: ConnectInstagramDto,
    @Req() req: Request & { user?: { id: string; email: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;
    if (!user) throw new NotFoundException();
    const { authorizeUrl, bindValue, expiresAt } = await this.oauth.startConnect(
      clientId,
      { type: "staff", id: user.id, email: user.email },
      { syncProfile: dto.syncProfile },
    );
    setBindCookie(res, "staff", bindValue);
    return { authorizeUrl, expiresAt };
  }

  @Post("clients/:clientId/sync")
  @AdminWithUserThrottle(3, 10 * 60000)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Sync now (runs in the background)" })
  async syncNow(@Param("clientId") clientId: string) {
    const conn = await this.prisma.instagramConnection.findUnique({
      where: { clientId },
      select: { id: true, status: true, lastSyncAt: true, accessTokenEnc: true },
    });
    if (!conn) throw new NotFoundException("Instagram belum terhubung untuk klien ini");
    // ERROR with a stored token = undecryptable token kept for recovery
    // (e.g. after restoring TOKEN_ENCRYPTION_KEY): a manual retry is allowed.
    const retryable = conn.status === "ERROR" && conn.accessTokenEnc !== null;
    if (conn.status !== "ACTIVE" && !retryable) {
      throw new ConflictException("Koneksi Instagram tidak aktif. Hubungkan ulang terlebih dahulu.");
    }
    if (this.sync.isRunning(conn.id)) throw new ConflictException("Sinkronisasi sedang berjalan.");
    if (conn.lastSyncAt && Date.now() - conn.lastSyncAt.getTime() < MANUAL_SYNC_MIN_INTERVAL_MS) {
      throw new HttpException("Baru saja disinkronkan. Coba lagi dalam beberapa menit.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return { started: this.sync.syncInBackground(conn.id, "manual") };
  }

  @Post("clients/:clientId/disconnect")
  @RequireAdmin()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect (delete token); purge=true also deletes synced data" })
  async disconnect(@Param("clientId") clientId: string, @Body() dto: DisconnectInstagramDto) {
    return this.oauth.disconnect(clientId, dto.purge === true);
  }

  @Get("reports/:reportId/preview")
  @RequireAdmin()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Preview report sections generated from synced Instagram data" })
  previewReport(@Param("reportId") reportId: string, @Query("includePartial") includePartial?: string) {
    return this.reports.preview(reportId, { includePartial: includePartial === "true" });
  }

  @Post("reports/:reportId/sections")
  @AdminWithUserThrottle(10, 60000)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add Instagram-generated sections to a report (replace=true updates existing Instagram sections)",
  })
  addReportSections(@Param("reportId") reportId: string, @Body() dto: AddInstagramSectionsDto) {
    return this.reports.addSections(reportId, dto.sections, {
      replace: dto.replace === true,
      includePartial: dto.includePartial === true,
    });
  }

  // ─── Called by Instagram / Meta (no login) ───────────────────────────────

  @Get("oauth/callback")
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Instagram OAuth redirect target" })
  async callback(
    @Query() query: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const outcome = await this.oauth.handleCallback(
      { code: query.code, state: query.state, error: query.error, error_reason: query.error_reason },
      readBindCookies(req),
    );
    // Only this flow's cookie: a parallel flow of the other kind keeps working.
    if (outcome.flow) clearBindCookie(res, outcome.flow);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (outcome.kind === "redirect") {
      res.redirect(302, outcome.url);
      return;
    }
    res.status(outcome.status).type("html").send(resultPage(outcome.reason));
  }

  @Post("deauthorize")
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: "Meta deauthorize callback (signed_request)" })
  async deauthorize(@Body("signed_request") signedRequest: unknown, @Res() res: Response) {
    res.json(await this.oauth.deauthorize(signedRequest));
  }

  @Post("data-deletion")
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Meta data deletion request callback (signed_request)" })
  async dataDeletion(@Body("signed_request") signedRequest: unknown, @Res() res: Response) {
    // Meta expects exactly { url, confirmation_code } (no response envelope).
    res.json(await this.oauth.dataDeletion(signedRequest));
  }

  @Get("data-deletion/status/:code")
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Status of a data deletion request (by confirmation code)" })
  deletionStatus(@Param("code") code: string) {
    return this.oauth.deletionStatus(code);
  }

  private async assertClient(clientId: string) {
    const exists = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Klien tidak ditemukan");
  }
}
