import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateScheduleDto) {
    const result = await this.service.create(req.user.id, dto);
    return { data: result };
  }

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return { data: this.service.findByProject(projectId) };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { data: this.service.findOne(id) };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>) {
    return { data: this.service.update(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/auto-schedule')
  autoSchedule(@Param('id') id: string, @Body('groupBy') groupBy: string) {
    return { data: this.service.autoSchedule(id, groupBy as any) };
  }

  @Get(':id/export/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.service.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="schedule-${id}.pdf"`,
    });
    res.send(pdf);
  }
}
