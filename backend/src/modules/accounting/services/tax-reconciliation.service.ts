import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PPNCategory, WithholdingTaxType, EFakturStatus } from "@prisma/client";
import { wibPeriodKey } from "../../../common/utils/wib-date.util";

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
    // ── GL-authoritative balances for PPN accounts ─────────────────────────
    // These are queried up-front so the return object can surface them
    // alongside the operational-table figures. Manual journal entries posted
    // directly to these accounts are ONLY visible here — the expense/invoice
    // rows below can never see them.

    // 2-2010  Hutang PPN (CREDIT-normal LIABILITY): net = sum(credit) - sum(debit)
    const ppnPayableAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '2-2010' },
    });
    let glPPNPayableBalance = 0;
    if (ppnPayableAccount) {
      const rows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: ppnPayableAccount.id,
          entryDate: { lte: endDate },
          journalEntry: { isPosted: true },
        },
        select: { debit: true, credit: true },
      });
      glPPNPayableBalance = rows.reduce(
        (sum, r) => sum + Number(r.credit) - Number(r.debit),
        0,
      );
    }

    // 1-2530  PPN Masukan / Prepaid PPN (DEBIT-normal ASSET): net = sum(debit) - sum(credit)
    const ppnInputAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '1-2530' },
    });
    let glPPNInputBalance = 0;
    if (ppnInputAccount) {
      const rows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: ppnInputAccount.id,
          entryDate: { lte: endDate },
          journalEntry: { isPosted: true },
        },
        select: { debit: true, credit: true },
      });
      glPPNInputBalance = rows.reduce(
        (sum, r) => sum + Number(r.debit) - Number(r.credit),
        0,
      );
    }
    // ── end GL balances ────────────────────────────────────────────────────

    // Get PPN Input (from Expenses - purchases)
    // FIX 3: Only APPROVED/PAID expenses yield creditable input VAT (drop SUBMITTED)
    const expensesWithPPN = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ["APPROVED", "PAID"] },
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
      orderBy: { expenseDate: "asc" },
    });

    // Group PPN Input by category
    const ppnInputByCategory = expensesWithPPN.reduce(
      (acc, expense) => {
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
      },
      {} as Record<string, any>,
    );

    // Calculate total PPN Input (only creditable)
    const totalPPNInput = expensesWithPPN
      .filter((e) => e.ppnCategory === PPNCategory.CREDITABLE)
      .reduce((sum, e) => sum + Number(e.ppnAmount), 0);

    // Get PPN Output (from Invoices - sales)
    // FIX 2a: Select actual taxAmount/taxRate/includeTax fields from invoices
    // FIX 2b: Include OVERDUE status alongside SENT/PAID
    const invoicesWithPPN = await this.prisma.invoice.findMany({
      where: {
        creationDate: { gte: startDate, lte: endDate },
        status: { in: ["SENT", "PAID", "OVERDUE"] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        taxAmount: true,
        taxRate: true,
        includeTax: true,
        creationDate: true,
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
      orderBy: { creationDate: "asc" },
    });

    // FIX 2a: Use the stored taxAmount field; only invoices with taxAmount > 0 contribute PPN output
    const invoicesWithPPNData = invoicesWithPPN.map((invoice) => {
      const totalAmount = Number(invoice.totalAmount);
      const ppnAmount = Number(invoice.taxAmount ?? 0);
      const ppnRate = Number(invoice.taxRate ?? 0) / 100; // stored as percentage e.g. 11.00

      return {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.company || invoice.client.name,
        totalAmount,
        grossAmount: totalAmount - ppnAmount,
        ppnAmount,
        ppnRate,
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
    // FIX 2c: group PPN output by taxAmount (not totalAmount)
    const ppnInputByMonth = this.groupByMonth(
      expensesWithPPN,
      "expenseDate",
      "ppnAmount",
    );
    const ppnOutputByMonth = this.groupByMonth(
      invoicesWithPPN,
      "creationDate",
      "taxAmount",
    );

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
        status: isPPNPayable ? "PAYABLE" : "CREDITABLE",
        // GL-authoritative balance for 2-2010 Hutang PPN (CREDIT-normal).
        // This is the headline figure that ties to the Balance Sheet / Trial Balance.
        // A non-zero reconcilingAdjustment means a manual journal was posted directly
        // to 2-2010 outside the invoice/expense flow (e.g. a tax payment entry).
        glPPNPayableBalance,
        reconcilingAdjustmentPPNPayable: glPPNPayableBalance - (isPPNPayable ? ppnPayable : 0),
        // GL-authoritative balance for 1-2530 PPN Masukan (DEBIT-normal asset).
        // Non-zero reconcilingAdjustment means a manual journal touched 1-2530
        // without a corresponding creditable expense row.
        glPPNInputBalance,
        reconcilingAdjustmentPPNInput: glPPNInputBalance - totalPPNInput,
      },
      summary: {
        totalPPNInput,
        totalPPNOutput,
        netPPNPayable: ppnPayable,
        isPPNPayable,
        // GL-authoritative balances — always reconcile with Balance Sheet.
        glPPNPayableBalance,
        glPPNInputBalance,
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
    // ── GL-authoritative balances for PPh accounts ─────────────────────────
    // 2-2020  Hutang PPh (CREDIT-normal LIABILITY): net = sum(credit) - sum(debit)
    // glBalance is AUTHORITATIVE; it includes manual journal entries that the
    // expense rows below cannot see (e.g. a PPh payment or adjusting entry).
    const pphPayableAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '2-2020' },
    });
    let glPPhPayableBalance = 0;
    if (pphPayableAccount) {
      const rows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: pphPayableAccount.id,
          entryDate: { lte: endDate },
          journalEntry: { isPosted: true },
        },
        select: { debit: true, credit: true },
      });
      glPPhPayableBalance = rows.reduce(
        (sum, r) => sum + Number(r.credit) - Number(r.debit),
        0,
      );
    }

    // 1-2510  Prepaid PPh 23 (DEBIT-normal ASSET): net = sum(debit) - sum(credit)
    const prepaidPPh23Account = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '1-2510' },
    });
    let glPrepaidPPh23Balance = 0;
    if (prepaidPPh23Account) {
      const rows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: prepaidPPh23Account.id,
          entryDate: { lte: endDate },
          journalEntry: { isPosted: true },
        },
        select: { debit: true, credit: true },
      });
      glPrepaidPPh23Balance = rows.reduce(
        (sum, r) => sum + Number(r.debit) - Number(r.credit),
        0,
      );
    }

    // 1-2520  Prepaid PPh 25 (DEBIT-normal ASSET): net = sum(debit) - sum(credit)
    const prepaidPPh25Account = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '1-2520' },
    });
    let glPrepaidPPh25Balance = 0;
    if (prepaidPPh25Account) {
      const rows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: prepaidPPh25Account.id,
          entryDate: { lte: endDate },
          journalEntry: { isPosted: true },
        },
        select: { debit: true, credit: true },
      });
      glPrepaidPPh25Balance = rows.reduce(
        (sum, r) => sum + Number(r.debit) - Number(r.credit),
        0,
      );
    }
    // ── end GL balances ────────────────────────────────────────────────────

    // FIX 3 (PPh side): Only APPROVED/PAID expenses are settled; drop SUBMITTED
    const expensesWithPPh = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ["APPROVED", "PAID"] },
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
      orderBy: { expenseDate: "asc" },
    });

    // Group by withholding tax type
    const byType = expensesWithPPh.reduce(
      (acc, expense) => {
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
        acc[type].totalWithholdingAmount += Number(
          expense.withholdingTaxAmount,
        );
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
      },
      {} as Record<string, any>,
    );

    // Group by month
    const byMonth = this.groupByMonth(
      expensesWithPPh,
      "expenseDate",
      "withholdingTaxAmount",
    );

    // Calculate totals
    const totalWithholdingTax = expensesWithPPh.reduce(
      (sum, e) => sum + Number(e.withholdingTaxAmount),
      0,
    );

    // Get Bukti Potong status
    const withBuktiPotong = expensesWithPPh.filter(
      (e) => e.buktiPotongNumber,
    ).length;
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
        // GL-authoritative balance for 2-2020 Hutang PPh (CREDIT-normal).
        // This is the headline figure that ties to the Balance Sheet / Trial Balance.
        // A non-zero reconcilingAdjustment means a manual journal was posted
        // to 2-2020 outside the expense flow (e.g. a PPh payment entry).
        glPPhPayableBalance,
        reconcilingAdjustmentPPh: glPPhPayableBalance - totalWithholdingTax,
        // GL-authoritative balances for Prepaid PPh asset accounts (DEBIT-normal).
        // Non-zero values indicate PPh installments or pre-payments posted via journal.
        glPrepaidPPh23Balance,
        glPrepaidPPh25Balance,
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
    // FIX 4: Use exclusive upper bound (first moment of next month) so no
    // end-of-month records are dropped by the 23:59:59 truncation.
    const endDate = new Date(year, month, 1);

    // Get PPN reconciliation
    const ppnReport = await this.getPPNReconciliation(startDate, endDate);

    // Get PPh summary
    const pphReport = await this.getPPhSummary(startDate, endDate);

    // Get e-Faktur validation status
    const eFakturStatus = await this.getEFakturValidationStatus(
      startDate,
      endDate,
    );

    return {
      reportPeriod: {
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleString("id-ID", {
          month: "long",
        }),
        startDate,
        endDate,
      },
      ppn: ppnReport,
      pph: pphReport,
      eFaktur: eFakturStatus,
      summary: {
        // Operational totals (from invoice/expense rows) — retained as supporting detail.
        ppnPayable: ppnReport.reconciliation.ppnPayable,
        pphWithheld: pphReport.summary.totalWithholdingTax,
        totalTaxLiability:
          ppnReport.reconciliation.ppnPayable +
          pphReport.summary.totalWithholdingTax,
        eFakturCompletionRate: eFakturStatus.summary.validationRate,
        // GL-authoritative totals — always reconcile with Balance Sheet / Trial Balance.
        // Non-zero reconcilingAdjustment values mean a manual journal was posted to
        // the tax accounts outside the normal invoice/expense flow.
        glPPNPayableBalance: ppnReport.reconciliation.glPPNPayableBalance,
        glPPhPayableBalance: pphReport.summary.glPPhPayableBalance,
        glTotalTaxLiability:
          ppnReport.reconciliation.glPPNPayableBalance +
          pphReport.summary.glPPhPayableBalance,
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
        status: { in: ["APPROVED", "PAID"] },
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
      orderBy: { expenseDate: "asc" },
    });

    // Group by e-Faktur status
    const byStatus = expensesRequiringEFaktur.reduce(
      (acc, expense) => {
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
      },
      {} as Record<string, any>,
    );

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

    const validationRate =
      totalExpenses > 0 ? (validCount / totalExpenses) * 100 : 0;

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
          validationRate >= 95
            ? "EXCELLENT"
            : validationRate >= 80
              ? "GOOD"
              : "NEEDS_ATTENTION",
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
            ? "MISSING_NSFP"
            : e.eFakturStatus === EFakturStatus.INVALID
              ? "INVALID_EFAKTUR"
              : "PENDING_VALIDATION",
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

    // Use GL-authoritative balances as the headline amounts for reminders.
    // glPPNPayableBalance (2-2010) and glPPhPayableBalance (2-2020) include any
    // manual journal entries posted outside the invoice/expense flow; the
    // operational totals are kept as additional detail fields so the source of
    // each amount remains auditable.
    const glPPNDue = ppnReport.reconciliation.glPPNPayableBalance;
    const glPPhDue = pphReport.summary.glPPhPayableBalance;

    // PPN reminder
    if (glPPNDue > 0 && daysUntilPPNDeadline <= 10) {
      reminders.push({
        type: "PPN",
        deadline: ppnDeadline,
        daysUntil: daysUntilPPNDeadline,
        // GL-authoritative amount (authoritative — ties to Balance Sheet).
        amount: glPPNDue,
        // Operational total retained as supporting detail.
        operationalAmount: ppnReport.reconciliation.ppnPayable,
        reconcilingAdjustment: ppnReport.reconciliation.reconcilingAdjustmentPPNPayable,
        status: daysUntilPPNDeadline <= 3 ? "URGENT" : "UPCOMING",
        period: {
          month: previousMonth + 1,
          year: previousYear,
        },
      });
    }

    // PPh reminder
    if (glPPhDue > 0 && daysUntilPPhDeadline <= 10) {
      reminders.push({
        type: "PPh",
        deadline: pphDeadline,
        daysUntil: daysUntilPPhDeadline,
        // GL-authoritative amount (authoritative — ties to Balance Sheet).
        amount: glPPhDue,
        // Operational total retained as supporting detail.
        operationalAmount: pphReport.summary.totalWithholdingTax,
        reconcilingAdjustment: pphReport.summary.reconcilingAdjustmentPPh,
        status: daysUntilPPhDeadline <= 3 ? "URGENT" : "UPCOMING",
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
        urgentCount: reminders.filter((r) => r.status === "URGENT").length,
        // GL-authoritative total due amount.
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
    return transactions.reduce(
      (acc, transaction) => {
        const date = new Date(transaction[dateField]);
        const monthKey = wibPeriodKey(date);

        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            monthName: date.toLocaleString("id-ID", {
              month: "long",
              year: "numeric",
            }),
            count: 0,
            totalAmount: 0,
          };
        }

        acc[monthKey].count++;
        acc[monthKey].totalAmount += Number(transaction[amountField] || 0);

        return acc;
      },
      {} as Record<string, any>,
    );
  }

  /**
   * Helper: Get PPh type name in Indonesian
   */
  private getPPhTypeName(type: WithholdingTaxType): string {
    const names: Record<WithholdingTaxType, string> = {
      [WithholdingTaxType.PPH23]: "PPh Pasal 23 - Jasa",
      [WithholdingTaxType.PPH4_2]: "PPh Pasal 4(2) - Final",
      [WithholdingTaxType.PPH15]: "PPh Pasal 15 - Kegiatan Tertentu",
      [WithholdingTaxType.NONE]: "Tidak Ada",
    };
    return names[type] || type;
  }

  /**
   * Helper: Get e-Faktur status name in Indonesian
   */
  private getEFakturStatusName(status: EFakturStatus): string {
    const names: Record<EFakturStatus, string> = {
      [EFakturStatus.NOT_REQUIRED]: "Tidak Diperlukan",
      [EFakturStatus.PENDING]: "Menunggu Upload",
      [EFakturStatus.UPLOADED]: "Sudah Upload, Menunggu Validasi",
      [EFakturStatus.VALID]: "Valid",
      [EFakturStatus.INVALID]: "Tidak Valid",
      [EFakturStatus.EXPIRED]: "Kadaluarsa",
    };
    return names[status] || status;
  }
}
