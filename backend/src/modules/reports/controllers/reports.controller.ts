import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SocialMediaReportService } from '../services/social-media-report.service';
import { PDFGeneratorService } from '../services/pdf-generator.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { AddSectionDto } from '../dto/add-section.dto';
import { UpdateVisualizationsDto } from '../dto/update-visualizations.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: SocialMediaReportService,
    private readonly pdfGeneratorService: PDFGeneratorService,
  ) {}

  // Reports CRUD
  @Post()
  async createReport(@Body() dto: CreateReportDto) {
    return this.reportsService.createReport(dto);
  }

  @Get()
  async getReports(
    @Query('projectId') projectId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.findAll({
      projectId,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      status,
    });
  }

  @Get(':id')
  async getReport(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Delete(':id')
  async deleteReport(@Param('id') id: string) {
    return this.reportsService.deleteReport(id);
  }

  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'DRAFT' | 'COMPLETED' | 'SENT',
  ) {
    return this.reportsService.updateStatus(id, status);
  }

  // Sections
  @Post(':id/sections')
  @UseInterceptors(FileInterceptor('csvFile'))
  async addSection(
    @Param('id') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddSectionDto,
  ) {
    return this.reportsService.addSection(reportId, file, dto);
  }

  @Delete(':id/sections/:sid')
  async removeSection(
    @Param('id') reportId: string,
    @Param('sid') sectionId: string,
  ) {
    return this.reportsService.removeSection(sectionId);
  }

  @Post(':id/sections/reorder')
  async reorderSections(
    @Param('id') reportId: string,
    @Body('sectionIds') sectionIds: string[],
  ) {
    return this.reportsService.reorderSections(reportId, sectionIds);
  }

  // Visualizations
  @Patch(':id/sections/:sid/visualizations')
  async updateVisualizations(
    @Param('id') reportId: string,
    @Param('sid') sectionId: string,
    @Body() dto: UpdateVisualizationsDto,
  ) {
    return this.reportsService.updateVisualizations(sectionId, dto);
  }

  // Layout (NEW - for visual report builder)
  @Patch(':id/sections/:sid/layout')
  async updateLayout(
    @Param('id') reportId: string,
    @Param('sid') sectionId: string,
    @Body('layout') layout: any,
  ) {
    return this.reportsService.updateLayout(sectionId, layout);
  }

  // PDF Generation
  @Post(':id/generate-pdf')
  async generatePDF(
    @Param('id') id: string,
    @Body() body: {
      sectionId?: string; // NEW: Section ID for visual builder PDF generation
      renderedHTML?: string; // OLD: Legacy snapshot approach
      styles?: string;
      dimensions?: { width: number; rowHeight: number; cols: number };
    },
    @Res() res: Response,
  ) {
    console.log('📥 Received PDF generation request:', { id, body, hasSectionId: !!body.sectionId });
    let pdfBuffer: Buffer;

    // ✅ NEW: Server-side rendering from data (RELIABLE - Industry Standard)
    if (body.sectionId) {
      console.log('✅ Generating single-section PDF from visual builder (server-side template mode)');
      pdfBuffer = await this.pdfGeneratorService.generatePDFFromData(id, body.sectionId);
    }
    // Legacy snapshot approach (kept for backward compatibility)
    else if (body.renderedHTML && body.styles && body.dimensions) {
      console.log('📊 Generating PDF from HTML snapshot (legacy mode)');
      pdfBuffer = await this.pdfGeneratorService.generatePDFFromSnapshot(id, {
        renderedHTML: body.renderedHTML,
        styles: body.styles,
        dimensions: body.dimensions,
      });
    }
    // ✅ NEW: Full multi-section report using server-side templates
    else {
      console.log('✅ Generating full multi-section report PDF (server-side template mode)');
      pdfBuffer = await this.pdfGeneratorService.generateFullReportPDFFromData(id);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Get(':id/download-pdf')
  async downloadPDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfGeneratorService.generateReportPDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }
}
