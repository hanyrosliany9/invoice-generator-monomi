import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

@ApiTags('quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Buat quotation baru' })
  create(@Body() createQuotationDto: CreateQuotationDto, @Request() req) {
    return this.quotationsService.create(createQuotationDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Dapatkan daftar quotation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: QuotationStatus })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: QuotationStatus,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.quotationsService.findAll(pageNum, limitNum, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Dapatkan statistik quotation' })
  getStats() {
    return this.quotationsService.getQuotationStats();
  }

  @Get('recent')
  @ApiOperation({ summary: 'Dapatkan quotation terbaru' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecent(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.quotationsService.getRecentQuotations(limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dapatkan detail quotation' })
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quotation' })
  update(@Param('id') id: string, @Body() updateQuotationDto: UpdateQuotationDto) {
    return this.quotationsService.update(id, updateQuotationDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status quotation' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: QuotationStatus },
  ) {
    return this.quotationsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus quotation (hanya draft)' })
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}