import { Injectable } from "@nestjs/common";
import {
  IndonesianPdfFormatter,
  IndonesianCompanyInfo,
  IndonesianReportHeader,
  PdfFormattingOptions,
} from "../../reports/indonesian-pdf-formatter";
import { LedgerService } from "./ledger.service";
import { FinancialStatementsService } from "./financial-statements.service";
import { JournalService } from "./journal.service";
import { CashBankBalanceService } from "./cash-bank-balance.service";
import { DepreciationService } from "./depreciation.service";
import { CompanySettingsService } from "../../company/company-settings.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Sum a journal entry's line items on the given side. JournalEntry rows have no
 * totalDebit/totalCredit column — the amounts live on lineItems. getJournalEntries
 * exposes both `debit`/`credit` (Prisma Decimal) and `debitAmount`/`creditAmount`
 * (number); this reads whichever is present.
 */
function sumLineItems(
  lineItems: any[] | undefined,
  side: "debit" | "credit",
): number {
  if (!Array.isArray(lineItems)) return 0;
  const amountKey = side === "debit" ? "debitAmount" : "creditAmount";
  return lineItems.reduce(
    (sum, li) => sum + (Number(li?.[amountKey] ?? li?.[side]) || 0),
    0,
  );
}

@Injectable()
export class AccountingExportService {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly financialStatementsService: FinancialStatementsService,
    private readonly journalService: JournalService,
    private readonly cashBankBalanceService: CashBankBalanceService,
    private readonly depreciationService: DepreciationService,
    private readonly companySettings: CompanySettingsService,
    private readonly prisma: PrismaService,
  ) {}

  private async getCompanyInfo(): Promise<IndonesianCompanyInfo> {
    return await this.companySettings.getCompanyInfo();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private formatDate(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return IndonesianPdfFormatter.formatIndonesianShortDate(d);
  }

  // ============ TRIAL BALANCE EXPORT ============
  async exportTrialBalancePDF(
    params: {
      startDate?: string | null;
      endDate: string;
      fiscalPeriodId?: string;
      includeInactive?: boolean;
      includeZeroBalances?: boolean;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.ledgerService.getTrialBalance({
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
      includeZeroBalances: params.includeZeroBalances,
    });
    const companyInfo = await this.getCompanyInfo();

    const reportPeriod = params.startDate
      ? `Periode: ${this.formatDate(params.startDate)} s/d ${this.formatDate(params.endDate)}`
      : `Per Tanggal: ${this.formatDate(params.endDate)}`;

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "NERACA SALDO (TRIAL BALANCE)",
      reportSubtitle: "LAPORAN AKUNTANSI",
      reportPeriod,
      preparationDate: new Date(),
      reportType: "TRIAL_BALANCE",
    };

    const tableHtml = this.generateTrialBalanceTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateTrialBalanceTableHtml(data: any): string {
    const headers = [
      "Kode Akun",
      "Nama Akun",
      "Tipe",
      "Debit (IDR)",
      "Kredit (IDR)",
      "Status",
    ];
    const tableData: any[][] = [];

    data.balances.forEach((balance: any) => {
      tableData.push([
        balance.accountCode,
        balance.accountNameId,
        balance.accountType.replace(/_/g, " "),
        balance.debitBalance > 0 ? balance.debitBalance : "-",
        balance.creditBalance > 0 ? balance.creditBalance : "-",
        balance.isAbnormal ? "Abnormal" : "Normal",
      ]);
    });

    const summaryRow = [
      "",
      "",
      "TOTAL",
      data.summary.totalDebit,
      data.summary.totalCredit,
      data.summary.isBalanced ? "SEIMBANG" : "TIDAK SEIMBANG",
    ];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "trialBalance",
      {
        showSummary: true,
        summaryRow,
      },
    );

    return `
      <div class="report-section">
        <p><strong>Jumlah Akun:</strong> ${data.summary.accountCount}</p>
        ${tableHtml}
        ${
          !data.summary.isBalanced
            ? `
          <div style="margin-top: 20px; padding: 10px; background-color: #fff2f0; border-left: 4px solid #ff4d4f;">
            <strong>PERINGATAN:</strong> Neraca tidak seimbang. Selisih: ${this.formatCurrency(Math.abs(data.summary.difference))}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  // ============ INCOME STATEMENT EXPORT ============
  async exportIncomeStatementPDF(
    params: {
      startDate: string;
      endDate: string;
      fiscalPeriodId?: string;
      includeInactive?: boolean;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.financialStatementsService.getIncomeStatement({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
    });
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN LABA RUGI (INCOME STATEMENT)",
      reportSubtitle: "LAPORAN KEUANGAN",
      reportPeriod: `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: "INCOME_STATEMENT",
    };

    const tableHtml = this.generateIncomeStatementTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateIncomeStatementTableHtml(data: any): string {
    // Conventional single-step income statement (laporan laba rugi) — a vertical
    // list of accounts with amounts in a right-hand column, NOT a generic data
    // table. Amount field is `balance` (the old code read `amount` → undefined).
    const line = (label: string, amount: number, indent = true) => `
      <tr>
        <td style="padding: 3px 0 3px ${indent ? 18 : 0}px;">${label}</td>
        <td style="padding: 3px 0; text-align: right; white-space: nowrap;">${this.formatCurrency(Number(amount) || 0)}</td>
      </tr>`;
    const sectionHeader = (label: string) => `
      <tr><td colspan="2" style="padding: 14px 0 4px; font-weight: bold; color: #1F4E79;">${label}</td></tr>`;
    const totalRow = (label: string, amount: number) => `
      <tr>
        <td style="padding: 6px 0; font-weight: bold; border-top: 1px solid #888;">${label}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; border-top: 1px solid #888; white-space: nowrap;">${this.formatCurrency(Number(amount) || 0)}</td>
      </tr>`;

    const revenueRows = (data.revenue.accounts || [])
      .map((acc: any) => line(`${acc.accountCode} — ${acc.accountNameId}`, acc.balance))
      .join("");
    const expenseRows = (data.expenses.accounts || [])
      .map((acc: any) => line(`${acc.accountCode} — ${acc.accountNameId}`, acc.balance))
      .join("");

    const netIncome = Number(data.summary.netIncome) || 0;
    const isProfit = netIncome >= 0;
    const margin = Number(data.summary.profitMargin) || 0;

    return `
      <div class="report-section">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${sectionHeader("PENDAPATAN")}
          ${revenueRows}
          ${totalRow("Total Pendapatan", data.revenue.total)}
          ${sectionHeader("BEBAN")}
          ${expenseRows}
          ${totalRow("Total Beban", data.expenses.total)}
          <tr>
            <td style="padding: 10px 0; font-weight: bold; font-size: 15px; border-top: 2px solid #1F4E79;">
              ${isProfit ? "LABA BERSIH" : "RUGI BERSIH"}
            </td>
            <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 15px; border-top: 2px solid #1F4E79; white-space: nowrap; color: ${isProfit ? "#237804" : "#a8071a"};">
              ${this.formatCurrency(Math.abs(netIncome))}
            </td>
          </tr>
        </table>
        <p style="margin: 12px 0 0; font-size: 12px;"><strong>Margin Laba:</strong> ${margin.toFixed(2)}%</p>
      </div>
    `;
  }

  // ============ BALANCE SHEET EXPORT ============
  async exportBalanceSheetPDF(
    params: {
      endDate: string;
      fiscalPeriodId?: string;
      includeInactive?: boolean;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.financialStatementsService.getBalanceSheet({
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
    });
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "NERACA (BALANCE SHEET)",
      reportSubtitle: "LAPORAN POSISI KEUANGAN",
      reportPeriod: `Per Tanggal: ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: "BALANCE_SHEET",
    };

    const tableHtml = this.generateBalanceSheetTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateBalanceSheetTableHtml(data: any): string {
    // Classic T-account balance sheet (neraca bentuk T): ASET on the left,
    // LIABILITAS + EKUITAS on the right, account name + amount only (no "Sub Tipe").
    const acctLine = (acc: any) => `
      <tr>
        <td style="padding: 3px 0;">${acc.accountCode} — ${acc.accountNameId}</td>
        <td style="padding: 3px 0; text-align: right; white-space: nowrap;">${this.formatCurrency(Number(acc.balance) || 0)}</td>
      </tr>`;
    const subHeader = (label: string) => `
      <tr><td colspan="2" style="padding: 10px 0 4px; font-weight: bold; color: #1F4E79;">${label}</td></tr>`;
    const sideTotal = (label: string, amount: number) => `
      <tr>
        <td style="padding: 6px 0; font-weight: bold; border-top: 2px solid #1F4E79;">${label}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; border-top: 2px solid #1F4E79; white-space: nowrap;">${this.formatCurrency(Number(amount) || 0)}</td>
      </tr>`;

    const assetRows = (data.assets.accounts || []).map(acctLine).join("");
    const liabilityRows = (data.liabilities.accounts || []).map(acctLine).join("");
    const equityRows = (data.equity.accounts || []).map(acctLine).join("");

    const sideStyle =
      'width: 50%; vertical-align: top; padding: 0 14px; font-size: 12px;';
    const innerTable = (rows: string) =>
      `<table style="width: 100%; border-collapse: collapse;">${rows}</table>`;

    return `
      <div class="report-section">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="${sideStyle} border-right: 2px solid #1F4E79;">
              <div style="font-weight: bold; font-size: 14px; color: #1F4E79; border-bottom: 1px solid #1F4E79; padding-bottom: 4px; margin-bottom: 4px;">ASET</div>
              ${innerTable(assetRows + sideTotal("TOTAL ASET", data.assets.total))}
            </td>
            <td style="${sideStyle}">
              <div style="font-weight: bold; font-size: 14px; color: #1F4E79; border-bottom: 1px solid #1F4E79; padding-bottom: 4px; margin-bottom: 4px;">LIABILITAS &amp; EKUITAS</div>
              ${innerTable(
                subHeader("LIABILITAS") +
                  liabilityRows +
                  subHeader("EKUITAS") +
                  equityRows +
                  sideTotal(
                    "TOTAL LIABILITAS &amp; EKUITAS",
                    data.summary.liabilitiesAndEquity,
                  ),
              )}
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; text-align: center; font-weight: bold; color: ${data.summary.isBalanced ? "#237804" : "#a8071a"};">
          ${data.summary.isBalanced ? "✓ NERACA SEIMBANG" : "✗ NERACA TIDAK SEIMBANG — Selisih: " + this.formatCurrency(Math.abs(Number(data.summary.difference) || 0))}
        </p>
      </div>
    `;
  }

  // ============ CASH FLOW STATEMENT EXPORT ============
  async exportCashFlowStatementPDF(
    params: {
      startDate: string;
      endDate: string;
      fiscalPeriodId?: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.financialStatementsService.getCashFlowStatement({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      fiscalPeriodId: params.fiscalPeriodId,
    });
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN ARUS KAS (CASH FLOW STATEMENT)",
      reportSubtitle: "LAPORAN KEUANGAN",
      reportPeriod: `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: "CASH_FLOW",
    };

    const tableHtml = this.generateCashFlowStatementTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateCashFlowStatementTableHtml(data: any): string {
    // One detail table per activity (date / ref / description / in / out / net),
    // then the overall summary — the old version only printed each activity's net.
    const activitySection = (title: string, activity: any): string => {
      const txns: any[] = activity?.transactions || [];
      const rows = txns
        .map(
          (t) => `
        <tr>
          <td style="padding: 3px 6px;">${this.formatDate(t.date)}</td>
          <td style="padding: 3px 6px;">${t.entryNumber || "-"}</td>
          <td style="padding: 3px 6px;">${t.descriptionId || t.description || "-"}</td>
          <td style="padding: 3px 6px; text-align: right; white-space: nowrap;">${Number(t.cashIn) > 0 ? this.formatCurrency(Number(t.cashIn)) : "-"}</td>
          <td style="padding: 3px 6px; text-align: right; white-space: nowrap;">${Number(t.cashOut) > 0 ? this.formatCurrency(Number(t.cashOut)) : "-"}</td>
          <td style="padding: 3px 6px; text-align: right; white-space: nowrap;">${this.formatCurrency(Number(t.netCashFlow) || 0)}</td>
        </tr>`,
        )
        .join("");
      const body =
        rows ||
        '<tr><td colspan="6" style="padding: 6px; text-align: center; color: #888;">Tidak ada transaksi</td></tr>';
      return `
        <h3 style="color: #1F4E79; margin-top: 20px; margin-bottom: 8px;">${title}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #1F4E79; color: #1F4E79;">
              <th style="padding: 4px 6px; text-align: left;">Tanggal</th>
              <th style="padding: 4px 6px; text-align: left;">No. Jurnal</th>
              <th style="padding: 4px 6px; text-align: left;">Deskripsi</th>
              <th style="padding: 4px 6px; text-align: right;">Kas Masuk</th>
              <th style="padding: 4px 6px; text-align: right;">Kas Keluar</th>
              <th style="padding: 4px 6px; text-align: right;">Bersih</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
          <tfoot>
            <tr style="border-top: 1px solid #888; font-weight: bold;">
              <td colspan="5" style="padding: 5px 6px;">Arus Kas Bersih</td>
              <td style="padding: 5px 6px; text-align: right; white-space: nowrap;">${this.formatCurrency(Number(activity?.netCashFlow) || 0)}</td>
            </tr>
          </tfoot>
        </table>`;
    };

    let html = '<div class="report-section">';
    html += activitySection(
      "AKTIVITAS OPERASI (Operating Activities)",
      data.operatingActivities,
    );
    html += activitySection(
      "AKTIVITAS INVESTASI (Investing Activities)",
      data.investingActivities,
    );
    html += activitySection(
      "AKTIVITAS PENDANAAN (Financing Activities)",
      data.financingActivities,
    );

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

    html += "</div>";
    return html;
  }

  // ============ AR AGING EXPORT ============
  async exportARAgingPDF(
    params: {
      asOfDate?: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const date = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const data = await this.ledgerService.getAccountsReceivableAging(date);
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "AGING PIUTANG (AR Aging Report)",
      reportSubtitle: "ANALISIS UMUR PIUTANG",
      reportPeriod: `Per Tanggal: ${this.formatDate(date)}`,
      preparationDate: new Date(),
      reportType: "AR_AGING",
    };

    const tableHtml = this.generateARAgingTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateARAgingTableHtml(data: any): string {
    const headers = [
      "No. Invoice",
      "Klien",
      "Tgl Invoice",
      "Jatuh Tempo",
      "Hari Terlambat",
      "Kategori Umur",
      "Jumlah (IDR)",
    ];
    const tableData: any[][] = [];

    data.aging.forEach((item: any, index: number) => {
      tableData.push([
        item.invoiceNumber,
        item.client?.name || "Unknown",
        this.formatDate(item.invoiceDate),
        this.formatDate(item.dueDate),
        item.daysOverdue > 0 ? `${item.daysOverdue} hari` : "Belum jatuh tempo",
        item.agingBucket,
        item.amount,
      ]);
    });

    const summaryRow = ["", "", "", "", "", "TOTAL", data.summary.totalAR];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "arAging",
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
  async exportAPAgingPDF(
    params: {
      asOfDate?: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const date = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const data = await this.ledgerService.getAccountsPayableAging(date);
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "AGING HUTANG (AP Aging Report)",
      reportSubtitle: "ANALISIS UMUR HUTANG",
      reportPeriod: `Per Tanggal: ${this.formatDate(date)}`,
      preparationDate: new Date(),
      reportType: "AP_AGING",
    };

    const tableHtml = this.generateAPAgingTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateAPAgingTableHtml(data: any): string {
    const headers = [
      "Nama Vendor",
      "Deskripsi",
      "No. Purchase",
      "Tgl",
      "Jatuh Tempo",
      "Hari Terlambat",
      "Kategori Umur",
      "Jumlah (IDR)",
    ];
    const tableData: any[][] = [];

    data.aging.forEach((item: any) => {
      tableData.push([
        item.vendorName || "-",
        item.description || "-",
        item.purchaseNumber || item.reference || "-",
        this.formatDate(item.expenseDate),
        this.formatDate(item.dueDate),
        item.daysOverdue > 0 ? `${item.daysOverdue} hari` : "Belum jatuh tempo",
        item.agingBucket,
        item.amount,
      ]);
    });

    const summaryRow = ["", "", "", "", "", "", "TOTAL", data.summary.totalAP];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "apAging",
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
  async exportAccountsReceivablePDF(
    params: {
      endDate: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data =
      await this.financialStatementsService.getAccountsReceivableReport({
        endDate: new Date(params.endDate),
      });
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN PIUTANG (Accounts Receivable)",
      reportSubtitle: "LAPORAN KEUANGAN",
      reportPeriod: `Per Tanggal: ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: "ACCOUNTS_RECEIVABLE",
    };

    const tableHtml = this.generateAccountsReceivableTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateAccountsReceivableTableHtml(data: any): string {
    const headers = [
      "No. Invoice",
      "Klien",
      "Tgl Invoice",
      "Umur (Hari)",
      "Jumlah (IDR)",
      "Piutang Bersih (IDR)",
    ];
    const tableData: any[][] = [];
    let totalAmount = 0;
    let totalOutstanding = 0;

    // Access the aging data from data.aging.aging array
    const receivables = data.aging?.aging || [];

    receivables.forEach((item: any) => {
      tableData.push([
        item.invoiceNumber,
        item.client?.name || "Unknown",
        this.formatDate(item.invoiceDate),
        item.daysOverdue >= 0
          ? `${item.daysOverdue} hari`
          : "Belum jatuh tempo",
        item.amount,
        item.netReceivable,
      ]);
      totalAmount += Number(item.amount);
      totalOutstanding += Number(item.netReceivable);
    });

    const summaryRow = ["", "", "", "TOTAL", totalAmount, totalOutstanding];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "accountsReceivable",
      {
        showSummary: true,
        summaryRow,
      },
    );

    // ── Other Receivables (Piutang Lain-lain, 1-2040) ──────────────────────────
    // Reimbursable pass-through expenses recoverable from clients — reported as a
    // SEPARATE section from trade AR (was missing entirely before).
    const orItems: any[] = data.otherReceivables?.items ?? [];
    let otherHtml = "";
    if (orItems.length) {
      const orHeaders = [
        "No. Bukti",
        "Klien",
        "Deskripsi",
        "Tgl",
        "Jumlah (IDR)",
        "Status",
      ];
      let orTotal = 0;
      const orData = orItems.map((it: any) => {
        const amount = Number(it.amount) || 0;
        orTotal += amount;
        const status = it.collected
          ? "Sudah Direimburse"
          : it.posted
            ? "Outstanding"
            : "Belum Ditagih";
        return [
          it.expenseNumber || "-",
          it.client?.name || "-",
          it.description || "-",
          this.formatDate(it.date),
          amount,
          status,
        ];
      });
      const orSummary = ["", "", "", "TOTAL", orTotal, ""];
      otherHtml = `
        <h3 style="color: #1F4E79; margin-top: 28px;">PIUTANG LAIN-LAIN (Other Receivables — 1-2040)</h3>
        ${IndonesianPdfFormatter.generateIndonesianTable(orHeaders, orData, "otherReceivables", { showSummary: true, summaryRow: orSummary })}
      `;
    }

    return `
      <div class="report-section">
        <h3 style="color: #1F4E79;">PIUTANG USAHA (Trade Receivables — 1-2010)</h3>
        <p><strong>Total Piutang Belum Terbayar:</strong> ${this.formatCurrency(data.summary?.totalOutstanding || totalOutstanding)}</p>
        ${tableHtml}
        ${otherHtml}
      </div>
    `;
  }

  // ============ ACCOUNTS PAYABLE REPORT EXPORT ============
  async exportAccountsPayablePDF(
    params: {
      endDate: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.financialStatementsService.getAccountsPayableReport(
      {
        endDate: new Date(params.endDate),
      },
    );
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN HUTANG (Accounts Payable)",
      reportSubtitle: "LAPORAN KEUANGAN",
      reportPeriod: `Per Tanggal: ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: "ACCOUNTS_PAYABLE",
    };

    const tableHtml = this.generateAccountsPayableTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateAccountsPayableTableHtml(data: any): string {
    const headers = [
      "Nama Vendor",
      "Deskripsi",
      "No. Purchase",
      "Tanggal",
      "Total (IDR)",
      "Terbayar (IDR)",
      "Saldo (IDR)",
    ];
    const tableData: any[][] = [];
    let totalAmount = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    // Access the aging data from data.aging.aging array
    const payables = data.aging?.aging || [];

    payables.forEach((item: any) => {
      // Vendor and description are separate; the document ref is a purchase/JE
      // number; paid is derived from outstanding (not hard-coded).
      const amount = Number(item.amount) || 0;
      const outstanding = Number(item.outstanding ?? item.amount) || 0;
      const paid = Math.max(0, amount - outstanding);
      tableData.push([
        item.vendorName || "-",
        item.description || "-",
        item.purchaseNumber || item.reference || "-",
        this.formatDate(item.expenseDate),
        amount,
        paid,
        outstanding,
      ]);
      totalAmount += amount;
      totalPaid += paid;
      totalOutstanding += outstanding;
    });

    const summaryRow = ["", "", "", "TOTAL", totalAmount, totalPaid, totalOutstanding];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "accountsPayable",
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
  async exportGeneralLedgerPDF(
    params: {
      accountCode?: string;
      accountType?: string;
      startDate?: string;
      endDate?: string;
      fiscalPeriodId?: string;
      includeInactive?: boolean;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.ledgerService.getGeneralLedger({
      accountCode: params.accountCode,
      accountType: params.accountType as any,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
    });
    const companyInfo = await this.getCompanyInfo();

    const periodText =
      params.startDate && params.endDate
        ? `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`
        : "Semua Periode";

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "BUKU BESAR (GENERAL LEDGER)",
      reportSubtitle: "CATATAN TRANSAKSI AKUNTANSI",
      reportPeriod: periodText,
      preparationDate: new Date(),
      reportType: "GENERAL_LEDGER",
    };

    const tableHtml = this.generateGeneralLedgerTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  private generateGeneralLedgerTableHtml(data: any): string {
    let html = '<div class="report-section">';

    // Group entries by account. Key on accountCode alone — codes contain "-"
    // (e.g. "1-1010"), so the old `code-name` key + split("-") mangled both.
    const accountGroups = new Map<
      string,
      { code: string; name: string; entries: any[] }
    >();
    data.entries.forEach((entry: any) => {
      const code = entry.accountCode;
      if (!accountGroups.has(code)) {
        accountGroups.set(code, {
          code,
          name: entry.accountNameId || entry.accountName || "",
          entries: [],
        });
      }
      accountGroups.get(code)!.entries.push(entry);
    });

    // Generate table for each account
    accountGroups.forEach(({ code, name, entries }) => {
      html += `<h3 style="color: #1F4E79; margin-top: 20px;">${code} - ${name}</h3>`;

      const headers = [
        "Tanggal",
        "No. Jurnal",
        "Deskripsi",
        "Debit (IDR)",
        "Kredit (IDR)",
        "Saldo (IDR)",
      ];
      const tableData: any[][] = [];

      entries.forEach((entry: any) => {
        // The GL row exposes the journal via `journalEntry`, and amounts on
        // `debit`/`credit` (Prisma Decimal). The old code read `entry.entryNumber`
        // (undefined) and `entry.debitAmount`/`creditAmount` (undefined → zero).
        const debit = Number(entry.debit) || 0;
        const credit = Number(entry.credit) || 0;
        tableData.push([
          this.formatDate(entry.entryDate),
          entry.journalEntry?.entryNumber || entry.journalEntryNumber || "-",
          entry.journalEntry?.descriptionId ||
            entry.journalEntry?.description ||
            entry.description ||
            "-",
          debit > 0 ? debit : "-",
          credit > 0 ? credit : "-",
          Number(entry.runningBalance) || 0,
        ]);
      });

      html += IndonesianPdfFormatter.generateIndonesianTable(
        headers,
        tableData,
        `ledger-${code}`,
      );
    });

    html += "</div>";
    return html;
  }

  // ============ JOURNAL ENTRIES EXPORT ============
  async exportJournalEntriesPDF(
    params: {
      startDate?: string;
      endDate?: string;
      transactionType?: string;
      status?: string;
      search?: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const result = await this.journalService.getJournalEntries({
      page: 1,
      limit: 1000,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      transactionType: params.transactionType,
      status: params.status as any,
      search: params.search,
      sortBy: "entryDate",
      sortOrder: "desc",
    });
    const companyInfo = await this.getCompanyInfo();

    const periodText =
      params.startDate && params.endDate
        ? `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`
        : params.startDate
          ? `Mulai: ${this.formatDate(params.startDate)}`
          : params.endDate
            ? `s/d: ${this.formatDate(params.endDate)}`
            : "Semua Periode";

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "JURNAL UMUM / JOURNAL ENTRIES",
      reportSubtitle: "CATATAN TRANSAKSI AKUNTANSI",
      reportPeriod: periodText,
      preparationDate: new Date(),
      reportType: "JOURNAL_ENTRIES",
    };

    const tableHtml = this.generateJournalEntriesTableHtml(result.data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateJournalEntriesTableHtml(entries: any[]): string {
    const headers = [
      "No. Jurnal",
      "Tanggal",
      "Tipe",
      "Deskripsi",
      "Debit (IDR)",
      "Kredit (IDR)",
      "Status",
    ];
    const tableData: any[][] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach((entry: any) => {
      // JournalEntry has no totalDebit/totalCredit column — the amounts live on
      // the line items. Sum them (a balanced entry's debit total == credit total).
      const debit = sumLineItems(entry.lineItems, "debit");
      const credit = sumLineItems(entry.lineItems, "credit");
      totalDebit += debit;
      totalCredit += credit;
      tableData.push([
        entry.entryNumber,
        this.formatDate(entry.entryDate),
        (entry.transactionType || "").replace(/_/g, " "),
        entry.descriptionId || entry.description || "-",
        debit > 0 ? debit : "-",
        credit > 0 ? credit : "-",
        entry.status || "-",
      ]);
    });

    const summaryRow = ["", "", "", "TOTAL", totalDebit, totalCredit, ""];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "journalEntries",
      { showSummary: true, summaryRow },
    );

    return `<div class="report-section">${tableHtml}</div>`;
  }

  // ============ CASH & BANK BALANCES EXPORT ============
  async exportCashBankBalancesPDF(
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const result = await this.cashBankBalanceService.findAll({
      limit: 500,
      page: 1,
      sortBy: "periodDate",
      sortOrder: "desc",
    });
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "SALDO KAS & BANK / CASH & BANK BALANCES",
      reportSubtitle: "LAPORAN POSISI KAS DAN BANK",
      reportPeriod: `Per Tanggal: ${this.formatDate(new Date())}`,
      preparationDate: new Date(),
      reportType: "CASH_BANK_BALANCES",
    };

    const mutations = await this.cashBankBalanceService.getMutations();
    const tableHtml = this.generateCashBankBalancesTableHtml(
      result.data,
      mutations,
    );
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateCashBankBalancesTableHtml(
    rows: any[],
    mutations: any[] = [],
  ): string {
    // 1) Per-account, per-period summary (opening → in/out → closing).
    const summaryHeaders = [
      "Kode Akun",
      "Nama Akun",
      "Periode",
      "Saldo Awal",
      "Kas Masuk",
      "Kas Keluar",
      "Saldo Akhir",
    ];
    let totalOpening = 0;
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalClosing = 0;
    const summaryData = rows.map((row: any) => {
      const opening = Number(row.openingBalance) || 0;
      const inflow = Number(row.totalInflow) || 0;
      const outflow = Number(row.totalOutflow) || 0;
      const closing = Number(row.closingBalance) || 0;
      totalOpening += opening;
      totalInflow += inflow;
      totalOutflow += outflow;
      totalClosing += closing;
      return [
        row.accountCode || "-",
        row.accountName || "-",
        row.period || this.formatDate(row.periodDate),
        opening,
        inflow,
        outflow,
        closing,
      ];
    });
    const summaryRow = [
      "",
      "",
      "TOTAL",
      totalOpening,
      totalInflow,
      totalOutflow,
      totalClosing,
    ];
    let html =
      '<div class="report-section">' +
      IndonesianPdfFormatter.generateIndonesianTable(
        summaryHeaders,
        summaryData,
        "cashBankBalances",
        { showSummary: true, summaryRow },
      );

    // 2) Rincian mutasi — the posted transactions behind each account's totals.
    if (mutations.length) {
      html +=
        '<h3 style="color: #1F4E79; margin-top: 24px;">RINCIAN MUTASI KAS &amp; BANK</h3>';
      for (const acct of mutations) {
        const detailHeaders = [
          "Tanggal",
          "No. Jurnal",
          "COA Terkait",
          "Deskripsi",
          "Kas Masuk",
          "Kas Keluar",
          "Saldo",
        ];
        const detailData = acct.transactions.map((t: any) => [
          this.formatDate(t.date),
          t.reference || "-",
          t.relatedCoa || "-",
          t.description || "-",
          Number(t.inflow) > 0 ? Number(t.inflow) : "-",
          Number(t.outflow) > 0 ? Number(t.outflow) : "-",
          Number(t.balance) || 0,
        ]);
        html += `<h4 style="color: #1F4E79; margin-top: 16px; margin-bottom: 6px;">${acct.accountCode} — ${acct.accountName}</h4>`;
        html += IndonesianPdfFormatter.generateIndonesianTable(
          detailHeaders,
          detailData,
          `cashBankMutasi-${acct.accountCode}`,
        );
      }
    }

    html += "</div>";
    return html;
  }

  // ============ DEPRECIATION EXPORT ============
  async exportDepreciationPDF(
    params: {
      startDate: string;
      endDate: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const data = await this.depreciationService.getDepreciationSummary({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
    });
    const companyInfo = await this.getCompanyInfo();

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "PENYUSUTAN ASET / ASSET DEPRECIATION",
      reportSubtitle: "LAPORAN PENYUSUTAN AKTIVA TETAP",
      reportPeriod: `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`,
      preparationDate: new Date(),
      reportType: "DEPRECIATION",
    };

    const tableHtml = this.generateDepreciationTableHtml(data);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateDepreciationTableHtml(data: any): string {
    const headers = [
      "Kode Aset",
      "Nama Aset",
      "Harga Perolehan (IDR)",
      "Penyusutan Periode (IDR)",
      "Akumulasi Penyusutan (IDR)",
      "Nilai Buku (IDR)",
    ];
    const tableData: any[][] = [];

    (data.byAsset || []).forEach((asset: any) => {
      tableData.push([
        asset.assetCode,
        asset.assetName,
        asset.purchasePrice,
        asset.depreciationAmount,
        asset.accumulatedDepreciation,
        asset.netBookValue,
      ]);
    });

    const summaryRow = [
      "",
      "TOTAL",
      "",
      data.totalDepreciation,
      data.totalAccumulatedDepreciation,
      "",
    ];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "depreciation",
      { showSummary: true, summaryRow },
    );

    return `<div class="report-section">${tableHtml}</div>`;
  }

  // ============ PURCHASES EXPORT ============
  async exportPurchasesPDF(
    params: {
      startDate?: string;
      endDate?: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const rows = await this.journalService.getPurchases({
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    });
    const companyInfo = await this.getCompanyInfo();

    const periodText =
      params.startDate && params.endDate
        ? `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`
        : params.startDate
          ? `Mulai: ${this.formatDate(params.startDate)}`
          : params.endDate
            ? `s/d: ${this.formatDate(params.endDate)}`
            : "Semua Periode";

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN PEMBELIAN / PURCHASE REPORT",
      reportSubtitle: "LAPORAN TRANSAKSI PEMBELIAN",
      reportPeriod: periodText,
      preparationDate: new Date(),
      reportType: "PURCHASES",
    };

    const tableHtml = this.generatePurchasesTableHtml(rows);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  async exportSalesPDF(
    params: {
      startDate?: string;
      endDate?: string;
    },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const rows = await this.journalService.getSales({
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    });
    const companyInfo = await this.getCompanyInfo();

    const periodText =
      params.startDate && params.endDate
        ? `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`
        : params.startDate
          ? `Mulai: ${this.formatDate(params.startDate)}`
          : params.endDate
            ? `s/d: ${this.formatDate(params.endDate)}`
            : "Semua Periode";

    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN PENJUALAN / SALES REPORT",
      reportSubtitle: "LAPORAN TRANSAKSI PENJUALAN",
      reportPeriod: periodText,
      preparationDate: new Date(),
      reportType: "SALES",
    };

    const tableHtml = this.generateSalesTableHtml(rows);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );

    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateSalesTableHtml(rows: any[]): string {
    const headers = [
      "Nomor",
      "Pelanggan",
      "Keterangan",
      "Tgl Terbit",
      "Jatuh Tempo",
      "Jumlah (IDR)",
      "Status",
    ];
    const tableData: any[][] = [];
    let totalAmount = 0;

    rows.forEach((row: any) => {
      const amount = Number(row.amount) || 0;
      totalAmount += amount;
      tableData.push([
        row.number || row.journalEntryNumber || "-",
        row.clientName || "-",
        row.description || "-",
        this.formatDate(row.issuedDate),
        this.formatDate(row.dueDate),
        amount,
        row.paymentStatus === "PAID" ? "Lunas" : "Belum Lunas",
      ]);
    });

    const summaryRow = ["", "", "", "", "TOTAL", totalAmount, ""];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "sales",
      { showSummary: true, summaryRow },
    );

    return `<div class="report-section">${tableHtml}</div>`;
  }

  private generatePurchasesTableHtml(rows: any[]): string {
    const headers = [
      "Nomor",
      "Tanggal",
      "Vendor",
      "Kategori",
      "Deskripsi",
      "Jumlah (IDR)",
      "Status",
    ];
    const tableData: any[][] = [];
    let totalAmount = 0;

    rows.forEach((row: any) => {
      const amount = Number(row.amount) || 0;
      totalAmount += amount;
      const category = [row.categoryCode, row.categoryName]
        .filter(Boolean)
        .join(" - ");
      tableData.push([
        row.number || row.journalEntryNumber || "-",
        this.formatDate(row.date),
        row.vendorName || "-",
        category || "-",
        row.description || "-",
        amount,
        row.paymentStatus === "PAID" ? "Lunas" : "Belum Lunas",
      ]);
    });

    const summaryRow = ["", "", "", "", "TOTAL", totalAmount, ""];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "purchases",
      { showSummary: true, summaryRow },
    );

    return `<div class="report-section">${tableHtml}</div>`;
  }

  // ============ EXPENSES EXPORT ============
  async exportExpensesPDF(
    params: { startDate?: string; endDate?: string },
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    const where: any = {};
    if (params.startDate || params.endDate) {
      where.expenseDate = {};
      if (params.startDate) where.expenseDate.gte = new Date(params.startDate);
      if (params.endDate) where.expenseDate.lte = new Date(params.endDate);
    }
    const expenses = await this.prisma.expense.findMany({
      where,
      include: { category: { select: { name: true, nameId: true } } },
      orderBy: { expenseDate: "desc" },
    });
    const companyInfo = await this.getCompanyInfo();

    const periodText =
      params.startDate && params.endDate
        ? `Periode: ${this.formatDate(params.startDate)} - ${this.formatDate(params.endDate)}`
        : "Semua Periode";
    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN PENGELUARAN / EXPENSES REPORT",
      reportSubtitle: "LAPORAN TRANSAKSI PENGELUARAN",
      reportPeriod: periodText,
      preparationDate: new Date(),
      reportType: "EXPENSES",
    };

    const tableHtml = this.generateExpensesTableHtml(expenses);
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tableHtml,
      options,
    );
    return await IndonesianPdfFormatter.generatePdfBuffer(completeHtml, options);
  }

  private generateExpensesTableHtml(rows: any[]): string {
    const headers = [
      "No. Pengeluaran",
      "Tanggal",
      "Vendor",
      "Kategori",
      "Deskripsi",
      "Jumlah (IDR)",
      "Status",
    ];
    const tableData: any[][] = [];
    let totalAmount = 0;
    rows.forEach((e: any) => {
      const amount = Number(e.totalAmount) || 0;
      totalAmount += amount;
      tableData.push([
        e.expenseNumber || "-",
        this.formatDate(e.expenseDate),
        e.vendorName || "-",
        e.category?.nameId || e.category?.name || "-",
        e.description || "-",
        amount,
        e.paymentStatus === "PAID" ? "Lunas" : "Belum Lunas",
      ]);
    });
    const summaryRow = ["", "", "", "", "TOTAL", totalAmount, ""];
    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "expenses",
      { showSummary: true, summaryRow },
    );
    return `<div class="report-section">${tableHtml}</div>`;
  }
}
