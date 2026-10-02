import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaProjectsService } from "./media-projects.service";
import { MediaAssetsService } from "./media-assets.service";
import { MetadataService } from "./metadata.service";
import { MediaCommentsService } from "./media-comments.service";
import { BulkDownloadService, ShareJobBinding } from "./bulk-download.service";
import { MediaService } from "../../media/media.service";

/**
 * A media project whose access has already been resolved by the caller —
 * either from a public share token or from a client-portal session scope.
 * Every asset-level operation below re-checks that the asset belongs to
 * `projectId` (IDOR guard), whatever the channel.
 */
export interface ResolvedMediaShare {
  projectId: string;
  /** Project creator; used as the DB authorId / R2 access user for guests. */
  createdBy: string;
  canComment: boolean;
  canChangeStatus: boolean;
  binding: ShareJobBinding;
}

export interface ShareCommentInput {
  content: string;
  timecode?: number;
  parentId?: string;
}

/**
 * Comment as shown on a public share / the client portal: the author keeps
 * id and name, but never the (staff) email. Guest comments are stored with
 * the project creator as author, so without this every guest would see the
 * creator's address. Applied to replies too.
 */
export function toShareComment<T>(comment: T): T {
  if (!comment || typeof comment !== "object") return comment;
  const c = comment as Record<string, unknown>;
  const out: Record<string, unknown> = { ...c };
  if (c.author && typeof c.author === "object") {
    const { id, name } = c.author as { id?: unknown; name?: unknown };
    out.author = { id, name };
  }
  if (Array.isArray(c.replies)) out.replies = c.replies.map(toShareComment);
  return out as T;
}

/**
 * Key prefix that matches no R2 object. Used instead of an empty prefix list
 * when a project has no assets: the media worker treats an EMPTY list as
 * "allow every key", which would turn a token for an empty project into a
 * bucket-wide read token.
 */
const NO_MEDIA_KEY_PREFIX = "__no-assets__/";

/**
 * Shared logic behind the public share-link media endpoints and the client
 * portal media endpoints, so both channels enforce identical rules.
 */
@Injectable()
export class MediaShareService {
  constructor(
    private readonly projectsService: MediaProjectsService,
    private readonly assetsService: MediaAssetsService,
    private readonly metadataService: MetadataService,
    private readonly commentsService: MediaCommentsService,
    private readonly bulkDownloadService: BulkDownloadService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Resolve a public share token (404 when missing/disabled/expired). Counts a
   * view, matching the long-standing behaviour of the public endpoints.
   */
  async resolvePublic(token: string): Promise<ResolvedMediaShare> {
    const project = await this.projectsService.getPublicProject(token);
    const level = project.publicAccessLevel;
    return {
      projectId: project.id,
      createdBy: project.createdBy,
      canComment: level !== "VIEW_ONLY",
      canChangeStatus: level !== "VIEW_ONLY",
      binding: { kind: "public", shareToken: token },
    };
  }

  /** IDOR guard: the asset must belong to the resolved project. */
  private async assertAssetInShare(share: ResolvedMediaShare, assetId: string) {
    if (typeof assetId !== "string" || assetId.length === 0) {
      throw new NotFoundException("Asset not found");
    }
    const asset = await this.assetsService.findOneRaw(assetId);
    if (!asset || asset.projectId !== share.projectId) {
      throw new NotFoundException("Asset not found");
    }
  }

  async getMediaToken(share: ResolvedMediaShare): Promise<{ mediaToken: string }> {
    const keyPrefixes = await this.projectsService.getProjectKeyPrefixes(
      share.projectId,
    );
    const binding =
      share.binding.kind === "public" ? share.binding.shareToken : "client-portal";
    const mediaToken = this.mediaService.generatePublicShareMediaToken(
      share.projectId,
      binding,
      keyPrefixes.length > 0 ? keyPrefixes : [NO_MEDIA_KEY_PREFIX],
    );
    return { mediaToken };
  }

  async listComments(share: ResolvedMediaShare, assetId: string) {
    await this.assertAssetInShare(share, assetId);
    const comments = await this.commentsService.findByAsset(assetId);
    return comments.map(toShareComment);
  }

  /**
   * Create a guest comment. The display name is decided by the caller (the
   * typed guest name for public links, the contact's name for the portal) and
   * prefixed to the text so internal reviewers know who left the feedback.
   */
  async createComment(
    share: ResolvedMediaShare,
    assetId: string,
    input: ShareCommentInput,
    displayName: string,
  ) {
    if (!share.canComment) {
      throw new ForbiddenException("This share link is view-only");
    }

    await this.assertAssetInShare(share, assetId);

    // IDOR guard for replies: the parent comment must be on this same asset,
    // otherwise a guest could attach a reply to a comment in another project.
    if (input.parentId != null) {
      if (typeof input.parentId !== "string") {
        throw new BadRequestException("parentId must be a string");
      }
      const parentAssetId = await this.commentsService.getCommentAssetId(
        input.parentId,
      );
      if (parentAssetId !== assetId) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    const name = (displayName || "Anonymous").trim() || "Anonymous";
    const created = await this.commentsService.create({
      assetId,
      content: `[${name}]: ${input.content}`,
      authorId: share.createdBy,
      timestamp: input.timecode,
      parentId: input.parentId,
    });
    return toShareComment(created);
  }

  async updateStatus(share: ResolvedMediaShare, assetId: string, status: string) {
    if (!share.canChangeStatus) {
      throw new ForbiddenException("This share link is view-only");
    }
    await this.assertAssetInShare(share, assetId);
    return this.assetsService.updateStatus(assetId, share.createdBy, status);
  }

  async updateRating(
    share: ResolvedMediaShare,
    assetId: string,
    starRating: number,
  ) {
    await this.assertAssetInShare(share, assetId);
    return this.metadataService.updateStarRating(
      assetId,
      starRating,
      share.createdBy,
    );
  }

  async createBulkDownload(
    share: ResolvedMediaShare,
    assetIds: string[],
    zipFilename?: string,
  ) {
    return this.bulkDownloadService.createShareJob(
      { id: share.projectId, createdBy: share.createdBy },
      share.binding,
      assetIds,
      zipFilename,
    );
  }

  async getBulkDownloadStatus(share: ResolvedMediaShare, jobId: string) {
    return this.bulkDownloadService.getShareJobStatus(
      jobId,
      share.projectId,
      share.binding,
    );
  }
}
