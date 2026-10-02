import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { ContentCalendarService } from "../content-calendar/content-calendar.service";
import { streamContentMedia } from "../content-calendar/content-media-stream.util";
import { MediaProjectsService } from "../media-collab/services/media-projects.service";
import {
  MediaShareService,
  ResolvedMediaShare,
} from "../media-collab/services/media-share.service";
import { CreatePublicBulkDownloadJobDto } from "../media-collab/dto/create-bulk-download-job.dto";
import {
  DeckShareService,
  ResolvedDeckShare,
} from "../decks/services/deck-share.service";
import { PortalSession } from "./portal-auth.service";
import { PortalScopeService } from "./portal-scope.service";
import { PortalReportsService } from "./portal-reports.service";
import {
  CurrentPortalSession,
  PortalSessionGuard,
} from "./guards/portal-session.guard";
import {
  PortalAssetRatingDto,
  PortalAssetStatusDto,
  PortalDeckCommentDto,
  PortalMediaCommentDto,
} from "./dto/portal.dto";

/** What a portal user (the client) may do — reported to the frontend. */
const PORTAL_MEDIA_ACCESS = {
  canComment: true,
  canChangeStatus: true,
  canRate: true,
  canDownload: true,
} as const;
const PORTAL_DECK_ACCESS = { canComment: true, canDownload: true } as const;

/**
 * Client-portal data API. Every route:
 *  1. requires a valid portal session cookie (PortalSessionGuard), and
 *  2. requires :clientId to be one of the session's clients (else 404), and
 *  3. scope-checks every nested id against that client (else 404).
 *
 * Response shapes mirror the public share endpoints so the frontend can reuse
 * the same viewer components.
 */
@ApiTags("Client Portal - Data")
@Public()
@UseGuards(PortalSessionGuard)
@Controller("portal/clients/:clientId")
export class PortalDataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: PortalScopeService,
    private readonly contentCalendar: ContentCalendarService,
    private readonly mediaService: MediaService,
    private readonly mediaProjects: MediaProjectsService,
    private readonly mediaShare: MediaShareService,
    private readonly deckShare: DeckShareService,
    private readonly reports: PortalReportsService,
  ) {}

  // ─── Content planner ────────────────────────────────────────────────────────

  @Get("content")
  @ApiOperation({ summary: "Content planner (same payload as the public content share)" })
  async getContent(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
  ) {
    this.scope.contactForClient(session, clientId);
    return this.contentCalendar.getClientSharedContent(clientId);
  }

  @Get("content/media")
  @ApiOperation({ summary: "Stream a content-planner media file of this client" })
  async getContentMedia(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Query("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.scope.contactForClient(session, clientId);
    if (!key || typeof key !== "string") {
      throw new BadRequestException("No media key provided");
    }
    await this.contentCalendar.assertClientOwnsMediaKey(clientId, key);
    await streamContentMedia(this.mediaService, key, req, res);
  }

  // ─── Social media reports ───────────────────────────────────────────────────

  @Get("reports")
  @ApiOperation({ summary: "Completed/sent social media reports of this client" })
  async listReports(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
  ) {
    this.scope.contactForClient(session, clientId);
    return this.reports.list(clientId);
  }

  @Get("reports/:reportId")
  @ApiOperation({ summary: "Report detail with sections" })
  async getReport(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("reportId") reportId: string,
  ) {
    this.scope.contactForClient(session, clientId);
    return this.reports.detail(clientId, reportId);
  }

  @Get("reports/:reportId/pdf")
  // Rendering may run Puppeteer: keep it well below the global limit.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Download the report PDF (attachment)" })
  async getReportPdf(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("reportId") reportId: string,
    @Res() res: Response,
  ) {
    this.scope.contactForClient(session, clientId);
    await this.reports.sendPdf(clientId, reportId, res);
  }

  // ─── Media projects ─────────────────────────────────────────────────────────

  @Get("media-projects")
  @ApiOperation({ summary: "Media collaboration projects of this client" })
  async listMediaProjects(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
  ) {
    this.scope.contactForClient(session, clientId);
    const projects = await this.prisma.mediaProject.findMany({
      where: this.scope.mediaProjectsWhere(clientId),
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        _count: { select: { assets: true } },
        assets: {
          where: { thumbnailUrl: { not: null } },
          orderBy: { uploadedAt: "desc" },
          take: 1,
          select: { thumbnailUrl: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      assetCount: p._count.assets,
      updatedAt: p.updatedAt,
      coverThumbnailUrl: p.assets[0]?.thumbnailUrl ?? null,
    }));
  }

  private async mediaShareFor(
    session: PortalSession,
    clientId: string,
    projectId: string,
  ): Promise<{ share: ResolvedMediaShare; contactName: string }> {
    const contact = this.scope.contactForClient(session, clientId);
    const project = await this.scope.mediaProjectInScope(clientId, projectId);
    return {
      contactName: contact.name,
      share: {
        projectId: project.id,
        createdBy: project.createdBy,
        canComment: PORTAL_MEDIA_ACCESS.canComment,
        canChangeStatus: PORTAL_MEDIA_ACCESS.canChangeStatus,
        binding: { kind: "portal", portalScope: this.scope.portalScopeKey(contact) },
      },
    };
  }

  @Get("media-projects/:projectId")
  @ApiOperation({ summary: "Media project (same shape as the public project payload)" })
  async getMediaProject(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    const view = await this.mediaProjects.getShareProjectById(share.projectId);
    // The client gets comment + download rights regardless of the project's
    // public-link level; publicAccessLevel is reported as COMMENT so viewers
    // written for public links enable their review controls.
    return { ...view, publicAccessLevel: "COMMENT", portalAccess: PORTAL_MEDIA_ACCESS };
  }

  @Get("media-projects/:projectId/assets")
  async getMediaAssets(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaProjects.listShareAssets(share.projectId);
  }

  @Get("media-projects/:projectId/folders")
  async getMediaFolders(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaProjects.listShareFolders(share.projectId);
  }

  @Get("media-projects/:projectId/media-token")
  async getMediaToken(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaShare.getMediaToken(share);
  }

  @Get("media-projects/:projectId/assets/:assetId/comments")
  async getAssetComments(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaShare.listComments(share, assetId);
  }

  @Post("media-projects/:projectId/assets/:assetId/comments")
  async createAssetComment(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
    @Body() body: PortalMediaCommentDto,
  ) {
    const { share, contactName } = await this.mediaShareFor(
      session,
      clientId,
      projectId,
    );
    // Any guestName in the body is ignored: the contact's own name is used.
    return this.mediaShare.createComment(
      share,
      assetId,
      { content: body.content, timecode: body.timecode, parentId: body.parentId },
      contactName,
    );
  }

  @Put("media-projects/:projectId/assets/:assetId/status")
  async updateAssetStatus(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
    @Body() body: PortalAssetStatusDto,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaShare.updateStatus(share, assetId, body.status);
  }

  @Put("media-projects/:projectId/assets/:assetId/rating")
  async updateAssetRating(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
    @Body() body: PortalAssetRatingDto,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaShare.updateRating(share, assetId, body.starRating);
  }

  @Post("media-projects/:projectId/async-bulk-download")
  async createBulkDownload(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
    @Body() body: CreatePublicBulkDownloadJobDto,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaShare.createBulkDownload(share, body.assetIds, body.zipFilename);
  }

  @Get("media-projects/:projectId/async-bulk-download/:jobId")
  async getBulkDownload(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("projectId") projectId: string,
    @Param("jobId") jobId: string,
  ) {
    const { share } = await this.mediaShareFor(session, clientId, projectId);
    return this.mediaShare.getBulkDownloadStatus(share, jobId);
  }

  // ─── Decks ──────────────────────────────────────────────────────────────────

  @Get("decks")
  @ApiOperation({ summary: "Non-draft decks of this client" })
  async listDecks(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
  ) {
    this.scope.contactForClient(session, clientId);
    const decks = await this.prisma.deck.findMany({
      where: this.scope.decksWhere(clientId),
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        _count: { select: { slides: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return decks.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      updatedAt: d.updatedAt,
      slideCount: d._count.slides,
    }));
  }

  private async deckShareFor(
    session: PortalSession,
    clientId: string,
    deckId: string,
  ): Promise<{ share: ResolvedDeckShare; contactName: string; contactEmail: string }> {
    const contact = this.scope.contactForClient(session, clientId);
    const deck = await this.scope.deckInScope(clientId, deckId);
    return {
      contactName: contact.name,
      contactEmail: contact.email,
      share: {
        deckId: deck.id,
        createdById: deck.createdById,
        canComment: PORTAL_DECK_ACCESS.canComment,
        canDownload: PORTAL_DECK_ACCESS.canDownload,
        binding: { kind: "portal", portalScope: this.scope.portalScopeKey(contact) },
      },
    };
  }

  @Get("decks/:deckId")
  @ApiOperation({ summary: "Deck (same shape as GET /deck-public/:token)" })
  async getDeck(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("deckId") deckId: string,
  ) {
    const { share } = await this.deckShareFor(session, clientId, deckId);
    const deck = await this.deckShare.getDeckView(share.deckId);
    return { ...deck, publicAccessLevel: "COMMENT", portalAccess: PORTAL_DECK_ACCESS };
  }

  @Post("decks/:deckId/comment")
  async createDeckComment(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("deckId") deckId: string,
    @Body() body: PortalDeckCommentDto,
  ) {
    const { share, contactName, contactEmail } = await this.deckShareFor(
      session,
      clientId,
      deckId,
    );
    // guestName/guestEmail in the body are ignored: the contact's own are used.
    return this.deckShare.createComment(
      share,
      {
        slideId: body.slideId,
        content: body.content,
        parentId: body.parentId,
        positionX: body.positionX,
        positionY: body.positionY,
      },
      { name: contactName, email: contactEmail },
    );
  }

  @Get("decks/:deckId/comments/:slideId")
  async getDeckComments(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("deckId") deckId: string,
    @Param("slideId") slideId: string,
  ) {
    const { share } = await this.deckShareFor(session, clientId, deckId);
    return this.deckShare.listComments(share, slideId);
  }

  @Post("decks/:deckId/export-pdf")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async startDeckExport(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("deckId") deckId: string,
  ) {
    const { share } = await this.deckShareFor(session, clientId, deckId);
    return this.deckShare.startExport(share);
  }

  @Get("decks/:deckId/export-pdf/status/:jobId")
  async getDeckExportStatus(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("deckId") deckId: string,
    @Param("jobId") jobId: string,
  ) {
    const { share } = await this.deckShareFor(session, clientId, deckId);
    return this.deckShare.getExportStatus(share, jobId);
  }

  @Get("decks/:deckId/export-pdf/download/:jobId")
  @ApiOperation({ summary: "Download a finished deck PDF export (single use)" })
  async downloadDeckExport(
    @CurrentPortalSession() session: PortalSession,
    @Param("clientId") clientId: string,
    @Param("deckId") deckId: string,
    @Param("jobId") jobId: string,
    @Res() res: Response,
  ) {
    const { share } = await this.deckShareFor(session, clientId, deckId);
    const file = this.deckShare.getExportFile(share, jobId);
    res.download(file.filePath, file.filename, () => {
      this.deckShare.cleanupExport(jobId);
    });
  }
}
