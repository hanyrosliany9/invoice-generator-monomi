import {
  Controller,
  Get,
  Post,
  Param,
  Put,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { MediaProjectsService } from "../services/media-projects.service";
import { MediaAssetsService } from "../services/media-assets.service";
import { MetadataService } from "../services/metadata.service";
import { MediaCommentsService } from "../services/media-comments.service";
import { BulkDownloadService } from "../services/bulk-download.service";
import { MediaService } from "../../media/media.service";

/**
 * Public API Controller
 * No authentication required - anyone with link can access
 */
@ApiTags("Public Sharing")
@Controller("media-collab/public")
export class PublicController {
  constructor(
    private readonly projectsService: MediaProjectsService,
    private readonly assetsService: MediaAssetsService,
    private readonly metadataService: MetadataService,
    private readonly jwtService: JwtService,
    private readonly commentsService: MediaCommentsService,
    private readonly bulkDownloadService: BulkDownloadService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Validate public share token (for Cloudflare Worker)
   *
   * GET /media-collab/public/validate-token?token=xxx
   * Query: token - Public share token to validate
   *
   * Returns project ID if token is valid, otherwise throws error.
   * Used by Cloudflare Workers to validate public tokens before serving media.
   */
  @Get("validate-token")
  @ApiOperation({ summary: "Validate public share token for media access" })
  @ApiQuery({
    name: "token",
    description: "Public share token to validate",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Token is valid" })
  @ApiResponse({ status: 400, description: "No token provided" })
  @ApiResponse({
    status: 404,
    description: "Token not found or project not public",
  })
  async validatePublicToken(@Query("token") token: string) {
    if (!token) {
      throw new BadRequestException("No token provided");
    }

    // Validate token by attempting to get the public project
    const project = await this.projectsService.getPublicProject(token);

    return {
      success: true,
      data: {
        projectId: project.id,
        valid: true,
        isPublic: true,
      },
    };
  }

  /**
   * Get public project by share token
   */
  @Get(":token")
  @ApiOperation({ summary: "Get public project (no auth required)" })
  @ApiResponse({ status: 200, description: "Project retrieved successfully" })
  @ApiResponse({ status: 404, description: "Link not found or disabled" })
  async getPublicProject(@Param("token") token: string) {
    // Return data directly - ResponseInterceptor will wrap it
    return await this.projectsService.getPublicProject(token);
  }

  /**
   * Get public project assets
   */
  @Get(":token/assets")
  @ApiOperation({ summary: "Get public project assets (no auth required)" })
  @ApiResponse({ status: 200, description: "Assets retrieved successfully" })
  @ApiResponse({ status: 404, description: "Link not found or disabled" })
  async getPublicAssets(@Param("token") token: string) {
    // Return data directly - ResponseInterceptor will wrap it
    return await this.projectsService.getPublicProjectAssets(token);
  }

  /**
   * Get public project folders
   */
  @Get(":token/folders")
  @ApiOperation({ summary: "Get public project folders (no auth required)" })
  @ApiResponse({ status: 200, description: "Folders retrieved successfully" })
  @ApiResponse({ status: 404, description: "Link not found or disabled" })
  async getPublicFolders(@Param("token") token: string) {
    // Return data directly - ResponseInterceptor will wrap it
    return await this.projectsService.getPublicProjectFolders(token);
  }

  /**
   * Get a short-lived media JWT for public project access
   *
   * GET /media-collab/public/:token/media-token
   *
   * Validates the share token and returns a signed JWT that the Cloudflare Worker
   * accepts (purpose: 'public-share'). Allows the public page to load media via
   * the worker CDN without exposing private R2 credentials.
   */
  @Get(":token/media-token")
  @ApiOperation({ summary: "Get Cloudflare Worker media JWT for public project" })
  @ApiResponse({ status: 200, description: "Media token returned" })
  @ApiResponse({ status: 404, description: "Share link not found or disabled" })
  async getPublicMediaToken(@Param("token") token: string) {
    // Validates share token — throws 404 if not found/disabled; returns project with id
    const project = await this.projectsService.getPublicProject(token);

    // Derive the R2 key prefixes actually used by this project's assets so the
    // Cloudflare Worker can enforce that this token only unlocks those keys.
    // Falls back to an empty array if the project has no assets yet (new projects);
    // the worker treats an empty keyPrefixes list as "allow all for this project"
    // because there are no assets to scope against.
    const keyPrefixes = await this.projectsService.getPublicProjectKeyPrefixes(token);

    // Issue a scoped JWT via MediaService (wraps JwtService with scope logic)
    const mediaToken = this.mediaService.generatePublicShareMediaToken(
      project.id,
      token,
      keyPrefixes,
    );

    return { mediaToken };
  }

  /**
   * Get comments for a specific asset (public - no auth required)
   *
   * GET /media-collab/public/:token/assets/:assetId/comments
   */
  @Get(":token/assets/:assetId/comments")
  @ApiOperation({ summary: "Get asset comments via public link (no auth required)" })
  @ApiResponse({ status: 200, description: "Comments retrieved successfully" })
  @ApiResponse({ status: 404, description: "Link not found or disabled" })
  async getPublicAssetComments(
    @Param("token") token: string,
    @Param("assetId") assetId: string,
  ) {
    // Validate public link is active
    await this.projectsService.getPublicProject(token);
    return await this.commentsService.findByAsset(assetId);
  }

  /**
   * Add a comment on an asset as a public guest (no auth required)
   *
   * POST /media-collab/public/:token/assets/:assetId/comments
   * Body: { content, guestName, timecode?, parentId? }
   *
   * Uses the project creator's userId as authorId (DB constraint).
   * The comment text is prefixed with "[GuestName]: " so internal
   * reviewers know who left the feedback.
   */
  @Post(":token/assets/:assetId/comments")
  @ApiOperation({ summary: "Add a guest comment via public link (no auth required)" })
  @ApiResponse({ status: 201, description: "Comment created successfully" })
  @ApiResponse({ status: 404, description: "Link not found or disabled" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Comment text" },
        guestName: { type: "string", description: "Reviewer's display name" },
        timecode: { type: "number", description: "Video timecode in seconds (optional)" },
        parentId: { type: "string", description: "Parent comment ID for replies (optional)" },
      },
      required: ["content", "guestName"],
    },
  })
  async createPublicComment(
    @Param("token") token: string,
    @Param("assetId") assetId: string,
    @Body() body: { content: string; guestName: string; timecode?: number; parentId?: string },
  ) {
    // Validate public link and get project creator's userId
    const project = await this.projectsService.getPublicProject(token);

    // IDOR guard: confirm the asset belongs to the project resolved by this token
    const asset = await this.assetsService.findOneRaw(assetId);
    if (!asset || asset.projectId !== project.id) {
      throw new NotFoundException("Asset not found");
    }

    const guestName = (body.guestName || "Anonymous").trim();
    const prefixedContent = `[${guestName}]: ${body.content}`;

    return await this.commentsService.create({
      assetId,
      content: prefixedContent,
      authorId: project.createdBy,
      timestamp: body.timecode,
      parentId: body.parentId,
    });
  }

  /**
   * Update asset status (public - no auth required)
   */
  @Put(":token/assets/:assetId/status")
  @ApiOperation({
    summary: "Update asset status via public link (no auth required)",
  })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  @ApiResponse({
    status: 404,
    description: "Link not found or asset not found",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "IN_REVIEW", "NEEDS_CHANGES", "APPROVED", "ARCHIVED"],
          description: "New status for the asset",
        },
      },
      required: ["status"],
    },
  })
  async updatePublicAssetStatus(
    @Param("token") token: string,
    @Param("assetId") assetId: string,
    @Body("status") status: string,
  ) {
    // Verify token is valid and get project
    const project = await this.projectsService.getPublicProject(token);

    // IDOR guard: confirm the asset belongs to the project resolved by this token
    const asset = await this.assetsService.findOneRaw(assetId);
    if (!asset || asset.projectId !== project.id) {
      throw new NotFoundException("Asset not found");
    }

    // Update asset status (using guest user ID from project creator)
    return await this.assetsService.updateStatus(
      assetId,
      project.createdBy,
      status,
    );
  }

  /**
   * Update asset star rating (public - no auth required)
   */
  @Put(":token/assets/:assetId/rating")
  @ApiOperation({
    summary: "Update asset star rating via public link (no auth required)",
  })
  @ApiResponse({ status: 200, description: "Rating updated successfully" })
  @ApiResponse({
    status: 404,
    description: "Link not found or asset not found",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        starRating: {
          type: "number",
          minimum: 0,
          maximum: 5,
          description: "Star rating (0-5, where 0 means no rating)",
        },
      },
      required: ["starRating"],
    },
  })
  async updatePublicAssetRating(
    @Param("token") token: string,
    @Param("assetId") assetId: string,
    @Body("starRating") starRating: number,
  ) {
    // Verify token is valid and get project
    const project = await this.projectsService.getPublicProject(token);

    // IDOR guard: confirm the asset belongs to the project resolved by this token
    const asset = await this.assetsService.findOneRaw(assetId);
    if (!asset || asset.projectId !== project.id) {
      throw new NotFoundException("Asset not found");
    }

    // Update star rating (using guest user ID from project creator)
    return await this.metadataService.updateStarRating(
      assetId,
      starRating,
      project.createdBy,
    );
  }

  /**
   * Create an async bulk download job via public link (no auth required)
   *
   * POST /media-collab/public/:token/async-bulk-download
   * Body: { assetIds: string[], zipFilename?: string }
   * Returns: { jobId, status, totalFiles }
   */
  @Post(":token/async-bulk-download")
  @ApiOperation({
    summary: "Create async bulk download job via public link (no auth required)",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        assetIds: { type: "array", items: { type: "string" } },
        zipFilename: { type: "string" },
      },
      required: ["assetIds"],
    },
  })
  @ApiResponse({ status: 201, description: "Job created, poll for status" })
  @ApiResponse({ status: 404, description: "Share link not found or no assets" })
  async createPublicBulkDownloadJob(
    @Param("token") token: string,
    @Body() body: { assetIds: string[]; zipFilename?: string },
  ) {
    return this.bulkDownloadService.createPublicJob(token, body.assetIds, body.zipFilename);
  }

  /**
   * Poll async bulk download job status via public link (no auth required)
   *
   * GET /media-collab/public/:token/async-bulk-download/:jobId
   */
  @Get(":token/async-bulk-download/:jobId")
  @ApiOperation({
    summary: "Poll bulk download job status via public link (no auth required)",
  })
  @ApiResponse({ status: 200, description: "Job status returned" })
  @ApiResponse({ status: 404, description: "Job not found" })
  async getPublicBulkDownloadJobStatus(
    @Param("token") token: string,
    @Param("jobId") jobId: string,
  ) {
    return this.bulkDownloadService.getPublicJobStatus(jobId, token);
  }
}
