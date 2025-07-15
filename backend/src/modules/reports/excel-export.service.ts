import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Decimal } from '@prisma/client/runtime/library';
import { ExcelTableHelper } from './excel-table-helper';
import { 
  IndonesianExcelFormatter, 
  IndonesianCompanyInfo, 
  IndonesianReportHeader 
} from './indonesian-excel-formatter';

interface SalesReportData {
  clientName: string;
  projectNumber: string;
  projectDate: Date;
  projectDescription: string;
  salesAmount: number;
  invoiceNumber?: string;
}

interface ReceivablesReportData {
  clientName: string;
  projectDescription: string;
  invoiceDate: Date;
  invoiceNumber: string;
  beginningBalance: number;
  salesAmount: number;
  paymentsReceived: number;
  endingBalance: number;
  requiresMaterai?: boolean; // For invoices > 5M IDR
}

interface ClientMonthlySummary {
  clientName: string;
  [month: string]: number | string; // January, February, etc.
}

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  clientIds?: string[];
  month?: number; // 1-12 for specific month
  year?: number;
}

@Injectable()
export class ExcelExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Indonesian company information for SAK EMKM compliance
   */
  private getIndonesianCompanyInfo(): IndonesianCompanyInfo {
    return {
      name: 'MONOMI',
      address: 'Jl. Usaha Mandiri No. 123',
      city: 'Jakarta Selatan',
      postalCode: '12345',
      phone: '+62-21-1234-5678',
      email: 'info@monomi.co.id',
      website: 'www.monomi.co.id',
      npwp: '01.234.567.8-901.234', // Example NPWP format
      siup: 'SIUP/123/2024' // Example SIUP
    };
  }

  async generateSalesAndReceivablesReport(filters: ExportFilters): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Get Indonesian company information and validate compliance
    const companyInfo = this.getIndonesianCompanyInfo();
    const validationErrors = IndonesianExcelFormatter.validateIndonesianCompliance(companyInfo);
    
    if (validationErrors.length > 0) {
      throw new Error(`Indonesian compliance validation failed: ${validationErrors.join(', ')}`);
    }
    
    // Set workbook properties for Indonesian business standards
    workbook.creator = `${companyInfo.name} - Sistem Manajemen Bisnis Indonesia`;
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.company = companyInfo.name;
    workbook.keywords = 'Laporan Keuangan, SAK EMKM, Indonesia, UMKM';

    // Determine if this is a single-month report
    const isSingleMonth = this.isSingleMonthReport(filters);
    const targetMonth = isSingleMonth ? this.getTargetMonth(filters) : null;

    // Generate all report data
    const [salesDetailData, receivablesDetailData, salesMonthlySummary, receivablesMonthlySummary, salesClientSummary, receivablesClientSummary] = await Promise.all([
      this.getSalesDetailData(filters),
      this.getReceivablesDetailData(filters),
      this.getSalesMonthlySummary(filters, targetMonth),
      this.getReceivablesMonthlySummary(filters, targetMonth),
      this.getSalesClientSummary(filters),
      this.getReceivablesClientSummary(filters)
    ]);

    // Create worksheets with Indonesian formatting
    this.createSalesDetailSheet(workbook, salesDetailData, companyInfo, targetMonth);
    this.createReceivablesDetailSheet(workbook, receivablesDetailData, companyInfo, targetMonth);
    this.createSalesMonthlySummarySheet(workbook, salesMonthlySummary, companyInfo, targetMonth);
    this.createSalesClientSummarySheet(workbook, salesClientSummary, companyInfo, targetMonth);
    this.createReceivablesMonthlySummarySheet(workbook, receivablesMonthlySummary, companyInfo, targetMonth);
    this.createReceivablesClientSummarySheet(workbook, receivablesClientSummary, companyInfo, targetMonth);

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async getSalesDetailData(filters: ExportFilters): Promise<SalesReportData[]> {
    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate, 'creationDate');
    const clientFilter = filters.clientIds?.length ? { id: { in: filters.clientIds } } : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'PAID'] }, // Confirmed sales
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
        project: { 
          select: { 
            number: true, 
            description: true,
          } 
        },
      },
      orderBy: [
        { client: { name: 'asc' } },
        { creationDate: 'asc' },
      ],
    });

    return invoices.map((invoice) => ({
      clientName: invoice.client.name,
      projectNumber: invoice.project.number,
      projectDate: invoice.creationDate,
      projectDescription: invoice.project.description,
      salesAmount: Number(invoice.totalAmount),
      invoiceNumber: invoice.invoiceNumber, // Indonesian standard invoice tracking
    }));
  }

  private async getReceivablesDetailData(filters: ExportFilters): Promise<ReceivablesReportData[]> {
    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate, 'creationDate');
    const clientFilter = filters.clientIds?.length ? { id: { in: filters.clientIds } } : {};

    // Get all invoices with their payments
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
        project: { select: { description: true } },
        payments: {
          where: { status: 'CONFIRMED' },
          select: { amount: true, paymentDate: true },
        },
      },
      orderBy: [
        { client: { name: 'asc' } },
        { creationDate: 'asc' },
      ],
    });

    // Calculate balances for each invoice
    const clientBalances = new Map<string, number>();
    const receivablesData: ReceivablesReportData[] = [];

    for (const invoice of invoices) {
      const clientName = invoice.client.name;
      const beginningBalance = clientBalances.get(clientName) || 0;
      const salesAmount = Number(invoice.totalAmount);
      const paymentsReceived = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );
      const endingBalance = beginningBalance + salesAmount - paymentsReceived;

      // Update client balance
      clientBalances.set(clientName, endingBalance);

      receivablesData.push({
        clientName,
        projectDescription: invoice.project.description,
        invoiceDate: invoice.creationDate,
        invoiceNumber: invoice.invoiceNumber,
        beginningBalance,
        salesAmount,
        paymentsReceived,
        endingBalance,
        requiresMaterai: salesAmount > 5000000, // Indonesian materai requirement
      });
    }

    return receivablesData;
  }

  private async getSalesMonthlySummary(filters: ExportFilters, targetMonth?: number | null): Promise<ClientMonthlySummary[]> {
    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate, 'creationDate');
    const clientFilter = filters.clientIds?.length ? { id: { in: filters.clientIds } } : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'PAID'] },
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
      },
    });

    const monthNames = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];

    const summaryMap = new Map<string, ClientMonthlySummary>();

    // Initialize all clients with empty monthly data
    const allClients = new Set(invoices.map(i => i.client.name));
    allClients.forEach(clientName => {
      const summary: ClientMonthlySummary = { clientName };
      monthNames.forEach(m => summary[m] = 0);
      summaryMap.set(clientName, summary);
    });

    // If single-month report, only populate the target month
    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const invoiceMonth = invoice.creationDate.getMonth();
        
        // Only add to summary if invoice is from target month
        if (invoiceMonth === targetMonth) {
          const amount = Number(invoice.totalAmount);
          const clientSummary = summaryMap.get(clientName)!;
          clientSummary[targetMonthName] = (clientSummary[targetMonthName] as number) + amount;
        }
      });
    } else {
      // Multi-month report - populate all months with data
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const month = monthNames[invoice.creationDate.getMonth()];
        const amount = Number(invoice.totalAmount);

        const clientSummary = summaryMap.get(clientName)!;
        clientSummary[month] = (clientSummary[month] as number) + amount;
      });
    }

    return Array.from(summaryMap.values());
  }

  private async getSalesClientSummary(filters: ExportFilters): Promise<ClientMonthlySummary[]> {
    // For simplicity, this returns the same as monthly summary
    // In a real implementation, you might want different aggregation logic
    return this.getSalesMonthlySummary(filters);
  }

  private async getReceivablesMonthlySummary(filters: ExportFilters, targetMonth?: number | null): Promise<ClientMonthlySummary[]> {
    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate, 'creationDate');
    const clientFilter = filters.clientIds?.length ? { id: { in: filters.clientIds } } : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
        payments: {
          where: { status: 'CONFIRMED' },
          select: { amount: true, paymentDate: true },
        },
      },
    });

    const monthNames = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];

    const summaryMap = new Map<string, ClientMonthlySummary>();

    // Initialize all clients with empty monthly data
    const allClients = new Set(invoices.map(i => i.client.name));
    allClients.forEach(clientName => {
      const summary: ClientMonthlySummary = { clientName };
      monthNames.forEach(m => summary[m] = 0);
      summaryMap.set(clientName, summary);
    });

    // If single-month report, only populate the target month
    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const invoiceMonth = invoice.creationDate.getMonth();
        
        // Only add to summary if invoice is from target month
        if (invoiceMonth === targetMonth) {
          const invoiceAmount = Number(invoice.totalAmount);
          const paymentsAmount = invoice.payments.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0
          );
          const outstandingAmount = invoiceAmount - paymentsAmount;

          const clientSummary = summaryMap.get(clientName)!;
          clientSummary[targetMonthName] = (clientSummary[targetMonthName] as number) + outstandingAmount;
        }
      });
    } else {
      // Multi-month report - populate all months with data
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const month = monthNames[invoice.creationDate.getMonth()];
        const invoiceAmount = Number(invoice.totalAmount);
        const paymentsAmount = invoice.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );
        const outstandingAmount = invoiceAmount - paymentsAmount;

        const clientSummary = summaryMap.get(clientName)!;
        clientSummary[month] = (clientSummary[month] as number) + outstandingAmount;
      });
    }

    return Array.from(summaryMap.values());
  }

  private async getReceivablesClientSummary(filters: ExportFilters): Promise<ClientMonthlySummary[]> {
    return this.getReceivablesMonthlySummary(filters);
  }

  private createSalesDetailSheet(workbook: ExcelJS.Workbook, data: SalesReportData[], companyInfo: IndonesianCompanyInfo, targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(SALES) RINCIAN PENJUALAN');
    
    // Create Indonesian report header (SAK EMKM compliant)
    const monthName = targetMonth !== null && targetMonth !== undefined 
      ? this.getIndonesianMonthName(targetMonth)
      : 'SEMUA BULAN';
    
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'RINCIAN PENJUALAN',
      reportSubtitle: 'LAPORAN DETAIL TRANSAKSI PENJUALAN',
      reportPeriod: `${monthName} 2025`,
      preparationDate: new Date(),
      reportType: 'RINCIAN_PENJUALAN'
    };

    // Apply Indonesian letterhead formatting
    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet, 
      companyInfo, 
      reportHeader
    );

    // Add column headers (Indonesian SAK EMKM terminology)
    const headers = [
      'No.',
      'NAMA CLIENT',
      'No. Project',
      'Tanggal Project',
      'Deskripsi Project',
      'Jumlah Penjualan (IDR)',
      'No. Invoice',
      'Keterangan Materai'
    ];
    
    const headerRow = worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data with Indonesian business logic
    let totalAmount = 0;
    let materaiCount = 0;
    
    data.forEach((item, index) => {
      const requiresMaterai = item.salesAmount > 5000000; // SAK EMKM materai requirement
      const keterangan = requiresMaterai ? 'Wajib Materai Rp 10.000' : '-';
      if (requiresMaterai) materaiCount++;
      
      worksheet.addRow([
        index + 1,
        item.clientName,
        item.projectNumber,
        item.projectDate,
        item.projectDescription,
        item.salesAmount,
        item.invoiceNumber || this.generateIndonesianInvoiceNumber(item.projectDate, index + 1),
        keterangan
      ]);
      totalAmount += item.salesAmount;
    });

    // Add Indonesian summary section
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow(['', '', '', '', 'JUMLAH KESELURUHAN:', totalAmount, '', '']);
    
    if (materaiCount > 0) {
      worksheet.addRow(['', '', '', '', 'Total Invoice dgn Materai:', materaiCount, 'invoice', '']);
      worksheet.addRow(['', '', '', '', 'Estimasi Biaya Materai:', materaiCount * 10000, '', 'IDR']);
    }

    // Merge cells for summary section (Indonesian standard)
    worksheet.mergeCells(`A${summaryRowIndex}:E${summaryRowIndex}`);
    if (materaiCount > 0) {
      worksheet.mergeCells(`A${summaryRowIndex + 1}:E${summaryRowIndex + 1}`);
      worksheet.mergeCells(`A${summaryRowIndex + 2}:E${summaryRowIndex + 2}`);
    }

    // Apply Indonesian table formatting
    const tableEndRow = materaiCount > 0 ? summaryRowIndex + 2 : summaryRowIndex;
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet, 
      headerRowIndex, 
      tableEndRow, 
      1, 
      8, 
      'RincianPenjualan', 
      true
    );

    // Apply Indonesian currency and date formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [6]);
    IndonesianExcelFormatter.applyIndonesianDateFormat(worksheet, [4]);
    IndonesianExcelFormatter.formatNegativeNumbers(worksheet, [6]);

    // Set Indonesian column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 8);

    // Apply Indonesian page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add Indonesian footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan'
    );
  }

  private createReceivablesDetailSheet(workbook: ExcelJS.Workbook, data: ReceivablesReportData[], companyInfo: IndonesianCompanyInfo, targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(AR) MONTHLY');
    
    // Add title header block (rows 1-4) - Indonesian Standards
    worksheet.addRow(['MONOMI', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['RINCIAN PIUTANG USAHA', '', '', '', '', '', '', '', '']); // More formal Indonesian term
    const monthName = targetMonth !== null && targetMonth !== undefined 
      ? this.getIndonesianMonthName(targetMonth)
      : 'SEMUA BULAN';
    worksheet.addRow([monthName + ' 2025', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '', '', '', '', '']); // Empty spacer row

    // Add column headers (row 5) - Indonesian SAK terminology
    const headers = ['No', 'NAMA CLIENT', 'Deskripsi Project', 'Tanggal Invoice', 'No. Invoice', 'Saldo Awal (IDR)', 'Penjualan (IDR)', 'Pembayaran (IDR)', 'Saldo Akhir (IDR)'];
    worksheet.addRow(headers);

    // Add data starting from row 6 - Indonesian balance calculations
    let totalSaldoAwal = 0, totalPenjualan = 0, totalPembayaran = 0, totalSaldoAkhir = 0;
    data.forEach((item, index) => {
      // Validate Indonesian balance formula: Saldo Akhir = Saldo Awal + Penjualan - Pembayaran
      const calculatedBalance = item.beginningBalance + item.salesAmount - item.paymentsReceived;
      if (Math.abs(calculatedBalance - item.endingBalance) > 0.01) {
        console.warn(`Balance mismatch for ${item.clientName}: Expected ${calculatedBalance}, Got ${item.endingBalance}`);
      }
      
      worksheet.addRow([
        index + 1,
        item.clientName,
        item.projectDescription,
        this.formatIndonesianDate(item.invoiceDate),
        item.invoiceNumber,
        item.beginningBalance,
        item.salesAmount,
        item.paymentsReceived,
        item.endingBalance,
      ]);
      
      totalSaldoAwal += item.beginningBalance;
      totalPenjualan += item.salesAmount;
      totalPembayaran += item.paymentsReceived;
      totalSaldoAkhir += item.endingBalance;
    });

    // Add summary row with "JUMLAH" (Indonesian standard)
    const summaryRowIndex = 6 + data.length;
    worksheet.addRow(['', '', '', '', 'JUMLAH TOTAL', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);
    
    // Merge cells for summary (Indonesian practice)
    worksheet.mergeCells(`A${summaryRowIndex}:E${summaryRowIndex}`);
    
    // Validate total balance calculation
    const expectedTotalBalance = totalSaldoAwal + totalPenjualan - totalPembayaran;
    if (Math.abs(expectedTotalBalance - totalSaldoAkhir) > 0.01) {
      console.warn(`Total balance validation failed: Expected ${expectedTotalBalance}, Got ${totalSaldoAkhir}`);
    }

    // Apply professional table formatting
    const startRow = 5; // Header row
    const endRow = summaryRowIndex; // Summary row
    const startCol = 1;
    const endCol = 9;
    ExcelTableHelper.formatAsTable(worksheet, startRow, endRow, startCol, endCol, 'ReceivablesDetail');

    // Apply title formatting
    ExcelTableHelper.formatTitle(worksheet, [1, 2, 3]);

    // Apply Indonesian currency and date formatting
    ExcelTableHelper.applyCurrencyFormat(worksheet, [6, 7, 8, 9]); // Balance columns
    ExcelTableHelper.applyDateFormat(worksheet, [4]); // Date column

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createSalesMonthlySummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[], companyInfo: IndonesianCompanyInfo, targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(SALES) RKP PER BULAN');
    
    // Add title header block
    worksheet.addRow(['MONOMI']);
    worksheet.addRow(['REKAP PENJUALAN']);
    worksheet.addRow(['PER BULAN']);
    worksheet.addRow(['']); // Empty spacer row

    // Add headers (row 5) - VERTICAL month listing format
    const headers = ['BULAN', 'JUMLAH'];
    worksheet.addRow(headers);

    // Calculate total sales per month across all clients
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const monthTotals = new Array(12).fill(0);

    // Sum up all client data for each month
    data.forEach((clientData) => {
      monthNames.forEach((monthName, index) => {
        monthTotals[index] += (clientData[monthName] as number) || 0;
      });
    });

    // For single-month reports, only show the target month
    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      worksheet.addRow([targetMonthName, monthTotals[targetMonth]]);
      
      // Add summary row
      const summaryRowIndex = 7; // Header + 1 data row + 1
      worksheet.addRow(['JUMLAH TOTAL', monthTotals[targetMonth]]);
      
      // Apply table formatting for single month
      ExcelTableHelper.formatMonthlySummaryTable(worksheet, 5, 1, true);
    } else {
      // Add data rows - one row per month
      monthNames.forEach((monthName, index) => {
        worksheet.addRow([monthName, monthTotals[index]]);
      });
      
      // Add summary row
      const totalAmount = monthTotals.reduce((sum, total) => sum + total, 0);
      const summaryRowIndex = 6 + monthNames.length;
      worksheet.addRow(['JUMLAH TOTAL', totalAmount]);
      
      // Apply table formatting for multi-month
      ExcelTableHelper.formatMonthlySummaryTable(worksheet, 5, 12, false);
    }

    // Apply title formatting
    ExcelTableHelper.formatTitle(worksheet, [1, 2, 3]);

    // Apply Indonesian currency formatting
    ExcelTableHelper.applyCurrencyFormat(worksheet, [2]);

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createSalesClientSummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[], companyInfo: IndonesianCompanyInfo, targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(SALES) RKP PER CLIENT');
    
    // Add title header block
    worksheet.addRow(['MONOMI']);
    worksheet.addRow(['REKAP PENJUALAN']);
    worksheet.addRow(['PER CLIENT']);
    worksheet.addRow(['']); // Empty spacer row

    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    
    // For single-month reports, simplified 2-column structure
    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      const headers = ['NAMA CLIENT', targetMonthName];
      worksheet.addRow(headers);

      // Add client data
      data.forEach((item) => {
        const value = (item[targetMonthName] as number) || 0;
        worksheet.addRow([item.clientName, value]);
      });

      // Add summary row
      const summaryRowIndex = 6 + data.length;
      const total = data.reduce((sum, item) => sum + ((item[targetMonthName] as number) || 0), 0);
      worksheet.addRow(['JUMLAH TOTAL', total]);

      // Apply table formatting for single month (2 columns)
      ExcelTableHelper.formatClientSummaryTable(worksheet, 5, data.length, 2, true);
    } else {
      // Multi-month report - horizontal months + TOTAL column
      const headers = ['NAMA CLIENT', ...monthNames, 'TOTAL'];
      worksheet.addRow(headers);

      // Add data for each client
      const columnTotals = new Array(12).fill(0);

      data.forEach((item) => {
        const row = [item.clientName];
        let clientTotal = 0;
        
        monthNames.forEach((month, index) => {
          const value = (item[month] as number) || 0;
          row.push(value);
          clientTotal += value;
          columnTotals[index] += value;
        });
        
        row.push(clientTotal); // Add TOTAL column
        worksheet.addRow(row);
      });

      // Add summary row
      const summaryRow = ['JUMLAH TOTAL'];
      let grandTotal = 0;
      columnTotals.forEach(total => {
        summaryRow.push(total);
        grandTotal += total;
      });
      summaryRow.push(grandTotal);
      
      const summaryRowIndex = 6 + data.length;
      worksheet.addRow(summaryRow);

      // Apply table formatting for multi-month (14 columns: client + 12 months + total)
      ExcelTableHelper.formatClientSummaryTable(worksheet, 5, data.length, 14, false);
    }

    // Apply title formatting
    ExcelTableHelper.formatTitle(worksheet, [1, 2, 3]);

    // Apply Indonesian currency formatting (all columns except first)
    const currencyColumns = targetMonth !== null && targetMonth !== undefined 
      ? [2] // Single month: just the amount column
      : Array.from({length: 13}, (_, i) => i + 2); // Multi-month: all month + total columns
    ExcelTableHelper.applyCurrencyFormat(worksheet, currencyColumns);

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = targetMonth !== null && targetMonth !== undefined ? 18 : 12;
    });
  }

  private createReceivablesMonthlySummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[], companyInfo: IndonesianCompanyInfo, targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(AR) RKP PER BULAN');
    
    // Add title header block (rows 1-4)
    worksheet.addRow(['MONOMI', '', '', '', '']);
    worksheet.addRow(['REKAP PIUTANG', '', '', '', '']);
    worksheet.addRow(['PER BULAN', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '']); // Empty spacer row

    // Add headers (row 5) - vertical month listing with 4 financial columns
    const headers = ['BULAN', 'SALDO AWAL', 'PENJUALAN', 'PEMBAYARAN', 'SALDO AKHIR'];
    worksheet.addRow(headers);

    // Calculate monthly AR progression
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    let runningBalance = 0;
    let totalSaldoAwal = 0, totalPenjualan = 0, totalPembayaran = 0, totalSaldoAkhir = 0;

    // For single-month reports, only show the target month
    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      let monthSales = 0;
      let monthPayments = 0; // This would need to be tracked separately
      
      data.forEach((clientData) => {
        monthSales += (clientData[targetMonthName] as number) || 0;
      });

      const beginningBalance = 0; // Starting balance for the month
      const endingBalance = beginningBalance + monthSales - monthPayments;

      worksheet.addRow([targetMonthName, beginningBalance, monthSales, monthPayments, endingBalance]);
      
      // Add summary row
      const summaryRowIndex = 7; // Header + 1 data row + 1
      worksheet.addRow(['JUMLAH TOTAL', beginningBalance, monthSales, monthPayments, endingBalance]);
      
      // Apply table formatting for single month
      ExcelTableHelper.formatAsTable(worksheet, 5, summaryRowIndex, 1, 5, 'ReceivablesMonthly');
    } else {
      // Multi-month report
      monthNames.forEach((monthName, index) => {
        // Calculate totals for this month across all clients
        let monthSales = 0;
        let monthPayments = 0; // This would need to be tracked separately - for now using 0
        
        data.forEach((clientData) => {
          monthSales += (clientData[monthName] as number) || 0;
        });

        const beginningBalance = runningBalance;
        const endingBalance = beginningBalance + monthSales - monthPayments;
        runningBalance = endingBalance;

        worksheet.addRow([monthName, beginningBalance, monthSales, monthPayments, endingBalance]);
        
        totalSaldoAwal += beginningBalance;
        totalPenjualan += monthSales;
        totalPembayaran += monthPayments;
        totalSaldoAkhir += endingBalance;
      });

      // Add summary row
      const summaryRowIndex = 6 + monthNames.length;
      worksheet.addRow(['JUMLAH TOTAL', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);
      
      // Apply table formatting for multi-month
      ExcelTableHelper.formatAsTable(worksheet, 5, summaryRowIndex, 1, 5, 'ReceivablesMonthly');
    }

    // Apply title formatting
    ExcelTableHelper.formatTitle(worksheet, [1, 2, 3]);

    // Apply Indonesian currency formatting (all columns except first)
    ExcelTableHelper.applyCurrencyFormat(worksheet, [2, 3, 4, 5]);

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createReceivablesClientSummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[], companyInfo: IndonesianCompanyInfo, targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(AR) RKP PER CLIENT');
    
    // Add title header block (rows 1-4)
    worksheet.addRow(['MONOMI', '', '', '', '']);
    worksheet.addRow(['REKAP PIUTANG', '', '', '', '']);
    worksheet.addRow(['PER CLIENT', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '']); // Empty spacer row

    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    
    // For single-month reports, simplified structure
    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      const headers = ['NAMA CLIENT', 'SALDO AWAL', 'PENJUALAN', 'PEMBAYARAN', 'SALDO AKHIR'];
      worksheet.addRow(headers);

      let totalSaldoAwal = 0, totalPenjualan = 0, totalPembayaran = 0, totalSaldoAkhir = 0;

      // Add client data
      data.forEach((item) => {
        const clientPenjualan = (item[targetMonthName] as number) || 0;
        const clientSaldoAwal = 0; // Would need to track separately
        const clientPembayaran = 0; // Would need to track separately
        const clientSaldoAkhir = clientSaldoAwal + clientPenjualan - clientPembayaran;
        
        worksheet.addRow([item.clientName, clientSaldoAwal, clientPenjualan, clientPembayaran, clientSaldoAkhir]);
        
        totalSaldoAwal += clientSaldoAwal;
        totalPenjualan += clientPenjualan;
        totalPembayaran += clientPembayaran;
        totalSaldoAkhir += clientSaldoAkhir;
      });

      // Add summary row
      const summaryRowIndex = 6 + data.length;
      worksheet.addRow(['JUMLAH TOTAL', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);

      // Apply table formatting for single month (5 columns)
      ExcelTableHelper.formatAsTable(worksheet, 5, summaryRowIndex, 1, 5, 'ReceivablesClient');
    } else {
      // Multi-month report - 5 columns with financial breakdown
      const headers = ['NAMA CLIENT', 'SALDO AWAL', 'PENJUALAN', 'PEMBAYARAN', 'SALDO AKHIR'];
      worksheet.addRow(headers);

      let totalSaldoAwal = 0, totalPenjualan = 0, totalPembayaran = 0, totalSaldoAkhir = 0;

      data.forEach((item) => {
        const clientPenjualan = monthNames.reduce((sum, month) => sum + ((item[month] as number) || 0), 0);
        const clientSaldoAwal = 0; // Would need to track separately
        const clientPembayaran = 0; // Would need to track separately
        const clientSaldoAkhir = clientSaldoAwal + clientPenjualan - clientPembayaran;
        
        worksheet.addRow([item.clientName, clientSaldoAwal, clientPenjualan, clientPembayaran, clientSaldoAkhir]);
        
        totalSaldoAwal += clientSaldoAwal;
        totalPenjualan += clientPenjualan;
        totalPembayaran += clientPembayaran;
        totalSaldoAkhir += clientSaldoAkhir;
      });

      // Add summary row
      const summaryRowIndex = 6 + data.length;
      worksheet.addRow(['JUMLAH TOTAL', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);

      // Apply table formatting for multi-month (5 columns)
      ExcelTableHelper.formatAsTable(worksheet, 5, summaryRowIndex, 1, 5, 'ReceivablesClient');
    }

    // Apply title formatting
    ExcelTableHelper.formatTitle(worksheet, [1, 2, 3]);

    // Apply Indonesian currency formatting (all columns except first)
    ExcelTableHelper.applyCurrencyFormat(worksheet, [2, 3, 4, 5]);

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private isSingleMonthReport(filters: ExportFilters): boolean {
    if (!filters.startDate || !filters.endDate) return false;
    
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    
    // Check if both dates are in the same month and year
    return start.getFullYear() === end.getFullYear() && 
           start.getMonth() === end.getMonth();
  }

  private getTargetMonth(filters: ExportFilters): number {
    if (filters.startDate) {
      return new Date(filters.startDate).getMonth(); // 0-11
    }
    return new Date().getMonth(); // Default to current month
  }

  private buildDateFilter(startDate?: string, endDate?: string, dateField: string = 'createdAt') {
    const filter: any = {};

    if (startDate || endDate) {
      filter[dateField] = {};
      if (startDate) {
        filter[dateField].gte = new Date(startDate);
      }
      if (endDate) {
        filter[dateField].lte = new Date(endDate);
      }
    }

    return filter;
  }

  // Indonesian Standards Helper Methods
  
  private getIndonesianMonthName(monthIndex: number): string {
    const indonesianMonths = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    return indonesianMonths[monthIndex] || 'JANUARI';
  }
  
  private formatIndonesianDate(date: Date): string {
    // Indonesian standard date format: dd/mm/yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  private generateInvoiceNumber(date: Date, sequence: number): string {
    // Indonesian invoice number format: INV-YYYY-MM-NNN
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const seq = sequence.toString().padStart(3, '0');
    return `INV-${year}-${month}-${seq}`;
  }
  
  private generateIndonesianInvoiceNumber(date: Date, sequence: number): string {
    // Enhanced Indonesian invoice number format with regional code
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const seq = sequence.toString().padStart(4, '0');
    return `INV-JKT-${year}${month}-${seq}`; // JKT = Jakarta regional code
  }
  
  private formatIndonesianCurrency(amount: number): string {
    // Indonesian currency formatting
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  private validateIndonesianBalance(saldoAwal: number, penjualan: number, pembayaran: number, saldoAkhir: number): boolean {
    // Indonesian balance validation: Saldo Akhir = Saldo Awal + Penjualan - Pembayaran
    const calculated = saldoAwal + penjualan - pembayaran;
    return Math.abs(calculated - saldoAkhir) < 0.01;
  }
}