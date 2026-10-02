import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DeckExportService, ExportJob } from "./deck-export.service";

/** Comment fields safe to show on a public share or the client portal. */
const PUBLIC_COMMENT_FIELDS = {
  id: true,
  slideId: true,
  userId: true,
  guestName: true,
  content: true,
  positionX: true,
  positionY: true,
  parentId: true,
  isResolved: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
} as const;

/** Who a share-originated (non-staff) deck access is bound to. */
export type DeckShareBinding =
  | { kind: "public"; token: string }
  | { kind: "portal"; portalScope: string };

/**
 * A deck whose access was already resolved — from a public share token or a
 * client-portal session scope. Slide/job ids are always re-checked against
 * `deckId` (IDOR guard).
 */
export interface ResolvedDeckShare {
  deckId: string;
  createdById: string;
  canComment: boolean;
  canDownload: boolean;
  binding: DeckShareBinding;
}

export interface DeckShareCommentInput {
  slideId: string;
  content: string;
  parentId?: string;
  positionX?: number;
  positionY?: number;
}

const DECK_VIEW_INCLUDE = {
  client: { select: { id: true, name: true } },
  project: { select: { id: true, number: true } },
  createdBy: { select: { id: true, name: true } },
  slides: {
    orderBy: { order: "asc" as const },
    include: { elements: { orderBy: { zIndex: "asc" as const } } },
  },
};

/**
 * Shared logic behind the public deck share endpoints and the client-portal
 * deck endpoints, so both channels enforce identical scoping rules.
 */
@Injectable()
export class DeckShareService {
  /**
   * Export jobs started through the portal, bound to the portal scope that
   * started them (`${clientId}:${email}`). Export jobs themselves live in
   * DeckExportService's in-memory map (30-minute TTL sweep deletes the job and
   * its PDF), so this binding has the same lifetime: entries whose job is gone
   * are pruned by `pruneDeadBindings`. A binding is only ever removed when its
   * job no longer exists or by the owning scope's download (`cleanupExport`);
   * a poll through the wrong deck / scope / channel never touches it.
   */
  private readonly portalExportJobs = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: DeckExportService,
  ) {}

  /** Resolve a public share token (404 when missing or not public). */
  async resolvePublic(token: string): Promise<ResolvedDeckShare> {
    if (typeof token !== "string" || token.length === 0) {
      throw new NotFoundException("Deck not found or not publicly shared");
    }
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      select: {
        id: true,
        isPublic: true,
        publicAccessLevel: true,
        createdById: true,
      },
    });
    if (!deck || !deck.isPublic) {
      throw new NotFoundException("Deck not found or not publicly shared");
    }
    return {
      deckId: deck.id,
      createdById: deck.createdById,
      canComment: deck.publicAccessLevel === "COMMENT",
      canDownload: deck.publicAccessLevel === "DOWNLOAD",
      binding: { kind: "public", token },
    };
  }

  /**
   * Deck payload in the same shape as GET /deck-public/:token, for a deck the
   * caller already authorised (portal). Share tokens are blanked (the portal
   * user does not need the public link) and no public view is counted.
   */
  async getDeckView(deckId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: DECK_VIEW_INCLUDE,
    });
    if (!deck) {
      throw new NotFoundException("Deck not found");
    }
    return { ...deck, publicShareToken: null, publicShareUrl: null };
  }

  private async assertSlideInDeck(share: ResolvedDeckShare, slideId: unknown) {
    if (typeof slideId !== "string" || slideId.length === 0) {
      throw new NotFoundException("Slide not found in this deck");
    }
    const slide = await this.prisma.deckSlide.findFirst({
      where: { id: slideId, deckId: share.deckId },
      select: { id: true },
    });
    if (!slide) {
      throw new NotFoundException("Slide not found in this deck");
    }
  }

  async createComment(
    share: ResolvedDeckShare,
    input: DeckShareCommentInput,
    guest: { name?: string; email?: string },
  ) {
    if (!share.canComment) {
      throw new ForbiddenException("This deck does not allow public comments");
    }

    await this.assertSlideInDeck(share, input.slideId);

    // IDOR guard for replies: the parent comment must be on the same slide.
    if (input.parentId != null) {
      if (typeof input.parentId !== "string") {
        throw new BadRequestException("parentId must be a string");
      }
      const parent = await this.prisma.deckSlideComment.findUnique({
        where: { id: input.parentId },
        select: { slideId: true },
      });
      if (!parent || parent.slideId !== input.slideId) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    return this.prisma.deckSlideComment.create({
      data: {
        slideId: input.slideId,
        guestName: guest.name || "Guest",
        guestEmail: guest.email,
        content: input.content,
        parentId: input.parentId,
        positionX: input.positionX,
        positionY: input.positionY,
      },
      include: {
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async listComments(share: ResolvedDeckShare, slideId: string) {
    if (!share.canComment) {
      throw new ForbiddenException("This deck does not allow public comments");
    }

    await this.assertSlideInDeck(share, slideId);

    // Public / portal viewers see names only: no staff email and no other
    // guest's email (explicit select, so new columns are never leaked).
    return this.prisma.deckSlideComment.findMany({
      where: { slideId, parentId: null },
      select: {
        ...PUBLIC_COMMENT_FIELDS,
        replies: {
          select: PUBLIC_COMMENT_FIELDS,
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Start a PDF export. Runs as the deck creator (the export service requires
   * a deck membership); portal jobs are additionally bound to the portal scope.
   */
  async startExport(share: ResolvedDeckShare): Promise<{ jobId: string }> {
    if (!share.canDownload) {
      throw new ForbiddenException("This deck does not allow public downloads");
    }
    const jobId = await this.exportService.startPdfGeneration(
      share.deckId,
      "standard",
      share.createdById,
    );
    this.pruneDeadBindings();
    if (share.binding.kind === "portal") {
      this.portalExportJobs.set(jobId, share.binding.portalScope);
    }
    return { jobId };
  }

  /**
   * Drop bindings whose export job no longer exists (already downloaded or
   * removed by DeckExportService's TTL sweep). Owner-agnostic and safe: it
   * only forgets bindings that can no longer resolve to a file.
   */
  private pruneDeadBindings() {
    for (const id of this.portalExportJobs.keys()) {
      if (!this.exportService.getJobStatus(id)) this.portalExportJobs.delete(id);
    }
  }

  /**
   * Throws 404 unless the job belongs to this deck AND to this channel:
   *  - portal: the job must be bound to exactly this portal scope;
   *  - public: the job must not be a portal-bound job.
   * Read-only: a mismatched poll never mutates the binding, so a guessed or
   * leaked jobId polled through another deck/scope cannot orphan the owner's
   * export.
   */
  private assertJobInShare(share: ResolvedDeckShare, jobId: string): ExportJob {
    const notFound = () => new NotFoundException("Job not found");
    if (typeof jobId !== "string" || jobId.length === 0) throw notFound();
    const job = this.exportService.getJobStatus(jobId);
    if (!job || job.deckId !== share.deckId) throw notFound();

    const boundScope = this.portalExportJobs.get(jobId);
    if (share.binding.kind === "portal") {
      if (boundScope !== share.binding.portalScope) throw notFound();
    } else if (boundScope !== undefined) {
      throw notFound();
    }
    return job;
  }

  getExportStatus(share: ResolvedDeckShare, jobId: string): ExportJob {
    if (!share.canDownload) {
      throw new ForbiddenException("This deck does not allow public downloads");
    }
    return this.assertJobInShare(share, jobId);
  }

  /**
   * Resolve a finished portal export to its file. The caller streams it and
   * then calls `cleanupExport`.
   */
  getExportFile(
    share: ResolvedDeckShare,
    jobId: string,
  ): { filePath: string; filename: string } {
    if (!share.canDownload) {
      throw new ForbiddenException("This deck does not allow public downloads");
    }
    this.assertJobInShare(share, jobId);
    const result = this.exportService.getJobResult(jobId);
    if (!result || result.status !== "completed" || !result.filePath) {
      throw new BadRequestException("PDF not ready");
    }
    return {
      filePath: result.filePath,
      filename: result.filename || `deck-${share.deckId}.pdf`,
    };
  }

  /**
   * Delete a finished export (file + job + binding). Only call this after
   * `getExportFile` authorised the same share for this jobId (the portal
   * download route does so before streaming).
   */
  cleanupExport(jobId: string) {
    this.portalExportJobs.delete(jobId);
    this.exportService.cleanupJob(jobId);
  }
}
