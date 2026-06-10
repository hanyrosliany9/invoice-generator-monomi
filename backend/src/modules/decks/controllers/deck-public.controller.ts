import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
// @Public() marks these routes as intentionally unauthenticated so a future
// global JwtAuthGuard won't accidentally lock them down.
import { Public } from "../../../common/decorators/public.decorator";
import { DecksService } from "../services/decks.service";
import { DeckCollaboratorsService } from "../services/deck-collaborators.service";
import { DeckCommentsService } from "../services/deck-comments.service";
import { DeckExportService } from "../services/deck-export.service";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Deck Public")
@Controller("deck-public")
export class DeckPublicController {
  constructor(
    private readonly decksService: DecksService,
    private readonly collaboratorsService: DeckCollaboratorsService,
    private readonly commentsService: DeckCommentsService,
    private readonly exportService: DeckExportService,
    private readonly prisma: PrismaService,
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
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      select: { id: true, isPublic: true, publicAccessLevel: true },
    });

    if (!deck || !deck.isPublic) {
      throw new NotFoundException("Deck not found or not publicly shared");
    }

    if (deck.publicAccessLevel !== "COMMENT") {
      throw new ForbiddenException(
        "This deck does not allow public comments",
      );
    }

    // Verify the slide belongs to this deck
    const slide = await this.prisma.deckSlide.findFirst({
      where: { id: body.slideId, deckId: deck.id },
      select: { id: true },
    });
    if (!slide) {
      throw new NotFoundException("Slide not found in this deck");
    }

    return this.prisma.deckSlideComment.create({
      data: {
        slideId: body.slideId,
        guestName: body.guestName || "Guest",
        guestEmail: body.guestEmail,
        content: body.content,
        parentId: body.parentId,
        positionX: body.positionX,
        positionY: body.positionY,
      },
      include: {
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
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
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      select: { id: true, isPublic: true, publicAccessLevel: true },
    });

    if (!deck || !deck.isPublic) {
      throw new NotFoundException("Deck not found or not publicly shared");
    }

    if (deck.publicAccessLevel !== "COMMENT") {
      throw new ForbiddenException(
        "This deck does not allow public comments",
      );
    }

    const slide = await this.prisma.deckSlide.findFirst({
      where: { id: slideId, deckId: deck.id },
      select: { id: true },
    });
    if (!slide) {
      throw new NotFoundException("Slide not found in this deck");
    }

    return this.prisma.deckSlideComment.findMany({
      where: { slideId, parentId: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      select: { id: true, isPublic: true, publicAccessLevel: true, createdById: true },
    });

    if (!deck || !deck.isPublic) {
      throw new NotFoundException("Deck not found or not publicly shared");
    }

    if (deck.publicAccessLevel !== "DOWNLOAD") {
      throw new ForbiddenException(
        "This deck does not allow public downloads",
      );
    }

    const jobId = await this.exportService.startPdfGeneration(
      deck.id,
      "standard",
      deck.createdById,
    );

    return { jobId };
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
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      select: { id: true, isPublic: true, publicAccessLevel: true },
    });

    if (!deck || !deck.isPublic) {
      throw new NotFoundException("Deck not found or not publicly shared");
    }

    if (deck.publicAccessLevel !== "DOWNLOAD") {
      throw new ForbiddenException("This deck does not allow public downloads");
    }

    const job = this.exportService.getJobStatus(jobId);
    if (!job || job.deckId !== deck.id) {
      throw new NotFoundException("Job not found");
    }

    return job;
  }
}
