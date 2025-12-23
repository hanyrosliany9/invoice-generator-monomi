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
    return this.service.create(req.user.id, dto);
  }

  @Get()
  async findBySchedule(@Query('scheduleId') scheduleId?: string) {
    if (!scheduleId) {
      return this.service.findAll();
    }
    return this.service.findBySchedule(scheduleId);
  }

  /**
   * Search for addresses using Nominatim (proxy to avoid CORS)
   */
  @Get('search/addresses')
  async searchAddresses(@Query('q') query: string) {
    return this.service.searchAddresses(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCallSheetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // Cast endpoints
  @Post(':id/cast')
  async addCast(@Param('id') id: string, @Body() dto: Omit<CreateCastCallDto, 'callSheetId'>) {
    return this.service.addCast({ ...dto, callSheetId: id });
  }

  @Put('cast/:id')
  async updateCast(@Param('id') id: string, @Body() dto: UpdateCastCallDto) {
    return this.service.updateCast(id, dto);
  }

  @Delete('cast/:id')
  async removeCast(@Param('id') id: string) {
    return this.service.removeCast(id);
  }

  // Crew endpoints
  @Post(':id/crew')
  async addCrew(@Param('id') id: string, @Body() dto: Omit<CreateCrewCallDto, 'callSheetId'>) {
    return this.service.addCrew({ ...dto, callSheetId: id });
  }

  @Put('crew/:id')
  async updateCrew(@Param('id') id: string, @Body() dto: UpdateCrewCallDto) {
    return this.service.updateCrew(id, dto);
  }

  @Delete('crew/:id')
  async removeCrew(@Param('id') id: string) {
    return this.service.removeCrew(id);
  }

  // ============ AUTO-FILL ENDPOINTS ============

  /**
   * Auto-fill all external data (weather, sun times, hospital)
   */
  @Post(':id/auto-fill')
  async autoFillCallSheet(@Param('id') id: string) {
    return this.service.autoFillCallSheet(id);
  }

  /**
   * Auto-fill only weather data
   */
  @Post(':id/auto-fill/weather')
  async autoFillWeather(@Param('id') id: string) {
    return this.service.autoFillWeather(id);
  }

  /**
   * Auto-fill only sun times
   */
  @Post(':id/auto-fill/sun-times')
  async autoFillSunTimes(@Param('id') id: string) {
    return this.service.autoFillSunTimes(id);
  }

  /**
   * Auto-fill only hospital information
   */
  @Post(':id/auto-fill/hospital')
  async autoFillHospital(@Param('id') id: string) {
    return this.service.autoFillHospital(id);
  }

  /**
   * Search for hospitals near the location (preview, no save)
   */
  @Get(':id/search-hospitals')
  async searchHospitals(@Param('id') id: string) {
    return this.service.searchHospitals(id);
  }

  // ============ END AUTO-FILL ENDPOINTS ============

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
