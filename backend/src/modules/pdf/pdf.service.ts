import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { readFileSync } from 'fs';

@Injectable()
export class PdfService {
  private templatePath = join(__dirname, 'templates');

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
      const htmlContent = this.generateInvoiceHTML(invoiceData);
      
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
      const htmlContent = this.generateQuotationHTML(quotationData);
      
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

  private generateInvoiceHTML(invoiceData: any): string {
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
      materaiRequired,
      materaiApplied,
    } = invoiceData;

    // Format currency in Indonesian Rupiah
    const formatIDR = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Format date in Indonesian format
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
      padding: 0;
      background-color: #ffffff;
      color: #333;
      line-height: 1.6;
    }
    .invoice-container {
      max-width: 21cm;
      margin: 0 auto;
      padding: 1cm;
      background-color: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2cm;
      border-bottom: 3px solid #dc2626;
      padding-bottom: 1cm;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 0.5cm;
    }
    .company-details {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    .invoice-title h1 {
      font-size: 32px;
      color: #dc2626;
      margin: 0;
      font-weight: bold;
    }
    .invoice-number {
      font-size: 16px;
      color: #666;
      margin-top: 0.5cm;
    }
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2cm;
    }
    .client-info, .invoice-info {
      flex: 1;
    }
    .client-info {
      margin-right: 2cm;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 0.5cm;
      border-bottom: 1px solid #dc2626;
      padding-bottom: 0.2cm;
    }
    .info-row {
      display: flex;
      margin-bottom: 0.3cm;
    }
    .info-label {
      font-weight: bold;
      width: 120px;
      color: #555;
    }
    .info-value {
      flex: 1;
    }
    .project-details {
      margin-bottom: 2cm;
      padding: 1cm;
      background-color: #f9f9f9;
      border-left: 4px solid #dc2626;
    }
    .amount-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2cm;
    }
    .amount-table th,
    .amount-table td {
      padding: 0.5cm;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .amount-table th {
      background-color: #dc2626;
      color: white;
      font-weight: bold;
    }
    .amount-table .amount {
      text-align: right;
      font-weight: bold;
    }
    .total-row {
      background-color: #f9f9f9;
      font-weight: bold;
      font-size: 16px;
    }
    .materai-notice {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      padding: 1cm;
      margin-bottom: 2cm;
    }
    .materai-notice.applied {
      background-color: #d1fae5;
      border-color: #10b981;
    }
    .materai-title {
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 0.3cm;
    }
    .materai-notice.applied .materai-title {
      color: #10b981;
    }
    .payment-info {
      margin-bottom: 2cm;
      padding: 1cm;
      background-color: #f3f4f6;
      border-radius: 4px;
    }
    .payment-title {
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 0.5cm;
    }
    .payment-details {
      white-space: pre-line;
      line-height: 1.5;
    }
    .terms {
      margin-bottom: 2cm;
      padding: 1cm;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .terms-title {
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 0.5cm;
    }
    .footer {
      margin-top: 3cm;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 1cm;
    }
    .signature-section {
      margin-top: 2cm;
      text-align: right;
    }
    .signature-box {
      display: inline-block;
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 3cm;
      padding-top: 0.3cm;
    }
    @media print {
      body { margin: 0; }
      .invoice-container { margin: 0; padding: 0.5cm; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">Sistem Manajemen Bisnis</div>
        <div class="company-details">
          Jl. Contoh No. 123<br>
          Jakarta 12345, Indonesia<br>
          Telp: (021) 123-4567<br>
          Email: info@bisnis.co.id
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">No: ${invoiceNumber}</div>
      </div>
    </div>

    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="client-info">
        <div class="section-title">Kepada:</div>
        <div class="info-row">
          <div class="info-label">Nama:</div>
          <div class="info-value">${client.name}</div>
        </div>
        ${client.company ? `
        <div class="info-row">
          <div class="info-label">Perusahaan:</div>
          <div class="info-value">${client.company}</div>
        </div>
        ` : ''}
        <div class="info-row">
          <div class="info-label">Telepon:</div>
          <div class="info-value">${client.phone}</div>
        </div>
        ${client.email ? `
        <div class="info-row">
          <div class="info-label">Email:</div>
          <div class="info-value">${client.email}</div>
        </div>
        ` : ''}
        ${client.address ? `
        <div class="info-row">
          <div class="info-label">Alamat:</div>
          <div class="info-value">${client.address}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="invoice-info">
        <div class="section-title">Detail Invoice:</div>
        <div class="info-row">
          <div class="info-label">Tanggal:</div>
          <div class="info-value">${formatDate(creationDate)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Jatuh Tempo:</div>
          <div class="info-value">${formatDate(dueDate)}</div>
        </div>
      </div>
    </div>

    <!-- Project Details -->
    <div class="project-details">
      <div class="section-title">Detail Proyek:</div>
      <div class="info-row">
        <div class="info-label">Nomor Proyek:</div>
        <div class="info-value">${project.number}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Deskripsi:</div>
        <div class="info-value">${project.description}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Output:</div>
        <div class="info-value">${project.output}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Tipe:</div>
        <div class="info-value">${project.type === 'PRODUCTION' ? 'Produksi' : 'Media Sosial'}</div>
      </div>
    </div>

    <!-- Amount Table -->
    <table class="amount-table">
      <thead>
        <tr>
          <th>Deskripsi</th>
          <th>Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Biaya Proyek: ${project.description}</td>
          <td class="amount">${formatIDR(amountPerProject)}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="amount"><strong>${formatIDR(totalAmount)}</strong></td>
        </tr>
      </tbody>
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
    </div>

    <!-- Terms and Conditions -->
    ${terms ? `
    <div class="terms">
      <div class="terms-title">Syarat & Ketentuan:</div>
      <div>${terms}</div>
    </div>
    ` : ''}

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="signature-box">
        <div>Hormat kami,</div>
        <div class="signature-line">
          Sistem Manajemen Bisnis
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>Terima kasih atas kepercayaan Anda. Dokumen ini dibuat secara otomatis oleh sistem.</div>
    </div>
  </div>
</body>
</html>`;
  }

  private generateQuotationHTML(quotationData: any): string {
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

    // Format currency in Indonesian Rupiah
    const formatIDR = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Format date in Indonesian format
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
      padding: 0;
      background-color: #ffffff;
      color: #333;
      line-height: 1.6;
    }
    .quotation-container {
      max-width: 21cm;
      margin: 0 auto;
      padding: 1cm;
      background-color: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2cm;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 1cm;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 0.5cm;
    }
    .company-details {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }
    .quotation-title {
      text-align: right;
      flex: 1;
    }
    .quotation-title h1 {
      font-size: 32px;
      color: #2563eb;
      margin: 0;
      font-weight: bold;
    }
    .quotation-number {
      font-size: 16px;
      color: #666;
      margin-top: 0.5cm;
    }
    .quotation-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2cm;
    }
    .client-info, .quotation-info {
      flex: 1;
    }
    .client-info {
      margin-right: 2cm;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 0.5cm;
      border-bottom: 1px solid #2563eb;
      padding-bottom: 0.2cm;
    }
    .info-row {
      display: flex;
      margin-bottom: 0.3cm;
    }
    .info-label {
      font-weight: bold;
      width: 120px;
      color: #555;
    }
    .info-value {
      flex: 1;
    }
    .project-details {
      margin-bottom: 2cm;
      padding: 1cm;
      background-color: #f9f9f9;
      border-left: 4px solid #2563eb;
    }
    .amount-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2cm;
    }
    .amount-table th,
    .amount-table td {
      padding: 0.5cm;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .amount-table th {
      background-color: #2563eb;
      color: white;
      font-weight: bold;
    }
    .amount-table .amount {
      text-align: right;
      font-weight: bold;
    }
    .total-row {
      background-color: #f9f9f9;
      font-weight: bold;
      font-size: 16px;
    }
    .validity-notice {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      padding: 1cm;
      margin-bottom: 2cm;
    }
    .validity-title {
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 0.3cm;
    }
    .terms {
      margin-bottom: 2cm;
      padding: 1cm;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .terms-title {
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 0.5cm;
    }
    .footer {
      margin-top: 3cm;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 1cm;
    }
    .signature-section {
      margin-top: 2cm;
      text-align: right;
    }
    .signature-box {
      display: inline-block;
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 3cm;
      padding-top: 0.3cm;
    }
    @media print {
      body { margin: 0; }
      .quotation-container { margin: 0; padding: 0.5cm; }
    }
  </style>
</head>
<body>
  <div class="quotation-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">Sistem Manajemen Bisnis</div>
        <div class="company-details">
          Jl. Contoh No. 123<br>
          Jakarta 12345, Indonesia<br>
          Telp: (021) 123-4567<br>
          Email: info@bisnis.co.id
        </div>
      </div>
      <div class="quotation-title">
        <h1>QUOTATION</h1>
        <div class="quotation-number">No: ${quotationNumber}</div>
      </div>
    </div>

    <!-- Quotation Details -->
    <div class="quotation-details">
      <div class="client-info">
        <div class="section-title">Kepada:</div>
        <div class="info-row">
          <div class="info-label">Nama:</div>
          <div class="info-value">${client.name}</div>
        </div>
        ${client.company ? `
        <div class="info-row">
          <div class="info-label">Perusahaan:</div>
          <div class="info-value">${client.company}</div>
        </div>
        ` : ''}
        <div class="info-row">
          <div class="info-label">Telepon:</div>
          <div class="info-value">${client.phone}</div>
        </div>
        ${client.email ? `
        <div class="info-row">
          <div class="info-label">Email:</div>
          <div class="info-value">${client.email}</div>
        </div>
        ` : ''}
        ${client.address ? `
        <div class="info-row">
          <div class="info-label">Alamat:</div>
          <div class="info-value">${client.address}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="quotation-info">
        <div class="section-title">Detail Quotation:</div>
        <div class="info-row">
          <div class="info-label">Tanggal:</div>
          <div class="info-value">${formatDate(date)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Berlaku Hingga:</div>
          <div class="info-value">${formatDate(validUntil)}</div>
        </div>
      </div>
    </div>

    <!-- Project Details -->
    <div class="project-details">
      <div class="section-title">Detail Proyek:</div>
      <div class="info-row">
        <div class="info-label">Nomor Proyek:</div>
        <div class="info-value">${project.number}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Deskripsi:</div>
        <div class="info-value">${project.description}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Output:</div>
        <div class="info-value">${project.output}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Tipe:</div>
        <div class="info-value">${project.type === 'PRODUCTION' ? 'Produksi' : 'Media Sosial'}</div>
      </div>
    </div>

    <!-- Amount Table -->
    <table class="amount-table">
      <thead>
        <tr>
          <th>Deskripsi</th>
          <th>Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Biaya Proyek: ${project.description}</td>
          <td class="amount">${formatIDR(amountPerProject)}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="amount"><strong>${formatIDR(totalAmount)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Validity Notice -->
    <div class="validity-notice">
      <div class="validity-title">📅 Masa Berlaku Quotation</div>
      <div>Quotation ini berlaku hingga ${formatDate(validUntil)}. Setelah tanggal tersebut, harga dapat berubah.</div>
    </div>

    <!-- Terms and Conditions -->
    ${terms ? `
    <div class="terms">
      <div class="terms-title">Syarat & Ketentuan:</div>
      <div>${terms}</div>
    </div>
    ` : ''}

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="signature-box">
        <div>Hormat kami,</div>
        <div class="signature-line">
          Sistem Manajemen Bisnis
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>Terima kasih atas kepercayaan Anda. Dokumen ini dibuat secara otomatis oleh sistem.</div>
    </div>
  </div>
</body>
</html>`;
  }
}