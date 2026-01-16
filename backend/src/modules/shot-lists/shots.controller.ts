import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ShotsService } from "./shots.service";
import { CreateShotDto } from "./dto/create-shot.dto";
import { UpdateShotDto } from "./dto/update-shot.dto";
import { ReorderShotsDto } from "./dto/reorder-shots.dto";

@Controller("shots")
@UseGuards(JwtAuthGuard)
export class ShotsController {
  constructor(private readonly service: ShotsService) {}

  @Post()
  async create(@Body() dto: CreateShotDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateShotDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post("reorder/:sceneId")
  async reorder(
    @Param("sceneId") sceneId: string,
    @Body() dto: ReorderShotsDto,
  ) {
    return this.service.reorder(sceneId, dto);
  }

  @Post(":id/duplicate")
  async duplicate(@Param("id") id: string) {
    return this.service.duplicate(id);
  }
}
