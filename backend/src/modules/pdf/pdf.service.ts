import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { join } from "path";
import { readFileSync } from "fs";
import { SettingsService } from "../settings/settings.service";
import { InvoicesService } from "../invoices/invoices.service";
import { QuotationsService } from "../quotations/quotations.service";
import { generateProjectHTML } from "./templates/project.html";

@Injectable()
export class PdfService {
  private templatePath = join(__dirname, "templates");
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async generateInvoicePDF(invoiceData: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      // Set page format for A4
      await page.setViewport({ width: 794, height: 1123 });

      // Generate HTML content
      const htmlContent = await this.generateInvoiceHTML(invoiceData);

      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0.3in",
          right: "0.3in",
          bottom: "0.3in",
          left: "0.3in",
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async generateQuotationPDF(quotationData: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      // Set page format for A4
      await page.setViewport({ width: 794, height: 1123 });

      // Generate HTML content
      const htmlContent = await this.generateQuotationHTML(quotationData);

      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private async getCompanySettings() {
    try {
      return await this.settingsService.getCompanySettings();
    } catch (error) {
      // Return default fallback settings
      return {
        companyName: "PT Teknologi Indonesia",
        address: "Jakarta, Indonesia",
        phone: "",
        email: "",
        website: "",
        taxNumber: "",
        bankBCA: "",
        bankMandiri: "",
        bankBNI: "",
      };
    }
  }

  /**
   * Generate dynamic payment information from company settings
   * This method provides a runtime fallback for invoices with placeholder text
   */
  private async generateDynamicPaymentInfo(companyData: any): Promise<string> {
    const bankAccounts: string[] = [];

    // Build bank account list
    if (companyData.bankBCA) {
      bankAccounts.push(`BCA: ${companyData.bankBCA}`);
    }
    if (companyData.bankMandiri) {
      bankAccounts.push(`Mandiri: ${companyData.bankMandiri}`);
    }
    if (companyData.bankBNI) {
      bankAccounts.push(`BNI: ${companyData.bankBNI}`);
    }

    // Format payment info based on available bank accounts
    if (bankAccounts.length > 0) {
      const companyName = companyData.companyName || "Company";
      return `Bank Transfer\nRekening atas nama: ${companyName}\n${bankAccounts.join(" | ")}`;
    }

    // Ultimate fallback if no bank accounts configured
    return "Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran";
  }

  private async generateInvoiceHTML(invoiceData: any): Promise<string> {
    const {
      invoiceNumber,
      creationDate,
      dueDate,
      client,
      project,
      amountPerProject,
      totalAmount,
      scopeOfWork,
      paymentInfo,
      terms,
      materaiRequired = false,
      materaiApplied = false,
      includeTax = false,
      taxRate = 0.11,
      taxLabel = "PPN",
      taxExemptReason = null,
      priceBreakdown,
    } = invoiceData;

    // Get company settings
    const companyData = await this.getCompanySettings();

    // Runtime override: Detect and replace placeholder payment info
    let finalPaymentInfo = paymentInfo;
    const placeholderTexts = [
      "Bank Transfer - Lihat detail di company settings",
      "Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran"
    ];

    const hasPlaceholder = placeholderTexts.some(placeholder =>
      finalPaymentInfo?.includes(placeholder)
    );

    if (hasPlaceholder || !finalPaymentInfo) {
      // Generate proper payment info from company settings
      finalPaymentInfo = await this.generateDynamicPaymentInfo(companyData);
      this.logger.log(`Replaced placeholder payment info for invoice ${invoiceNumber}`);
    }

    // Parse products from priceBreakdown if available
    const products = priceBreakdown?.products || [];

    // Enhanced tax calculations (optional)
    const subTotal = Number(amountPerProject) || 0;
    const taxAmount = includeTax ? subTotal * taxRate : 0;
    const finalTotal = subTotal + taxAmount;

    // Format currency in Indonesian Rupiah
    const formatIDR = (amount: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Format date in Indonesian format (short format for compact design)
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 10mm;
      background-color: #ffffff;
      color: #1f2937;
      line-height: 1.5;
      font-size: 10px;
    }

    .invoice-container {
      max-width: 190mm;
      margin: 0 auto;
      background-color: white;
    }

    /* ===== HEADER SECTION ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10mm;
      padding-bottom: 6mm;
      border-bottom: 2px solid #dc2626;
      position: relative;
    }

    .company-info {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1mm;
    }

    .company-logo {
      width: 40mm;
      height: auto;
      margin-bottom: 1mm;
    }

    .company-name {
      font-family: 'Poppins', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #dc2626;
      letter-spacing: -0.3px;
    }

    .company-tagline {
      font-size: 8px;
      color: #6b7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .invoice-title-section {
      text-align: right;
      flex: 1;
    }

    .invoice-title-section h1 {
      font-family: 'Poppins', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #dc2626;
      margin: 0 0 2mm 0;
      letter-spacing: -0.5px;
    }

    .invoice-meta {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      font-size: 9px;
      color: #6b7280;
    }

    .invoice-meta-item {
      display: flex;
      justify-content: flex-end;
      gap: 3mm;
    }

    .invoice-meta-label {
      font-weight: 600;
      color: #374151;
      min-width: 32mm;
      text-align: right;
    }

    .invoice-meta-value {
      color: #1f2937;
    }

    /* ===== DETAILS SECTION ===== */
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
      margin-bottom: 8mm;
    }

    .detail-card {
      background-color: #f9fafb;
      padding: 4mm 5mm;
      border-radius: 3px;
      border-left: 3px solid #dc2626;
    }

    .detail-card.secondary {
      border-left-color: #e5e7eb;
    }

    .section-title {
      font-family: 'Poppins', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
      font-size: 9px;
      line-height: 1.3;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 35mm;
    }

    .detail-value {
      color: #1f2937;
      text-align: right;
      flex: 1;
    }

    /* ===== SERVICE TABLE ===== */
    .service-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6mm;
      border: 1px solid #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .service-table thead {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
    }

    .service-table th {
      padding: 3mm 4mm;
      text-align: center;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: none;
    }

    .service-table th:nth-child(2) {
      text-align: left;
    }

    .service-table th:nth-child(3),
    .service-table th:nth-child(4),
    .service-table th:nth-child(5) {
      text-align: right;
    }

    .service-table td {
      padding: 3mm 4mm;
      border-bottom: 1px solid #f3f4f6;
      font-size: 9px;
      color: #1f2937;
    }

    .service-table td:first-child {
      text-align: center;
      font-weight: 600;
      background-color: #fafbfc;
      width: 8%;
    }

    .service-table td:nth-child(2) {
      width: 52%;
    }

    .service-table td:nth-child(3),
    .service-table td:nth-child(4),
    .service-table td:nth-child(5) {
      text-align: right;
      width: 13.33%;
    }

    .service-table tbody tr:nth-child(even) td {
      background-color: #f9fafb;
    }

    .service-table tbody tr:nth-child(even) td:first-child {
      background-color: #f3f4f6;
    }

    .service-desc-main {
      font-weight: 600;
      color: #1f2937;
      display: block;
      margin-bottom: 0.5mm;
    }

    .service-desc-detail {
      font-size: 8px;
      color: #6b7280;
      display: block;
    }

    /* ===== SUMMARY SECTION ===== */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 6mm;
    }

    .summary-table {
      width: 55%;
      border-collapse: collapse;
    }

    .summary-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-table td {
      padding: 2mm 4mm;
      font-size: 9px;
    }

    .summary-table td:first-child {
      text-align: right;
      font-weight: 600;
      color: #6b7280;
    }

    .summary-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
      width: 38mm;
    }

    .summary-table tr.summary-total {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      font-weight: 700;
      font-size: 10px;
    }

    .summary-table tr.summary-total td {
      padding: 3mm 4mm;
      color: white;
    }

    .summary-table tr.summary-total td:first-child {
      color: rgba(255, 255, 255, 0.9);
    }

    /* ===== SUPPORTING SECTIONS ===== */
    .section-box {
      margin-bottom: 4mm;
      padding: 4mm 5mm;
      border-radius: 3px;
      border-left: 3px solid #f59e0b;
    }

    .section-box.scope {
      background-color: #fffbeb;
      border-left-color: #f59e0b;
    }

    .section-box.payment {
      background-color: #f3f4f6;
      border-left-color: #9ca3af;
    }

    .section-box.terms {
      background-color: #f9fafb;
      border-left-color: #d1d5db;
    }

    .section-box-title {
      font-family: 'Poppins', sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .section-box-content {
      font-size: 8px;
      color: #374151;
      line-height: 1.4;
      white-space: pre-line;
    }

    .bank-details {
      margin-top: 3mm;
      padding-top: 3mm;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 8px;
    }

    .bank-details-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 1mm;
      display: block;
    }

    .bank-item {
      color: #374151;
      margin-bottom: 0.5mm;
      line-height: 1.3;
    }

    /* ===== FOOTER ===== */
    .footer-section {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      margin-top: 6mm;
      padding-top: 6mm;
      border-top: 1px solid #e5e7eb;
    }

    .footer-content {
      flex: 1;
    }

    .footer-title {
      font-family: 'Poppins', sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .footer-text {
      font-size: 8px;
      line-height: 1.4;
      color: #6b7280;
      white-space: pre-line;
    }

    /* ===== CONTACT BAR ===== */
    .contact-bar {
      margin-top: 6mm;
      padding: 3mm 5mm;
      background: linear-gradient(90deg, #f9fafb 0%, #f3f4f6 100%);
      border-radius: 3px;
      border: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8px;
      color: #6b7280;
      font-weight: 500;
    }

    .contact-bar-item {
      display: inline-block;
      margin: 0 4mm;
    }

    .contact-bar-item:not(:last-child)::after {
      content: '•';
      margin-left: 4mm;
      color: #d1d5db;
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      body {
        margin: 0;
        padding: 10mm;
      }
      .invoice-container {
        margin: 0;
        padding: 0;
      }
    }

    /* ===== UTILITY CLASSES ===== */
    .text-right {
      text-align: right;
    }

    .mt-sm {
      margin-top: 2mm;
    }

    .mt-md {
      margin-top: 4mm;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header with Company Info and Invoice Title -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyData.companyName}</div>
        <div class="company-tagline">Digital Creative Agency</div>
      </div>
      <div class="invoice-title-section">
        <h1>INVOICE</h1>
        <div class="invoice-meta">
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Invoice No:</span>
            <span class="invoice-meta-value">${invoiceNumber}</span>
          </div>
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Date:</span>
            <span class="invoice-meta-value">${formatDate(creationDate)}</span>
          </div>
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Due Date:</span>
            <span class="invoice-meta-value">${formatDate(dueDate)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Client & Invoice Details Cards -->
    <div class="invoice-details">
      <div class="detail-card">
        <div class="section-title">Bill To</div>
        <div class="detail-row">
          <span class="detail-value" style="flex: 1; text-align: left;">${client.name}</span>
        </div>
        ${client.company ? `
        <div class="detail-row">
          <span class="detail-value" style="flex: 1; text-align: left; color: #6b7280; font-size: 9px;">${client.company}</span>
        </div>
        ` : ""}
        ${client.address ? `
        <div class="detail-row">
          <span class="detail-value" style="flex: 1; text-align: left; font-size: 9px;">${client.address}</span>
        </div>
        ` : ""}
        ${client.phone ? `
        <div class="detail-row">
          <span class="detail-label" style="min-width: auto;">Phone:</span>
          <span class="detail-value">${client.phone}</span>
        </div>
        ` : ""}
        ${client.email ? `
        <div class="detail-row">
          <span class="detail-label" style="min-width: auto;">Email:</span>
          <span class="detail-value">${client.email}</span>
        </div>
        ` : ""}
      </div>

      <div class="detail-card secondary">
        <div class="section-title">Invoice Info</div>
        <div class="detail-row">
          <span class="detail-label">Project:</span>
          <span class="detail-value">${project.description || project.name || "N/A"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value" style="color: #059669; font-weight: 600;">Pending</span>
        </div>
      </div>
    </div>

    <!-- Services Table -->
    <table class="service-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Service / Product</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          products.length > 0
            ? products
                .map(
                  (product: any, index: number) => `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>
            <span class="service-desc-main">${product.name}</span>
            ${product.description ? `<span class="service-desc-detail">${product.description}</span>` : ""}
          </td>
          <td>${formatIDR(product.price || 0)}</td>
          <td>${product.quantity || 1}</td>
          <td>${formatIDR(product.subtotal || product.price * (product.quantity || 1))}</td>
        </tr>
          `,
                )
                .join("")
            : `
        <tr>
          <td>01</td>
          <td>
            <span class="service-desc-main">${project.description || project.name || "Service"}</span>
          </td>
          <td>${formatIDR(amountPerProject)}</td>
          <td>1</td>
          <td>${formatIDR(amountPerProject)}</td>
        </tr>
          `
        }
      </tbody>
    </table>

    <!-- Summary Section -->
    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td>Subtotal</td>
          <td>${formatIDR(subTotal)}</td>
        </tr>
        ${
          includeTax
            ? `
        <tr>
          <td>Tax (${taxLabel} ${Math.round(taxRate * 100)}%)</td>
          <td>${formatIDR(taxAmount)}</td>
        </tr>
        `
            : ""
        }
        ${
          taxExemptReason
            ? `
        <tr>
          <td colspan="2" style="font-size: 9px; color: #6b7280; text-align: center; padding: 3mm;">
            ${taxExemptReason}
          </td>
        </tr>
        `
            : ""
        }
        <tr class="summary-total">
          <td>TOTAL</td>
          <td>${formatIDR(finalTotal)}</td>
        </tr>
      </table>
    </div>

    <!-- Scope of Work Section -->
    ${
      scopeOfWork
        ? `
    <div class="section-box scope">
      <div class="section-box-title">Scope of Work</div>
      <div class="section-box-content">${scopeOfWork}</div>
    </div>
    `
        : ""
    }

    <!-- Payment Information -->
    <div class="section-box payment">
      <div class="section-box-title">Payment Information</div>
      <div class="section-box-content">${finalPaymentInfo}</div>
    </div>

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="footer-content">
        <div class="footer-title">Terms & Conditions</div>
        <div class="footer-text">${terms || "Payment due within 30 days of invoice date. All prices are in Indonesian Rupiah (IDR). This invoice is valid until the due date specified above."}</div>
      </div>
    </div>

    <!-- Contact Information Bar -->
    <div class="contact-bar">
      <span class="contact-bar-item">${companyData.phone || "N/A"}</span>
      <span class="contact-bar-item">${companyData.address || "N/A"}</span>
      <span class="contact-bar-item">${companyData.email || "N/A"}</span>
    </div>
  </div>
</body>
</html>`;
  }

  private async generateQuotationHTML(quotationData: any): Promise<string> {
    const {
      quotationNumber,
      date,
      validUntil,
      client,
      project,
      amountPerProject,
      totalAmount,
      scopeOfWork,
      terms,
      priceBreakdown,
    } = quotationData;

    // Get company settings
    const companyData = await this.getCompanySettings();

    // Parse products from priceBreakdown if available
    const products = priceBreakdown?.products || [];

    // Format currency in Indonesian Rupiah
    const formatIDR = (amount: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Format date in Indonesian format (short format for compact design)
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quotationNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 10mm;
      background-color: #ffffff;
      color: #1f2937;
      line-height: 1.5;
      font-size: 10px;
    }

    .quotation-container {
      max-width: 190mm;
      margin: 0 auto;
      background-color: white;
    }

    /* ===== HEADER SECTION ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10mm;
      padding-bottom: 6mm;
      border-bottom: 2px solid #0369a1;
      position: relative;
    }

    .company-info {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1mm;
    }

    .company-logo {
      width: 40mm;
      height: auto;
      margin-bottom: 1mm;
    }

    .company-name {
      font-family: 'Poppins', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: -0.3px;
    }

    .company-tagline {
      font-size: 8px;
      color: #6b7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .quotation-title-section {
      text-align: right;
      flex: 1;
    }

    .quotation-title-section h1 {
      font-family: 'Poppins', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #0369a1;
      margin: 0 0 2mm 0;
      letter-spacing: -0.5px;
    }

    .quotation-meta {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      font-size: 9px;
      color: #6b7280;
    }

    .quotation-meta-item {
      display: flex;
      justify-content: flex-end;
      gap: 3mm;
    }

    .quotation-meta-label {
      font-weight: 600;
      color: #374151;
      min-width: 32mm;
      text-align: right;
    }

    .quotation-meta-value {
      color: #1f2937;
    }

    /* ===== DETAILS SECTION ===== */
    .quotation-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
      margin-bottom: 8mm;
    }

    .detail-card {
      background-color: #f0f9ff;
      padding: 4mm 5mm;
      border-radius: 3px;
      border-left: 3px solid #0369a1;
    }

    .detail-card.secondary {
      background-color: #f9fafb;
      border-left-color: #e5e7eb;
    }

    .section-title {
      font-family: 'Poppins', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
      font-size: 9px;
      line-height: 1.3;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 35mm;
    }

    .detail-value {
      color: #1f2937;
      text-align: right;
      flex: 1;
    }

    /* ===== SERVICE TABLE ===== */
    .service-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6mm;
      border: 1px solid #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .service-table thead {
      background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
      color: white;
    }

    .service-table th {
      padding: 3mm 4mm;
      text-align: center;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: none;
    }

    .service-table th:nth-child(2) {
      text-align: left;
    }

    .service-table th:nth-child(3),
    .service-table th:nth-child(4),
    .service-table th:nth-child(5) {
      text-align: right;
    }

    .service-table td {
      padding: 3mm 4mm;
      border-bottom: 1px solid #f3f4f6;
      font-size: 9px;
      color: #1f2937;
    }

    .service-table td:first-child {
      text-align: center;
      font-weight: 600;
      background-color: #f0f9ff;
      width: 8%;
    }

    .service-table td:nth-child(2) {
      width: 52%;
    }

    .service-table td:nth-child(3),
    .service-table td:nth-child(4),
    .service-table td:nth-child(5) {
      text-align: right;
      width: 13.33%;
    }

    .service-table tbody tr:nth-child(even) td {
      background-color: #f9fafb;
    }

    .service-table tbody tr:nth-child(even) td:first-child {
      background-color: #f0f9ff;
    }

    .service-desc-main {
      font-weight: 600;
      color: #1f2937;
      display: block;
      margin-bottom: 0.5mm;
    }

    .service-desc-detail {
      font-size: 8px;
      color: #6b7280;
      display: block;
    }

    /* ===== SUMMARY SECTION ===== */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 6mm;
    }

    .summary-table {
      width: 55%;
      border-collapse: collapse;
    }

    .summary-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-table td {
      padding: 2mm 4mm;
      font-size: 9px;
    }

    .summary-table td:first-child {
      text-align: right;
      font-weight: 600;
      color: #6b7280;
    }

    .summary-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
      width: 38mm;
    }

    .summary-table tr.summary-total {
      background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
      color: white;
      font-weight: 700;
      font-size: 10px;
    }

    .summary-table tr.summary-total td {
      padding: 3mm 4mm;
      color: white;
    }

    .summary-table tr.summary-total td:first-child {
      color: rgba(255, 255, 255, 0.9);
    }

    /* ===== SUPPORTING SECTIONS ===== */
    .section-box {
      margin-bottom: 4mm;
      padding: 4mm 5mm;
      border-radius: 3px;
      border-left: 3px solid #f59e0b;
    }

    .section-box.scope {
      background-color: #fffbeb;
      border-left-color: #f59e0b;
    }

    .section-box.terms {
      background-color: #f9fafb;
      border-left-color: #d1d5db;
    }

    .section-box-title {
      font-family: 'Poppins', sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .section-box-content {
      font-size: 8px;
      color: #374151;
      line-height: 1.4;
      white-space: pre-line;
    }

    /* ===== FOOTER ===== */
    .footer-section {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      margin-top: 6mm;
      padding-top: 6mm;
      border-top: 1px solid #e5e7eb;
    }

    .footer-content {
      flex: 1;
    }

    .footer-title {
      font-family: 'Poppins', sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .footer-text {
      font-size: 8px;
      line-height: 1.4;
      color: #6b7280;
      white-space: pre-line;
    }

    .signature-section {
      flex: 1;
      text-align: center;
    }

    .signature-box {
      border: 1px solid #e5e7eb;
      padding: 4mm 5mm;
      background-color: #f9fafb;
      border-radius: 3px;
    }

    .signature-title {
      font-size: 8px;
      color: #6b7280;
      margin-bottom: 6mm;
      font-weight: 500;
    }

    .signature-line {
      border-top: 1px solid #d1d5db;
      margin-bottom: 1mm;
      height: 15mm;
    }

    .signature-name {
      font-size: 9px;
      font-weight: 600;
      color: #0369a1;
    }

    .signature-position {
      font-size: 8px;
      color: #6b7280;
      margin-top: 1mm;
    }

    /* ===== CONTACT BAR ===== */
    .contact-bar {
      margin-top: 6mm;
      padding: 3mm 5mm;
      background: linear-gradient(90deg, #f9fafb 0%, #f3f4f6 100%);
      border-radius: 3px;
      border: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8px;
      color: #6b7280;
      font-weight: 500;
    }

    .contact-bar-item {
      display: inline-block;
      margin: 0 4mm;
    }

    .contact-bar-item:not(:last-child)::after {
      content: '•';
      margin-left: 4mm;
      color: #d1d5db;
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      body {
        margin: 0;
        padding: 10mm;
      }
      .quotation-container {
        margin: 0;
        padding: 0;
      }
    }

    /* ===== UTILITY CLASSES ===== */
    .text-right {
      text-align: right;
    }

    .mt-sm {
      margin-top: 2mm;
    }

    .mt-md {
      margin-top: 4mm;
    }
  </style>
</head>
<body>
  <div class="quotation-container">
    <!-- Header with Company Info and Quotation Title -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyData.companyName}</div>
        <div class="company-tagline">Digital Creative Agency</div>
      </div>
      <div class="quotation-title-section">
        <h1>QUOTATION</h1>
        <div class="quotation-meta">
          <div class="quotation-meta-item">
            <span class="quotation-meta-label">Quotation No:</span>
            <span class="quotation-meta-value">${quotationNumber}</span>
          </div>
          <div class="quotation-meta-item">
            <span class="quotation-meta-label">Date:</span>
            <span class="quotation-meta-value">${formatDate(date)}</span>
          </div>
          <div class="quotation-meta-item">
            <span class="quotation-meta-label">Valid Until:</span>
            <span class="quotation-meta-value">${formatDate(validUntil)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Client & Quotation Details Cards -->
    <div class="quotation-details">
      <div class="detail-card">
        <div class="section-title">Quotation To</div>
        <div class="detail-row">
          <span class="detail-value" style="flex: 1; text-align: left;">${client.name}</span>
        </div>
        ${client.company ? `
        <div class="detail-row">
          <span class="detail-value" style="flex: 1; text-align: left; color: #6b7280; font-size: 9px;">${client.company}</span>
        </div>
        ` : ""}
        ${client.address ? `
        <div class="detail-row">
          <span class="detail-value" style="flex: 1; text-align: left; font-size: 9px;">${client.address}</span>
        </div>
        ` : ""}
        ${client.phone ? `
        <div class="detail-row">
          <span class="detail-label" style="min-width: auto;">Phone:</span>
          <span class="detail-value">${client.phone}</span>
        </div>
        ` : ""}
        ${client.email ? `
        <div class="detail-row">
          <span class="detail-label" style="min-width: auto;">Email:</span>
          <span class="detail-value">${client.email}</span>
        </div>
        ` : ""}
      </div>

      <div class="detail-card secondary">
        <div class="section-title">Quotation Info</div>
        <div class="detail-row">
          <span class="detail-label">Project:</span>
          <span class="detail-value">${project.description || project.name || "N/A"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value" style="color: #0369a1; font-weight: 600;">Available</span>
        </div>
      </div>
    </div>

    <!-- Services Table -->
    <table class="service-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Service / Product</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          products.length > 0
            ? products
                .map(
                  (product: any, index: number) => `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>
            <span class="service-desc-main">${product.name}</span>
            ${product.description ? `<span class="service-desc-detail">${product.description}</span>` : ""}
          </td>
          <td>${formatIDR(product.price || 0)}</td>
          <td>${product.quantity || 1}</td>
          <td>${formatIDR(product.subtotal || product.price * (product.quantity || 1))}</td>
        </tr>
          `,
                )
                .join("")
            : `
        <tr>
          <td>01</td>
          <td>
            <span class="service-desc-main">${project.description || project.name || "Service"}</span>
          </td>
          <td>${formatIDR(amountPerProject)}</td>
          <td>1</td>
          <td>${formatIDR(amountPerProject)}</td>
        </tr>
          `
        }
      </tbody>
    </table>

    <!-- Summary Section -->
    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td>Subtotal</td>
          <td>${formatIDR(amountPerProject)}</td>
        </tr>
        <tr>
          <td>Tax (PPN 11%)</td>
          <td>${formatIDR(Number(amountPerProject) * 0.11)}</td>
        </tr>
        <tr class="summary-total">
          <td>TOTAL</td>
          <td>${formatIDR(totalAmount)}</td>
        </tr>
      </table>
    </div>

    <!-- Scope of Work Section -->
    ${
      scopeOfWork
        ? `
    <div class="section-box scope">
      <div class="section-box-title">Scope of Work</div>
      <div class="section-box-content">${scopeOfWork}</div>
    </div>
    `
        : ""
    }

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="footer-content">
        <div class="footer-title">Terms & Conditions</div>
        <div class="footer-text">${terms || "This quotation is valid for 30 days from the date specified above. All prices are in Indonesian Rupiah (IDR). Payment is due within 30 days upon invoice submission."}</div>
      </div>
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-title">Authorized By</div>
          <div class="signature-line"></div>
          <div class="signature-name">${companyData.companyName}</div>
          <div class="signature-position">Project Manager</div>
        </div>
      </div>
    </div>

    <!-- Contact Information Bar -->
    <div class="contact-bar">
      <span class="contact-bar-item">${companyData.phone || "N/A"}</span>
      <span class="contact-bar-item">${companyData.address || "N/A"}</span>
      <span class="contact-bar-item">${companyData.email || "N/A"}</span>
    </div>
  </div>
</body>
</html>`;
  }

  async generateProjectPDF(projectData: any): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    try {
      this.logger.debug("Launching Puppeteer browser...");
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // Disable /dev/shm usage - useful in containers
        ],
      });

      const page = await browser.newPage();

      // Set page format for A4
      await page.setViewport({ width: 794, height: 1123 });

      // Generate HTML content using the new project template
      this.logger.debug("Generating project HTML...");
      const htmlContent = generateProjectHTML(projectData);
      this.logger.debug(`HTML content length: ${htmlContent.length} characters`);

      // Set content with timeout and fallback to loadEventFired
      this.logger.debug("Setting page content...");
      try {
        await page.setContent(htmlContent, {
          waitUntil: "networkidle2",
          timeout: 30000, // 30 second timeout
        });
      } catch (timeoutError) {
        this.logger.warn(`Page load timeout, continuing with PDF generation: ${timeoutError}`);
        // Continue with PDF generation even if networkidle times out
      }

      this.logger.debug("Generating PDF...");
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0.3in",
          right: "0.3in",
          bottom: "0.3in",
          left: "0.3in",
        },
      });

      this.logger.debug(`PDF generated successfully, size: ${pdf.length} bytes`);
      return Buffer.from(pdf);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error generating project PDF: ${errorMessage}`,
        error instanceof Error ? error.stack : "",
      );
      throw error;
    } finally {
      if (browser) {
        this.logger.debug("Closing Puppeteer browser...");
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error(`Error closing browser: ${closeError}`);
        }
      }
    }
  }
}
