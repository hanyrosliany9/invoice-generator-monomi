import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  BadRequestException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { ContentCalendarService } from "./content-calendar.service";
import { MediaService } from "../media/media.service";

/**
 * Public, no-auth controller for the per-client content-planner share.
 *
 * There is no class-level guard, so these routes are reachable with just the
 * share token — anyone with the link can view that client's content (and only
 * that client's content). Media is streamed through the backend (works in dev
 * and prod) after verifying the key belongs to the shared client.
 */
@ApiTags("Content Planner Public Share")
@Controller("content-calendar/public")
export class ContentPublicController {
  constructor(
    private readonly contentCalendarService: ContentCalendarService,
    private readonly mediaService: MediaService,
  ) {}

  @Get(":token")
  @ApiOperation({ summary: "Get a client's shared content planner (no auth)" })
  @ApiParam({ name: "token", description: "Public share token" })
  async getPublicContent(@Param("token") token: string) {
    return this.contentCalendarService.getPublicContent(token);
  }

  @Get(":token/media")
  @ApiOperation({ summary: "Stream a media file for a shared content planner (no auth)" })
  @ApiParam({ name: "token", description: "Public share token" })
  @ApiQuery({ name: "key", description: "R2 object key", required: true })
  async getPublicMedia(
    @Param("token") token: string,
    @Query("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!key) {
      throw new BadRequestException("No media key provided");
    }
    // Throws if the share is invalid/disabled or the key isn't this client's.
    await this.contentCalendarService.assertPublicMediaAccess(token, key);

    const rangeHeader = req.headers["range"] as string | undefined;
    const { stream, contentType, contentLength, originalName, statusCode, contentRange } =
      await this.mediaService.getFileStream(key, { range: rangeHeader });

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "private, max-age=3600, must-revalidate");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }
    if (originalName) {
      const encoded = encodeURIComponent(originalName);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${originalName}"; filename*=UTF-8''${encoded}`,
      );
    }
    res.status(statusCode || 200);
    stream.pipe(res);
  }
}
