import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LedgerQueryDto,
  TrialBalanceQueryDto,
} from "../dto/financial-statement-query.dto";
import { AccountType, BalanceType } from "@prisma/client";

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get general ledger entries with filtering
   */
  async getGeneralLedger(query: LedgerQueryDto) {
    const {
      accountCode,
      accountType,
      startDate,
      endDate,
      fiscalPeriodId,
      includeInactive = false,
    } = query;

    const where: any = {};

    if (accountCode) {
      // Lookup account by code to get ID
      const account = await this.getAccountInfo(accountCode);
      where.accountId = account.id;
    }

    if (accountType) {
      // Get all accounts of this type
      const accounts = await this.prisma.chartOfAccounts.findMany({
        where: {
          accountType,
          isActive: includeInactive ? undefined : true,
        },
        select: { id: true },
      });
      where.accountId = { in: accounts.map((a) => a.id) };
    }

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = startDate;
      if (endDate) where.entryDate.lte = endDate;
    }

    if (fiscalPeriodId) {
      where.fiscalPeriodId = fiscalPeriodId;
    }

    const entries = await this.prisma.generalLedger.findMany({
      where,
      orderBy: [
        { accountId: "asc" },
        { entryDate: "asc" },
        { postingDate: "asc" },
      ],
      include: {
        account: {
          select: {
            code: true,
            name: true,
            nameId: true,
            normalBalance: true,
          },
        },
        journalEntry: {
          select: {
            entryNumber: true,
            description: true,
            descriptionId: true,
          },
        },
      },
    });

    // Calculate running balance for each account
    const entriesWithBalance = [];
    const accountBalances = new Map<string, number>();

    for (const entry of entries) {
      const account = entry.account;
      let currentBalance = accountBalances.get(entry.accountId) || 0;

      // Update balance based on normal balance type
      if (account.normalBalance === "DEBIT") {
        currentBalance += Number(entry.debit) - Number(entry.credit);
      } else {
        currentBalance += Number(entry.credit) - Number(entry.debit);
      }

      accountBalances.set(entry.accountId, currentBalance);

      entriesWithBalance.push({
        ...entry,
        runningBalance: currentBalance,
        accountCode: account.code,
        accountName: account.name,
        accountNameId: account.nameId,
      });
    }

    return {
      entries: entriesWithBalance,
      summary: {
        totalEntries: entries.length,
        totalDebit: entries.reduce((sum, e) => sum + Number(e.debit), 0),
        totalCredit: entries.reduce((sum, e) => sum + Number(e.credit), 0),
      },
    };
  }

  /**
   * Get ledger entries for specific account
   */
  async getAccountLedger(accountCode: string, query: LedgerQueryDto) {
    const account = await this.getAccountInfo(accountCode);

    const ledgerData = await this.getGeneralLedger({
      ...query,
      accountCode,
    });

    return {
      account,
      ...ledgerData,
    };
  }

  /**
   * Get account information
   */
  private async getAccountInfo(code: string) {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    return account;
  }

  /**
   * Calculate account balance for a period (startDate to endDate)
   * If startDate is null, calculate cumulative balance up to endDate
   */
  private async calculateAccountBalanceForPeriod(
    accountCode: string,
    startDate: Date | null,
    endDate: Date,
  ): Promise<number> {
    const account = await this.getAccountInfo(accountCode);

    // Get all posted ledger entries within the period
    const where: any = {
      accountId: account.id,
      entryDate: startDate
        ? { gte: startDate, lte: endDate }
        : { lte: endDate },
      journalEntry: {
        isPosted: true,
      },
    };

    const entries = await this.prisma.generalLedger.findMany({
      where,
    });

    const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);

    // Calculate balance based on normal balance type
    if (account.normalBalance === "DEBIT") {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  }

  /**
   * Calculate account balance as of a specific date (legacy method)
   */
  private async calculateAccountBalance(
    accountCode: string,
    asOfDate: Date,
  ): Promise<number> {
    return this.calculateAccountBalanceForPeriod(accountCode, null, asOfDate);
  }

  /**
   * Get trial balance
   * Shows account balances for a specific period (or cumulative if startDate is null)
   */
  async getTrialBalance(query: TrialBalanceQueryDto) {
    const {
      startDate,
      endDate,
      fiscalPeriodId,
      includeInactive = false,
      includeZeroBalances = false,
    } = query;

    // Get all active accounts
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    // Calculate balance for each account
    const balances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceForPeriod(
          account.code,
          startDate || null,
          endDate,
        );

        // Separate into debit and credit columns for trial balance
        let debitBalance = 0;
        let creditBalance = 0;

        if (balance > 0) {
          if (account.normalBalance === "DEBIT") {
            debitBalance = balance;
          } else {
            creditBalance = balance;
          }
        } else if (balance < 0) {
          // Abnormal balance
          if (account.normalBalance === "DEBIT") {
            creditBalance = Math.abs(balance);
          } else {
            debitBalance = Math.abs(balance);
          }
        }

        return {
          accountCode: account.code,
          accountName: account.name,
          accountNameId: account.nameId,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          normalBalance: account.normalBalance,
          balance,
          debitBalance,
          creditBalance,
          isAbnormal:
            (balance > 0 && account.normalBalance === "CREDIT") ||
            (balance < 0 && account.normalBalance === "DEBIT"),
        };
      }),
    );

    // Filter out zero balances if requested
    const filteredBalances = includeZeroBalances
      ? balances
      : balances.filter((b) => b.balance !== 0);

    // Calculate totals
    const totalDebit = filteredBalances.reduce(
      (sum, b) => sum + b.debitBalance,
      0,
    );
    const totalCredit = filteredBalances.reduce(
      (sum, b) => sum + b.creditBalance,
      0,
    );

    // Group by account type for better presentation
    const balancesByType = filteredBalances.reduce(
      (acc, balance) => {
        if (!acc[balance.accountType]) {
          acc[balance.accountType] = [];
        }
        acc[balance.accountType].push(balance);
        return acc;
      },
      {} as Record<string, typeof filteredBalances>,
    );

    return {
      startDate,
      endDate,
      fiscalPeriodId,
      balances: filteredBalances,
      balancesByType,
      summary: {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        accountCount: filteredBalances.length,
      },
    };
  }

  /**
   * Get account balance summary by type
   */
  async getAccountBalanceSummary(endDate: Date) {
    const trialBalance = await this.getTrialBalance({
      endDate,
      includeInactive: false,
      includeZeroBalances: false,
    });

    // Sum up balances by account type
    const summary = Object.entries(trialBalance.balancesByType).map(
      ([accountType, balances]) => {
        const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
        const totalDebit = balances.reduce((sum, b) => sum + b.debitBalance, 0);
        const totalCredit = balances.reduce(
          (sum, b) => sum + b.creditBalance,
          0,
        );

        return {
          accountType: accountType as AccountType,
          accountCount: balances.length,
          totalBalance,
          totalDebit,
          totalCredit,
        };
      },
    );

    return {
      endDate,
      summary,
      totals: trialBalance.summary,
    };
  }

  /**
   * Update account balances (called after posting journal entries)
   */
  async updateAccountBalances(journalEntryId: string) {
    const journalEntry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        lineItems: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!journalEntry || !journalEntry.isPosted) {
      return;
    }

    // Get unique account IDs from line items
    const accountIds = [
      ...new Set(journalEntry.lineItems.map((item) => item.accountId)),
    ];

    // Update balance for each account
    for (const accountId of accountIds) {
      // Find the account code for this ID
      const lineItem = journalEntry.lineItems.find(
        (item) => item.accountId === accountId,
      );
      if (!lineItem) continue;

      const accountCode = lineItem.account.code;

      // Calculate current balance
      const balance = await this.calculateAccountBalance(
        accountCode,
        journalEntry.entryDate,
      );

      // Upsert account balance record
      await this.prisma.accountBalance.upsert({
        where: {
          accountId_fiscalPeriodId: {
            accountId,
            fiscalPeriodId: journalEntry.fiscalPeriodId!,
          },
        },
        update: {
          endingBalance: balance,
        },
        create: {
          accountId,
          fiscalPeriodId: journalEntry.fiscalPeriodId!,
          endingBalance: balance,
        },
      });
    }
  }

  /**
   * Get accounts receivable aging report
   */
  async getAccountsReceivableAging(asOfDate: Date) {
    // ✅ FIX: Only include invoices with POSTED journal entries (connected to General Ledger)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "OVERDUE"] },
        creationDate: { lte: asOfDate },
        // ✅ CRITICAL: Must have posted journal entry to be in AR
        journalEntryId: { not: null },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        allowances: {
          where: {
            calculationDate: { lte: asOfDate },
            provisionStatus: { in: ["ACTIVE", "WRITTEN_OFF"] },
          },
          orderBy: {
            calculationDate: "desc",
          },
          take: 1, // Get latest ECL provision
        },
      },
    });

    // ✅ Filter out invoices with unposted journal entries
    // Fetch journal entries for all invoices with journalEntryId
    const invoiceIdsWithJournalEntry = invoices
      .filter((inv) => inv.journalEntryId)
      .map((inv) => inv.journalEntryId as string);

    const journalEntries = await this.prisma.journalEntry.findMany({
      where: {
        id: { in: invoiceIdsWithJournalEntry },
      },
      select: {
        id: true,
        isPosted: true,
        entryNumber: true,
      },
    });

    const journalEntryMap = new Map(journalEntries.map((je) => [je.id, je]));

    // Only include invoices with posted journal entries
    const postedInvoices = invoices.filter((inv) => {
      if (!inv.journalEntryId) return false;
      const journalEntry = journalEntryMap.get(inv.journalEntryId);
      return journalEntry?.isPosted === true;
    });

    // Calculate aging buckets with ECL data
    const aging = postedInvoices.map((invoice) => {
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - new Date(invoice.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      let agingBucket = "Current";
      if (daysOverdue > 0 && daysOverdue <= 30) agingBucket = "1-30 days";
      else if (daysOverdue > 30 && daysOverdue <= 60)
        agingBucket = "31-60 days";
      else if (daysOverdue > 60 && daysOverdue <= 90)
        agingBucket = "61-90 days";
      else if (daysOverdue > 90) agingBucket = "Over 90 days";

      // Get ECL provision data
      const latestECL = invoice.allowances[0];
      const eclAmount = latestECL ? Number(latestECL.eclAmount) : 0;
      const eclRate = latestECL ? Number(latestECL.eclRate) : 0;
      const eclStatus = latestECL ? latestECL.provisionStatus : null;

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.client,
        invoiceDate: invoice.creationDate,
        dueDate: invoice.dueDate,
        amount: invoice.totalAmount,
        daysOverdue,
        agingBucket,
        // ECL (PSAK 71) data
        eclAmount,
        eclRate,
        eclStatus,
        netReceivable: Number(invoice.totalAmount) - eclAmount,
      };
    });

    // Group by aging bucket
    const agingBuckets = {
      current: aging.filter((a) => a.agingBucket === "Current"),
      days1to30: aging.filter((a) => a.agingBucket === "1-30 days"),
      days31to60: aging.filter((a) => a.agingBucket === "31-60 days"),
      days61to90: aging.filter((a) => a.agingBucket === "61-90 days"),
      over90: aging.filter((a) => a.agingBucket === "Over 90 days"),
    };

    // Calculate ECL totals
    const totalECL = aging.reduce((sum, a) => sum + a.eclAmount, 0);
    const totalAR = aging.reduce((sum, a) => sum + Number(a.amount), 0);
    const netAR = totalAR - totalECL;
    const coverageRatio = totalAR > 0 ? (totalECL / totalAR) * 100 : 0;

    // ✅ FIX: Reconcile with General Ledger AR balance (Account 1-2010)
    const arAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { code: "1-2010" }, // Accounts Receivable
    });

    let generalLedgerARBalance = 0;
    if (arAccount) {
      const glEntries = await this.prisma.generalLedger.findMany({
        where: {
          accountId: arAccount.id,
          entryDate: { lte: asOfDate },
        },
      });

      const totalDebit = glEntries.reduce((sum, e) => sum + Number(e.debit), 0);
      const totalCredit = glEntries.reduce(
        (sum, e) => sum + Number(e.credit),
        0,
      );

      // AR is a debit balance account
      generalLedgerARBalance = totalDebit - totalCredit;
    }

    const reconciliationDifference = totalAR - generalLedgerARBalance;
    const isReconciled = Math.abs(reconciliationDifference) < 0.01;

    return {
      asOfDate,
      aging,
      agingBuckets,
      summary: {
        totalAR,
        current: agingBuckets.current.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        days1to30: agingBuckets.days1to30.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        days31to60: agingBuckets.days31to60.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        days61to90: agingBuckets.days61to90.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        over90: agingBuckets.over90.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        // ECL (PSAK 71) summary
        totalECL,
        netAR,
        coverageRatio,
        eclByCurrent: agingBuckets.current.reduce(
          (sum, a) => sum + a.eclAmount,
          0,
        ),
        eclBy1to30: agingBuckets.days1to30.reduce(
          (sum, a) => sum + a.eclAmount,
          0,
        ),
        eclBy31to60: agingBuckets.days31to60.reduce(
          (sum, a) => sum + a.eclAmount,
          0,
        ),
        eclBy61to90: agingBuckets.days61to90.reduce(
          (sum, a) => sum + a.eclAmount,
          0,
        ),
        eclByOver90: agingBuckets.over90.reduce(
          (sum, a) => sum + a.eclAmount,
          0,
        ),
      },
      // ✅ NEW: General Ledger reconciliation
      reconciliation: {
        generalLedgerARBalance,
        invoiceARBalance: totalAR,
        difference: reconciliationDifference,
        isReconciled,
        note: isReconciled
          ? "AR Aging matches General Ledger"
          : `WARNING: AR Aging differs from General Ledger by ${reconciliationDifference.toFixed(2)}`,
      },
    };
  }

  /**
   * Get accounts payable aging report
   */
  async getAccountsPayableAging(asOfDate: Date) {
    // Get all unpaid expenses
    const expenses = await this.prisma.expense.findMany({
      where: {
        status: { in: ["SUBMITTED", "APPROVED"] },
        expenseDate: { lte: asOfDate },
      },
      include: {
        category: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    // Calculate aging buckets (similar to AR aging)
    const aging = expenses.map((expense) => {
      // Assuming 30 days payment term for expenses
      const dueDate = new Date(expense.expenseDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const daysOverdue = Math.floor(
        (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let agingBucket = "Current";
      if (daysOverdue > 0 && daysOverdue <= 30) agingBucket = "1-30 days";
      else if (daysOverdue > 30 && daysOverdue <= 60)
        agingBucket = "31-60 days";
      else if (daysOverdue > 60 && daysOverdue <= 90)
        agingBucket = "61-90 days";
      else if (daysOverdue > 90) agingBucket = "Over 90 days";

      return {
        expenseId: expense.id,
        category: expense.category,
        expenseDate: expense.expenseDate,
        dueDate,
        amount: Number(expense.totalAmount),
        description: expense.description,
        daysOverdue,
        agingBucket,
      };
    });

    // Group by aging bucket
    const agingBuckets = {
      current: aging.filter((a) => a.agingBucket === "Current"),
      days1to30: aging.filter((a) => a.agingBucket === "1-30 days"),
      days31to60: aging.filter((a) => a.agingBucket === "31-60 days"),
      days61to90: aging.filter((a) => a.agingBucket === "61-90 days"),
      over90: aging.filter((a) => a.agingBucket === "Over 90 days"),
    };

    return {
      asOfDate,
      aging,
      agingBuckets,
      summary: {
        totalAP: aging.reduce((sum, a) => sum + Number(a.amount), 0),
        current: agingBuckets.current.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        days1to30: agingBuckets.days1to30.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        days31to60: agingBuckets.days31to60.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        days61to90: agingBuckets.days61to90.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
        over90: agingBuckets.over90.reduce(
          (sum, a) => sum + Number(a.amount),
          0,
        ),
      },
    };
  }
}
