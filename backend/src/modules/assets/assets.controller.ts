import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { AssetStatus } from "@prisma/client";

@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @RequireAdmin()
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: AssetStatus,
    @Query("category") category?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.assetsService.findAll(pageNum, limitNum, status, category);
  }

  @Get("stats")
  getStats() {
    return this.assetsService.getAssetStats();
  }

  /**
   * ✅ Backfill asset purchase journal entries
   * Creates journal entries for existing assets that don't have them
   */
  @Post("backfill-journal-entries")
  @RequireAdmin()
  async backfillJournalEntries(@Req() req: any) {
    return this.assetsService.backfillAssetJournalEntries(req.user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(":id")
  @RequireAdmin()
  update(@Param("id") id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(":id")
  @RequireAdmin()
  remove(@Param("id") id: string) {
    return this.assetsService.remove(id);
  }

  @Post(":id/reserve")
  reserve(@Param("id") id: string, @Body() reserveDto: any) {
    return this.assetsService.reserve(id, reserveDto);
  }

  @Post(":id/checkout")
  checkOut(@Param("id") id: string, @Body() body: any) {
    return this.assetsService.checkOut(id, body.userId, body.projectId);
  }

  @Post(":id/checkin")
  checkIn(@Param("id") id: string, @Body() body: any) {
    return this.assetsService.checkIn(id, body.condition, body.notes);
  }
}
