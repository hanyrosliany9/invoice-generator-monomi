import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { UserThrottle, UserThrottleGuard } from "../../common/throttler/user-throttle.guard";
import { PortalSession } from "../portal/portal-auth.service";
import { PortalScopeService } from "../portal/portal-scope.service";
import { CurrentPortalSession, PortalSessionGuard } from "../portal/guards/portal-session.guard";
import { InstagramOAuthService } from "./instagram-oauth.service";
import { DisconnectInstagramDto } from "./dto/instagram.dto";
import { setBindCookie } from "./utils/bind-cookie";

/**
 * Client-portal side: a portal contact connects / disconnects THEIR client's
 * Instagram account. Every route requires the portal session cookie and that
 * :clientId is one of the session's clients (404 otherwise, like every other
 * portal route), so contact A of client A can never touch client B.
 */
@ApiTags("Client Portal - Instagram")
@Public()
@UseGuards(PortalSessionGuard)
@Controller("portal/clients/:clientId/instagram")
export class PortalInstagramController {
  constructor(
    private readonly scope: PortalScopeService,
    private readonly oauth: InstagramOAuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Instagram connection status (limited fields)" })
  async status(@CurrentPortalSession() session: PortalSession, @Param("clientId") clientId: string) {
    this.scope.contactForClient(session, clientId);
    const s = await this.oauth.status(clientId);
    const c = s.connection;
    return {
      configured: s.configured,
      connected: s.connected,
      insightsGranted: s.insightsGranted,
      connection: c
        ? {
            username: c.username,
            profilePictureUrl: c.profilePictureUrl,
            followersCount: c.followersCount,
            status: c.status,
            lastSyncAt: c.lastSyncAt,
            tokenExpiresAt: c.tokenExpiresAt,
          }
        : null,
    };
  }

  @Post("connect")
  @HttpCode(HttpStatus.OK)
  // Method-level guard: runs after the class-level PortalSessionGuard, so
  // only authenticated portal sessions are counted (keyed by session email).
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 10, ttl: 60000 })
  @ApiOperation({ summary: "Start the Instagram Login flow for this client" })
  async connect(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const contact = this.scope.contactForClient(session, clientId);
    const { authorizeUrl, bindValue, expiresAt } = await this.oauth.startConnect(clientId, {
      type: "portal",
      id: contact.id,
      email: contact.email,
    });
    setBindCookie(res, "portal", bindValue);
    return { authorizeUrl, expiresAt };
  }

  @Post("disconnect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 10, ttl: 60000 })
  @ApiOperation({ summary: "Disconnect Instagram; purge=true also deletes synced data" })
  async disconnect(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Body() dto: DisconnectInstagramDto,
  ) {
    this.scope.contactForClient(session, clientId);
    return this.oauth.disconnect(clientId, dto.purge === true);
  }
}
