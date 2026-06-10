import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateJournalEntryDto } from "../dto/create-journal-entry.dto";
import {
  CreatePurchaseDto,
  PurchasePaymentMethod,
} from "../dto/create-purchase.dto";
import { CreateSaleDto, SalePaymentMethod } from "../dto/create-sale.dto";
import { UpdateJournalEntryDto } from "../dto/update-journal-entry.dto";
import { JournalQueryDto } from "../dto/journal-query.dto";
import { JournalStatus, TransactionType } from "@prisma/client";
import { CashBankBalanceService } from "./cash-bank-balance.service";
import { isCashOrBank } from "../cash-accounts.util";
import { wibYear, wibMonth, wibPeriodKey, wibStartOfMonth } from "../../../common/utils/wib-date.util";
import {
  isFixedAssetCostCoa,
  categoryForCoa,
  assetCodeForCoa,
  ASSET_COA_PREFIX,
  usefulLifeYearsForCoa,
} from "../../assets/asset-coa.util";
import { defaultGroupForCategory } from "../../assets/depreciation-group.util";

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

    if (transactionType) {
      // The UI offers grouped aliases (INVOICE, PAYMENT, ECL) as well as exact
      // TransactionType values. Expand aliases to the matching set; pass exact
      // values through unchanged.
      const GROUPS: Record<string, string[]> = {
        INVOICE: ["INVOICE_SENT", "INVOICE_PAID"],
        PAYMENT: ["PAYMENT_RECEIVED", "PAYMENT_MADE"],
        EXPENSE: ["EXPENSE_SUBMITTED", "EXPENSE_PAID", "EXPENSE_REIMBURSEMENT"],
        ECL: ["ADJUSTMENT"],
      };
      const group = GROUPS[transactionType];
      where.transactionType = group ? { in: group } : transactionType;
    }
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
        // Searching a purchase number (PUR-…) surfaces the purchase journal AND
        // its settlement — they share the transactionId.
        { transactionId: { contains: search, mode: "insensitive" } },
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

  /* ================================================================== */
  /*  PURCHASE REPORT (Laporan Pembelian)                               */
  /* ================================================================== */

  /**
   * Purchase report — every PURCHASE (Pembelian) journal entry surfaced as a
   * payable document, enriched with the purchased account (category COA), the
   * vendor (when the entry is linked to an AccountsPayable record) and a payment
   * status derived from the 2-1010 GL net for the entry's transactionId. A
   * settlement posted by `markPurchaseAsPaid` shares that transactionId, so it
   * nets the AP to zero and flips the row to PAID.
   */
  async getPurchases(params: { startDate?: Date; endDate?: Date }) {
    const where: any = { transactionType: TransactionType.PURCHASE };
    if (params.startDate || params.endDate) {
      where.entryDate = {};
      if (params.startDate) where.entryDate.gte = params.startDate;
      if (params.endDate) where.entryDate.lte = params.endDate;
    }

    const entries = await this.prisma.journalEntry.findMany({
      where,
      include: {
        lineItems: {
          include: {
            account: {
              select: { code: true, name: true, nameId: true, accountType: true },
            },
          },
        },
      },
      orderBy: { entryDate: "desc" },
    });

    const apAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "2-1010" },
      select: { id: true },
    });

    // Payment status: net of 2-1010 per transactionId across POSTED entries
    // (original purchase credit − any settlement debit). <= 0 ⇒ fully paid.
    const txnIds = [
      ...new Set(entries.map((e) => e.transactionId).filter(Boolean)),
    ] as string[];
    const apNetByTxn = new Map<string, number>();
    if (apAccount && txnIds.length) {
      const glRows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: apAccount.id,
          transactionId: { in: txnIds },
          journalEntry: { isPosted: true },
        },
        select: { transactionId: true, debit: true, credit: true },
      });
      for (const r of glRows) {
        apNetByTxn.set(
          r.transactionId,
          (apNetByTxn.get(r.transactionId) ?? 0) +
            Number(r.credit) -
            Number(r.debit),
        );
      }
    }

    // Vendor names from any AccountsPayable record linked to these entries.
    const apRecords = await this.prisma.accountsPayable.findMany({
      where: { journalEntryId: { in: entries.map((e) => e.id) } },
      select: { journalEntryId: true, vendor: { select: { name: true } } },
    });
    const vendorByJE = new Map(
      apRecords
        .filter((a) => a.journalEntryId)
        .map((a) => [a.journalEntryId as string, a.vendor?.name ?? null]),
    );

    return entries.map((e) => {
      const apLine = e.lineItems.find((l) => l.account?.code === "2-1010");
      // Amount = the payable raised (2-1010 credit); fall back to total debit.
      const amount = apLine
        ? Number(apLine.credit)
        : e.lineItems.reduce((s, l) => s + Number(l.debit), 0);
      // Category = the purchased account: the largest non-AP debit line.
      const cat = e.lineItems
        .filter((l) => Number(l.debit) > 0 && l.account?.code !== "2-1010")
        .sort((a, b) => Number(b.debit) - Number(a.debit))[0]?.account;
      const apNet = e.transactionId ? apNetByTxn.get(e.transactionId) ?? 0 : 0;
      // PAID only once the entry is posted AND its 2-1010 balance is cleared.
      const paid = e.isPosted && apNet <= 0.005;
      return {
        id: e.id,
        // Purchases recorded via the New Purchase form carry a PUR-… transaction
        // number — that's the user-facing Nomor Transaksi. Journal-form purchases
        // (MANUAL-…) fall back to the JE number.
        number: e.transactionId?.startsWith("PUR-")
          ? e.transactionId
          : e.entryNumber,
        journalEntryNumber: e.entryNumber,
        date: e.entryDate,
        vendorName: vendorByJE.get(e.id) ?? null,
        categoryCode: cat?.code ?? null,
        categoryName: cat?.nameId || cat?.name || null,
        description: e.descriptionId || e.description,
        amount,
        transactionId: e.transactionId,
        postingStatus: e.status, // DRAFT | POSTED
        isPosted: e.isPosted,
        paymentStatus: paid ? "PAID" : "UNPAID",
      };
    });
  }

  /** Next purchase number, e.g. PUR-202606-0003 (preview; re-generated at submit). */
  async getNextPurchaseNumber(): Promise<string> {
    const now = new Date();
    const prefix = `PUR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
    const last = await this.prisma.journalEntry.findFirst({
      where: { transactionId: { startsWith: prefix } },
      orderBy: { transactionId: "desc" },
      select: { transactionId: true },
    });
    const next = last
      ? parseInt(last.transactionId.slice(prefix.length), 10) + 1
      : 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  /**
   * Record a purchase (Pembelian) from the dedicated New Purchase form.
   *
   * Journal posted (autoposted — every accounting page updates at once):
   *   DR  each line's account (expense / asset / prepaid)     qty × unitPrice
   *   CR  2-1010 Hutang Usaha   (paymentMethod HUTANG)        total   → UNPAID
   *   CR  1-1010 Kas            (paymentMethod CASH)          total   → PAID
   *   CR  1-1020 Bank           (paymentMethod BANK)          total   → PAID
   *
   * The purchase number (PUR-YYYYMM-####) is the journal's transactionId — the
   * same id a later "mark as paid" settlement reuses, which is how the Purchase
   * Report links every related journal and derives its payment status.
   *
   * An AccountsPayable record is created for the vendor linkage (Kontak column):
   * a real UNPAID payable for HUTANG, or an already-PAID record for cash/bank
   * purchases. AP aging derives from the GL, so the PAID record never pollutes it.
   */
  async createPurchase(dto: CreatePurchaseDto, userId: string) {
    if (!dto.lineItems?.length) {
      throw new BadRequestException("Purchase needs at least one line item");
    }

    // Resolve the vendor (Kontak): an existing id, or an inline-typed name.
    // A typed name reuses an existing vendor with the same name (case-insensitive)
    // so repeat purchases don't multiply vendors; otherwise one is created.
    let vendor: { id: string; name: string } | null = null;
    if (dto.vendorId) {
      vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.vendorId },
        select: { id: true, name: true },
      });
      if (!vendor) {
        throw new NotFoundException(`Vendor ${dto.vendorId} not found`);
      }
    } else if (dto.vendorName?.trim()) {
      const name = dto.vendorName.trim();
      vendor = await this.prisma.vendor.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (!vendor) {
        // vendorCode follows the vendors module's VEN-YYYY-NNNNN convention,
        // with a P2002 retry against concurrent creation.
        let createErr: any;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const prefix = `VEN-${new Date().getFullYear()}-`;
          const lastVendor = await this.prisma.vendor.findFirst({
            where: { vendorCode: { startsWith: prefix } },
            orderBy: { vendorCode: "desc" },
            select: { vendorCode: true },
          });
          const seq = lastVendor
            ? parseInt(lastVendor.vendorCode.slice(prefix.length), 10) + 1
            : 1;
          try {
            vendor = await this.prisma.vendor.create({
              data: {
                vendorCode: `${prefix}${String(seq).padStart(5, "0")}`,
                name,
                vendorType: "OTHER",
                createdBy: userId,
              },
              select: { id: true, name: true },
            });
            createErr = null;
            break;
          } catch (err: any) {
            createErr = err;
            if (err?.code === "P2002" && attempt < 3) continue;
            break;
          }
        }
        if (!vendor) {
          throw new ConflictException(
            `Failed to create vendor "${name}": ${createErr?.message ?? "unknown error"}`,
          );
        }
      }
    }
    if (!vendor) {
      throw new BadRequestException(
        "Provide a vendor (vendorId) or a new vendor name (vendorName)",
      );
    }

    const CREDIT_BY_METHOD: Record<PurchasePaymentMethod, string> = {
      [PurchasePaymentMethod.HUTANG]: "2-1010",
      [PurchasePaymentMethod.CASH]: "1-1010",
      [PurchasePaymentMethod.BANK]: "1-1020",
    };
    const creditAccount = CREDIT_BY_METHOD[dto.paymentMethod];

    const total = dto.lineItems.reduce(
      (s, l) => s + l.quantity * l.unitPrice,
      0,
    );
    if (total <= 0) {
      throw new BadRequestException("Purchase total must be greater than zero");
    }

    const purchaseNumber = await this.getNextPurchaseNumber();

    const journal = await this.createJournalEntry({
      entryDate: dto.date,
      description: `Pembelian ${purchaseNumber} - ${vendor.name}`,
      descriptionId: `Pembelian ${purchaseNumber} - ${vendor.name}`,
      transactionType: TransactionType.PURCHASE,
      transactionId: purchaseNumber,
      documentNumber: dto.reference || purchaseNumber,
      documentDate: dto.date,
      createdBy: userId,
      lineItems: [
        ...dto.lineItems.map((l) => ({
          accountCode: l.accountCode,
          debit: l.quantity * l.unitPrice,
          credit: 0,
          description: l.description,
          descriptionId: l.description,
        })),
        {
          accountCode: creditAccount,
          debit: 0,
          credit: total,
          description: `Pembelian ${purchaseNumber} - ${vendor.name}`,
        },
      ],
    } as CreateJournalEntryDto);
    await this.postJournalEntry(journal.id, userId);

    // Auto-register any fixed-asset line as an Asset record so the purchase shows
    // up on the Assets page and gets a depreciation schedule (no extra journal —
    // the Pembelian journal above already booked the fixed-asset cost debit).
    await this.autoRegisterFixedAssets(
      journal.id,
      new Date(dto.date),
      dto.lineItems,
      vendor.name,
      userId,
    );

    // Vendor linkage (and, for HUTANG, the actual payable record). apNumber uses
    // the vendor-invoices AP-YYYY-MM-##### convention with a P2002 retry.
    const onCredit = dto.paymentMethod === PurchasePaymentMethod.HUTANG;
    const dueDate = new Date(dto.date);
    dueDate.setDate(dueDate.getDate() + 30);
    let lastErr: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const now = new Date();
      const apPrefix = `AP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
      const lastAP = await this.prisma.accountsPayable.findFirst({
        where: { apNumber: { startsWith: apPrefix } },
        orderBy: { apNumber: "desc" },
        select: { apNumber: true },
      });
      const apSeq = lastAP ? parseInt(lastAP.apNumber.split("-")[3], 10) + 1 : 1;
      try {
        await this.prisma.accountsPayable.create({
          data: {
            apNumber: `${apPrefix}${String(apSeq).padStart(5, "0")}`,
            sourceType: "MANUAL_ENTRY",
            vendorId: vendor.id,
            originalAmount: total,
            paidAmount: onCredit ? 0 : total,
            outstandingAmount: onCredit ? total : 0,
            invoiceDate: dto.date,
            dueDate,
            paymentStatus: onCredit ? "UNPAID" : "PAID",
            journalEntryId: journal.id,
            createdBy: userId,
          },
        });
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        if (err?.code === "P2002" && attempt < 3) continue;
        break;
      }
    }
    if (lastErr) {
      // The journal is already posted (books correct); only the vendor linkage
      // failed. Surface it rather than silently dropping the Kontak column.
      throw new ConflictException(
        `Purchase ${purchaseNumber} posted, but creating its payable record failed: ${lastErr.message}`,
      );
    }

    return {
      id: journal.id,
      number: purchaseNumber,
      journalEntryNumber: journal.entryNumber,
      vendorName: vendor.name,
      amount: total,
      paymentMethod: dto.paymentMethod,
      paymentStatus: onCredit ? "UNPAID" : "PAID",
    };
  }

  /**
   * Auto-register fixed-asset purchase lines as Asset records. For every line
   * whose account is a fixed-asset COST COA (1-4510 Kamera, 1-4410 Perabotan,
   * …), create one Asset per unit linked back to the purchase journal via
   * `acquisitionJournalId` — so it appears on the Assets page, gets a COA-style
   * code + auto useful life, and the depreciation report doesn't double-count it
   * as an "unregistered" purchase. No journal is created here (the Pembelian
   * journal already booked the cost). Best-effort: a failure is logged, never
   * blocks the purchase (the GL is already correct).
   */
  private async autoRegisterFixedAssets(
    journalId: string,
    purchaseDate: Date,
    lineItems: CreatePurchaseDto["lineItems"],
    vendorName: string,
    userId: string,
  ): Promise<void> {
    try {
      // Local sequence cache per COA so multiple units/lines in one purchase get
      // consecutive codes (PHE-4510-005, -006, …) without re-counting each time.
      const seqByCoa = new Map<string, number>();
      const nextCode = async (coa: string): Promise<string> => {
        const prefix = ASSET_COA_PREFIX[coa] ?? "AST";
        const coaNum = coa.replace(/^1-/, "");
        if (!seqByCoa.has(coa)) {
          const count = await this.prisma.asset.count({
            where: { assetCode: { startsWith: `${prefix}-${coaNum}-` } },
          });
          seqByCoa.set(coa, count);
        }
        const next = (seqByCoa.get(coa) ?? 0) + 1;
        seqByCoa.set(coa, next);
        return assetCodeForCoa(coa, next);
      };

      for (const line of lineItems) {
        const coa = line.accountCode;
        if (!isFixedAssetCostCoa(coa)) continue;

        const category = categoryForCoa(coa);
        const group = defaultGroupForCategory(category);
        const lifeYears = usefulLifeYearsForCoa(coa);
        // One Asset per unit when a whole quantity > 1 (so "2 kamera" → 2 assets);
        // otherwise a single asset at the line total.
        const qty =
          Number.isInteger(line.quantity) && line.quantity >= 1
            ? line.quantity
            : 1;
        const perUnit =
          qty > 1 ? line.unitPrice : line.quantity * line.unitPrice;

        for (let unit = 0; unit < qty; unit++) {
          const assetCode = await nextCode(coa);
          const baseName = (line.description || category).trim();
          const name = qty > 1 ? `${baseName} #${unit + 1}` : baseName;
          await this.prisma.asset.create({
            data: {
              assetCode,
              name,
              category,
              purchaseDate,
              purchasePrice: perUnit,
              supplier: vendorName,
              usefulLifeYears: lifeYears,
              depreciationGroup: group,
              acquisitionJournalId: journalId,
              createdById: userId === "system" ? null : userId,
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Auto-register fixed assets for journal ${journalId} failed: ${err?.message ?? err}`,
      );
    }
  }

  /**
   * Settle a purchase: DR 2-1010 (Accounts Payable) / CR cash (Kas/Bank). The
   * settlement journal SHARES the purchase's transactionId so the AP report nets
   * it out and the Purchase Report flips to PAID. It posts immediately, so the
   * GL, AP aging, cash & bank balances and every downstream report update at
   * once. Idempotent: refuses if the purchase is already settled.
   */
  async markPurchaseAsPaid(
    journalEntryId: string,
    userId: string,
    cashAccountCode = "1-1010",
  ) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
    });
    if (!entry) {
      throw new NotFoundException(`Journal entry ${journalEntryId} not found`);
    }
    if (entry.transactionType !== TransactionType.PURCHASE) {
      throw new BadRequestException(
        "Only Pembelian (PURCHASE) entries can be settled here",
      );
    }
    if (!entry.isPosted) {
      throw new BadRequestException(
        "Post the purchase before marking it as paid",
      );
    }

    const apAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "2-1010" },
      select: { id: true },
    });
    if (!apAccount) {
      throw new BadRequestException(
        "Accounts Payable account (2-1010) not found",
      );
    }

    // Amount still owed = 2-1010 net for this purchase's transactionId.
    const glRows = await this.prisma.generalLedger.findMany({
      where: {
        accountId: apAccount.id,
        transactionId: entry.transactionId,
        journalEntry: { isPosted: true },
      },
      select: { debit: true, credit: true },
    });
    const owed = glRows.reduce(
      (s, r) => s + Number(r.credit) - Number(r.debit),
      0,
    );
    if (owed <= 0.005) {
      throw new BadRequestException("This purchase is already paid");
    }

    const cash = await this.prisma.chartOfAccounts.findUnique({
      where: { code: cashAccountCode },
      select: { code: true },
    });
    if (!cash) {
      throw new BadRequestException(`Cash account ${cashAccountCode} not found`);
    }

    const settlement = await this.createJournalEntry({
      entryDate: new Date(),
      description: `Pembayaran ${entry.description}`,
      descriptionId: `Pembayaran ${entry.descriptionId || entry.description}`,
      transactionType: TransactionType.PAYMENT_MADE,
      transactionId: entry.transactionId, // share → AP nets the original
      documentNumber: entry.entryNumber,
      createdBy: userId,
      lineItems: [
        {
          accountCode: "2-1010",
          debit: owed,
          credit: 0,
          description: `Settle ${entry.entryNumber}`,
        },
        {
          accountCode: cashAccountCode,
          debit: 0,
          credit: owed,
          description: `Payment for ${entry.entryNumber}`,
        },
      ],
    } as CreateJournalEntryDto);

    // Post immediately — writes the GL and auto-syncs the cash/bank balance.
    await this.postJournalEntry(settlement.id, userId);

    // Sync the vendor's AccountsPayable record (created by createPurchase) so
    // the payable register agrees with the GL settlement.
    await this.prisma.accountsPayable.updateMany({
      where: { journalEntryId, paymentStatus: { not: "PAID" } },
      data: {
        paidAmount: owed,
        outstandingAmount: 0,
        paymentStatus: "PAID",
        updatedBy: userId,
      },
    });

    return {
      settledEntryId: journalEntryId,
      settlementId: settlement.id,
      amount: owed,
      cashAccountCode,
    };
  }

  /* ================================================================== */
  /*  SALES (Laporan Penjualan)                                         */
  /* ================================================================== */

  /** Next sales number, e.g. SALE-202606-0003 (preview; re-generated at submit). */
  async getNextSaleNumber(): Promise<string> {
    const now = new Date();
    const prefix = `SALE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
    const last = await this.prisma.journalEntry.findFirst({
      where: { transactionId: { startsWith: prefix } },
      orderBy: { transactionId: "desc" },
      select: { transactionId: true },
    });
    const next = last
      ? parseInt(last.transactionId.slice(prefix.length), 10) + 1
      : 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  /**
   * Record a direct sale (Penjualan) from the New Sales form.
   *
   * Each line: net = qty × price × (1 − disc%); tax = net × taxRate. Journal
   * (autoposted — every accounting page updates at once):
   *   DR  1-2010 Piutang Usaha  (paymentMethod PIUTANG)   total   → UNPAID
   *   DR  1-1010 Kas            (paymentMethod CASH)       total   → PAID
   *   DR  1-1020 Bank           (paymentMethod BANK)       total   → PAID
   *   CR  each line's revenue account (4-xxxx)             line net
   *   CR  2-2010 Hutang PPN                                Σ tax (if any)
   *
   * The sales number (SALE-YYYYMM-####) is the journal's transactionId — the same
   * id a later "mark as paid" settlement reuses, which links every related journal
   * and drives the Sales Report's payment status. The customer is stamped onto the
   * line items (GL clientId) so the report resolves it; entryDate = issued date,
   * documentDate = due date.
   */
  async createSale(dto: CreateSaleDto, userId: string) {
    if (!dto.lineItems?.length) {
      throw new BadRequestException("Sale needs at least one line item");
    }

    // Resolve the customer (Kontak): existing id or inline-typed name (find or
    // create, case-insensitive, so repeat sales don't multiply clients).
    let client: { id: string; name: string } | null = null;
    if (dto.clientId) {
      client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { id: true, name: true },
      });
      if (!client) {
        throw new NotFoundException(`Client ${dto.clientId} not found`);
      }
    } else if (dto.clientName?.trim()) {
      const name = dto.clientName.trim();
      client = await this.prisma.client.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (!client) {
        client = await this.prisma.client.create({
          data: { name },
          select: { id: true, name: true },
        });
      }
    }
    if (!client) {
      throw new BadRequestException(
        "Provide a customer (clientId) or a new customer name (clientName)",
      );
    }

    const DEBIT_BY_METHOD: Record<SalePaymentMethod, string> = {
      [SalePaymentMethod.PIUTANG]: "1-2010",
      [SalePaymentMethod.CASH]: "1-1010",
      [SalePaymentMethod.BANK]: "1-1020",
    };
    const debitAccount = DEBIT_BY_METHOD[dto.paymentMethod];

    // Compute per-line net (revenue) and tax.
    const computed = dto.lineItems.map((l) => {
      const gross = l.quantity * l.unitPrice;
      const net = gross * (1 - (l.discountPercent ?? 0) / 100);
      const tax = net * (l.taxRate ?? 0);
      return { line: l, net, tax };
    });
    const revenueTotal = computed.reduce((s, c) => s + c.net, 0);
    const taxTotal = computed.reduce((s, c) => s + c.tax, 0);
    const total = revenueTotal + taxTotal;
    if (total <= 0) {
      throw new BadRequestException("Sale total must be greater than zero");
    }

    const saleNumber = await this.getNextSaleNumber();

    const lineItems: any[] = [
      {
        accountCode: debitAccount,
        debit: total,
        credit: 0,
        description: `Penjualan ${saleNumber} - ${client.name}`,
        clientId: client.id,
      },
      ...computed.map((c) => ({
        accountCode: c.line.accountCode,
        debit: 0,
        credit: c.net,
        description: c.line.itemName,
        descriptionId: c.line.itemName,
        clientId: client!.id,
      })),
    ];
    if (taxTotal > 0.005) {
      lineItems.push({
        accountCode: "2-2010", // Hutang PPN
        debit: 0,
        credit: taxTotal,
        description: `PPN ${saleNumber}`,
      });
    }

    const journal = await this.createJournalEntry({
      entryDate: dto.issuedDate,
      // documentDate carries the DUE date for SALE entries (read back by getSales).
      documentDate: dto.dueDate,
      description: `Penjualan ${saleNumber} - ${client.name}`,
      descriptionId: `Penjualan ${saleNumber} - ${client.name}`,
      transactionType: TransactionType.SALE,
      transactionId: saleNumber,
      documentNumber: dto.reference || saleNumber,
      createdBy: userId,
      lineItems,
    } as CreateJournalEntryDto);
    await this.postJournalEntry(journal.id, userId);

    const onCredit = dto.paymentMethod === SalePaymentMethod.PIUTANG;
    return {
      id: journal.id,
      number: saleNumber,
      journalEntryNumber: journal.entryNumber,
      clientName: client.name,
      amount: total,
      paymentMethod: dto.paymentMethod,
      paymentStatus: onCredit ? "UNPAID" : "PAID",
    };
  }

  /**
   * Sales report — every SALE (Penjualan) journal entry as a receivable/sale
   * document, enriched with the customer, the revenue account (description), the
   * issued + due dates, and a payment status from the 1-2010 GL net for the
   * entry's transactionId (a settlement posted by markSaleAsPaid flips it to PAID).
   */
  async getSales(params: { startDate?: Date; endDate?: Date }) {
    const where: any = { transactionType: TransactionType.SALE };
    if (params.startDate || params.endDate) {
      where.entryDate = {};
      if (params.startDate) where.entryDate.gte = params.startDate;
      if (params.endDate) where.entryDate.lte = params.endDate;
    }

    const entries = await this.prisma.journalEntry.findMany({
      where,
      include: {
        lineItems: {
          include: {
            account: {
              select: { code: true, name: true, nameId: true, accountType: true },
            },
          },
        },
      },
      orderBy: { entryDate: "desc" },
    });

    const arAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "1-2010" },
      select: { id: true },
    });

    // Payment status: net of 1-2010 per transactionId across POSTED entries
    // (original sale debit − any settlement credit). <= 0 ⇒ fully collected.
    const txnIds = [
      ...new Set(entries.map((e) => e.transactionId).filter(Boolean)),
    ] as string[];
    const arNetByTxn = new Map<string, number>();
    if (arAccount && txnIds.length) {
      const glRows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: arAccount.id,
          transactionId: { in: txnIds },
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

    // Customer names: resolve the clientId stamped on the line items.
    const clientIds = [
      ...new Set(
        entries
          .flatMap((e) => e.lineItems.map((l) => l.clientId))
          .filter(Boolean),
      ),
    ] as string[];
    const clients = clientIds.length
      ? await this.prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, name: true },
        })
      : [];
    const clientById = new Map(clients.map((c) => [c.id, c.name]));

    // Direct sales (the New Sales form → SALE journal entries).
    const directSaleRows = entries.map((e) => {
      const clientId = e.lineItems.find((l) => l.clientId)?.clientId ?? null;
      // Revenue line (the credited 4-xxxx) = the sale's nature → description.
      const revLine = e.lineItems
        .filter((l) => Number(l.credit) > 0 && l.account?.code !== "2-2010")
        .sort((a, b) => Number(b.credit) - Number(a.credit))[0]?.account;
      // PIUTANG sales debit 1-2010 → that line's debit is the sale total; cash/bank
      // sales debit 1-1010/1-1020. Sum debit excluding 2-2010 just in case.
      const amount = e.lineItems
        .filter((l) =>
          ["1-2010", "1-1010", "1-1020"].includes(l.account?.code ?? ""),
        )
        .reduce((s, l) => s + Number(l.debit), 0);
      // Only PIUTANG sales carry a 1-2010 balance to collect; cash/bank are paid.
      const hasAR = e.lineItems.some((l) => l.account?.code === "1-2010");
      const arNet = e.transactionId ? arNetByTxn.get(e.transactionId) ?? 0 : 0;
      const paid = e.isPosted && (!hasAR || arNet <= 0.005);
      return {
        id: e.id,
        sourceType: "SALE" as const,
        number: e.transactionId?.startsWith("SALE-")
          ? e.transactionId
          : e.entryNumber,
        journalEntryNumber: e.entryNumber,
        clientId,
        clientName: clientId ? clientById.get(clientId) ?? null : null,
        // Description: the revenue account name (COA) — service vs product reads
        // naturally (Pendapatan Jasa / Penjualan Produk).
        description:
          revLine?.nameId || revLine?.name || e.description || "—",
        revenueCode: revLine?.code ?? null,
        issuedDate: e.entryDate as Date,
        dueDate: (e.documentDate ?? e.entryDate) as Date,
        amount,
        transactionId: e.transactionId,
        postingStatus: e.status as string,
        isPosted: e.isPosted,
        paymentStatus: (paid ? "PAID" : "UNPAID") as "PAID" | "UNPAID",
      };
    });

    // Project-based sales: the existing INVOICES are also sales. Per spec, their
    // Description follows the Project Type (jasa usaha) rather than a COA. Drafts
    // and cancelled invoices are excluded; PAID → PAID, otherwise UNPAID.
    const invoiceWhere: any = { status: { in: ["SENT", "PAID", "OVERDUE"] } };
    if (params.startDate || params.endDate) {
      invoiceWhere.creationDate = {};
      if (params.startDate) invoiceWhere.creationDate.gte = params.startDate;
      if (params.endDate) invoiceWhere.creationDate.lte = params.endDate;
    }
    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoiceNumber: true,
        creationDate: true,
        dueDate: true,
        totalAmount: true,
        status: true,
        client: { select: { id: true, name: true } },
        project: {
          select: { projectType: { select: { name: true } } },
        },
      },
      orderBy: { creationDate: "desc" },
    });
    const invoiceRows = invoices.map((inv) => ({
      id: inv.id,
      sourceType: "INVOICE" as const,
      number: inv.invoiceNumber,
      journalEntryNumber: inv.invoiceNumber,
      clientId: inv.client?.id ?? null,
      clientName: inv.client?.name ?? null,
      description: inv.project?.projectType?.name || "Penjualan Jasa",
      revenueCode: null as string | null,
      issuedDate: inv.creationDate as Date,
      dueDate: inv.dueDate as Date,
      amount: Number(inv.totalAmount),
      transactionId: inv.invoiceNumber,
      postingStatus: "POSTED" as string,
      isPosted: true,
      paymentStatus: (inv.status === "PAID" ? "PAID" : "UNPAID") as
        | "PAID"
        | "UNPAID",
    }));

    // Unified Sales Report: direct sales + invoices, newest first.
    return [...directSaleRows, ...invoiceRows].sort(
      (a, b) =>
        new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime(),
    );
  }

  /**
   * Collect a sale: DR cash (Kas/Bank) / CR 1-2010 (Piutang Usaha). Shares the
   * sale's transactionId so the AR report nets it out and the Sales Report flips
   * to PAID. Posts immediately → GL, AR, cash & bank and reports update at once.
   * Idempotent: refuses if already collected.
   */
  async markSaleAsPaid(
    journalEntryId: string,
    userId: string,
    cashAccountCode = "1-1010",
  ) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
    });
    if (!entry) {
      throw new NotFoundException(`Journal entry ${journalEntryId} not found`);
    }
    if (entry.transactionType !== TransactionType.SALE) {
      throw new BadRequestException(
        "Only Penjualan (SALE) entries can be collected here",
      );
    }
    if (!entry.isPosted) {
      throw new BadRequestException("Post the sale before marking it as paid");
    }

    const arAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { code: "1-2010" },
      select: { id: true },
    });
    if (!arAccount) {
      throw new BadRequestException(
        "Accounts Receivable account (1-2010) not found",
      );
    }

    // Amount still owed = 1-2010 net for this sale's transactionId.
    const glRows = await this.prisma.generalLedger.findMany({
      where: {
        accountId: arAccount.id,
        transactionId: entry.transactionId,
        journalEntry: { isPosted: true },
      },
      select: { debit: true, credit: true },
    });
    const owed = glRows.reduce(
      (s, r) => s + Number(r.debit) - Number(r.credit),
      0,
    );
    if (owed <= 0.005) {
      throw new BadRequestException("This sale is already paid");
    }

    const cash = await this.prisma.chartOfAccounts.findUnique({
      where: { code: cashAccountCode },
      select: { code: true },
    });
    if (!cash) {
      throw new BadRequestException(`Cash account ${cashAccountCode} not found`);
    }

    const settlement = await this.createJournalEntry({
      entryDate: new Date(),
      description: `Pelunasan ${entry.description}`,
      descriptionId: `Pelunasan ${entry.descriptionId || entry.description}`,
      transactionType: TransactionType.PAYMENT_RECEIVED,
      transactionId: entry.transactionId, // share → AR nets the original
      documentNumber: entry.documentNumber || entry.entryNumber,
      createdBy: userId,
      lineItems: [
        {
          accountCode: cashAccountCode,
          debit: owed,
          credit: 0,
          description: `Collect ${entry.entryNumber}`,
        },
        {
          accountCode: "1-2010",
          debit: 0,
          credit: owed,
          description: `Settle ${entry.entryNumber}`,
        },
      ],
    } as CreateJournalEntryDto);
    await this.postJournalEntry(settlement.id, userId);

    return {
      settledEntryId: journalEntryId,
      settlementId: settlement.id,
      amount: owed,
      cashAccountCode,
    };
  }
}
