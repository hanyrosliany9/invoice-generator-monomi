import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
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
    return this.service.create(req.user.id, dto);
  }

  @Get()
  async findByProject(@Query('projectId') projectId: string) {
    return this.service.findByProject(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateShotListDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
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
