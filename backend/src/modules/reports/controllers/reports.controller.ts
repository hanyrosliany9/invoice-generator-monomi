import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Res,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { ReportStatus } from "@prisma/client";
import { ApiBearerAuth } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RequireAdmin } from "../../auth/decorators/auth.decorators";
import { SocialMediaReportService } from "../services/social-media-report.service";
import { PDFGeneratorService } from "../services/pdf-generator.service";
import { CreateReportDto } from "../dto/create-report.dto";
import { AddSectionDto, UpdateSectionDto } from "../dto/add-section.dto";
import { UpdateVisualizationsDto } from "../dto/update-visualizations.dto";
import { DuplicateReportDto, UpdateReportDto } from "../dto/update-report.dto";
import { ManualSectionDto } from "../dto/manual-section.dto";
import {
  REPORT_TEMPLATES,
  findTemplate,
  templateToCsv,
  templateToXlsx,
} from "../utils/report-templates";

const CSV_UPLOAD_OPTIONS = {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (
        _req: unknown,
        file: Express.Multer.File,
        cb: (error: Error | null, accept: boolean) => void,
      ) => {
        const allowedMimeTypes = [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        const allowedExtensions = /\.(csv|xlsx?)$/i;
        const mimeOk = allowedMimeTypes.includes(file.mimetype);
        const extOk = allowedExtensions.test(file.originalname);
        if (mimeOk || extOk) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Format file tidak didukung. Unggah file CSV (.csv) atau Excel (.xlsx / .xls).",
            ),
            false,
          );
        }
      },
    };

@Controller("reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: SocialMediaReportService,
    private readonly pdfGeneratorService: PDFGeneratorService,
  ) {}

  // Reports CRUD
  @Post()
  @RequireAdmin()
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

  /** Starter files (CSV / XLSX) with the expected column headers. */
  @Get("templates")
  listTemplates() {
    return REPORT_TEMPLATES.map(({ key, title, description, headers }) => ({
      key,
      title,
      description,
      headers,
    }));
  }

  @Get("templates/:key")
  downloadTemplate(
    @Param("key") key: string,
    @Query("format") format: string | undefined,
    @Res() res: Response,
  ) {
    const template = findTemplate(key);
    if (!template) {
      throw new NotFoundException("Template tidak ditemukan");
    }
    const xlsx = format !== "csv";
    res.setHeader(
      "Content-Type",
      xlsx
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="template-${template.key}.${xlsx ? "xlsx" : "csv"}"`,
    );
    res.send(xlsx ? templateToXlsx(template) : templateToCsv(template));
  }

  /** Parse a file and describe what would be imported, without saving. */
  @Post("parse-preview")
  @RequireAdmin()
  @UseInterceptors(FileInterceptor("csvFile", CSV_UPLOAD_OPTIONS))
  async previewFile(
    @UploadedFile() file: Express.Multer.File,
    @Body("reportId") reportId?: string,
    @Body("sectionId") sectionId?: string,
  ) {
    return this.reportsService.previewFile(file, {
      reportId: typeof reportId === "string" && reportId !== "" ? reportId : undefined,
      sectionId: typeof sectionId === "string" && sectionId !== "" ? sectionId : undefined,
    });
  }

  @Get(":id")
  async getReport(@Param("id") id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(":id")
  @RequireAdmin()
  async updateReport(@Param("id") id: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.updateReport(id, dto);
  }

  /** Copy structure (no data) to the next free month, as a new DRAFT. */
  @Post(":id/duplicate")
  @RequireAdmin()
  async duplicateReport(
    @Param("id") id: string,
    @Body() dto: DuplicateReportDto,
  ) {
    return this.reportsService.duplicateReport(id, dto);
  }

  /** Who "Kirim ke klien" would email. */
  @Get(":id/send-recipients")
  @RequireAdmin()
  async getSendRecipients(@Param("id") id: string) {
    return this.reportsService.getSendRecipients(id);
  }

  @Post(":id/send")
  @RequireAdmin()
  async sendToClient(@Param("id") id: string) {
    return this.reportsService.sendToClient(id);
  }

  @Delete(":id")
  @RequireAdmin()
  async deleteReport(@Param("id") id: string) {
    return this.reportsService.deleteReport(id);
  }

  @Post(":id/status")
  @RequireAdmin()
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: ReportStatus,
  ) {
    return this.reportsService.updateStatus(id, status);
  }

  // Sections
  @Post(":id/sections")
  @RequireAdmin()
  @UseInterceptors(FileInterceptor("csvFile", CSV_UPLOAD_OPTIONS))
    async addSection(
    @Param("id") reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddSectionDto,
  ) {
    if (!file) {
      throw new BadRequestException("Pilih file CSV atau Excel terlebih dahulu.");
    }
    return this.reportsService.addSection(reportId, file, dto);
  }

  /** Add a section typed into the grid / headline-numbers form (no file). */
  @Post(":id/sections/manual")
  @RequireAdmin()
  async addManualSection(
    @Param("id") reportId: string,
    @Body() dto: ManualSectionDto,
  ) {
    return this.reportsService.addManualSection(reportId, dto);
  }

  /** Replace a section's data from the grid editor (also fixes a wrong cell). */
  @Put(":id/sections/:sid/data")
  @RequireAdmin()
  async replaceManualData(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @Body() dto: ManualSectionDto,
  ) {
    return this.reportsService.replaceManualData(reportId, sectionId, dto);
  }

  /** Replace the data of a section (keeps title, description, charts). */
  @Post(":id/sections/:sid/data")
  @RequireAdmin()
  @UseInterceptors(FileInterceptor("csvFile", CSV_UPLOAD_OPTIONS))
  async replaceSectionData(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reportsService.replaceSectionData(reportId, sectionId, file);
  }

  /** Rename a section / change its description. */
  @Patch(":id/sections/:sid")
  @RequireAdmin()
  async updateSection(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.reportsService.updateSection(reportId, sectionId, dto);
  }

  @Delete(":id/sections/:sid")
  @RequireAdmin()
  async removeSection(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
  ) {
    return this.reportsService.removeSection(reportId, sectionId);
  }

  @Post(":id/sections/reorder")
  @RequireAdmin()
  async reorderSections(
    @Param("id") reportId: string,
    @Body("sectionIds") sectionIds: string[],
  ) {
    return this.reportsService.reorderSections(reportId, sectionIds);
  }

  // Visualizations
  @Patch(":id/sections/:sid/visualizations")
  @RequireAdmin()
  async updateVisualizations(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @Body() dto: UpdateVisualizationsDto,
  ) {
    return this.reportsService.updateVisualizations(reportId, sectionId, dto);
  }

  // Layout (NEW - for visual report builder)
  @Patch(":id/sections/:sid/layout")
  @RequireAdmin()
  async updateLayout(
    @Param("id") reportId: string,
    @Param("sid") sectionId: string,
    @Body("layout") layout: any,
  ) {
    return this.reportsService.updateLayout(reportId, sectionId, layout);
  }

  // PDF Generation (Template-Based Only - Legacy Removed)
  @Post(":id/generate-pdf")
  @RequireAdmin()
  // Each render is a Chromium process; same budget style as the portal route.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
