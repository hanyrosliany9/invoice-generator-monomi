import { Injectable ,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  IndonesianPdfFormatter,
  IndonesianCompanyInfo,
  IndonesianReportHeader,
  PdfFormattingOptions,
} from "./indonesian-pdf-formatter";

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
  requiresMaterai?: boolean;
}

interface ClientMonthlySummary {
  clientName: string;
  [month: string]: number | string;
}

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  clientIds?: string[];
  month?: number;
  year?: number;
}

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get Indonesian company information for SAK EMKM compliance
   */
  private getIndonesianCompanyInfo(): IndonesianCompanyInfo {
    return {
      name: "MONOMI",
      address: "Jl. Usaha Mandiri No. 123",
      city: "Jakarta Selatan",
      postalCode: "12345",
      phone: "+62-21-1234-5678",
      email: "info@monomi.co.id",
      website: "www.monomi.co.id",
      npwp: "01.234.567.8-901.234",
      siup: "SIUP/123/2024",
    };
  }

  /**
   * Generate comprehensive PDF report with Indonesian standards
   */
  async generateSalesAndReceivablesReport(
    filters: ExportFilters,
    options: PdfFormattingOptions = {},
  ): Promise<Buffer> {
    // Get company information and validate compliance
    const companyInfo = this.getIndonesianCompanyInfo();
    const validationErrors =
      IndonesianPdfFormatter.validateIndonesianCompliance(companyInfo);

    if (validationErrors.length > 0) {
      throw new Error(
        `Indonesian compliance validation failed: ${validationErrors.join(", ")}`,
      );
    }

    // Determine report period and type
    const isSingleMonth = this.isSingleMonthReport(filters);
    const targetMonth = isSingleMonth ? this.getTargetMonth(filters) : null;

    const monthName =
      targetMonth !== null && targetMonth !== undefined
        ? this.getIndonesianMonthName(targetMonth)
        : "SEMUA BULAN";

    // Create report header
    const reportHeader: IndonesianReportHeader = {
      reportTitle: "LAPORAN PENJUALAN DAN PIUTANG",
      reportSubtitle: "LAPORAN KEUANGAN SAK EMKM",
      reportPeriod: `${monthName} 2025`,
      preparationDate: new Date(),
      reportType: "COMPREHENSIVE_SALES_RECEIVABLES",
    };

    // Fetch all report data
    const [
      salesDetailData,
      receivablesDetailData,
      salesMonthlySummary,
      receivablesMonthlySummary,
    ] = await Promise.all([
      this.getSalesDetailData(filters),
      this.getReceivablesDetailData(filters),
      this.getSalesMonthlySummary(filters, targetMonth),
      this.getReceivablesMonthlySummary(filters, targetMonth),
    ]);

    // Generate HTML content for each section
    const tablesHtml = this.generateAllTablesHtml(
      salesDetailData,
      receivablesDetailData,
      salesMonthlySummary,
      receivablesMonthlySummary,
      targetMonth,
    );

    // Generate complete HTML document
    const completeHtml = IndonesianPdfFormatter.generateCompleteReportHtml(
      companyInfo,
      reportHeader,
      tablesHtml,
      options,
    );

    // Generate PDF buffer
    return await IndonesianPdfFormatter.generatePdfBuffer(
      completeHtml,
      options,
    );
  }

  /**
   * Generate HTML content for all report tables
   */
  private generateAllTablesHtml(
    salesDetailData: SalesReportData[],
    receivablesDetailData: ReceivablesReportData[],
    salesMonthlySummary: ClientMonthlySummary[],
    receivablesMonthlySummary: ClientMonthlySummary[],
    targetMonth?: number | null,
  ): string {
    let html = "";

    // 1. Sales Detail Report
    html += this.generateSalesDetailTableHtml(salesDetailData);
    html += '<div class="page-break"></div>';

    // 2. Receivables Detail Report
    html += this.generateReceivablesDetailTableHtml(receivablesDetailData);
    html += '<div class="page-break"></div>';

    // 3. Sales Monthly Summary
    html += this.generateSalesMonthlySummaryTableHtml(
      salesMonthlySummary,
      targetMonth,
    );
    html += '<div class="page-break"></div>';

    // 4. Receivables Monthly Summary
    html += this.generateReceivablesMonthlySummaryTableHtml(
      receivablesMonthlySummary,
      targetMonth,
    );

    return html;
  }

  /**
   * Generate Sales Detail Table HTML
   */
  private generateSalesDetailTableHtml(data: SalesReportData[]): string {
    const headers = [
      "No.",
      "NAMA CLIENT",
      "No. Project",
      "Tanggal Project",
      "Deskripsi Project",
      "Jumlah Penjualan (IDR)",
      "No. Invoice",
      "Keterangan Materai",
    ];

    const tableData: any[][] = [];
    let totalAmount = 0;
    let materaiCount = 0;

    data.forEach((item, index) => {
      const requiresMaterai = item.salesAmount > 5000000;
      const keterangan = requiresMaterai ? "Wajib Materai Rp 10.000" : "-";
      if (requiresMaterai) materaiCount++;

      tableData.push([
        index + 1,
        item.clientName,
        item.projectNumber,
        IndonesianPdfFormatter.formatIndonesianShortDate(item.projectDate),
        item.projectDescription,
        item.salesAmount,
        item.invoiceNumber ||
          this.generateIndonesianInvoiceNumber(item.projectDate, index + 1),
        keterangan,
      ]);

      totalAmount += item.salesAmount;
    });

    // Add summary row
    const summaryRow = [
      "",
      "",
      "",
      "",
      "JUMLAH KESELURUHAN:",
      totalAmount,
      "",
      "",
    ];

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "salesDetail",
      {
        showSummary: true,
        summaryRow: summaryRow,
        materaiInfo:
          materaiCount > 0
            ? {
                count: materaiCount,
                totalCost: materaiCount * 10000,
              }
            : undefined,
      },
    );

    return `
      <div class="report-section">
        <h3 style="color: #1F4E79; margin-bottom: 15px; font-size: 16px;">
          RINCIAN PENJUALAN
        </h3>
        ${tableHtml}
      </div>
    `;
  }

  /**
   * Generate Receivables Detail Table HTML
   */
  private generateReceivablesDetailTableHtml(
    data: ReceivablesReportData[],
  ): string {
    const headers = [
      "No",
      "NAMA CLIENT",
      "Deskripsi Project",
      "Tanggal Invoice",
      "No. Invoice",
      "Saldo Awal (IDR)",
      "Penjualan (IDR)",
      "Pembayaran (IDR)",
      "Saldo Akhir (IDR)",
    ];

    const tableData: any[][] = [];
    let totalSaldoAwal = 0,
      totalPenjualan = 0,
      totalPembayaran = 0,
      totalSaldoAkhir = 0;

    data.forEach((item, index) => {
      // Validate Indonesian balance formula
      const calculatedBalance =
        item.beginningBalance + item.salesAmount - item.paymentsReceived;
      if (Math.abs(calculatedBalance - item.endingBalance) > 0.01) {
        this.logger.warn(
          `Balance mismatch for ${item.clientName}: Expected ${calculatedBalance}, Got ${item.endingBalance}`,
        );
      }

      tableData.push([
        index + 1,
        item.clientName,
        item.projectDescription,
        IndonesianPdfFormatter.formatIndonesianShortDate(item.invoiceDate),
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

    // Add summary row
    const summaryRow = [
      "",
      "",
      "",
      "",
      "JUMLAH TOTAL",
      totalSaldoAwal,
      totalPenjualan,
      totalPembayaran,
      totalSaldoAkhir,
    ];

    // Validate total balance calculation
    const expectedTotalBalance =
      totalSaldoAwal + totalPenjualan - totalPembayaran;
    if (Math.abs(expectedTotalBalance - totalSaldoAkhir) > 0.01) {
      this.logger.warn(
        `Total balance validation failed: Expected ${expectedTotalBalance}, Got ${totalSaldoAkhir}`,
      );
    }

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "receivablesDetail",
      {
        showSummary: true,
        summaryRow: summaryRow,
        balanceValidation: true,
      },
    );

    return `
      <div class="report-section">
        <h3 style="color: #1F4E79; margin-bottom: 15px; font-size: 16px;">
          RINCIAN PIUTANG USAHA
        </h3>
        ${tableHtml}
      </div>
    `;
  }

  /**
   * Generate Sales Monthly Summary Table HTML
   */
  private generateSalesMonthlySummaryTableHtml(
    data: ClientMonthlySummary[],
    targetMonth?: number | null,
  ): string {
    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];

    // Calculate total sales per month across all clients
    const monthTotals = new Array(12).fill(0);
    data.forEach((clientData) => {
      monthNames.forEach((monthName, index) => {
        monthTotals[index] += (clientData[monthName] as number) || 0;
      });
    });

    let headers: string[];
    let tableData: any[][];
    let summaryRow: any[];

    if (targetMonth !== null && targetMonth !== undefined) {
      // Single month report
      const targetMonthName = monthNames[targetMonth];
      headers = ["BULAN", "JUMLAH"];
      tableData = [[targetMonthName, monthTotals[targetMonth]]];
      summaryRow = ["JUMLAH TOTAL", monthTotals[targetMonth]];
    } else {
      // Multi-month report
      headers = ["BULAN", "JUMLAH"];
      tableData = monthNames.map((monthName, index) => [
        monthName,
        monthTotals[index],
      ]);
      const totalAmount = monthTotals.reduce((sum, total) => sum + total, 0);
      summaryRow = ["JUMLAH TOTAL", totalAmount];
    }

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "salesMonthlySummary",
      {
        showSummary: true,
        summaryRow: summaryRow,
      },
    );

    return `
      <div class="report-section">
        <h3 style="color: #1F4E79; margin-bottom: 15px; font-size: 16px;">
          REKAP PENJUALAN PER BULAN
        </h3>
        ${tableHtml}
      </div>
    `;
  }

  /**
   * Generate Receivables Monthly Summary Table HTML
   */
  private generateReceivablesMonthlySummaryTableHtml(
    data: ClientMonthlySummary[],
    targetMonth?: number | null,
  ): string {
    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];

    const headers = [
      "BULAN",
      "SALDO AWAL",
      "PENJUALAN",
      "PEMBAYARAN",
      "SALDO AKHIR",
    ];
    let tableData: any[][];
    let summaryRow: any[];

    if (targetMonth !== null && targetMonth !== undefined) {
      // Single month report
      const targetMonthName = monthNames[targetMonth];
      let monthSales = 0;
      let monthPayments = 0;

      data.forEach((clientData) => {
        monthSales += (clientData[targetMonthName] as number) || 0;
      });

      const beginningBalance = 0;
      const endingBalance = beginningBalance + monthSales - monthPayments;

      tableData = [
        [
          targetMonthName,
          beginningBalance,
          monthSales,
          monthPayments,
          endingBalance,
        ],
      ];
      summaryRow = [
        "JUMLAH TOTAL",
        beginningBalance,
        monthSales,
        monthPayments,
        endingBalance,
      ];
    } else {
      // Multi-month report
      let runningBalance = 0;
      let totalSaldoAwal = 0,
        totalPenjualan = 0,
        totalPembayaran = 0,
        totalSaldoAkhir = 0;

      tableData = monthNames.map((monthName, index) => {
        let monthSales = 0;
        let monthPayments = 0;

        data.forEach((clientData) => {
          monthSales += (clientData[monthName] as number) || 0;
        });

        const beginningBalance = runningBalance;
        const endingBalance = beginningBalance + monthSales - monthPayments;
        runningBalance = endingBalance;

        totalSaldoAwal += beginningBalance;
        totalPenjualan += monthSales;
        totalPembayaran += monthPayments;
        totalSaldoAkhir += endingBalance;

        return [
          monthName,
          beginningBalance,
          monthSales,
          monthPayments,
          endingBalance,
        ];
      });

      summaryRow = [
        "JUMLAH TOTAL",
        totalSaldoAwal,
        totalPenjualan,
        totalPembayaran,
        totalSaldoAkhir,
      ];
    }

    const tableHtml = IndonesianPdfFormatter.generateIndonesianTable(
      headers,
      tableData,
      "receivablesMonthlySummary",
      {
        showSummary: true,
        summaryRow: summaryRow,
        balanceValidation: true,
      },
    );

    return `
      <div class="report-section">
        <h3 style="color: #1F4E79; margin-bottom: 15px; font-size: 16px;">
          REKAP PIUTANG PER BULAN
        </h3>
        ${tableHtml}
      </div>
    `;
  }

  // Data fetching methods (similar to Excel export service)
  private async getSalesDetailData(
    filters: ExportFilters,
  ): Promise<SalesReportData[]> {
    const dateFilter = this.buildDateFilter(
      filters.startDate,
      filters.endDate,
      "creationDate",
    );
    const clientFilter = filters.clientIds?.length
      ? { id: { in: filters.clientIds } }
      : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "PAID"] },
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
        project: {
          select: {
            number: true,
            description: true,
          },
        },
      },
      orderBy: [{ client: { name: "asc" } }, { creationDate: "asc" }],
    });

    return invoices.map((invoice) => ({
      clientName: invoice.client.name,
      projectNumber: invoice.project.number,
      projectDate: invoice.creationDate,
      projectDescription: invoice.project.description,
      salesAmount: Number(invoice.totalAmount),
      invoiceNumber: invoice.invoiceNumber,
    }));
  }

  private async getReceivablesDetailData(
    filters: ExportFilters,
  ): Promise<ReceivablesReportData[]> {
    const dateFilter = this.buildDateFilter(
      filters.startDate,
      filters.endDate,
      "creationDate",
    );
    const clientFilter = filters.clientIds?.length
      ? { id: { in: filters.clientIds } }
      : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
        project: { select: { description: true } },
        payments: {
          where: { status: "CONFIRMED" },
          select: { amount: true, paymentDate: true },
        },
      },
      orderBy: [{ client: { name: "asc" } }, { creationDate: "asc" }],
    });

    const clientBalances = new Map<string, number>();
    const receivablesData: ReceivablesReportData[] = [];

    for (const invoice of invoices) {
      const clientName = invoice.client.name;
      const beginningBalance = clientBalances.get(clientName) || 0;
      const salesAmount = Number(invoice.totalAmount);
      const paymentsReceived = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
      const endingBalance = beginningBalance + salesAmount - paymentsReceived;

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
        requiresMaterai: salesAmount > 5000000,
      });
    }

    return receivablesData;
  }

  private async getSalesMonthlySummary(
    filters: ExportFilters,
    targetMonth?: number | null,
  ): Promise<ClientMonthlySummary[]> {
    const dateFilter = this.buildDateFilter(
      filters.startDate,
      filters.endDate,
      "creationDate",
    );
    const clientFilter = filters.clientIds?.length
      ? { id: { in: filters.clientIds } }
      : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "PAID"] },
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
      },
    });

    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];

    const summaryMap = new Map<string, ClientMonthlySummary>();

    const allClients = new Set(invoices.map((i) => i.client.name));
    allClients.forEach((clientName) => {
      const summary: ClientMonthlySummary = { clientName };
      monthNames.forEach((m) => (summary[m] = 0));
      summaryMap.set(clientName, summary);
    });

    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const invoiceMonth = invoice.creationDate.getMonth();

        if (invoiceMonth === targetMonth) {
          const amount = Number(invoice.totalAmount);
          const clientSummary = summaryMap.get(clientName)!;
          clientSummary[targetMonthName] =
            (clientSummary[targetMonthName] as number) + amount;
        }
      });
    } else {
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

  private async getReceivablesMonthlySummary(
    filters: ExportFilters,
    targetMonth?: number | null,
  ): Promise<ClientMonthlySummary[]> {
    const dateFilter = this.buildDateFilter(
      filters.startDate,
      filters.endDate,
      "creationDate",
    );
    const clientFilter = filters.clientIds?.length
      ? { id: { in: filters.clientIds } }
      : {};

    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...dateFilter,
        client: clientFilter,
      },
      include: {
        client: { select: { name: true } },
        payments: {
          where: { status: "CONFIRMED" },
          select: { amount: true, paymentDate: true },
        },
      },
    });

    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];

    const summaryMap = new Map<string, ClientMonthlySummary>();

    const allClients = new Set(invoices.map((i) => i.client.name));
    allClients.forEach((clientName) => {
      const summary: ClientMonthlySummary = { clientName };
      monthNames.forEach((m) => (summary[m] = 0));
      summaryMap.set(clientName, summary);
    });

    if (targetMonth !== null && targetMonth !== undefined) {
      const targetMonthName = monthNames[targetMonth];
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const invoiceMonth = invoice.creationDate.getMonth();

        if (invoiceMonth === targetMonth) {
          const invoiceAmount = Number(invoice.totalAmount);
          const paymentsAmount = invoice.payments.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0,
          );
          const outstandingAmount = invoiceAmount - paymentsAmount;

          const clientSummary = summaryMap.get(clientName)!;
          clientSummary[targetMonthName] =
            (clientSummary[targetMonthName] as number) + outstandingAmount;
        }
      });
    } else {
      invoices.forEach((invoice) => {
        const clientName = invoice.client.name;
        const month = monthNames[invoice.creationDate.getMonth()];
        const invoiceAmount = Number(invoice.totalAmount);
        const paymentsAmount = invoice.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        const outstandingAmount = invoiceAmount - paymentsAmount;

        const clientSummary = summaryMap.get(clientName)!;
        clientSummary[month] =
          (clientSummary[month] as number) + outstandingAmount;
      });
    }

    return Array.from(summaryMap.values());
  }

  // Helper methods
  private isSingleMonthReport(filters: ExportFilters): boolean {
    if (!filters.startDate || !filters.endDate) return false;

    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);

    return (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth()
    );
  }

  private getTargetMonth(filters: ExportFilters): number {
    if (filters.startDate) {
      return new Date(filters.startDate).getMonth();
    }
    return new Date().getMonth();
  }

  private buildDateFilter(
    startDate?: string,
    endDate?: string,
    dateField: string = "createdAt",
  ) {
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

  private getIndonesianMonthName(monthIndex: number): string {
    const indonesianMonths = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];
    return indonesianMonths[monthIndex] || "JANUARI";
  }

  private generateIndonesianInvoiceNumber(
    date: Date,
    sequence: number,
  ): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const seq = sequence.toString().padStart(4, "0");
    return `INV-JKT-${year}${month}-${seq}`;
  }
}
