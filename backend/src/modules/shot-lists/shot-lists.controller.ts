import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShotListsService } from './shot-lists.service';
import { CreateShotListDto } from './dto/create-shot-list.dto';

@Controller('shot-lists')
@UseGuards(JwtAuthGuard)
export class ShotListsController {
  constructor(private readonly service: ShotListsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateShotListDto) {
    const result = await this.service.create(req.user.id, dto);
    return { data: result };
  }

  @Get()
  async findByProject(@Query('projectId') projectId: string) {
    const result = await this.service.findByProject(projectId);
    return { data: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { data: result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.service.remove(id);
    return result;
  }

  @Get(':id/export/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.service.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="shot-list-${id}.pdf"`,
    });
    res.send(pdf);
  }
}
