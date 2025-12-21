import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';

@Controller('shot-list-scenes')
@UseGuards(JwtAuthGuard)
export class ScenesController {
  constructor(private readonly service: ScenesService) {}

  @Post()
  async create(@Body() dto: CreateSceneDto) {
    const result = await this.service.create(dto);
    return { data: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { data: result };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateSceneDto>) {
    const result = await this.service.update(id, dto);
    return { data: result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.service.remove(id);
    return result;
  }
}
