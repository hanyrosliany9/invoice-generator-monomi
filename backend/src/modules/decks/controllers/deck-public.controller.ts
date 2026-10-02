import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
// @Public() marks these routes as intentionally unauthenticated so a future
// global JwtAuthGuard won't accidentally lock them down.
import { Public } from "../../../common/decorators/public.decorator";
import { DecksService } from "../services/decks.service";
import { DeckCollaboratorsService } from "../services/deck-collaborators.service";
import { DeckShareService } from "../services/deck-share.service";

@ApiTags("Deck Public")
@Controller("deck-public")
export class DeckPublicController {
  constructor(
    private readonly decksService: DecksService,
    private readonly collaboratorsService: DeckCollaboratorsService,
    // Comment / export scoping rules are shared with the client portal.
    private readonly shareService: DeckShareService,
  ) {}

  @Public()
  @Get(":token")
  @ApiOperation({ summary: "Get public deck by share token" })
  getPublicDeck(@Param("token") token: string) {
    return this.decksService.findByPublicToken(token);
  }

  @Public()
  @Post("accept-invite/:token")
  @ApiOperation({ summary: "Accept a guest invite" })
  acceptInvite(
    @Param("token") token: string,
    @Body() body: { name: string; email: string },
  ) {
    return this.collaboratorsService.acceptInvite(token, body);
  }

  /**
   * POST /deck-public/:token/comment
   *
   * Allows a public guest to add a comment on a slide.
   * The deck's publicAccessLevel must be COMMENT; otherwise 403.
   * guestName is optional; slideId and content are required.
   */
  @Public()
  @Post(":token/comment")
  @ApiOperation({
    summary: "Add a guest comment on a public deck (requires COMMENT access level)",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["slideId", "content"],
      properties: {
        slideId: { type: "string" },
        content: { type: "string" },
        guestName: { type: "string" },
        guestEmail: { type: "string" },
        parentId: { type: "string" },
        positionX: { type: "number" },
        positionY: { type: "number" },
      },
    },
  })
  async createPublicComment(
    @Param("token") token: string,
    @Body()
    body: {
      slideId: string;
      content: string;
      guestName?: string;
      guestEmail?: string;
      parentId?: string;
      positionX?: number;
      positionY?: number;
    },
  ) {
    // COMMENT access level required; slide (and reply parent) must belong to
    // the shared deck.
    const share = await this.shareService.resolvePublic(token);
    return this.shareService.createComment(
      share,
      {
        slideId: body.slideId,
        content: body.content,
        parentId: body.parentId,
        positionX: body.positionX,
        positionY: body.positionY,
      },
      { name: body.guestName, email: body.guestEmail },
    );
  }

  /**
   * GET /deck-public/:token/comments/:slideId
   *
   * Public endpoint to read comments for a slide.
   * Allowed for COMMENT access level only.
   */
  @Public()
  @Get(":token/comments/:slideId")
  @ApiOperation({
    summary: "Get comments for a public deck slide (requires COMMENT access level)",
  })
  async getPublicComments(
    @Param("token") token: string,
    @Param("slideId") slideId: string,
  ) {
    const share = await this.shareService.resolvePublic(token);
    return this.shareService.listComments(share, slideId);
  }

  /**
   * POST /deck-public/:token/export-pdf
   *
   * Triggers PDF export for a publicly shared deck.
   * The deck's publicAccessLevel must be DOWNLOAD; otherwise 403.
   * Returns a jobId that can be polled via the authenticated export endpoints.
   * Since export is CPU-intensive the job is started with a "guest" userId
   * set to the deck's createdById to satisfy the membership check.
   */
  @Public()
  @Post(":token/export-pdf")
  @ApiOperation({
    summary: "Start PDF export for a public deck (requires DOWNLOAD access level)",
  })
  async startPublicPdfExport(@Param("token") token: string) {
    // DOWNLOAD access level required; runs as the deck creator.
    const share = await this.shareService.resolvePublic(token);
    return this.shareService.startExport(share);
  }

  /**
   * GET /deck-public/:token/export-pdf/status/:jobId
   *
   * Poll export job status without requiring authentication.
   * Only returns status for jobs belonging to a deck accessible via the token.
   */
  @Public()
  @Get(":token/export-pdf/status/:jobId")
  @ApiOperation({ summary: "Poll public PDF export job status" })
  async getPublicPdfStatus(
    @Param("token") token: string,
    @Param("jobId") jobId: string,
  ) {
    const share = await this.shareService.resolvePublic(token);
    return this.shareService.getExportStatus(share, jobId);
  }
}
