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
  create(@Body() dto: CreateStripDto) {
    return { data: this.service.create(dto) };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStripDto) {
    return { data: this.service.update(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('reorder')
  reorder(@Body() dto: ReorderStripsDto) {
    return this.service.reorder(dto);
  }
}
