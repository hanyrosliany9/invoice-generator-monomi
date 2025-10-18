import { Injectable } from '@nestjs/common';
import { IndonesianPdfFormatter, IndonesianCompanyInfo, IndonesianReportHeader, PdfFormattingOptions } from '../../reports/indonesian-pdf-formatter';
import { LedgerService } from './ledger.service';
import { FinancialStatementsService } from './financial-statements.service';

@Injectable()
export class AccountingExportService {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly financialStatementsService: FinancialStatementsService,
  ) {}

  private getCompanyInfo(): IndonesianCompanyInfo {
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

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return IndonesianPdfFormatter.formatIndonesianShortDate(d);
  }

  // ============ TRIAL BALANCE EXPORT ============
  async exportTrialBalancePDF(params: {
    asOfDate: string;
    fiscalPeriodId?: string;
    includeInactive?: boolean;
    includeZeroBalances?: boolean;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.ledgerService.getTrialBalance({
      asOfDate: new Date(params.asOfDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
      includeZeroBalances: params.includeZeroBalances,
    });
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'NERACA SALDO (TRIAL BALANCE)',
      reportSubtitle: 'LAPORAN AKUNTANSI',
      reportPeriod: `Per Tanggal: ${this.formatDate(params.asOfDate)}`,
      preparationDate: new Date(),
      reportType: 'TRIAL_BALANCE',
    };

    const tableHtml = this.generateTrialBalanceTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateTrialBalanceTableHtml(data: any): string {
    const headers = ['Kode Akun', 'Nama Akun', 'Tipe', 'Debit (IDR)', 'Kredit (IDR)', 'Status'];
    const tableData: any[][] = [];

    data.balances.forEach((balance: any) => {
      tableData.push([
        balance.accountCode,
        balance.accountNameId,
        balance.accountType.replace(/_/g, ' '),
        balance.debitBalance > 0 ? balance.debitBalance : '-',
        balance.creditBalance > 0 ? balance.creditBalance : '-',
        balance.isAbnormal ? 'Abnormal' : 'Normal',
      ]);
    });

    const summaryRow = [
      '', '', 'TOTAL',
      data.summary.totalDebit,
      data.summary.totalCredit,
      data.summary.isBalanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'
    ];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      'trialBalance',
      {
        showSummary: true,
        summaryRow,
      },
    );

    return `
      <div class="report-section">
        <p><strong>Jumlah Akun:</strong> ${data.summary.accountCount}</p>
        ${tableHtml}
        ${!data.summary.isBalanced ? `
          <div style="margin-top: 20px; padding: 10px; background-color: #fff2f0; border-left: 4px solid #ff4d4f;">
            <strong>PERINGATAN:</strong> Neraca tidak seimbang. Selisih: ${this.formatCurrency(Math.abs(data.summary.difference))}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ============ INCOME STATEMENT EXPORT ============
  async exportIncomeStatementPDF(params: {
    startDate: string;
    endDate: string;
    fiscalPeriodId?: string;
    includeInactive?: boolean;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.financialStatementsService.getIncomeStatement({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
    });
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN LABA RUGI (INCOME STATEMENT)',
      reportSubtitle: 'LAPORAN KEUANGAN',
      reportPeriod: `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'INCOME_STATEMENT',
    };

    const tableHtml = this.generateIncomeStatementTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateIncomeStatementTableHtml(data: any): string {
    let html = '<div class="report-section">';

    // Revenue Section
    html += '<h3 style="color: #1F4E79; margin-bottom: 15px;">PENDAPATAN (REVENUE)</h3>';
    const revenueHeaders = ['Kode Akun', 'Nama Akun', 'Jumlah (IDR)'];
    const revenueData = data.revenue.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountNameId,
      acc.amount,
    ]);
    revenueData.push(['', 'TOTAL PENDAPATAN', data.revenue.total]);
    html += IndonesianPdfFormatter.generateIndonesianTable(revenueHeaders, revenueData, 'revenue');

    // Expenses Section
    html += '<h3 style="color: #1F4E79; margin-top: 30px; margin-bottom: 15px;">BEBAN (EXPENSES)</h3>';
    const expensesHeaders = ['Kode Akun', 'Nama Akun', 'Sub Tipe', 'Jumlah (IDR)'];
    const expensesData = data.expenses.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountNameId,
      acc.accountSubType,
      acc.amount,
    ]);
    expensesData.push(['', '', 'TOTAL BEBAN', data.expenses.total]);
    html += IndonesianPdfFormatter.generateIndonesianTable(expensesHeaders, expensesData, 'expenses');

    // Summary
    const netIncome = data.summary.netIncome;
    const isProfit = netIncome >= 0;
    html += `
      <div style="margin-top: 30px; padding: 20px; background-color: ${isProfit ? '#f6ffed' : '#fff2f0'}; border: 2px solid ${isProfit ? '#52c41a' : '#ff4d4f'};">
        <h2 style="margin: 0;">${isProfit ? 'LABA BERSIH' : 'RUGI BERSIH'}: ${this.formatCurrency(Math.abs(netIncome))}</h2>
        <p style="margin: 10px 0 0 0;"><strong>Margin Laba:</strong> ${data.summary.profitMargin.toFixed(2)}%</p>
      </div>
    `;

    html += '</div>';
    return html;
  }

  // ============ BALANCE SHEET EXPORT ============
  async exportBalanceSheetPDF(params: {
    endDate: string;
    fiscalPeriodId?: string;
    includeInactive?: boolean;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.financialStatementsService.getBalanceSheet({
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
    });
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'NERACA (BALANCE SHEET)',
      reportSubtitle: 'LAPORAN POSISI KEUANGAN',
      reportPeriod: `Per Tanggal: ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'BALANCE_SHEET',
    };

    const tableHtml = this.generateBalanceSheetTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateBalanceSheetTableHtml(data: any): string {
    let html = '<div class="report-section">';

    // Assets Section
    html += '<h3 style="color: #1F4E79; margin-bottom: 15px;">ASET (ASSETS)</h3>';
    const assetsHeaders = ['Kode Akun', 'Nama Akun', 'Sub Tipe', 'Jumlah (IDR)'];
    const assetsData = data.assets.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountNameId,
      acc.accountSubType,
      acc.balance,
    ]);
    assetsData.push(['', '', 'TOTAL ASET', data.assets.total]);
    html += IndonesianPdfFormatter.generateIndonesianTable(assetsHeaders, assetsData, 'assets');

    // Liabilities Section
    html += '<h3 style="color: #1F4E79; margin-top: 30px; margin-bottom: 15px;">LIABILITAS (LIABILITIES)</h3>';
    const liabilitiesData = data.liabilities.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountNameId,
      acc.accountSubType,
      acc.balance,
    ]);
    liabilitiesData.push(['', '', 'TOTAL LIABILITAS', data.liabilities.total]);
    html += IndonesianPdfFormatter.generateIndonesianTable(assetsHeaders, liabilitiesData, 'liabilities');

    // Equity Section
    html += '<h3 style="color: #1F4E79; margin-top: 30px; margin-bottom: 15px;">EKUITAS (EQUITY)</h3>';
    const equityData = data.equity.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountNameId,
      '',
      acc.balance,
    ]);
    equityData.push(['', '', 'TOTAL EKUITAS', data.equity.total]);
    html += IndonesianPdfFormatter.generateIndonesianTable(assetsHeaders, equityData, 'equity');

    // Summary
    html += `
      <div style="margin-top: 30px; padding: 20px; background-color: ${data.summary.isBalanced ? '#f6ffed' : '#fff2f0'};">
        <h3>RINGKASAN NERACA</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td><strong>Total Aset:</strong></td><td style="text-align: right;"><strong>${this.formatCurrency(data.summary.totalAssets)}</strong></td></tr>
          <tr><td><strong>Total Liabilitas + Ekuitas:</strong></td><td style="text-align: right;"><strong>${this.formatCurrency(data.summary.liabilitiesAndEquity)}</strong></td></tr>
          <tr><td><strong>Status:</strong></td><td style="text-align: right;"><strong>${data.summary.isBalanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'}</strong></td></tr>
        </table>
      </div>
    `;

    html += '</div>';
    return html;
  }

  // ============ CASH FLOW STATEMENT EXPORT ============
  async exportCashFlowStatementPDF(params: {
    startDate: string;
    endDate: string;
    fiscalPeriodId?: string;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.financialStatementsService.getCashFlowStatement({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
    });
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN ARUS KAS (CASH FLOW STATEMENT)',
      reportSubtitle: 'LAPORAN KEUANGAN',
      reportPeriod: `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'CASH_FLOW',
    };

    const tableHtml = this.generateCashFlowStatementTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateCashFlowStatementTableHtml(data: any): string {
    let html = '<div class="report-section">';

    // Operating Activities
    html += '<h3 style="color: #1F4E79; margin-bottom: 15px;">AKTIVITAS OPERASI (Operating Activities)</h3>';
    html += `<p><strong>Arus Kas Bersih:</strong> ${this.formatCurrency(data.operatingActivities.netCashFlow)}</p>`;

    // Investing Activities
    html += '<h3 style="color: #1F4E79; margin-top: 20px; margin-bottom: 15px;">AKTIVITAS INVESTASI (Investing Activities)</h3>';
    html += `<p><strong>Arus Kas Bersih:</strong> ${this.formatCurrency(data.investingActivities.netCashFlow)}</p>`;

    // Financing Activities
    html += '<h3 style="color: #1F4E79; margin-top: 20px; margin-bottom: 15px;">AKTIVITAS PENDANAAN (Financing Activities)</h3>';
    html += `<p><strong>Arus Kas Bersih:</strong> ${this.formatCurrency(data.financingActivities.netCashFlow)}</p>`;

    // Summary
    html += `
      <div style="margin-top: 30px; padding: 20px; background-color: #f0f5ff;">
        <h3>RINGKASAN ARUS KAS</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td>Saldo Awal Kas:</td><td style="text-align: right;">${this.formatCurrency(data.summary.openingBalance)}</td></tr>
          <tr><td>Arus Kas Operasi:</td><td style="text-align: right;">${this.formatCurrency(data.summary.operatingCashFlow)}</td></tr>
          <tr><td>Arus Kas Investasi:</td><td style="text-align: right;">${this.formatCurrency(data.summary.investingCashFlow)}</td></tr>
          <tr><td>Arus Kas Pendanaan:</td><td style="text-align: right;">${this.formatCurrency(data.summary.financingCashFlow)}</td></tr>
          <tr><td><strong>Arus Kas Bersih:</strong></td><td style="text-align: right;"><strong>${this.formatCurrency(data.summary.netCashFlow)}</strong></td></tr>
          <tr><td><strong>Saldo Akhir Kas:</strong></td><td style="text-align: right;"><strong>${this.formatCurrency(data.summary.closingBalance)}</strong></td></tr>
        </table>
      </div>
    `;

    html += '</div>';
    return html;
  }

  // ============ AR AGING EXPORT ============
  async exportARAgingPDF(params: {
    asOfDate?: string;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const date = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const data = await this.ledgerService.getAccountsReceivableAging(date);
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'AGING PIUTANG (AR Aging Report)',
      reportSubtitle: 'ANALISIS UMUR PIUTANG',
      reportPeriod: `Per Tanggal: ${this.formatDate(date)}`,
      preparationDate: new Date(),
      reportType: 'AR_AGING',
    };

    const tableHtml = this.generateARAgingTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateARAgingTableHtml(data: any): string {
    const headers = ['No. Invoice', 'Klien', 'Tgl Invoice', 'Jatuh Tempo', 'Hari Terlambat', 'Kategori Umur', 'Jumlah (IDR)'];
    const tableData: any[][] = [];

    data.aging.forEach((item: any, index: number) => {
      tableData.push([
        item.invoiceNumber,
        item.clientName,
        this.formatDate(item.invoiceDate),
        this.formatDate(item.dueDate),
        item.daysOverdue > 0 ? `${item.daysOverdue} hari` : 'Belum jatuh tempo',
        item.agingBucket,
        item.amount,
      ]);
    });

    const summaryRow = ['', '', '', '', '', 'TOTAL', data.summary.totalAR];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      'arAging',
      {
        showSummary: true,
        summaryRow,
      },
    );

    return `
      <div class="report-section">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="padding: 10px; background-color: #f6ffed; border-left: 4px solid #52c41a;">
            <strong>Belum Jatuh Tempo:</strong><br>${this.formatCurrency(data.summary.current)}
          </div>
          <div style="padding: 10px; background-color: #fff7e6; border-left: 4px solid #faad14;">
            <strong>1-30 Hari:</strong><br>${this.formatCurrency(data.summary.days1to30)}
          </div>
          <div style="padding: 10px; background-color: #fff2f0; border-left: 4px solid #ff4d4f;">
            <strong>Lebih dari 90 Hari:</strong><br>${this.formatCurrency(data.summary.over90)}
          </div>
        </div>
        ${tableHtml}
      </div>
    `;
  }

  // ============ AP AGING EXPORT ============
  async exportAPAgingPDF(params: {
    asOfDate?: string;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const date = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const data = await this.ledgerService.getAccountsPayableAging(date);
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'AGING HUTANG (AP Aging Report)',
      reportSubtitle: 'ANALISIS UMUR HUTANG',
      reportPeriod: `Per Tanggal: ${this.formatDate(date)}`,
      preparationDate: new Date(),
      reportType: 'AP_AGING',
    };

    const tableHtml = this.generateAPAgingTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateAPAgingTableHtml(data: any): string {
    const headers = ['Vendor', 'Tgl Tagihan', 'Jatuh Tempo', 'Hari Terlambat', 'Kategori Umur', 'Jumlah (IDR)'];
    const tableData: any[][] = [];

    data.aging.forEach((item: any) => {
      tableData.push([
        item.vendorName || item.description,
        this.formatDate(item.billDate),
        this.formatDate(item.dueDate),
        item.daysOverdue > 0 ? `${item.daysOverdue} hari` : 'Belum jatuh tempo',
        item.agingBucket,
        item.amount,
      ]);
    });

    const summaryRow = ['', '', '', '', 'TOTAL', data.summary.totalAP];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      'apAging',
      {
        showSummary: true,
        summaryRow,
      },
    );

    return `
      <div class="report-section">
        ${tableHtml}
      </div>
    `;
  }

  // ============ ACCOUNTS RECEIVABLE REPORT EXPORT ============
  async exportAccountsReceivablePDF(params: {
    endDate: string;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.financialStatementsService.getAccountsReceivableReport({
      endDate: new Date(params.endDate),
    });
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN PIUTANG (Accounts Receivable)',
      reportSubtitle: 'LAPORAN KEUANGAN',
      reportPeriod: `Per Tanggal: ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'ACCOUNTS_RECEIVABLE',
    };

    const tableHtml = this.generateAccountsReceivableTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateAccountsReceivableTableHtml(data: any): string {
    const headers = ['No. Invoice', 'Klien', 'Tgl Invoice', 'Status', 'Jumlah (IDR)', 'Saldo (IDR)'];
    const tableData: any[][] = [];
    let totalAmount = 0;
    let totalOutstanding = 0;

    data.receivables.forEach((item: any) => {
      tableData.push([
        item.invoiceNumber,
        item.clientName,
        this.formatDate(item.invoiceDate),
        item.status,
        item.amount,
        item.outstanding,
      ]);
      totalAmount += item.amount;
      totalOutstanding += item.outstanding;
    });

    const summaryRow = ['', '', '', 'TOTAL', totalAmount, totalOutstanding];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      'accountsReceivable',
      {
        showSummary: true,
        summaryRow,
      },
    );

    return `
      <div class="report-section">
        <p><strong>Total Piutang Belum Terbayar:</strong> ${this.formatCurrency(data.summary?.totalOutstanding || totalOutstanding)}</p>
        ${tableHtml}
      </div>
    `;
  }

  // ============ ACCOUNTS PAYABLE REPORT EXPORT ============
  async exportAccountsPayablePDF(params: {
    endDate: string;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.financialStatementsService.getAccountsPayableReport({
      endDate: new Date(params.endDate),
    });
    const companyInfo = this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'LAPORAN HUTANG (Accounts Payable)',
      reportSubtitle: 'LAPORAN KEUANGAN',
      reportPeriod: `Per Tanggal: ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: 'ACCOUNTS_PAYABLE',
    };

    const tableHtml = this.generateAccountsPayableTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateAccountsPayableTableHtml(data: any): string {
    const headers = ['Vendor/Deskripsi', 'Tgl Tagihan', 'Status', 'Jumlah (IDR)', 'Saldo (IDR)'];
    const tableData: any[][] = [];
    let totalAmount = 0;
    let totalOutstanding = 0;

    data.payables.forEach((item: any) => {
      tableData.push([
        item.vendorName || item.description,
        this.formatDate(item.billDate),
        item.status,
        item.amount,
        item.outstanding,
      ]);
      totalAmount += item.amount;
      totalOutstanding += item.outstanding;
    });

    const summaryRow = ['', '', 'TOTAL', totalAmount, totalOutstanding];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      'accountsPayable',
      {
        showSummary: true,
        summaryRow,
      },
    );

    return `
      <div class="report-section">
        <p><strong>Total Hutang Belum Terbayar:</strong> ${this.formatCurrency(data.summary?.totalOutstanding || totalOutstanding)}</p>
        ${tableHtml}
      </div>
    `;
  }

  // ============ GENERAL LEDGER EXPORT ============
  async exportGeneralLedgerPDF(params: {
    accountCode?: string;
    accountType?: string;
    startDate?: string;
    endDate?: string;
    fiscalPeriodId?: string;
    includeInactive?: boolean;
  }, options: PdfFormattingOptions = {}): Promise<Buffer> {
    const data = await this.ledgerService.getGeneralLedger({
      accountCode: params.accountCode,
      accountType: params.accountType as any,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
    });
    const companyInfo = this.getCompanyInfo();

    const periodText = params.startDate && params.endDate
      ? `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`
      : 'Semua Periode';

    const reportHeader: IndonesianReportHeader = {
      reportTitle: 'BUKU BESAR (GENERAL LEDGER)',
      reportSubtitle: 'CATATAN TRANSAKSI AKUNTANSI',
      reportPeriod: periodText,
      preparationDate: new Date(),
      reportType: 'GENERAL_LEDGER',
    };

    const tableHtml = this.generateGeneralLedgerTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateGeneralLedgerTableHtml(data: any): string {
    let html = '<div class="report-section">';

    // Group entries by account
    const accountGroups = new Map<string, any[]>();
    data.entries.forEach((entry: any) => {
      const key = `${entry.accountCode}-${entry.accountName}`;
      if (!accountGroups.has(key)) {
        accountGroups.set(key, []);
      }
      accountGroups.get(key)!.push(entry);
    });

    // Generate table for each account
    accountGroups.forEach((entries, accountKey) => {
      const [accountCode, accountName] = accountKey.split('-');

      html += `<h3 style="color: #1F4E79; margin-top: 20px;">${accountCode} - ${accountName}</h3>`;

      const headers = ['Tanggal', 'No. Jurnal', 'Deskripsi', 'Debit (IDR)', 'Kredit (IDR)', 'Saldo (IDR)'];
      const tableData: any[][] = [];

      entries.forEach((entry: any) => {
        tableData.push([
          this.formatDate(entry.entryDate),
          entry.entryNumber,
          entry.description,
          entry.debitAmount > 0 ? entry.debitAmount : '-',
          entry.creditAmount > 0 ? entry.creditAmount : '-',
          entry.runningBalance,
        ]);
      });

      html += IndonesianPdfFormatter.generateIndonesianTable(headers, tableData, `ledger-${accountCode}`);
    });

    html += '</div>';
    return html;
  }
}
