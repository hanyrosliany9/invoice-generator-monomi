import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankTransferDto } from '../dto/create-bank-transfer.dto';
import { UpdateBankTransferDto } from '../dto/update-bank-transfer.dto';
import { BankTransferQueryDto } from '../dto/bank-transfer-query.dto';
import { BankTransferStatus, TransactionType } from '@prisma/client';
import { JournalService } from './journal.service';

@Injectable()
export class BankTransferService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Generate next bank transfer number
   */
  private async generateTransferNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `BTR-${year}-${month}`;

    const latestTransfer = await this.prisma.bankTransfer.findFirst({
      where: {
        transferNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        transferNumber: 'desc',
      },
    });

    if (latestTransfer) {
      const lastNumber = parseInt(latestTransfer.transferNumber.split('-').pop() || '0');
      const nextNumber = lastNumber + 1;
      return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
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
      throw new BadRequestException('Bank account not found');
    }

    // Bank accounts should be in the 1-1xxx range (Cash & Bank accounts)
    if (!account.code.startsWith('1-1')) {
      throw new BadRequestException(
        `Account ${account.code} is not a valid cash/bank account. Must use 1-1xxx accounts.`,
      );
    }

    if (!account.isActive) {
      throw new BadRequestException(`Account ${account.code} is not active`);
    }
  }

  /**
   * Validate that from and to accounts are different
   */
  private validateDifferentAccounts(fromAccountId: string, toAccountId: string): void {
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }
  }

  /**
   * Create bank transfer
   */
  async createBankTransfer(createDto: CreateBankTransferDto) {
    // Validate accounts
    await this.validateBankAccount(createDto.fromAccountId);
    await this.validateBankAccount(createDto.toAccountId);
    this.validateDifferentAccounts(createDto.fromAccountId, createDto.toAccountId);

    // Validate fee account if fee is provided
    if (createDto.transferFee && createDto.transferFee > 0 && createDto.feeAccountId) {
      const feeAccount = await this.prisma.chartOfAccounts.findUnique({
        where: { id: createDto.feeAccountId },
      });
      if (!feeAccount) {
        throw new BadRequestException('Fee account not found');
      }
      if (!feeAccount.isActive) {
        throw new BadRequestException(`Fee account ${feeAccount.code} is not active`);
      }
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber();

    // Create bank transfer
    const transfer = await this.prisma.bankTransfer.create({
      data: {
        transferNumber,
        transferDate: createDto.transferDate,
        amount: createDto.amount,
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
        status: createDto.status || BankTransferStatus.PENDING,
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
      sortBy = 'transferDate',
      sortOrder = 'desc',
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
        { transferNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { descriptionId: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
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
      throw new BadRequestException('Cannot update completed bank transfer');
    }

    if (existing.status === BankTransferStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot update transfer that is in progress');
    }

    // Validate accounts if they are being updated
    if (updateDto.fromAccountId) {
      await this.validateBankAccount(updateDto.fromAccountId);
    }
    if (updateDto.toAccountId) {
      await this.validateBankAccount(updateDto.toAccountId);
    }
    if (updateDto.fromAccountId && updateDto.toAccountId) {
      this.validateDifferentAccounts(updateDto.fromAccountId, updateDto.toAccountId);
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
    const transfer = await this.getBankTransfer(id);

    if (transfer.status !== BankTransferStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve transfer with status: ${transfer.status}`,
      );
    }

    // Create journal entry for this bank transfer
    const lineItems = [
      // Debit destination account
      {
        accountCode: transfer.toAccount.code,
        description: transfer.description,
        descriptionId: transfer.descriptionId || undefined,
        debit: Number(transfer.amount),
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
        credit: Number(transfer.amount),
        projectId: transfer.projectId || undefined,
        clientId: transfer.clientId || undefined,
      },
    ];

    // Add transfer fee if applicable
    if (transfer.transferFee && Number(transfer.transferFee) > 0 && transfer.feeAccountId) {
      const feeAccount = await this.prisma.chartOfAccounts.findUnique({
        where: { id: transfer.feeAccountId },
      });
      if (feeAccount) {
        lineItems.push({
          accountCode: feeAccount.code,
          description: `Transfer fee for ${transfer.transferNumber}`,
          descriptionId: `Biaya transfer untuk ${transfer.transferNumber}`,
          debit: Number(transfer.transferFee),
          credit: 0,
          projectId: transfer.projectId || undefined,
          clientId: transfer.clientId || undefined,
        });
        lineItems.push({
          accountCode: transfer.fromAccount.code,
          description: `Transfer fee for ${transfer.transferNumber}`,
          descriptionId: `Biaya transfer untuk ${transfer.transferNumber}`,
          debit: 0,
          credit: Number(transfer.transferFee),
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

    // Update bank transfer status
    const updatedTransfer = await this.prisma.bankTransfer.update({
      where: { id },
      data: {
        status: BankTransferStatus.COMPLETED,
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
      throw new BadRequestException('Can only reject pending bank transfers');
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
      throw new BadRequestException('Cannot cancel completed bank transfer');
    }

    if (transfer.status === BankTransferStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot cancel transfer that is in progress');
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
      throw new BadRequestException(
        'Cannot delete completed bank transfer.',
      );
    }

    if (transfer.status === BankTransferStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Cannot delete transfer that is in progress.',
      );
    }

    await this.prisma.bankTransfer.delete({
      where: { id },
    });

    return { message: 'Bank transfer deleted successfully' };
  }
}
