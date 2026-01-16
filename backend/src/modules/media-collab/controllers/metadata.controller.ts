import {
  Controller,
  UseGuards,
  Put,
  Post,
  Body,
  Param,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MetadataService } from "../services/metadata.service";
import { UpdateMetadataDto } from "../dto/update-metadata.dto";
import { UpdateStarRatingDto } from "../dto/update-star-rating.dto";
import { BulkUpdateStarRatingDto } from "../dto/bulk-update-star-rating.dto";
import { AuthenticatedRequest } from "../types/authenticated-request.interface";

@ApiTags("Media Collaboration - Metadata")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media-collab/metadata")
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Put(":assetId")
  @ApiOperation({ summary: "Update asset metadata" })
  async updateMetadata(
    @Param("assetId") assetId: string,
    @Body() updateDto: UpdateMetadataDto,
  ) {
    return this.metadataService.createOrUpdateMetadata(assetId, updateDto);
  }

  @Put(":assetId/star-rating")
  @ApiOperation({ summary: "Update star rating for an asset" })
  async updateStarRating(
    @Param("assetId") assetId: string,
    @Body() updateDto: UpdateStarRatingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.metadataService.updateStarRating(
      assetId,
      updateDto.starRating,
      req.user.id,
    );
  }

  @Post("bulk/star-rating")
  @ApiOperation({ summary: "Bulk update star rating for multiple assets" })
  async bulkUpdateStarRating(
    @Body() bulkDto: BulkUpdateStarRatingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.metadataService.bulkUpdateStarRating(
      bulkDto.assetIds,
      bulkDto.starRating,
      req.user.id,
    );
  }

  @Post("bulk/metadata")
  @ApiOperation({ summary: "Bulk update metadata for multiple assets" })
  async bulkUpdateMetadata(
    @Body() body: { assetIds: string[]; metadata: UpdateMetadataDto },
  ) {
    return this.metadataService.bulkUpdateMetadata(
      body.assetIds,
      body.metadata,
    );
  }
}
