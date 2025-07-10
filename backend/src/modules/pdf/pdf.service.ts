import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { readFileSync } from 'fs';
import { SettingsService } from '../settings/settings.service';
import { InvoicesService } from '../invoices/invoices.service';
import { QuotationsService } from '../quotations/quotations.service';

@Injectable()
export class PdfService {
  private templatePath = join(__dirname, 'templates');

  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  async generateInvoicePDF(invoiceData: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Set page format for A4
      await page.setViewport({ width: 794, height: 1123 });
      
      // Generate HTML content
      const htmlContent = await this.generateInvoiceHTML(invoiceData);
      
      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.3in',
          right: '0.3in',
          bottom: '0.3in',
          left: '0.3in',
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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Set page format for A4
      await page.setViewport({ width: 794, height: 1123 });
      
      // Generate HTML content
      const htmlContent = await this.generateQuotationHTML(quotationData);
      
      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
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
        companyName: 'PT Teknologi Indonesia',
        address: 'Jakarta, Indonesia',
        phone: '',
        email: '',
        website: '',
        taxNumber: '',
        bankBCA: '',
        bankMandiri: '',
        bankBNI: '',
      };
    }
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
      paymentInfo,
      terms,
      materaiRequired = false,
      materaiApplied = false,
      includeTax = false,
      taxRate = 0.11,
      taxLabel = "PPN",
      taxExemptReason = null,
    } = invoiceData;

    // Get company settings
    const companyData = await this.getCompanySettings();

    // Enhanced tax calculations (optional)
    const subTotal = Number(amountPerProject) || 0;
    const taxAmount = includeTax ? (subTotal * taxRate) : 0;
    const finalTotal = subTotal + taxAmount;

    // Format currency in Indonesian Rupiah
    const formatIDR = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Format date in Indonesian format (short format for compact design)
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 15mm;
      background-color: #ffffff;
      color: #333;
      line-height: 1.4;
      font-size: 12px;
    }
    .invoice-container {
      max-width: 190mm;
      margin: 0 auto;
      background-color: white;
    }
    
    /* Header - Clean and Professional */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12mm;
      padding-bottom: 3mm;
      border-bottom: 2px solid #dc2626;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 2mm;
    }
    .company-tagline {
      font-size: 11px;
      color: #666;
      margin-bottom: 3mm;
    }
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    .invoice-title h1 {
      font-size: 24px;
      color: #dc2626;
      margin: 0;
      font-weight: bold;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
      margin-top: 2mm;
    }
    .invoice-date {
      font-size: 12px;
      color: #666;
      margin-top: 1mm;
    }
    
    /* Two Column Layout */
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6mm;
    }
    .client-info, .invoice-info {
      flex: 1;
    }
    .client-info {
      margin-right: 15mm;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 3mm;
      text-transform: uppercase;
    }
    .info-item {
      margin-bottom: 1mm;
      font-size: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #555;
      display: inline-block;
      width: 35mm;
    }
    
    /* Professional Service Table */
    .service-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
      border: 1px solid #ddd;
    }
    .service-table th {
      background-color: #dc2626;
      color: white;
      padding: 3mm;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .service-table th:first-child {
      width: 8%;
      text-align: center;
    }
    .service-table th:nth-child(2) {
      width: 52%;
      text-align: left;
    }
    .service-table th:nth-child(3),
    .service-table th:nth-child(4),
    .service-table th:nth-child(5) {
      width: 13.33%;
      text-align: right;
    }
    .service-table td {
      padding: 2mm;
      border-bottom: 1px solid #eee;
      font-size: 10px;
    }
    .service-table td:first-child {
      text-align: center;
      font-weight: bold;
    }
    .service-table td:nth-child(3),
    .service-table td:nth-child(4),
    .service-table td:nth-child(5) {
      text-align: right;
    }
    .service-table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    /* Summary Section */
    .summary-table {
      width: 50%;
      margin-left: auto;
      border-collapse: collapse;
      margin-bottom: 6mm;
    }
    .summary-table td {
      padding: 1.5mm 4mm;
      font-size: 10px;
      border-bottom: 1px solid #eee;
    }
    .summary-table td:first-child {
      text-align: right;
      font-weight: bold;
      color: #555;
    }
    .summary-table td:last-child {
      text-align: right;
      width: 40mm;
    }
    .summary-total {
      background-color: #dc2626;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }
    
    /* Materai Notice (Invoice-specific) */
    .materai-notice {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 2px;
      padding: 3mm;
      margin-bottom: 4mm;
      font-size: 10px;
    }
    .materai-notice.applied {
      background-color: #d1fae5;
      border-color: #10b981;
    }
    .materai-title {
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 2mm;
      font-size: 11px;
    }
    .materai-notice.applied .materai-title {
      color: #10b981;
    }
    
    /* Payment Information (Invoice-specific) */
    .payment-info {
      margin-bottom: 4mm;
      padding: 4mm;
      background-color: #f3f4f6;
      border-radius: 2px;
    }
    .payment-title {
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 3mm;
      font-size: 12px;
    }
    .payment-details {
      white-space: pre-line;
      line-height: 1.2;
      font-size: 9px;
    }
    
    /* Footer Layout */
    .footer-section {
      display: flex;
      justify-content: space-between;
      margin-top: 8mm;
    }
    .terms-section {
      flex: 1;
      margin-right: 10mm;
    }
    .terms-title {
      font-size: 12px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 3mm;
    }
    .terms-content {
      font-size: 9px;
      line-height: 1.2;
      color: #666;
    }
    .signature-section {
      flex: 1;
      text-align: center;
    }
    .signature-box {
      border: 1px solid #ddd;
      padding: 6mm;
      background-color: #f9f9f9;
    }
    .signature-title {
      font-size: 11px;
      color: #666;
      margin-bottom: 8mm;
    }
    .signature-name {
      font-size: 12px;
      font-weight: bold;
      color: #dc2626;
    }
    .signature-position {
      font-size: 10px;
      color: #666;
      margin-top: 1mm;
    }
    
    /* Contact Bar */
    .contact-bar {
      margin-top: 10mm;
      text-align: center;
      padding: 3mm;
      background-color: #f3f4f6;
      border-radius: 2px;
      font-size: 10px;
      color: #666;
    }
    
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
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Professional Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyData.companyName}</div>
        <div class="company-tagline">Professional Business Solutions</div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">No: ${invoiceNumber}</div>
        <div class="invoice-date">Date: ${formatDate(creationDate)}</div>
      </div>
    </div>

    <!-- Clean Two-Column Layout -->
    <div class="invoice-details">
      <div class="client-info">
        <div class="section-title">Invoice To</div>
        <div class="info-item">${client.name}</div>
        ${client.company ? `<div class="info-item">${client.company}</div>` : ''}
        <div class="info-item">Phone: ${client.phone || 'N/A'}</div>
        ${client.email ? `<div class="info-item">Email: ${client.email}</div>` : ''}
        ${client.address ? `<div class="info-item">${client.address}</div>` : ''}
      </div>
      
      <div class="invoice-info">
        <div class="section-title">Invoice Details</div>
        <div class="info-item">
          <span class="info-label">Invoice No:</span> ${invoiceNumber}
        </div>
        <div class="info-item">
          <span class="info-label">Invoice Date:</span> ${formatDate(creationDate)}
        </div>
        <div class="info-item">
          <span class="info-label">Due Date:</span> ${formatDate(dueDate)}
        </div>
        <div class="info-item">
          <span class="info-label">Payment Method:</span> Transfer Bank
        </div>
      </div>
    </div>

    <!-- Professional Service Table -->
    <table class="service-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>01</td>
          <td>${project.description}</td>
          <td>${formatIDR(amountPerProject)}</td>
          <td>1</td>
          <td>${formatIDR(amountPerProject)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Summary Table with Optional Tax -->
    <table class="summary-table">
      <tr>
        <td>Sub Total</td>
        <td>${formatIDR(subTotal)}</td>
      </tr>
      ${includeTax ? `
      <tr>
        <td>Tax (${taxLabel} ${Math.round(taxRate * 100)}%)</td>
        <td>${formatIDR(taxAmount)}</td>
      </tr>
      ` : ''}
      ${taxExemptReason ? `
      <tr>
        <td colspan="2" style="font-size: 10px; color: #666; text-align: center; padding: 5px;">
          ${taxExemptReason}
        </td>
      </tr>
      ` : ''}
      <tr class="summary-total">
        <td>TOTAL</td>
        <td>${formatIDR(finalTotal)}</td>
      </tr>
    </table>

    <!-- Materai Notice -->
    ${materaiRequired ? `
    <div class="materai-notice ${materaiApplied ? 'applied' : ''}">
      <div class="materai-title">
        ${materaiApplied ? '✓ Materai Sudah Ditempel' : '⚠️ Memerlukan Materai'}
      </div>
      <div>
        ${materaiApplied 
          ? 'Materai senilai Rp 10.000 sudah ditempel sesuai ketentuan hukum.' 
          : 'Invoice ini memerlukan materai senilai Rp 10.000 karena nilai transaksi lebih dari Rp 5.000.000.'
        }
      </div>
    </div>
    ` : ''}

    <!-- Payment Information -->
    <div class="payment-info">
      <div class="payment-title">Informasi Pembayaran:</div>
      <div class="payment-details">${paymentInfo}</div>
      ${companyData.bankBCA || companyData.bankMandiri || companyData.bankBNI ? `
      <div style="margin-top: 10px;">
        <strong>Rekening Bank:</strong><br>
        ${companyData.bankBCA ? `BCA: ${companyData.bankBCA} a.n. ${companyData.companyName}<br>` : ''}
        ${companyData.bankMandiri ? `Mandiri: ${companyData.bankMandiri} a.n. ${companyData.companyName}<br>` : ''}
        ${companyData.bankBNI ? `BNI: ${companyData.bankBNI} a.n. ${companyData.companyName}<br>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="terms-section">
        <div class="terms-title">Terms & Conditions</div>
        <div class="terms-content">
          ${terms || 'Payment due within 30 days. All prices in Indonesian Rupiah (IDR). This invoice is valid until the due date.'}
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-title">Authorized Signature</div>
          <div style="height: 15mm;"></div>
          <div class="signature-name">${companyData.companyName}</div>
          <div class="signature-position">Management</div>
        </div>
      </div>
    </div>

    <!-- Contact Information Bar -->
    <div class="contact-bar">
      Contact: ${companyData.phone || 'N/A'} | ${companyData.address || 'N/A'} | ${companyData.email || 'N/A'}
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
      terms,
    } = quotationData;

    // Get company settings
    const companyData = await this.getCompanySettings();

    // Format currency in Indonesian Rupiah
    const formatIDR = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Format date in Indonesian format (short format for compact design)
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quotationNumber}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 15mm;
      background-color: #ffffff;
      color: #333;
      line-height: 1.4;
      font-size: 12px;
    }
    .quotation-container {
      max-width: 190mm;
      margin: 0 auto;
      background-color: white;
    }
    
    /* Header - Clean and Professional */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20mm;
      padding-bottom: 5mm;
      border-bottom: 2px solid #1e40af;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 2mm;
    }
    .company-tagline {
      font-size: 11px;
      color: #666;
      margin-bottom: 3mm;
    }
    .quotation-title {
      text-align: right;
      flex: 1;
    }
    .quotation-title h1 {
      font-size: 28px;
      color: #1e40af;
      margin: 0;
      font-weight: bold;
    }
    .quotation-number {
      font-size: 14px;
      color: #666;
      margin-top: 2mm;
    }
    .quotation-date {
      font-size: 12px;
      color: #666;
      margin-top: 1mm;
    }
    
    /* Two Column Layout */
    .quotation-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10mm;
    }
    .client-info, .quotation-info {
      flex: 1;
    }
    .client-info {
      margin-right: 15mm;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 3mm;
      text-transform: uppercase;
    }
    .info-item {
      margin-bottom: 1mm;
      font-size: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #555;
      display: inline-block;
      width: 35mm;
    }
    
    /* Professional Service Table */
    .service-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
      border: 1px solid #ddd;
    }
    .service-table th {
      background-color: #1e40af;
      color: white;
      padding: 3mm;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .service-table th:first-child {
      width: 8%;
      text-align: center;
    }
    .service-table th:nth-child(2) {
      width: 52%;
      text-align: left;
    }
    .service-table th:nth-child(3),
    .service-table th:nth-child(4),
    .service-table th:nth-child(5) {
      width: 13.33%;
      text-align: right;
    }
    .service-table td {
      padding: 2mm;
      border-bottom: 1px solid #eee;
      font-size: 10px;
    }
    .service-table td:first-child {
      text-align: center;
      font-weight: bold;
    }
    .service-table td:nth-child(3),
    .service-table td:nth-child(4),
    .service-table td:nth-child(5) {
      text-align: right;
    }
    .service-table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    /* Summary Section */
    .summary-table {
      width: 50%;
      margin-left: auto;
      border-collapse: collapse;
      margin-bottom: 6mm;
    }
    .summary-table td {
      padding: 1.5mm 4mm;
      font-size: 10px;
      border-bottom: 1px solid #eee;
    }
    .summary-table td:first-child {
      text-align: right;
      font-weight: bold;
      color: #555;
    }
    .summary-table td:last-child {
      text-align: right;
      width: 40mm;
    }
    .summary-total {
      background-color: #1e40af;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }
    
    /* Footer Layout */
    .footer-section {
      display: flex;
      justify-content: space-between;
      margin-top: 8mm;
    }
    .terms-section {
      flex: 1;
      margin-right: 10mm;
    }
    .terms-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 3mm;
    }
    .terms-content {
      font-size: 9px;
      line-height: 1.2;
      color: #666;
    }
    .signature-section {
      flex: 1;
      text-align: center;
    }
    .signature-box {
      border: 1px solid #ddd;
      padding: 6mm;
      background-color: #f9f9f9;
    }
    .signature-title {
      font-size: 11px;
      color: #666;
      margin-bottom: 8mm;
    }
    .signature-name {
      font-size: 12px;
      font-weight: bold;
      color: #1e40af;
    }
    .signature-position {
      font-size: 10px;
      color: #666;
      margin-top: 1mm;
    }
    
    /* Contact Bar */
    .contact-bar {
      margin-top: 10mm;
      text-align: center;
      padding: 3mm;
      background-color: #f3f4f6;
      border-radius: 2px;
      font-size: 10px;
      color: #666;
    }
    
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
  </style>
</head>
<body>
  <div class="quotation-container">
    <!-- Professional Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyData.companyName}</div>
        <div class="company-tagline">Professional Business Solutions</div>
      </div>
      <div class="quotation-title">
        <h1>QUOTATION</h1>
        <div class="quotation-number">No: ${quotationNumber}</div>
        <div class="quotation-date">Date: ${formatDate(date)}</div>
      </div>
    </div>

    <!-- Clean Two-Column Layout -->
    <div class="quotation-details">
      <div class="client-info">
        <div class="section-title">Quotation To</div>
        <div class="info-item">${client.name}</div>
        ${client.company ? `<div class="info-item">${client.company}</div>` : ''}
        <div class="info-item">Phone: ${client.phone || 'N/A'}</div>
        ${client.email ? `<div class="info-item">Email: ${client.email}</div>` : ''}
        ${client.address ? `<div class="info-item">${client.address}</div>` : ''}
      </div>
      
      <div class="quotation-info">
        <div class="section-title">Quotation Details</div>
        <div class="info-item">
          <span class="info-label">Quotation No:</span> ${quotationNumber}
        </div>
        <div class="info-item">
          <span class="info-label">Quotation Date:</span> ${formatDate(date)}
        </div>
        <div class="info-item">
          <span class="info-label">Valid Until:</span> ${formatDate(validUntil)}
        </div>
        <div class="info-item">
          <span class="info-label">Payment Method:</span> Transfer Bank
        </div>
      </div>
    </div>

    <!-- Professional Service Table -->
    <table class="service-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>01</td>
          <td>${project.description}</td>
          <td>${formatIDR(amountPerProject)}</td>
          <td>1</td>
          <td>${formatIDR(amountPerProject)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Summary Table -->
    <table class="summary-table">
      <tr>
        <td>Sub Total</td>
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

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="terms-section">
        <div class="terms-title">Terms & Conditions</div>
        <div class="terms-content">
          ${terms || 'Payment due within 30 days. All prices in Indonesian Rupiah (IDR). This quotation is valid until the specified date.'}
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-title">Authorized Signature</div>
          <div style="height: 15mm;"></div>
          <div class="signature-name">${companyData.companyName}</div>
          <div class="signature-position">Management</div>
        </div>
      </div>
    </div>

    <!-- Contact Information Bar -->
    <div class="contact-bar">
      Contact: ${companyData.phone || 'N/A'} | ${companyData.address || 'N/A'} | ${companyData.email || 'N/A'}
    </div>
  </div>
</body>
</html>`;
  }
}