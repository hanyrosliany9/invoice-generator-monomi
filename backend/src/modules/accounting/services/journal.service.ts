import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from '../dto/update-journal-entry.dto';
import { JournalQueryDto } from '../dto/journal-query.dto';
import { JournalStatus, TransactionType } from '@prisma/client';

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Chart of Accounts
   */
  async getChartOfAccounts() {
    return this.prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: [{ accountType: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Get account by code
   */
  async getAccountByCode(code: string) {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    return account;
  }

  /**
   * Create new chart of account
   */
  async createChartOfAccount(data: any) {
    // Check if account code already exists
    const existing = await this.prisma.chartOfAccounts.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`Account with code ${data.code} already exists`);
    }

    // Create account
    return this.prisma.chartOfAccounts.create({
      data: {
        code: data.code,
        name: data.name,
        nameId: data.nameId,
        accountType: data.accountType,
        accountSubType: data.accountSubType,
        normalBalance: data.normalBalance,
        parentId: data.parentId || null,
        isControlAccount: data.isControlAccount || false,
        isTaxAccount: data.isTaxAccount || false,
        taxType: data.taxType || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isSystemAccount: false, // User-created accounts are never system accounts
        description: data.description || null,
        descriptionId: data.descriptionId || null,
      },
    });
  }

  /**
   * Update chart of account
   */
  async updateChartOfAccount(code: string, data: any) {
    // Check if account exists
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    // Prevent updating system accounts
    if (account.isSystemAccount) {
      throw new BadRequestException('Cannot modify system accounts');
    }

    // If code is being changed, check if new code exists
    if (data.code && data.code !== code) {
      const existing = await this.prisma.chartOfAccounts.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictException(`Account with code ${data.code} already exists`);
      }
    }

    // Update account
    return this.prisma.chartOfAccounts.update({
      where: { code },
      data: {
        code: data.code,
        name: data.name,
        nameId: data.nameId,
        accountType: data.accountType,
        accountSubType: data.accountSubType,
        normalBalance: data.normalBalance,
        parentId: data.parentId,
        isControlAccount: data.isControlAccount,
        isTaxAccount: data.isTaxAccount,
        taxType: data.taxType,
        isActive: data.isActive,
        description: data.description,
        descriptionId: data.descriptionId,
      },
    });
  }

  /**
   * Delete chart of account
   */
  async deleteChartOfAccount(code: string) {
    // Check if account exists
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    // Prevent deleting system accounts
    if (account.isSystemAccount) {
      throw new BadRequestException('Cannot delete system accounts');
    }

    // Check if account has been used in journal entries
    const hasJournalEntries = await this.prisma.journalEntryLineItem.findFirst({
      where: { accountCode: code },
    });

    if (hasJournalEntries) {
      throw new BadRequestException(
        'Cannot delete account that has been used in journal entries. Consider deactivating it instead.',
      );
    }

    // Check if account has been used in general ledger
    const hasLedgerEntries = await this.prisma.generalLedger.findFirst({
      where: { accountId: account.id },
    });

    if (hasLedgerEntries) {
      throw new BadRequestException(
        'Cannot delete account that has been used in general ledger. Consider deactivating it instead.',
      );
    }

    // Delete account
    return this.prisma.chartOfAccounts.delete({
      where: { code },
    });
  }

  /**
   * Toggle account active status
   */
  async toggleAccountStatus(code: string) {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    return this.prisma.chartOfAccounts.update({
      where: { code },
      data: { isActive: !account.isActive },
    });
  }

  /**
   * Generate next journal entry number
   */
  private async generateEntryNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get the latest entry number for this month
    const prefix = `JE-${year}-${month}`;
    const latestEntry = await this.prisma.journalEntry.findFirst({
      where: {
        entryNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        entryNumber: 'desc',
      },
    });

    if (latestEntry) {
      const lastNumber = parseInt(latestEntry.entryNumber.split('-').pop() || '0');
      const nextNumber = lastNumber + 1;
      return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
    }

    return `${prefix}-0001`;
  }

  /**
   * Validate journal entry (debit = credit)
   */
  private validateBalancedEntry(lineItems: any[]): void {
    const totalDebit = lineItems.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = lineItems.reduce((sum, item) => sum + item.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    if (totalDebit === 0 || totalCredit === 0) {
      throw new BadRequestException('Journal entry must have both debit and credit amounts');
    }
  }

  /**
   * Validate account codes exist
   */
  private async validateAccountCodes(lineItems: any[]): Promise<void> {
    const accountCodes = [...new Set(lineItems.map(item => item.accountCode))];

    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        code: { in: accountCodes },
        isActive: true,
      },
    });

    const foundCodes = new Set(accounts.map(a => a.code));
    const missingCodes = accountCodes.filter(code => !foundCodes.has(code));

    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `Invalid or inactive account codes: ${missingCodes.join(', ')}`,
      );
    }
  }

  /**
   * Get current fiscal period
   */
  async getCurrentFiscalPeriod() {
    const now = new Date();
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: 'OPEN',
      },
    });

    if (!period) {
      throw new NotFoundException('No open fiscal period found for current date');
    }

    return period;
  }

  /**
   * Get all fiscal periods
   */
  async getFiscalPeriods() {
    return this.prisma.fiscalPeriod.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Create journal entry
   */
  async createJournalEntry(createDto: CreateJournalEntryDto) {
    // Validate balanced entry
    this.validateBalancedEntry(createDto.lineItems);

    // Validate account codes
    await this.validateAccountCodes(createDto.lineItems);

    // Get or validate fiscal period
    let fiscalPeriodId = createDto.fiscalPeriodId;
    if (!fiscalPeriodId) {
      const currentPeriod = await this.getCurrentFiscalPeriod();
      fiscalPeriodId = currentPeriod.id;
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber();

    // Get account IDs for all account codes
    const accountCodes = [...new Set(createDto.lineItems.map(item => item.accountCode))];
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: { code: { in: accountCodes } },
      select: { id: true, code: true },
    });
    const accountMap = new Map(accounts.map(a => [a.code, a.id]));

    // Create journal entry with line items
    const journalEntry = await this.prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate: createDto.entryDate,
        description: createDto.description,
        descriptionId: createDto.descriptionId,
        descriptionEn: createDto.descriptionEn,
        transactionType: createDto.transactionType,
        transactionId: createDto.transactionId,
        documentNumber: createDto.documentNumber,
        documentDate: createDto.documentDate,
        status: createDto.status || JournalStatus.DRAFT,
        isPosted: false,
        fiscalPeriodId,
        isReversing: createDto.isReversing || false,
        reversedEntryId: createDto.reversedEntryId,
        createdBy: createDto.createdBy,
        lineItems: {
          create: createDto.lineItems.map((item, index) => ({
            lineNumber: index + 1,
            accountId: accountMap.get(item.accountCode)!,
            description: item.description,
            descriptionId: item.descriptionId,
            debit: item.debit,
            credit: item.credit,
            projectId: item.projectId,
            clientId: item.clientId,
            departmentId: item.departmentId,
          })),
        },
      },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
          include: {
            account: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        fiscalPeriod: true,
      },
    });

    return journalEntry;
  }

  /**
   * Get journal entries with pagination and filtering
   */
  async getJournalEntries(query: JournalQueryDto) {
    const {
      startDate,
      endDate,
      transactionType,
      status,
      isPosted,
      fiscalPeriodId,
      accountCode,
      transactionId,
      search,
      page = 1,
      limit = 50,
      sortBy = 'entryDate',
      sortOrder = 'desc',
    } = query;

    const where: any = {};

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = startDate;
      if (endDate) where.entryDate.lte = endDate;
    }

    if (transactionType) where.transactionType = transactionType;
    if (status) where.status = status;
    if (isPosted !== undefined) where.isPosted = isPosted;
    if (fiscalPeriodId) where.fiscalPeriodId = fiscalPeriodId;
    if (transactionId) where.transactionId = transactionId;

    if (accountCode) {
      where.lineItems = {
        some: {
          account: {
            code: accountCode,
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { descriptionId: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lineItems: {
            orderBy: { lineNumber: 'asc' },
            include: {
              account: {
                select: {
                  code: true,
                  name: true,
                  nameId: true,
                },
              },
            },
          },
          fiscalPeriod: true,
        },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    // Transform the data to match frontend expectations
    const transformedEntries = entries.map(entry => ({
      ...entry,
      lineItems: entry.lineItems.map(item => ({
        ...item,
        accountCode: item.account.code,
        debitAmount: Number(item.debit),
        creditAmount: Number(item.credit),
      })),
    }));

    return {
      data: transformedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single journal entry
   */
  async getJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
          include: {
            account: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        fiscalPeriod: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    return entry;
  }

  /**
   * Update journal entry (only if not posted)
   */
  async updateJournalEntry(id: string, updateDto: UpdateJournalEntryDto) {
    const existing = await this.getJournalEntry(id);

    if (existing.isPosted) {
      throw new BadRequestException('Cannot update posted journal entry');
    }

    if (updateDto.lineItems) {
      this.validateBalancedEntry(updateDto.lineItems);
      await this.validateAccountCodes(updateDto.lineItems);
    }

    // Delete existing line items and create new ones if provided
    if (updateDto.lineItems) {
      await this.prisma.journalLineItem.deleteMany({
        where: { journalEntryId: id },
      });
    }

    // Get account IDs for all account codes if line items are provided
    let accountMap: Map<string, string> | undefined;
    if (updateDto.lineItems) {
      const accountCodes = [...new Set(updateDto.lineItems.map(item => item.accountCode))];
      const accounts = await this.prisma.chartOfAccounts.findMany({
        where: { code: { in: accountCodes } },
        select: { id: true, code: true },
      });
      accountMap = new Map(accounts.map(a => [a.code, a.id]));
    }

    const updatedEntry = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        entryDate: updateDto.entryDate,
        description: updateDto.description,
        descriptionId: updateDto.descriptionId,
        descriptionEn: updateDto.descriptionEn,
        documentNumber: updateDto.documentNumber,
        documentDate: updateDto.documentDate,
        status: updateDto.status,
        updatedBy: updateDto.updatedBy,
        lineItems: updateDto.lineItems && accountMap
          ? {
              create: updateDto.lineItems.map((item, index) => ({
                lineNumber: index + 1,
                accountId: accountMap.get(item.accountCode)!,
                description: item.description,
                descriptionId: item.descriptionId,
                debit: item.debit,
                credit: item.credit,
                projectId: item.projectId,
                clientId: item.clientId,
                departmentId: item.departmentId,
              })),
            }
          : undefined,
      },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
          include: {
            account: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        fiscalPeriod: true,
      },
    });

    return updatedEntry;
  }

  /**
   * Post journal entry to ledger
   */
  async postJournalEntry(id: string, userId: string) {
    const entry = await this.getJournalEntry(id);

    if (entry.isPosted) {
      throw new BadRequestException('Journal entry is already posted');
    }

    const now = new Date();

    // Create general ledger entries for each line item
    const ledgerEntries = entry.lineItems.map(line => ({
      journalEntryId: entry.id,
      journalEntryNumber: entry.entryNumber,
      lineNumber: line.lineNumber,
      accountId: line.accountId,
      entryDate: entry.entryDate,
      postingDate: now,
      description: line.description || entry.description,
      descriptionId: line.descriptionId || entry.descriptionId || null,
      debit: line.debit,
      credit: line.credit,
      balance: 0, // Will be calculated by a trigger or separate service
      fiscalPeriodId: entry.fiscalPeriodId || null,
      transactionType: entry.transactionType,
      transactionId: entry.transactionId, // Required field
      documentNumber: entry.documentNumber || null,
      projectId: line.projectId || null,
      clientId: line.clientId || null,
    }));

    await this.prisma.$transaction([
      // Create ledger entries
      this.prisma.generalLedger.createMany({
        data: ledgerEntries,
      }),
      // Update journal entry status
      this.prisma.journalEntry.update({
        where: { id },
        data: {
          isPosted: true,
          status: JournalStatus.POSTED,
          postedAt: now,
          postedBy: userId,
        },
      }),
      // Update account balances (this will be handled by a separate function)
      // For now, we'll leave this as a placeholder
    ]);

    return this.getJournalEntry(id);
  }

  /**
   * Reverse journal entry
   */
  async reverseJournalEntry(id: string, userId: string) {
    const originalEntry = await this.getJournalEntry(id);

    if (!originalEntry.isPosted) {
      throw new BadRequestException('Can only reverse posted journal entries');
    }

    if (originalEntry.isReversing) {
      throw new BadRequestException('This entry is already a reversing entry');
    }

    // Check if already reversed
    const existingReversal = await this.prisma.journalEntry.findFirst({
      where: { reversedEntryId: id },
    });

    if (existingReversal) {
      throw new ConflictException('This entry has already been reversed');
    }

    // Create reversing entry with swapped debits/credits
    const reversingLineItems = originalEntry.lineItems.map(line => ({
      accountCode: line.account.code, // Get code from account relation
      description: `REVERSAL: ${line.description || originalEntry.description}`,
      descriptionId: line.descriptionId || undefined,
      debit: Number(line.credit), // Swap credit to debit
      credit: Number(line.debit),  // Swap debit to credit
      projectId: line.projectId || undefined,
      clientId: line.clientId || undefined,
      departmentId: line.departmentId || undefined,
    }));

    const reversingEntry = await this.createJournalEntry({
      entryDate: new Date(),
      description: `REVERSAL: ${originalEntry.description}`,
      descriptionId: originalEntry.descriptionId ?? undefined,
      descriptionEn: originalEntry.descriptionEn ?? undefined,
      transactionType: originalEntry.transactionType,
      transactionId: originalEntry.transactionId ?? id, // Use entry ID if no transaction ID
      documentNumber: originalEntry.documentNumber ?? undefined,
      documentDate: originalEntry.documentDate ?? undefined,
      fiscalPeriodId: originalEntry.fiscalPeriodId ?? undefined,
      isReversing: true,
      reversedEntryId: id,
      createdBy: userId,
      lineItems: reversingLineItems,
      status: JournalStatus.DRAFT,
    });

    // Auto-post the reversing entry
    await this.postJournalEntry(reversingEntry.id, userId);

    return reversingEntry;
  }

  /**
   * Delete journal entry (only if not posted)
   */
  async deleteJournalEntry(id: string) {
    const entry = await this.getJournalEntry(id);

    if (entry.isPosted) {
      throw new BadRequestException(
        'Cannot delete posted journal entry. Use reversal instead.',
      );
    }

    await this.prisma.journalEntry.delete({
      where: { id },
    });

    return { message: 'Journal entry deleted successfully' };
  }

  /**
   * Close fiscal period
   */
  async closeFiscalPeriod(id: string, userId: string) {
    const period = await this.prisma.fiscalPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }

    if (period.status === 'CLOSED') {
      throw new BadRequestException('Fiscal period is already closed');
    }

    // Check for unposted entries in this period
    const unpostedCount = await this.prisma.journalEntry.count({
      where: {
        fiscalPeriodId: id,
        isPosted: false,
      },
    });

    if (unpostedCount > 0) {
      throw new BadRequestException(
        `Cannot close period: ${unpostedCount} unposted journal entries exist`,
      );
    }

    const updatedPeriod = await this.prisma.fiscalPeriod.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: userId,
      },
    });

    return updatedPeriod;
  }

  /**
   * Automated journal entry creation for invoices
   */
  async createInvoiceJournalEntry(
    invoiceId: string,
    invoiceNumber: string,
    clientId: string,
    totalAmount: number,
    status: string,
    userId: string,
  ) {
    const transactionType = status === 'PAID'
      ? TransactionType.PAYMENT_RECEIVED
      : TransactionType.INVOICE_SENT;

    let lineItems: any[];

    if (status === 'SENT') {
      // Invoice SENT: Debit AR, Credit Revenue
      lineItems = [
        {
          accountCode: '1-2010', // Accounts Receivable
          description: `Invoice ${invoiceNumber}`,
          descriptionId: `Faktur ${invoiceNumber}`,
          debit: totalAmount,
          credit: 0,
          clientId: clientId,
        },
        {
          accountCode: '4-1010', // Service Revenue
          description: `Revenue from Invoice ${invoiceNumber}`,
          descriptionId: `Pendapatan dari Faktur ${invoiceNumber}`,
          debit: 0,
          credit: totalAmount,
          clientId: clientId,
        },
      ];
    } else {
      // Invoice PAID: Debit Cash, Credit AR
      lineItems = [
        {
          accountCode: '1-1020', // Bank Account
          description: `Payment for Invoice ${invoiceNumber}`,
          descriptionId: `Pembayaran Faktur ${invoiceNumber}`,
          debit: totalAmount,
          credit: 0,
          clientId: clientId,
        },
        {
          accountCode: '1-2010', // Accounts Receivable
          description: `Payment for Invoice ${invoiceNumber}`,
          descriptionId: `Pembayaran Faktur ${invoiceNumber}`,
          debit: 0,
          credit: totalAmount,
          clientId: clientId,
        },
      ];
    }

    return this.createJournalEntry({
      entryDate: new Date(),
      description: `Auto-generated: Invoice ${invoiceNumber} - ${status}`,
      descriptionId: `Otomatis: Faktur ${invoiceNumber} - ${status}`,
      transactionType,
      transactionId: invoiceId,
      documentNumber: invoiceNumber,
      documentDate: new Date(),
      createdBy: userId,
      lineItems,
    });
  }

  /**
   * Automated journal entry creation for expenses
   */
  async createExpenseJournalEntry(
    expenseId: string,
    expenseNumber: string,
    categoryCode: string,
    amount: number,
    status: string,
    userId: string,
  ) {
    const transactionType = status === 'PAID'
      ? TransactionType.PAYMENT_MADE
      : TransactionType.EXPENSE_SUBMITTED;

    let lineItems: any[];

    if (status === 'SUBMITTED' || status === 'APPROVED') {
      // Expense SUBMITTED: Debit Expense, Credit AP
      lineItems = [
        {
          accountCode: categoryCode, // Expense category account code (e.g., 6-2050)
          description: `Expense ${expenseNumber}`,
          descriptionId: `Beban ${expenseNumber}`,
          debit: amount,
          credit: 0,
        },
        {
          accountCode: '2-1010', // Accounts Payable
          description: `Payable for Expense ${expenseNumber}`,
          descriptionId: `Hutang Beban ${expenseNumber}`,
          debit: 0,
          credit: amount,
        },
      ];
    } else {
      // Expense PAID: Debit AP, Credit Cash
      lineItems = [
        {
          accountCode: '2-1010', // Accounts Payable
          description: `Payment for Expense ${expenseNumber}`,
          descriptionId: `Pembayaran Beban ${expenseNumber}`,
          debit: amount,
          credit: 0,
        },
        {
          accountCode: '1-1020', // Bank Account
          description: `Payment for Expense ${expenseNumber}`,
          descriptionId: `Pembayaran Beban ${expenseNumber}`,
          debit: 0,
          credit: amount,
        },
      ];
    }

    return this.createJournalEntry({
      entryDate: new Date(),
      description: `Auto-generated: Expense ${expenseNumber} - ${status}`,
      descriptionId: `Otomatis: Beban ${expenseNumber} - ${status}`,
      transactionType,
      transactionId: expenseId,
      documentNumber: expenseNumber,
      documentDate: new Date(),
      createdBy: userId,
      lineItems,
    });
  }

  /**
   * Create ECL provision reversal journal entry (PSAK 71)
   * Used when invoice is paid to reverse the expected credit loss provision
   */
  async createECLReversalEntry(
    provisionId: string,
    invoiceNumber: string,
    clientId: string,
    eclAmount: number,
    userId: string,
  ) {
    // ECL Reversal when invoice is paid:
    // Debit: 1-2015 (Allowance for Doubtful Accounts) - decrease allowance
    // Credit: 8-1010 (Bad Debt Expense) - reverse expense (recovery)
    const lineItems = [
      {
        accountCode: '1-2015', // Allowance for Doubtful Accounts
        description: `ECL reversal for paid Invoice ${invoiceNumber}`,
        descriptionId: `Pembalikan penyisihan piutang untuk Faktur ${invoiceNumber} (lunas)`,
        debit: eclAmount,
        credit: 0,
        clientId: clientId,
      },
      {
        accountCode: '8-1010', // Bad Debt Expense
        description: `ECL recovery for paid Invoice ${invoiceNumber}`,
        descriptionId: `Pemulihan penyisihan piutang untuk Faktur ${invoiceNumber} (lunas)`,
        debit: 0,
        credit: eclAmount,
        clientId: clientId,
      },
    ];

    return this.createJournalEntry({
      entryDate: new Date(),
      description: `Auto-generated: ECL Reversal - Invoice ${invoiceNumber} paid`,
      descriptionId: `Otomatis: Pembalikan Penyisihan PSAK 71 - Faktur ${invoiceNumber} lunas`,
      transactionType: TransactionType.ADJUSTMENT,
      transactionId: provisionId,
      documentNumber: `ECL-REV-${invoiceNumber}`,
      documentDate: new Date(),
      createdBy: userId,
      lineItems,
    });
  }

  /**
   * Automated journal entry creation for Purchase Orders (PO Commitment)
   *
   * PO APPROVED: Records commitment (optional)
   * - Debit: 6-XXXX (Expense/Asset account)
   * - Credit: 2-1020 (PO Commitments)
   *
   * PO CANCELLED: Reverses commitment
   * - Debit: 2-1020 (PO Commitments)
   * - Credit: 6-XXXX (Expense/Asset account)
   */
  async createPOJournalEntry(
    poId: string,
    poNumber: string,
    vendorId: string,
    totalAmount: number,
    status: string,
    userId: string,
  ) {
    const transactionType = status === 'APPROVED'
      ? TransactionType.PO_APPROVED
      : TransactionType.PO_CANCELLED;

    let lineItems: any[];

    if (status === 'APPROVED') {
      // PO APPROVED: Record commitment
      // Debit Expense/Asset, Credit PO Commitments
      lineItems = [
        {
          accountCode: '6-1010', // General Expenses (default, will be overridden by line item categories)
          description: `PO Commitment ${poNumber}`,
          descriptionId: `Komitmen PO ${poNumber}`,
          debit: totalAmount,
          credit: 0,
        },
        {
          accountCode: '2-1020', // PO Commitments
          description: `PO Commitment ${poNumber}`,
          descriptionId: `Komitmen PO ${poNumber}`,
          debit: 0,
          credit: totalAmount,
        },
      ];
    } else {
      // PO CANCELLED: Reverse commitment
      // Debit PO Commitments, Credit Expense/Asset
      lineItems = [
        {
          accountCode: '2-1020', // PO Commitments
          description: `Cancel PO Commitment ${poNumber}`,
          descriptionId: `Batalkan Komitmen PO ${poNumber}`,
          debit: totalAmount,
          credit: 0,
        },
        {
          accountCode: '6-1010', // General Expenses
          description: `Cancel PO Commitment ${poNumber}`,
          descriptionId: `Batalkan Komitmen PO ${poNumber}`,
          debit: 0,
          credit: totalAmount,
        },
      ];
    }

    return this.createJournalEntry({
      entryDate: new Date(),
      description: `Auto-generated: PO ${poNumber} - ${status}`,
      descriptionId: `Otomatis: PO ${poNumber} - ${status}`,
      transactionType,
      transactionId: poId,
      documentNumber: poNumber,
      documentDate: new Date(),
      createdBy: userId,
      lineItems,
    });
  }
}
