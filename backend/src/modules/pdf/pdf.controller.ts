import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { InvoicesService } from '../invoices/invoices.service';
import { QuotationsService } from '../quotations/quotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('PDF')
@Controller('pdf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly invoicesService: InvoicesService,
    private readonly quotationsService: QuotationsService,
  ) {}

  @Get('invoice/:id')
  @ApiOperation({ summary: 'Generate PDF for invoice' })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async generateInvoicePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      // Get invoice data
      const invoice = await this.invoicesService.findOne(id);
      
      if (!invoice) {
        throw new NotFoundException('Invoice tidak ditemukan');
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Gagal membuat PDF invoice');
    }
  }

  @Get('quotation/:id')
  @ApiOperation({ summary: 'Generate PDF for quotation' })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quotation not found',
  })
  async generateQuotationPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      // Get quotation data
      const quotation = await this.quotationsService.findOne(id);
      
      if (!quotation) {
        throw new NotFoundException('Quotation tidak ditemukan');
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(quotation);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Gagal membuat PDF quotation');
    }
  }

  @Get('invoice/:id/preview')
  @ApiOperation({ summary: 'Preview invoice PDF in browser' })
  @ApiResponse({
    status: 200,
    description: 'PDF preview generated successfully',
  })
  async previewInvoicePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      // Get invoice data
      const invoice = await this.invoicesService.findOne(id);
      
      if (!invoice) {
        throw new NotFoundException('Invoice tidak ditemukan');
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice);

      // Set response headers for preview
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Gagal membuat preview PDF invoice');
    }
  }

  @Get('quotation/:id/preview')
  @ApiOperation({ summary: 'Preview quotation PDF in browser' })
  @ApiResponse({
    status: 200,
    description: 'PDF preview generated successfully',
  })
  async previewQuotationPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      // Get quotation data
      const quotation = await this.quotationsService.findOne(id);
      
      if (!quotation) {
        throw new NotFoundException('Quotation tidak ditemukan');
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(quotation);

      // Set response headers for preview
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Quotation-${quotation.quotationNumber}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Gagal membuat preview PDF quotation');
    }
  }
}