// Indonesian Business Excel Formatter - SAK EMKM Compliant
// Based on Indonesian Financial Reporting Standards and Professional Excel Formatting Guidelines
import * as ExcelJS from "exceljs";

export interface IndonesianCompanyInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  npwp?: string; // Nomor Pokok Wajib Pajak (Tax ID)
  siup?: string; // Surat Izin Usaha Perdagangan
}

export interface IndonesianReportHeader {
  reportTitle: string;
  reportSubtitle?: string;
  reportPeriod: string;
  preparationDate: Date;
  reportType:
    | "LAPORAN_POSISI_KEUANGAN"
    | "LAPORAN_LABA_RUGI"
    | "LAPORAN_ARUS_KAS"
    | "RINCIAN_PENJUALAN"
    | "RINCIAN_PIUTANG"
    | "NERACA_SALDO"
    | "BUKU_BESAR"
    | "PIUTANG_USAHA"
    | "HUTANG_USAHA"
    | "AGING_PIUTANG"
    | "AGING_HUTANG";
}

export class IndonesianExcelFormatter {
  /**
   * Apply Indonesian Business Letterhead Format (SAK EMKM Compliant)
   * Based on Indonesian professional standards with proper company identity
   */
  static formatIndonesianLetterhead(
    worksheet: ExcelJS.Worksheet,
    companyInfo: IndonesianCompanyInfo,
    reportHeader: IndonesianReportHeader,
  ): number {
    // Row 1: Company Name (15pt, Bold, Indonesian Business Standard)
    const companyNameRow = worksheet.addRow([companyInfo.name]);
    companyNameRow.font = {
      name: "Arial",
      size: 15,
      bold: true,
      color: { argb: "FF1F4E79" }, // Professional Indonesian Navy Blue
    };
    companyNameRow.alignment = { horizontal: "left", vertical: "middle" };
    companyNameRow.height = 24;

    // Row 2: Company Address (10pt, Indonesian Standard)
    const addressText = `${companyInfo.address}, ${companyInfo.city} ${companyInfo.postalCode}`;
    const addressRow = worksheet.addRow([addressText]);
    addressRow.font = { name: "Arial", size: 10, color: { argb: "FF404040" } };
    addressRow.alignment = { horizontal: "left", vertical: "middle" };

    // Row 3: Contact Information (10pt, Indonesian Standard)
    const contactText = `Telp: ${companyInfo.phone} | Email: ${companyInfo.email}`;
    const contactRow = worksheet.addRow([contactText]);
    contactRow.font = { name: "Arial", size: 10, color: { argb: "FF404040" } };
    contactRow.alignment = { horizontal: "left", vertical: "middle" };

    // Row 4: Website and Tax Information (if available)
    if (companyInfo.website || companyInfo.npwp) {
      const additionalInfo = [];
      if (companyInfo.website)
        additionalInfo.push(`Website: ${companyInfo.website}`);
      if (companyInfo.npwp) additionalInfo.push(`NPWP: ${companyInfo.npwp}`);

      const additionalRow = worksheet.addRow([additionalInfo.join(" | ")]);
      additionalRow.font = {
        name: "Arial",
        size: 9,
        color: { argb: "FF666666" },
      };
      additionalRow.alignment = { horizontal: "left", vertical: "middle" };
    }

    // Row 5: Separator Line (Indonesian Professional Standard)
    const separatorRow = worksheet.addRow([""]);
    separatorRow.height = 5;

    // Add top border line under company info
    const headerLastRow = worksheet.rowCount;
    const headerCell = worksheet.getCell(headerLastRow, 1);
    headerCell.border = {
      bottom: { style: "thick", color: { argb: "FF1F4E79" } },
    };

    // Row 6: Empty spacer
    worksheet.addRow([""]);

    // Row 7: Report Title (Indonesian SAK EMKM Standard)
    const titleRow = worksheet.addRow([reportHeader.reportTitle.toUpperCase()]);
    titleRow.font = {
      name: "Arial",
      size: 14,
      bold: true,
      color: { argb: "FF1F4E79" },
    };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 22;

    // Row 8: Report Subtitle (if provided)
    if (reportHeader.reportSubtitle) {
      const subtitleRow = worksheet.addRow([
        reportHeader.reportSubtitle.toUpperCase(),
      ]);
      subtitleRow.font = {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: "FF1F4E79" },
      };
      subtitleRow.alignment = { horizontal: "center", vertical: "middle" };
    }

    // Row 9: Report Period (Indonesian Date Format)
    const periodText = `PERIODE: ${reportHeader.reportPeriod}`;
    const periodRow = worksheet.addRow([periodText]);
    periodRow.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FF404040" },
    };
    periodRow.alignment = { horizontal: "center", vertical: "middle" };

    // Row 10: Preparation Date (Indonesian Format)
    const prepDateText = `Disusun pada: ${this.formatIndonesianDate(reportHeader.preparationDate)}`;
    const prepDateRow = worksheet.addRow([prepDateText]);
    prepDateRow.font = {
      name: "Arial",
      size: 9,
      color: { argb: "FF666666" },
    };
    prepDateRow.alignment = { horizontal: "center", vertical: "middle" };

    // Row 11: Empty spacer before data
    worksheet.addRow([""]);

    return worksheet.rowCount; // Return the row number where data should start
  }

  /**
   * Apply Indonesian SAK EMKM Table Formatting Standards
   */
  static formatIndonesianTable(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    tableName: string,
    isFinancialStatement: boolean = true,
  ): void {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = worksheet.getCell(row, col);

        // Header row formatting (Indonesian Professional Standard)
        if (row === startRow) {
          cell.font = {
            name: "Arial",
            size: 11,
            bold: true,
            color: { argb: "FFFFFFFF" },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F4E79" }, // Indonesian Professional Navy Blue
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          worksheet.getRow(row).height = 28;

          // Thick border for headers (Indonesian Standard)
          cell.border = {
            top: { style: "thick", color: { argb: "FF000000" } },
            left: { style: "thick", color: { argb: "FF000000" } },
            bottom: { style: "thick", color: { argb: "FF000000" } },
            right: { style: "thick", color: { argb: "FF000000" } },
          };
        }
        // Data rows formatting
        else if (row < endRow) {
          // Alternating row colors (Indonesian Professional Practice)
          if ((row - startRow) % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8F9FA" }, // Light Indonesian Gray
            };
          }

          // Font formatting for data (Indonesian Standard)
          cell.font = {
            name: "Arial",
            size: 10,
            color: { argb: "FF000000" },
          };

          // Alignment based on content type (Indonesian Business Practice)
          if (typeof cell.value === "number") {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            // Apply Indonesian currency formatting if it's a financial value
            if (isFinancialStatement) {
              cell.numFmt = '"Rp "#,##0';
            }
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }

          // Thin border for data cells
          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D0D0" } },
            left: { style: "thin", color: { argb: "FFD0D0D0" } },
            bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
            right: { style: "thin", color: { argb: "FFD0D0D0" } },
          };
        }
        // Summary/Total row formatting (Indonesian SAK EMKM Standard)
        else {
          cell.font = {
            name: "Arial",
            size: 11,
            bold: true,
            color: { argb: "FFFFFFFF" },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF2E7D32" }, // Indonesian Professional Green for totals
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          worksheet.getRow(row).height = 26;

          // Thick border for summary rows
          cell.border = {
            top: { style: "thick", color: { argb: "FF000000" } },
            left: { style: "thick", color: { argb: "FF000000" } },
            bottom: { style: "thick", color: { argb: "FF000000" } },
            right: { style: "thick", color: { argb: "FF000000" } },
          };

          // Apply Indonesian currency formatting for totals
          if (typeof cell.value === "number" && isFinancialStatement) {
            cell.numFmt = '"Rp "#,##0';
            cell.alignment = { horizontal: "right", vertical: "middle" };
          }
        }
      }
    }
  }

  /**
   * Apply Indonesian Currency Formatting (Rupiah)
   * Following Indonesian accounting standards
   */
  static applyIndonesianCurrencyFormat(
    worksheet: ExcelJS.Worksheet,
    columns: number[],
  ): void {
    columns.forEach((colNum) => {
      const column = worksheet.getColumn(colNum);
      column.numFmt = '"Rp "#,##0'; // Indonesian Rupiah format without decimals (standard practice)
    });
  }

  /**
   * Apply Indonesian Date Formatting
   * Following Indonesian date conventions (dd/mm/yyyy)
   */
  static applyIndonesianDateFormat(
    worksheet: ExcelJS.Worksheet,
    columns: number[],
  ): void {
    columns.forEach((colNum) => {
      const column = worksheet.getColumn(colNum);
      column.numFmt = "dd/mm/yyyy"; // Indonesian date format
    });
  }

  /**
   * Format Indonesian date string
   */
  static formatIndonesianDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Indonesian month names
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

    return `${day} ${indonesianMonths[month - 1]} ${year}`;
  }

  /**
   * Format negative numbers in red (Indonesian Professional Standard)
   */
  static formatNegativeNumbers(
    worksheet: ExcelJS.Worksheet,
    columns: number[],
  ): void {
    columns.forEach((colNum) => {
      const column = worksheet.getColumn(colNum);
      column.numFmt = '"Rp "#,##0_);[Red]("Rp "#,##0)'; // Red formatting for negative numbers
    });
  }

  /**
   * Add Indonesian Professional Footer
   */
  static addIndonesianFooter(
    worksheet: ExcelJS.Worksheet,
    companyInfo: IndonesianCompanyInfo,
    preparedBy: string = "Sistem Manajemen Keuangan",
    approvedBy?: string,
  ): void {
    const lastRow = worksheet.rowCount;

    // Add spacing
    worksheet.addRow([""]);
    worksheet.addRow([""]);

    // Signature section (Indonesian Business Standard)
    const signatureStartRow = worksheet.rowCount + 1;

    if (approvedBy) {
      // Two-column signature layout
      worksheet.addRow(["", "", "", "Mengetahui,", "", "Disusun oleh,"]);
      worksheet.addRow([""]);
      worksheet.addRow([""]);
      worksheet.addRow([""]);
      worksheet.addRow(["", "", "", approvedBy, "", preparedBy]);
      worksheet.addRow(["", "", "", "Pimpinan", "", "Staff Keuangan"]);
    } else {
      // Single signature
      worksheet.addRow(["", "", "", "", "Disusun oleh,"]);
      worksheet.addRow([""]);
      worksheet.addRow([""]);
      worksheet.addRow([""]);
      worksheet.addRow(["", "", "", "", preparedBy]);
      worksheet.addRow(["", "", "", "", "Staff Keuangan"]);
    }

    // Footer information
    worksheet.addRow([""]);
    const footerText = `Dokumen ini dibuat secara otomatis oleh Sistem Manajemen Bisnis ${companyInfo.name}`;
    const footerRow = worksheet.addRow([footerText]);
    footerRow.font = {
      name: "Arial",
      size: 8,
      italic: true,
      color: { argb: "FF666666" },
    };
    footerRow.alignment = { horizontal: "center", vertical: "middle" };
  }

  /**
   * Set Indonesian Professional Column Widths
   */
  static setIndonesianColumnWidths(
    worksheet: ExcelJS.Worksheet,
    columnCount: number,
  ): void {
    // Indonesian business standard column widths
    for (let i = 1; i <= columnCount; i++) {
      const column = worksheet.getColumn(i);

      if (i === 1) {
        column.width = 5; // No./Index column
      } else if (i === 2) {
        column.width = 25; // Name/Description column (wider for Indonesian text)
      } else if (i <= 4) {
        column.width = 18; // Date and reference columns
      } else {
        column.width = 15; // Amount columns
      }
    }
  }

  /**
   * Apply Indonesian Page Setup
   */
  static applyIndonesianPageSetup(worksheet: ExcelJS.Worksheet): void {
    // Indonesian business standard page setup
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: "portrait",
      margins: {
        left: 0.75,
        right: 0.75,
        top: 1.0,
        bottom: 1.0,
        header: 0.3,
        footer: 0.3,
      },
      printTitlesRow: "1:12", // Print headers on each page
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
  }

  /**
   * Validate Indonesian Business Requirements
   */
  static validateIndonesianCompliance(
    companyInfo: IndonesianCompanyInfo,
  ): string[] {
    const errors: string[] = [];

    if (!companyInfo.name) errors.push("Nama perusahaan harus diisi");
    if (!companyInfo.address) errors.push("Alamat perusahaan harus diisi");
    if (!companyInfo.phone) errors.push("Nomor telepon harus diisi");
    if (!companyInfo.email) errors.push("Email perusahaan harus diisi");

    // Validate Indonesian phone format
    if (
      companyInfo.phone &&
      !companyInfo.phone.match(/^(\+62|62|0)[0-9]{8,11}$/)
    ) {
      errors.push("Format nomor telepon Indonesia tidak valid");
    }

    // Validate NPWP format if provided
    if (
      companyInfo.npwp &&
      !companyInfo.npwp.match(
        /^[0-9]{2}\.[0-9]{3}\.[0-9]{3}\.[0-9]{1}-[0-9]{3}\.[0-9]{3}$/,
      )
    ) {
      errors.push("Format NPWP tidak valid (contoh: 01.234.567.8-901.234)");
    }

    return errors;
  }
}
