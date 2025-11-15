import { Injectable } from "@nestjs/common";
import * as puppeteer from "puppeteer";

export interface IndonesianCompanyInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  npwp: string; // Indonesian tax identification number
  siup: string; // Indonesian business license
}

export interface IndonesianReportHeader {
  reportTitle: string;
  reportSubtitle: string;
  reportPeriod: string;
  preparationDate: Date;
  reportType: string;
}

export interface PdfFormattingOptions {
  format?: "A4" | "A3" | "Letter";
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  orientation?: "portrait" | "landscape";
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  scale?: number;
}

@Injectable()
export class IndonesianPdfFormatter {
  /**
   * Validate Indonesian business compliance requirements
   */
  static validateIndonesianCompliance(
    companyInfo: IndonesianCompanyInfo,
  ): string[] {
    const errors: string[] = [];

    if (!companyInfo.npwp || !this.isValidNPWP(companyInfo.npwp)) {
      errors.push("NPWP tidak valid atau tidak ada");
    }

    if (!companyInfo.siup || companyInfo.siup.trim().length === 0) {
      errors.push("SIUP tidak boleh kosong");
    }

    if (!companyInfo.name || companyInfo.name.trim().length === 0) {
      errors.push("Nama perusahaan tidak boleh kosong");
    }

    if (!companyInfo.address || companyInfo.address.trim().length === 0) {
      errors.push("Alamat perusahaan tidak boleh kosong");
    }

    return errors;
  }

  /**
   * Validate Indonesian NPWP format
   */
  private static isValidNPWP(npwp: string): boolean {
    // NPWP format: XX.XXX.XXX.X-XXX.XXX
    const npwpPattern = /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/;
    return npwpPattern.test(npwp);
  }

  /**
   * Get company logo as data URI (SVG or PNG)
   */
  static getCompanyLogo(): string {
    // Logo will be embedded at build time
    const fs = require("fs");
    const path = require("path");

    try {
      // Try SVG first (optimized logo)
      const svgLogoPath = path.join(__dirname, "../../../assets/logo.svg");
      if (fs.existsSync(svgLogoPath)) {
        const svgContent = fs.readFileSync(svgLogoPath, "utf8");
        // Encode SVG as data URI
        const svgBase64 = Buffer.from(svgContent).toString("base64");
        return `data:image/svg+xml;base64,${svgBase64}`;
      }

      // Fallback to PNG
      const pngLogoPath = path.join(__dirname, "../../../assets/logo.png");
      if (fs.existsSync(pngLogoPath)) {
        const logoBuffer = fs.readFileSync(pngLogoPath);
        const logoBase64 = logoBuffer.toString("base64");
        return `data:image/png;base64,${logoBase64}`;
      }
    } catch (error) {
      // Logo not found, return empty string
      console.warn(`Company logo not found, using text-only letterhead`);
      console.error(error);
    }

    return "";
  }

  /**
   * Generate Indonesian business letterhead HTML with logo
   */
  static generateIndonesianLetterhead(
    companyInfo: IndonesianCompanyInfo,
    reportHeader: IndonesianReportHeader,
  ): string {
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const logoDataUri = this.getCompanyLogo();

    return `
      <div class="letterhead" style="margin-bottom: 30px; border-bottom: 3px solid #1F4E79; padding-bottom: 20px;">
        <div class="company-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
          ${
            logoDataUri
              ? `<div class="company-logo" style="margin-right: 20px; flex-shrink: 0;">
            <img src="${logoDataUri}" alt="${companyInfo.name}" style="height: 32px; width: auto; max-width: 180px; object-fit: contain;" />
          </div>`
              : `<div class="company-logo-text" style="margin-right: 20px; flex-shrink: 0;">
            <h1 style="margin: 0; color: #1F4E79; font-size: 18px; font-weight: bold; font-family: 'Arial', sans-serif;">
              ${companyInfo.name}
            </h1>
          </div>`
          }
          <div class="company-info" style="flex: 1; margin-top: 2px;">
            <div style="color: #333; font-size: 11px; line-height: 1.5;">
              <div>${companyInfo.address}</div>
              <div>${companyInfo.city} ${companyInfo.postalCode}</div>
              <div>Telp: ${companyInfo.phone} | Email: ${companyInfo.email}</div>
              <div>Website: ${companyInfo.website}</div>
            </div>
          </div>
          <div class="license-info" style="text-align: right; font-size: 10px; color: #666; margin-top: 2px;">
            <div><strong>NPWP:</strong> ${companyInfo.npwp}</div>
            <div><strong>SIUP:</strong> ${companyInfo.siup}</div>
            <div style="margin-top: 8px; color: #999;">Dicetak: ${currentDate}</div>
          </div>
        </div>

        <div class="report-header" style="text-align: center; margin-top: 20px;">
          <h2 style="margin: 0; color: #1F4E79; font-size: 18px; font-weight: bold;">
            ${reportHeader.reportTitle}
          </h2>
          <h3 style="margin: 5px 0 0 0; color: #2E7D32; font-size: 14px; font-weight: normal;">
            ${reportHeader.reportSubtitle}
          </h3>
          <div style="margin-top: 8px; color: #666; font-size: 12px; font-weight: bold;">
            Periode: ${reportHeader.reportPeriod}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate professional table HTML with SAK EMKM compliance
   */
  static generateIndonesianTable(
    headers: string[],
    data: any[][],
    tableId: string,
    options: {
      showSummary?: boolean;
      summaryRow?: any[];
      materaiInfo?: { count: number; totalCost: number };
      balanceValidation?: boolean;
    } = {},
  ): string {
    const tableStyle = `
      <style>
        .indonesian-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-family: 'Arial', sans-serif;
          font-size: 11px;
        }
        .indonesian-table th {
          background-color: #1F4E79;
          color: white;
          padding: 12px 8px;
          text-align: center;
          border: 1px solid #ccc;
          font-weight: bold;
          font-size: 11px;
        }
        .indonesian-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
          vertical-align: top;
        }
        .indonesian-table .number-cell {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        .indonesian-table .center-cell {
          text-align: center;
        }
        .indonesian-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .indonesian-table tbody tr:hover {
          background-color: #f0f8ff;
        }
        .summary-row {
          background-color: #e8f4f8 !important;
          font-weight: bold;
          border-top: 2px solid #1F4E79;
        }
        .summary-row td {
          background-color: #e8f4f8 !important;
          font-weight: bold;
        }
        .materai-info {
          margin-top: 15px;
          padding: 10px;
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 5px;
          font-size: 10px;
        }
        .compliance-note {
          margin-top: 10px;
          font-size: 9px;
          color: #666;
          font-style: italic;
        }
      </style>
    `;

    let tableHtml = tableStyle;
    tableHtml += `<table class="indonesian-table" id="${tableId}">`;

    // Headers
    tableHtml += "<thead><tr>";
    headers.forEach((header) => {
      tableHtml += `<th>${header}</th>`;
    });
    tableHtml += "</tr></thead>";

    // Data rows
    tableHtml += "<tbody>";
    data.forEach((row, index) => {
      tableHtml += "<tr>";
      row.forEach((cell, cellIndex) => {
        const isNumberColumn = this.isNumberColumn(headers[cellIndex]);
        const cellClass = isNumberColumn ? "number-cell" : "";
        const formattedCell =
          isNumberColumn && typeof cell === "number"
            ? this.formatIndonesianCurrency(cell)
            : cell;
        tableHtml += `<td class="${cellClass}">${formattedCell}</td>`;
      });
      tableHtml += "</tr>";
    });

    // Summary row
    if (options.showSummary && options.summaryRow) {
      tableHtml += '<tr class="summary-row">';
      options.summaryRow.forEach((cell, cellIndex) => {
        const isNumberColumn = this.isNumberColumn(headers[cellIndex]);
        const cellClass = isNumberColumn ? "number-cell" : "";
        const formattedCell =
          isNumberColumn && typeof cell === "number"
            ? this.formatIndonesianCurrency(cell)
            : cell;
        tableHtml += `<td class="${cellClass}">${formattedCell}</td>`;
      });
      tableHtml += "</tr>";
    }

    tableHtml += "</tbody></table>";

    // Materai information for SAK EMKM compliance
    if (options.materaiInfo && options.materaiInfo.count > 0) {
      tableHtml += `
        <div class="materai-info">
          <strong>Informasi Materai (SAK EMKM):</strong><br>
          • Total invoice yang wajib materai: ${options.materaiInfo.count} invoice<br>
          • Estimasi biaya materai: ${this.formatIndonesianCurrency(options.materaiInfo.totalCost)}<br>
          • Materai wajib untuk invoice > Rp 5.000.000 (UU No. 10/2020)
        </div>
      `;
    }

    // Compliance note
    tableHtml += `
      <div class="compliance-note">
        Laporan ini disusun sesuai dengan Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM)
        yang berlaku di Indonesia. Semua nominal dalam Rupiah (IDR).
      </div>
    `;

    return tableHtml;
  }

  /**
   * Check if column contains numeric data
   */
  private static isNumberColumn(headerName: string): boolean {
    const numberHeaders = [
      "jumlah",
      "amount",
      "total",
      "saldo",
      "penjualan",
      "pembayaran",
      "idr",
      "rupiah",
      "nilai",
      "harga",
      "biaya",
      "piutang",
    ];
    return numberHeaders.some((keyword) =>
      headerName.toLowerCase().includes(keyword),
    );
  }

  /**
   * Format currency in Indonesian format
   */
  private static formatIndonesianCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Generate Indonesian footer with signature blocks
   */
  static generateIndonesianFooter(
    companyInfo: IndonesianCompanyInfo,
    preparedBy: string = "Sistem Akuntansi Digital",
    approvedBy: string = "Manajer Keuangan",
  ): string {
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return `
      <div class="indonesian-footer" style="margin-top: 40px; page-break-inside: avoid;">
        <div class="signature-section" style="display: flex; justify-content: space-between; margin-top: 30px;">
          <div class="signature-block" style="text-align: center; width: 200px;">
            <div style="font-size: 11px; margin-bottom: 5px;">Disiapkan Oleh:</div>
            <div style="border-bottom: 1px solid #000; height: 60px; margin: 10px 0;"></div>
            <div style="font-size: 11px; font-weight: bold;">${preparedBy}</div>
            <div style="font-size: 10px; color: #666;">Tanggal: ${currentDate}</div>
          </div>
          
          <div class="signature-block" style="text-align: center; width: 200px;">
            <div style="font-size: 11px; margin-bottom: 5px;">Disetujui Oleh:</div>
            <div style="border-bottom: 1px solid #000; height: 60px; margin: 10px 0;"></div>
            <div style="font-size: 11px; font-weight: bold;">${approvedBy}</div>
            <div style="font-size: 10px; color: #666;">Tanggal: ______________</div>
          </div>
        </div>
        
        <div class="footer-info" style="margin-top: 30px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          <div>Laporan ini digenerate secara otomatis oleh Sistem Manajemen Bisnis ${companyInfo.name}</div>
          <div style="margin-top: 3px;">Dicetak pada: ${currentDate} | Dokumen SAK EMKM Compliant</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate complete HTML document for Indonesian business report
   */
  static generateCompleteReportHtml(
    companyInfo: IndonesianCompanyInfo,
    reportHeader: IndonesianReportHeader,
    tablesHtml: string,
    options: PdfFormattingOptions = {},
  ): string {
    const letterheadHtml = this.generateIndonesianLetterhead(
      companyInfo,
      reportHeader,
    );
    const footerHtml = this.generateIndonesianFooter(companyInfo);

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportHeader.reportTitle} - ${companyInfo.name}</title>
        <style>
          @page {
            size: ${options.format || "A4"};
            margin: ${options.margin?.top || "20mm"} ${options.margin?.right || "15mm"} ${options.margin?.bottom || "20mm"} ${options.margin?.left || "15mm"};
          }
          
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            background: white;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-break {
            page-break-inside: avoid;
          }
          
          .indonesian-currency {
            font-family: 'Courier New', monospace;
            text-align: right;
          }
          
          .indonesian-date {
            text-align: center;
          }
          
          h1, h2, h3 {
            color: #1F4E79;
            margin: 0;
            padding: 0;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(31, 78, 121, 0.1);
            z-index: -1;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="watermark">SAK EMKM</div>
        
        ${letterheadHtml}
        
        <div class="report-content">
          ${tablesHtml}
        </div>
        
        ${footerHtml}
      </body>
      </html>
    `;
  }

  /**
   * Default PDF formatting options for Indonesian business documents
   */
  static getDefaultPdfOptions(): PdfFormattingOptions {
    return {
      format: "A4",
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
      orientation: "portrait",
      displayHeaderFooter: false,
      printBackground: true,
      scale: 0.95,
    };
  }

  /**
   * Generate PDF buffer from HTML content
   */
  static async generatePdfBuffer(
    htmlContent: string,
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      // Set content and wait for network idle
      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
      });

      // Merge options with defaults
      const pdfOptions = { ...this.getDefaultPdfOptions(), ...options };

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: pdfOptions.format as any,
        margin: pdfOptions.margin,
        landscape: pdfOptions.orientation === "landscape",
        displayHeaderFooter: pdfOptions.displayHeaderFooter,
        headerTemplate: pdfOptions.headerTemplate || "",
        footerTemplate: pdfOptions.footerTemplate || "",
        printBackground: pdfOptions.printBackground,
        scale: pdfOptions.scale,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Format Indonesian date for display
   */
  static formatIndonesianDate(date: Date): string {
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  /**
   * Format Indonesian short date (dd/mm/yyyy)
   */
  static formatIndonesianShortDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Get Indonesian month name
   */
  static getIndonesianMonthName(monthIndex: number): string {
    const indonesianMonths = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return indonesianMonths[monthIndex] || "Januari";
  }
}
