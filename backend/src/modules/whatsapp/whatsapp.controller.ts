import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
  UserThrottle,
  UserThrottleGuard,
} from "../../common/throttler/user-throttle.guard";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { MetaCapiService } from "./meta-capi.service";
import { WhatsAppInboxService } from "./whatsapp-inbox.service";
import { WhatsAppStatusService } from "./whatsapp-status.service";
import {
  AssignConversationDto,
  ConversationStatusDto,
  EmbeddedSignupCompleteDto,
  LinkConversationLeadDto,
  ListConversationsQueryDto,
  MessagesQueryDto,
  QuickRepliesDto,
  SendTemplateDto,
  SendTextDto,
} from "./dto/whatsapp.dto";

/** Polling endpoints (inbox list / open conversation / badge) get a higher per-IP budget. */
const POLL = { default: { limit: 400, ttl: 60000 } };

/**
 * Staff WhatsApp inbox + settings. ADMIN / SUPER_ADMIN only, like the CRM
 * (conversations carry customer contact details). Responses never contain
 * access tokens; media is proxied through the server.
 */
@ApiTags("whatsapp")
@ApiBearerAuth()
@RequireAdmin()
@Controller("whatsapp")
export class WhatsAppController {
  constructor(
    private readonly inbox: WhatsAppInboxService,
    private readonly status: WhatsAppStatusService,
    private readonly capi: MetaCapiService,
  ) {}

  private uid(req: any): string {
    return req?.user?.id;
  }

  // ---- inbox ------------------------------------------------------------

  @Get("conversations")
  @Throttle(POLL)
  @ApiOperation({
    summary:
      "List conversations (filters: unread, mine, unassigned, window, q)",
  })
  list(@Query() q: ListConversationsQueryDto, @Req() req: any) {
    return this.inbox.list(q, this.uid(req));
  }

  @Get("badge")
  @Throttle(POLL)
  badge() {
    return this.inbox.badge();
  }

  @Get("conversations/:id")
  @Throttle(POLL)
  get(@Param("id") id: string) {
    return this.inbox.get(id);
  }

  @Get("conversations/:id/messages")
  @Throttle(POLL)
  messages(@Param("id") id: string, @Query() q: MessagesQueryDto) {
    return this.inbox.messages(id, q.before, q.limit);
  }

  @Post("conversations/:id/messages")
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 30, ttl: 60000 })
  @ApiOperation({
    summary: "Send a text (only inside the 24h customer service window)",
  })
  sendText(@Param("id") id: string, @Body() dto: SendTextDto, @Req() req: any) {
    return this.inbox.sendText(
      id,
      dto.text,
      dto.replyToMessageId,
      this.uid(req),
    );
  }

  @Post("conversations/:id/template")
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 20, ttl: 60000 })
  @ApiOperation({
    summary: "Send an approved template (allowed outside the 24h window)",
  })
  sendTemplate(
    @Param("id") id: string,
    @Body() dto: SendTemplateDto,
    @Req() req: any,
  ) {
    return this.inbox.sendTemplate(
      id,
      dto.name,
      dto.language,
      dto.params ?? [],
      this.uid(req),
    );
  }

  @Post("conversations/:id/read")
  @HttpCode(200)
  markRead(@Param("id") id: string) {
    return this.inbox.markRead(id);
  }

  @Post("conversations/:id/assign")
  @HttpCode(200)
  assign(@Param("id") id: string, @Body() dto: AssignConversationDto) {
    return this.inbox.assign(id, dto.assignedToId ?? null);
  }

  @Post("conversations/:id/status")
  @HttpCode(200)
  setStatus(@Param("id") id: string, @Body() dto: ConversationStatusDto) {
    return this.inbox.setStatus(id, dto.status);
  }

  @Post("conversations/:id/lead")
  @HttpCode(200)
  linkLead(@Param("id") id: string, @Body() dto: LinkConversationLeadDto) {
    return this.inbox.linkLead(id, dto.leadId ?? null);
  }

  @Get("leads/:leadId/conversation")
  @Throttle(POLL)
  conversationForLead(@Param("leadId") leadId: string) {
    return this.inbox.conversationForLead(leadId);
  }

  @Get("templates")
  templates(@Query("refresh") refresh?: string) {
    return this.inbox.templates(refresh === "1" || refresh === "true");
  }

  @Get("media/:messageId")
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 120, ttl: 60000 })
  @ApiOperation({
    summary:
      "Staff-only media proxy (downloads from Meta with the server token)",
  })
  async media(@Param("messageId") messageId: string, @Res() res: Response) {
    const m = await this.inbox.media(messageId);
    const safeName = (m.filename ?? "whatsapp-media")
      .replace(/[^A-Za-z0-9._ -]/g, "_")
      .slice(0, 120);
    res.setHeader("Content-Type", m.contentType);
    res.setHeader("Content-Length", String(m.buffer.length));
    res.setHeader(
      "Content-Disposition",
      `${m.inline ? "inline" : "attachment"}; filename="${safeName}"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.status(200).end(m.buffer);
  }

  @Get("quick-replies")
  quickReplies() {
    return this.inbox.quickReplies();
  }

  @Put("quick-replies")
  setQuickReplies(@Body() dto: QuickRepliesDto) {
    return this.inbox.setQuickReplies(dto.items);
  }

  // ---- settings / connection -----------------------------------------------

  @Get("settings/status")
  @ApiOperation({
    summary:
      "Configuration + read-only WABA/number check + CAPI status (never tokens)",
  })
  settingsStatus(@Query("refresh") refresh?: string) {
    return this.status.status(refresh === "1" || refresh === "true");
  }

  @Post("settings/verify-token")
  @HttpCode(200)
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 10, ttl: 60000 })
  revealVerifyToken(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return this.status.revealVerifyToken();
  }

  @Post("capi/run")
  @HttpCode(200)
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 6, ttl: 60000 })
  @ApiOperation({
    summary:
      "Run the Conversions API sender now (no-op unless META_CAPI_ENABLED)",
  })
  runCapi() {
    return this.capi.run();
  }

  @Post("capi/dataset")
  @HttpCode(200)
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 3, ttl: 60000 })
  createDataset() {
    return this.status.createDataset();
  }

  @Post("embedded-signup/complete")
  @HttpCode(200)
  @UseGuards(UserThrottleGuard)
  @UserThrottle({ limit: 5, ttl: 60000 })
  @ApiOperation({
    summary:
      "Coexistence Embedded Signup completion (feature-flagged; never registers the number)",
  })
  completeEmbeddedSignup(
    @Body() dto: EmbeddedSignupCompleteDto,
    @Req() req: any,
  ) {
    return this.status.completeEmbeddedSignup(dto, this.uid(req));
  }
}
