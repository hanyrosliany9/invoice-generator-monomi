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
    return this.service.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateSceneDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
