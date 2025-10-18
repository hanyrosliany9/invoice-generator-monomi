import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PPNCategory, WithholdingTaxType, EFakturStatus } from '@prisma/client';

/**
 * Tax Reconciliation Service - Indonesian Tax Compliance
 *
 * Implements Indonesian tax reporting and reconciliation:
 * - PPN (VAT) Input vs Output reconciliation
 * - PPh (Withholding Tax) summary by type
 * - Monthly tax report generation
 * - e-Faktur validation monitoring
 * - Bukti Potong (tax withholding certificate) tracking
 */
@Injectable()
export class TaxReconciliationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get PPN (VAT) Reconciliation Report
   *
   * Indonesian Tax Compliance:
   * - PPN Input: VAT paid on purchases (creditable)
   * - PPN Output: VAT collected on sales
   * - PPN Payable: Output - Input (if positive, company owes tax)
   * - PPN Creditable: Input - Output (if negative, company has tax credit)
   */
  async getPPNReconciliation(startDate: Date, endDate: Date) {
    // Get PPN Input (from Expenses - purchases)
    const expensesWithPPN = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['SUBMITTED', 'APPROVED', 'PAID'] },
        ppnAmount: { gt: 0 },
      },
      select: {
        id: true,
        expenseNumber: true,
        vendorName: true,
        vendorNPWP: true,
        grossAmount: true,
        ppnRate: true,
        ppnAmount: true,
        ppnCategory: true,
        eFakturNSFP: true,
        eFakturStatus: true,
        expenseDate: true,
        category: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
      orderBy: { expenseDate: 'asc' },
    });

    // Group PPN Input by category
    const ppnInputByCategory = expensesWithPPN.reduce((acc, expense) => {
      const category = expense.ppnCategory || PPNCategory.CREDITABLE;
      if (!acc[category]) {
        acc[category] = {
          category,
          count: 0,
          totalGrossAmount: 0,
          totalPPNAmount: 0,
          expenses: [],
        };
      }

      acc[category].count++;
      acc[category].totalGrossAmount += Number(expense.grossAmount);
      acc[category].totalPPNAmount += Number(expense.ppnAmount);
      acc[category].expenses.push({
        expenseNumber: expense.expenseNumber,
        vendorName: expense.vendorName,
        vendorNPWP: expense.vendorNPWP,
        grossAmount: Number(expense.grossAmount),
        ppnRate: Number(expense.ppnRate),
        ppnAmount: Number(expense.ppnAmount),
        eFakturNSFP: expense.eFakturNSFP,
        eFakturStatus: expense.eFakturStatus,
        expenseDate: expense.expenseDate,
        categoryName: expense.category.nameId || expense.category.name,
      });

      return acc;
    }, {} as Record<string, any>);

    // Calculate total PPN Input (only creditable)
    const totalPPNInput = expensesWithPPN
      .filter((e) => e.ppnCategory === PPNCategory.CREDITABLE)
      .reduce((sum, e) => sum + Number(e.ppnAmount), 0);

    // Get PPN Output (from Invoices - sales)
    // Note: For now, we assume all invoices are subject to 11% or 12% PPN
    // In a real system, you'd have PPN fields on invoices
    const invoicesWithPPN = await this.prisma.invoice.findMany({
      where: {
        creationDate: { gte: startDate, lte: endDate },
        status: { in: ['SENT', 'PAID'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        creationDate: true,
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
      orderBy: { creationDate: 'asc' },
    });

    // Calculate PPN Output (assuming 11% PPN on all invoices)
    // In production, you'd have a ppnRate field on invoices
    const DEFAULT_PPN_RATE = 0.11; // 11% standard rate for 2025
    const invoicesWithPPNData = invoicesWithPPN.map((invoice) => {
      const grossAmount = Number(invoice.totalAmount) / (1 + DEFAULT_PPN_RATE);
      const ppnAmount = Number(invoice.totalAmount) - grossAmount;

      return {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.company || invoice.client.name,
        totalAmount: Number(invoice.totalAmount),
        grossAmount,
        ppnAmount,
        ppnRate: DEFAULT_PPN_RATE,
        invoiceDate: invoice.creationDate,
      };
    });

    const totalPPNOutput = invoicesWithPPNData.reduce(
      (sum, inv) => sum + inv.ppnAmount,
      0,
    );

    // Calculate PPN Position
    const ppnPayable = totalPPNOutput - totalPPNInput;
    const isPPNPayable = ppnPayable > 0;

    // Group by month
    const ppnInputByMonth = this.groupByMonth(expensesWithPPN, 'expenseDate', 'ppnAmount');
    const ppnOutputByMonth = this.groupByMonth(invoicesWithPPN, 'creationDate', 'totalAmount');

    return {
      period: {
        startDate,
        endDate,
      },
      ppnInput: {
        total: totalPPNInput,
        byCategory: ppnInputByCategory,
        byMonth: ppnInputByMonth,
        transactionCount: expensesWithPPN.length,
        expenses: expensesWithPPN.map((e) => ({
          expenseNumber: e.expenseNumber,
          vendorName: e.vendorName,
          vendorNPWP: e.vendorNPWP,
          grossAmount: Number(e.grossAmount),
          ppnAmount: Number(e.ppnAmount),
          ppnCategory: e.ppnCategory,
          eFakturNSFP: e.eFakturNSFP,
          eFakturStatus: e.eFakturStatus,
          expenseDate: e.expenseDate,
        })),
      },
      ppnOutput: {
        total: totalPPNOutput,
        byMonth: ppnOutputByMonth,
        transactionCount: invoicesWithPPN.length,
        invoices: invoicesWithPPNData,
      },
      reconciliation: {
        ppnInput: totalPPNInput,
        ppnOutput: totalPPNOutput,
        ppnPayable: isPPNPayable ? ppnPayable : 0,
        ppnCreditable: !isPPNPayable ? Math.abs(ppnPayable) : 0,
        netPosition: ppnPayable,
        status: isPPNPayable ? 'PAYABLE' : 'CREDITABLE',
      },
      summary: {
        totalPPNInput,
        totalPPNOutput,
        netPPNPayable: ppnPayable,
        isPPNPayable,
      },
    };
  }

  /**
   * Get PPh (Withholding Tax) Summary by Type
   *
   * Indonesian Withholding Tax Types:
   * - PPh Pasal 23: 2% for services
   * - PPh Pasal 4(2): Final withholding tax
   * - PPh Pasal 15: Specific activities
   */
  async getPPhSummary(startDate: Date, endDate: Date) {
    const expensesWithPPh = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['SUBMITTED', 'APPROVED', 'PAID'] },
        withholdingTaxAmount: { gt: 0 },
      },
      select: {
        id: true,
        expenseNumber: true,
        vendorName: true,
        vendorNPWP: true,
        grossAmount: true,
        withholdingTaxType: true,
        withholdingTaxRate: true,
        withholdingTaxAmount: true,
        buktiPotongNumber: true,
        buktiPotongDate: true,
        expenseDate: true,
        category: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
      orderBy: { expenseDate: 'asc' },
    });

    // Group by withholding tax type
    const byType = expensesWithPPh.reduce((acc, expense) => {
      const type = expense.withholdingTaxType || WithholdingTaxType.NONE;
      if (type === WithholdingTaxType.NONE) return acc;

      if (!acc[type]) {
        acc[type] = {
          type,
          typeName: this.getPPhTypeName(type),
          count: 0,
          totalGrossAmount: 0,
          totalWithholdingAmount: 0,
          expenses: [],
        };
      }

      acc[type].count++;
      acc[type].totalGrossAmount += Number(expense.grossAmount);
      acc[type].totalWithholdingAmount += Number(expense.withholdingTaxAmount);
      acc[type].expenses.push({
        expenseNumber: expense.expenseNumber,
        vendorName: expense.vendorName,
        vendorNPWP: expense.vendorNPWP,
        grossAmount: Number(expense.grossAmount),
        withholdingRate: Number(expense.withholdingTaxRate),
        withholdingAmount: Number(expense.withholdingTaxAmount),
        buktiPotongNumber: expense.buktiPotongNumber,
        buktiPotongDate: expense.buktiPotongDate,
        expenseDate: expense.expenseDate,
        categoryName: expense.category.nameId || expense.category.name,
      });

      return acc;
    }, {} as Record<string, any>);

    // Group by month
    const byMonth = this.groupByMonth(expensesWithPPh, 'expenseDate', 'withholdingTaxAmount');

    // Calculate totals
    const totalWithholdingTax = expensesWithPPh.reduce(
      (sum, e) => sum + Number(e.withholdingTaxAmount),
      0,
    );

    // Get Bukti Potong status
    const withBuktiPotong = expensesWithPPh.filter((e) => e.buktiPotongNumber).length;
    const withoutBuktiPotong = expensesWithPPh.length - withBuktiPotong;

    return {
      period: {
        startDate,
        endDate,
      },
      byType,
      byMonth,
      buktiPotongStatus: {
        withBuktiPotong,
        withoutBuktiPotong,
        completionRate:
          expensesWithPPh.length > 0
            ? (withBuktiPotong / expensesWithPPh.length) * 100
            : 0,
      },
      summary: {
        totalWithholdingTax,
        transactionCount: expensesWithPPh.length,
        typeCount: Object.keys(byType).length,
      },
    };
  }

  /**
   * Get Monthly Tax Report
   *
   * Comprehensive monthly tax report for DGT (Direktorat Jenderal Pajak)
   */
  async getMonthlyTaxReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get PPN reconciliation
    const ppnReport = await this.getPPNReconciliation(startDate, endDate);

    // Get PPh summary
    const pphReport = await this.getPPhSummary(startDate, endDate);

    // Get e-Faktur validation status
    const eFakturStatus = await this.getEFakturValidationStatus(startDate, endDate);

    return {
      reportPeriod: {
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleString('id-ID', {
          month: 'long',
        }),
        startDate,
        endDate,
      },
      ppn: ppnReport,
      pph: pphReport,
      eFaktur: eFakturStatus,
      summary: {
        ppnPayable: ppnReport.reconciliation.ppnPayable,
        pphWithheld: pphReport.summary.totalWithholdingTax,
        totalTaxLiability:
          ppnReport.reconciliation.ppnPayable + pphReport.summary.totalWithholdingTax,
        eFakturCompletionRate: eFakturStatus.summary.validationRate,
      },
    };
  }

  /**
   * Get e-Faktur Validation Status
   *
   * Monitor e-Faktur compliance and validation status
   */
  async getEFakturValidationStatus(startDate: Date, endDate: Date) {
    const expensesRequiringEFaktur = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] },
        ppnAmount: { gt: 0 },
        ppnCategory: PPNCategory.CREDITABLE,
      },
      select: {
        id: true,
        expenseNumber: true,
        vendorName: true,
        vendorNPWP: true,
        grossAmount: true,
        ppnAmount: true,
        eFakturNSFP: true,
        eFakturStatus: true,
        eFakturValidatedAt: true,
        expenseDate: true,
        category: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
      orderBy: { expenseDate: 'asc' },
    });

    // Group by e-Faktur status
    const byStatus = expensesRequiringEFaktur.reduce((acc, expense) => {
      const status = expense.eFakturStatus;
      if (!acc[status]) {
        acc[status] = {
          status,
          statusName: this.getEFakturStatusName(status),
          count: 0,
          totalPPNAmount: 0,
          expenses: [],
        };
      }

      acc[status].count++;
      acc[status].totalPPNAmount += Number(expense.ppnAmount);
      acc[status].expenses.push({
        expenseNumber: expense.expenseNumber,
        vendorName: expense.vendorName,
        vendorNPWP: expense.vendorNPWP,
        grossAmount: Number(expense.grossAmount),
        ppnAmount: Number(expense.ppnAmount),
        eFakturNSFP: expense.eFakturNSFP,
        eFakturStatus: expense.eFakturStatus,
        eFakturValidatedAt: expense.eFakturValidatedAt,
        expenseDate: expense.expenseDate,
      });

      return acc;
    }, {} as Record<string, any>);

    // Calculate compliance metrics
    const totalExpenses = expensesRequiringEFaktur.length;
    const validCount = expensesRequiringEFaktur.filter(
      (e) => e.eFakturStatus === EFakturStatus.VALID,
    ).length;
    const invalidCount = expensesRequiringEFaktur.filter(
      (e) => e.eFakturStatus === EFakturStatus.INVALID,
    ).length;
    const pendingCount = expensesRequiringEFaktur.filter(
      (e) =>
        e.eFakturStatus === EFakturStatus.PENDING ||
        e.eFakturStatus === EFakturStatus.UPLOADED,
    ).length;
    const notRequiredCount = expensesRequiringEFaktur.filter(
      (e) => e.eFakturStatus === EFakturStatus.NOT_REQUIRED,
    ).length;

    const validationRate = totalExpenses > 0 ? (validCount / totalExpenses) * 100 : 0;

    // Find expenses with issues
    const expensesWithIssues = expensesRequiringEFaktur.filter(
      (e) =>
        e.eFakturStatus === EFakturStatus.INVALID ||
        e.eFakturStatus === EFakturStatus.PENDING ||
        !e.eFakturNSFP,
    );

    return {
      period: {
        startDate,
        endDate,
      },
      byStatus,
      compliance: {
        totalExpenses,
        validCount,
        invalidCount,
        pendingCount,
        notRequiredCount,
        validationRate,
        complianceLevel:
          validationRate >= 95 ? 'EXCELLENT' : validationRate >= 80 ? 'GOOD' : 'NEEDS_ATTENTION',
      },
      issues: {
        count: expensesWithIssues.length,
        expenses: expensesWithIssues.map((e) => ({
          expenseNumber: e.expenseNumber,
          vendorName: e.vendorName,
          vendorNPWP: e.vendorNPWP,
          ppnAmount: Number(e.ppnAmount),
          eFakturNSFP: e.eFakturNSFP,
          eFakturStatus: e.eFakturStatus,
          issue: !e.eFakturNSFP
            ? 'MISSING_NSFP'
            : e.eFakturStatus === EFakturStatus.INVALID
            ? 'INVALID_EFAKTUR'
            : 'PENDING_VALIDATION',
          expenseDate: e.expenseDate,
        })),
      },
      summary: {
        totalExpenses,
        validationRate,
        totalPPNAtRisk: expensesWithIssues.reduce(
          (sum, e) => sum + Number(e.ppnAmount),
          0,
        ),
      },
    };
  }

  /**
   * Get Tax Payment Reminders
   *
   * Generate reminders for upcoming tax payment deadlines
   */
  async getTaxPaymentReminders(asOfDate: Date) {
    // Indonesian tax payment deadlines:
    // - PPN: 20th of following month
    // - PPh 23: 20th of following month
    // - PPh 4(2): 20th of following month

    const currentMonth = asOfDate.getMonth();
    const currentYear = asOfDate.getFullYear();

    // Get previous month data (for current month tax payment)
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startDate = new Date(previousYear, previousMonth, 1);
    const endDate = new Date(previousYear, previousMonth + 1, 0);

    // PPN payment deadline
    const ppnDeadline = new Date(currentYear, currentMonth, 20);
    const ppnReport = await this.getPPNReconciliation(startDate, endDate);

    // PPh payment deadline
    const pphDeadline = new Date(currentYear, currentMonth, 20);
    const pphReport = await this.getPPhSummary(startDate, endDate);

    const daysUntilPPNDeadline = Math.ceil(
      (ppnDeadline.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUntilPPhDeadline = Math.ceil(
      (pphDeadline.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const reminders = [];

    // PPN reminder
    if (ppnReport.reconciliation.ppnPayable > 0 && daysUntilPPNDeadline <= 10) {
      reminders.push({
        type: 'PPN',
        deadline: ppnDeadline,
        daysUntil: daysUntilPPNDeadline,
        amount: ppnReport.reconciliation.ppnPayable,
        status: daysUntilPPNDeadline <= 3 ? 'URGENT' : 'UPCOMING',
        period: {
          month: previousMonth + 1,
          year: previousYear,
        },
      });
    }

    // PPh reminder
    if (pphReport.summary.totalWithholdingTax > 0 && daysUntilPPhDeadline <= 10) {
      reminders.push({
        type: 'PPh',
        deadline: pphDeadline,
        daysUntil: daysUntilPPhDeadline,
        amount: pphReport.summary.totalWithholdingTax,
        status: daysUntilPPhDeadline <= 3 ? 'URGENT' : 'UPCOMING',
        period: {
          month: previousMonth + 1,
          year: previousYear,
        },
      });
    }

    return {
      asOfDate,
      reminders,
      summary: {
        totalReminders: reminders.length,
        urgentCount: reminders.filter((r) => r.status === 'URGENT').length,
        totalAmountDue: reminders.reduce((sum, r) => sum + r.amount, 0),
      },
    };
  }

  /**
   * Helper: Group transactions by month
   */
  private groupByMonth(
    transactions: any[],
    dateField: string,
    amountField: string,
  ): Record<string, any> {
    return transactions.reduce((acc, transaction) => {
      const date = new Date(transaction[dateField]);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          monthName: date.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
          count: 0,
          totalAmount: 0,
        };
      }

      acc[monthKey].count++;
      acc[monthKey].totalAmount += Number(transaction[amountField] || 0);

      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Helper: Get PPh type name in Indonesian
   */
  private getPPhTypeName(type: WithholdingTaxType): string {
    const names: Record<WithholdingTaxType, string> = {
      [WithholdingTaxType.PPH23]: 'PPh Pasal 23 - Jasa',
      [WithholdingTaxType.PPH4_2]: 'PPh Pasal 4(2) - Final',
      [WithholdingTaxType.PPH15]: 'PPh Pasal 15 - Kegiatan Tertentu',
      [WithholdingTaxType.NONE]: 'Tidak Ada',
    };
    return names[type] || type;
  }

  /**
   * Helper: Get e-Faktur status name in Indonesian
   */
  private getEFakturStatusName(status: EFakturStatus): string {
    const names: Record<EFakturStatus, string> = {
      [EFakturStatus.NOT_REQUIRED]: 'Tidak Diperlukan',
      [EFakturStatus.PENDING]: 'Menunggu Upload',
      [EFakturStatus.UPLOADED]: 'Sudah Upload, Menunggu Validasi',
      [EFakturStatus.VALID]: 'Valid',
      [EFakturStatus.INVALID]: 'Tidak Valid',
      [EFakturStatus.EXPIRED]: 'Kadaluarsa',
    };
    return names[status] || status;
  }
}
