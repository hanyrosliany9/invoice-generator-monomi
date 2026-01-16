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
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { SocialMediaReportService } from "../services/social-media-report.service";
import { PDFGeneratorService } from "../services/pdf-generator.service";
import { CreateReportDto } from "../dto/create-report.dto";
import { AddSectionDto } from "../dto/add-section.dto";
import { UpdateVisualizationsDto } from "../dto/update-visualizations.dto";

@Controller("reports")
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
    @Query("projectId") projectId?: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
    @Query("status") status?: string,
  ) {
    return this.reportsService.findAll({
      projectId,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      status,
    });
  }

  @Get(":id")
  async getReport(@Param("id") id: string) {
    return this.reportsService.findOne(id);
  }

  @Delete(":id")
  async deleteReport(@Param("id") id: string) {
    return this.reportsService.deleteReport(id);
  }

  @Post(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: "DRAFT" | "COMPLETED" | "SENT",
  ) {
    return this.reportsService.updateStatus(id, status);
  }

  // Sections
  @Post(":id/sections")
  @UseInterceptors(FileInterceptor("csvFile"))
  async addSection(
    @Param("id") reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddSectionDto,
  ) {
    return this.reportsService.addSection(reportId, file, dto);
  }

  @Delete(":id/sections/:sid")
  async removeSection(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
  ) {
    return this.reportsService.removeSection(sectionId);
  }

  @Post(":id/sections/reorder")
  async reorderSections(
    @Param("id") reportId: string,
    @Body("sectionIds") sectionIds: string[],
  ) {
    return this.reportsService.reorderSections(reportId, sectionIds);
  }

  // Visualizations
  @Patch(":id/sections/:sid/visualizations")
  async updateVisualizations(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @Body() dto: UpdateVisualizationsDto,
  ) {
    return this.reportsService.updateVisualizations(sectionId, dto);
  }

  // Layout (NEW - for visual report builder)
  @Patch(":id/sections/:sid/layout")
  async updateLayout(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @Body("layout") layout: any,
  ) {
    return this.reportsService.updateLayout(sectionId, layout);
  }

  // PDF Generation (Template-Based Only - Legacy Removed)
  @Post(":id/generate-pdf")
  async generatePDF(
    @Param("id") id: string,
    @Body()
    body: {
      sectionId?: string; // Optional: Generate single section PDF
    },
    @Res() res: Response,
  ) {
    console.log("📥 PDF generation request:", {
      id,
      sectionId: body.sectionId || "full-report",
    });

    let pdfBuffer: Buffer;

    // Single-section PDF (visual builder)
    if (body.sectionId) {
      console.log("✅ Generating single-section PDF (template-based)");
      pdfBuffer = await this.pdfGeneratorService.generatePDFFromData(
        id,
        body.sectionId,
      );
    }
    // Full multi-section report PDF
    else {
      console.log(
        "✅ Generating full multi-section report PDF (template-based)",
      );
      pdfBuffer =
        await this.pdfGeneratorService.generateFullReportPDFFromData(id);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }
}
