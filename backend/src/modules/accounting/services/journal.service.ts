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
import { CashBankBalanceService } from "./cash-bank-balance.service";
import { isCashOrBank } from "../cash-accounts.util";
import { wibYear, wibMonth, wibPeriodKey, wibStartOfMonth } from "../../../common/utils/wib-date.util";

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);
  constructor(
    private prisma: PrismaService,
    private cashBankBalanceService: CashBankBalanceService,
  ) {}

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
    if (account.accountType === "EXPENSE") {
      try {
        const expenseClass = this.deriveExpenseClass(account.code);
        const categoryCode = account.code
          .replace("-", "_")
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
              withholdingTaxType: "NONE",
              defaultPPNRate: 0.12, // Default to 12% VAT
              isLuxuryGoods: false,
              isBillable: false,
              requiresReceipt: true,
              requiresEFaktur: true,
              approvalRequired: true,
              sortOrder: 100, // Default sort order
              color: "#1890ff", // Ant Design blue
              icon: "shopping", // Default icon
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
  ): "SELLING" | "GENERAL_ADMIN" | "OTHER" {
    if (!accountCode) return "GENERAL_ADMIN";

    const prefix = accountCode.substring(0, 3); // Get first 3 chars (e.g., "6-1", "6-2", "8-")

    if (prefix === "6-1") {
      return "SELLING";
    } else if (prefix === "6-2") {
      return "GENERAL_ADMIN";
    } else if (prefix.startsWith("8-")) {
      return "OTHER";
    }

    // Default to GENERAL_ADMIN for any expense account
    return "GENERAL_ADMIN";
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
      const expenseClass = this.deriveExpenseClass(data.code || account.code);
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
            descriptionId: data.descriptionId || account.descriptionId || null,
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
        if (data.isActive !== undefined && data.isActive !== account.isActive) {
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
    const year = wibYear(now);
    const month = String(wibMonth(now)).padStart(2, "0");

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

    // FIX 4: IDR is whole-rupiah. Tolerance 0.5 lets float-noise (e.g. 0.0000002)
    // pass while still rejecting any real ≥1-rupiah imbalance.
    // (0.01 was too tight AND could mask a 0.99-rupiah drift silently accepted.)
    if (Math.abs(totalDebit - totalCredit) > 0.5) {
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
   * Get current fiscal period, auto-creating if it doesn't exist.
   *
   * FIX 3 — never return a CLOSED period as the "current" posting period.
   * The findFirst already filters for OPEN. If nothing is found, we fall
   * through to getOrCreateFiscalPeriod, but that does a findUnique by code
   * with no status filter — it could return a CLOSED record for the current
   * month. We re-check the status and throw if it is CLOSED/LOCKED rather
   * than silently accepting posts into a closed period.
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
      // getOrCreateFiscalPeriod may return an existing period of any status.
      period = await this.getOrCreateFiscalPeriod(now);

      // FIX 3: Guard — reject if the existing record is CLOSED or LOCKED.
      if (period.status === "CLOSED" || period.status === "LOCKED") {
        throw new BadRequestException(
          `Current fiscal period (${period.code}) is ${period.status}. Cannot post to a closed/locked fiscal period.`,
        );
      }
    }

    return period;
  }

  /**
   * Get or create fiscal period for a specific date
   * Auto-creates monthly fiscal periods when they don't exist.
   *
   * FIX 2 — use WIB calendar for period code + stored dates.
   * date.getFullYear()/getMonth() are UTC, which is wrong around midnight WIB
   * (e.g. 2026-03-31T17:30Z is already April 2026 in WIB). Use wibYear/wibMonth
   * for the period code and wibStartOfMonth for the stored startDate so the
   * period boundaries are correct for the Asia/Jakarta timezone.
   */
  async getOrCreateFiscalPeriod(date: Date) {
    const year = wibYear(date);
    const month = wibMonth(date);
    const code = `${year}-${month.toString().padStart(2, "0")}`;

    let period = await this.prisma.fiscalPeriod.findUnique({
      where: { code },
    });

    if (!period) {
      // WIB start of month: wibStartOfMonth returns the UTC instant equal to
      // 00:00 WIB on the 1st of the WIB month.
      const startDate = wibStartOfMonth(date);

      // WIB end of month: first instant of next WIB month minus 1 ms.
      // Compute next-month anchor as the 1st of month+1, then use wibStartOfMonth.
      const nextMonthAnchor = new Date(
        Date.UTC(year, month - 1 + 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000,
      );
      const endDate = new Date(nextMonthAnchor.getTime() - 1);

      // Human-readable month name in WIB locale.
      const monthName = new Date(
        Date.UTC(year, month - 1, 1),
      ).toLocaleString("en-US", { month: "long" });

      period = await this.prisma.fiscalPeriod.create({
        data: {
          name: `${monthName} ${year}`,
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
    } else {
      // FIX 1 — explicit fiscalPeriodId provided: verify the period exists and
      // is not CLOSED/LOCKED before accepting the entry.
      // CONSERVATIVE: if the period record doesn't exist at all (shouldn't
      // happen but guard it), we let the DB FK error surface naturally — we
      // only block when the period explicitly shows as CLOSED or LOCKED.
      const resolvedPeriod = await this.prisma.fiscalPeriod.findUnique({
        where: { id: fiscalPeriodId },
        select: { id: true, code: true, status: true },
      });
      if (
        resolvedPeriod &&
        (resolvedPeriod.status === "CLOSED" || resolvedPeriod.status === "LOCKED")
      ) {
        throw new BadRequestException(
          `Cannot post to a closed/locked fiscal period (${resolvedPeriod.code})`,
        );
      }
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

    // Create journal entry with line items.
    // FIX 5 (HIGH) — entry-number race: generateEntryNumber uses findFirst+1
    // with no lock, so two concurrent calls can produce the same number and one
    // will hit a P2002 unique constraint. Retry up to 3 times with a fresh
    // number on each attempt, then surface a ConflictException.
    let journalEntry: any;
    let lastCreateError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const attemptNumber = attempt === 1 ? entryNumber : await this.generateEntryNumber();
      try {
        journalEntry = await this.prisma.journalEntry.create({
          data: {
            entryNumber: attemptNumber,
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
            createdBy: createDto.createdBy || "unknown-user",
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
        lastCreateError = undefined;
        break; // success
      } catch (err: any) {
        lastCreateError = err;
        // P2002 = unique constraint violation (duplicate entryNumber)
        if (err?.code === 'P2002' && attempt < 3) {
          this.logger.warn(
            `Journal entry number collision on attempt ${attempt}, retrying with new number...`,
          );
          continue;
        }
        // Non-P2002 error or exhausted retries — re-throw
        if (err?.code === 'P2002') {
          throw new ConflictException(
            `Failed to generate a unique journal entry number after ${attempt} attempts`,
          );
        }
        throw err;
      }
    }
    if (!journalEntry) {
      throw lastCreateError ?? new ConflictException('Failed to create journal entry');
    }

    // Auto-post immediately when requested (e.g. expense-generated entries).
    // Posting creates the general-ledger entries and triggers the cash & bank
    // balance sync — no manual posting step needed.
    if (createDto.autoPost) {
      return this.postJournalEntry(
        journalEntry.id,
        createDto.createdBy || "unknown-user",
      );
    }

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
      sortBy: rawSortBy = "entryDate",
      sortOrder = "desc",
    } = query;

    const ALLOWED_SORT_FIELDS = new Set([
      "entryDate",
      "entryNumber",
      "createdAt",
      "updatedAt",
      "totalDebit",
      "totalCredit",
      "description",
      "documentNumber",
    ]);
    const sortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : "entryDate";

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
   *
   * FIX 2 (CRITICAL) — double-post / TOCTOU guard:
   * The posting is made atomic by doing a compare-and-set on isPosted first.
   * updateMany({ where: { id, isPosted: false } }) returns count=0 when the
   * entry is already posted (concurrent call already claimed it), so we abort
   * gracefully instead of inserting duplicate GL rows.
   */
  async postJournalEntry(id: string, userId: string) {
    // Re-read the entry for line items (needed to build ledger rows)
    const entry = await this.getJournalEntry(id);

    // FIX 1 — closed-period guard in postJournalEntry.
    // Check the entry's resolved fiscal period before inserting any GL rows.
    // CONSERVATIVE: no period assigned = no block (period may not yet exist).
    if (entry.fiscalPeriodId) {
      const period = await this.prisma.fiscalPeriod.findUnique({
        where: { id: entry.fiscalPeriodId },
        select: { code: true, status: true },
      });
      if (period && (period.status === "CLOSED" || period.status === "LOCKED")) {
        throw new BadRequestException(
          `Cannot post to a closed/locked fiscal period (${period.code})`,
        );
      }
    }

    const now = new Date();

    // Build ledger rows from the entry (populated before the claim so we don't
    // need to re-query inside the transaction)
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

    await this.prisma.$transaction(async (tx) => {
      // Atomic compare-and-set: claim the entry only if still unposted.
      // This prevents two concurrent calls from both inserting GL rows.
      const claimed = await tx.journalEntry.updateMany({
        where: { id, isPosted: false },
        data: {
          isPosted: true,
          status: JournalStatus.POSTED,
          postedAt: now,
          postedBy: userId,
        },
      });

      if (claimed.count === 0) {
        // Another call already posted this entry — bail out gracefully.
        throw new ConflictException(
          `Journal entry ${entry.entryNumber} is already posted`,
        );
      }

      // Only reached when WE won the claim — insert GL rows now.
      await tx.generalLedger.createMany({ data: ledgerEntries });
    });

    // AUTO-SYNC: Update Cash Bank Balance if this entry affects cash/bank accounts
    await this.syncCashBankBalanceIfNeeded(entry, userId);

    return this.getJournalEntry(id);
  }

  /**
   * If a posted entry touches cash/bank accounts (1-1xxx), re-sync that period's
   * Cash & Bank Balance through the canonical service, which recomputes the
   * period's movements and re-chains every later period's running balance.
   */
  private async syncCashBankBalanceIfNeeded(
    entry: any,
    userId: string,
  ): Promise<void> {
    try {
      const hasCashBankAccounts = entry.lineItems.some((line: any) =>
        isCashOrBank(line.account.code),
      );
      if (!hasCashBankAccounts) return;

      const entryDate = new Date(entry.entryDate);
      const year = wibYear(entryDate);
      const month = wibMonth(entryDate);

      await this.cashBankBalanceService.syncPeriod(year, month, userId);
      this.logger.log(
        `✅ AUTO-SYNC: Cash & Bank Balance for ${year}-${String(month).padStart(2, "0")}`,
      );
    } catch (error) {
      // Log but don't fail — posting should succeed even if sync fails.
      this.logger.error(
        "⚠️ Failed to sync Cash Bank Balance:",
        error instanceof Error ? error.message : String(error),
      );
    }
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

    // FIX 4 — reversal must post into the CURRENT open period, not the
    // original entry's period (which may now be CLOSED). Resolve the current
    // open period for today's reversal date; let getCurrentFiscalPeriod
    // auto-create one if needed. Do NOT pass fiscalPeriodId so that
    // createJournalEntry picks it up via getCurrentFiscalPeriod, which already
    // enforces the OPEN status guard (Fix 3).
    const reversingEntry = await this.createJournalEntry({
      entryDate: new Date(),
      description: `REVERSAL: ${originalEntry.description}`,
      descriptionId: originalEntry.descriptionId ?? undefined,
      descriptionEn: originalEntry.descriptionEn ?? undefined,
      transactionType: originalEntry.transactionType,
      transactionId: originalEntry.transactionId ?? id, // Use entry ID if no transaction ID
      documentNumber: originalEntry.documentNumber ?? undefined,
      documentDate: originalEntry.documentDate ?? undefined,
      // fiscalPeriodId intentionally omitted — resolved to current OPEN period
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

    this.logger.log(
      "🔄 Starting backfill of missing invoice journal entries...",
    );

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
      const paidInvoicesWithoutPaymentJournal =
        await this.prisma.invoice.findMany({
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
          this.logger.log(`✅ Posted journal entry ${journal.entryNumber}`);
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
