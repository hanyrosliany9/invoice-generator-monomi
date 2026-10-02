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
import { streamContentMedia } from "./content-media-stream.util";

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
    await streamContentMedia(this.mediaService, key, req, res);
  }
}
