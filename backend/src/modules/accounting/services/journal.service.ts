import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateJournalEntryDto } from "../dto/create-journal-entry.dto";
import { UpdateJournalEntryDto } from "../dto/update-journal-entry.dto";
import { JournalQueryDto } from "../dto/journal-query.dto";
import { JournalStatus, TransactionType } from "@prisma/client";

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Get Chart of Accounts
   */
  async getChartOfAccounts() {
    return this.prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
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
   * If the account is an EXPENSE type, automatically create corresponding ExpenseCategory
   */
  async createChartOfAccount(data: any) {
    // Check if account code already exists
    const existing = await this.prisma.chartOfAccounts.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(
        `Account with code ${data.code} already exists`,
      );
    }

    // Create account
    const account = await this.prisma.chartOfAccounts.create({
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

    // AUTO-CREATE ExpenseCategory if this is an EXPENSE type account
    if (account.accountType === 'EXPENSE') {
      try {
        const expenseClass = this.deriveExpenseClass(account.code);
        const categoryCode = account.code
          .replace('-', '_')
          .toUpperCase()
          .substring(0, 50); // Ensure it's not too long

        // Check if category with this account code already exists
        const existingCategory = await this.prisma.expenseCategory.findFirst({
          where: { accountCode: account.code },
        });

        if (!existingCategory) {
          await this.prisma.expenseCategory.create({
            data: {
              code: categoryCode,
              accountCode: account.code,
              expenseClass,
              name: account.name,
              nameId: account.nameId,
              description: account.description || null,
              descriptionId: account.descriptionId || null,
              isActive: account.isActive,
              // Set sensible defaults for expense configuration
              withholdingTaxType: 'NONE',
              defaultPPNRate: 0.12, // Default to 12% VAT
              isLuxuryGoods: false,
              isBillable: false,
              requiresReceipt: true,
              requiresEFaktur: true,
              approvalRequired: true,
              sortOrder: 100, // Default sort order
              color: '#1890ff', // Ant Design blue
              icon: 'shopping', // Default icon
            },
          });

          this.logger.log(
            `✅ Auto-created ExpenseCategory for account ${account.code}`,
          );
        }
      } catch (error) {
        // Log but don't fail - expense account creation should succeed even if category creation fails
        this.logger.warn(
          `⚠️ Failed to auto-create expense category for ${account.code}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return account;
  }

  /**
   * Derive ExpenseClass from account code (PSAK-compliant)
   * 6-1xxx → SELLING (Beban Penjualan)
   * 6-2xxx → GENERAL_ADMIN (Beban Administrasi & Umum)
   * 8-xxxx → OTHER (Beban Lain-Lain)
   */
  private deriveExpenseClass(
    accountCode: string,
  ): 'SELLING' | 'GENERAL_ADMIN' | 'OTHER' {
    if (!accountCode) return 'GENERAL_ADMIN';

    const prefix = accountCode.substring(0, 3); // Get first 3 chars (e.g., "6-1", "6-2", "8-")

    if (prefix === '6-1') {
      return 'SELLING';
    } else if (prefix === '6-2') {
      return 'GENERAL_ADMIN';
    } else if (prefix.startsWith('8-')) {
      return 'OTHER';
    }

    // Default to GENERAL_ADMIN for any expense account
    return 'GENERAL_ADMIN';
  }

  /**
   * Update chart of account
   *
   * CASCADE BEHAVIOR:
   * - If accountType changes FROM EXPENSE, deletes auto-created ExpenseCategory (if unused)
   * - If accountType changes TO EXPENSE, creates new ExpenseCategory
   * - If isActive changes, syncs status to ExpenseCategory
   * - If name/nameId changes, syncs to ExpenseCategory
   * - If code changes, updates ExpenseCategory.accountCode reference
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
      throw new BadRequestException("Cannot modify system accounts");
    }

    // If code is being changed, check if new code exists
    if (data.code && data.code !== code) {
      const existing = await this.prisma.chartOfAccounts.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictException(
          `Account with code ${data.code} already exists`,
        );
      }
    }

    // CASCADE SYNC: Handle ExpenseCategory changes
    const isChangingType =
      data.accountType && data.accountType !== account.accountType;
    const wasExpense = account.accountType === "EXPENSE";
    const willBeExpense = data.accountType === "EXPENSE";

    // CASCADE CASE 1: Changing FROM EXPENSE to something else
    if (isChangingType && wasExpense && !willBeExpense) {
      const expenseCategory = await this.prisma.expenseCategory.findFirst({
        where: { accountCode: account.code },
      });

      if (expenseCategory) {
        // Check if category is used by expenses
        const expenseCount = await this.prisma.expense.count({
          where: { categoryId: expenseCategory.id },
        });

        if (expenseCount > 0) {
          throw new BadRequestException(
            `Cannot change account type from EXPENSE. The auto-created expense category is used by ${expenseCount} expense(s). Delete those expenses first.`,
          );
        }

        // Safe to delete category
        await this.prisma.expenseCategory.delete({
          where: { id: expenseCategory.id },
        });

        this.logger.log(
          `✅ CASCADE: Deleted ExpenseCategory because account ${code} changed from EXPENSE to ${data.accountType}`,
        );
      }
    }

    // Update the account
    const updatedAccount = await this.prisma.chartOfAccounts.update({
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

    // CASCADE CASE 2: Changing TO EXPENSE type (create new category)
    if (isChangingType && !wasExpense && willBeExpense) {
      const expenseClass = this.deriveExpenseClass(
        data.code || account.code,
      );
      const categoryCode = (data.code || account.code)
        .replace("-", "_")
        .toUpperCase()
        .substring(0, 50);

      try {
        await this.prisma.expenseCategory.create({
          data: {
            code: categoryCode,
            accountCode: data.code || account.code,
            expenseClass,
            name: data.name || account.name,
            nameId: data.nameId || account.nameId,
            description: data.description || account.description || null,
            descriptionId:
              data.descriptionId || account.descriptionId || null,
            isActive: data.isActive !== undefined ? data.isActive : true,
            withholdingTaxType: "NONE",
            defaultPPNRate: 0.12,
            isLuxuryGoods: false,
            isBillable: false,
            requiresReceipt: true,
            requiresEFaktur: true,
            approvalRequired: true,
            sortOrder: 100,
            color: "#1890ff",
            icon: "shopping",
          },
        });

        this.logger.log(
          `✅ CASCADE: Created ExpenseCategory because account ${code} changed to EXPENSE`,
        );
      } catch (error) {
        this.logger.warn(
          `⚠️ Failed to auto-create expense category:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // CASCADE CASE 3: EXPENSE account exists - sync changes to category
    if (
      (account.accountType === "EXPENSE" && !isChangingType) ||
      (isChangingType && willBeExpense)
    ) {
      const expenseCategory = await this.prisma.expenseCategory.findFirst({
        where: { accountCode: account.code },
      });

      if (expenseCategory) {
        const categoryUpdates: any = {};

        // Sync code change
        if (data.code && data.code !== account.code) {
          categoryUpdates.accountCode = data.code;
          categoryUpdates.code = data.code
            .replace("-", "_")
            .toUpperCase()
            .substring(0, 50);
        }

        // Sync name changes
        if (data.name && data.name !== account.name) {
          categoryUpdates.name = data.name;
        }
        if (data.nameId && data.nameId !== account.nameId) {
          categoryUpdates.nameId = data.nameId;
        }

        // Sync description changes
        if (
          data.description !== undefined &&
          data.description !== account.description
        ) {
          categoryUpdates.description = data.description;
        }
        if (
          data.descriptionId !== undefined &&
          data.descriptionId !== account.descriptionId
        ) {
          categoryUpdates.descriptionId = data.descriptionId;
        }

        // Sync status change
        if (
          data.isActive !== undefined &&
          data.isActive !== account.isActive
        ) {
          categoryUpdates.isActive = data.isActive;
        }

        // Apply updates if any
        if (Object.keys(categoryUpdates).length > 0) {
          await this.prisma.expenseCategory.update({
            where: { id: expenseCategory.id },
            data: categoryUpdates,
          });

          this.logger.log(
            `✅ CASCADE: Synced ExpenseCategory changes for account ${code}`,
          );
        }
      }
    }

    return updatedAccount;
  }

  /**
   * Delete chart of account
   *
   * CASCADE BEHAVIOR:
   * - If account type is EXPENSE, auto-created ExpenseCategory will also be deleted
   * - Deletion is prevented if the category is used by any expenses
   * - Use deactivation (toggle status) instead for accounts with transaction history
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
      throw new BadRequestException("Cannot delete system accounts");
    }

    // Check if account has been used in journal entries
    const hasJournalEntries = await this.prisma.journalLineItem.findFirst({
      where: { accountId: account.id },
    });

    if (hasJournalEntries) {
      throw new BadRequestException(
        "Cannot delete account that has been used in journal entries. Consider deactivating it instead.",
      );
    }

    // Check if account has been used in general ledger
    const hasLedgerEntries = await this.prisma.generalLedger.findFirst({
      where: { accountId: account.id },
    });

    if (hasLedgerEntries) {
      throw new BadRequestException(
        "Cannot delete account that has been used in general ledger. Consider deactivating it instead.",
      );
    }

    // CASCADE: Check if this is an EXPENSE account with auto-created ExpenseCategory
    if (account.accountType === "EXPENSE") {
      const expenseCategory = await this.prisma.expenseCategory.findFirst({
        where: { accountCode: account.code },
      });

      if (expenseCategory) {
        // Check if category is being used by any expenses
        const expenseCount = await this.prisma.expense.count({
          where: { categoryId: expenseCategory.id },
        });

        if (expenseCount > 0) {
          throw new BadRequestException(
            `Cannot delete account ${code}. It has an auto-created expense category that is used by ${expenseCount} expense(s). Consider deactivating the account instead.`,
          );
        }

        // Safe to delete: No expenses using this category
        // CASCADE DELETE the auto-created ExpenseCategory first
        await this.prisma.expenseCategory.delete({
          where: { id: expenseCategory.id },
        });

        this.logger.log(
          `✅ CASCADE: Deleted auto-created ExpenseCategory for account ${code}`,
        );
      }
    }

    // Delete the account
    const deleted = await this.prisma.chartOfAccounts.delete({
      where: { code },
    });

    this.logger.log(`✅ Deleted ChartOfAccount: ${code}`);
    return deleted;
  }

  /**
   * Toggle account active status
   *
   * CASCADE BEHAVIOR:
   * - If account is EXPENSE type, also toggles ExpenseCategory status
   */
  async toggleAccountStatus(code: string) {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    const newStatus = !account.isActive;

    // CASCADE: Sync status to ExpenseCategory if this is an EXPENSE account
    if (account.accountType === "EXPENSE") {
      const expenseCategory = await this.prisma.expenseCategory.findFirst({
        where: { accountCode: account.code },
      });

      if (expenseCategory) {
        await this.prisma.expenseCategory.update({
          where: { id: expenseCategory.id },
          data: { isActive: newStatus },
        });

        this.logger.log(
          `✅ CASCADE: Toggled ExpenseCategory status to ${newStatus} for account ${code}`,
        );
      }
    }

    return this.prisma.chartOfAccounts.update({
      where: { code },
      data: { isActive: newStatus },
    });
  }

  /**
   * Generate next journal entry number
   */
  private async generateEntryNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Get the latest entry number for this month
    const prefix = `JE-${year}-${month}`;
    const latestEntry = await this.prisma.journalEntry.findFirst({
      where: {
        entryNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        entryNumber: "desc",
      },
    });

    if (latestEntry) {
      const lastNumber = parseInt(
        latestEntry.entryNumber.split("-").pop() || "0",
      );
      const nextNumber = lastNumber + 1;
      return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
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
      throw new BadRequestException(
        "Journal entry must have both debit and credit amounts",
      );
    }
  }

  /**
   * Validate account codes exist
   */
  private async validateAccountCodes(lineItems: any[]): Promise<void> {
    const accountCodes = [
      ...new Set(lineItems.map((item) => item.accountCode)),
    ];

    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        code: { in: accountCodes },
        isActive: true,
      },
    });

    const foundCodes = new Set(accounts.map((a) => a.code));
    const missingCodes = accountCodes.filter((code) => !foundCodes.has(code));

    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `Invalid or inactive account codes: ${missingCodes.join(", ")}`,
      );
    }
  }

  /**
   * Get current fiscal period, auto-creating if it doesn't exist
   */
  async getCurrentFiscalPeriod() {
    const now = new Date();
    let period = await this.prisma.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: "OPEN",
      },
    });

    if (!period) {
      // Auto-create fiscal period for current month
      period = await this.getOrCreateFiscalPeriod(now);
    }

    return period;
  }

  /**
   * Get or create fiscal period for a specific date
   * Auto-creates monthly fiscal periods when they don't exist
   */
  async getOrCreateFiscalPeriod(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const code = `${year}-${month.toString().padStart(2, "0")}`;

    let period = await this.prisma.fiscalPeriod.findUnique({
      where: { code },
    });

    if (!period) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      period = await this.prisma.fiscalPeriod.create({
        data: {
          name: `${date.toLocaleString("en-US", { month: "long" })} ${year}`,
          code,
          periodType: "MONTHLY",
          startDate,
          endDate,
          status: "OPEN",
          isActive: true,
        },
      });

      this.logger.log(`Auto-created fiscal period: ${period.name} (${code})`);
    }

    return period;
  }

  /**
   * Get all fiscal periods
   */
  async getFiscalPeriods() {
    return this.prisma.fiscalPeriod.findMany({
      orderBy: { startDate: "desc" },
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
    const accountCodes = [
      ...new Set(createDto.lineItems.map((item) => item.accountCode)),
    ];
    const accounts = await this.prisma.chartOfAccounts.findMany({
      where: { code: { in: accountCodes } },
      select: { id: true, code: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

    // Create journal entry with line items
    const journalEntry = await this.prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate: createDto.entryDate,
        description: createDto.description,
        descriptionId: createDto.descriptionId || undefined,
        descriptionEn: createDto.descriptionEn || undefined,
        transactionType: createDto.transactionType,
        transactionId: createDto.transactionId,
        documentNumber: createDto.documentNumber || undefined,
        documentDate: createDto.documentDate || undefined,
        status: createDto.status || JournalStatus.DRAFT,
        isPosted: false,
        fiscalPeriodId: fiscalPeriodId || undefined,
        isReversing: createDto.isReversing || false,
        reversedEntryId: createDto.reversedEntryId || undefined,
        createdBy: createDto.createdBy || 'unknown-user',
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
          orderBy: { lineNumber: "asc" },
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
      sortBy = "entryDate",
      sortOrder = "desc",
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
        { entryNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { descriptionId: { contains: search, mode: "insensitive" } },
        { documentNumber: { contains: search, mode: "insensitive" } },
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
            orderBy: { lineNumber: "asc" },
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
    const transformedEntries = entries.map((entry) => ({
      ...entry,
      lineItems: entry.lineItems.map((item) => ({
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
          orderBy: { lineNumber: "asc" },
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
      throw new BadRequestException("Cannot update posted journal entry");
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
      const accountCodes = [
        ...new Set(updateDto.lineItems.map((item) => item.accountCode)),
      ];
      const accounts = await this.prisma.chartOfAccounts.findMany({
        where: { code: { in: accountCodes } },
        select: { id: true, code: true },
      });
      accountMap = new Map(accounts.map((a) => [a.code, a.id]));
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
        lineItems:
          updateDto.lineItems && accountMap
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
          orderBy: { lineNumber: "asc" },
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
      throw new BadRequestException("Journal entry is already posted");
    }

    const now = new Date();

    // Create general ledger entries for each line item
    const ledgerEntries = entry.lineItems.map((line) => ({
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
    ]);

    // AUTO-SYNC: Update Cash Bank Balance if this entry affects cash/bank accounts
    await this.syncCashBankBalanceIfNeeded(entry, userId);

    return this.getJournalEntry(id);
  }

  /**
   * Check if journal entry affects cash/bank accounts and sync Cash Bank Balance
   * Indonesian accounting: Cash/Bank accounts start with 1-1xxx
   */
  private async syncCashBankBalanceIfNeeded(
    entry: any,
    userId: string,
  ): Promise<void> {
    try {
      // Check if any line items affect cash/bank accounts (1-1xxx)
      const hasCashBankAccounts = entry.lineItems.some((line: any) =>
        line.account.code.startsWith("1-1"),
      );

      if (!hasCashBankAccounts) {
        return; // No cash/bank accounts affected, skip sync
      }

      // Get the year and month from entry date
      const entryDate = new Date(entry.entryDate);
      const year = entryDate.getFullYear();
      const month = entryDate.getMonth() + 1;

      // Check if Cash Bank Balance record exists for this period
      const existingBalance = await this.prisma.cashBankBalance.findUnique({
        where: {
          year_month: { year, month },
        },
      });

      if (existingBalance) {
        // Recalculate existing balance
        await this.recalculateCashBankBalance(
          existingBalance.id,
          year,
          month,
          userId,
        );
        this.logger.log(
          `✅ AUTO-SYNC: Recalculated Cash Bank Balance for ${year}-${String(month).padStart(2, "0")}`,
        );
      } else {
        // Auto-create Cash Bank Balance for this period
        await this.createCashBankBalance(year, month, userId);
        this.logger.log(
          `✅ AUTO-SYNC: Created Cash Bank Balance for ${year}-${String(month).padStart(2, "0")}`,
        );
      }
    } catch (error) {
      // Log but don't fail - posting should succeed even if sync fails
      this.logger.error(
        "⚠️ Failed to sync Cash Bank Balance:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Auto-create Cash Bank Balance for a period
   */
  private async createCashBankBalance(
    year: number,
    month: number,
    userId: string,
  ): Promise<void> {
    // Get opening balance from previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const previousBalance = await this.prisma.cashBankBalance.findUnique({
      where: {
        year_month: { year: prevYear, month: prevMonth },
      },
    });

    const openingBalance = previousBalance
      ? Number(previousBalance.closingBalance)
      : 0;

    // Calculate movements for current period
    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      year,
      month,
    );

    const closingBalance = openingBalance + totalInflow - totalOutflow;
    const netChange = totalInflow - totalOutflow;

    await this.prisma.cashBankBalance.create({
      data: {
        period: `${year}-${String(month).padStart(2, "0")}`,
        periodDate: new Date(year, month - 1, 1),
        year,
        month,
        openingBalance,
        closingBalance,
        totalInflow,
        totalOutflow,
        netChange,
        calculatedAt: new Date(),
        calculatedBy: userId,
        createdBy: userId,
      },
    });
  }

  /**
   * Recalculate Cash Bank Balance for a period
   */
  private async recalculateCashBankBalance(
    id: string,
    year: number,
    month: number,
    userId: string,
  ): Promise<void> {
    const existing = await this.prisma.cashBankBalance.findUnique({
      where: { id },
    });

    if (!existing) return;

    // ✅ FIX: Recalculate opening balance from previous month's closing balance
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const previousBalance = await this.prisma.cashBankBalance.findUnique({
      where: {
        year_month: { year: prevYear, month: prevMonth },
      },
    });

    const openingBalance = previousBalance
      ? Number(previousBalance.closingBalance)
      : 0;

    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      year,
      month,
    );

    const closingBalance = openingBalance + totalInflow - totalOutflow;
    const netChange = totalInflow - totalOutflow;

    await this.prisma.cashBankBalance.update({
      where: { id },
      data: {
        openingBalance, // ✅ FIX: Update opening balance from previous month
        closingBalance,
        totalInflow,
        totalOutflow,
        netChange,
        calculatedAt: new Date(),
        calculatedBy: userId,
        updatedBy: userId,
      },
    });
  }

  /**
   * Calculate cash/bank movements from journal entries for a period
   */
  private async calculateCashMovements(
    year: number,
    month: number,
  ): Promise<{ totalInflow: number; totalOutflow: number }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Query all journal line items for cash/bank accounts (1-1xxx) in this period
    const cashMovements = await this.prisma.journalLineItem.findMany({
      where: {
        journalEntry: {
          entryDate: { gte: startDate, lte: endDate },
          isPosted: true, // Only count posted entries
        },
        account: {
          code: { startsWith: "1-1" }, // Cash & Bank accounts
        },
      },
      include: { account: true },
    });

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const item of cashMovements) {
      const debitAmount = parseFloat(item.debit?.toString() || "0");
      const creditAmount = parseFloat(item.credit?.toString() || "0");

      totalInflow += debitAmount; // Cash increases with debits
      totalOutflow += creditAmount; // Cash decreases with credits
    }

    return { totalInflow, totalOutflow };
  }

  /**
   * Reverse journal entry
   */
  async reverseJournalEntry(id: string, userId: string) {
    const originalEntry = await this.getJournalEntry(id);

    if (!originalEntry.isPosted) {
      throw new BadRequestException("Can only reverse posted journal entries");
    }

    if (originalEntry.isReversing) {
      throw new BadRequestException("This entry is already a reversing entry");
    }

    // Check if already reversed
    const existingReversal = await this.prisma.journalEntry.findFirst({
      where: { reversedEntryId: id },
    });

    if (existingReversal) {
      throw new ConflictException("This entry has already been reversed");
    }

    // Create reversing entry with swapped debits/credits
    const reversingLineItems = originalEntry.lineItems.map((line) => ({
      accountCode: line.account.code, // Get code from account relation
      description: `REVERSAL: ${line.description || originalEntry.description}`,
      descriptionId: line.descriptionId || undefined,
      debit: Number(line.credit), // Swap credit to debit
      credit: Number(line.debit), // Swap debit to credit
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
        "Cannot delete posted journal entry. Use reversal instead.",
      );
    }

    await this.prisma.journalEntry.delete({
      where: { id },
    });

    return { message: "Journal entry deleted successfully" };
  }

  /**
   * Close fiscal period
   */
  async closeFiscalPeriod(id: string, userId: string) {
    const period = await this.prisma.fiscalPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException("Fiscal period not found");
    }

    if (period.status === "CLOSED") {
      throw new BadRequestException("Fiscal period is already closed");
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
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: userId,
      },
    });

    return updatedPeriod;
  }

  /**
   * ADMIN: Backfill missing journal entries for all invoices
   */
  async backfillMissingInvoiceJournals(userId: string): Promise<{
    fixed: number;
    posted: number;
    paymentJournalsCreated: number;
    errors: string[];
  }> {
    const results = {
      fixed: 0,
      posted: 0,
      paymentJournalsCreated: 0,
      errors: [] as string[],
    };

    this.logger.log("🔄 Starting backfill of missing invoice journal entries...");

    try {
      // 1. Find invoices with SENT/OVERDUE/PAID status but NO SENT journal entry
      const invoicesWithoutJournal = await this.prisma.invoice.findMany({
        where: {
          status: { in: ["SENT", "OVERDUE", "PAID"] },
          journalEntryId: null,
        },
        include: {
          client: { select: { id: true, name: true } },
        },
      });

      this.logger.log(
        `Found ${invoicesWithoutJournal.length} invoices without SENT journal entries`,
      );

      // Create and post SENT journal entries for these invoices
      for (const invoice of invoicesWithoutJournal) {
        try {
          this.logger.log(
            `Creating SENT journal for invoice ${invoice.invoiceNumber}...`,
          );

          const sentJournal = await this.createInvoiceJournalEntry(
            invoice.id,
            invoice.invoiceNumber,
            invoice.clientId,
            Number(invoice.totalAmount),
            "SENT",
            userId,
          );

          await this.postJournalEntry(sentJournal.id, userId);

          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { journalEntryId: sentJournal.id },
          });

          results.fixed++;
          this.logger.log(
            `✅ Fixed invoice ${invoice.invoiceNumber} - Created and posted SENT journal`,
          );
        } catch (error) {
          const errorMsg = `Failed to fix invoice ${invoice.invoiceNumber}: ${error instanceof Error ? error.message : String(error)}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // 2. Find PAID invoices without payment journal entries
      const paidInvoicesWithoutPaymentJournal = await this.prisma.invoice.findMany({
        where: {
          status: "PAID",
          paymentJournalId: null,
        },
        include: {
          client: { select: { id: true, name: true } },
        },
      });

      this.logger.log(
        `Found ${paidInvoicesWithoutPaymentJournal.length} PAID invoices without payment journal entries`,
      );

      // Create and post PAYMENT journal entries for paid invoices
      for (const invoice of paidInvoicesWithoutPaymentJournal) {
        try {
          this.logger.log(
            `Creating PAYMENT journal for invoice ${invoice.invoiceNumber}...`,
          );

          const paymentJournal = await this.createInvoiceJournalEntry(
            invoice.id,
            invoice.invoiceNumber,
            invoice.clientId,
            Number(invoice.totalAmount),
            "PAID",
            userId,
          );

          await this.postJournalEntry(paymentJournal.id, userId);

          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { paymentJournalId: paymentJournal.id },
          });

          results.paymentJournalsCreated++;
          this.logger.log(
            `✅ Created payment journal for invoice ${invoice.invoiceNumber} - Cash increased`,
          );
        } catch (error) {
          const errorMsg = `Failed to create payment journal for invoice ${invoice.invoiceNumber}: ${error instanceof Error ? error.message : String(error)}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // 3. Find and post any unposted journal entries
      const unpostedJournals = await this.prisma.journalEntry.findMany({
        where: {
          isPosted: false,
          status: JournalStatus.DRAFT, // Only post DRAFT entries
        },
        take: 100, // Safety limit
      });

      this.logger.log(
        `Found ${unpostedJournals.length} unposted journal entries`,
      );

      for (const journal of unpostedJournals) {
        try {
          this.logger.log(`Posting journal entry ${journal.entryNumber}...`);

          await this.postJournalEntry(journal.id, userId);

          results.posted++;
          this.logger.log(
            `✅ Posted journal entry ${journal.entryNumber}`,
          );
        } catch (error) {
          const errorMsg = `Failed to post journal ${journal.entryNumber}: ${error instanceof Error ? error.message : String(error)}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      this.logger.log(
        `✅ Backfill complete: ${results.fixed} SENT journals, ${results.paymentJournalsCreated} payment journals, ${results.posted} other journals posted, ${results.errors.length} errors`,
      );

      return results;
    } catch (error) {
      this.logger.error("Failed to backfill missing journal entries:", error);
      throw error;
    }
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
    const transactionType =
      status === "PAID"
        ? TransactionType.PAYMENT_RECEIVED
        : TransactionType.INVOICE_SENT;

    let lineItems: any[];

    if (status === "SENT") {
      // Invoice SENT: Debit AR, Credit Revenue
      lineItems = [
        {
          accountCode: "1-2010", // Accounts Receivable
          description: `Invoice ${invoiceNumber}`,
          descriptionId: `Faktur ${invoiceNumber}`,
          debit: totalAmount,
          credit: 0,
          clientId: clientId,
        },
        {
          accountCode: "4-1010", // Service Revenue
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
          accountCode: "1-1020", // Bank Account
          description: `Payment for Invoice ${invoiceNumber}`,
          descriptionId: `Pembayaran Faktur ${invoiceNumber}`,
          debit: totalAmount,
          credit: 0,
          clientId: clientId,
        },
        {
          accountCode: "1-2010", // Accounts Receivable
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
    const transactionType =
      status === "PAID"
        ? TransactionType.PAYMENT_MADE
        : TransactionType.EXPENSE_SUBMITTED;

    let lineItems: any[];

    if (status === "SUBMITTED" || status === "APPROVED") {
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
          accountCode: "2-1010", // Accounts Payable
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
          accountCode: "2-1010", // Accounts Payable
          description: `Payment for Expense ${expenseNumber}`,
          descriptionId: `Pembayaran Beban ${expenseNumber}`,
          debit: amount,
          credit: 0,
        },
        {
          accountCode: "1-1020", // Bank Account
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
        accountCode: "1-2015", // Allowance for Doubtful Accounts
        description: `ECL reversal for paid Invoice ${invoiceNumber}`,
        descriptionId: `Pembalikan penyisihan piutang untuk Faktur ${invoiceNumber} (lunas)`,
        debit: eclAmount,
        credit: 0,
        clientId: clientId,
      },
      {
        accountCode: "8-1010", // Bad Debt Expense
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
    const transactionType =
      status === "APPROVED"
        ? TransactionType.PO_APPROVED
        : TransactionType.PO_CANCELLED;

    let lineItems: any[];

    if (status === "APPROVED") {
      // PO APPROVED: Record commitment
      // Debit Expense/Asset, Credit PO Commitments
      lineItems = [
        {
          accountCode: "6-1010", // General Expenses (default, will be overridden by line item categories)
          description: `PO Commitment ${poNumber}`,
          descriptionId: `Komitmen PO ${poNumber}`,
          debit: totalAmount,
          credit: 0,
        },
        {
          accountCode: "2-1020", // PO Commitments
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
          accountCode: "2-1020", // PO Commitments
          description: `Cancel PO Commitment ${poNumber}`,
          descriptionId: `Batalkan Komitmen PO ${poNumber}`,
          debit: totalAmount,
          credit: 0,
        },
        {
          accountCode: "6-1010", // General Expenses
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
