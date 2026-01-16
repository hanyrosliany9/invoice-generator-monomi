import { Controller, UseGuards, Post, Body, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ComparisonService } from "../services/comparison.service";
import { AuthenticatedRequest } from "../types/authenticated-request.interface";

/**
 * ComparisonController
 *
 * Handles side-by-side asset comparison endpoints.
 * Supports comparing multiple assets or multiple versions.
 */
@ApiTags("Media Collaboration - Comparison")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media-collab/compare")
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Post("assets")
  @ApiOperation({ summary: "Compare 2-4 assets side-by-side" })
  @ApiResponse({
    status: 200,
    description: "Comparison data returned successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid number of assets or mixed media types",
  })
  @ApiResponse({
    status: 403,
    description: "Access denied to one or more assets",
  })
  @ApiResponse({ status: 404, description: "One or more assets not found" })
  async compareAssets(
    @Body() body: { assetIds: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comparisonService.compareAssets(body.assetIds, req.user.id);
  }

  @Post("versions")
  @ApiOperation({ summary: "Compare multiple versions of an asset" })
  @ApiResponse({
    status: 200,
    description: "Version comparison data returned successfully",
  })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Asset or versions not found" })
  async compareVersions(
    @Body() body: { assetId: string; versionNumbers: number[] },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comparisonService.compareVersions(
      body.assetId,
      body.versionNumbers,
      req.user.id,
    );
  }
}
