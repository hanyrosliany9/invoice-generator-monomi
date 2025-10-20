import { Injectable } from "@nestjs/common";
import { EFakturStatus } from "@prisma/client";

/**
 * e-Faktur Validator Service
 * Handles Indonesian e-Faktur (electronic tax invoice) validation
 *
 * e-Faktur NSFP Format: XXX.XXX-YY.ZZZZZZZZ
 * - XXX.XXX: Invoice code and tax branch
 * - YY: Year (last 2 digits)
 * - ZZZZZZZZ: Serial number (8 digits)
 *
 * Example: 010.123-25.12345678
 */
@Injectable()
export class EFakturValidatorService {
  // NSFP (Nomor Seri Faktur Pajak) Pattern
  private readonly NSFP_PATTERN = /^\d{3}\.\d{3}-\d{2}\.\d{8}$/;

  // Valid invoice codes (first 3 digits)
  private readonly VALID_INVOICE_CODES = [
    "010", // Normal invoice
    "020", // Replacement invoice
    "030", // Credit note
    "040", // Debit note
  ];

  /**
   * Validate NSFP format
   *
   * @param nsfp - Nomor Seri Faktur Pajak
   * @returns Whether NSFP format is valid
   */
  validateNSFPFormat(nsfp: string): boolean {
    if (!nsfp || nsfp.trim() === "") {
      return false;
    }

    // Check pattern: XXX.XXX-YY.ZZZZZZZZ
    if (!this.NSFP_PATTERN.test(nsfp)) {
      return false;
    }

    // Extract invoice code (first 3 digits)
    const invoiceCode = nsfp.substring(0, 3);
    if (!this.VALID_INVOICE_CODES.includes(invoiceCode)) {
      return false;
    }

    // Extract year (positions 8-9)
    const yearStr = nsfp.substring(8, 10);
    const year = parseInt(yearStr, 10);
    const currentYear = new Date().getFullYear() % 100; // Last 2 digits

    // Year should be within reasonable range (current year ± 2 years)
    if (year < currentYear - 2 || year > currentYear + 1) {
      return false;
    }

    return true;
  }

  /**
   * Parse NSFP into components
   *
   * @param nsfp - Nomor Seri Faktur Pajak
   * @returns Parsed components or null if invalid
   */
  parseNSFP(nsfp: string): {
    invoiceCode: string;
    taxBranch: string;
    year: string;
    serialNumber: string;
    full: string;
  } | null {
    if (!this.validateNSFPFormat(nsfp)) {
      return null;
    }

    return {
      invoiceCode: nsfp.substring(0, 3), // 010
      taxBranch: nsfp.substring(4, 7), // 123
      year: nsfp.substring(8, 10), // 25
      serialNumber: nsfp.substring(11, 19), // 12345678
      full: nsfp,
    };
  }

  /**
   * Get invoice type from NSFP code
   *
   * @param nsfp - Nomor Seri Faktur Pajak
   * @returns Invoice type description
   */
  getInvoiceType(nsfp: string): string {
    const parsed = this.parseNSFP(nsfp);
    if (!parsed) {
      return "Unknown";
    }

    switch (parsed.invoiceCode) {
      case "010":
        return "Normal Invoice";
      case "020":
        return "Replacement Invoice";
      case "030":
        return "Credit Note";
      case "040":
        return "Debit Note";
      default:
        return "Unknown";
    }
  }

  /**
   * Validate e-Faktur amounts match expense amounts
   *
   * @param eFakturAmount - Amount on e-Faktur
   * @param expenseAmount - Amount on expense record
   * @param tolerance - Allowed difference (default 1 IDR)
   * @returns Whether amounts match within tolerance
   */
  validateAmounts(
    eFakturAmount: number,
    expenseAmount: number,
    tolerance: number = 1,
  ): boolean {
    return Math.abs(eFakturAmount - expenseAmount) <= tolerance;
  }

  /**
   * Check if e-Faktur is expired
   * e-Faktur is considered expired if older than 3 months
   *
   * @param issueDate - e-Faktur issue date
   * @returns Whether e-Faktur is expired
   */
  isExpired(issueDate: Date): boolean {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return issueDate < threeMonthsAgo;
  }

  /**
   * Validate QR code format (basic check)
   * Full QR validation would require DGT API integration
   *
   * @param qrCode - QR code data (base64 or URL)
   * @returns Whether QR code appears valid
   */
  validateQRCodeFormat(qrCode: string): boolean {
    if (!qrCode || qrCode.trim() === "") {
      return false;
    }

    // Check if it's a base64 string or URL
    const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(qrCode);
    const isURL = qrCode.startsWith("http://") || qrCode.startsWith("https://");

    return isBase64 || isURL;
  }

  /**
   * Determine e-Faktur status based on validation
   *
   * @param nsfp - NSFP number
   * @param qrCode - QR code data
   * @param issueDate - Issue date
   * @returns Suggested e-Faktur status
   */
  determineStatus(
    nsfp: string | null,
    qrCode: string | null,
    issueDate: Date | null,
  ): EFakturStatus {
    // No e-Faktur provided
    if (!nsfp && !qrCode) {
      return EFakturStatus.NOT_REQUIRED;
    }

    // e-Faktur provided but incomplete
    if (nsfp && !qrCode) {
      return EFakturStatus.PENDING;
    }

    // Invalid NSFP format
    if (nsfp && !this.validateNSFPFormat(nsfp)) {
      return EFakturStatus.INVALID;
    }

    // Check expiration
    if (issueDate && this.isExpired(issueDate)) {
      return EFakturStatus.EXPIRED;
    }

    // e-Faktur uploaded, awaiting DGT validation
    if (nsfp && qrCode) {
      return EFakturStatus.UPLOADED;
    }

    return EFakturStatus.PENDING;
  }

  /**
   * Validate complete e-Faktur data
   *
   * @param data - e-Faktur data
   * @returns Validation result with errors
   */
  validateEFakturData(data: {
    nsfp: string;
    qrCode: string;
    vendorNPWP: string;
    grossAmount: number;
    ppnAmount: number;
    totalAmount: number;
    issueDate: Date;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate NSFP format
    if (!this.validateNSFPFormat(data.nsfp)) {
      errors.push("Invalid NSFP format. Expected: XXX.XXX-YY.ZZZZZZZZ");
    }

    // Validate QR code
    if (!this.validateQRCodeFormat(data.qrCode)) {
      errors.push("Invalid QR code format");
    }

    // Validate vendor NPWP (15 digits with dots and hyphen)
    if (!this.validateNPWP(data.vendorNPWP)) {
      errors.push("Invalid vendor NPWP format");
    }

    // Validate amounts
    const calculatedTotal = data.grossAmount + data.ppnAmount;
    if (!this.validateAmounts(calculatedTotal, data.totalAmount)) {
      errors.push("Total amount mismatch (gross + PPN ≠ total)");
    }

    // Check expiration
    if (this.isExpired(data.issueDate)) {
      errors.push("e-Faktur is expired (older than 3 months)");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate NPWP (Nomor Pokok Wajib Pajak) format
   * Format: XX.XXX.XXX.X-XXX.XXX
   *
   * @param npwp - NPWP number
   * @returns Whether NPWP format is valid
   */
  validateNPWP(npwp: string): boolean {
    if (!npwp || npwp.trim() === "") {
      return false;
    }

    // NPWP pattern: XX.XXX.XXX.X-XXX.XXX (15 digits total)
    const npwpPattern = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;
    return npwpPattern.test(npwp);
  }

  /**
   * Format NPWP with dots and hyphen
   *
   * @param npwp - Raw NPWP (15 digits)
   * @returns Formatted NPWP
   */
  formatNPWP(npwp: string): string {
    // Remove all non-digits
    const digits = npwp.replace(/\D/g, "");

    if (digits.length !== 15) {
      return npwp; // Return as-is if invalid
    }

    // Format: XX.XXX.XXX.X-XXX.XXX
    return `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}.${digits.substring(8, 9)}-${digits.substring(9, 12)}.${digits.substring(12, 15)}`;
  }

  /**
   * Check if expense requires e-Faktur
   * Based on Indonesian tax regulations
   *
   * @param grossAmount - Expense amount
   * @param accountCode - PSAK account code
   * @returns Whether e-Faktur is required
   */
  isEFakturRequired(grossAmount: number, accountCode: string): boolean {
    // Salaries and non-cash expenses don't require e-Faktur
    const nonEFakturAccounts = ["6-1010", "6-2010", "6-2100", "6-2090"];
    if (nonEFakturAccounts.includes(accountCode)) {
      return false;
    }

    // Small amounts (< 1 million IDR) may not require e-Faktur
    // But this depends on vendor PKP status
    if (grossAmount < 1000000) {
      return false;
    }

    return true;
  }

  /**
   * Get e-Faktur status display name (Indonesian)
   *
   * @param status - e-Faktur status
   * @returns Indonesian display name
   */
  getStatusDisplayName(status: EFakturStatus): string {
    switch (status) {
      case EFakturStatus.NOT_REQUIRED:
        return "Tidak Diperlukan";
      case EFakturStatus.PENDING:
        return "Menunggu Upload";
      case EFakturStatus.UPLOADED:
        return "Telah Diupload";
      case EFakturStatus.VALID:
        return "Valid";
      case EFakturStatus.INVALID:
        return "Tidak Valid";
      case EFakturStatus.EXPIRED:
        return "Kadaluarsa";
      default:
        return "Unknown";
    }
  }
}
