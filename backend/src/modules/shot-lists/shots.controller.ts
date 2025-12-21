import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShotsService } from './shots.service';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { ReorderShotsDto } from './dto/reorder-shots.dto';

@Controller('shots')
@UseGuards(JwtAuthGuard)
export class ShotsController {
  constructor(private readonly service: ShotsService) {}

  @Post()
  async create(@Body() dto: CreateShotDto) {
    const result = await this.service.create(dto);
    return { data: result };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateShotDto) {
    const result = await this.service.update(id, dto);
    return { data: result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.service.remove(id);
    return result;
  }

  @Post('reorder/:sceneId')
  async reorder(@Param('sceneId') sceneId: string, @Body() dto: ReorderShotsDto) {
    const result = await this.service.reorder(sceneId, dto);
    return { data: result };
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    const result = await this.service.duplicate(id);
    return { data: result };
  }
}
