import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LedgerQueryDto,
  TrialBalanceQueryDto,
} from "../dto/financial-statement-query.dto";
import { AccountType, BalanceType } from "@prisma/client";
import { wibDateStr } from "../../../common/utils/wib-date.util";
import { servicesPortionOf } from "../../../common/utils/reimbursable.util";

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

    // Only include GL entries from posted journal entries (consistent with
    // every other GL query in this service).
    where.journalEntry = { isPosted: true };

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
    // Receivables REGISTER (not just outstanding): every invoice — including PAID,
    // so the page is never empty just because everything's collected — plus every
    // direct PIUTANG sale (a SALE journal that debits 1-2010), so receivables
    // posted straight to the GL aren't invisible. Each row carries a paymentStatus
    // and an `outstanding` (the still-owed portion); the aging buckets / totalAR
    // sum `outstanding` so they keep meaning "what's still owed" and tie to the GL.
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "OVERDUE", "PAID"] },
        creationDate: { lte: asOfDate },
        // Must have a posted journal entry to be in the GL-backed AR.
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
        // Needed to net out partial payments (termin) from the AR balance.
        payments: { select: { amount: true, status: true } },
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

    // Invoice rows (incl. PAID — shown with a Paid status for history).
    const bucketFor = (daysOverdue: number) => {
      if (daysOverdue > 0 && daysOverdue <= 30) return "1-30 days";
      if (daysOverdue > 30 && daysOverdue <= 60) return "31-60 days";
      if (daysOverdue > 60 && daysOverdue <= 90) return "61-90 days";
      if (daysOverdue > 90) return "Over 90 days";
      return "Current";
    };

    const invoiceAging = postedInvoices.map((invoice) => {
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - new Date(invoice.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const agingBucket = bucketFor(daysOverdue);

      const latestECL = invoice.allowances[0];
      const eclAmount = latestECL ? Number(latestECL.eclAmount) : 0;
      const eclRate = latestECL ? Number(latestECL.eclRate) : 0;
      const eclStatus = latestECL ? latestECL.provisionStatus : null;

      // Trade AR (1-2010) = SERVICES portion only (reimbursables live in 1-2040),
      // minus CONFIRMED payments applied services-first.
      const confirmedPaid = (invoice.payments || []).reduce(
        (s: number, p: any) =>
          p.status === "CONFIRMED" ? s + Number(p.amount || 0) : s,
        0,
      );
      const servicesAmount = servicesPortionOf(invoice);
      const servicesPaid = Math.min(confirmedPaid, servicesAmount);
      const outstanding = Math.max(0, servicesAmount - servicesPaid);
      const paid = invoice.status === "PAID" || outstanding <= 0.005;

      return {
        invoiceId: invoice.id,
        sourceType: "INVOICE" as const,
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.client,
        invoiceDate: invoice.creationDate,
        dueDate: invoice.dueDate,
        // `amount` = the full receivable (register view); `outstanding` = still owed.
        amount: servicesAmount,
        outstanding,
        paymentStatus: (paid ? "PAID" : "UNPAID") as "PAID" | "UNPAID",
        daysOverdue,
        agingBucket,
        eclAmount,
        eclRate,
        eclStatus,
        netReceivable: outstanding - eclAmount,
      };
    });

    // Direct PIUTANG sales: SALE journal entries that debit 1-2010 (no invoice
    // row). Without these the register would be blind to receivables created via
    // the New Sales form — the exact disintegration this rebuild fixes.
    const saleEntries = await this.prisma.journalEntry.findMany({
      where: {
        transactionType: "SALE",
        isPosted: true,
        entryDate: { lte: asOfDate },
        lineItems: { some: { account: { code: "1-2010" }, debit: { gt: 0 } } },
      },
      select: {
        id: true,
        transactionId: true,
        entryDate: true,
        documentDate: true,
        lineItems: {
          select: {
            debit: true,
            credit: true,
            clientId: true,
            account: { select: { code: true } },
          },
        },
      },
    });
    // Net 1-2010 per sale transactionId (debit − credit) = amount still owed.
    const saleTxnIds = saleEntries
      .map((e) => e.transactionId)
      .filter(Boolean) as string[];
    const arNetByTxn = new Map<string, number>();
    if (saleTxnIds.length) {
      const arAccountForNet = await this.prisma.chartOfAccounts.findUnique({
        where: { code: "1-2010" },
        select: { id: true },
      });
      if (arAccountForNet) {
        const glRows = await this.prisma.generalLedger.findMany({
          where: {
            accountId: arAccountForNet.id,
            transactionId: { in: saleTxnIds },
            journalEntry: { isPosted: true },
          },
          select: { transactionId: true, debit: true, credit: true },
        });
        for (const r of glRows) {
          arNetByTxn.set(
            r.transactionId,
            (arNetByTxn.get(r.transactionId) ?? 0) +
              Number(r.debit) -
              Number(r.credit),
          );
        }
      }
    }
    const saleClientIds = [
      ...new Set(
        saleEntries
          .flatMap((e) => e.lineItems.map((l) => l.clientId))
          .filter(Boolean),
      ),
    ] as string[];
    const saleClients = saleClientIds.length
      ? await this.prisma.client.findMany({
          where: { id: { in: saleClientIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const saleClientById = new Map(saleClients.map((c) => [c.id, c]));

    const saleAging = saleEntries.map((e) => {
      const arDebit = e.lineItems
        .filter((l) => l.account?.code === "1-2010")
        .reduce((s, l) => s + Number(l.debit), 0);
      const outstanding = e.transactionId
        ? Math.max(0, arNetByTxn.get(e.transactionId) ?? 0)
        : 0;
      const due = e.documentDate ?? e.entryDate;
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - new Date(due).getTime()) / (1000 * 60 * 60 * 24),
      );
      const clientId = e.lineItems.find((l) => l.clientId)?.clientId ?? null;
      const client = clientId ? saleClientById.get(clientId) ?? null : null;
      return {
        invoiceId: e.id,
        sourceType: "SALE" as const,
        invoiceNumber: e.transactionId,
        client,
        invoiceDate: e.entryDate,
        dueDate: due,
        amount: arDebit,
        outstanding,
        paymentStatus: (outstanding <= 0.005 ? "PAID" : "UNPAID") as
          | "PAID"
          | "UNPAID",
        daysOverdue,
        agingBucket: bucketFor(daysOverdue),
        eclAmount: 0,
        eclRate: 0,
        eclStatus: null as string | null,
        netReceivable: outstanding,
      };
    });

    // Register = invoices + direct sales, newest first.
    const aging = [...invoiceAging, ...saleAging].sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );

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
    const totalAR = aging.reduce((sum, a) => sum + Number(a.outstanding), 0);
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
          journalEntry: { isPosted: true },
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
          (sum, a) => sum + Number(a.outstanding),
          0,
        ),
        days1to30: agingBuckets.days1to30.reduce(
          (sum, a) => sum + Number(a.outstanding),
          0,
        ),
        days31to60: agingBuckets.days31to60.reduce(
          (sum, a) => sum + Number(a.outstanding),
          0,
        ),
        days61to90: agingBuckets.days61to90.reduce(
          (sum, a) => sum + Number(a.outstanding),
          0,
        ),
        over90: agingBuckets.over90.reduce(
          (sum, a) => sum + Number(a.outstanding),
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
    // Accounts Payable = the GL net of 2-1010 (Hutang Usaha). We itemise the
    // detail straight from the posted general_ledger — NOT from the expense table:
    // expenses are cash-paid and never touch 2-1010, so the old expense-derived
    // list was disconnected from the balance and left journal-posted payables
    // (vendor invoices, credit purchases, manual "hutang pembelian" entries) with
    // a headline but no rows. Grouping every 2-1010 posting by its journal entry
    // makes the detail ALWAYS sum to the GL net / balance sheet.
    const apAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "2-1010" },
      select: { id: true },
    });

    const emptyBuckets = () => ({
      current: [] as any[],
      days1to30: [] as any[],
      days31to60: [] as any[],
      days61to90: [] as any[],
      over90: [] as any[],
    });
    if (!apAccount) {
      return {
        asOfDate,
        aging: [] as any[],
        agingBuckets: emptyBuckets(),
        summary: {
          totalAP: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
        },
      };
    }

    const glRows = await this.prisma.generalLedger.findMany({
      where: {
        accountId: apAccount.id,
        entryDate: { lte: asOfDate },
        journalEntry: { isPosted: true },
      },
      select: {
        journalEntryId: true,
        journalEntryNumber: true,
        transactionId: true,
        entryDate: true,
        debit: true,
        credit: true,
        description: true,
        descriptionId: true,
        journalEntry: { select: { transactionType: true, description: true } },
      },
      orderBy: { entryDate: "asc" },
    });

    // Net every 2-1010 posting that shares a transactionId: credit − debit = the
    // amount still owed for that document. Grouping by transactionId (not the
    // journal entry) means a settlement posted by "mark as paid" — which reuses
    // the original purchase's transactionId — nets the original down to zero, so
    // the paid purchase drops off the list instead of lingering as a stray row.
    type Acc = {
      journalEntryId: string;
      reference: string;
      date: Date;
      description: string;
      transactionType: string | null;
      net: number; // credit − debit = still owed
      grossCredit: number; // total credited = the payable originally raised
    };
    const byEntry = new Map<string, Acc>();
    for (const r of glRows) {
      // Fall back to the journal entry id if a row somehow has no transactionId.
      const key = r.transactionId || r.journalEntryId;
      const cur =
        byEntry.get(key) ?? {
          // Keep the EARLIEST posting's metadata (orderBy entryDate asc) — that's
          // the original purchase, not its later settlement.
          journalEntryId: r.journalEntryId,
          reference: r.journalEntryNumber,
          date: r.entryDate,
          description:
            r.descriptionId ||
            r.description ||
            r.journalEntry?.description ||
            "—",
          transactionType: r.journalEntry?.transactionType ?? null,
          net: 0,
          grossCredit: 0,
        };
      cur.net += Number(r.credit) - Number(r.debit);
      cur.grossCredit += Number(r.credit);
      byEntry.set(key, cur);
    }

    // Graft the vendor name + real due date from the AccountsPayable record when
    // one is linked to this journal entry (vendor-invoice flow). Manual journals
    // have no AP record, so we fall back to a 30-day term from the entry date.
    // Look up by the stored journalEntryId of each group (the keys are
    // transactionIds, so they'd never match an AccountsPayable.journalEntryId).
    const journalIds = [...byEntry.values()].map((e) => e.journalEntryId);
    const apRecords = journalIds.length
      ? await this.prisma.accountsPayable.findMany({
          where: { journalEntryId: { in: journalIds } },
          select: {
            journalEntryId: true,
            dueDate: true,
            vendor: { select: { name: true } },
          },
        })
      : [];
    const apByJE = new Map(
      apRecords
        .filter((a) => a.journalEntryId)
        .map((a) => [a.journalEntryId as string, a]),
    );

    const aging = [...byEntry.values()]
      // Keep every document that raised a payable (gross credit > 0) — including
      // fully-settled ones, shown with a Paid status for history. Drops orphan
      // pure-debit groups (a stray settlement with no original payable).
      .filter((e) => e.grossCredit >= 0.005)
      .map((e) => {
        const link = apByJE.get(e.journalEntryId);
        // Due date: the AP record's real due date, else assume a 30-day term from
        // the entry date (WIB-stable — anchor to the WIB calendar date).
        let dueDate: Date;
        if (link?.dueDate) {
          dueDate = new Date(link.dueDate);
        } else {
          dueDate = new Date(wibDateStr(new Date(e.date)) + "T00:00:00Z");
          dueDate.setUTCDate(dueDate.getUTCDate() + 30);
        }
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

        const vendorName = link?.vendor?.name ?? null;
        const outstanding = Math.max(0, e.net);
        return {
          journalEntryId: e.journalEntryId,
          // Journal entry number, shown as the document reference.
          reference: e.reference,
          vendorName,
          transactionType: e.transactionType,
          // `category` kept (null) for backward-compat: the PDF/Excel exports read
          // `item.category?.nameId` and fall back to `item.description`.
          category: null as { code?: string; name?: string; nameId?: string } | null,
          // `categoryName` is read by the Excel export — surface vendor/type here.
          categoryName: vendorName || e.transactionType || undefined,
          description: e.description,
          // `expenseDate` kept (exports + frontend read it); it is the entry date.
          expenseDate: e.date,
          date: e.date,
          dueDate,
          // `amount` = the payable originally raised (register view); `outstanding`
          // = still owed (0 when settled).
          amount: e.grossCredit,
          outstanding,
          paymentStatus: (outstanding <= 0.005 ? "PAID" : "UNPAID") as
            | "PAID"
            | "UNPAID",
          daysOverdue,
          agingBucket,
        };
      });

    const agingBuckets = {
      current: aging.filter((a) => a.agingBucket === "Current"),
      days1to30: aging.filter((a) => a.agingBucket === "1-30 days"),
      days31to60: aging.filter((a) => a.agingBucket === "31-60 days"),
      days61to90: aging.filter((a) => a.agingBucket === "61-90 days"),
      over90: aging.filter((a) => a.agingBucket === "Over 90 days"),
    };
    // Buckets / totalAP sum the OUTSTANDING (still-owed) amount so they keep
    // meaning "what's unpaid" and tie to the 2-1010 GL net, even though the list
    // now also shows settled payables.
    const sum = (arr: typeof aging) =>
      arr.reduce((s, a) => s + Number(a.outstanding), 0);

    return {
      asOfDate,
      aging,
      agingBuckets,
      summary: {
        totalAP: sum(aging),
        current: sum(agingBuckets.current),
        days1to30: sum(agingBuckets.days1to30),
        days31to60: sum(agingBuckets.days31to60),
        days61to90: sum(agingBuckets.days61to90),
        over90: sum(agingBuckets.over90),
      },
    };
  }
}
