import { Controller, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripsService } from './strips.service';
import { CreateStripDto } from './dto/create-strip.dto';
import { UpdateStripDto } from './dto/update-strip.dto';
import { ReorderStripsDto } from './dto/reorder-strips.dto';

@Controller('schedules/strips')
@UseGuards(JwtAuthGuard)
export class StripsController {
  constructor(private readonly service: StripsService) {}

  @Post()
  async create(@Body() dto: CreateStripDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStripDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('reorder')
  async reorder(@Body() dto: ReorderStripsDto) {
    return this.service.reorder(dto);
  }

  @Post(':stripId/insert-meal')
  async insertMealBreak(
    @Param('stripId') stripId: string,
    @Body() data: { mealType: string; mealTime: string; mealDuration?: number; mealLocation?: string }
  ) {
    return this.service.insertMealBreak(stripId, data);
  }

  @Post(':stripId/insert-move')
  async insertCompanyMove(
    @Param('stripId') stripId: string,
    @Body() data: { moveTime: string; moveFromLocation: string; moveToLocation: string; moveTravelTime?: number; moveNotes?: string }
  ) {
    return this.service.insertCompanyMove(stripId, data);
  }
}
