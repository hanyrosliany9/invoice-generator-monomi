import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LedgerService } from "./ledger.service";
import { JournalService } from "./journal.service";
import { FinancialStatementQueryDto } from "../dto/financial-statement-query.dto";
import { AccountType, StatementType, TransactionType } from "@prisma/client";
import { servicesPortionOf } from "../../../common/utils/reimbursable.util";

export interface CashFlowActivity {
  date: Date;
  description: string;
  descriptionId: string | null;
  entryNumber?: string;
  transactionType?: any;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
}

@Injectable()
export class FinancialStatementsService {
  private readonly logger = new Logger(FinancialStatementsService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private journalService: JournalService,
  ) {}

  /**
   * Get Income Statement (Laporan Laba Rugi)
   * Shows Revenue - Expenses = Net Income for a period
   */
  async getIncomeStatement(query: FinancialStatementQueryDto) {
    const { startDate, endDate, includeInactive = false } = query;

    // Validate required parameters for income statement
    if (!startDate) {
      throw new Error("startDate is required for income statement");
    }

    // Get all revenue and expense accounts
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        accountType: { in: ["REVENUE", "EXPENSE"] },
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    // FIX 1 (N+1): single groupBy query instead of one GL query per account.
    // Prisma groupBy cannot filter on relations, so we use $queryRaw to push
    // the isPosted + date filter into one round-trip.  The WHERE clause mirrors
    // the per-account filters exactly: entryDate in [startDate, endDate] AND
    // the parent JournalEntry is posted.
    type GlSum = { accountId: string; totalDebit: string; totalCredit: string };
    const glSums: GlSum[] = await this.prisma.$queryRaw`
      SELECT gl."accountId",
             CAST(SUM(gl.debit)  AS TEXT) AS "totalDebit",
             CAST(SUM(gl.credit) AS TEXT) AS "totalCredit"
      FROM   general_ledger gl
      JOIN   journal_entries je ON je.id = gl."journalEntryId"
      WHERE  je."isPosted" = true
        AND  gl."entryDate" >= ${startDate}
        AND  gl."entryDate" <= ${endDate}
      GROUP BY gl."accountId"
    `;

    // Build a Map for O(1) lookup
    const sumMap = new Map<string, { totalDebit: number; totalCredit: number }>(
      glSums.map((r) => [
        r.accountId,
        { totalDebit: Number(r.totalDebit), totalCredit: Number(r.totalCredit) },
      ]),
    );

    // Join sums to accounts in memory — identical logic to the original per-account loop
    const accountBalances = accounts.map((account) => {
      const sums = sumMap.get(account.id) ?? { totalDebit: 0, totalCredit: 0 };
      const { totalDebit, totalCredit } = sums;

        // For income statement, revenue is credit balance, expenses are debit balance
        let balance = 0;
        if (account.accountType === "REVENUE") {
          balance = totalCredit - totalDebit; // Revenue increases with credits
        } else {
          balance = totalDebit - totalCredit; // Expenses increase with debits
        }

        return {
          accountCode: account.code,
          accountName: account.name,
          accountNameId: account.nameId,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          balance,
          totalDebit,
          totalCredit,
        };
    });

    // Filter out zero balances
    const nonZeroBalances = accountBalances.filter(
      (b) => Math.abs(b.balance) > 0.01,
    );

    // Separate revenue and expenses
    const revenue = nonZeroBalances.filter((b) => b.accountType === "REVENUE");
    const expenses = nonZeroBalances.filter((b) => b.accountType === "EXPENSE");

    // Group expenses by subtype
    const expensesByType = expenses.reduce(
      (acc, expense) => {
        const type = expense.accountSubType || "OTHER_EXPENSE";
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(expense);
        return acc;
      },
      {} as Record<string, typeof expenses>,
    );

    // Calculate totals
    const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    // Get depreciation breakdown (PSAK 16)
    const depreciationBreakdown =
      await this.getDepreciationBreakdownForIncomeStatement(startDate, endDate);

    return {
      period: {
        startDate,
        endDate,
      },
      revenue: {
        accounts: revenue,
        total: totalRevenue,
      },
      expenses: {
        accounts: expenses,
        byType: expensesByType,
        total: totalExpenses,
      },
      depreciation: depreciationBreakdown,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      },
    };
  }

  /**
   * Get depreciation breakdown for Income Statement (PSAK 16)
   */
  private async getDepreciationBreakdownForIncomeStatement(
    startDate: Date,
    endDate: Date,
  ) {
    // Get all depreciation entries for the period
    const depreciationEntries = await this.prisma.depreciationEntry.findMany({
      where: {
        periodDate: { gte: startDate, lte: endDate },
        status: "POSTED",
      },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            category: true,
          },
        },
        schedule: {
          select: {
            method: true,
          },
        },
      },
      orderBy: { periodDate: "asc" },
    });

    // Group by category
    const byCategory = depreciationEntries.reduce(
      (acc, entry) => {
        const category = entry.asset.category;
        if (!acc[category]) {
          acc[category] = {
            category,
            count: 0,
            totalDepreciation: 0,
            entries: [],
          };
        }
        acc[category].count++;
        acc[category].totalDepreciation += Number(entry.depreciationAmount);
        acc[category].entries.push({
          assetId: entry.asset.id,
          assetCode: entry.asset.assetCode,
          assetName: entry.asset.name,
          periodDate: entry.periodDate,
          depreciationAmount: Number(entry.depreciationAmount),
          method: entry.schedule.method,
        });
        return acc;
      },
      {} as Record<string, any>,
    );

    // Group by month
    const byMonth = depreciationEntries.reduce(
      (acc, entry) => {
        const monthKey = entry.periodDate.toISOString().slice(0, 7); // YYYY-MM
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            totalDepreciation: 0,
            entryCount: 0,
          };
        }
        acc[monthKey].totalDepreciation += Number(entry.depreciationAmount);
        acc[monthKey].entryCount++;
        return acc;
      },
      {} as Record<string, any>,
    );

    const totalDepreciation = depreciationEntries.reduce(
      (sum, e) => sum + Number(e.depreciationAmount),
      0,
    );

    return {
      byCategory,
      byMonth,
      summary: {
        totalDepreciation,
        entryCount: depreciationEntries.length,
        assetsDepreciated: new Set(depreciationEntries.map((e) => e.asset.id))
          .size,
      },
    };
  }

  /**
   * Get Balance Sheet (Neraca)
   * Shows Assets = Liabilities + Equity as of a specific date
   */
  async getBalanceSheet(query: FinancialStatementQueryDto) {
    const { endDate, includeInactive = false } = query;

    // Get all asset, liability, and equity accounts
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        accountType: { in: ["ASSET", "LIABILITY", "EQUITY"] },
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    // FIX 1 (N+1): single grouped query for all BS account sums instead of
    // one GL query per account.  Mirrors the original filter exactly:
    // entryDate <= endDate AND journalEntry.isPosted = true.
    type GlSumBS = { accountId: string; totalDebit: string; totalCredit: string };
    const glSumsBS: GlSumBS[] = await this.prisma.$queryRaw`
      SELECT gl."accountId",
             CAST(SUM(gl.debit)  AS TEXT) AS "totalDebit",
             CAST(SUM(gl.credit) AS TEXT) AS "totalCredit"
      FROM   general_ledger gl
      JOIN   journal_entries je ON je.id = gl."journalEntryId"
      WHERE  je."isPosted" = true
        AND  gl."entryDate" <= ${endDate}
      GROUP BY gl."accountId"
    `;

    const bsSumMap = new Map<string, { totalDebit: number; totalCredit: number }>(
      glSumsBS.map((r) => [
        r.accountId,
        { totalDebit: Number(r.totalDebit), totalCredit: Number(r.totalCredit) },
      ]),
    );

    // Calculate balance for each account as of the end date — same logic as before
    const accountBalances = accounts.map((account) => {
        const sums = bsSumMap.get(account.id) ?? { totalDebit: 0, totalCredit: 0 };
        const { totalDebit, totalCredit } = sums;

        // Calculate balance based on normal balance type
        let balance = 0;
        if (account.normalBalance === "DEBIT") {
          balance = totalDebit - totalCredit;
        } else {
          balance = totalCredit - totalDebit;
        }

        // ✅ FIX: Detect contra accounts and invert sign for Balance Sheet presentation
        // Contra accounts REDUCE the main account balance, so display as negative
        const isContraAccount =
          (account.accountType === "ASSET" &&
            account.normalBalance === "CREDIT") ||
          (account.accountType === "LIABILITY" &&
            account.normalBalance === "DEBIT") ||
          (account.accountType === "EQUITY" &&
            account.normalBalance === "DEBIT");

        // Invert sign for contra accounts on Balance Sheet
        const displayBalance = isContraAccount ? -balance : balance;

        return {
          accountCode: account.code,
          accountName: account.name,
          accountNameId: account.nameId,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          normalBalance: account.normalBalance,
          balance: displayBalance, // Display balance (negative for contra accounts)
          actualBalance: balance, // Raw balance for auditing
          isContraAccount, // Flag for frontend
          totalDebit,
          totalCredit,
        };
    });

    // Filter out zero balances
    const nonZeroBalances = accountBalances.filter(
      (b) => Math.abs(b.balance) > 0.01,
    );

    // Separate by account type
    const assets = nonZeroBalances.filter((b) => b.accountType === "ASSET");
    const liabilities = nonZeroBalances.filter(
      (b) => b.accountType === "LIABILITY",
    );
    const equity = nonZeroBalances.filter((b) => b.accountType === "EQUITY");

    // Group assets by subtype
    const assetsByType = assets.reduce(
      (acc, asset) => {
        const type = asset.accountSubType || "OTHER_ASSET";
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(asset);
        return acc;
      },
      {} as Record<string, typeof assets>,
    );

    // Group liabilities by subtype
    const liabilitiesByType = liabilities.reduce(
      (acc, liability) => {
        const type = liability.accountSubType || "OTHER_LIABILITY";
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(liability);
        return acc;
      },
      {} as Record<string, typeof liabilities>,
    );

    // ✅ FIX: Calculate Undistributed Earnings (Laba Rugi Belum Dibagi)
    // If no year-end closing has been performed, all revenue and expenses since
    // the beginning of time are still "open" in their respective accounts.
    // We must sum ALL GL entries up to endDate for revenue/expense accounts —
    // not just the current fiscal year — because prior-year amounts have not
    // been closed to Retained Earnings yet.
    //
    // After a year-end closing, the closing entry zeroes out revenue/expense
    // accounts and credits Retained Earnings (3-2010), so the all-time sum
    // naturally reflects only the unclosed post-closing balance.

    const fiscalYearStart = new Date(endDate.getFullYear(), 0, 1); // kept for reporting only

    // Get revenue and expense accounts
    const revenueExpenseAccounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        accountType: { in: ["REVENUE", "EXPENSE"] },
        isActive: true,
      },
    });

    // FIX 1 (N+1): reuse the glSumsBS map already computed above (same filter:
    // entryDate <= endDate AND isPosted = true) — no additional DB queries needed.
    // This is the all-time cumulative net income calculation for the balance sheet.
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of revenueExpenseAccounts) {
      const sums = bsSumMap.get(account.id) ?? { totalDebit: 0, totalCredit: 0 };
      const { totalDebit: debit, totalCredit: credit } = sums;

      if (account.accountType === "REVENUE") {
        totalRevenue += credit - debit; // Revenue increases with credits
      } else {
        totalExpenses += debit - credit; // Expenses increase with debits
      }
    }

    const currentYearEarnings = totalRevenue - totalExpenses;

    // ✅ Add Current Year Earnings as virtual equity account
    const currentYearEarningsAccount = {
      accountCode: "3-3010",
      accountName: "Current Year Profit/Loss",
      accountNameId: "Laba/Rugi Tahun Berjalan",
      accountType: "EQUITY" as const,
      accountSubType: "CURRENT_EARNINGS" as const,
      normalBalance: "CREDIT" as const,
      balance: currentYearEarnings,
      totalDebit: 0,
      totalCredit: currentYearEarnings,
    };

    // Add to equity accounts if net income is non-zero
    const equityWithEarnings =
      Math.abs(currentYearEarnings) > 0.01
        ? [...equity, currentYearEarningsAccount]
        : equity;

    // Calculate totals
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquityBeforeEarnings = equity.reduce(
      (sum, e) => sum + e.balance,
      0,
    );
    const totalEquity = totalEquityBeforeEarnings + currentYearEarnings;

    // Get depreciation details (PSAK 16)
    const depreciationDetails =
      await this.getDepreciationDetailsForBalanceSheet(endDate);

    return {
      asOfDate: endDate,
      assets: {
        accounts: assets,
        byType: assetsByType,
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities,
        byType: liabilitiesByType,
        total: totalLiabilities,
      },
      equity: {
        accounts: equityWithEarnings,
        total: totalEquity,
        // ✅ Breakdown of equity components
        capitalAccounts: totalEquityBeforeEarnings,
        currentYearEarnings: currentYearEarnings,
      },
      depreciation: depreciationDetails,
      // Cumulative income statement summary (all-time, no closing entries run yet)
      incomeStatement: {
        fiscalYearStart,
        totalRevenue,
        totalExpenses,
        netIncome: currentYearEarnings,
        note: "Cumulative revenue and expenses since inception (no year-end closing performed)",
      },
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        liabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced:
          Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        difference: totalAssets - (totalLiabilities + totalEquity),
      },
    };
  }

  /**
   * Get depreciation details for Balance Sheet (PSAK 16)
   */
  private async getDepreciationDetailsForBalanceSheet(asOfDate: Date) {
    // Get all assets with depreciation schedules
    const assets = await this.prisma.asset.findMany({
      where: {
        status: {
          in: ["AVAILABLE", "RESERVED", "CHECKED_OUT", "IN_MAINTENANCE"],
        },
        purchaseDate: { lte: asOfDate },
      },
      include: {
        depreciationSchedules: {
          where: { isActive: true },
        },
        depreciationEntries: {
          where: {
            periodDate: { lte: asOfDate },
            status: "POSTED",
          },
          orderBy: { periodDate: "desc" },
          take: 1, // Get latest entry for each asset
        },
      },
    });

    const assetDetails = assets.map((asset) => {
      const latestEntry = asset.depreciationEntries[0];
      const schedule = asset.depreciationSchedules[0];

      if (!latestEntry || !schedule) {
        // Asset without depreciation yet
        return {
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.name,
          category: asset.category,
          purchasePrice: Number(asset.purchasePrice),
          accumulatedDepreciation: 0,
          netBookValue: Number(asset.purchasePrice),
          depreciationMethod: null,
        };
      }

      return {
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        category: asset.category,
        purchasePrice: Number(asset.purchasePrice),
        accumulatedDepreciation: Number(latestEntry.accumulatedDepreciation),
        netBookValue: Number(latestEntry.bookValue),
        depreciationMethod: schedule.method,
      };
    });

    // Calculate totals
    const totalPurchasePrice = assetDetails.reduce(
      (sum, a) => sum + a.purchasePrice,
      0,
    );
    const totalAccumulatedDepreciation = assetDetails.reduce(
      (sum, a) => sum + a.accumulatedDepreciation,
      0,
    );
    const totalNetBookValue = assetDetails.reduce(
      (sum, a) => sum + a.netBookValue,
      0,
    );

    // Group by category
    const byCategory = assetDetails.reduce(
      (acc, asset) => {
        if (!acc[asset.category]) {
          acc[asset.category] = {
            category: asset.category,
            count: 0,
            purchasePrice: 0,
            accumulatedDepreciation: 0,
            netBookValue: 0,
          };
        }
        acc[asset.category].count++;
        acc[asset.category].purchasePrice += asset.purchasePrice;
        acc[asset.category].accumulatedDepreciation +=
          asset.accumulatedDepreciation;
        acc[asset.category].netBookValue += asset.netBookValue;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      assetDetails,
      byCategory,
      summary: {
        totalAssets: assets.length,
        totalPurchasePrice,
        totalAccumulatedDepreciation,
        totalNetBookValue,
        depreciationRatio:
          totalPurchasePrice > 0
            ? totalAccumulatedDepreciation / totalPurchasePrice
            : 0,
      },
    };
  }

  /**
   * Get Cash Flow Statement (Laporan Arus Kas)
   * Shows cash inflows and outflows for a period
   */
  async getCashFlowStatement(query: FinancialStatementQueryDto) {
    const { startDate, endDate } = query;

    // Validate required parameters for cash flow statement
    if (!startDate) {
      throw new Error("startDate is required for cash flow statement");
    }

    // Get cash and bank accounts
    const cashAccounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        code: { in: ["1-1010", "1-1020"] }, // Cash and Bank accounts
        isActive: true,
      },
    });

    // Get all cash transactions for the period
    const cashTransactions = await this.prisma.generalLedger.findMany({
      where: {
        accountId: { in: cashAccounts.map((a) => a.id) },
        entryDate: { gte: startDate, lte: endDate },
        journalEntry: { isPosted: true },
      },
      include: {
        journalEntry: {
          select: {
            entryNumber: true,
            description: true,
            descriptionId: true,
            transactionType: true,
          },
        },
      },
      orderBy: { entryDate: "asc" },
    });

    // Categorize cash flows
    const operatingActivities: CashFlowActivity[] = [];
    const investingActivities: CashFlowActivity[] = [];
    const financingActivities: CashFlowActivity[] = [];

    for (const transaction of cashTransactions) {
      const cashFlow = {
        date: transaction.entryDate,
        description: transaction.description,
        descriptionId: transaction.descriptionId,
        entryNumber: transaction.journalEntry?.entryNumber,
        transactionType: transaction.journalEntry?.transactionType,
        cashIn: Number(transaction.debit), // Cash increases with debits
        cashOut: Number(transaction.credit), // Cash decreases with credits
        netCashFlow: Number(transaction.debit) - Number(transaction.credit),
      };

      // Categorize based on transaction type
      // NOTE: DEPRECIATION entries never touch a cash account (Dr 6-30xx / Cr 1-40xx),
      // so they will never appear in cashTransactions and this branch is unreachable
      // here.  The add-back is handled separately below via indirect method.
      const txType = transaction.journalEntry?.transactionType;
      if (
        txType === "INVOICE_SENT" ||
        txType === "PAYMENT_RECEIVED" ||
        txType === "EXPENSE_SUBMITTED" ||
        txType === "EXPENSE_PAID" ||
        txType === "PAYMENT_MADE"
      ) {
        operatingActivities.push(cashFlow);
      } else if (txType === "DEPRECIATION") {
        // DEPRECIATION is a non-cash charge — it does not move cash, so it
        // should never be in investingActivities.  Kept here as a safety guard.
        investingActivities.push(cashFlow);
      } else {
        financingActivities.push(cashFlow);
      }
    }

    // ── Indirect-method: depreciation add-back ────────────────────────────────
    // Depreciation reduces net income but does NOT consume cash.  Under the
    // indirect method we must add it back to arrive at operating cash flow.
    // We fetch posted DEPRECIATION journal entries for the period and sum the
    // debit to the depreciation-expense account (6-30xx).
    const depreciationJournals = await this.prisma.journalEntry.findMany({
      where: {
        transactionType: "DEPRECIATION" as any,
        isPosted: true,
        entryDate: { gte: startDate, lte: endDate },
      },
      include: {
        lineItems: {
          include: {
            account: { select: { code: true } },
          },
        },
      },
    });

    let depreciationAddBack = 0;
    for (const je of depreciationJournals) {
      for (const line of je.lineItems) {
        // Depreciation-expense accounts: 6-30xx
        if (/^6-30/.test(line.account.code) && Number(line.debit) > 0) {
          depreciationAddBack += Number(line.debit);
        }
      }
    }

    // Calculate totals
    const calculateTotal = (activities: CashFlowActivity[]) => {
      return activities.reduce((sum, a) => sum + a.netCashFlow, 0);
    };

    const operatingCashFlowBeforeAddBack = calculateTotal(operatingActivities);
    // Add depreciation back to operating cash flow (non-cash charge)
    const operatingCashFlow = operatingCashFlowBeforeAddBack + depreciationAddBack;
    const investingCashFlow = calculateTotal(investingActivities);
    const financingCashFlow = calculateTotal(financingActivities);
    const netCashFlow =
      operatingCashFlow + investingCashFlow + financingCashFlow;

    // Get opening and closing balances
    const openingBalance = await this.getCashBalance(
      cashAccounts.map((a) => a.id),
      startDate,
    );
    const closingBalance = openingBalance + netCashFlow;

    return {
      period: {
        startDate,
        endDate,
      },
      operatingActivities: {
        transactions: operatingActivities,
        netCashFlow: operatingCashFlow,
        // Non-cash adjustments (indirect method)
        nonCashAdjustments: {
          depreciationAddBack,
        },
      },
      investingActivities: {
        transactions: investingActivities,
        netCashFlow: investingCashFlow,
      },
      financingActivities: {
        transactions: financingActivities,
        netCashFlow: financingCashFlow,
      },
      summary: {
        openingBalance,
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        closingBalance,
        depreciationAddBack,
      },
    };
  }

  /**
   * Helper: Get cash balance as of a date
   */
  private async getCashBalance(
    accountIds: string[],
    asOfDate: Date,
  ): Promise<number> {
    const entries = await this.prisma.generalLedger.findMany({
      where: {
        accountId: { in: accountIds },
        entryDate: { lt: asOfDate },
        journalEntry: { isPosted: true },
      },
    });

    const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);

    return totalDebit - totalCredit; // Cash accounts have debit normal balance
  }

  /**
   * Get Accounts Receivable Report (Laporan Piutang)
   */
  async getAccountsReceivableReport(query: FinancialStatementQueryDto) {
    const { endDate } = query;

    // endDate already arrives as the INCLUSIVE end of the WIB calendar day (the
    // DTO's @WibEndOfDay transform), so a `<= endDate` cutoff correctly keeps
    // everything timestamped through the end of that WIB day.
    const endDateInclusive = endDate;

    // Use ledger service for AR aging
    const aging = await this.ledgerService.getAccountsReceivableAging(
      endDateInclusive,
    );

    // Get AR account
    const arAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "1-2010" }, // Accounts Receivable
    });

    if (!arAccount) {
      throw new Error("Accounts Receivable account (1-2010) not found");
    }

    // Get AR balance from ledger
    const arBalance = await this.prisma.generalLedger.findMany({
      where: {
        accountId: arAccount.id,
        entryDate: { lte: endDateInclusive },
        journalEntry: { isPosted: true },
      },
    });

    const totalDebit = arBalance.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = arBalance.reduce((sum, e) => sum + Number(e.credit), 0);
    const netARBalance = totalDebit - totalCredit;

    // Other Receivables (1-2040) GL net — the AUTHORITATIVE balance, computed the
    // same way as Trade AR so the AR page always reconciles with the journal
    // entries / balance sheet. The Expense-derived itemisation below is supporting
    // detail; manual journal activity on 1-2040 (e.g. a hand-written clearing
    // entry) is captured here even though it touches no Expense row.
    const orAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "1-2040" }, // Piutang Lain-lain / Other Receivables
    });
    // Fail loudly if the account is missing rather than silently reporting 0 —
    // mirrors the Trade-AR (1-2010) guard above so a misconfigured COA surfaces.
    if (!orAccount) {
      throw new Error("Other Receivables account (1-2040) not found");
    }
    let glOtherReceivablesNet = 0;
    {
      const orLedger = await this.prisma.generalLedger.findMany({
        where: {
          accountId: orAccount.id,
          entryDate: { lte: endDateInclusive },
          journalEntry: { isPosted: true },
        },
      });
      glOtherReceivablesNet = orLedger.reduce(
        (sum, e) => sum + Number(e.debit) - Number(e.credit),
        0,
      );
    }

    // Piutang Lain-lain (Other Receivables, 1-2040) — NON-sales receivables from
    // reimbursable pass-through expenses. Reported as a SEPARATE line from trade
    // AR (1-2010): it must never be commingled with sales receivables.
    //
    // Derived from the EXPENSE table rather than the raw GL net so we can itemise
    // WHICH expense/client/project each receivable belongs to (a single GL number
    // can't). To keep the reported BALANCE reconciled with the 1-2040 GL account,
    // the deferred-posting model matters: a reimbursable hits 1-2040 only when the
    // invoice that bills it is SENT (paymentJournalId is then stamped). So:
    //   • pending   — recorded on a project but not yet invoiced (paymentJournalId
    //                 null): NOT in the GL, excluded from the owed balance.
    //   • posted    — invoiced/SENT (paymentJournalId set), not yet reimbursed
    //                 (reimbursedAt null): this IS the 1-2040 balance.
    //   • collected — reimbursed (reimbursedAt set): cleared from 1-2040, shown
    //                 for audit history only.
    const reimbursables = await this.prisma.expense.findMany({
      where: {
        isBillable: true,
        expenseDate: { lte: endDateInclusive },
      },
      select: {
        id: true,
        expenseNumber: true,
        expenseDate: true,
        vendorName: true,
        description: true,
        totalAmount: true,
        billableAmount: true,
        reimbursedAt: true,
        paymentJournalId: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, number: true, description: true } },
      },
      orderBy: { expenseDate: "desc" },
    });
    const otherReceivableItems = reimbursables.map((e) => {
      const collected = e.reimbursedAt !== null;
      const posted = e.paymentJournalId !== null;
      return {
        expenseId: e.id,
        expenseNumber: e.expenseNumber,
        date: e.expenseDate,
        vendorName: e.vendorName,
        description: e.description,
        // Amount recoverable from the client (defaults to the full total).
        amount: Number(e.billableAmount ?? e.totalAmount),
        reimbursedAt: e.reimbursedAt,
        collected,
        // Posted to 1-2040 (invoiced) but not yet reimbursed — the owed balance.
        posted,
        // Recorded but not yet billed to the client (not in the GL yet).
        pending: !posted && !collected,
        client: e.client,
        project: e.project,
      };
    });
    // Expense-derived "owed" = posted to 1-2040 (invoiced) and not yet reimbursed.
    // In the normal flow this equals the 1-2040 GL net. But a manual journal that
    // touches 1-2040 without flipping an Expense flag (e.g. a hand-written clearing
    // entry) makes them diverge — so the GL net is AUTHORITATIVE for the headline
    // balance, and we surface the gap as a reconciling line.
    const itemsOutstandingSum = otherReceivableItems
      .filter((e) => e.posted && !e.collected)
      .reduce((sum, e) => sum + e.amount, 0);
    const otherReceivablesCollected = otherReceivableItems
      .filter((e) => e.collected)
      .reduce((sum, e) => sum + e.amount, 0);
    // Headline balance = the 1-2040 GL net, so it ALWAYS ties out to the journal
    // entries and the balance sheet.
    const otherReceivablesBalance = glOtherReceivablesNet;
    // Non-zero when manual GL adjustments on 1-2040 aren't reflected in the items
    // (so the breakdown still ties to the headline). Positive = unexplained GL
    // receivable; negative = items show more outstanding than the GL actually holds
    // (e.g. a reimbursable cleared by a manual journal, not the "Record" button).
    const otherReceivablesReconciling =
      glOtherReceivablesNet - itemsOutstandingSum;

    // Get top customers by OUTSTANDING AR. groupBy _sum.totalAmount can't net
    // out payments, so it overstated per-client AR and disagreed with the net
    // AR balance above. Fetch invoices with payments and sum the remaining
    // (total − CONFIRMED payments) per client instead.
    const arInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "OVERDUE"] },
        creationDate: { lte: endDateInclusive },
      },
      select: {
        clientId: true,
        totalAmount: true,
        priceBreakdown: true,
        payments: { select: { amount: true, status: true } },
      },
    });

    const byClient = new Map<string, { outstanding: number; count: number }>();
    for (const inv of arInvoices) {
      const paid = inv.payments.reduce(
        (s, p) => (p.status === "CONFIRMED" ? s + Number(p.amount || 0) : s),
        0,
      );
      // Trade-AR outstanding = SERVICES portion (reimburse lives in 1-2040), with
      // payments applied services-first. Keeps top-customer AR off reimbursables.
      const servicesAmount = servicesPortionOf(inv);
      const outstanding = Math.max(0, servicesAmount - Math.min(paid, servicesAmount));
      if (outstanding <= 0) continue;
      const e = byClient.get(inv.clientId) || { outstanding: 0, count: 0 };
      e.outstanding += outstanding;
      e.count += 1;
      byClient.set(inv.clientId, e);
    }

    const topCustomers = await Promise.all(
      [...byClient.entries()]
        .sort((a, b) => b[1].outstanding - a[1].outstanding)
        .slice(0, 10)
        .map(async ([clientId, agg]) => {
          const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, name: true, email: true },
          });
          return {
            client,
            outstandingAmount: agg.outstanding,
            invoiceCount: agg.count,
          };
        }),
    );

    return {
      asOfDate: endDate,
      arBalance: netARBalance,
      // Trade AR (1-2010, sales) and Other Receivables (1-2040, non-sales
      // reimbursables) reported separately.
      tradeReceivables: {
        accountCode: "1-2010",
        name: arAccount.name,
        nameId: arAccount.nameId,
        balance: netARBalance,
      },
      otherReceivables: {
        accountCode: "1-2040",
        name: "Other Receivables",
        nameId: "Piutang Lain-Lain",
        balance: otherReceivablesBalance, // GL 1-2040 net (authoritative)
        collected: otherReceivablesCollected, // already reimbursed (history)
        // Sum of outstanding itemised reimbursables; differs from `balance` only
        // when a manual journal touched 1-2040 outside the expense flow.
        itemsOutstanding: itemsOutstandingSum,
        // GL − items. Non-zero ⇒ manual GL adjustment not tied to an expense.
        reconcilingAdjustment: otherReceivablesReconciling,
        // Itemised reimbursables (outstanding + collected, each flagged) so the
        // AR page shows WHICH expense / client / project each belongs to.
        items: otherReceivableItems,
      },
      aging,
      topCustomers,
      summary: {
        totalOutstanding: aging.summary.totalAR,
        currentOutstanding: aging.summary.current,
        overdueOutstanding:
          Number(aging.summary.days1to30) +
          Number(aging.summary.days31to60) +
          Number(aging.summary.days61to90) +
          Number(aging.summary.over90),
        customerCount: byClient.size,
        // Receivable split (GL balances) + grand total of all receivables.
        tradeReceivablesBalance: netARBalance,
        otherReceivablesBalance,
        totalReceivablesBalance: netARBalance + otherReceivablesBalance,
      },
    };
  }

  /**
   * Get Accounts Payable Report (Laporan Hutang)
   */
  async getAccountsPayableReport(query: FinancialStatementQueryDto) {
    const { endDate } = query;

    // Use ledger service for AP aging
    const aging = await this.ledgerService.getAccountsPayableAging(
      new Date(endDate),
    );

    // Get AP account
    const apAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "2-1010" }, // Accounts Payable
    });

    if (!apAccount) {
      throw new Error("Accounts Payable account (2-1010) not found");
    }

    // Get AP balance from ledger
    const apBalance = await this.prisma.generalLedger.findMany({
      where: {
        accountId: apAccount.id,
        entryDate: { lte: endDate },
        journalEntry: { isPosted: true },
      },
    });

    const totalDebit = apBalance.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = apBalance.reduce((sum, e) => sum + Number(e.credit), 0);
    const netAPBalance = totalCredit - totalDebit; // AP has credit normal balance

    // Get top expense categories
    const expensesByCategory = await this.prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        status: { in: ["SUBMITTED", "APPROVED"] },
        expenseDate: { lte: endDate },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const topCategories = await Promise.all(
      expensesByCategory
        .sort(
          (a, b) =>
            Number(b._sum.totalAmount || 0) - Number(a._sum.totalAmount || 0),
        )
        .slice(0, 10)
        .map(async (group) => {
          const category = await this.prisma.expenseCategory.findUnique({
            where: { id: group.categoryId },
            select: { code: true, name: true, nameId: true },
          });
          return {
            category,
            outstandingAmount: Number(group._sum.totalAmount || 0),
            expenseCount: group._count.id,
          };
        }),
    );

    return {
      asOfDate: endDate,
      apBalance: netAPBalance,
      aging,
      topCategories,
      summary: {
        totalOutstanding: aging.summary.totalAP,
        currentOutstanding: aging.summary.current,
        overdueOutstanding:
          Number(aging.summary.days1to30) +
          Number(aging.summary.days31to60) +
          Number(aging.summary.days61to90) +
          Number(aging.summary.over90),
        categoryCount: expensesByCategory.length,
      },
    };
  }

  /**
   * Save financial statement snapshot
   */
  async saveFinancialStatement(
    type: StatementType,
    fiscalPeriodId: string,
    data: any,
    userId: string,
  ) {
    const period = await this.prisma.fiscalPeriod.findUnique({
      where: { id: fiscalPeriodId },
    });

    if (!period) {
      throw new Error("Fiscal period not found");
    }

    const statement = await this.prisma.financialStatement.create({
      data: {
        fiscalPeriodId,
        statementType: type,
        startDate: period.startDate,
        endDate: period.endDate,
        data,
        generatedAt: new Date(),
        generatedBy: userId,
      },
    });

    return statement;
  }

  /**
   * Get saved financial statement
   */
  async getSavedFinancialStatement(
    type: StatementType,
    fiscalPeriodId: string,
  ) {
    return this.prisma.financialStatement.findFirst({
      where: {
        statementType: type,
        fiscalPeriodId,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });
  }

  /**
   * ✅ Year-End Closing Process
   *
   * Closes revenue and expense accounts to retained earnings at fiscal year end.
   * This process:
   * 1. Calculates net income for the fiscal year
   * 2. Creates closing journal entry to zero out revenue/expense accounts
   * 3. Transfers net income to Retained Earnings (3-2010)
   *
   * After closing, Current Year Earnings (3-3010) becomes Retained Earnings (3-2010)
   *
   * @param fiscalYearEndDate - Last day of the fiscal year
   * @param userId - User performing the closing
   * @returns Closing journal entry and summary
   */
  async performYearEndClosing(fiscalYearEndDate: Date, userId: string) {
    this.logger.log(
      `Starting year-end closing for fiscal year ending ${fiscalYearEndDate.toISOString()}`,
    );

    const closingYear = fiscalYearEndDate.getFullYear();

    // FIX 5 — idempotency guard: if a closing entry already exists for this
    // year, reject the call immediately so a double-click or retry cannot
    // create a second closing entry and unbalance the ledger.
    const existingClosing = await this.prisma.journalEntry.findFirst({
      where: {
        transactionId: `CLOSING-${closingYear}`,
        transactionType: TransactionType.YEAR_END_CLOSING,
      },
      select: { id: true, entryNumber: true },
    });
    if (existingClosing) {
      throw new ConflictException(
        `Year-end closing for ${closingYear} has already been performed (entry ${existingClosing.entryNumber}). Use the existing closing entry or reverse it first.`,
      );
    }

    // Determine fiscal year start date
    const fiscalYearStart = new Date(closingYear, 0, 1);

    // Get all revenue and expense accounts
    const revenueExpenseAccounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        accountType: { in: ["REVENUE", "EXPENSE"] },
        isActive: true,
      },
    });

    // Calculate net income and build closing entries
    // FIX 1 (N+1): batch all account sums in one query instead of per-account GL fetches.
    type GlSumClose = { accountId: string; totalDebit: string; totalCredit: string };
    const glSumsClose: GlSumClose[] = await this.prisma.$queryRaw`
      SELECT gl."accountId",
             CAST(SUM(gl.debit)  AS TEXT) AS "totalDebit",
             CAST(SUM(gl.credit) AS TEXT) AS "totalCredit"
      FROM   general_ledger gl
      JOIN   journal_entries je ON je.id = gl."journalEntryId"
      WHERE  je."isPosted" = true
        AND  gl."entryDate" >= ${fiscalYearStart}
        AND  gl."entryDate" <= ${fiscalYearEndDate}
      GROUP BY gl."accountId"
    `;
    const closeSumMap = new Map<string, { debit: number; credit: number }>(
      glSumsClose.map((r) => [
        r.accountId,
        { debit: Number(r.totalDebit), credit: Number(r.totalCredit) },
      ]),
    );

    let totalRevenue = 0;
    let totalExpenses = 0;
    const closingLineItems: any[] = [];

    for (const account of revenueExpenseAccounts) {
      const { debit = 0, credit = 0 } = closeSumMap.get(account.id) ?? { debit: 0, credit: 0 };

      let accountBalance = 0;

      if (account.accountType === "REVENUE") {
        accountBalance = credit - debit; // Revenue credit balance
        totalRevenue += accountBalance;

        // Close revenue: Debit Revenue, Credit Income Summary
        if (Math.abs(accountBalance) > 0.01) {
          closingLineItems.push({
            accountCode: account.code,
            description: `Year-end closing: ${account.name}`,
            descriptionId: `Penutupan akhir tahun: ${account.nameId}`,
            debit: accountBalance, // Debit to close credit balance
            credit: 0,
          });
        }
      } else {
        accountBalance = debit - credit; // Expense debit balance
        totalExpenses += accountBalance;

        // Close expense: Debit Income Summary, Credit Expense
        if (Math.abs(accountBalance) > 0.01) {
          closingLineItems.push({
            accountCode: account.code,
            description: `Year-end closing: ${account.name}`,
            descriptionId: `Penutupan akhir tahun: ${account.nameId}`,
            debit: 0,
            credit: accountBalance, // Credit to close debit balance
          });
        }
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    // Transfer net income to Retained Earnings (3-2010)
    if (Math.abs(netIncome) > 0.01) {
      if (netIncome > 0) {
        // Profit: Debit Income Summary, Credit Retained Earnings
        closingLineItems.push({
          accountCode: "3-2010", // Retained Earnings
          description: `Net income for fiscal year ${fiscalYearEndDate.getFullYear()}`,
          descriptionId: `Laba bersih tahun fiskal ${fiscalYearEndDate.getFullYear()}`,
          debit: 0,
          credit: netIncome,
        });
      } else {
        // Loss: Debit Retained Earnings, Credit Income Summary
        closingLineItems.push({
          accountCode: "3-2010", // Retained Earnings
          description: `Net loss for fiscal year ${fiscalYearEndDate.getFullYear()}`,
          descriptionId: `Rugi bersih tahun fiskal ${fiscalYearEndDate.getFullYear()}`,
          debit: Math.abs(netIncome),
          credit: 0,
        });
      }
    }

    // Create closing journal entry
    const closingJournalEntry = await this.journalService.createJournalEntry({
      entryDate: fiscalYearEndDate,
      description: `Year-End Closing Entry for Fiscal Year ${fiscalYearEndDate.getFullYear()}`,
      descriptionId: `Jurnal Penutup Akhir Tahun Fiskal ${fiscalYearEndDate.getFullYear()}`,
      transactionType: TransactionType.YEAR_END_CLOSING,
      transactionId: `CLOSING-${fiscalYearEndDate.getFullYear()}`,
      documentNumber: `CLOSE-${fiscalYearEndDate.getFullYear()}`,
      documentDate: fiscalYearEndDate,
      createdBy: userId,
      lineItems: closingLineItems,
    });

    // Post the closing entry
    await this.journalService.postJournalEntry(closingJournalEntry.id, userId);

    // FIX 5 — lock all fiscal periods for the closed year so no further
    // entries can be posted into them. This runs after the closing entry is
    // successfully posted, making the operation safe to reason about: if
    // postJournalEntry throws, the periods remain OPEN and no partial state
    // is written.
    const lockedCount = await this.prisma.fiscalPeriod.updateMany({
      where: {
        startDate: { gte: fiscalYearStart },
        endDate: { lte: fiscalYearEndDate },
        status: { not: "CLOSED" },
      },
      data: { status: "CLOSED" },
    });
    this.logger.log(
      `🔒 Locked ${lockedCount.count} fiscal period(s) for year ${closingYear}`,
    );

    this.logger.log(
      `✅ Year-end closing completed. Net income: ${netIncome.toFixed(2)} transferred to Retained Earnings`,
    );

    return {
      closingJournalEntry,
      summary: {
        fiscalYearStart,
        fiscalYearEnd: fiscalYearEndDate,
        totalRevenue,
        totalExpenses,
        netIncome,
        closingEntryNumber: closingJournalEntry.entryNumber,
        accountsClosed: revenueExpenseAccounts.length,
      },
    };
  }
}
