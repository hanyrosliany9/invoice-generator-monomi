import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCashTransactionDto } from "../dto/create-cash-transaction.dto";
import { UpdateCashTransactionDto } from "../dto/update-cash-transaction.dto";
import { CashTransactionQueryDto } from "../dto/cash-transaction-query.dto";
import {
  CashTransactionType,
  CashTransactionStatus,
  TransactionType,
  Currency,
} from "@prisma/client";
import { JournalService } from "./journal.service";
import { ExchangeRateService } from "./exchange-rate.service";
import { isCashOrBank } from "../cash-accounts.util";

@Injectable()
export class CashTransactionService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Generate next cash transaction number
   */
  private async generateTransactionNumber(
    type: CashTransactionType,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // CSH-R for receipts, CSH-D for disbursements
    const prefix =
      type === CashTransactionType.RECEIPT
        ? `CSH-R-${year}-${month}`
        : `CSH-D-${year}-${month}`;

    const latestTransaction = await this.prisma.cashTransaction.findFirst({
      where: {
        transactionNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        transactionNumber: "desc",
      },
    });

    if (latestTransaction) {
      const lastNumber = parseInt(
        latestTransaction.transactionNumber.split("-").pop() || "0",
      );
      const nextNumber = lastNumber + 1;
      return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
    }

    return `${prefix}-0001`;
  }

  /**
   * Validate account is a cash/bank account
   */
  private async validateCashAccount(accountId: string): Promise<void> {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new BadRequestException("Cash account not found");
    }

    // Validate using the canonical cash/bank classifier (excludes inventory 1-15xx etc.)
    if (!isCashOrBank(account.code)) {
      throw new BadRequestException(
        `Account ${account.code} is not a valid cash/bank account. Must use cash (1-101x) or bank (1-102x) accounts.`,
      );
    }

    if (!account.isActive) {
      throw new BadRequestException(`Account ${account.code} is not active`);
    }
  }

  /**
   * Validate offset account exists and is active
   */
  private async validateOffsetAccount(accountId: string): Promise<void> {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new BadRequestException("Offset account not found");
    }

    if (!account.isActive) {
      throw new BadRequestException(`Account ${account.code} is not active`);
    }
  }

  /**
   * Create cash transaction
   */
  async createCashTransaction(
    createDto: CreateCashTransactionDto & { createdBy: string },
  ) {
    // Validate accounts
    await this.validateCashAccount(createDto.cashAccountId);
    await this.validateOffsetAccount(createDto.offsetAccountId);

    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(
      createDto.transactionType,
    );

    // Handle multi-currency conversion
    const currency = createDto.currency || Currency.IDR;
    let exchangeRate = createDto.exchangeRate;
    let idrAmount = createDto.idrAmount;
    let originalAmount = createDto.originalAmount;

    if (currency === Currency.IDR) {
      // IDR transaction - no conversion needed
      idrAmount = createDto.amount;
      exchangeRate = 1;
      originalAmount = createDto.amount;
    } else {
      // Foreign currency transaction - need conversion
      originalAmount = createDto.originalAmount || createDto.amount;

      // Get exchange rate if not provided
      if (!exchangeRate) {
        const rate = await this.exchangeRateService.getCurrentRate(
          currency,
          Currency.IDR,
        );
        exchangeRate = Number(rate.rate);
      }

      // Calculate IDR amount if not provided.
      // Math.round ensures whole rupiah (no sub-rupiah fractions in the GL).
      if (!idrAmount) {
        idrAmount = Math.round(originalAmount * exchangeRate);
      }
    }

    // Create cash transaction — retry once on unique number collision (FIX 2: number race)
    const createTransactionData = async (number: string) =>
      this.prisma.cashTransaction.create({
        data: {
          transactionNumber: number,
          transactionType: createDto.transactionType,
          category: createDto.category,
          transactionDate: createDto.transactionDate,
          amount: createDto.amount,
          currency,
          originalAmount,
          exchangeRate,
          idrAmount,
          cashAccountId: createDto.cashAccountId,
          offsetAccountId: createDto.offsetAccountId,
          description: createDto.description,
          descriptionId: createDto.descriptionId,
          descriptionEn: createDto.descriptionEn,
          reference: createDto.reference,
          paymentMethod: createDto.paymentMethod,
          checkNumber: createDto.checkNumber,
          bankReference: createDto.bankReference,
          projectId: createDto.projectId,
          clientId: createDto.clientId,
          status: CashTransactionStatus.DRAFT,
          notes: createDto.notes,
          notesId: createDto.notesId,
          createdBy: createDto.createdBy,
        },
        include: {
          cashAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
          offsetAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
        },
      });

    let transaction: Awaited<ReturnType<typeof createTransactionData>>;
    try {
      transaction = await createTransactionData(transactionNumber);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        // Regenerate number and retry once
        const retryNumber = await this.generateTransactionNumber(
          createDto.transactionType,
        );
        try {
          transaction = await createTransactionData(retryNumber);
        } catch (retryError) {
          if (
            retryError &&
            typeof retryError === "object" &&
            "code" in retryError &&
            retryError.code === "P2002"
          ) {
            throw new ConflictException(
              "Duplicate transaction number — please retry",
            );
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    return transaction;
  }

  /**
   * Get cash transactions with pagination and filtering
   */
  async getCashTransactions(query: CashTransactionQueryDto) {
    const {
      startDate,
      endDate,
      transactionType,
      category,
      status,
      cashAccountId,
      offsetAccountId,
      projectId,
      clientId,
      search,
      page = 1,
      limit = 50,
      sortBy = "transactionDate",
      sortOrder = "desc",
    } = query;

    const where: any = {};

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    if (transactionType) where.transactionType = transactionType;
    if (category) where.category = category;
    if (status) where.status = status;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (offsetAccountId) where.offsetAccountId = offsetAccountId;
    if (projectId) where.projectId = projectId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { descriptionId: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          cashAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
          offsetAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
        },
      }),
      this.prisma.cashTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single cash transaction
   */
  async getCashTransaction(id: string) {
    const transaction = await this.prisma.cashTransaction.findUnique({
      where: { id },
      include: {
        cashAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        offsetAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Cash transaction with ID ${id} not found`);
    }

    return transaction;
  }

  /**
   * Update cash transaction (only if not posted)
   */
  async updateCashTransaction(id: string, updateDto: UpdateCashTransactionDto) {
    const existing = await this.getCashTransaction(id);

    if (existing.status === CashTransactionStatus.POSTED) {
      throw new BadRequestException("Cannot update posted cash transaction");
    }

    if (existing.status === CashTransactionStatus.APPROVED) {
      throw new BadRequestException("Cannot update approved cash transaction");
    }

    // Validate accounts if they are being updated
    if (updateDto.cashAccountId) {
      await this.validateCashAccount(updateDto.cashAccountId);
    }
    if (updateDto.offsetAccountId) {
      await this.validateOffsetAccount(updateDto.offsetAccountId);
    }

    const updatedTransaction = await this.prisma.cashTransaction.update({
      where: { id },
      data: {
        transactionDate: updateDto.transactionDate,
        amount: updateDto.amount,
        cashAccountId: updateDto.cashAccountId,
        offsetAccountId: updateDto.offsetAccountId,
        description: updateDto.description,
        descriptionId: updateDto.descriptionId,
        descriptionEn: updateDto.descriptionEn,
        reference: updateDto.reference,
        paymentMethod: updateDto.paymentMethod,
        checkNumber: updateDto.checkNumber,
        bankReference: updateDto.bankReference,
        projectId: updateDto.projectId,
        clientId: updateDto.clientId,
        notes: updateDto.notes,
        notesId: updateDto.notesId,
        updatedBy: updateDto.updatedBy,
      },
      include: {
        cashAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        offsetAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransaction;
  }

  /**
   * Approve and post cash transaction
   * This creates the journal entry and posts to general ledger
   */
  async approveCashTransaction(id: string, userId: string) {
    // FIX 1a: Idempotency gate — if already posted return early, no second journal
    const existing = await this.getCashTransaction(id);
    if (existing.status === CashTransactionStatus.POSTED) {
      return existing;
    }

    // FIX 1b: Atomic claim — only one caller wins; others get count===0 and bail
    const approvableStatuses = [
      CashTransactionStatus.DRAFT,
      CashTransactionStatus.SUBMITTED,
    ];
    const claimed = await this.prisma.cashTransaction.updateMany({
      where: {
        id,
        journalEntryId: null,
        status: { in: approvableStatuses },
      },
      data: { status: CashTransactionStatus.POSTED },
    });
    if (claimed.count === 0) {
      // Another concurrent caller already claimed or it was already processed
      return this.getCashTransaction(id);
    }

    // Re-fetch with full includes needed for journal line items
    const transaction = await this.getCashTransaction(id);

    if (
      transaction.status !== CashTransactionStatus.POSTED ||
      transaction.journalEntryId !== null
    ) {
      // Defensive: shouldn't happen after the claim, but guard anyway
      return transaction;
    }

    // Create journal entry for this cash transaction
    const journalTransactionType =
      transaction.transactionType === CashTransactionType.RECEIPT
        ? TransactionType.CASH_RECEIPT
        : TransactionType.CASH_DISBURSEMENT;

    // CRITICAL: Use idrAmount for journal entries (accounting must be in IDR)
    const amountForJournal = Number(transaction.idrAmount);

    // Add currency information to description if foreign currency
    const currencyNote =
      transaction.currency !== "IDR"
        ? ` (${transaction.currency} ${Number(transaction.originalAmount).toLocaleString()} @ ${Number(transaction.exchangeRate).toLocaleString()})`
        : "";

    const lineItems =
      transaction.transactionType === CashTransactionType.RECEIPT
        ? [
            // Cash Receipt: Debit Cash, Credit Income/Revenue
            {
              accountCode: transaction.cashAccount.code,
              description: transaction.description + currencyNote,
              descriptionId: transaction.descriptionId || undefined,
              debit: amountForJournal,
              credit: 0,
              projectId: transaction.projectId || undefined,
              clientId: transaction.clientId || undefined,
            },
            {
              accountCode: transaction.offsetAccount.code,
              description: transaction.description + currencyNote,
              descriptionId: transaction.descriptionId || undefined,
              debit: 0,
              credit: amountForJournal,
              projectId: transaction.projectId || undefined,
              clientId: transaction.clientId || undefined,
            },
          ]
        : [
            // Cash Disbursement: Debit Expense, Credit Cash
            {
              accountCode: transaction.offsetAccount.code,
              description: transaction.description + currencyNote,
              descriptionId: transaction.descriptionId || undefined,
              debit: amountForJournal,
              credit: 0,
              projectId: transaction.projectId || undefined,
              clientId: transaction.clientId || undefined,
            },
            {
              accountCode: transaction.cashAccount.code,
              description: transaction.description + currencyNote,
              descriptionId: transaction.descriptionId || undefined,
              debit: 0,
              credit: amountForJournal,
              projectId: transaction.projectId || undefined,
              clientId: transaction.clientId || undefined,
            },
          ];

    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: transaction.transactionDate,
      description: `Cash Transaction: ${transaction.transactionNumber}`,
      descriptionId: `Transaksi Kas: ${transaction.transactionNumber}`,
      descriptionEn: transaction.descriptionEn || undefined,
      transactionType: journalTransactionType,
      transactionId: transaction.id,
      documentNumber: transaction.transactionNumber,
      documentDate: transaction.transactionDate,
      createdBy: userId,
      lineItems,
    });

    // Post the journal entry to general ledger
    await this.journalService.postJournalEntry(journalEntry.id, userId);

    // Update cash transaction — status already set to POSTED by atomic claim above;
    // now stamp approvedBy/At and journalEntryId atomically
    const updatedTransaction = await this.prisma.cashTransaction.update({
      where: { id },
      data: {
        approvedBy: userId,
        approvedAt: new Date(),
        journalEntryId: journalEntry.id,
      },
      include: {
        cashAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        offsetAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransaction;
  }

  /**
   * Reject cash transaction
   */
  async rejectCashTransaction(id: string, userId: string, reason: string) {
    const transaction = await this.getCashTransaction(id);

    if (transaction.status !== CashTransactionStatus.SUBMITTED) {
      throw new BadRequestException(
        "Can only reject submitted cash transactions",
      );
    }

    const updatedTransaction = await this.prisma.cashTransaction.update({
      where: { id },
      data: {
        status: CashTransactionStatus.REJECTED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        cashAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        offsetAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransaction;
  }

  /**
   * Submit cash transaction for approval
   */
  async submitCashTransaction(id: string, userId: string) {
    const transaction = await this.getCashTransaction(id);

    if (transaction.status !== CashTransactionStatus.DRAFT) {
      throw new BadRequestException("Can only submit draft cash transactions");
    }

    const updatedTransaction = await this.prisma.cashTransaction.update({
      where: { id },
      data: {
        status: CashTransactionStatus.SUBMITTED,
        updatedBy: userId,
      },
      include: {
        cashAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        offsetAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransaction;
  }

  /**
   * Delete cash transaction (only if not posted)
   */
  async deleteCashTransaction(id: string) {
    const transaction = await this.getCashTransaction(id);

    if (transaction.status === CashTransactionStatus.POSTED) {
      throw new BadRequestException(
        "Cannot delete posted cash transaction. Contact admin for reversal.",
      );
    }

    await this.prisma.cashTransaction.delete({
      where: { id },
    });

    return { message: "Cash transaction deleted successfully" };
  }

  /**
   * Void cash transaction (for posted transactions)
   */
  async voidCashTransaction(id: string, userId: string) {
    const transaction = await this.getCashTransaction(id);

    if (transaction.status !== CashTransactionStatus.POSTED) {
      throw new BadRequestException("Can only void posted cash transactions");
    }

    // Reverse the journal entry if exists
    if (transaction.journalEntryId) {
      await this.journalService.reverseJournalEntry(
        transaction.journalEntryId,
        userId,
      );
    }

    const updatedTransaction = await this.prisma.cashTransaction.update({
      where: { id },
      data: {
        status: CashTransactionStatus.VOID,
        updatedBy: userId,
      },
      include: {
        cashAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        offsetAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransaction;
  }
}
