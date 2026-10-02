import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { PortalAuthService, PortalSession } from "./portal-auth.service";
import { PortalRequestCodeDto, PortalVerifyCodeDto } from "./dto/portal.dto";
import { PORTAL_COOKIE_NAME, PORTAL_COOKIE_PATH } from "./portal.config";
import {
  CurrentPortalSession,
  PortalSessionGuard,
} from "./guards/portal-session.guard";

/** Cookie attributes for the portal session (must match on set and clear). */
export function portalCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PORTAL_COOKIE_PATH,
    // domain intentionally unset: host-only cookie for the portal hostname.
  };
}

/**
 * Client-portal authentication: email one-time code -> httpOnly session cookie.
 *
 * @Public(): these routes never use the staff JwtAuthGuard (and must stay
 * reachable should a global staff guard ever be introduced).
 */
@ApiTags("Client Portal - Auth")
@Public()
@Controller("portal")
export class PortalAuthController {
  constructor(private readonly portalAuth: PortalAuthService) {}

  @Post("auth/request-code")
  @HttpCode(HttpStatus.OK)
  // Per-IP throttle (the per-email limit is enforced in the service).
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Request a 6-digit login code by email (always returns { sent: true })",
  })
  async requestCode(@Body() dto: PortalRequestCodeDto, @Req() req: Request) {
    return this.portalAuth.requestCode(dto.email, req.ip);
  }

  @Post("auth/verify-code")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Verify a login code and start a portal session (cookie)" })
  async verifyCode(
    @Body() dto: PortalVerifyCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, maxAgeMs, view } = await this.portalAuth.verifyCode(
      dto.email,
      dto.code,
    );
    res.cookie(PORTAL_COOKIE_NAME, token, {
      ...portalCookieOptions(),
      maxAge: maxAgeMs,
    });
    return view;
  }

  @Post("auth/logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "End the portal session on this device (clears the cookie)" })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(PORTAL_COOKIE_NAME, portalCookieOptions());
    return { loggedOut: true };
  }

  @Get("me")
  @UseGuards(PortalSessionGuard)
  @ApiOperation({ summary: "Current portal session (401 when not logged in)" })
  me(@CurrentPortalSession() session: PortalSession) {
    return this.portalAuth.toView(session);
  }
}
