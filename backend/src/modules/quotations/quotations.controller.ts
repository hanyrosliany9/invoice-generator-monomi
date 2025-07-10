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
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';
import { InvoicesService } from '../invoices/invoices.service';

@ApiTags('quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Buat quotation baru' })
  create(@Body() createQuotationDto: CreateQuotationDto, @Request() req) {
    return this.quotationsService.create(createQuotationDto, req.user.id);
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
    @Body() body: { status: string },
  ) {
    // Convert lowercase status to uppercase enum
    const normalizedStatus = body.status.toUpperCase() as QuotationStatus;
    return this.quotationsService.updateStatus(id, normalizedStatus);
  }

  @Post(':id/generate-invoice')
  @ApiOperation({ summary: 'Generate invoice dari quotation yang disetujui' })
  @ApiResponse({
    status: 201,
    description: 'Invoice berhasil dibuat dari quotation',
    schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Quotation belum disetujui atau sudah memiliki invoice',
  })
  @ApiResponse({
    status: 404,
    description: 'Quotation tidak ditemukan',
  })
  async generateInvoice(@Param('id') id: string, @Request() req) {
    const invoice = await this.invoicesService.createFromQuotation(id, req.user.id);
    return {
      invoiceId: invoice.id,
      message: 'Invoice berhasil dibuat dari quotation',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus quotation (hanya draft)' })
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}