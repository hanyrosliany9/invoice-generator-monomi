import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { LedgerService } from './ledger.service';
import { FinancialStatementsService } from './financial-statements.service';
import {
  IndonesianExcelFormatter,
  IndonesianCompanyInfo,
  IndonesianReportHeader,
} from '../../reports/indonesian-excel-formatter';

interface ExportParams {
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  fiscalPeriodId?: string;
  accountCode?: string;
  accountType?: string;
  includeInactive?: boolean;
  includeZeroBalances?: boolean;
}

@Injectable()
export class AccountingExcelExportService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private financialStatementsService: FinancialStatementsService,
  ) {}

  private getIndonesianCompanyInfo(): IndonesianCompanyInfo {
    return {
      name: 'MONOMI',
      address: 'Jl. Usaha Mandiri No. 123',
      city: 'Jakarta Selatan',
      postalCode: '12345',
      phone: '+62-21-1234-5678',
      email: 'info@monomi.co.id',
      website: 'www.monomi.co.id',
      npwp: '01.234.567.8-901.234',
      siup: 'SIUP/123/2024',
    };
  }

  private formatIndonesianDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private getIndonesianMonthName(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const monthNames = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    return monthNames[d.getMonth()];
  }

  // ============ TRIAL BALANCE EXCEL EXPORT ============
  async exportTrialBalanceExcel(params: ExportParams): Promise<Buffer> {
    if (!params.asOfDate) {
      throw new Error('asOfDate is required for Trial Balance export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch trial balance data
    const data = await this.ledgerService.getTrialBalance({
      asOfDate: new Date(params.asOfDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive || false,
      includeZeroBalances: params.includeZeroBalances || false,
    });

    const worksheet = workbook.addWorksheet('Neraca Saldo');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'NERACA SALDO',
      reportSubtitle: 'TRIAL BALANCE',
      reportPeriod: `Per Tanggal: ${this.formatIndonesianDate(params.asOfDate)}`,
      preparationDate: new Date(),
      reportType: 'NERACA_SALDO',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = [
      'Kode Akun',
      'Nama Akun',
      'Tipe',
      'Debit',
      'Kredit',
      'Status',
    ];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data rows
    data.balances.forEach((balance: any) => {
      const isAbnormal =
        (balance.normalBalance === 'DEBIT' && balance.creditBalance > balance.debitBalance) ||
        (balance.normalBalance === 'CREDIT' && balance.debitBalance > balance.creditBalance);

      worksheet.addRow([
        balance.accountCode,
        balance.accountNameId,
        balance.accountType,
        balance.debitBalance,
        balance.creditBalance,
        isAbnormal ? 'Abnormal' : 'Normal',
      ]);
    });

    // Add summary row
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([
      '',
      '',
      'TOTAL',
      data.summary.totalDebit,
      data.summary.totalCredit,
      data.summary.isBalanced ? 'Seimbang ✓' : 'Tidak Seimbang ✗',
    ]);

    // Add balance status
    worksheet.addRow([]);
    if (!data.summary.isBalanced) {
      worksheet.addRow([
        '',
        '',
        'Selisih:',
        Math.abs(data.summary.difference),
      ]);
    }

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      6,
      'NeracaSaldo',
      true,
    );

    // Apply currency formatting to columns D and E (Debit, Kredit)
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [4, 5]);

    // Set column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 6);

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ GENERAL LEDGER EXCEL EXPORT ============
  async exportGeneralLedgerExcel(params: ExportParams): Promise<Buffer> {
    if (!params.startDate || !params.endDate) {
      throw new Error('startDate and endDate are required for General Ledger export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch general ledger data
    const data = await this.ledgerService.getGeneralLedger({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      accountCode: params.accountCode,
      accountType: params.accountType as any,
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive || false,
    });

    const worksheet = workbook.addWorksheet('Buku Besar');

    // Create report header
    const filterText = params.accountCode
      ? `Akun: ${params.accountCode}`
      : params.accountType
      ? `Tipe: ${params.accountType}`
      : 'Semua Akun';

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'BUKU BESAR',
      reportSubtitle: 'GENERAL LEDGER',
      reportPeriod: `${filterText} | ${this.formatIndonesianDate(params.startDate)} - ${this.formatIndonesianDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'BUKU_BESAR',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = [
      'Tanggal',
      'No. Jurnal',
      'Akun',
      'Deskripsi',
      'Debit',
      'Kredit',
      'Saldo Berjalan',
    ];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data rows
    data.entries.forEach((entry: any) => {
      worksheet.addRow([
        this.formatIndonesianDate(entry.entryDate),
        entry.journalEntry.entryNumber,
        `${entry.accountCode} - ${entry.accountNameId}`,
        entry.journalEntry.descriptionId || entry.journalEntry.description,
        entry.debit,
        entry.credit,
        entry.runningBalance,
      ]);
    });

    // Add summary row
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([
      '',
      '',
      '',
      'TOTAL',
      data.summary.totalDebit,
      data.summary.totalCredit,
      '',
    ]);

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      7,
      'BukuBesar',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [5, 6, 7]);

    // Apply date formatting
    IndonesianExcelFormatter.applyIndonesianDateFormat(worksheet, [1]);

    // Set column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 7);

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ INCOME STATEMENT EXCEL EXPORT ============
  async exportIncomeStatementExcel(params: ExportParams): Promise<Buffer> {
    if (!params.startDate || !params.endDate) {
      throw new Error('startDate and endDate are required for Income Statement export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch income statement data
    const data = await this.financialStatementsService.getIncomeStatement({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
    });

    const worksheet = workbook.addWorksheet('Laporan Laba Rugi');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN LABA RUGI',
      reportSubtitle: 'INCOME STATEMENT',
      reportPeriod: `Periode: ${this.formatIndonesianDate(params.startDate)} - ${this.formatIndonesianDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'LAPORAN_LABA_RUGI',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = ['Keterangan', 'Jumlah (IDR)'];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Revenue section
    worksheet.addRow(['PENDAPATAN (REVENUE)', '']);
    data.revenue.accounts.forEach((account: any) => {
      worksheet.addRow([
        `  ${account.accountCode} - ${account.accountNameId}`,
        account.balance,
      ]);
    });
    const revenueTotalRow = worksheet.rowCount + 1;
    worksheet.addRow(['Total Pendapatan', data.revenue.total]);

    // Empty row
    worksheet.addRow(['', '']);

    // Expenses section
    worksheet.addRow(['BEBAN (EXPENSES)', '']);

    // Group expenses by subtype
    const expensesBySubtype = new Map<string, any[]>();
    data.expenses.accounts.forEach((account: any) => {
      const subtype = account.accountSubType || 'OTHER';
      if (!expensesBySubtype.has(subtype)) {
        expensesBySubtype.set(subtype, []);
      }
      const subtypeArray = expensesBySubtype.get(subtype);
      if (subtypeArray) {
        subtypeArray.push(account);
      }
    });

    expensesBySubtype.forEach((accounts, subtype) => {
      worksheet.addRow([`  ${subtype.replace(/_/g, ' ')}:`, '']);
      accounts.forEach((account: any) => {
        worksheet.addRow([
          `    ${account.accountCode} - ${account.accountNameId}`,
          account.balance,
        ]);
      });
    });

    const expenseTotalRow = worksheet.rowCount + 1;
    worksheet.addRow(['Total Beban', data.expenses.total]);

    // Empty row
    worksheet.addRow(['', '']);

    // Net income
    const netIncomeRow = worksheet.rowCount + 1;
    const netIncomeLabel = data.summary.netIncome >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH';
    worksheet.addRow([netIncomeLabel, Math.abs(data.summary.netIncome)]);
    worksheet.addRow([
      `Margin Laba: ${data.summary.profitMargin.toFixed(2)}%`,
      '',
    ]);

    const summaryRowIndex = netIncomeRow;

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      2,
      'LaporanLabaRugi',
      true,
    );

    // Apply currency formatting to column B
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [2]);

    // Set column widths
    worksheet.getColumn(1).width = 50;
    worksheet.getColumn(2).width = 20;

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ BALANCE SHEET EXCEL EXPORT ============
  async exportBalanceSheetExcel(params: ExportParams): Promise<Buffer> {
    if (!params.endDate) {
      throw new Error('endDate is required for Balance Sheet export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch balance sheet data
    const data = await this.financialStatementsService.getBalanceSheet({
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
    });

    const worksheet = workbook.addWorksheet('Neraca');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'NERACA',
      reportSubtitle: 'BALANCE SHEET',
      reportPeriod: `Per Tanggal: ${this.formatIndonesianDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'LAPORAN_POSISI_KEUANGAN',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers (side by side layout)
    const headers = ['ASET (ASSETS)', 'Jumlah', '', 'KEWAJIBAN & EKUITAS', 'Jumlah'];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Determine max rows between assets and liabilities+equity
    const maxRows = Math.max(
      data.assets.accounts.length,
      data.liabilities.accounts.length + data.equity.accounts.length + 2, // +2 for section headers
    );

    // Add data rows (side by side)
    let assetIndex = 0;
    let liabilityIndex = 0;
    let equityIndex = 0;
    let inEquitySection = false;

    for (let i = 0; i < maxRows + 5; i++) {
      const row: any[] = ['', '', '', '', ''];

      // Left side: Assets
      if (assetIndex < data.assets.accounts.length) {
        const account = data.assets.accounts[assetIndex];
        row[0] = `${account.accountCode} - ${account.accountNameId}`;
        row[1] = account.balance;
        assetIndex++;
      } else if (assetIndex === data.assets.accounts.length) {
        row[0] = 'TOTAL ASET';
        row[1] = data.assets.total;
        assetIndex++;
      }

      // Right side: Liabilities then Equity
      if (liabilityIndex < data.liabilities.accounts.length) {
        const account = data.liabilities.accounts[liabilityIndex];
        row[3] = `${account.accountCode} - ${account.accountNameId}`;
        row[4] = account.balance;
        liabilityIndex++;
      } else if (liabilityIndex === data.liabilities.accounts.length && !inEquitySection) {
        row[3] = 'Total Kewajiban';
        row[4] = data.liabilities.total;
        liabilityIndex++;
      } else if (liabilityIndex === data.liabilities.accounts.length + 1 && !inEquitySection) {
        row[3] = ''; // Empty row
        row[4] = '';
        inEquitySection = true;
        liabilityIndex++;
      } else if (inEquitySection && equityIndex < data.equity.accounts.length) {
        const account = data.equity.accounts[equityIndex];
        row[3] = `${account.accountCode} - ${account.accountNameId}`;
        row[4] = account.balance;
        equityIndex++;
      } else if (inEquitySection && equityIndex === data.equity.accounts.length) {
        row[3] = 'Total Ekuitas';
        row[4] = data.equity.total;
        equityIndex++;
      } else if (inEquitySection && equityIndex === data.equity.accounts.length + 1) {
        row[3] = ''; // Empty row
        row[4] = '';
        equityIndex++;
      } else if (inEquitySection && equityIndex === data.equity.accounts.length + 2) {
        row[3] = 'TOTAL KEWAJIBAN + EKUITAS';
        row[4] = data.summary.liabilitiesAndEquity;
        equityIndex++;
        break; // Last row
      }

      worksheet.addRow(row);
    }

    const summaryRowIndex = worksheet.rowCount;

    // Add balance status
    worksheet.addRow(['', '', '', '', '']);
    const statusText = data.summary.isBalanced ? 'Status: ✓ SEIMBANG' : 'Status: ✗ TIDAK SEIMBANG';
    worksheet.addRow([statusText, '', '', '', '']);

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      5,
      'Neraca',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [2, 5]);

    // Set column widths
    worksheet.getColumn(1).width = 35;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 3; // Spacer
    worksheet.getColumn(4).width = 35;
    worksheet.getColumn(5).width = 18;

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ CASH FLOW STATEMENT EXCEL EXPORT ============
  async exportCashFlowStatementExcel(params: ExportParams): Promise<Buffer> {
    if (!params.startDate || !params.endDate) {
      throw new Error('startDate and endDate are required for Cash Flow Statement export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch cash flow data
    const data = await this.financialStatementsService.getCashFlowStatement({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
    });

    const worksheet = workbook.addWorksheet('Laporan Arus Kas');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN ARUS KAS',
      reportSubtitle: 'CASH FLOW STATEMENT',
      reportPeriod: `Periode: ${this.formatIndonesianDate(params.startDate)} - ${this.formatIndonesianDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'LAPORAN_ARUS_KAS',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = ['Keterangan', 'Jumlah (IDR)'];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Operating activities
    worksheet.addRow(['AKTIVITAS OPERASI', '']);
    data.operatingActivities.transactions.forEach((item: any) => {
      worksheet.addRow([`  ${item.description}`, item.cashIn - item.cashOut]);
    });
    worksheet.addRow(['Kas Bersih dari Aktivitas Operasi', data.operatingActivities.netCashFlow]);

    // Empty row
    worksheet.addRow(['', '']);

    // Investing activities
    worksheet.addRow(['AKTIVITAS INVESTASI', '']);
    data.investingActivities.transactions.forEach((item: any) => {
      worksheet.addRow([`  ${item.description}`, item.cashIn - item.cashOut]);
    });
    worksheet.addRow(['Kas Bersih dari Aktivitas Investasi', data.investingActivities.netCashFlow]);

    // Empty row
    worksheet.addRow(['', '']);

    // Financing activities
    worksheet.addRow(['AKTIVITAS PENDANAAN', '']);
    data.financingActivities.transactions.forEach((item: any) => {
      worksheet.addRow([`  ${item.description}`, item.cashIn - item.cashOut]);
    });
    worksheet.addRow(['Kas Bersih dari Aktivitas Pendanaan', data.financingActivities.netCashFlow]);

    // Empty row
    worksheet.addRow(['', '']);

    // Summary
    worksheet.addRow(['Kenaikan (Penurunan) Kas Bersih', data.summary.netCashFlow]);
    worksheet.addRow(['Saldo Kas Awal Periode', data.summary.openingBalance]);
    worksheet.addRow(['Saldo Kas Akhir Periode', data.summary.closingBalance]);

    const summaryRowIndex = worksheet.rowCount;

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      2,
      'LaporanArusKas',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [2]);

    // Set column widths
    worksheet.getColumn(1).width = 50;
    worksheet.getColumn(2).width = 20;

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ ACCOUNTS RECEIVABLE EXCEL EXPORT ============
  async exportAccountsReceivableExcel(params: ExportParams): Promise<Buffer> {
    if (!params.endDate) {
      throw new Error('endDate is required for Accounts Receivable export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch AR data
    const data = await this.financialStatementsService.getAccountsReceivableReport({
      endDate: new Date(params.endDate),
    });

    const worksheet = workbook.addWorksheet('Laporan Piutang');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN PIUTANG USAHA',
      reportSubtitle: 'ACCOUNTS RECEIVABLE REPORT',
      reportPeriod: `Per Tanggal: ${this.formatIndonesianDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'PIUTANG_USAHA',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = [
      'No.',
      'Nama Client',
      'No. Invoice',
      'Tanggal Invoice',
      'Total Invoice',
      'Terbayar',
      'Saldo Piutang',
      'Status',
    ];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data rows
    let totalInvoiceAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstanding = 0;

    if (data.aging && data.aging.aging) {
      data.aging.aging.forEach((item: any, index: number) => {
        worksheet.addRow([
          index + 1,
          item.clientName,
          item.invoiceNumber,
          this.formatIndonesianDate(item.invoiceDate),
          item.amount,
          0, // paid amount not available in aging
          item.amount,
          item.agingBucket,
        ]);

        totalInvoiceAmount += item.amount;
        totalOutstanding += item.amount;
      });
    }

    // Add summary row
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([
      '',
      '',
      '',
      'TOTAL',
      totalInvoiceAmount,
      totalPaidAmount,
      totalOutstanding,
      '',
    ]);

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      8,
      'LaporanPiutang',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [5, 6, 7]);

    // Apply date formatting
    IndonesianExcelFormatter.applyIndonesianDateFormat(worksheet, [4]);

    // Set column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 8);

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ ACCOUNTS PAYABLE EXCEL EXPORT ============
  async exportAccountsPayableExcel(params: ExportParams): Promise<Buffer> {
    if (!params.endDate) {
      throw new Error('endDate is required for Accounts Payable export');
    }

    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch AP data
    const data = await this.financialStatementsService.getAccountsPayableReport({
      endDate: new Date(params.endDate),
    });

    const worksheet = workbook.addWorksheet('Laporan Hutang');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN HUTANG USAHA',
      reportSubtitle: 'ACCOUNTS PAYABLE REPORT',
      reportPeriod: `Per Tanggal: ${this.formatIndonesianDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'HUTANG_USAHA',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = [
      'No.',
      'Nama Vendor',
      'No. Invoice',
      'Tanggal Invoice',
      'Total Invoice',
      'Terbayar',
      'Saldo Hutang',
      'Status',
    ];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data rows
    let totalInvoiceAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstanding = 0;

    if (data.aging && data.aging.aging) {
      data.aging.aging.forEach((item: any, index: number) => {
        worksheet.addRow([
          index + 1,
          item.categoryName,
          item.expenseNumber,
          this.formatIndonesianDate(item.expenseDate),
          item.amount,
          0, // paid amount not available in aging
          item.amount,
          item.agingBucket,
        ]);

        totalInvoiceAmount += item.amount;
        totalOutstanding += item.amount;
      });
    }

    // Add summary row
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([
      '',
      '',
      '',
      'TOTAL',
      totalInvoiceAmount,
      totalPaidAmount,
      totalOutstanding,
      '',
    ]);

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      8,
      'LaporanHutang',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [5, 6, 7]);

    // Apply date formatting
    IndonesianExcelFormatter.applyIndonesianDateFormat(worksheet, [4]);

    // Set column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 8);

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ AR AGING EXCEL EXPORT ============
  async exportARAgingExcel(params: ExportParams): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch AR aging data
    const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const data = await this.ledgerService.getAccountsReceivableAging(asOfDate);

    const worksheet = workbook.addWorksheet('Aging Piutang');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'AGING PIUTANG USAHA',
      reportSubtitle: 'ACCOUNTS RECEIVABLE AGING',
      reportPeriod: `Per Tanggal: ${this.formatIndonesianDate(asOfDate)}`,
      preparationDate: new Date(),
      reportType: 'AGING_PIUTANG',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = [
      'No.',
      'Nama Client',
      'Current',
      '1-30 Hari',
      '31-60 Hari',
      '61-90 Hari',
      '>90 Hari',
      'Total',
    ];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data rows
    let totalCurrent = 0;
    let total1_30 = 0;
    let total31_60 = 0;
    let total61_90 = 0;
    let totalOver90 = 0;
    let totalAll = 0;

    data.aging.forEach((item: any, index: number) => {
      worksheet.addRow([
        index + 1,
        item.clientName,
        item.current,
        item.days1_30,
        item.days31_60,
        item.days61_90,
        item.over90,
        item.total,
      ]);

      totalCurrent += item.current;
      total1_30 += item.days1_30;
      total31_60 += item.days31_60;
      total61_90 += item.days61_90;
      totalOver90 += item.over90;
      totalAll += item.total;
    });

    // Add summary row
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([
      '',
      'TOTAL',
      totalCurrent,
      total1_30,
      total31_60,
      total61_90,
      totalOver90,
      totalAll,
    ]);

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      8,
      'AgingPiutang',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [3, 4, 5, 6, 7, 8]);

    // Set column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 8);

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============ AP AGING EXCEL EXPORT ============
  async exportAPAgingExcel(params: ExportParams): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const companyInfo = this.getIndonesianCompanyInfo();

    // Fetch AP aging data
    const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const data = await this.ledgerService.getAccountsPayableAging(asOfDate);

    const worksheet = workbook.addWorksheet('Aging Hutang');

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'AGING HUTANG USAHA',
      reportSubtitle: 'ACCOUNTS PAYABLE AGING',
      reportPeriod: `Per Tanggal: ${this.formatIndonesianDate(asOfDate)}`,
      preparationDate: new Date(),
      reportType: 'AGING_HUTANG',
    };

    const dataStartRow = IndonesianExcelFormatter.formatIndonesianLetterhead(
      worksheet,
      companyInfo,
      reportHeader,
    );

    // Add column headers
    const headers = [
      'No.',
      'Nama Vendor',
      'Current',
      '1-30 Hari',
      '31-60 Hari',
      '61-90 Hari',
      '>90 Hari',
      'Total',
    ];
    worksheet.addRow(headers);
    const headerRowIndex = worksheet.rowCount;

    // Add data rows
    let totalCurrent = 0;
    let total1_30 = 0;
    let total31_60 = 0;
    let total61_90 = 0;
    let totalOver90 = 0;
    let totalAll = 0;

    data.aging.forEach((item: any, index: number) => {
      worksheet.addRow([
        index + 1,
        item.vendorName,
        item.current,
        item.days1_30,
        item.days31_60,
        item.days61_90,
        item.over90,
        item.total,
      ]);

      totalCurrent += item.current;
      total1_30 += item.days1_30;
      total31_60 += item.days31_60;
      total61_90 += item.days61_90;
      totalOver90 += item.over90;
      totalAll += item.total;
    });

    // Add summary row
    const summaryRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([
      '',
      'TOTAL',
      totalCurrent,
      total1_30,
      total31_60,
      total61_90,
      totalOver90,
      totalAll,
    ]);

    // Apply table formatting
    IndonesianExcelFormatter.formatIndonesianTable(
      worksheet,
      headerRowIndex,
      summaryRowIndex,
      1,
      8,
      'AgingHutang',
      true,
    );

    // Apply currency formatting
    IndonesianExcelFormatter.applyIndonesianCurrencyFormat(worksheet, [3, 4, 5, 6, 7, 8]);

    // Set column widths
    IndonesianExcelFormatter.setIndonesianColumnWidths(worksheet, 8);

    // Apply page setup
    IndonesianExcelFormatter.applyIndonesianPageSetup(worksheet);

    // Add footer
    IndonesianExcelFormatter.addIndonesianFooter(
      worksheet,
      companyInfo,
      'Sistem Akuntansi Digital',
      'Manajer Keuangan',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
