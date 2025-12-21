import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CallSheetsService } from './call-sheets.service';
import { CreateCallSheetDto } from './dto/create-call-sheet.dto';
import { UpdateCallSheetDto } from './dto/update-call-sheet.dto';
import { CreateCastCallDto, UpdateCastCallDto } from './dto/create-cast-call.dto';
import { CreateCrewCallDto, UpdateCrewCallDto } from './dto/create-crew-call.dto';

@Controller('call-sheets')
@UseGuards(JwtAuthGuard)
export class CallSheetsController {
  constructor(private readonly service: CallSheetsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateCallSheetDto) {
    const result = await this.service.create(req.user.id, dto);
    return { data: result };
  }

  @Get()
  findBySchedule(@Query('scheduleId') scheduleId: string) {
    return { data: this.service.findBySchedule(scheduleId) };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { data: this.service.findOne(id) };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCallSheetDto) {
    return { data: this.service.update(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // Cast endpoints
  @Post(':id/cast')
  addCast(@Param('id') id: string, @Body() dto: Omit<CreateCastCallDto, 'callSheetId'>) {
    return { data: this.service.addCast({ ...dto, callSheetId: id }) };
  }

  @Put('cast/:id')
  updateCast(@Param('id') id: string, @Body() dto: UpdateCastCallDto) {
    return { data: this.service.updateCast(id, dto) };
  }

  @Delete('cast/:id')
  removeCast(@Param('id') id: string) {
    return this.service.removeCast(id);
  }

  // Crew endpoints
  @Post(':id/crew')
  addCrew(@Param('id') id: string, @Body() dto: Omit<CreateCrewCallDto, 'callSheetId'>) {
    return { data: this.service.addCrew({ ...dto, callSheetId: id }) };
  }

  @Put('crew/:id')
  updateCrew(@Param('id') id: string, @Body() dto: UpdateCrewCallDto) {
    return { data: this.service.updateCrew(id, dto) };
  }

  @Delete('crew/:id')
  removeCrew(@Param('id') id: string) {
    return this.service.removeCrew(id);
  }

  @Get(':id/export/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.service.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="call-sheet-${id}.pdf"`,
    });
    res.send(pdf);
  }
}
