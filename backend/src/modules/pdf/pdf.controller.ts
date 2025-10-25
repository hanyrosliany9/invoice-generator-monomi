import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  Logger,
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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("PDF")
@Controller("pdf")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly invoicesService: InvoicesService,
    private readonly quotationsService: QuotationsService,
    private readonly projectsService: ProjectsService,
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
  async generateInvoicePdf(@Param("id") id: string, @Res() res: Response) {
    try {
      // Get invoice data
      const invoice = await this.invoicesService.findOne(id);

      if (!invoice) {
        throw new NotFoundException("Invoice tidak ditemukan");
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice);

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
  async generateQuotationPdf(@Param("id") id: string, @Res() res: Response) {
    try {
      // Get quotation data
      const quotation = await this.quotationsService.findOne(id);

      if (!quotation) {
        throw new NotFoundException("Quotation tidak ditemukan");
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(quotation);

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
  async previewInvoicePdf(@Param("id") id: string, @Res() res: Response) {
    try {
      // Get invoice data
      const invoice = await this.invoicesService.findOne(id);

      if (!invoice) {
        throw new NotFoundException("Invoice tidak ditemukan");
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice);

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
  async previewQuotationPdf(@Param("id") id: string, @Res() res: Response) {
    try {
      // Get quotation data
      const quotation = await this.quotationsService.findOne(id);

      if (!quotation) {
        throw new NotFoundException("Quotation tidak ditemukan");
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(quotation);

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
  async generateProjectPdf(@Param("id") id: string, @Res() res: Response) {
    try {
      // Get project data
      const project = await this.projectsService.findOne(id);

      if (!project) {
        throw new NotFoundException("Proyek tidak ditemukan");
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateProjectPDF(project);

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
  async previewProjectPdf(@Param("id") id: string, @Res() res: Response) {
    try {
      // Get project data
      const project = await this.projectsService.findOne(id);

      if (!project) {
        throw new NotFoundException("Proyek tidak ditemukan");
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateProjectPDF(project);

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
      throw new Error("Gagal membuat preview PDF proyek");
    }
  }
}
