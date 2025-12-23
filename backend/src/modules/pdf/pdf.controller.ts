import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  NotFoundException,
  Logger,
  Request,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PdfService } from "./pdf.service";
import { InvoicesService } from "../invoices/invoices.service";
import { QuotationsService } from "../quotations/quotations.service";
import { ProjectsService } from "../projects/projects.service";
import { ExpensesService } from "../expenses/expenses.service";
import { SchedulesService } from "../schedules/schedules.service";
import { CallSheetsService } from "../call-sheets/call-sheets.service";
import { ShotListsService } from "../shot-lists/shot-lists.service";
import { SettingsService } from "../settings/settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PdfAccessGuard } from "./guards/pdf-access.guard";

@ApiTags("PDF")
@Controller("pdf")
@UseGuards(JwtAuthGuard, PdfAccessGuard)
@ApiBearerAuth()
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly invoicesService: InvoicesService,
    private readonly quotationsService: QuotationsService,
    private readonly projectsService: ProjectsService,
    private readonly expensesService: ExpensesService,
    private readonly schedulesService: SchedulesService,
    private readonly callSheetsService: CallSheetsService,
    private readonly shotListsService: ShotListsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get("invoice/:id")
  @ApiOperation({ summary: "Generate PDF for invoice" })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    schema: {
      type: "string",
      format: "binary",
    },
  })
  @ApiResponse({
    status: 404,
    description: "Invoice not found",
  })
  async generateInvoicePdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Query("showMaterai") showMaterai: string = "true",
    @Res() res: Response
  ) {
    try {
      // Get invoice data
      const invoice = await this.invoicesService.findOne(id);

      if (!invoice) {
        throw new NotFoundException("Invoice tidak ditemukan");
      }

      // Quick fix: Use current project priceBreakdown instead of stale snapshot
      if (invoice.project?.priceBreakdown) {
        invoice.priceBreakdown = invoice.project.priceBreakdown;
      }

      // Parse continuous parameter (default: true for digital viewing)
      const isContinuous = continuous === "true";
      const shouldShowMaterai = showMaterai === "true";

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice, isContinuous, shouldShowMaterai);

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Gagal membuat PDF invoice");
    }
  }

  @Get("quotation/:id")
  @ApiOperation({ summary: "Generate PDF for quotation" })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    schema: {
      type: "string",
      format: "binary",
    },
  })
  @ApiResponse({
    status: 404,
    description: "Quotation not found",
  })
  async generateQuotationPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      // Get quotation data
      const quotation = await this.quotationsService.findOne(id);

      if (!quotation) {
        throw new NotFoundException("Quotation tidak ditemukan");
      }

      // Quick fix: Use current project priceBreakdown instead of stale snapshot
      if (quotation.project?.priceBreakdown) {
        quotation.priceBreakdown = quotation.project.priceBreakdown;
      }

      // Parse continuous parameter (default: true for digital viewing)
      const isContinuous = continuous === "true";

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(quotation, isContinuous);

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Gagal membuat PDF quotation");
    }
  }

  @Get("invoice/:id/preview")
  @ApiOperation({ summary: "Preview invoice PDF in browser" })
  @ApiResponse({
    status: 200,
    description: "PDF preview generated successfully",
  })
  async previewInvoicePdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Query("showMaterai") showMaterai: string = "true",
    @Res() res: Response
  ) {
    try {
      // Get invoice data
      const invoice = await this.invoicesService.findOne(id);

      if (!invoice) {
        throw new NotFoundException("Invoice tidak ditemukan");
      }

      // Quick fix: Use current project priceBreakdown instead of stale snapshot
      if (invoice.project?.priceBreakdown) {
        invoice.priceBreakdown = invoice.project.priceBreakdown;
      }

      // Parse continuous parameter (default: true for digital viewing)
      const isContinuous = continuous === "true";
      const shouldShowMaterai = showMaterai === "true";

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice, isContinuous, shouldShowMaterai);

      // Set response headers for preview
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Gagal membuat preview PDF invoice");
    }
  }

  @Get("quotation/:id/preview")
  @ApiOperation({ summary: "Preview quotation PDF in browser" })
  @ApiResponse({
    status: 200,
    description: "PDF preview generated successfully",
  })
  async previewQuotationPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      // Get quotation data
      const quotation = await this.quotationsService.findOne(id);

      if (!quotation) {
        throw new NotFoundException("Quotation tidak ditemukan");
      }

      // Quick fix: Use current project priceBreakdown instead of stale snapshot
      if (quotation.project?.priceBreakdown) {
        quotation.priceBreakdown = quotation.project.priceBreakdown;
      }

      // Parse continuous parameter (default: true for digital viewing)
      const isContinuous = continuous === "true";

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(quotation, isContinuous);

      // Set response headers for preview
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="Quotation-${quotation.quotationNumber}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Gagal membuat preview PDF quotation");
    }
  }

  @Get("project/:id")
  @ApiOperation({ summary: "Generate PDF for project details report" })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    schema: {
      type: "string",
      format: "binary",
    },
  })
  @ApiResponse({
    status: 404,
    description: "Project not found",
  })
  async generateProjectPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response,
    @Request() req: any
  ) {
    try {
      // Get project data
      const project = await this.projectsService.findOne(id);

      if (!project) {
        throw new NotFoundException("Proyek tidak ditemukan");
      }

      // Fetch actual expenses for this project
      const expensesResponse = await this.expensesService.findAll(
        req.user.userId,
        { projectId: id, limit: 1000 }, // Get all expenses for the project
        req.user.role
      );
      const actualExpenses = expensesResponse.data || [];

      // Parse continuous parameter (default: true for digital viewing)
      const isContinuous = continuous === "true";

      // Parse estimatedExpenses JSON (same logic as frontend)
      let parsedEstimatedExpenses: any[] = [];
      let estimatedDirectTotal = 0;
      let estimatedIndirectTotal = 0;

      if (project.estimatedExpenses) {
        try {
          const expensesData = typeof project.estimatedExpenses === 'string'
            ? JSON.parse(project.estimatedExpenses)
            : project.estimatedExpenses;

          // Extract expenses from the nested structure
          if (expensesData.direct && expensesData.indirect) {
            parsedEstimatedExpenses = [
              ...expensesData.direct.map((exp: any, idx: number) => ({
                ...exp,
                costType: 'direct',
                _uniqueKey: `direct-${exp.categoryId}-${exp.amount}-${idx}`,
              })),
              ...expensesData.indirect.map((exp: any, idx: number) => ({
                ...exp,
                costType: 'indirect',
                _uniqueKey: `indirect-${exp.categoryId}-${exp.amount}-${idx}`,
              })),
            ];
            estimatedDirectTotal = expensesData.totalDirect || 0;
            estimatedIndirectTotal = expensesData.totalIndirect || 0;
          }
        } catch (error) {
          this.logger.warn(`Failed to parse estimatedExpenses for project ${id}:`, error);
        }
      }

      // Transform data structure for PDF template
      const projectForPDF = {
        ...project,

        // Include parsed estimated expenses for PDF template
        estimatedExpenses: parsedEstimatedExpenses,

        // Include actual expenses (transaction history)
        actualExpenses: actualExpenses,

        // Map profit margin data to expected structure
        profitMargin: {
          // Actual margins (from real data)
          grossMargin: parseFloat(project.grossMarginPercent?.toString() || "0") || 0,
          netMargin: parseFloat(project.netMarginPercent?.toString() || "0") || 0,
          profit: parseFloat(project.netProfit?.toString() || "0") || 0,

          // Revenue & Cost breakdown
          totalRevenue: parseFloat(project.totalPaidAmount?.toString() || "0") || 0,
          totalInvoiced: parseFloat(project.totalInvoicedAmount?.toString() || "0") || 0,
          totalCosts: parseFloat(project.totalAllocatedCosts?.toString() || "0") || 0,
          directCosts: parseFloat(project.totalDirectCosts?.toString() || "0") || 0,
          indirectCosts: parseFloat(project.totalIndirectCosts?.toString() || "0") || 0,

          // Profit breakdown
          grossProfit: parseFloat(project.grossProfit?.toString() || "0") || 0,
          netProfit: parseFloat(project.netProfit?.toString() || "0") || 0,

          // Budget variance
          budgetVariance: parseFloat(project.budgetVariance?.toString() || "0") || 0,
          budgetVariancePercent: parseFloat(project.budgetVariancePercent?.toString() || "0") || 0,

          // Projected margins (from planning phase)
          projectedGrossMargin: project.projectedGrossMargin ? parseFloat(project.projectedGrossMargin.toString()) : null,
          projectedNetMargin: project.projectedNetMargin ? parseFloat(project.projectedNetMargin.toString()) : null,
          projectedProfit: project.projectedProfit ? parseFloat(project.projectedProfit.toString()) : null,

          // Estimated costs totals (from planning phase)
          estimatedDirectCosts: estimatedDirectTotal,
          estimatedIndirectCosts: estimatedIndirectTotal,
          estimatedTotalCosts: estimatedDirectTotal + estimatedIndirectTotal,

          // Metadata
          calculatedAt: project.profitCalculatedAt,
          calculatedBy: project.profitCalculatedBy,
        },

        // Add statistics
        statistics: {
          quotationsCount: project._count?.quotations || 0,
          invoicesCount: project._count?.invoices || 0,
          expensesCount: project._count?.expenses || 0,
          costAllocationsCount: project._count?.costAllocations || 0,
        },
      };

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateProjectPDF(projectForPDF, isContinuous);

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Laporan-Proyek-${project.number}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to generate project PDF for project ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : "",
      );
      throw new Error("Gagal membuat PDF proyek");
    }
  }

  @Get("project/:id/preview")
  @ApiOperation({ summary: "Preview project PDF in browser" })
  @ApiResponse({
    status: 200,
    description: "PDF preview generated successfully",
  })
  async previewProjectPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response,
    @Request() req: any
  ) {
    try {
      // Get project data
      const project = await this.projectsService.findOne(id);

      if (!project) {
        throw new NotFoundException("Proyek tidak ditemukan");
      }

      // Fetch actual expenses for this project
      const expensesResponse = await this.expensesService.findAll(
        req.user.userId,
        { projectId: id, limit: 1000 }, // Get all expenses for the project
        req.user.role
      );
      const actualExpenses = expensesResponse.data || [];

      // Parse continuous parameter (default: true for digital viewing)
      const isContinuous = continuous === "true";

      // Parse estimatedExpenses JSON (same logic as download endpoint)
      let parsedEstimatedExpenses: any[] = [];
      let estimatedDirectTotal = 0;
      let estimatedIndirectTotal = 0;

      if (project.estimatedExpenses) {
        try {
          const expensesData = typeof project.estimatedExpenses === 'string'
            ? JSON.parse(project.estimatedExpenses)
            : project.estimatedExpenses;

          // Extract expenses from the nested structure
          if (expensesData.direct && expensesData.indirect) {
            parsedEstimatedExpenses = [
              ...expensesData.direct.map((exp: any, idx: number) => ({
                ...exp,
                costType: 'direct',
                _uniqueKey: `direct-${exp.categoryId}-${exp.amount}-${idx}`,
              })),
              ...expensesData.indirect.map((exp: any, idx: number) => ({
                ...exp,
                costType: 'indirect',
                _uniqueKey: `indirect-${exp.categoryId}-${exp.amount}-${idx}`,
              })),
            ];
            estimatedDirectTotal = expensesData.totalDirect || 0;
            estimatedIndirectTotal = expensesData.totalIndirect || 0;
          }
        } catch (error) {
          this.logger.warn(`Failed to parse estimatedExpenses for project ${id}:`, error);
        }
      }

      // Transform data structure for PDF template (same as download endpoint)
      const projectForPDF = {
        ...project,

        // Include parsed estimated expenses for PDF template
        estimatedExpenses: parsedEstimatedExpenses,

        // Include actual expenses (transaction history)
        actualExpenses: actualExpenses,

        // Map profit margin data to expected structure
        profitMargin: {
          // Actual margins (from real data)
          grossMargin: parseFloat(project.grossMarginPercent?.toString() || "0") || 0,
          netMargin: parseFloat(project.netMarginPercent?.toString() || "0") || 0,
          profit: parseFloat(project.netProfit?.toString() || "0") || 0,

          // Revenue & Cost breakdown
          totalRevenue: parseFloat(project.totalPaidAmount?.toString() || "0") || 0,
          totalInvoiced: parseFloat(project.totalInvoicedAmount?.toString() || "0") || 0,
          totalCosts: parseFloat(project.totalAllocatedCosts?.toString() || "0") || 0,
          directCosts: parseFloat(project.totalDirectCosts?.toString() || "0") || 0,
          indirectCosts: parseFloat(project.totalIndirectCosts?.toString() || "0") || 0,

          // Profit breakdown
          grossProfit: parseFloat(project.grossProfit?.toString() || "0") || 0,
          netProfit: parseFloat(project.netProfit?.toString() || "0") || 0,

          // Budget variance
          budgetVariance: parseFloat(project.budgetVariance?.toString() || "0") || 0,
          budgetVariancePercent: parseFloat(project.budgetVariancePercent?.toString() || "0") || 0,

          // Projected margins (from planning phase)
          projectedGrossMargin: project.projectedGrossMargin ? parseFloat(project.projectedGrossMargin.toString()) : null,
          projectedNetMargin: project.projectedNetMargin ? parseFloat(project.projectedNetMargin.toString()) : null,
          projectedProfit: project.projectedProfit ? parseFloat(project.projectedProfit.toString()) : null,

          // Estimated costs totals (from planning phase)
          estimatedDirectCosts: estimatedDirectTotal,
          estimatedIndirectCosts: estimatedIndirectTotal,
          estimatedTotalCosts: estimatedDirectTotal + estimatedIndirectTotal,

          // Metadata
          calculatedAt: project.profitCalculatedAt,
          calculatedBy: project.profitCalculatedBy,
        },

        // Add statistics
        statistics: {
          quotationsCount: project._count?.quotations || 0,
          invoicesCount: project._count?.invoices || 0,
          expensesCount: project._count?.expenses || 0,
          costAllocationsCount: project._count?.costAllocations || 0,
        },
      };

      // Log the profitMargin data being sent to PDF
      this.logger.debug(
        `Profit margin data for PDF preview: projectedGrossMargin=${projectForPDF.profitMargin.projectedGrossMargin}, projectedNetMargin=${projectForPDF.profitMargin.projectedNetMargin}, projectedProfit=${projectForPDF.profitMargin.projectedProfit}, estimatedTotalCosts=${projectForPDF.profitMargin.estimatedTotalCosts}`
      );

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateProjectPDF(projectForPDF, isContinuous);

      // Set response headers for preview
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="Laporan-Proyek-${project.number}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to generate project PDF preview for project ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : "",
      );
      throw new Error("Gagal membuat preview PDF proyek");
    }
  }

  @Get("schedule/:id")
  @ApiOperation({ summary: "Generate PDF for shooting schedule" })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    schema: {
      type: "string",
      format: "binary",
    },
  })
  @ApiResponse({
    status: 404,
    description: "Schedule not found",
  })
  async generateSchedulePdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      const schedule = await this.schedulesService.findOne(id);

      if (!schedule) {
        throw new NotFoundException("Schedule not found");
      }

      const isContinuous = continuous === "true";
      const pdfBuffer = await this.pdfService.generateSchedulePDF(schedule, isContinuous);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Schedule-${schedule.name}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to generate schedule PDF");
    }
  }

  @Get("schedule/:id/preview")
  @ApiOperation({ summary: "Preview schedule PDF in browser" })
  @ApiResponse({
    status: 200,
    description: "PDF preview generated successfully",
  })
  async previewSchedulePdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      const schedule = await this.schedulesService.findOne(id);

      if (!schedule) {
        throw new NotFoundException("Schedule not found");
      }

      const isContinuous = continuous === "true";
      const pdfBuffer = await this.pdfService.generateSchedulePDF(schedule, isContinuous);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="Schedule-${schedule.name}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to generate schedule PDF preview");
    }
  }

  @Get("call-sheet/:id")
  @ApiOperation({ summary: "Generate PDF for call sheet" })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    schema: {
      type: "string",
      format: "binary",
    },
  })
  @ApiResponse({
    status: 404,
    description: "Call Sheet not found",
  })
  async generateCallSheetPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      const callSheet = await this.callSheetsService.findOne(id);

      if (!callSheet) {
        throw new NotFoundException("Call Sheet not found");
      }

      // Fetch company settings to populate company name if not set
      const companySettings = await this.settingsService.getCompanySettings();
      const callSheetForPDF = {
        ...callSheet,
        // Use call sheet's company name if set, otherwise use company settings
        companyName: callSheet.companyName || companySettings?.companyName || 'Production',
      };

      const isContinuous = continuous === "true";
      const pdfBuffer = await this.pdfService.generateCallSheetPDF(callSheetForPDF, isContinuous);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="CallSheet-${callSheet.callSheetNumber}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to generate call sheet PDF");
    }
  }

  @Get("call-sheet/:id/preview")
  @ApiOperation({ summary: "Preview call sheet PDF in browser" })
  @ApiResponse({
    status: 200,
    description: "PDF preview generated successfully",
  })
  async previewCallSheetPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      const callSheet = await this.callSheetsService.findOne(id);

      if (!callSheet) {
        throw new NotFoundException("Call Sheet not found");
      }

      // Fetch company settings to populate company name if not set
      const companySettings = await this.settingsService.getCompanySettings();
      const callSheetForPDF = {
        ...callSheet,
        // Use call sheet's company name if set, otherwise use company settings
        companyName: callSheet.companyName || companySettings?.companyName || 'Production',
      };

      const isContinuous = continuous === "true";
      const pdfBuffer = await this.pdfService.generateCallSheetPDF(callSheetForPDF, isContinuous);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="CallSheet-${callSheet.callSheetNumber}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to generate call sheet PDF preview");
    }
  }

  @Get("shot-list/:id")
  @ApiOperation({ summary: "Generate PDF for shot list" })
  @ApiResponse({
    status: 200,
    description: "PDF generated successfully",
    schema: {
      type: "string",
      format: "binary",
    },
  })
  @ApiResponse({
    status: 404,
    description: "Shot List not found",
  })
  async generateShotListPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      const shotList = await this.shotListsService.findOne(id);

      if (!shotList) {
        throw new NotFoundException("Shot List not found");
      }

      const isContinuous = continuous === "true";
      const pdfBuffer = await this.pdfService.generateShotListPDF(shotList, isContinuous);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ShotList-${shotList.name}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to generate shot list PDF");
    }
  }

  @Get("shot-list/:id/preview")
  @ApiOperation({ summary: "Preview shot list PDF in browser" })
  @ApiResponse({
    status: 200,
    description: "PDF preview generated successfully",
  })
  async previewShotListPdf(
    @Param("id") id: string,
    @Query("continuous") continuous: string = "true",
    @Res() res: Response
  ) {
    try {
      const shotList = await this.shotListsService.findOne(id);

      if (!shotList) {
        throw new NotFoundException("Shot List not found");
      }

      const isContinuous = continuous === "true";
      const pdfBuffer = await this.pdfService.generateShotListPDF(shotList, isContinuous);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="ShotList-${shotList.name}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to generate shot list PDF preview");
    }
  }
}
