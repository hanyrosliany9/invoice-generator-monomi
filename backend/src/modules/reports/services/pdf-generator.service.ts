import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { PDFTemplateService } from './pdf-template.service';
import * as puppeteer from 'puppeteer';
import { SocialMediaReport, ReportSection } from '@prisma/client';

interface ReportWithSections extends SocialMediaReport {
  sections: ReportSection[];
  project?: {
    number: string;
    description: string;
    client?: {
      name: string;
      email?: string;
    };
  };
}

@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
    private pdfTemplateService: PDFTemplateService,
  ) {}

  /**
   * Generate PDF for a social media report
   */
  async generateReportPDF(reportId: string): Promise<Buffer> {
    this.logger.log(`Generating PDF for report ${reportId}`);

    // Fetch report with all sections
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id: reportId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // Generate HTML
    const html = this.generateHTML(report as ReportWithSections);

    // Convert to PDF using Puppeteer
    const pdfBuffer = await this.htmlToPDF(html);

    this.logger.log(`PDF generated successfully for report ${reportId}`);
    return pdfBuffer;
  }

  /**
   * Generate PDF from HTML snapshot (Visual Builder Parity Mode)
   * This method achieves 100% pixel-perfect match between visual builder and PDF
   * by using the exact HTML and CSS rendered in the browser.
   */
  async generatePDFFromSnapshot(
    reportId: string,
    snapshot: {
      renderedHTML: string;
      styles: string;
      dimensions: { width: number; rowHeight: number; cols: number };
    },
  ): Promise<Buffer> {
    this.logger.log(`Generating PDF from HTML snapshot for report ${reportId}`);
    this.logger.log(`Snapshot dimensions: ${snapshot.dimensions.width}×${snapshot.dimensions.rowHeight} (${snapshot.dimensions.cols} cols)`);

    // Fetch report for metadata
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id: reportId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // Build complete HTML document with snapshot content
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(report.title || 'Report')}</title>
          <style>
            /* Reset and base styles */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              width: ${snapshot.dimensions.width}px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              background: #ffffff;
            }

            /* ✅ Styles captured from browser */
            ${snapshot.styles}

            /* Print-specific adjustments */
            @media print {
              .react-grid-item {
                page-break-inside: avoid;
              }

              .no-print {
                display: none !important;
              }

              /* Ensure absolute positioning works in print */
              .react-grid-layout {
                position: relative;
              }

              .react-grid-item {
                position: absolute;
              }
            }

            /* Additional safety styles */
            .report-canvas {
              width: ${snapshot.dimensions.width}px;
              background: #ffffff;
              position: relative;
            }
          </style>
        </head>
        <body>
          <!-- Report Header -->
          <div style="padding: 20px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px;">
            <h1 style="font-size: 24px; margin-bottom: 8px; color: #333;">
              ${this.escapeHtml(report.title || 'Social Media Report')}
            </h1>
            ${report.project ? `
              <p style="font-size: 14px; color: #666; margin-bottom: 4px;">
                Project: ${this.escapeHtml(report.project.number)} - ${this.escapeHtml(report.project.description)}
              </p>
            ` : ''}
            ${report.project?.client ? `
              <p style="font-size: 14px; color: #666;">
                Client: ${this.escapeHtml(report.project.client.name)}
              </p>
            ` : ''}
            <p style="font-size: 12px; color: #999; margin-top: 8px;">
              Generated: ${new Date().toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <!-- ✅ Exact HTML from visual builder -->
          <div class="report-canvas">
            ${snapshot.renderedHTML}
          </div>
        </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // ✅ Set viewport with high resolution (matching visual builder)
      await page.setViewport({
        width: snapshot.dimensions.width,
        height: 1123, // A4 height at 96 DPI
        deviceScaleFactor: 2, // 2x resolution for crisp output
      });

      // ✅ Emulate print media
      await page.emulateMediaType('print');

      // Load HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // ✅ Wait for rendering to complete
      this.logger.log('Waiting for content to render...');
      await page.evaluate(`() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', () => resolve());
          }
        });
      }`);

      // Small buffer for layout stability
      await new Promise(resolve => setTimeout(resolve, 500));

      this.logger.log('Content rendered, measuring height...');

      // Calculate content height
      const contentHeight = (await page.evaluate('document.documentElement.scrollHeight')) as number;

      this.logger.log(`Generating PDF: content=${contentHeight}px, width=${snapshot.dimensions.width}px`);

      // Generate PDF
      const pdfBuffer = await page.pdf({
        width: `${snapshot.dimensions.width}px`,
        height: `${contentHeight}px`,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      this.logger.log('PDF generated successfully from snapshot');

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('PDF generation from snapshot failed', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate PDF from visual builder data using server-side templates
   * This is the RELIABLE approach that always produces correct widget sizes
   */
  async generatePDFFromData(reportId: string, sectionId: string): Promise<Buffer> {
    this.logger.log(`Generating PDF from data for section ${sectionId} in report ${reportId}`);

    // Fetch section with layout data
    const section = await this.prisma.reportSection.findUnique({
      where: { id: sectionId },
      include: {
        report: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    // Extract widget data and data source from section
    const widgets = (section.layout as any)?.widgets || [];
    const dataSource = {
      columns: (section.columnTypes as any) || [],
      rows: (section.rawData as any) || [],
    };

    this.logger.log(`Rendering ${widgets.length} widgets for PDF`);

    // Generate HTML using template service (await async chart rendering)
    const html = await this.pdfTemplateService.generateSectionHTML(
      widgets,
      dataSource,
      section.title,
    );

    // Add report header
    const completeHTML = this.wrapHTMLWithReportHeader(html, section.report, section.title);

    // Generate PDF using Puppeteer
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set viewport (A4 size at 96 DPI)
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 2, // High resolution
      });

      // Emulate print media
      await page.emulateMediaType('print');

      // Load HTML
      await page.setContent(completeHTML, {
        waitUntil: 'networkidle0',
      });

      // Wait for rendering
      this.logger.log('Waiting for content to render...');
      await page.evaluate(`() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', () => resolve());
          }
        });
      }`);

      // Small buffer for layout stability
      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate content height
      const contentHeight = (await page.evaluate('document.documentElement.scrollHeight')) as number;

      this.logger.log(`Generating PDF: content=${contentHeight}px, width=794px`);

      // Generate PDF
      const pdfBuffer = await page.pdf({
        width: '794px',
        height: `${contentHeight}px`,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      this.logger.log('PDF generated successfully from data');

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('PDF generation from data failed', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Wrap section HTML with report header and footer
   */
  private wrapHTMLWithReportHeader(sectionHTML: string, report: any, sectionTitle: string): string {
    // Extract just the canvas content from the section HTML
    const canvasMatch = sectionHTML.match(/<div class="pdf-canvas"[^>]*>([\s\S]*)<\/div>\s*<\/body>/);
    const canvasContent = canvasMatch ? canvasMatch[1] : sectionHTML;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${this.escapeHtml(report.title || 'Report')}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              background: #ffffff;
            }

            .pdf-canvas {
              width: 794px;
              position: relative;
              background: #ffffff;
              margin: 0 auto;
            }

            .widget-container {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <!-- Report Header -->
          <div style="padding: 20px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px;">
            <h1 style="font-size: 24px; margin-bottom: 8px; color: #333;">
              ${this.escapeHtml(report.title || 'Social Media Report')}
            </h1>
            ${sectionTitle ? `
              <h2 style="font-size: 18px; margin-bottom: 12px; color: #666;">
                ${this.escapeHtml(sectionTitle)}
              </h2>
            ` : ''}
            ${report.project ? `
              <p style="font-size: 14px; color: #666; margin-bottom: 4px;">
                Project: ${this.escapeHtml(report.project.number)} - ${this.escapeHtml(report.project.description)}
              </p>
            ` : ''}
            ${report.project?.client ? `
              <p style="font-size: 14px; color: #666;">
                Client: ${this.escapeHtml(report.project.client.name)}
              </p>
            ` : ''}
            <p style="font-size: 12px; color: #999; margin-top: 8px;">
              Generated: ${new Date().toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <!-- Section Content -->
          <div class="pdf-canvas">
            ${canvasContent}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate full report PDF with all sections using server-side templates
   * This is the NEW RELIABLE approach for multi-section reports
   */
  async generateFullReportPDFFromData(reportId: string): Promise<Buffer> {
    this.logger.log(`Generating full report PDF from data for report ${reportId}`);

    // Fetch report with all sections
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id: reportId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    this.logger.log(`Rendering ${report.sections.length} sections for PDF`);

    // Generate HTML for each section using server-side templates (await async)
    const sectionHTMLs = await Promise.all(
      report.sections.map(async (section) => {
        const widgets = (section.layout as any)?.widgets || [];
        const dataSource = {
          columns: (section.columnTypes as any) || [],
          rows: (section.rawData as any) || [],
        };

        this.logger.log(`  - Section "${section.title}": ${widgets.length} widgets`);

        // Generate section HTML (without wrapper) - await async
        const sectionHTML = await this.pdfTemplateService.generateSectionHTML(
          widgets,
          dataSource,
          section.title,
        );

        // Extract just the canvas content
        const canvasMatch = sectionHTML.match(/<div class="pdf-canvas"[^>]*>([\s\S]*)<\/div>\s*<\/body>/);
        const canvasContent = canvasMatch ? canvasMatch[1] : sectionHTML;

        return {
          title: section.title,
          content: canvasContent,
        };
      })
    );

    // Combine all sections into one HTML document
    const completeHTML = this.wrapMultipleSectionsHTML(report, sectionHTMLs);

    // Generate PDF using Puppeteer
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set viewport (A4 size at 96 DPI)
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 2,
      });

      // Emulate print media
      await page.emulateMediaType('print');

      // Load HTML
      await page.setContent(completeHTML, {
        waitUntil: 'networkidle0',
      });

      // Wait for rendering
      this.logger.log('Waiting for content to render...');
      await page.evaluate(`() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', () => resolve());
          }
        });
      }`);

      // Small buffer for layout stability
      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate content height
      const contentHeight = (await page.evaluate('document.documentElement.scrollHeight')) as number;

      this.logger.log(`Generating PDF: content=${contentHeight}px, width=794px`);

      // Generate PDF
      const pdfBuffer = await page.pdf({
        width: '794px',
        height: `${contentHeight}px`,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      this.logger.log('Full report PDF generated successfully from data');

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Full report PDF generation from data failed', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Wrap multiple sections into a single HTML document
   */
  private wrapMultipleSectionsHTML(report: any, sections: Array<{ title: string; content: string }>): string {
    const sectionsHTML = sections.map((section, index) => `
      <!-- Section ${index + 1} -->
      <div style="
        margin-bottom: 60px;
      ">
        <h2 style="
          font-size: 24px;
          color: #1a1a1a;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px solid #0066cc;
        ">
          ${this.escapeHtml(section.title)}
        </h2>

        <div class="pdf-canvas" style="
          width: 794px;
          position: relative;
          background: #ffffff;
          margin: 0 auto;
        ">
          ${section.content}
        </div>
      </div>
    `).join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${this.escapeHtml(report.title || 'Report')}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              background: #ffffff;
              padding: 20px;
            }

            .pdf-canvas {
              width: 794px;
              position: relative;
              background: #ffffff;
              margin: 0 auto;
            }

            /* Print optimizations */
            @media print {
              .widget-container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <!-- Report Header -->
          <div style="
            padding: 30px 20px;
            border-bottom: 4px solid #0066cc;
            margin-bottom: 40px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          ">
            <h1 style="font-size: 32px; color: #1a1a1a; margin-bottom: 12px;">
              ${this.escapeHtml(report.title)}
            </h1>
            ${report.description ? `
              <p style="font-size: 16px; color: #555; margin-bottom: 8px;">
                ${this.escapeHtml(report.description)}
              </p>
            ` : ''}
            ${report.project ? `
              <p style="font-size: 14px; color: #666; margin-bottom: 4px;">
                Project: ${this.escapeHtml(report.project.number)} - ${this.escapeHtml(report.project.description)}
              </p>
              <p style="font-size: 14px; color: #666;">
                Client: ${this.escapeHtml(report.project.client.name)}
              </p>
            ` : ''}
            <p style="font-size: 12px; color: #999; margin-top: 12px;">
              Generated: ${new Date().toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <!-- All Sections -->
          ${sectionsHTML}
        </body>
      </html>
    `;
  }

  /**
   * Generate PDF and upload to R2 storage
   */
  async generateAndUploadPDF(reportId: string): Promise<string> {
    this.logger.log(`Generating and uploading PDF for report ${reportId}`);

    // Generate PDF using NEW server-side template approach
    const pdfBuffer = await this.generateFullReportPDFFromData(reportId);

    // Create a fake Express.Multer.File object for MediaService
    const fakeFile: Express.Multer.File = {
      buffer: pdfBuffer,
      originalname: `report-${reportId}.pdf`,
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      fieldname: 'file',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: `report-${reportId}.pdf`,
      path: '',
    };

    // Upload to R2
    if (this.mediaService.isR2Enabled()) {
      try {
        const uploadResult = await this.mediaService.uploadFile(fakeFile, 'reports');
        this.logger.log(`PDF uploaded to R2: ${uploadResult.url}`);

        // Update report with PDF URL
        await this.prisma.socialMediaReport.update({
          where: { id: reportId },
          data: {
            pdfUrl: uploadResult.url,
            pdfGeneratedAt: new Date(),
            pdfVersion: { increment: 1 },
          },
        });

        return uploadResult.url;
      } catch (error) {
        this.logger.error('Failed to upload PDF to R2', error);
        throw error;
      }
    } else {
      this.logger.warn('R2 is not enabled. PDF will not be uploaded.');
      return '';
    }
  }

  /**
   * Get localized month name
   */
  private getMonthName(month: number, locale: string = 'id-ID'): string {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleDateString(locale, { month: 'long' });
  }

  /**
   * Generate HTML for the report
   */
  private generateHTML(report: ReportWithSections): string {
    // Detect locale from report settings or default to id-ID
    const locale = 'id-ID'; // TODO: Get from report settings
    const periodText = `${this.getMonthName(report.month, locale)} ${report.year}`;

    return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 20px; /* Reduced to match content width expectations */
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #1890ff;
    }

    .header h1 {
      color: #1890ff;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .header .period {
      font-size: 18px;
      color: #666;
      margin-bottom: 5px;
    }

    .header .client-info {
      font-size: 16px;
      color: #888;
    }

    .description {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 14px;
      color: #666;
    }

    .section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }

    .section-header {
      display: block;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #1890ff;
    }

    .section-header h2 {
      display: block;
      font-size: 20px;
      font-weight: 600;
      color: #262626;
      margin: 0 0 8px 0;
    }

    .section-header .meta {
      display: block;
      font-size: 13px;
      color: #8c8c8c;
    }

    .section-header .description {
      display: block;
      font-size: 14px;
      color: #595959;
      margin-top: 8px;
      line-height: 1.5;
    }

    .section-content {
      border: none;
      padding: 0;
      border-radius: 0;
    }

    /* PDF Layout - NO GRID! Just stack widgets vertically */
    .widget-grid {
      display: block; /* Simple block layout - no grid constraints */
      width: 100%;
      margin-bottom: 20px;
    }

    .widget-item {
      /* NO grid positioning - just flow naturally */
      display: block;
      width: 100%;
      margin-bottom: 24px; /* Space between widgets */
      background: #ffffff;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      overflow: visible; /* Don't crop content */
    }

    /* Text widgets - no box, just clean text */
    .widget-item-text,
    .widget-item-divider {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
    }

    /* Chart widgets - ensure no constraints */
    .widget-item-chart {
      overflow: visible;
      height: auto;
      padding: 0 !important; /* Remove padding to maximize chart space */
    }

    .section-description {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
      font-style: italic;
    }

    /* Rich text formatting */
    .rich-text h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #1890ff;
    }

    .rich-text h2 {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #333;
    }

    .rich-text h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .rich-text p {
      margin-bottom: 8px;
      line-height: 1.6;
    }

    .rich-text ul, .rich-text ol {
      padding-left: 24px;
      margin-bottom: 8px;
    }

    .rich-text li {
      margin-bottom: 4px;
    }

    .rich-text strong {
      font-weight: 700;
    }

    .rich-text em {
      font-style: italic;
    }

    .rich-text u {
      text-decoration: underline;
    }

    .text-left {
      text-align: left;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .data-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }

    .summary-card {
      background: #fafafa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #1890ff;
    }

    .summary-card .label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .summary-card .value {
      font-size: 20px;
      font-weight: bold;
      color: #1890ff;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 12px;
    }

    .data-table thead {
      background: #fafafa;
    }

    .data-table th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #d9d9d9;
    }

    .data-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .data-table tbody tr:hover {
      background: #fafafa;
    }

    .data-table .number {
      text-align: right;
      font-family: 'Courier New', monospace;
    }

    .column-types {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }

    .column-type {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .column-type.NUMBER {
      background: #e6f7ff;
      color: #1890ff;
      border: 1px solid #91d5ff;
    }

    .column-type.DATE {
      background: #f6ffed;
      color: #52c41a;
      border: 1px solid #b7eb8f;
    }

    .column-type.STRING {
      background: #fafafa;
      color: #666;
      border: 1px solid #d9d9d9;
    }

    .chart-container {
      margin: 0;
      page-break-inside: avoid;
    }

    .chart-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }

    .chart-wrapper {
      background: transparent;
      padding: 0;
      border: none;
      overflow: visible; /* Don't clip chart content */
      /* DYNAMIC HEIGHT: Dimensions set via inline styles from calculateChartWrapperStyle() */
      width: 100%;
      /* Height is set by inline style based on widget layout (removed fixed 600px) */
    }

    .chart-wrapper canvas {
      /* Let Chart.js size the canvas without constraints */
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    .metric-card-chart {
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
      border-radius: 8px;
    }

    .metric-card-chart .metric-title {
      font-size: 16px;
      color: #666;
      margin-bottom: 10px;
    }

    .metric-card-chart .metric-value {
      font-size: 48px;
      font-weight: bold;
      color: #1890ff;
      margin-bottom: 5px;
    }

    .metric-card-chart .metric-prefix,
    .metric-card-chart .metric-suffix {
      font-size: 24px;
      color: #888;
    }

    /* REMOVED: Global canvas constraints were causing chart cropping
     * Canvas elements use explicit width/height attributes instead
     * max-width/max-height would constrain based on parent, causing issues
     */

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
      font-size: 12px;
      color: #999;
    }

    .generated-badge {
      display: inline-block;
      background: #f0f0f0;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 11px;
      color: #666;
      margin-top: 10px;
    }

    @media print {
      body {
        padding: 0; /* No padding - PDF margins handle spacing */
      }

      .section {
        page-break-inside: avoid;
      }

      /* PDF uses simple block layout - no grid */
      .widget-grid {
        display: block !important;
        width: 100% !important; /* Use full available width */
        max-width: 100% !important;
      }

      .widget-item {
        display: block !important;
        width: 100% !important;
        margin-bottom: 24px !important;
      }

      .widget-item-chart {
        overflow: visible !important;
        height: auto !important;
        padding: 0 !important; /* No padding for maximum chart space */
      }

      /* EXPLICIT HEIGHT: Charts need sized containers */
      .chart-wrapper {
        width: 100% !important;
        height: 600px !important;
        overflow: visible !important; /* Don't clip chart labels */
      }

      /* Let canvas fill container completely */
      canvas, .chart-wrapper img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header (minimal - only title) -->
  <div class="header">
    <h1>${this.escapeHtml(report.title)}</h1>
    ${
      report.project?.client
        ? `<div class="client-info">${this.escapeHtml(report.project.client.name)}</div>`
        : ''
    }
  </div>

  <!-- Sections (ONLY Visual Builder Content - No Wrapper) -->
  ${report.sections
    .map(
      (section) => this.generateCharts(section)
    )
    .join('')}
</body>
</html>
    `;
  }

  /**
   * Generate charts/visualizations for section
   * Supports both widget-based layout (new) and visualizations array (legacy)
   */
  private generateCharts(section: ReportSection): string {
    const data = section.rawData as any[];
    if (!data || data.length === 0) {
      return '';
    }

    // Generate section header
    const sectionHeader = this.generateSectionHeader(section);

    // Check if section uses new widget-based layout
    const layout = section.layout as any;
    if (layout && layout.widgets && Array.isArray(layout.widgets)) {
      this.logger.log(
        `Using WIDGET-BASED layout for section ${section.id} with ${layout.widgets.length} widgets`
      );

      const content = this.generateWidgetBasedLayout(layout, data, section.id);

      return `
        <div class="section">
          ${sectionHeader}
          <div class="section-content">
            ${content}
          </div>
        </div>
      `;
    }

    // Fall back to legacy visualizations array
    this.logger.log(
      `Using LEGACY visualizations for section ${section.id} (layout=${!!layout}, widgets=${layout?.widgets ? 'exists' : 'missing'})`
    );
    const visualizations = (section.visualizations as any[]) || [];
    if (visualizations.length === 0) {
      return '';
    }

    const chartsHtml = visualizations
      .map((viz, index) => {
        const chartId = `chart-${section.id}-${index}`;

        // Handle different visualization types
        if (viz.type === 'metric_card') {
          return this.generateMetricCard(viz, data);
        } else if (viz.type === 'table') {
          // Table type will use the main data table, skip here
          return '';
        } else {
          // Line, Bar, Area, Pie charts
          return this.generateChartCanvas(viz, data, chartId);
        }
      })
      .filter(Boolean)
      .join('');

    return `
      <div class="section">
        ${sectionHeader}
        <div class="section-content">
          ${chartsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Generate section header HTML
   */
  private generateSectionHeader(section: ReportSection): string {
    const title = section.title || 'Untitled Section';
    const description = section.description || '';
    const order = section.order !== undefined ? `Section ${section.order + 1}` : '';

    return `
      <div class="section-header">
        <h2>${this.escapeHtml(title)}</h2>
        <div class="meta">${order}${order && description ? ' • ' : ''}${section.rowCount || 0} data rows</div>
        ${description ? `<div class="description">${this.escapeHtml(description)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Calculate maximum grid dimensions from all widgets
   */
  private calculateGridDimensions(widgets: any[]): { maxY: number; maxRows: number } {
    let maxY = 0;
    let maxRowEnd = 0;

    widgets.forEach(widget => {
      const y = widget.layout?.y || 0;
      const h = widget.layout?.h || 4;
      const rowEnd = y + h;

      if (y > maxY) maxY = y;
      if (rowEnd > maxRowEnd) maxRowEnd = rowEnd;
    });

    // Return the maximum row that has content (for grid-template-rows)
    return { maxY, maxRows: maxRowEnd };
  }

  /**
   * Generate HTML from widget-based layout (new visual builder)
   * FIXED: Now uses SINGLE grid container matching react-grid-layout architecture
   */
  private generateWidgetBasedLayout(layout: any, data: any[], sectionId: string): string {
    const widgets = layout?.widgets || [];
    if (!widgets || widgets.length === 0) {
      return '';
    }

    // Extract rowHeight from layout (default to 30px if not specified)
    const rowHeight = layout?.rowHeight || 30;

    this.logger.log(`Generating widget-based layout with ${widgets.length} widgets in SINGLE grid container`);

    // Calculate grid dimensions
    const { maxRows } = this.calculateGridDimensions(widgets);
    this.logger.log(`Grid dimensions - maxRows: ${maxRows}, rowHeight: ${rowHeight}px`);

    // Sort widgets by Y then X for consistent rendering order
    const sortedWidgets = [...widgets].sort((a, b) => {
      const aY = a.layout?.y || 0;
      const bY = b.layout?.y || 0;
      if (aY !== bY) return aY - bY;
      return (a.layout?.x || 0) - (b.layout?.x || 0);
    });

    // Generate ALL widgets in SINGLE grid container
    const widgetHtml = sortedWidgets.map((widget, index) => {
      const widgetId = `widget-${sectionId}-${index}`;
      const x = widget.layout?.x || 0;
      const y = widget.layout?.y || 0;
      const w = widget.layout?.w || 12;
      const h = widget.layout?.h || 4;

      this.logger.log(`Processing widget type: ${widget.type}, id: ${widget.id}, position: (${x}, ${y}), size: ${w}x${h}`);

      let content = '';
      switch (widget.type) {
        case 'chart':
          content = this.generateWidgetChart(widget, data, widgetId, rowHeight);
          break;
        case 'metric':
          content = this.generateWidgetMetric(widget, data);
          break;
        case 'text':
          content = this.generateWidgetText(widget);
          break;
        case 'callout':
          content = this.generateWidgetCallout(widget);
          break;
        case 'divider':
          content = this.generateWidgetDivider(widget);
          break;
        case 'table':
          content = this.generateWidgetTable(widget, data);
          break;
        default:
          this.logger.warn(`Unknown widget type: ${widget.type}`);
          content = '';
      }

      if (!content) return '';

      // Simple block wrapper - no grid positioning needed
      return `
        <div class="widget-item widget-item-${widget.type}">
          ${content}
        </div>
      `;
    }).filter(Boolean).join('');

    // Return SINGLE grid container with all widgets
    // CSS variable --max-rows defines grid-template-rows dynamically
    return `<div class="widget-grid" style="--max-rows: ${maxRows};">${widgetHtml}</div>`;
  }

  /**
   * Generate chart widget HTML
   */
  private generateWidgetChart(widget: any, data: any[], widgetId: string, rowHeight?: number): string {
    const config = widget.config || {};

    // Special case: if chartType is "table", render as table widget
    if (config.chartType === 'table') {
      this.logger.log(`Chart widget has chartType=table, rendering as table widget`);
      // Get all column names from the data
      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
      // Create a table widget config
      const tableWidget = {
        ...widget,
        config: {
          ...config,
          columns: columns,
          showHeader: true,
          bordered: true,
        }
      };
      return this.generateWidgetTable(tableWidget, data);
    }

    // Convert widget config to visualization format
    const viz: any = {
      type: config.chartType || 'line',
      title: config.title || 'Chart',
      xAxis: config.xAxis,
      yAxis: config.yAxis,
      nameKey: config.nameKey,
      valueKey: config.valueKey,
    };

    // Generate chart with widget layout for dynamic sizing
    return this.generateChartCanvas(viz, data, widgetId, widget.layout, rowHeight);
  }

  /**
   * Generate metric widget HTML
   */
  private generateWidgetMetric(widget: any, data: any[]): string {
    const config = widget.config || {};

    // Convert widget config to metric card format
    const viz: any = {
      type: 'metric_card',
      title: config.title || 'Metric',
      valueKey: config.valueKey,
      aggregation: config.aggregation || 'sum',
      precision: config.precision || 0,
    };

    return this.generateMetricCard(viz, data);
  }

  /**
   * Convert Slate.js content to HTML
   */
  private slateToHTML(nodes: any[]): string {
    if (!Array.isArray(nodes)) return '';

    return nodes.map((node: any) => {
      // Handle text nodes
      if (node.text !== undefined) {
        let text = this.escapeHtml(node.text);
        if (node.bold) text = `<strong>${text}</strong>`;
        if (node.italic) text = `<em>${text}</em>`;
        if (node.underline) text = `<u>${text}</u>`;
        return text;
      }

      // Handle element nodes
      const align = node.align ? ` class="text-${node.align}"` : '';
      const children = node.children ? this.slateToHTML(node.children) : '';

      switch (node.type) {
        case 'heading-one':
          return `<h1${align}>${children}</h1>`;
        case 'heading-two':
          return `<h2${align}>${children}</h2>`;
        case 'heading-three':
          return `<h3${align}>${children}</h3>`;
        case 'bulleted-list':
          return `<ul${align}>${children}</ul>`;
        case 'numbered-list':
          return `<ol${align}>${children}</ol>`;
        case 'list-item':
          return `<li${align}>${children}</li>`;
        case 'paragraph':
        default:
          return `<p${align}>${children}</p>`;
      }
    }).join('');
  }

  /**
   * Generate text widget HTML with full rich text support
   */
  private generateWidgetText(widget: any): string {
    const config = widget.config || {};

    // Check if content is Slate.js format (array)
    if (Array.isArray(config.content)) {
      try {
        const html = this.slateToHTML(config.content);
        if (!html.trim()) {
          this.logger.warn('Slate.js content rendered to empty HTML');
          return '';
        }

        return `
          <div class="chart-container">
            <div class="rich-text">${html}</div>
          </div>
        `;
      } catch (error) {
        this.logger.error('Failed to parse Slate.js content', error);
        // Fall through to plainText handling
      }
    }

    // Fallback to plainText or string content
    const plainText = config.plainText;
    const content = plainText || (typeof config.content === 'string' ? config.content : '');

    if (!content || !content.trim()) {
      return '';
    }

    // Preserve line breaks for plain text
    const formattedContent = this.escapeHtml(content).replace(/\n/g, '<br>');

    return `
      <div class="chart-container">
        <div class="section-description" style="white-space: pre-wrap;">${formattedContent}</div>
      </div>
    `;
  }

  /**
   * Generate callout widget HTML
   */
  private generateWidgetCallout(widget: any): string {
    const config = widget.config || {};
    const title = config.title || '';
    const content = config.content || '';
    const type = config.type || 'info';

    if (!content.trim()) {
      return '';
    }

    const typeStyles: Record<string, { bg: string; border: string; color: string }> = {
      info: { bg: '#e6f7ff', border: '#1890ff', color: '#0050b3' },
      success: { bg: '#f6ffed', border: '#52c41a', color: '#389e0d' },
      warning: { bg: '#fffbe6', border: '#faad14', color: '#d48806' },
      error: { bg: '#fff1f0', border: '#f5222d', color: '#cf1322' },
    };

    const style = typeStyles[type] || typeStyles.info;

    return `
      <div class="chart-container">
        <div style="
          background: ${style.bg};
          border-left: 4px solid ${style.border};
          color: ${style.color};
          padding: 16px 20px;
          border-radius: 4px;
          margin: 15px 0;
        ">
          ${title ? `<div style="font-weight: 600; margin-bottom: 8px;">${this.escapeHtml(title)}</div>` : ''}
          <div>${this.escapeHtml(content)}</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate divider widget HTML
   */
  private generateWidgetDivider(widget: any): string {
    const config = widget.config || {};
    const style = config.style || 'solid';

    const borderStyles: Record<string, string> = {
      solid: 'solid',
      dashed: 'dashed',
      dotted: 'dotted',
    };

    return `
      <div style="
        border-top: 2px ${borderStyles[style] || 'solid'} #d9d9d9;
        margin: 30px 0;
      "></div>
    `;
  }

  /**
   * Generate table widget HTML
   */
  private generateWidgetTable(widget: any, data: any[]): string {
    const config = widget.config || {};
    let columns = config.columns || [];

    // If no data, show placeholder message
    if (!data || data.length === 0) {
      this.logger.warn(`Table widget ${widget.id} has no data`);
      return `
        <div class="chart-container" style="padding: 40px; text-align: center; background: #fafafa; border-radius: 8px;">
          <p style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px;">📊 ${this.escapeHtml(config.title || 'Data Table')}</p>
          <p style="color: #999; font-size: 14px;">No data available</p>
        </div>
      `;
    }

    // Auto-detect columns from data if not specified
    if (!Array.isArray(columns) || columns.length === 0) {
      columns = Object.keys(data[0]);
      this.logger.log(`Auto-detected ${columns.length} columns for table widget ${widget.id}`);
    }

    // If still no columns, return error
    if (columns.length === 0) {
      this.logger.error(`Cannot determine columns for table widget ${widget.id}`);
      return `
        <div class="chart-container" style="padding: 40px; text-align: center; background: #fff1f0; border: 2px solid #f5222d; border-radius: 8px;">
          <p style="font-size: 16px; font-weight: 600; color: #f5222d; margin-bottom: 8px;">⚠️ Table Error</p>
          <p style="color: #666; font-size: 14px;">Cannot determine table columns</p>
        </div>
      `;
    }

    // Generate table HTML
    this.logger.log(`Generating table widget ${widget.id}: ${columns.length} columns × ${data.length} rows`);

    return `
      <div class="chart-container">
        ${config.title ? `<div class="chart-title">${this.escapeHtml(config.title)}</div>` : ''}
        <table class="data-table">
          ${config.showHeader !== false ? `
          <thead>
            <tr>
              ${columns.map((col: string) => `<th>${this.escapeHtml(String(col))}</th>`).join('')}
            </tr>
          </thead>
          ` : ''}
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${columns
                  .map((col: string) => {
                    const value = row[col];
                    const displayValue = value !== undefined && value !== null ? String(value) : '-';
                    return `<td>${this.escapeHtml(displayValue)}</td>`;
                  })
                  .join('')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Generate metric card visualization (without hardcoded labels)
   */
  private generateMetricCard(viz: any, data: any[]): string {
    if (!viz.valueKey) return '';

    // FIXED: Use parseNumber helper to handle string numbers (matches ChartRenderer.tsx)
    const values = data
      .map((row) => this.parseNumber(row[viz.valueKey]))
      .filter((v) => v !== null) as number[];

    if (values.length === 0) return '';

    let metricValue = 0;
    const prefix = viz.prefix || '';
    const suffix = viz.suffix || '';

    switch (viz.aggregation || 'sum') {
      case 'sum':
        metricValue = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        metricValue = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      case 'count':
        metricValue = data.length;
        break;
      case 'max':
        metricValue = Math.max(...values);
        break;
      case 'min':
        metricValue = Math.min(...values);
        break;
      default:
        metricValue = values.reduce((acc, val) => acc + val, 0);
    }

    const precision = viz.precision || 0;
    const formattedValue = metricValue.toLocaleString('id-ID', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });

    return `
      <div class="chart-container">
        ${viz.title ? `<div class="chart-title">${this.escapeHtml(viz.title)}</div>` : ''}
        <div class="metric-card-chart">
          <div>
            ${prefix ? `<span class="metric-prefix">${this.escapeHtml(prefix)}</span>` : ''}
            <span class="metric-value">${formattedValue}</span>
            ${suffix ? `<span class="metric-suffix">${this.escapeHtml(suffix)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Parse string numbers to actual numbers (matches ChartRenderer.tsx)
   * Handles currency symbols, commas, spaces
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, spaces
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Clean and normalize data for charts (matches ChartRenderer.tsx)
   * Converts string numbers to actual numbers
   */
  private normalizeChartData(data: any[], numericColumns: string[]): any[] {
    return data.map(row => {
      const normalized: any = { ...row };
      numericColumns.forEach(col => {
        if (col in row) {
          const parsed = this.parseNumber(row[col]);
          normalized[col] = parsed !== null ? parsed : 0;
        }
      });
      return normalized;
    });
  }

  /**
   * Aggregate pie chart data by name (matches ChartRenderer.tsx)
   * Groups duplicate names, sums values, limits to top N slices
   */
  private aggregatePieData(data: any[], nameKey: string, valueKey: string, topN: number = 10): any[] {
    const aggregated = new Map<string, number>();

    data.forEach(row => {
      const name = String(row[nameKey] || 'Unknown');
      const value = this.parseNumber(row[valueKey]) || 0;
      aggregated.set(name, (aggregated.get(name) || 0) + value);
    });

    // Convert to array and sort by value descending
    const sorted = Array.from(aggregated.entries())
      .map(([name, value]) => ({ [nameKey]: name, [valueKey]: value }))
      .sort((a, b) => (b[valueKey] as number) - (a[valueKey] as number));

    // If more than topN items, aggregate the rest into "Other"
    if (sorted.length > topN) {
      const topItems = sorted.slice(0, topN);
      const otherValue = sorted.slice(topN).reduce((sum, item) => sum + (item[valueKey] as number), 0);
      if (otherValue > 0) {
        topItems.push({ [nameKey]: 'Other', [valueKey]: otherValue });
      }
      return topItems;
    }

    return sorted;
  }

  /**
   * Calculate wrapper dimensions and aspect ratio from widget layout
   * Returns both style string and numeric dimensions for canvas attributes
   * DYNAMIC SIZING: Charts adapt to actual available space (no fixed minHeight)
   */
  /**
   * Calculate chart container dimensions from widget layout (2025 RESPONSIVE APPROACH)
   * Returns container dimensions that Chart.js will use for responsive sizing
   */
  private calculateChartContainerDimensions(layout: any, rowHeight?: number): { width: number; height: number } {
    const w = layout?.w || 12;
    const h = layout?.h || 12; // Default h=12 for adequate height

    // A4 width in pixels at 96 DPI: 210mm = ~794px
    // Subtract body padding (40px * 2)
    const PAGE_WIDTH = 794;
    const BODY_PADDING = 40;
    const CONTAINER_WIDTH = PAGE_WIDTH - (BODY_PADDING * 2);

    // Grid system (matching react-grid-layout)
    const COLS = 12;
    const ROW_HEIGHT = rowHeight || 30; // ✅ Use actual rowHeight from layout (default 30px)
    const MARGIN_X = 16;
    const MARGIN_Y = 16;

    // Calculate grid cell size
    const colWidth = (CONTAINER_WIDTH - MARGIN_X * (COLS - 1)) / COLS;

    // Calculate widget dimensions
    const widgetWidth = colWidth * w + MARGIN_X * Math.max(0, w - 1);
    const widgetHeight = ROW_HEIGHT * h + MARGIN_Y * Math.max(0, h - 1);

    // Account for widget padding and title
    const WIDGET_PADDING = 16;
    const CHART_TITLE_HEIGHT = 56;

    // Final container dimensions (what Chart.js will see)
    const containerWidth = widgetWidth - WIDGET_PADDING * 2;
    const containerHeight = widgetHeight - WIDGET_PADDING * 2 - CHART_TITLE_HEIGHT;

    // Validate minimum size
    if (containerWidth <= 0 || containerHeight <= 0) {
      this.logger.warn(
        `Widget ${w}×${h} results in invalid dimensions. Using minimum 300×200px.`
      );
      return { width: 300, height: 200 };
    }

    this.logger.log(
      `Chart container for widget ${w}×${h}: ${containerWidth.toFixed(0)}×${containerHeight.toFixed(0)}px ` +
      `(widget: ${widgetWidth.toFixed(0)}×${widgetHeight.toFixed(0)}px)`
    );

    return {
      width: Math.round(containerWidth),
      height: Math.round(containerHeight)
    };
  }

  /**
   * Generate chart canvas with Chart.js (2025 RESPONSIVE APPROACH)
   * Uses container-based sizing where Chart.js auto-sizes canvas to fill container
   */
  private generateChartCanvas(viz: any, data: any[], chartId: string, layout?: any, rowHeight?: number): string {
    // Calculate container dimensions (Chart.js will size canvas to fill this)
    let containerDimensions;

    if (layout) {
      containerDimensions = this.calculateChartContainerDimensions(layout, rowHeight);
      this.logger.log(
        `Generating ${viz.type} chart "${viz.title}" with widget layout ${layout.w}×${layout.h}: ` +
        `container ${containerDimensions.width}×${containerDimensions.height}px`
      );
    } else {
      // Default for legacy visualizations
      containerDimensions = { width: 750, height: 400 };
      this.logger.log(
        `Generating ${viz.type} chart "${viz.title}" with default container: 750×400px`
      );
    }

    // Prepare chart configuration based on type
    let chartConfig: any = {};

    if (viz.type === 'line' || viz.type === 'bar' || viz.type === 'area') {
      if (!viz.xAxis || !viz.yAxis || !Array.isArray(viz.yAxis)) {
        return '';
      }

      // Normalize numeric data (matches ChartRenderer.tsx)
      const normalizedData = this.normalizeChartData(data, viz.yAxis);

      const labels = normalizedData.map((row) => row[viz.xAxis]);
      const datasets = viz.yAxis.map((yKey: string, index: number) => {
        // FIXED: Use Recharts color palette (matches ChartRenderer.tsx)
        const colors = [
          '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
          '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0',
        ];
        const color = colors[index % colors.length];

        return {
          label: yKey,
          data: normalizedData.map((row) => row[yKey]),
          borderColor: color,
          backgroundColor: viz.type === 'area' ? color + '40' : color,
          fill: viz.type === 'area',
          tension: 0.4,
        };
      });

      chartConfig = {
        type: viz.type === 'area' ? 'line' : viz.type,
        data: { labels, datasets },
        options: {
          responsive: true,              // ✅ 2025: Use responsive with container
          maintainAspectRatio: false,    // ✅ Fill container height
          devicePixelRatio: 2,           // ✅ High resolution for PDF
          animation: {
            duration: 0,                 // No animations
            onComplete: null             // Will be set in HTML
          },
          layout: {
            padding: {
              left: 40,   // ✅ DOUBLED: Prevent Y-axis label cropping
              right: 40,  // ✅ DOUBLED: Prevent overflow
              top: 60,    // ✅ TRIPLED: Room for legend
              bottom: 40  // ✅ DOUBLED: X-axis labels
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                padding: 15,
                boxWidth: 12
              }
            },
            title: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                padding: 10,
                maxRotation: 0,
                autoSkip: true
              }
            },
            x: {
              ticks: {
                padding: 10,
                maxRotation: 45,
                minRotation: 0,
                autoSkip: true
              }
            }
          }
        }
      };
    } else if (viz.type === 'pie') {
      if (!viz.nameKey || !viz.valueKey) {
        return '';
      }

      // FIXED: Aggregate and limit pie chart data to top 10 slices (matches ChartRenderer.tsx)
      const aggregatedData = this.aggregatePieData(data, viz.nameKey, viz.valueKey, 10);
      const labels = aggregatedData.map((row) => row[viz.nameKey]);
      const values = aggregatedData.map((row) => row[viz.valueKey]);

      // FIXED: Use Recharts color palette (matches ChartRenderer.tsx)
      const colors = [
        '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
        '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0',
      ];

      chartConfig = {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
          }],
        },
        options: {
          responsive: true,              // ✅ 2025: Use responsive with container
          maintainAspectRatio: false,    // ✅ Fill container
          devicePixelRatio: 2,           // ✅ High resolution
          animation: {
            duration: 0,
            onComplete: null
          },
          layout: {
            padding: {
              left: 40,
              right: 40,
              top: 60,
              bottom: 40
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: {
                padding: 15,
                boxWidth: 12
              }
            },
          },
        },
      };
    }

    // ✅ 2025 APPROACH: Use positioned container with explicit dimensions
    // Chart.js responsive mode will auto-size canvas to fill this container
    return `
      <div class="chart-container">
        <div class="chart-title">${this.escapeHtml(viz.title || 'Chart')}</div>
        <div class="chart-wrapper" style="position: relative; width: ${containerDimensions.width}px; height: ${containerDimensions.height}px;">
          <canvas id="${chartId}"></canvas>
        </div>
      </div>
      <script>
        (function() {
          const ctx = document.getElementById('${chartId}').getContext('2d');
          const chartConfig = ${JSON.stringify(chartConfig)};

          // Create chart
          const chart = new Chart(ctx, chartConfig);

          // ✅ Mark as ready when rendering complete
          if (chartConfig.options && chartConfig.options.animation) {
            chartConfig.options.animation.onComplete = function() {
              this.canvas.dataset.chartReady = 'true';
            };
          } else {
            // No animation, mark ready immediately
            ctx.canvas.dataset.chartReady = 'true';
          }
        })();
      </script>
    `;
  }

  /**
   * Generate HTML table for section data
   * Shows ALL rows (no pagination) since this is for PDF export
   */
  private generateDataTable(section: ReportSection): string {
    const data = section.rawData as any[];
    if (!data || data.length === 0) {
      return '<p style="text-align: center; color: #999;">Tidak ada data</p>';
    }

    const columns = Object.keys(data[0]);
    const columnTypes = section.columnTypes as Record<string, string>;

    return `
      <div style="font-size: 11px; color: #999; margin-bottom: 10px;">
        Showing all ${data.length} rows
      </div>
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map((col) => `<th>${this.escapeHtml(col)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) => `
            <tr>
              ${columns
                .map((col) => {
                  const value = row[col];
                  const type = columnTypes[col];
                  const className = type === 'NUMBER' ? 'number' : '';
                  return `<td class="${className}">${this.formatValue(value, type)}</td>`;
                })
                .join('')}
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Format value based on type
   */
  private formatValue(value: any, type: string): string {
    if (value === null || value === undefined || value === '') {
      return '<span style="color: #ccc;">-</span>';
    }

    if (type === 'NUMBER') {
      const num = parseFloat(value);
      return isNaN(num) ? this.escapeHtml(String(value)) : num.toLocaleString('id-ID');
    }

    if (type === 'DATE') {
      const date = new Date(value);
      return isNaN(date.getTime())
        ? this.escapeHtml(String(value))
        : date.toLocaleDateString('id-ID');
    }

    return this.escapeHtml(String(value));
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPDF(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      // Launch browser with Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // ✅ 2025: High-resolution viewport with deviceScaleFactor
      await page.setViewport({
        width: 1280,
        height: 1024,
        deviceScaleFactor: 2  // 2x resolution for crisp charts
      });

      // ✅ 2025: Emulate print media
      await page.emulateMediaType('print');

      // Set content and wait for network idle
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // ✅ 2025: Smart wait for all charts to render
      this.logger.log('Waiting for charts to render...');
      try {
        await page.waitForFunction(
          `() => {
            const canvases = document.querySelectorAll('canvas');
            if (canvases.length === 0) return true;
            return Array.from(canvases).every(canvas => canvas.dataset.chartReady === 'true');
          }`,
          { timeout: 10000 }
        );

        this.logger.log('All charts rendered successfully');
      } catch (error) {
        this.logger.warn('Chart render timeout - proceeding anyway');
      }

      // Small buffer for layout stability
      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate actual content height for single-page PDF
      const contentHeight = (await page.evaluate('document.documentElement.scrollHeight')) as number;

      // A4 width in pixels at 96 DPI: 210mm = 794px
      const pageWidth = 794;
      const marginTop = 28; // 10mm in pixels
      const marginBottom = 28;
      const totalHeight = contentHeight + marginTop + marginBottom;

      this.logger.log(`Generating single-page PDF: content=${contentHeight}px, total=${totalHeight}px (${(totalHeight * 0.264583).toFixed(0)}mm)`);

      // Generate PDF as single continuous page (no pagination)
      const pdfBuffer = await page.pdf({
        width: pageWidth,
        height: totalHeight,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
