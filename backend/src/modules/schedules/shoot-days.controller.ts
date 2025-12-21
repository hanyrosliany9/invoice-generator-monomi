import { Controller, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShootDaysService } from './shoot-days.service';
import { CreateShootDayDto } from './dto/create-shoot-day.dto';

@Controller('schedules/days')
@UseGuards(JwtAuthGuard)
export class ShootDaysController {
  constructor(private readonly service: ShootDaysService) {}

  @Post()
  create(@Body() dto: CreateShootDayDto) {
    return { data: this.service.create(dto) };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateShootDayDto>) {
    return { data: this.service.update(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
