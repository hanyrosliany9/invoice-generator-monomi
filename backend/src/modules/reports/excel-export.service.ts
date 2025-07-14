import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Decimal } from '@prisma/client/runtime/library';

interface SalesReportData {
  clientName: string;
  projectNumber: string;
  projectDate: Date;
  projectDescription: string;
  salesAmount: number;
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

  async generateSalesAndReceivablesReport(filters: ExportFilters): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Monomi Invoice Generator';
    workbook.created = new Date();
    workbook.modified = new Date();

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

    // Create worksheets
    this.createSalesDetailSheet(workbook, salesDetailData, targetMonth);
    this.createReceivablesDetailSheet(workbook, receivablesDetailData, targetMonth);
    this.createSalesMonthlySummarySheet(workbook, salesMonthlySummary, targetMonth);
    this.createSalesClientSummarySheet(workbook, salesClientSummary);
    this.createReceivablesMonthlySummarySheet(workbook, receivablesMonthlySummary, targetMonth);
    this.createReceivablesClientSummarySheet(workbook, receivablesClientSummary);

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

  private createSalesDetailSheet(workbook: ExcelJS.Workbook, data: SalesReportData[], targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(SALES) MONTHLY');
    
    // Add title header block (rows 1-4)
    worksheet.addRow(['MONOMI', '', '', '', '', '', '', '']);
    worksheet.addRow(['RINCIAN PENJUALAN', '', '', '', '', '', '', '']);
    const monthName = targetMonth !== null && targetMonth !== undefined 
      ? ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'][targetMonth]
      : 'SEMUA BULAN';
    worksheet.addRow([monthName + ' 2025', '', '', '', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '', '', '', '']); // Empty spacer row

    // Add column headers (row 5)
    const headers = ['No', 'NAMA CLIENT', 'No. Project', 'Tanggal Project', 'Project', 'Jml Penjualan', '', ''];
    worksheet.addRow(headers);

    // Style title rows
    const titleRow1 = worksheet.getRow(1);
    titleRow1.font = { bold: true, size: 14 };
    
    const titleRow2 = worksheet.getRow(2);
    titleRow2.font = { bold: true, size: 12 };
    
    const titleRow3 = worksheet.getRow(3);
    titleRow3.font = { bold: true, size: 11 };

    // Style headers (row 5)
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data starting from row 6
    let totalAmount = 0;
    data.forEach((item, index) => {
      worksheet.addRow([
        index + 1,
        item.clientName,
        item.projectNumber,
        item.projectDate,
        item.projectDescription,
        item.salesAmount,
        '', ''
      ]);
      totalAmount += item.salesAmount;
    });

    // Add summary row with "Jumlah" and total
    const summaryRowIndex = 6 + data.length;
    const summaryRow = worksheet.addRow(['', '', '', '', 'Jumlah', totalAmount, '', '']);
    summaryRow.font = { bold: true };
    
    // Merge cells for summary
    worksheet.mergeCells(`A${summaryRowIndex}:E${summaryRowIndex}`);

    // Format currency column
    const salesColumn = worksheet.getColumn(6);
    salesColumn.numFmt = 'Rp #,##0';

    // Format date column
    const dateColumn = worksheet.getColumn(4);
    dateColumn.numFmt = 'dd/mm/yyyy';

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createReceivablesDetailSheet(workbook: ExcelJS.Workbook, data: ReceivablesReportData[], targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(AR) MONTHLY');
    
    // Add title header block (rows 1-4)
    worksheet.addRow(['MONOMI']);
    worksheet.addRow(['RINCIAN PIUTANG']);
    const monthName = targetMonth !== null && targetMonth !== undefined 
      ? ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'][targetMonth]
      : 'SEMUA BULAN';
    worksheet.addRow([monthName + ' 2025']);
    worksheet.addRow(['']); // Empty spacer row

    // Add column headers (row 5)
    const headers = ['No', 'NAMA CLIENT', 'Project', 'Tanggal Invoice', 'No. Invoice', 'Saldo Awal', 'Jml Penjualan', 'Pembayaran', 'Saldo Akhir'];
    worksheet.addRow(headers);

    // Style title rows
    const titleRow1 = worksheet.getRow(1);
    titleRow1.font = { bold: true, size: 14 };
    
    const titleRow2 = worksheet.getRow(2);
    titleRow2.font = { bold: true, size: 12 };
    
    const titleRow3 = worksheet.getRow(3);
    titleRow3.font = { bold: true, size: 11 };

    // Style headers (row 5)
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data starting from row 6
    let totalSaldoAwal = 0, totalPenjualan = 0, totalPembayaran = 0, totalSaldoAkhir = 0;
    data.forEach((item, index) => {
      worksheet.addRow([
        index + 1,
        item.clientName,
        item.projectDescription,
        item.invoiceDate,
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

    // Add summary row with "Jumlah" and totals
    const summaryRowIndex = 6 + data.length;
    const summaryRow = worksheet.addRow(['', '', '', '', 'Jumlah', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);
    summaryRow.font = { bold: true };
    
    // Merge cells for summary
    worksheet.mergeCells(`A${summaryRowIndex}:E${summaryRowIndex}`);

    // Format currency columns
    [6, 7, 8, 9].forEach(colIndex => {
      const column = worksheet.getColumn(colIndex);
      column.numFmt = 'Rp #,##0';
    });

    // Format date column
    const dateColumn = worksheet.getColumn(4);
    dateColumn.numFmt = 'dd/mm/yyyy';

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createSalesMonthlySummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[], targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(SALES) RKP PER BULAN');
    
    // Add title header block
    worksheet.addRow(['MONOMI']);
    worksheet.addRow(['REKAP PENJUALAN']);
    worksheet.addRow(['PER BULAN']);
    worksheet.addRow(['']); // Empty spacer row

    // Add headers (row 5) - VERTICAL month listing format
    const headers = ['BULAN', 'JUMLAH'];
    worksheet.addRow(headers);

    // Style title rows
    const titleRow1 = worksheet.getRow(1);
    titleRow1.font = { bold: true, size: 14 };
    
    const titleRow2 = worksheet.getRow(2);
    titleRow2.font = { bold: true, size: 12 };
    
    const titleRow3 = worksheet.getRow(3);
    titleRow3.font = { bold: true, size: 11 };

    // Style headers
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Calculate total sales per month across all clients
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const monthTotals = new Array(12).fill(0);

    // Sum up all client data for each month
    data.forEach((clientData) => {
      monthNames.forEach((monthName, index) => {
        monthTotals[index] += (clientData[monthName] as number) || 0;
      });
    });

    // Add data rows - one row per month
    monthNames.forEach((monthName, index) => {
      worksheet.addRow([monthName, monthTotals[index]]);
    });

    // Format currency column
    const amountColumn = worksheet.getColumn(2);
    amountColumn.numFmt = 'Rp #,##0';

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createSalesClientSummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[]): void {
    const worksheet = workbook.addWorksheet('(SALES) RKP PER CLIENT');
    
    // Add title header block
    worksheet.addRow(['MONOMI']);
    worksheet.addRow(['REKAP PENJUALAN']);
    worksheet.addRow(['PER CLIENT']);
    worksheet.addRow(['']); // Empty spacer row

    // Add headers (row 5) - horizontal months + TOTAL column
    const headers = ['NAMA CLIENT', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER', 'TOTAL'];
    worksheet.addRow(headers);

    // Style title rows
    const titleRow1 = worksheet.getRow(1);
    titleRow1.font = { bold: true, size: 14 };
    
    const titleRow2 = worksheet.getRow(2);
    titleRow2.font = { bold: true, size: 12 };
    
    const titleRow3 = worksheet.getRow(3);
    titleRow3.font = { bold: true, size: 11 };

    // Style headers
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data for each client
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
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
      
      row.push(clientTotal.toString()); // Add TOTAL column
      worksheet.addRow(row);
    });

    // Add "Jumlah" summary row
    const summaryRow = ['Jumlah'];
    let grandTotal = 0;
    columnTotals.forEach(total => {
      summaryRow.push(total.toString());
      grandTotal += total;
    });
    summaryRow.push(grandTotal.toString());
    
    const summaryRowIndex = 6 + data.length;
    const row = worksheet.addRow(summaryRow);
    row.font = { bold: true };

    // Format currency columns (all except first)
    for (let i = 2; i <= headers.length; i++) {
      const column = worksheet.getColumn(i);
      column.numFmt = 'Rp #,##0';
    }

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 12;
    });
  }

  private createReceivablesMonthlySummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[], targetMonth?: number | null): void {
    const worksheet = workbook.addWorksheet('(AR) RKP PER BULAN');
    
    // Add title header block (rows 1-4)
    worksheet.addRow(['MONOMI', '', '', '', '']);
    worksheet.addRow(['REKAP PIUTANG', '', '', '', '']);
    worksheet.addRow(['PER BULAN', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '']); // Empty spacer row

    // Add headers (row 5) - vertical month listing with 4 financial columns
    const headers = ['BULAN', 'SALDO AWAL', 'PENJUALAN', 'PEMBAYARAN', 'SALDO AKHIR'];
    worksheet.addRow(headers);

    // Style title rows
    const titleRow1 = worksheet.getRow(1);
    titleRow1.font = { bold: true, size: 14 };
    
    const titleRow2 = worksheet.getRow(2);
    titleRow2.font = { bold: true, size: 12 };
    
    const titleRow3 = worksheet.getRow(3);
    titleRow3.font = { bold: true, size: 11 };

    // Style headers
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Calculate monthly AR progression
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    let runningBalance = 0;
    let totalSaldoAwal = 0, totalPenjualan = 0, totalPembayaran = 0, totalSaldoAkhir = 0;

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

    // Add "Jumlah" summary row
    const summaryRowIndex = 6 + monthNames.length;
    const summaryRow = worksheet.addRow(['Jumlah', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);
    summaryRow.font = { bold: true };

    // Format currency columns (all except first)
    for (let i = 2; i <= headers.length; i++) {
      const column = worksheet.getColumn(i);
      column.numFmt = 'Rp #,##0';
    }

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });
  }

  private createReceivablesClientSummarySheet(workbook: ExcelJS.Workbook, data: ClientMonthlySummary[]): void {
    const worksheet = workbook.addWorksheet('(AR) RKP PER CLIENT');
    
    // Add title header block (rows 1-4)
    worksheet.addRow(['MONOMI', '', '', '', '']);
    worksheet.addRow(['REKAP PIUTANG', '', '', '', '']);
    worksheet.addRow(['PER CLIENT', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '']); // Empty spacer row

    // Add headers (row 5) - 5 columns with financial breakdown
    const headers = ['Nama Client', 'SALDO AWAL', 'PENJUALAN', 'PEMBAYARAN', 'SALDO AKHIR'];
    worksheet.addRow(headers);

    // Style title rows
    const titleRow1 = worksheet.getRow(1);
    titleRow1.font = { bold: true, size: 14 };
    
    const titleRow2 = worksheet.getRow(2);
    titleRow2.font = { bold: true, size: 12 };
    
    const titleRow3 = worksheet.getRow(3);
    titleRow3.font = { bold: true, size: 11 };

    // Style headers
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data for each client
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
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

    // Add "Jumlah" summary row
    const summaryRowIndex = 6 + data.length;
    const summaryRow = worksheet.addRow(['Jumlah', totalSaldoAwal, totalPenjualan, totalPembayaran, totalSaldoAkhir]);
    summaryRow.font = { bold: true };

    // Format currency columns (all except first)
    for (let i = 2; i <= headers.length; i++) {
      const column = worksheet.getColumn(i);
      column.numFmt = 'Rp #,##0';
    }

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
}