import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateBankReconciliationDto,
  CreateBankReconciliationItemDto,
} from "../dto/create-bank-reconciliation.dto";
import { UpdateBankReconciliationDto } from "../dto/update-bank-reconciliation.dto";
import { BankReconciliationQueryDto } from "../dto/bank-reconciliation-query.dto";
import {
  BankRecStatus,
  BankRecItemType,
  TransactionType,
} from "@prisma/client";
import { JournalService } from "./journal.service";

@Injectable()
export class BankReconciliationService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Generate next bank reconciliation number
   */
  private async generateReconciliationNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `BRC-${year}-${month}`;

    const latestReconciliation = await this.prisma.bankReconciliation.findFirst(
      {
        where: {
          reconciliationNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          reconciliationNumber: "desc",
        },
      },
    );

    if (latestReconciliation) {
      const lastNumber = parseInt(
        latestReconciliation.reconciliationNumber.split("-").pop() || "0",
      );
      const nextNumber = lastNumber + 1;
      return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
    }

    return `${prefix}-0001`;
  }

  /**
   * Validate account is a cash/bank account
   */
  private async validateBankAccount(accountId: string): Promise<void> {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new BadRequestException("Bank account not found");
    }

    // Bank accounts should be in the 1-1xxx range (Cash & Bank accounts)
    if (!account.code.startsWith("1-1")) {
      throw new BadRequestException(
        `Account ${account.code} is not a valid cash/bank account. Must use 1-1xxx accounts.`,
      );
    }

    if (!account.isActive) {
      throw new BadRequestException(`Account ${account.code} is not active`);
    }
  }

  /**
   * Calculate reconciliation balances
   */
  private calculateReconciliation(data: {
    bookBalanceEnd: number;
    statementBalance: number;
    depositsInTransit: number;
    outstandingChecks: number;
    bankCharges: number;
    bankInterest: number;
    otherAdjustments: number;
  }): {
    adjustedBookBalance: number;
    adjustedBankBalance: number;
    difference: number;
    isBalanced: boolean;
  } {
    // Adjusted Book Balance = Book Balance + Bank Interest - Bank Charges + Other Adjustments
    const adjustedBookBalance =
      Number(data.bookBalanceEnd) +
      Number(data.bankInterest) -
      Number(data.bankCharges) +
      Number(data.otherAdjustments);

    // Adjusted Bank Balance = Statement Balance + Deposits in Transit - Outstanding Checks
    const adjustedBankBalance =
      Number(data.statementBalance) +
      Number(data.depositsInTransit) -
      Number(data.outstandingChecks);

    const difference = Math.abs(adjustedBookBalance - adjustedBankBalance);
    const isBalanced = difference < 0.01; // Allow for rounding errors

    return {
      adjustedBookBalance,
      adjustedBankBalance,
      difference,
      isBalanced,
    };
  }

  /**
   * Create bank reconciliation
   */
  async createBankReconciliation(createDto: CreateBankReconciliationDto) {
    // Validate bank account
    await this.validateBankAccount(createDto.bankAccountId);

    // Generate reconciliation number
    const reconciliationNumber = await this.generateReconciliationNumber();

    // Calculate balances
    const calculations = this.calculateReconciliation({
      bookBalanceEnd: createDto.bookBalanceEnd,
      statementBalance: createDto.statementBalance,
      depositsInTransit: createDto.depositsInTransit || 0,
      outstandingChecks: createDto.outstandingChecks || 0,
      bankCharges: createDto.bankCharges || 0,
      bankInterest: createDto.bankInterest || 0,
      otherAdjustments: createDto.otherAdjustments || 0,
    });

    // Create bank reconciliation with items
    const reconciliation = await this.prisma.bankReconciliation.create({
      data: {
        reconciliationNumber,
        bankAccountId: createDto.bankAccountId,
        statementDate: createDto.statementDate,
        periodStartDate: createDto.periodStartDate,
        periodEndDate: createDto.periodEndDate,
        bookBalanceStart: createDto.bookBalanceStart,
        bookBalanceEnd: createDto.bookBalanceEnd,
        statementBalance: createDto.statementBalance,
        depositsInTransit: createDto.depositsInTransit || 0,
        outstandingChecks: createDto.outstandingChecks || 0,
        bankCharges: createDto.bankCharges || 0,
        bankInterest: createDto.bankInterest || 0,
        otherAdjustments: createDto.otherAdjustments || 0,
        adjustedBookBalance: calculations.adjustedBookBalance,
        adjustedBankBalance: calculations.adjustedBankBalance,
        difference: calculations.difference,
        isBalanced: calculations.isBalanced,
        statementReference: createDto.statementReference,
        statementFilePath: createDto.statementFilePath,
        status: createDto.status || BankRecStatus.DRAFT,
        notes: createDto.notes,
        notesId: createDto.notesId,
        createdBy: createDto.createdBy,
        reconciliationItems: createDto.reconciliationItems
          ? {
              create: createDto.reconciliationItems.map((item) => ({
                itemDate: item.itemDate,
                itemType: item.itemType,
                description: item.description,
                descriptionId: item.descriptionId,
                amount: item.amount,
                isMatched: item.isMatched || false,
                matchedTransactionId: item.matchedTransactionId,
                status: item.status,
                requiresAdjustment: item.requiresAdjustment || false,
                checkNumber: item.checkNumber,
                reference: item.reference,
                notes: item.notes,
                createdBy: createDto.createdBy,
              })),
            }
          : undefined,
      },
      include: {
        bankAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        reconciliationItems: true,
      },
    });

    return reconciliation;
  }

  /**
   * Get bank reconciliations with pagination and filtering
   */
  async getBankReconciliations(query: BankReconciliationQueryDto) {
    const {
      startDate,
      endDate,
      status,
      bankAccountId,
      isBalanced,
      search,
      page = 1,
      limit = 50,
      sortBy = "statementDate",
      sortOrder = "desc",
    } = query;

    const where: any = {};

    if (startDate || endDate) {
      where.statementDate = {};
      if (startDate) where.statementDate.gte = startDate;
      if (endDate) where.statementDate.lte = endDate;
    }

    if (status) where.status = status;
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (isBalanced !== undefined) where.isBalanced = isBalanced;

    if (search) {
      where.OR = [
        { reconciliationNumber: { contains: search, mode: "insensitive" } },
        { statementReference: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [reconciliations, total] = await Promise.all([
      this.prisma.bankReconciliation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          bankAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
          reconciliationItems: true,
        },
      }),
      this.prisma.bankReconciliation.count({ where }),
    ]);

    return {
      data: reconciliations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single bank reconciliation
   */
  async getBankReconciliation(id: string) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: { id },
      include: {
        bankAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        reconciliationItems: true,
      },
    });

    if (!reconciliation) {
      throw new NotFoundException(
        `Bank reconciliation with ID ${id} not found`,
      );
    }

    return reconciliation;
  }

  /**
   * Update bank reconciliation (only if not completed)
   */
  async updateBankReconciliation(
    id: string,
    updateDto: UpdateBankReconciliationDto,
  ) {
    const existing = await this.getBankReconciliation(id);

    if (existing.status === BankRecStatus.COMPLETED) {
      throw new BadRequestException(
        "Cannot update completed bank reconciliation",
      );
    }

    // Recalculate balances if relevant fields are updated
    let calculations = undefined;
    if (
      updateDto.bookBalanceEnd !== undefined ||
      updateDto.statementBalance !== undefined ||
      updateDto.depositsInTransit !== undefined ||
      updateDto.outstandingChecks !== undefined ||
      updateDto.bankCharges !== undefined ||
      updateDto.bankInterest !== undefined ||
      updateDto.otherAdjustments !== undefined
    ) {
      calculations = this.calculateReconciliation({
        bookBalanceEnd:
          updateDto.bookBalanceEnd ?? Number(existing.bookBalanceEnd),
        statementBalance:
          updateDto.statementBalance ?? Number(existing.statementBalance),
        depositsInTransit:
          updateDto.depositsInTransit ?? Number(existing.depositsInTransit),
        outstandingChecks:
          updateDto.outstandingChecks ?? Number(existing.outstandingChecks),
        bankCharges: updateDto.bankCharges ?? Number(existing.bankCharges),
        bankInterest: updateDto.bankInterest ?? Number(existing.bankInterest),
        otherAdjustments:
          updateDto.otherAdjustments ?? Number(existing.otherAdjustments),
      });
    }

    const updatedReconciliation = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        statementDate: updateDto.statementDate,
        periodStartDate: updateDto.periodStartDate,
        periodEndDate: updateDto.periodEndDate,
        bookBalanceStart: updateDto.bookBalanceStart,
        bookBalanceEnd: updateDto.bookBalanceEnd,
        statementBalance: updateDto.statementBalance,
        depositsInTransit: updateDto.depositsInTransit,
        outstandingChecks: updateDto.outstandingChecks,
        bankCharges: updateDto.bankCharges,
        bankInterest: updateDto.bankInterest,
        otherAdjustments: updateDto.otherAdjustments,
        adjustedBookBalance: calculations?.adjustedBookBalance,
        adjustedBankBalance: calculations?.adjustedBankBalance,
        difference: calculations?.difference,
        isBalanced: calculations?.isBalanced,
        statementReference: updateDto.statementReference,
        statementFilePath: updateDto.statementFilePath,
        status: updateDto.status,
        notes: updateDto.notes,
        notesId: updateDto.notesId,
        updatedBy: updateDto.updatedBy,
      },
      include: {
        bankAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        reconciliationItems: true,
      },
    });

    return updatedReconciliation;
  }

  /**
   * Add reconciliation item
   */
  async addReconciliationItem(
    reconciliationId: string,
    itemDto: CreateBankReconciliationItemDto,
    userId: string,
  ) {
    const reconciliation = await this.getBankReconciliation(reconciliationId);

    if (reconciliation.status === BankRecStatus.COMPLETED) {
      throw new BadRequestException(
        "Cannot add items to completed reconciliation",
      );
    }

    const item = await this.prisma.bankReconciliationItem.create({
      data: {
        reconciliationId,
        itemDate: itemDto.itemDate,
        itemType: itemDto.itemType,
        description: itemDto.description,
        descriptionId: itemDto.descriptionId,
        amount: itemDto.amount,
        isMatched: itemDto.isMatched || false,
        matchedTransactionId: itemDto.matchedTransactionId,
        status: itemDto.status,
        requiresAdjustment: itemDto.requiresAdjustment || false,
        checkNumber: itemDto.checkNumber,
        reference: itemDto.reference,
        notes: itemDto.notes,
        createdBy: userId,
      },
    });

    return item;
  }

  /**
   * Match reconciliation item with transaction
   */
  async matchReconciliationItem(
    itemId: string,
    transactionId: string,
    userId: string,
  ) {
    const item = await this.prisma.bankReconciliationItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Reconciliation item with ID ${itemId} not found`,
      );
    }

    const updatedItem = await this.prisma.bankReconciliationItem.update({
      where: { id: itemId },
      data: {
        isMatched: true,
        matchedTransactionId: transactionId,
        matchedAt: new Date(),
        matchedBy: userId,
        status: "MATCHED",
      },
    });

    return updatedItem;
  }

  /**
   * Review bank reconciliation
   */
  async reviewBankReconciliation(id: string, userId: string) {
    const reconciliation = await this.getBankReconciliation(id);

    if (
      reconciliation.status !== BankRecStatus.DRAFT &&
      reconciliation.status !== BankRecStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        `Cannot review reconciliation with status: ${reconciliation.status}`,
      );
    }

    const updatedReconciliation = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: BankRecStatus.REVIEWED,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        bankAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        reconciliationItems: true,
      },
    });

    return updatedReconciliation;
  }

  /**
   * Approve and complete bank reconciliation
   * This creates journal entries for adjustments
   */
  async approveBankReconciliation(id: string, userId: string) {
    const reconciliation = await this.getBankReconciliation(id);

    if (reconciliation.status !== BankRecStatus.REVIEWED) {
      throw new BadRequestException(
        `Cannot approve reconciliation with status: ${reconciliation.status}`,
      );
    }

    if (!reconciliation.isBalanced) {
      throw new BadRequestException(
        "Cannot approve unbalanced reconciliation. Please resolve all differences first.",
      );
    }

    // Create journal entry for adjustments (if any)
    let journalEntry = null;
    const lineItems = [];

    // Add bank charges (if any)
    if (Number(reconciliation.bankCharges) > 0) {
      const bankChargesAccount = await this.prisma.chartOfAccounts.findFirst({
        where: { code: { startsWith: "6-3" } }, // Bank charges expense account
      });
      if (bankChargesAccount) {
        lineItems.push({
          accountCode: bankChargesAccount.code,
          description: "Bank charges",
          descriptionId: "Biaya bank",
          debit: Number(reconciliation.bankCharges),
          credit: 0,
        });
        lineItems.push({
          accountCode: reconciliation.bankAccount.code,
          description: "Bank charges",
          descriptionId: "Biaya bank",
          debit: 0,
          credit: Number(reconciliation.bankCharges),
        });
      }
    }

    // Add bank interest (if any)
    if (Number(reconciliation.bankInterest) > 0) {
      const bankInterestAccount = await this.prisma.chartOfAccounts.findFirst({
        where: { code: { startsWith: "4-9" } }, // Other income account
      });
      if (bankInterestAccount) {
        lineItems.push({
          accountCode: reconciliation.bankAccount.code,
          description: "Bank interest",
          descriptionId: "Bunga bank",
          debit: Number(reconciliation.bankInterest),
          credit: 0,
        });
        lineItems.push({
          accountCode: bankInterestAccount.code,
          description: "Bank interest",
          descriptionId: "Bunga bank",
          debit: 0,
          credit: Number(reconciliation.bankInterest),
        });
      }
    }

    // Create journal entry if there are adjustments
    if (lineItems.length > 0) {
      journalEntry = await this.journalService.createJournalEntry({
        entryDate: reconciliation.statementDate,
        description: `Bank Reconciliation Adjustments: ${reconciliation.reconciliationNumber}`,
        descriptionId: `Penyesuaian Rekonsiliasi Bank: ${reconciliation.reconciliationNumber}`,
        transactionType: TransactionType.BANK_RECONCILIATION,
        transactionId: reconciliation.id,
        documentNumber: reconciliation.reconciliationNumber,
        documentDate: reconciliation.statementDate,
        createdBy: userId,
        lineItems,
      });

      // Post the journal entry to general ledger
      await this.journalService.postJournalEntry(journalEntry.id, userId);
    }

    // Update bank reconciliation status
    const updatedReconciliation = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: BankRecStatus.COMPLETED,
        approvedBy: userId,
        approvedAt: new Date(),
        adjustmentJournalId: journalEntry?.id,
      },
      include: {
        bankAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        reconciliationItems: true,
      },
    });

    return updatedReconciliation;
  }

  /**
   * Reject bank reconciliation
   */
  async rejectBankReconciliation(id: string, userId: string, reason: string) {
    const reconciliation = await this.getBankReconciliation(id);

    if (reconciliation.status !== BankRecStatus.REVIEWED) {
      throw new BadRequestException(
        "Can only reject reviewed bank reconciliations",
      );
    }

    const updatedReconciliation = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: BankRecStatus.REJECTED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        bankAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        reconciliationItems: true,
      },
    });

    return updatedReconciliation;
  }

  /**
   * Delete bank reconciliation (only if draft or rejected)
   */
  async deleteBankReconciliation(id: string) {
    const reconciliation = await this.getBankReconciliation(id);

    if (reconciliation.status === BankRecStatus.COMPLETED) {
      throw new BadRequestException(
        "Cannot delete completed bank reconciliation.",
      );
    }

    await this.prisma.bankReconciliation.delete({
      where: { id },
    });

    return { message: "Bank reconciliation deleted successfully" };
  }
}
