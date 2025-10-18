import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { FinancialStatementQueryDto } from '../dto/financial-statement-query.dto';
import { AccountType, StatementType } from '@prisma/client';

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
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
  ) {}

  /**
   * Get Income Statement (Laporan Laba Rugi)
   * Shows Revenue - Expenses = Net Income for a period
   */
  async getIncomeStatement(query: FinancialStatementQueryDto) {
    const { startDate, endDate, includeInactive = false } = query;

    // Validate required parameters for income statement
    if (!startDate) {
      throw new Error('startDate is required for income statement');
    }

    // Get all revenue and expense accounts
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        accountType: { in: ['REVENUE', 'EXPENSE'] },
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ accountType: 'asc' }, { code: 'asc' }],
    });

    // Calculate balance for each account for the period
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const entries = await this.prisma.generalLedger.findMany({
          where: {
            accountId: account.id,
            entryDate: { gte: startDate, lte: endDate },
          },
        });

        const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
        const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);

        // For income statement, revenue is credit balance, expenses are debit balance
        let balance = 0;
        if (account.accountType === 'REVENUE') {
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
      }),
    );

    // Filter out zero balances
    const nonZeroBalances = accountBalances.filter(b => Math.abs(b.balance) > 0.01);

    // Separate revenue and expenses
    const revenue = nonZeroBalances.filter(b => b.accountType === 'REVENUE');
    const expenses = nonZeroBalances.filter(b => b.accountType === 'EXPENSE');

    // Group expenses by subtype
    const expensesByType = expenses.reduce((acc, expense) => {
      const type = expense.accountSubType || 'OTHER_EXPENSE';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(expense);
      return acc;
    }, {} as Record<string, typeof expenses>);

    // Calculate totals
    const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    // Get depreciation breakdown (PSAK 16)
    const depreciationBreakdown = await this.getDepreciationBreakdownForIncomeStatement(
      startDate,
      endDate
    );

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
    endDate: Date
  ) {
    // Get all depreciation entries for the period
    const depreciationEntries = await this.prisma.depreciationEntry.findMany({
      where: {
        periodDate: { gte: startDate, lte: endDate },
        status: 'POSTED',
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
      orderBy: { periodDate: 'asc' },
    });

    // Group by category
    const byCategory = depreciationEntries.reduce((acc, entry) => {
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
    }, {} as Record<string, any>);

    // Group by month
    const byMonth = depreciationEntries.reduce((acc, entry) => {
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
    }, {} as Record<string, any>);

    const totalDepreciation = depreciationEntries.reduce(
      (sum, e) => sum + Number(e.depreciationAmount),
      0
    );

    return {
      byCategory,
      byMonth,
      summary: {
        totalDepreciation,
        entryCount: depreciationEntries.length,
        assetsDepreciated: new Set(depreciationEntries.map((e) => e.asset.id)).size,
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
        accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ accountType: 'asc' }, { code: 'asc' }],
    });

    // Calculate balance for each account as of the end date
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const entries = await this.prisma.generalLedger.findMany({
          where: {
            accountId: account.id,
            entryDate: { lte: endDate },
          },
        });

        const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
        const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);

        // Calculate balance based on normal balance type
        let balance = 0;
        if (account.normalBalance === 'DEBIT') {
          balance = totalDebit - totalCredit;
        } else {
          balance = totalCredit - totalDebit;
        }

        return {
          accountCode: account.code,
          accountName: account.name,
          accountNameId: account.nameId,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          normalBalance: account.normalBalance,
          balance,
          totalDebit,
          totalCredit,
        };
      }),
    );

    // Filter out zero balances
    const nonZeroBalances = accountBalances.filter(b => Math.abs(b.balance) > 0.01);

    // Separate by account type
    const assets = nonZeroBalances.filter(b => b.accountType === 'ASSET');
    const liabilities = nonZeroBalances.filter(b => b.accountType === 'LIABILITY');
    const equity = nonZeroBalances.filter(b => b.accountType === 'EQUITY');

    // Group assets by subtype
    const assetsByType = assets.reduce((acc, asset) => {
      const type = asset.accountSubType || 'OTHER_ASSET';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(asset);
      return acc;
    }, {} as Record<string, typeof assets>);

    // Group liabilities by subtype
    const liabilitiesByType = liabilities.reduce((acc, liability) => {
      const type = liability.accountSubType || 'OTHER_LIABILITY';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(liability);
      return acc;
    }, {} as Record<string, typeof liabilities>);

    // Calculate totals
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

    // Get depreciation details (PSAK 16)
    const depreciationDetails = await this.getDepreciationDetailsForBalanceSheet(endDate);

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
        accounts: equity,
        total: totalEquity,
      },
      depreciation: depreciationDetails,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        liabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
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
        status: { in: ['AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'IN_MAINTENANCE'] },
        purchaseDate: { lte: asOfDate },
      },
      include: {
        depreciationSchedules: {
          where: { isActive: true },
        },
        depreciationEntries: {
          where: {
            periodDate: { lte: asOfDate },
            status: 'POSTED',
          },
          orderBy: { periodDate: 'desc' },
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
    const totalPurchasePrice = assetDetails.reduce((sum, a) => sum + a.purchasePrice, 0);
    const totalAccumulatedDepreciation = assetDetails.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
    const totalNetBookValue = assetDetails.reduce((sum, a) => sum + a.netBookValue, 0);

    // Group by category
    const byCategory = assetDetails.reduce((acc, asset) => {
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
      acc[asset.category].accumulatedDepreciation += asset.accumulatedDepreciation;
      acc[asset.category].netBookValue += asset.netBookValue;
      return acc;
    }, {} as Record<string, any>);

    return {
      assetDetails,
      byCategory,
      summary: {
        totalAssets: assets.length,
        totalPurchasePrice,
        totalAccumulatedDepreciation,
        totalNetBookValue,
        depreciationRatio: totalPurchasePrice > 0 ? totalAccumulatedDepreciation / totalPurchasePrice : 0,
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
      throw new Error('startDate is required for cash flow statement');
    }

    // Get cash and bank accounts
    const cashAccounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        code: { in: ['1-1010', '1-1020'] }, // Cash and Bank accounts
        isActive: true,
      },
    });

    // Get all cash transactions for the period
    const cashTransactions = await this.prisma.generalLedger.findMany({
      where: {
        accountId: { in: cashAccounts.map(a => a.id) },
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
      orderBy: { entryDate: 'asc' },
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
      const txType = transaction.journalEntry?.transactionType;
      if (
        txType === 'INVOICE_SENT' ||
        txType === 'PAYMENT_RECEIVED' ||
        txType === 'EXPENSE_SUBMITTED' ||
        txType === 'EXPENSE_PAID' ||
        txType === 'PAYMENT_MADE'
      ) {
        operatingActivities.push(cashFlow);
      } else if (txType === 'DEPRECIATION') {
        investingActivities.push(cashFlow);
      } else {
        financingActivities.push(cashFlow);
      }
    }

    // Calculate totals
    const calculateTotal = (activities: CashFlowActivity[]) => {
      return activities.reduce((sum, a) => sum + a.netCashFlow, 0);
    };

    const operatingCashFlow = calculateTotal(operatingActivities);
    const investingCashFlow = calculateTotal(investingActivities);
    const financingCashFlow = calculateTotal(financingActivities);
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    // Get opening and closing balances
    const openingBalance = await this.getCashBalance(
      cashAccounts.map(a => a.id),
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

    // Use ledger service for AR aging
    const aging = await this.ledgerService.getAccountsReceivableAging(endDate);

    // Get AR account
    const arAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '1-2010' }, // Accounts Receivable
    });

    if (!arAccount) {
      throw new Error('Accounts Receivable account (1-2010) not found');
    }

    // Get AR balance from ledger
    const arBalance = await this.prisma.generalLedger.findMany({
      where: {
        accountId: arAccount.id,
        entryDate: { lte: endDate },
        journalEntry: { isPosted: true },
      },
    });

    const totalDebit = arBalance.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = arBalance.reduce((sum, e) => sum + Number(e.credit), 0);
    const netARBalance = totalDebit - totalCredit;

    // Get top customers by AR balance
    const invoicesByClient = await this.prisma.invoice.groupBy({
      by: ['clientId'],
      where: {
        status: { in: ['SENT', 'OVERDUE'] },
        creationDate: { lte: endDate },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const topCustomers = await Promise.all(
      invoicesByClient
        .sort((a, b) => Number(b._sum.totalAmount || 0) - Number(a._sum.totalAmount || 0))
        .slice(0, 10)
        .map(async (group) => {
          const client = await this.prisma.client.findUnique({
            where: { id: group.clientId },
            select: { id: true, name: true, email: true },
          });
          return {
            client,
            outstandingAmount: group._sum.totalAmount || 0,
            invoiceCount: group._count.id,
          };
        }),
    );

    return {
      asOfDate: endDate,
      arBalance: netARBalance,
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
        customerCount: invoicesByClient.length,
      },
    };
  }

  /**
   * Get Accounts Payable Report (Laporan Hutang)
   */
  async getAccountsPayableReport(query: FinancialStatementQueryDto) {
    const { endDate } = query;

    // Use ledger service for AP aging
    const aging = await this.ledgerService.getAccountsPayableAging(endDate);

    // Get AP account
    const apAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: '2-1010' }, // Accounts Payable
    });

    if (!apAccount) {
      throw new Error('Accounts Payable account (2-1010) not found');
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
      by: ['categoryId'],
      where: {
        status: { in: ['SUBMITTED', 'APPROVED'] },
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
        .sort((a, b) => Number(b._sum.totalAmount || 0) - Number(a._sum.totalAmount || 0))
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
      throw new Error('Fiscal period not found');
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
        generatedAt: 'desc',
      },
    });
  }
}
