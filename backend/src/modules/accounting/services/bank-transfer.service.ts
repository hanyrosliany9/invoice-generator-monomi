import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBankTransferDto } from "../dto/create-bank-transfer.dto";
import { UpdateBankTransferDto } from "../dto/update-bank-transfer.dto";
import { BankTransferQueryDto } from "../dto/bank-transfer-query.dto";
import { BankTransferStatus, TransactionType, Currency } from "@prisma/client";
import { JournalService } from "./journal.service";
import { ExchangeRateService } from "./exchange-rate.service";
import { isCashOrBank } from "../cash-accounts.util";

@Injectable()
export class BankTransferService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Generate next bank transfer number
   */
  private async generateTransferNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `BTR-${year}-${month}`;

    const latestTransfer = await this.prisma.bankTransfer.findFirst({
      where: {
        transferNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        transferNumber: "desc",
      },
    });

    if (latestTransfer) {
      const lastNumber = parseInt(
        latestTransfer.transferNumber.split("-").pop() || "0",
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
   * Validate that from and to accounts are different
   */
  private validateDifferentAccounts(
    fromAccountId: string,
    toAccountId: string,
  ): void {
    if (fromAccountId === toAccountId) {
      throw new BadRequestException(
        "Source and destination accounts must be different",
      );
    }
  }

  /**
   * Create bank transfer
   */
  async createBankTransfer(
    createDto: CreateBankTransferDto & { createdBy: string },
  ) {
    // Validate accounts
    await this.validateBankAccount(createDto.fromAccountId);
    await this.validateBankAccount(createDto.toAccountId);
    this.validateDifferentAccounts(
      createDto.fromAccountId,
      createDto.toAccountId,
    );

    // Validate fee account if fee is provided
    if (createDto.transferFee && createDto.transferFee > 0) {
      if (!createDto.feeAccountId) {
        throw new BadRequestException(
          "feeAccountId is required when transferFee > 0",
        );
      }
      const feeAccount = await this.prisma.chartOfAccounts.findUnique({
        where: { id: createDto.feeAccountId },
      });
      if (!feeAccount) {
        throw new BadRequestException("Fee account not found");
      }
      if (!feeAccount.isActive) {
        throw new BadRequestException(
          `Fee account ${feeAccount.code} is not active`,
        );
      }
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber();

    // Handle multi-currency conversion
    const currency = createDto.currency || Currency.IDR;
    let exchangeRate = createDto.exchangeRate;
    let idrAmount = createDto.idrAmount;
    let originalAmount = createDto.originalAmount;

    if (currency === Currency.IDR) {
      // IDR transfer - no conversion needed
      idrAmount = createDto.amount;
      exchangeRate = 1;
      originalAmount = createDto.amount;
    } else {
      // Foreign currency transfer - need conversion
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

    // Create bank transfer — retry once on unique number collision (FIX 2: number race)
    const createTransferData = async (number: string) =>
      this.prisma.bankTransfer.create({
        data: {
          transferNumber: number,
          transferDate: createDto.transferDate,
          amount: createDto.amount,
          currency,
          originalAmount,
          exchangeRate,
          idrAmount,
          fromAccountId: createDto.fromAccountId,
          toAccountId: createDto.toAccountId,
          description: createDto.description,
          descriptionId: createDto.descriptionId,
          descriptionEn: createDto.descriptionEn,
          reference: createDto.reference,
          transferFee: createDto.transferFee,
          feeAccountId: createDto.feeAccountId,
          feePaymentMethod: createDto.feePaymentMethod,
          transferMethod: createDto.transferMethod,
          bankReference: createDto.bankReference,
          confirmationCode: createDto.confirmationCode,
          projectId: createDto.projectId,
          clientId: createDto.clientId,
          status: BankTransferStatus.PENDING,
          notes: createDto.notes,
          notesId: createDto.notesId,
          createdBy: createDto.createdBy,
        },
        include: {
          fromAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
          toAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
        },
      });

    let transfer: Awaited<ReturnType<typeof createTransferData>>;
    try {
      transfer = await createTransferData(transferNumber);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        // Regenerate number and retry once
        const retryNumber = await this.generateTransferNumber();
        try {
          transfer = await createTransferData(retryNumber);
        } catch (retryError) {
          if (
            retryError &&
            typeof retryError === "object" &&
            "code" in retryError &&
            retryError.code === "P2002"
          ) {
            throw new ConflictException(
              "Duplicate transfer number — please retry",
            );
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    return transfer;
  }

  /**
   * Get bank transfers with pagination and filtering
   */
  async getBankTransfers(query: BankTransferQueryDto) {
    const {
      startDate,
      endDate,
      status,
      transferMethod,
      fromAccountId,
      toAccountId,
      projectId,
      clientId,
      search,
      page = 1,
      limit = 50,
      sortBy = "transferDate",
      sortOrder = "desc",
    } = query;

    const where: any = {};

    if (startDate || endDate) {
      where.transferDate = {};
      if (startDate) where.transferDate.gte = startDate;
      if (endDate) where.transferDate.lte = endDate;
    }

    if (status) where.status = status;
    if (transferMethod) where.transferMethod = transferMethod;
    if (fromAccountId) where.fromAccountId = fromAccountId;
    if (toAccountId) where.toAccountId = toAccountId;
    if (projectId) where.projectId = projectId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { transferNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { descriptionId: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      this.prisma.bankTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          fromAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
          toAccount: {
            select: {
              code: true,
              name: true,
              nameId: true,
            },
          },
        },
      }),
      this.prisma.bankTransfer.count({ where }),
    ]);

    return {
      data: transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single bank transfer
   */
  async getBankTransfer(id: string) {
    const transfer = await this.prisma.bankTransfer.findUnique({
      where: { id },
      include: {
        fromAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        toAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Bank transfer with ID ${id} not found`);
    }

    return transfer;
  }

  /**
   * Update bank transfer (only if not completed)
   */
  async updateBankTransfer(id: string, updateDto: UpdateBankTransferDto) {
    const existing = await this.getBankTransfer(id);

    if (existing.status === BankTransferStatus.COMPLETED) {
      throw new BadRequestException("Cannot update completed bank transfer");
    }

    if (existing.status === BankTransferStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Cannot update transfer that is in progress",
      );
    }

    // Validate accounts if they are being updated
    if (updateDto.fromAccountId) {
      await this.validateBankAccount(updateDto.fromAccountId);
    }
    if (updateDto.toAccountId) {
      await this.validateBankAccount(updateDto.toAccountId);
    }
    if (updateDto.fromAccountId && updateDto.toAccountId) {
      this.validateDifferentAccounts(
        updateDto.fromAccountId,
        updateDto.toAccountId,
      );
    }

    const updatedTransfer = await this.prisma.bankTransfer.update({
      where: { id },
      data: {
        transferDate: updateDto.transferDate,
        amount: updateDto.amount,
        fromAccountId: updateDto.fromAccountId,
        toAccountId: updateDto.toAccountId,
        description: updateDto.description,
        descriptionId: updateDto.descriptionId,
        descriptionEn: updateDto.descriptionEn,
        reference: updateDto.reference,
        transferFee: updateDto.transferFee,
        feeAccountId: updateDto.feeAccountId,
        feePaymentMethod: updateDto.feePaymentMethod,
        transferMethod: updateDto.transferMethod,
        bankReference: updateDto.bankReference,
        confirmationCode: updateDto.confirmationCode,
        projectId: updateDto.projectId,
        clientId: updateDto.clientId,
        notes: updateDto.notes,
        notesId: updateDto.notesId,
        updatedBy: updateDto.updatedBy,
      },
      include: {
        fromAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        toAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransfer;
  }

  /**
   * Approve and complete bank transfer
   * This creates the journal entry and posts to general ledger
   */
  async approveBankTransfer(id: string, userId: string) {
    // FIX 1a: Idempotency gate — if already completed return early, no second journal
    const existing = await this.getBankTransfer(id);
    if (existing.status === BankTransferStatus.COMPLETED) {
      return existing;
    }

    // FIX 1b: Atomic claim — only one caller wins; others get count===0 and bail
    const claimed = await this.prisma.bankTransfer.updateMany({
      where: {
        id,
        journalEntryId: null,
        status: BankTransferStatus.PENDING,
      },
      data: { status: BankTransferStatus.COMPLETED },
    });
    if (claimed.count === 0) {
      // Another concurrent caller already claimed or it was already processed
      return this.getBankTransfer(id);
    }

    // Re-fetch with full includes needed for journal line items
    const transfer = await this.getBankTransfer(id);

    if (
      transfer.status !== BankTransferStatus.COMPLETED ||
      transfer.journalEntryId !== null
    ) {
      // Defensive: shouldn't happen after the claim, but guard anyway
      return transfer;
    }

    // CRITICAL: Use idrAmount for journal entries (accounting must be in IDR)
    const amountForJournal = Number(transfer.idrAmount);

    // Create journal entry for this bank transfer
    const lineItems = [
      // Debit destination account
      {
        accountCode: transfer.toAccount.code,
        description: transfer.description,
        descriptionId: transfer.descriptionId || undefined,
        debit: amountForJournal,
        credit: 0,
        projectId: transfer.projectId || undefined,
        clientId: transfer.clientId || undefined,
      },
      // Credit source account
      {
        accountCode: transfer.fromAccount.code,
        description: transfer.description,
        descriptionId: transfer.descriptionId || undefined,
        debit: 0,
        credit: amountForJournal,
        projectId: transfer.projectId || undefined,
        clientId: transfer.clientId || undefined,
      },
    ];

    // Add transfer fee if applicable
    if (
      transfer.transferFee &&
      Number(transfer.transferFee) > 0 &&
      transfer.feeAccountId
    ) {
      const feeAccount = await this.prisma.chartOfAccounts.findUnique({
        where: { id: transfer.feeAccountId },
      });
      if (feeAccount) {
        // The fee is stored in the transfer's original currency.
        // Convert to IDR using the same exchangeRate that produced idrAmount
        // so both legs balance in the IDR ledger.
        // For IDR transfers exchangeRate === 1, so behaviour is unchanged.
        // Example: 10 USD fee × 16 000 (USD→IDR rate) = 160 000 IDR per leg.
        const feeInIdr = Math.round(
          Number(transfer.transferFee) * Number(transfer.exchangeRate),
        );
        lineItems.push({
          accountCode: feeAccount.code,
          description: `Transfer fee for ${transfer.transferNumber}`,
          descriptionId: `Biaya transfer untuk ${transfer.transferNumber}`,
          debit: feeInIdr,
          credit: 0,
          projectId: transfer.projectId || undefined,
          clientId: transfer.clientId || undefined,
        });
        lineItems.push({
          accountCode: transfer.fromAccount.code,
          description: `Transfer fee for ${transfer.transferNumber}`,
          descriptionId: `Biaya transfer untuk ${transfer.transferNumber}`,
          debit: 0,
          credit: feeInIdr,
          projectId: transfer.projectId || undefined,
          clientId: transfer.clientId || undefined,
        });
      }
    }

    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: transfer.transferDate,
      description: `Bank Transfer: ${transfer.transferNumber}`,
      descriptionId: `Transfer Bank: ${transfer.transferNumber}`,
      descriptionEn: transfer.descriptionEn || undefined,
      transactionType: TransactionType.BANK_TRANSFER,
      transactionId: transfer.id,
      documentNumber: transfer.transferNumber,
      documentDate: transfer.transferDate,
      createdBy: userId,
      lineItems,
    });

    // Post the journal entry to general ledger
    await this.journalService.postJournalEntry(journalEntry.id, userId);

    // Update bank transfer — status already set to COMPLETED by atomic claim above;
    // now stamp approvedBy/At, completedAt/By, and journalEntryId atomically
    const updatedTransfer = await this.prisma.bankTransfer.update({
      where: { id },
      data: {
        approvedBy: userId,
        approvedAt: new Date(),
        completedAt: new Date(),
        completedBy: userId,
        journalEntryId: journalEntry.id,
      },
      include: {
        fromAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        toAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransfer;
  }

  /**
   * Reject bank transfer
   */
  async rejectBankTransfer(id: string, userId: string, reason: string) {
    const transfer = await this.getBankTransfer(id);

    if (transfer.status !== BankTransferStatus.PENDING) {
      throw new BadRequestException("Can only reject pending bank transfers");
    }

    const updatedTransfer = await this.prisma.bankTransfer.update({
      where: { id },
      data: {
        status: BankTransferStatus.REJECTED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        fromAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        toAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransfer;
  }

  /**
   * Cancel bank transfer
   */
  async cancelBankTransfer(id: string, userId: string) {
    const transfer = await this.getBankTransfer(id);

    if (transfer.status === BankTransferStatus.COMPLETED) {
      throw new BadRequestException("Cannot cancel completed bank transfer");
    }

    if (transfer.status === BankTransferStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Cannot cancel transfer that is in progress",
      );
    }

    // FIX 5: Reverse posted journal entry before marking CANCELLED so GL stays balanced.
    if (transfer.journalEntryId) {
      try {
        const journalEntry = await this.prisma.journalEntry.findUnique({
          where: { id: transfer.journalEntryId },
          select: { id: true, isPosted: true, entryNumber: true },
        });

        if (journalEntry && journalEntry.isPosted) {
          const existingReversal = await this.prisma.journalEntry.findFirst({
            where: { reversedEntryId: transfer.journalEntryId },
            select: { id: true },
          });

          if (!existingReversal) {
            await this.journalService.reverseJournalEntry(
              transfer.journalEntryId,
              userId,
            );
          }
        }
      } catch (error) {
        // Log but don't block the cancellation
        console.error(
          `Failed to reverse journal entry for bank transfer ${id}:`,
          error,
        );
      }
    }

    const updatedTransfer = await this.prisma.bankTransfer.update({
      where: { id },
      data: {
        status: BankTransferStatus.CANCELLED,
        updatedBy: userId,
      },
      include: {
        fromAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
        toAccount: {
          select: {
            code: true,
            name: true,
            nameId: true,
          },
        },
      },
    });

    return updatedTransfer;
  }

  /**
   * Delete bank transfer (only if pending or rejected)
   */
  async deleteBankTransfer(id: string) {
    const transfer = await this.getBankTransfer(id);

    if (transfer.status === BankTransferStatus.COMPLETED) {
      throw new BadRequestException("Cannot delete completed bank transfer.");
    }

    if (transfer.status === BankTransferStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Cannot delete transfer that is in progress.",
      );
    }

    if (transfer.status === BankTransferStatus.CANCELLED) {
      throw new BadRequestException(
        "Cannot delete cancelled bank transfer — it has posted reversal journals.",
      );
    }

    await this.prisma.bankTransfer.delete({
      where: { id },
    });

    return { message: "Bank transfer deleted successfully" };
  }
}
