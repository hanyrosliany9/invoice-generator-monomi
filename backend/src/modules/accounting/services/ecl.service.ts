import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JournalService } from "./journal.service";
import { ECLProvisionStatus, TransactionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * PSAK 71: Expected Credit Loss (ECL) Provision Service
 *
 * Implements Indonesian accounting standard PSAK 71 for:
 * - Expected Credit Loss calculation on accounts receivable
 * - Aging analysis and provision calculation
 * - Automated ECL provision journal entries
 * - Write-off and recovery tracking
 */
@Injectable()
export class ECLService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Default ECL rates by aging bucket (can be customized based on historical data)
   */
  private readonly DEFAULT_ECL_RATES = {
    Current: 0.005, // 0.5% - Very low risk
    "1-30": 0.02, // 2% - Low risk
    "31-60": 0.05, // 5% - Moderate risk
    "61-90": 0.15, // 15% - High risk
    "91-120": 0.3, // 30% - Very high risk
    "Over 120": 0.5, // 50% - Severe risk
  };

  /**
   * Calculate aging bucket for an invoice
   */
  private calculateAgingBucket(dueDate: Date, asOfDate: Date): string {
    const daysPastDue = Math.floor(
      (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysPastDue <= 0) return "Current";
    if (daysPastDue <= 30) return "1-30";
    if (daysPastDue <= 60) return "31-60";
    if (daysPastDue <= 90) return "61-90";
    if (daysPastDue <= 120) return "91-120";
    return "Over 120";
  }

  /**
   * Get ECL rate for aging bucket (uses custom rates if available, defaults otherwise)
   */
  private getECLRate(
    agingBucket: string,
    customRates?: Record<string, number>,
  ): number {
    if (customRates && agingBucket in customRates) {
      return customRates[agingBucket];
    }

    const defaultRate =
      this.DEFAULT_ECL_RATES[
        agingBucket as keyof typeof this.DEFAULT_ECL_RATES
      ];
    return defaultRate !== undefined
      ? defaultRate
      : this.DEFAULT_ECL_RATES["Over 120"];
  }

  /**
   * Calculate ECL for a specific invoice
   */
  async calculateInvoiceECL(data: {
    invoiceId: string;
    calculationDate: Date;
    fiscalPeriodId?: string;
    customECLRates?: Record<string, number>;
    eclModel?: "12_MONTH" | "LIFETIME";
  }) {
    // Get invoice details
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        client: true,
        payments: {
          where: { status: "CONFIRMED" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with ID ${data.invoiceId} not found`,
      );
    }

    // Only calculate ECL for unpaid invoices
    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      throw new BadRequestException(
        `Cannot calculate ECL for ${invoice.status} invoices`,
      );
    }

    // Calculate outstanding amount (total - payments)
    const totalPaid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const outstandingAmount = Number(invoice.totalAmount) - totalPaid;

    if (outstandingAmount <= 0) {
      throw new BadRequestException("Invoice has no outstanding balance");
    }

    // Calculate aging
    const agingBucket = this.calculateAgingBucket(
      invoice.dueDate,
      data.calculationDate,
    );
    const daysPastDue = Math.floor(
      (data.calculationDate.getTime() - invoice.dueDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Get ECL rate
    const eclRate = this.getECLRate(agingBucket, data.customECLRates);

    // Calculate ECL amount
    const eclAmount = outstandingAmount * eclRate;

    // Get previous ECL provision if exists
    const previousProvision =
      await this.prisma.allowanceForDoubtfulAccounts.findFirst({
        where: {
          invoiceId: data.invoiceId,
          provisionStatus: ECLProvisionStatus.ACTIVE,
        },
        orderBy: { calculationDate: "desc" },
      });

    const previousEclAmount = previousProvision
      ? Number(previousProvision.eclAmount)
      : 0;
    const adjustmentAmount = eclAmount - previousEclAmount;

    // Deactivate previous provision if exists
    if (previousProvision) {
      await this.prisma.allowanceForDoubtfulAccounts.update({
        where: { id: previousProvision.id },
        data: { provisionStatus: ECLProvisionStatus.REVERSED },
      });
    }

    // Create new ECL provision
    const provision = await this.prisma.allowanceForDoubtfulAccounts.create({
      data: {
        invoiceId: data.invoiceId,
        calculationDate: data.calculationDate,
        fiscalPeriodId: data.fiscalPeriodId,
        agingBucket,
        daysPastDue: Math.max(0, daysPastDue),
        outstandingAmount: new Decimal(outstandingAmount),
        eclRate: new Decimal(eclRate),
        eclAmount: new Decimal(eclAmount),
        previousEclAmount: previousEclAmount
          ? new Decimal(previousEclAmount)
          : null,
        adjustmentAmount: new Decimal(adjustmentAmount),
        eclModel: data.eclModel || "12_MONTH",
        lossRateSource: data.customECLRates ? "Custom" : "Default",
        provisionStatus: ECLProvisionStatus.ACTIVE,
        notes: `PSAK 71 ECL provision - ${agingBucket} aging bucket`,
        notesId: `Penyisihan PSAK 71 - kategori umur ${agingBucket}`,
      },
      include: {
        invoice: {
          include: {
            client: true,
          },
        },
      },
    });

    return provision;
  }

  /**
   * Post ECL provision to journal (only if adjustment is needed)
   */
  async postECLProvision(provisionId: string, userId: string) {
    const provision = await this.prisma.allowanceForDoubtfulAccounts.findUnique(
      {
        where: { id: provisionId },
        include: {
          invoice: {
            include: {
              client: true,
            },
          },
        },
      },
    );

    if (!provision) {
      throw new NotFoundException(
        `ECL provision with ID ${provisionId} not found`,
      );
    }

    if (provision.journalEntryId) {
      throw new BadRequestException(
        "ECL provision already has a journal entry",
      );
    }

    const adjustmentAmount = Number(provision.adjustmentAmount);

    // Only create journal entry if there's an adjustment
    if (Math.abs(adjustmentAmount) < 0.01) {
      return provision; // No journal entry needed for zero adjustment
    }

    // Determine if this is an increase or decrease in provision
    const isIncrease = adjustmentAmount > 0;
    const amount = Math.abs(adjustmentAmount);

    let lineItems: any[];

    if (isIncrease) {
      // Increase provision: Debit Bad Debt Expense, Credit Allowance
      lineItems = [
        {
          accountCode: "8-1010", // Bad Debt Expense
          description: `ECL provision increase for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Peningkatan penyisihan piutang untuk Faktur ${provision.invoice.invoiceNumber}`,
          debit: amount,
          credit: 0,
          clientId: provision.invoice.clientId,
        },
        {
          accountCode: "1-2015", // Allowance for Doubtful Accounts
          description: `ECL allowance for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Penyisihan piutang untuk Faktur ${provision.invoice.invoiceNumber}`,
          debit: 0,
          credit: amount,
          clientId: provision.invoice.clientId,
        },
      ];
    } else {
      // Decrease provision (reversal): Debit Allowance, Credit Bad Debt Expense
      lineItems = [
        {
          accountCode: "1-2015", // Allowance for Doubtful Accounts
          description: `ECL provision decrease for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Pengurangan penyisihan piutang untuk Faktur ${provision.invoice.invoiceNumber}`,
          debit: amount,
          credit: 0,
          clientId: provision.invoice.clientId,
        },
        {
          accountCode: "8-1010", // Bad Debt Expense
          description: `ECL reversal for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Pembalikan penyisihan piutang untuk Faktur ${provision.invoice.invoiceNumber}`,
          debit: 0,
          credit: amount,
          clientId: provision.invoice.clientId,
        },
      ];
    }

    // Create journal entry
    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: provision.calculationDate,
      description: `ECL Provision - ${provision.invoice.invoiceNumber} (${provision.agingBucket})`,
      descriptionId: `Penyisihan Piutang - ${provision.invoice.invoiceNumber} (${provision.agingBucket})`,
      descriptionEn: `ECL Provision - ${provision.invoice.invoiceNumber} (${provision.agingBucket})`,
      transactionType: TransactionType.ADJUSTMENT,
      transactionId: provision.id,
      documentNumber: `ECL-${provision.invoice.invoiceNumber}`,
      documentDate: provision.calculationDate,
      fiscalPeriodId: provision.fiscalPeriodId || undefined,
      createdBy: userId,
      lineItems,
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(journalEntry.id, userId);

    // Update provision with journal entry reference
    const updatedProvision =
      await this.prisma.allowanceForDoubtfulAccounts.update({
        where: { id: provisionId },
        data: { journalEntryId: journalEntry.id },
        include: {
          invoice: {
            include: {
              client: true,
            },
          },
          journalEntry: {
            include: {
              lineItems: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });

    return updatedProvision;
  }

  /**
   * Calculate and post ECL for all outstanding invoices
   */
  async processMonthlyECL(data: {
    calculationDate: Date;
    fiscalPeriodId?: string;
    userId: string;
    autoPost?: boolean;
    customECLRates?: Record<string, number>;
  }) {
    // Get all outstanding invoices
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "OVERDUE"] },
        creationDate: { lte: data.calculationDate },
      },
      include: {
        client: true,
        payments: {
          where: { status: "CONFIRMED" },
        },
      },
    });

    const results = {
      total: outstandingInvoices.length,
      calculated: 0,
      posted: 0,
      skipped: 0,
      errors: [] as string[],
      provisions: [] as any[],
    };

    for (const invoice of outstandingInvoices) {
      try {
        // Calculate outstanding amount
        const totalPaid = invoice.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        const outstandingAmount = Number(invoice.totalAmount) - totalPaid;

        // Skip if fully paid
        if (outstandingAmount <= 0.01) {
          results.skipped++;
          continue;
        }

        // Calculate ECL
        const provision = await this.calculateInvoiceECL({
          invoiceId: invoice.id,
          calculationDate: data.calculationDate,
          fiscalPeriodId: data.fiscalPeriodId,
          customECLRates: data.customECLRates,
        });

        results.calculated++;
        results.provisions.push(provision);

        // Auto-post if requested
        if (data.autoPost) {
          await this.postECLProvision(provision.id, data.userId);
          results.posted++;
        }
      } catch (error: any) {
        results.errors.push(
          `Invoice ${invoice.invoiceNumber}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Write off bad debt
   */
  async writeOffBadDebt(data: {
    provisionId: string;
    writeOffAmount: number;
    writeOffReason: string;
    userId: string;
  }) {
    const provision = await this.prisma.allowanceForDoubtfulAccounts.findUnique(
      {
        where: { id: data.provisionId },
        include: {
          invoice: {
            include: {
              client: true,
            },
          },
        },
      },
    );

    if (!provision) {
      throw new NotFoundException(
        `ECL provision with ID ${data.provisionId} not found`,
      );
    }

    if (provision.provisionStatus === ECLProvisionStatus.WRITTEN_OFF) {
      throw new BadRequestException("Provision has already been written off");
    }

    if (data.writeOffAmount > Number(provision.outstandingAmount)) {
      throw new BadRequestException(
        "Write-off amount cannot exceed outstanding amount",
      );
    }

    // Create write-off journal entry
    // Debit: Allowance for Doubtful Accounts
    // Credit: Accounts Receivable
    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: new Date(),
      description: `Bad Debt Write-off - ${provision.invoice.invoiceNumber}`,
      descriptionId: `Penghapusan Piutang Tak Tertagih - ${provision.invoice.invoiceNumber}`,
      descriptionEn: `Bad Debt Write-off - ${provision.invoice.invoiceNumber}`,
      transactionType: TransactionType.ADJUSTMENT,
      transactionId: provision.id,
      documentNumber: `WO-${provision.invoice.invoiceNumber}`,
      documentDate: new Date(),
      fiscalPeriodId: provision.fiscalPeriodId || undefined,
      createdBy: data.userId,
      lineItems: [
        {
          accountCode: "1-2015", // Allowance for Doubtful Accounts
          description: `Write-off for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Penghapusan Faktur ${provision.invoice.invoiceNumber}`,
          debit: data.writeOffAmount,
          credit: 0,
          clientId: provision.invoice.clientId,
        },
        {
          accountCode: "1-2010", // Accounts Receivable
          description: `AR write-off for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Penghapusan piutang Faktur ${provision.invoice.invoiceNumber}`,
          debit: 0,
          credit: data.writeOffAmount,
          clientId: provision.invoice.clientId,
        },
      ],
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(journalEntry.id, data.userId);

    // Update provision
    const updatedProvision =
      await this.prisma.allowanceForDoubtfulAccounts.update({
        where: { id: data.provisionId },
        data: {
          provisionStatus: ECLProvisionStatus.WRITTEN_OFF,
          writtenOffAt: new Date(),
          writtenOffBy: data.userId,
          writeOffReason: data.writeOffReason,
          writeOffAmount: new Decimal(data.writeOffAmount),
        },
        include: {
          invoice: {
            include: {
              client: true,
            },
          },
        },
      });

    return updatedProvision;
  }

  /**
   * Record bad debt recovery
   */
  async recordBadDebtRecovery(data: {
    provisionId: string;
    recoveredAmount: number;
    userId: string;
  }) {
    const provision = await this.prisma.allowanceForDoubtfulAccounts.findUnique(
      {
        where: { id: data.provisionId },
        include: {
          invoice: {
            include: {
              client: true,
            },
          },
        },
      },
    );

    if (!provision) {
      throw new NotFoundException(
        `ECL provision with ID ${data.provisionId} not found`,
      );
    }

    if (provision.provisionStatus !== ECLProvisionStatus.WRITTEN_OFF) {
      throw new BadRequestException("Can only recover written-off debt");
    }

    if (data.recoveredAmount > Number(provision.writeOffAmount || 0)) {
      throw new BadRequestException(
        "Recovery amount cannot exceed write-off amount",
      );
    }

    // Create recovery journal entry
    // Debit: Cash/Bank
    // Credit: Bad Debt Recovery (Other Income)
    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: new Date(),
      description: `Bad Debt Recovery - ${provision.invoice.invoiceNumber}`,
      descriptionId: `Pemulihan Piutang Tertagih - ${provision.invoice.invoiceNumber}`,
      descriptionEn: `Bad Debt Recovery - ${provision.invoice.invoiceNumber}`,
      transactionType: TransactionType.ADJUSTMENT,
      transactionId: provision.id,
      documentNumber: `REC-${provision.invoice.invoiceNumber}`,
      documentDate: new Date(),
      fiscalPeriodId: provision.fiscalPeriodId || undefined,
      createdBy: data.userId,
      lineItems: [
        {
          accountCode: "1-1020", // Bank Account
          description: `Recovery of Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Pemulihan Faktur ${provision.invoice.invoiceNumber}`,
          debit: data.recoveredAmount,
          credit: 0,
          clientId: provision.invoice.clientId,
        },
        {
          accountCode: "8-1010", // Bad Debt Expense (negative = income)
          description: `Bad debt recovery for Invoice ${provision.invoice.invoiceNumber}`,
          descriptionId: `Pemulihan piutang tak tertagih untuk Faktur ${provision.invoice.invoiceNumber}`,
          debit: 0,
          credit: data.recoveredAmount,
          clientId: provision.invoice.clientId,
        },
      ],
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(journalEntry.id, data.userId);

    // Update provision
    const updatedProvision =
      await this.prisma.allowanceForDoubtfulAccounts.update({
        where: { id: data.provisionId },
        data: {
          provisionStatus: ECLProvisionStatus.RECOVERED,
          recoveredAt: new Date(),
          recoveredAmount: new Decimal(data.recoveredAmount),
          recoveryJournalId: journalEntry.id,
        },
        include: {
          invoice: {
            include: {
              client: true,
            },
          },
        },
      });

    return updatedProvision;
  }

  /**
   * Get ECL provisions for an invoice
   */
  async getInvoiceECLProvisions(invoiceId: string) {
    return this.prisma.allowanceForDoubtfulAccounts.findMany({
      where: { invoiceId },
      include: {
        invoice: {
          include: {
            client: true,
          },
        },
        fiscalPeriod: true,
        journalEntry: {
          include: {
            lineItems: {
              include: {
                account: true,
              },
            },
          },
        },
      },
      orderBy: { calculationDate: "desc" },
    });
  }

  /**
   * Get ECL summary report
   */
  async getECLSummary(data: {
    startDate: Date;
    endDate: Date;
    includeWrittenOff?: boolean;
  }) {
    const where: any = {
      calculationDate: {
        gte: data.startDate,
        lte: data.endDate,
      },
    };

    if (!data.includeWrittenOff) {
      where.provisionStatus = {
        in: [ECLProvisionStatus.ACTIVE],
      };
    }

    const provisions = await this.prisma.allowanceForDoubtfulAccounts.findMany({
      where,
      include: {
        invoice: {
          include: {
            client: true,
          },
        },
      },
    });

    // Group by aging bucket
    const byAgingBucket = provisions.reduce(
      (acc, provision) => {
        const bucket = provision.agingBucket;
        if (!acc[bucket]) {
          acc[bucket] = {
            count: 0,
            totalOutstanding: 0,
            totalECL: 0,
            averageECLRate: 0,
          };
        }
        acc[bucket].count++;
        acc[bucket].totalOutstanding += Number(provision.outstandingAmount);
        acc[bucket].totalECL += Number(provision.eclAmount);
        return acc;
      },
      {} as Record<string, any>,
    );

    // Calculate average ECL rates
    Object.keys(byAgingBucket).forEach((bucket) => {
      const data = byAgingBucket[bucket];
      data.averageECLRate =
        data.totalOutstanding > 0 ? data.totalECL / data.totalOutstanding : 0;
    });

    const totalECL = provisions.reduce(
      (sum, p) => sum + Number(p.eclAmount),
      0,
    );
    const totalOutstanding = provisions.reduce(
      (sum, p) => sum + Number(p.outstandingAmount),
      0,
    );
    const totalWrittenOff = provisions
      .filter((p) => p.provisionStatus === ECLProvisionStatus.WRITTEN_OFF)
      .reduce((sum, p) => sum + Number(p.writeOffAmount || 0), 0);
    const totalRecovered = provisions
      .filter((p) => p.provisionStatus === ECLProvisionStatus.RECOVERED)
      .reduce((sum, p) => sum + Number(p.recoveredAmount || 0), 0);

    return {
      summary: {
        totalProvisions: provisions.length,
        totalOutstanding,
        totalECL,
        coverageRatio: totalOutstanding > 0 ? totalECL / totalOutstanding : 0,
        totalWrittenOff,
        totalRecovered,
        netBadDebt: totalWrittenOff - totalRecovered,
      },
      byAgingBucket,
      provisions: provisions.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice.invoiceNumber,
        clientName: p.invoice.client.name,
        agingBucket: p.agingBucket,
        daysPastDue: p.daysPastDue,
        outstandingAmount: Number(p.outstandingAmount),
        eclRate: Number(p.eclRate),
        eclAmount: Number(p.eclAmount),
        status: p.provisionStatus,
        calculationDate: p.calculationDate,
      })),
    };
  }

  /**
   * Historical Loss Rate Analysis (PSAK 71)
   *
   * Analyzes past 12-24 months of invoice data to calculate company-specific ECL rates
   * This provides data-driven loss rates based on actual payment patterns
   */
  async analyzeHistoricalLossRates(data: {
    analysisMonths?: number; // Default: 24 months
    asOfDate?: Date; // Default: today
  }) {
    const analysisMonths = data.analysisMonths || 24;
    const asOfDate = data.asOfDate || new Date();

    // Calculate start date for analysis period
    const startDate = new Date(asOfDate);
    startDate.setMonth(startDate.getMonth() - analysisMonths);

    console.log(`\n📊 Historical Loss Rate Analysis (PSAK 71)`);
    console.log(
      `   Period: ${startDate.toISOString().split("T")[0]} to ${asOfDate.toISOString().split("T")[0]}`,
    );
    console.log(`   Analysis Window: ${analysisMonths} months\n`);

    // Get all invoices from the analysis period
    const historicalInvoices = await this.prisma.invoice.findMany({
      where: {
        creationDate: {
          gte: startDate,
          lte: asOfDate,
        },
      },
      include: {
        client: true,
        payments: {
          where: { status: "CONFIRMED" },
        },
        allowances: {
          where: {
            provisionStatus: {
              in: [
                ECLProvisionStatus.WRITTEN_OFF,
                ECLProvisionStatus.RECOVERED,
              ],
            },
          },
        },
      },
    });

    console.log(`   Total Historical Invoices: ${historicalInvoices.length}`);

    // Initialize buckets for analysis
    const agingBuckets = [
      "Current",
      "1-30",
      "31-60",
      "61-90",
      "91-120",
      "Over 120",
    ];
    const bucketStats: Record<
      string,
      {
        totalInvoices: number;
        totalAmount: number;
        paidOnTime: number;
        paidLate: number;
        writtenOff: number;
        writtenOffAmount: number;
        recovered: number;
        recoveredAmount: number;
        lossAmount: number;
        lossRate: number;
      }
    > = {};

    // Initialize bucket statistics
    agingBuckets.forEach((bucket) => {
      bucketStats[bucket] = {
        totalInvoices: 0,
        totalAmount: 0,
        paidOnTime: 0,
        paidLate: 0,
        writtenOff: 0,
        writtenOffAmount: 0,
        recovered: 0,
        recoveredAmount: 0,
        lossAmount: 0,
        lossRate: 0,
      };
    });

    // Analyze each invoice
    for (const invoice of historicalInvoices) {
      const invoiceAmount = Number(invoice.totalAmount);
      const dueDate = invoice.dueDate;

      // Determine outcome
      let outcome: "PAID_ON_TIME" | "PAID_LATE" | "WRITTEN_OFF" | "OUTSTANDING";
      let agingBucket = "Current";
      let lossAmount = 0;

      if (invoice.status === "PAID") {
        // Check if paid on time
        const latestPayment = invoice.payments.sort(
          (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime(),
        )[0];

        if (latestPayment && latestPayment.paymentDate <= dueDate) {
          outcome = "PAID_ON_TIME";
          agingBucket = "Current";
        } else {
          outcome = "PAID_LATE";
          // Calculate aging bucket at payment time
          if (latestPayment) {
            agingBucket = this.calculateAgingBucket(
              dueDate,
              latestPayment.paymentDate,
            );
          }
        }
      } else {
        // Check for write-offs
        const writeOffProvision = invoice.allowances.find(
          (a) => a.provisionStatus === ECLProvisionStatus.WRITTEN_OFF,
        );

        if (writeOffProvision) {
          outcome = "WRITTEN_OFF";
          agingBucket = writeOffProvision.agingBucket;
          lossAmount = Number(writeOffProvision.writeOffAmount || 0);

          // Subtract any recoveries
          const recoveries = invoice.allowances.filter(
            (a) => a.provisionStatus === ECLProvisionStatus.RECOVERED,
          );
          const totalRecovered = recoveries.reduce(
            (sum, r) => sum + Number(r.recoveredAmount || 0),
            0,
          );
          lossAmount -= totalRecovered;
        } else {
          // Still outstanding - calculate current aging
          outcome = "OUTSTANDING";
          agingBucket = this.calculateAgingBucket(dueDate, asOfDate);
        }
      }

      // Update bucket statistics
      if (!bucketStats[agingBucket]) {
        bucketStats[agingBucket] = {
          totalInvoices: 0,
          totalAmount: 0,
          paidOnTime: 0,
          paidLate: 0,
          writtenOff: 0,
          writtenOffAmount: 0,
          recovered: 0,
          recoveredAmount: 0,
          lossAmount: 0,
          lossRate: 0,
        };
      }

      bucketStats[agingBucket].totalInvoices++;
      bucketStats[agingBucket].totalAmount += invoiceAmount;

      if (outcome === "PAID_ON_TIME") {
        bucketStats[agingBucket].paidOnTime++;
      } else if (outcome === "PAID_LATE") {
        bucketStats[agingBucket].paidLate++;
      } else if (outcome === "WRITTEN_OFF") {
        bucketStats[agingBucket].writtenOff++;
        bucketStats[agingBucket].writtenOffAmount += lossAmount;
        bucketStats[agingBucket].lossAmount += lossAmount;
      }
    }

    // Calculate loss rates for each bucket
    Object.keys(bucketStats).forEach((bucket) => {
      const stats = bucketStats[bucket];
      if (stats.totalAmount > 0) {
        stats.lossRate = stats.lossAmount / stats.totalAmount;
      }
    });

    // Generate recommended ECL rates based on historical data
    const recommendedRates: Record<string, number> = {};
    const defaultRates = this.DEFAULT_ECL_RATES;

    agingBuckets.forEach((bucket) => {
      const stats = bucketStats[bucket];
      const historicalRate = stats.lossRate;
      const defaultRate =
        defaultRates[bucket as keyof typeof defaultRates] || 0;

      // Use historical rate if we have sufficient data (at least 5 invoices in bucket)
      // Otherwise, use default rate or blend of historical and default
      if (stats.totalInvoices >= 5) {
        // Use historical rate with a safety factor (10% buffer for conservatism)
        recommendedRates[bucket] = Math.min(historicalRate * 1.1, 1.0);
      } else if (stats.totalInvoices > 0) {
        // Blend historical and default rates (weighted average)
        const weight = stats.totalInvoices / 5; // Weight increases with sample size
        recommendedRates[bucket] =
          historicalRate * weight + defaultRate * (1 - weight);
      } else {
        // No historical data - use default
        recommendedRates[bucket] = defaultRate;
      }
    });

    // Generate analysis report
    console.log(`\n📈 LOSS RATE ANALYSIS BY AGING BUCKET:`);
    console.log(`${"".padEnd(80, "=")}`);

    agingBuckets.forEach((bucket) => {
      const stats = bucketStats[bucket];
      if (stats.totalInvoices > 0) {
        console.log(`\n${bucket}:`);
        console.log(`   Invoices: ${stats.totalInvoices}`);
        console.log(
          `   Total Amount: Rp ${stats.totalAmount.toLocaleString("id-ID")}`,
        );
        console.log(
          `   Paid On Time: ${stats.paidOnTime} (${((stats.paidOnTime / stats.totalInvoices) * 100).toFixed(1)}%)`,
        );
        console.log(
          `   Paid Late: ${stats.paidLate} (${((stats.paidLate / stats.totalInvoices) * 100).toFixed(1)}%)`,
        );
        console.log(
          `   Written Off: ${stats.writtenOff} (${((stats.writtenOff / stats.totalInvoices) * 100).toFixed(1)}%)`,
        );
        console.log(
          `   Loss Amount: Rp ${stats.lossAmount.toLocaleString("id-ID")}`,
        );
        console.log(
          `   Historical Loss Rate: ${(stats.lossRate * 100).toFixed(2)}%`,
        );
        console.log(
          `   Default ECL Rate: ${((defaultRates[bucket as keyof typeof defaultRates] || 0) * 100).toFixed(2)}%`,
        );
        console.log(
          `   RECOMMENDED ECL Rate: ${(recommendedRates[bucket] * 100).toFixed(2)}%`,
        );
      }
    });

    console.log(`\n${"".padEnd(80, "=")}`);

    // Calculate overall statistics
    const totalInvoices = historicalInvoices.length;
    const totalAmount = historicalInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const totalLoss = Object.values(bucketStats).reduce(
      (sum, stats) => sum + stats.lossAmount,
      0,
    );
    const overallLossRate = totalAmount > 0 ? totalLoss / totalAmount : 0;

    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`   Total Invoices Analyzed: ${totalInvoices}`);
    console.log(
      `   Total Invoice Amount: Rp ${totalAmount.toLocaleString("id-ID")}`,
    );
    console.log(`   Total Losses: Rp ${totalLoss.toLocaleString("id-ID")}`);
    console.log(`   Overall Loss Rate: ${(overallLossRate * 100).toFixed(2)}%`);

    return {
      analysisDate: asOfDate,
      analysisPeriod: {
        startDate,
        endDate: asOfDate,
        months: analysisMonths,
      },
      totalInvoices,
      totalAmount,
      totalLoss,
      overallLossRate,
      byAgingBucket: bucketStats,
      recommendedECLRates: recommendedRates,
      defaultECLRates: defaultRates,
      summary: {
        dataQuality: this.assessDataQuality(bucketStats),
        recommendation: this.generateRecommendation(
          bucketStats,
          recommendedRates,
          defaultRates,
        ),
      },
    };
  }

  /**
   * Assess data quality for ECL rate recommendations
   */
  private assessDataQuality(bucketStats: Record<string, any>): string {
    const bucketsWithSufficientData = Object.values(bucketStats).filter(
      (stats) => stats.totalInvoices >= 5,
    ).length;

    if (bucketsWithSufficientData >= 4) {
      return "HIGH - Sufficient historical data for reliable ECL rates";
    } else if (bucketsWithSufficientData >= 2) {
      return "MEDIUM - Some historical data available, blend with defaults recommended";
    } else {
      return "LOW - Limited historical data, use default rates with caution";
    }
  }

  /**
   * Generate recommendation based on analysis
   */
  private generateRecommendation(
    bucketStats: Record<string, any>,
    recommended: Record<string, number>,
    defaults: Record<string, number>,
  ): string {
    let recommendation = "";

    // Compare recommended vs default rates
    const significantDifferences = Object.keys(recommended).filter((bucket) => {
      const rec = recommended[bucket];
      const def = defaults[bucket as keyof typeof defaults] || 0;
      return Math.abs(rec - def) > 0.05; // 5% difference threshold
    });

    if (significantDifferences.length > 0) {
      recommendation = `RECOMMENDED: Use company-specific ECL rates. `;
      recommendation += `Significant differences found in ${significantDifferences.join(", ")} buckets. `;
      recommendation += `Historical data suggests ${significantDifferences.length} aging buckets have different risk profiles than default assumptions.`;
    } else {
      recommendation = `OPTIONAL: Default ECL rates are reasonable for this company. `;
      recommendation += `Historical loss rates align closely with PSAK 71 default assumptions. `;
      recommendation += `However, using company-specific rates provides more accurate provisioning.`;
    }

    return recommendation;
  }
}
