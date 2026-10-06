import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ContentPlatform, UserRole } from "@prisma/client";
import { ArrayMaxSize, IsArray, IsEnum, IsOptional } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SocialPublishingService } from "./social-publishing.service";

export class PublishNowDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(ContentPlatform, { each: true })
  targets?: ContentPlatform[];
}

/**
 * Staff endpoints for auto-publishing (phase 1: internal client only).
 * Publishing and the Meta connection check are admin-only; reading the
 * (secret-free) configuration status and an item's publications is open to
 * every authenticated staff member who can see the calendar.
 */
@ApiTags("Social Publishing")
@ApiBearerAuth()
@Controller("social-publishing")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SocialPublishingController {
  constructor(private readonly service: SocialPublishingService) {}

  @Get("status")
  @ApiOperation({
    summary: "Auto-publish configuration status (no Meta call, no secrets)",
  })
  status(@Request() req: any) {
    // The raw reason names server settings: admins only.
    const admin = req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.ADMIN;
    return this.service.status(admin);
  }

  @Get("connection")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Check the Meta connection (token, Page, Instagram account, quota) — read-only",
  })
  connection(@Query("refresh") refresh?: string) {
    return this.service.checkConnection(refresh === "1" || refresh === "true");
  }

  @Get("items/:id")
  @ApiOperation({ summary: "Per-platform publishing status of a content item" })
  publications(@Param("id") id: string) {
    return this.service.listPublications(id);
  }

  @Post("items/:id/publish")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: "Publish a content item to Instagram / Facebook now",
  })
  publishNow(
    @Param("id") id: string,
    @Body() body: PublishNowDto,
    @Request() req: any,
  ) {
    return this.service.requestPublish(
      id,
      { id: req.user.id, role: req.user.role },
      { targets: body?.targets },
    );
  }

  @Post("items/:id/retry")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Retry failed platforms of a content item" })
  retry(
    @Param("id") id: string,
    @Body() body: PublishNowDto,
    @Request() req: any,
  ) {
    return this.service.requestPublish(
      id,
      { id: req.user.id, role: req.user.role },
      { targets: body?.targets, retry: true },
    );
  }
}
