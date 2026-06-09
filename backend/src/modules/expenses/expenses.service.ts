import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PPNCalculatorService } from "./services/ppn-calculator.service";
import { WithholdingTaxCalculatorService } from "./services/withholding-tax-calculator.service";
import { EFakturValidatorService } from "./services/efaktur-validator.service";
import { JournalService } from "../accounting/services/journal.service";
import { ProjectCostingService } from "../accounting/services/project-costing.service";
import { ProfitCalculationService } from "../projects/profit-calculation.service";
import { accountForSource } from "../accounting/cash-accounts.util";
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  ApproveExpenseDto,
  RejectExpenseDto,
  MarkPaidDto,
} from "./dto";
import {
  ExpenseStatus,
  ExpensePaymentStatus,
  ExpenseApprovalAction,
} from "@prisma/client";

/** Columns that callers are allowed to sort expenses by. */
const EXPENSE_SORT_ALLOWLIST = [
  "expenseDate",
  "totalAmount",
  "createdAt",
  "status",
  "paymentStatus",
  "expenseNumber",
  "vendorName",
  "updatedAt",
] as const;

/** True for both ADMIN and SUPER_ADMIN roles. */
function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);
  constructor(
    private prisma: PrismaService,
    private ppnCalculator: PPNCalculatorService,
    private withholdingTaxCalculator: WithholdingTaxCalculatorService,
    private eFakturValidator: EFakturValidatorService,
    private journalService: JournalService,
    private projectCostingService: ProjectCostingService,
    private profitCalculationService: ProfitCalculationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Budget tracking helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find all ExpenseBudget rows that a given expense counts against.
   *
   * Match rules:
   *   1. Budget must be active (isActive = true)
   *   2. expenseDate must fall within [startDate, endDate] (inclusive)
   *   3. If the budget has a categoryId, it must match the expense categoryId.
   *      Budgets with categoryId = NULL are "all-category" budgets — they match any expense.
   *   4. If the budget has a projectId, it must match the expense projectId.
   *      Budgets with projectId = NULL match expenses regardless of project.
   *
   * So the narrowest possible match (category + project) wins, but we update
   * ALL matching budgets (a single expense can count against multiple budgets,
   * e.g. a per-category budget AND a whole-project budget at the same time).
   */
  private async findMatchingBudgets(
    categoryId: string,
    projectId: string | null | undefined,
    expenseDate: Date,
  ) {
    return this.prisma.expenseBudget.findMany({
      where: {
        isActive: true,
        startDate: { lte: expenseDate },
        endDate: { gte: expenseDate },
        OR: [
          // Budget scoped to this specific category (projectId may also restrict)
          {
            categoryId,
            ...(projectId
              ? { OR: [{ projectId }, { projectId: null }] }
              : { projectId: null }),
          },
          // Budget with no category restriction
          {
            categoryId: null,
            ...(projectId
              ? { OR: [{ projectId }, { projectId: null }] }
              : { projectId: null }),
          },
        ],
      },
    });
  }

  /**
   * Increment `spent` by `delta` on matching budgets and recompute `remaining`.
   * Uses Prisma's atomic `increment` to avoid concurrent-update races.
   * Floors `spent` at 0 on the recompute to guard against accidental negatives.
   */
  private async applyBudgetDelta(
    categoryId: string,
    projectId: string | null | undefined,
    expenseDate: Date,
    delta: number, // positive = add, negative = subtract
  ): Promise<void> {
    const budgets = await this.findMatchingBudgets(
      categoryId,
      projectId,
      expenseDate,
    );

    if (budgets.length === 0) return;

    await Promise.all(
      budgets.map(async (budget) => {
        // FIX 1: Atomic increment — avoids lost-update race when two concurrent
        // expenses hit the same budget.  Prisma translates this to:
        //   UPDATE "ExpenseBudget" SET spent = spent + $delta WHERE id = $id
        // The returned row carries the committed new value of `spent`.
        const updated = await this.prisma.expenseBudget.update({
          where: { id: budget.id },
          data: { spent: { increment: delta } },
        });

        const committedSpent = Number(updated.spent);

        // Guard against negative spent (e.g. delete races or data-repair deltas).
        if (committedSpent < 0) {
          this.logger.warn(
            `[BUDGET] Budget ${budget.id} (${budget.name}) went negative ` +
              `(spent=${committedSpent}, delta=${delta}). Clamping to 0.`,
          );
          await this.prisma.expenseBudget.update({
            where: { id: budget.id },
            data: {
              spent: 0,
              remaining: Number(budget.amount),
            },
          });
          return;
        }

        // Derive remaining from the authoritative post-increment value.
        const newRemaining = Math.max(0, Number(budget.amount) - committedSpent);
        await this.prisma.expenseBudget.update({
          where: { id: budget.id },
          data: { remaining: newRemaining },
        });

        this.logger.log(
          `[BUDGET] Updated budget "${budget.name}" (${budget.id}): ` +
            `spent ${budget.spent} → ${committedSpent}, ` +
            `remaining → ${newRemaining}`,
        );
      }),
    );
  }

  /**
   * Recalculate spent/remaining for ALL budgets from scratch.
   * Groups expenses by the budgets they match and SUM(totalAmount) per group.
   * Safe to call repeatedly; idempotent.
   */
  async recalculateAllBudgets(): Promise<
    { id: string; name: string; before: number; after: number }[]
  > {
    const budgets = await this.prisma.expenseBudget.findMany({
      where: { isActive: true },
    });

    const results: {
      id: string;
      name: string;
      before: number;
      after: number;
    }[] = [];

    for (const budget of budgets) {
      const where: any = {
        expenseDate: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      };
      if (budget.categoryId) where.categoryId = budget.categoryId;
      if (budget.projectId) where.projectId = budget.projectId;

      const agg = await this.prisma.expense.aggregate({
        where,
        _sum: { totalAmount: true },
      });

      const newSpent = Number(agg._sum.totalAmount ?? 0);
      const newRemaining = Math.max(0, Number(budget.amount) - newSpent);

      results.push({
        id: budget.id,
        name: budget.name,
        before: Number(budget.spent),
        after: newSpent,
      });

      await this.prisma.expenseBudget.update({
        where: { id: budget.id },
        data: {
          spent: newSpent,
          remaining: newRemaining,
        },
      });
    }

    this.logger.log(
      `[BUDGET] Recalculated ${budgets.length} budget(s): ` +
        results.map((r) => `${r.name}: ${r.before}→${r.after}`).join(", "),
    );

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new expense
   */
  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    // Validate category exists
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: createExpenseDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Expense category not found: ${createExpenseDto.categoryId}`,
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(
        `Expense category is inactive: ${createExpenseDto.categoryId}`,
      );
    }

    // Validate project if provided
    if (createExpenseDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createExpenseDto.projectId },
      });
      if (!project) {
        throw new NotFoundException(
          `Project not found: ${createExpenseDto.projectId}`,
        );
      }
    }

    // Validate client if provided
    if (createExpenseDto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: createExpenseDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(
          `Client not found: ${createExpenseDto.clientId}`,
        );
      }
    }

    // Validate Indonesian tax calculations
    this.validateIndonesianTaxCalculations(createExpenseDto);

    // Validate e-Faktur if provided
    if (createExpenseDto.eFakturNSFP) {
      const eFakturValidation = this.eFakturValidator.validateEFakturData({
        nsfp: createExpenseDto.eFakturNSFP,
        qrCode: createExpenseDto.eFakturQRCode || "",
        vendorNPWP: createExpenseDto.vendorNPWP || "",
        grossAmount: createExpenseDto.grossAmount,
        ppnAmount: createExpenseDto.ppnAmount || 0,
        totalAmount: createExpenseDto.totalAmount,
        issueDate: createExpenseDto.expenseDate,
      });

      if (!eFakturValidation.valid) {
        throw new BadRequestException(
          `e-Faktur validation failed: ${eFakturValidation.errors.join(", ")}`,
        );
      }
    }

    // Generate expense number
    const expenseNumber = await this.generateExpenseNumber();

    // Generate Bukti Pengeluaran number
    const buktiPengeluaranNumber = await this.generateBuktiPengeluaranNumber();

    // paymentSource only chooses which balance (Cash/Bank) the payment journal
    // credits — it is not an Expense column, so keep it out of the create data.
    const { paymentSource: _paymentSource, ...expenseData } = createExpenseDto;

    // Create expense with defaults for optional PPN fields
    // Automatically set status to PAID and create payment journal entry
    // FIX 3: On a P2002 unique-key collision (number race), regenerate both
    // numbers and retry up to 2 more times before surfacing ConflictException.
    let expense: any;
    let currentExpenseNumber = expenseNumber;
    let currentBuktiNumber = buktiPengeluaranNumber;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        expense = await this.prisma.expense.create({
          data: {
            ...expenseData,
            // Reimbursable (billable) = a pass-through advanced for the client.
            // It is NOT an expense (beban): classify the record itself as Other
            // Receivable (1-2040 Piutang Lain-lain) so it never shows up under a
            // 5/6-xxx expense account in expense-by-account views. The GL already
            // posts to 1-2040; this keeps the Expense row's own account in sync.
            // The chosen categoryId is kept only as a descriptive tag (what the
            // advance was for).
            ...(createExpenseDto.isBillable
              ? {
                  accountCode: "1-2040",
                  accountName: "Piutang Lain-Lain",
                  accountNameEn: "Other Receivables",
                }
              : {}),
            ppnAmount: createExpenseDto.ppnAmount ?? 0,
            ppnRate: createExpenseDto.ppnRate ?? 0,
            ppnCategory: createExpenseDto.ppnCategory || "NON_CREDITABLE",
            expenseNumber: currentExpenseNumber,
            buktiPengeluaranNumber: currentBuktiNumber,
            userId,
            status: ExpenseStatus.PAID, // Automatically PAID
            paymentStatus: ExpensePaymentStatus.PAID, // Automatically PAID
            paidAt: new Date(), // Set payment timestamp
            paymentMethod: "Automatic", // System-generated payment
            createdBy: userId,
          },
          include: {
            category: true,
            user: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, number: true, description: true } },
            client: { select: { id: true, name: true } },
          },
        });
        break; // success — exit retry loop
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002" &&
          attempt < maxAttempts
        ) {
          this.logger.warn(
            `[EXPENSE_CREATE] P2002 collision on attempt ${attempt}; regenerating numbers.`,
          );
          currentExpenseNumber = await this.generateExpenseNumber();
          currentBuktiNumber = await this.generateBuktiPengeluaranNumber();
          continue;
        }
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        ) {
          throw new ConflictException(
            "Duplicate expense number — please retry",
          );
        }
        throw error;
      }
    }

    // Create payment journal entry to reduce cash.
    // Reimbursable (billable) expenses are a PASS-THROUGH paid on the client's
    // behalf: they debit Other Receivables (1-2040 Piutang Lain-lain) instead of
    // an expense account, so they never hit the P&L / project margin. Cleared
    // later when the client reimburses (recoverBillableExpense → DR Cash / CR 1-2040).
    const isReimbursable = createExpenseDto.isBillable === true;
    const debitAccount = isReimbursable ? "1-2040" : category.accountCode;
    // DEFERRED POSTING (per business decision): a reimbursable expense does NOT
    // touch the journal at record time. It is only tracked on the Expense row
    // (classified to 1-2040 above, paymentJournalId stays null = "pending"). The
    // GL leg DR 1-2040 / CR Cash is posted later, at invoice SENT, alongside the
    // services AR/Revenue split (invoices.service → updateStatus SENT). This keeps
    // the reimburse out of the books until it is actually billed to the client.
    if (!isReimbursable) try {
      const paymentJournal = await this.journalService.createJournalEntry({
        description: isReimbursable
          ? `Reimburse (dibayar atas nama klien) - ${expense.expenseNumber}`
          : `Pembayaran Expense - ${expense.expenseNumber}`,
        entryDate: new Date(createExpenseDto.expenseDate),
        transactionId: expense.expenseNumber,
        transactionType: isReimbursable ? "EXPENSE_REIMBURSEMENT" : "EXPENSE_PAID",
        createdBy: userId,
        autoPost: true, // ✅ FIX: Auto-post to General Ledger
        lineItems: [
          {
            accountCode: debitAccount, // Debit: expense account, or 1-2040 if reimbursable
            debit: Number(createExpenseDto.totalAmount),
            credit: 0,
            description: isReimbursable
              ? `Piutang reimburse - ${expense.vendorName}`
              : `${expense.description} - ${expense.vendorName}`,
            // FIX 1: stamp projectId/clientId so GL lines are project-attributable
            projectId: createExpenseDto.projectId ?? undefined,
            clientId: createExpenseDto.clientId ?? undefined,
          },
          {
            // Credit the chosen balance: Cash (Kas) or the default Bank account.
            accountCode: accountForSource(createExpenseDto.paymentSource ?? "CASH"),
            debit: 0,
            credit: Number(createExpenseDto.totalAmount), // Reduce cash/bank
            description: `Pembayaran untuk ${expense.vendorName}`,
            // FIX 1: stamp projectId/clientId on cash leg as well for full traceability
            projectId: createExpenseDto.projectId ?? undefined,
            clientId: createExpenseDto.clientId ?? undefined,
          },
        ],
      });

      // Link journal entry to expense
      await this.prisma.expense.update({
        where: { id: expense.id },
        data: { paymentJournalId: paymentJournal.id },
      });

      this.logger.log(
        `✅ Created and posted journal entry for expense ${expense.expenseNumber}`,
      );
    } catch (error) {
      this.logger.error("Error creating payment journal entry:", error);
      // Continue even if journal entry creation fails - expense was still created
    }

    // FIX 2: Flow the expense into project-level cost tracking and profitability.
    // Only when a projectId is present. Wrapped in its own try/catch so a costing
    // failure NEVER rolls back the expense or its GL journal (project-costing is a
    // recomputable rollup, not part of double-entry bookkeeping).
    // MARGIN EXCLUSION: billable/reimbursable expenses are a pass-through paid on
    // the client's behalf (debited to 1-2040 Piutang Lain-lain above, never an
    // expense account), so they must NOT reduce project profit/margin. Skip WIP
    // accumulation for them.
    if (createExpenseDto.projectId && !createExpenseDto.isBillable) {
      try {
        // Accumulate into WIP directExpenses for the period of the expense date.
        // accumulateProjectCosts' createWIPJournalEntry is a stub (console.log only)
        // so there is NO second GL posting — the EXPENSE_PAID journal above is
        // the sole double-entry record for this cost.
        const periodDate = new Date(createExpenseDto.expenseDate);
        periodDate.setDate(1);   // first day of the month
        periodDate.setHours(0, 0, 0, 0);

        await this.projectCostingService.accumulateProjectCosts(
          createExpenseDto.projectId,
          periodDate,
          { directExpenses: Number(createExpenseDto.totalAmount) },
          userId,
        );

        // Refresh the project's denormalized profit/margin fields.
        await this.profitCalculationService.calculateProjectProfitMargin(
          createExpenseDto.projectId,
          userId,
        );

        this.logger.log(
          `✅ [PROJECT_COST] Accumulated ${createExpenseDto.totalAmount} ` +
            `into WIP directExpenses for project ${createExpenseDto.projectId}`,
        );
      } catch (costError) {
        this.logger.error(
          `[PROJECT_COST] Failed to update project costing for expense ` +
            `${expense.expenseNumber} / project ${createExpenseDto.projectId}: ` +
            String(costError),
        );
        // Non-fatal: expense and GL journal are intact. Costing can be
        // recomputed later via recalculateAllProjects().
      }
    }

    // ── Budget tracking: increment spent on matching budgets ──────────────
    try {
      await this.applyBudgetDelta(
        expense.categoryId,
        expense.projectId ?? null,
        new Date(createExpenseDto.expenseDate),
        Number(createExpenseDto.totalAmount),
      );
    } catch (error) {
      this.logger.error("[BUDGET] Failed to update budget on create:", error);
      // Non-fatal: expense was created, budget tracking update failed
    }

    return expense;
  }

  /**
   * Find all expenses with filtering and pagination
   */
  async findAll(userId: string, query: ExpenseQueryDto, userRole: string) {
    const {
      page = 1,
      limit = 20,
      sortBy: rawSortBy = "expenseDate",
      sortOrder = "desc",
      ...filters
    } = query;

    // FIX 2: validate sortBy against allowlist to prevent arbitrary-column 500s
    const sortBy = (EXPENSE_SORT_ALLOWLIST as readonly string[]).includes(rawSortBy)
      ? rawSortBy
      : "expenseDate";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // FIX 1: Role-based filtering — both ADMIN and SUPER_ADMIN see all expenses
    if (!isAdminRole(userRole)) {
      where.userId = userId;
    }

    // Apply filters
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { descriptionId: { contains: filters.search, mode: "insensitive" } },
        { vendorName: { contains: filters.search, mode: "insensitive" } },
        { eFakturNSFP: { contains: filters.search, mode: "insensitive" } },
        { accountCode: { contains: filters.search, mode: "insensitive" } },
        { expenseNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.expenseClass) where.expenseClass = filters.expenseClass;
    if (filters.ppnCategory) where.ppnCategory = filters.ppnCategory;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.userId && isAdminRole(userRole)) where.userId = filters.userId;
    if (filters.approvedBy) where.approvedBy = filters.approvedBy;
    if (filters.isBillable !== undefined) where.isBillable = filters.isBillable;
    if (filters.accountCode) where.accountCode = filters.accountCode;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.expenseDate = {};
      if (filters.startDate) where.expenseDate.gte = filters.startDate;
      if (filters.endDate) where.expenseDate.lte = filters.endDate;
    }

    // Amount range filter
    if (filters.minAmount || filters.maxAmount) {
      where.totalAmount = {};
      if (filters.minAmount) where.totalAmount.gte = filters.minAmount;
      if (filters.maxAmount) where.totalAmount.lte = filters.maxAmount;
    }

    // Execute query
    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, number: true, description: true } },
          client: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one expense by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        project: {
          select: { id: true, number: true, description: true, client: true },
        },
        client: { select: { id: true, name: true, email: true, phone: true } },
        documents: true,
        approvalHistory: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { actionDate: "desc" },
        },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found: ${id}`);
    }

    // Check access: users can only see their own expenses unless admin
    if (!isAdminRole(userRole) && expense.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to view this expense",
      );
    }

    return expense;
  }

  /**
   * Update an expense (can edit any status for corrections)
   */
  /**
   * Keep a project's WIP direct costs (and denormalised profit/margin) in sync
   * when an expense changes. create() accumulates each non-billable project
   * expense into WIP, but update()/remove() historically did NOT back it out —
   * so edited/deleted expenses left their cost in the project forever, inflating
   * actual cost and making the Profitability panel disagree with the live
   * expense list. This applies a signed delta and recalculates.
   *
   * Billable (reimbursable) expenses never hit project cost, so they are
   * skipped — the guard mirrors create()'s `projectId && !isBillable`.
   */
  private async syncProjectCostingDelta(
    projectId: string | null | undefined,
    isBillable: boolean,
    expenseDate: Date,
    delta: number,
    userId: string,
  ): Promise<void> {
    if (!projectId || isBillable || !delta) return;
    try {
      const periodDate = new Date(expenseDate);
      periodDate.setDate(1);
      periodDate.setHours(0, 0, 0, 0);
      await this.projectCostingService.accumulateProjectCosts(
        projectId,
        periodDate,
        { directExpenses: delta },
        userId,
      );
      await this.profitCalculationService.calculateProjectProfitMargin(
        projectId,
        userId,
      );
    } catch (e) {
      this.logger.error(
        `[PROJECT_COST] Failed to sync costing delta (${delta}) for project ${projectId}: ${String(e)}`,
      );
    }
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    updateExpenseDto: UpdateExpenseDto,
  ) {
    const expense = await this.findOne(id, userId, userRole);

    // Allow updates to any expense for corrections (including PAID expenses)

    // Check ownership
    if (!isAdminRole(userRole) && expense.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to update this expense",
      );
    }

    // Validate Indonesian tax calculations if amounts changed
    const amountsChanged =
      updateExpenseDto.grossAmount !== undefined ||
      updateExpenseDto.ppnAmount !== undefined ||
      updateExpenseDto.withholdingAmount !== undefined ||
      updateExpenseDto.totalAmount !== undefined;

    if (amountsChanged) {
      const dataToValidate = { ...expense, ...updateExpenseDto };
      this.validateIndonesianTaxCalculations(dataToValidate as any);
    }

    // Update expense
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...updateExpenseDto,
        updatedBy: userId,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, number: true, description: true } },
        client: { select: { id: true, name: true } },
      },
    });

    // If totalAmount changed and expense has a payment journal, reverse and repost
    if (
      updateExpenseDto.totalAmount !== undefined &&
      Number(updateExpenseDto.totalAmount) !== Number(expense.totalAmount) &&
      expense.paymentJournalId
    ) {
      try {
        const newAmount = Number(updateExpenseDto.totalAmount);

        // Reverse the old payment journal entry
        await this.journalService.reverseJournalEntry(
          expense.paymentJournalId,
          userId,
        );

        // Look up the cash/bank account used in the original journal so we
        // can mirror it in the new entry.  The original credit line is the
        // cash/bank leg (account code starts with 1-101 or 1-102).
        const originalJournal = await this.journalService.getJournalEntry(
          expense.paymentJournalId,
        );
        const cashLine = originalJournal.lineItems.find(
          (l) => /^1-10[12]/.test(l.account.code) && Number(l.credit) > 0,
        );
        const cashAccountCode = cashLine?.account.code ?? "1-1010"; // default: Cash

        // Reload the updated expense to get the category's accountCode AND the
        // (possibly updated) isBillable flag.
        const freshExpense = await this.prisma.expense.findUnique({
          where: { id },
          include: { category: true },
        });

        // Mirror create(): a REIMBURSABLE (billable) expense is a pass-through
        // booked to Piutang Lain-lain (1-2040), NOT an internal expense account.
        // The old repost ignored this and always debited the 5/6-xxx expense
        // account, corrupting the GL for billable expenses on every edit.
        const isReimbursable = freshExpense!.isBillable === true;
        const debitAccount = isReimbursable
          ? "1-2040"
          : freshExpense!.category!.accountCode;

        // Post a new payment journal at the new amount
        const newPaymentJournal = await this.journalService.createJournalEntry({
          description: `Pembayaran Expense (Koreksi) - ${expense.expenseNumber}`,
          entryDate: new Date(),
          transactionId: expense.expenseNumber,
          transactionType: isReimbursable
            ? "EXPENSE_REIMBURSEMENT"
            : "EXPENSE_PAID",
          createdBy: userId,
          autoPost: true,
          lineItems: [
            {
              accountCode: debitAccount, // Debit: expense account, or 1-2040 if reimbursable
              debit: newAmount,
              credit: 0,
              description: `${expense.description} - koreksi jumlah`,
            },
            {
              accountCode: cashAccountCode, // Credit cash/bank
              debit: 0,
              credit: newAmount,
              description: `Koreksi pembayaran untuk ${expense.vendorName}`,
            },
          ],
        });

        // Update the expense's paymentJournalId to the new entry
        await this.prisma.expense.update({
          where: { id },
          data: { paymentJournalId: newPaymentJournal.id },
        });

        this.logger.log(
          `✅ Reversed old payment journal and posted new one (${newPaymentJournal.id}) ` +
            `for expense ${expense.expenseNumber} at new amount ${newAmount}`,
        );
      } catch (error) {
        this.logger.error("Error updating journal entry for expense:", error);
        // Continue - the expense record was updated successfully
      }
    }

    // ── Budget tracking: adjust spent if totalAmount changed ──────────────
    if (
      updateExpenseDto.totalAmount !== undefined &&
      Number(updateExpenseDto.totalAmount) !== Number(expense.totalAmount)
    ) {
      try {
        const oldAmount = Number(expense.totalAmount);
        const newAmount = Number(updateExpenseDto.totalAmount);
        const effectiveCategoryId =
          updateExpenseDto.categoryId ?? expense.categoryId;
        const effectiveProjectId =
          updateExpenseDto.projectId !== undefined
            ? updateExpenseDto.projectId
            : expense.projectId;
        const effectiveDate = expense.expenseDate;

        // Reverse old amount, apply new amount
        await this.applyBudgetDelta(
          effectiveCategoryId,
          effectiveProjectId,
          effectiveDate,
          newAmount - oldAmount, // net delta (may be positive or negative)
        );
      } catch (error) {
        this.logger.error("[BUDGET] Failed to update budget on update:", error);
      }
    }

    // ── Project costing: keep WIP direct costs in sync ────────────────────
    // Back out the OLD contribution and apply the NEW one. The helper skips
    // billable expenses and missing projects, so this transparently handles
    // amount edits, billable on/off toggles, project moves, and date/period
    // changes (each as a remove-from-old + add-to-new).
    const oldBillable = expense.isBillable;
    const newBillable = updateExpenseDto.isBillable ?? expense.isBillable;
    const oldProjectId = expense.projectId;
    const newProjectId =
      updateExpenseDto.projectId !== undefined
        ? updateExpenseDto.projectId
        : expense.projectId;
    const oldAmt = Number(expense.totalAmount);
    const newAmt =
      updateExpenseDto.totalAmount !== undefined
        ? Number(updateExpenseDto.totalAmount)
        : oldAmt;
    const newDate = updateExpenseDto.expenseDate
      ? new Date(updateExpenseDto.expenseDate)
      : expense.expenseDate;
    const costingRelevantChanged =
      oldAmt !== newAmt ||
      oldBillable !== newBillable ||
      oldProjectId !== newProjectId ||
      expense.expenseDate.getTime() !== newDate.getTime();
    if (costingRelevantChanged) {
      await this.syncProjectCostingDelta(
        oldProjectId,
        oldBillable,
        expense.expenseDate,
        -oldAmt,
        userId,
      );
      await this.syncProjectCostingDelta(
        newProjectId,
        newBillable,
        newDate,
        newAmt,
        userId,
      );
    }

    return updated;
  }

  /**
   * Delete an expense.
   *
   * Expenses are created in PAID status (create() always sets PAID), so the
   * old DRAFT-only guard made every expense un-deletable.  The corrected guard
   * blocks only SUBMITTED and APPROVED expenses (mid-approval workflow) where
   * hard-deletion would leave dangling approval history without a conclusion.
   * DRAFT, PAID, and REJECTED expenses can all be safely deleted.
   *
   * When deleting a PAID expense whose payment journal has already been posted
   * (and not yet reversed), we reverse it here so the books stay balanced.
   */
  async remove(id: string, userId: string, userRole: string) {
    const expense = await this.findOne(id, userId, userRole);

    // Block mid-approval-workflow states where deletion would be destructive
    if (
      expense.status === ExpenseStatus.SUBMITTED ||
      expense.status === ExpenseStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Expenses in ${expense.status} status cannot be deleted. ` +
          "Reject or cancel the approval first.",
      );
    }

    // Check ownership
    if (!isAdminRole(userRole) && expense.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to delete this expense",
      );
    }

    // ── Reverse payment journal if present, posted, and not already reversed ──
    if (expense.paymentJournalId) {
      try {
        await this.journalService.reverseJournalEntry(
          expense.paymentJournalId,
          userId,
        );
        this.logger.log(
          `[EXPENSE_DELETE] Reversed payment journal ${expense.paymentJournalId} ` +
            `for expense ${expense.expenseNumber}`,
        );
      } catch (error: any) {
        // ConflictException = already reversed (idempotent — proceed)
        // BadRequestException "not posted" = journal was never posted (proceed)
        const alreadyReversed =
          error?.status === 409 ||
          (error?.message ?? "").includes("already been reversed");
        if (!alreadyReversed) {
          this.logger.warn(
            `[EXPENSE_DELETE] Could not reverse payment journal ` +
              `${expense.paymentJournalId}: ${error?.message}`,
          );
        }
        // Non-fatal: proceed with deletion regardless
      }
    }

    // ── Budget tracking: decrement spent before deletion ─────────────────
    try {
      await this.applyBudgetDelta(
        expense.categoryId,
        expense.projectId ?? null,
        expense.expenseDate,
        -Number(expense.totalAmount),
      );
    } catch (error) {
      this.logger.error("[BUDGET] Failed to update budget on delete:", error);
    }

    // ── Project costing: back out this expense's WIP contribution ─────────
    // Without this, a deleted non-billable project expense left its cost in
    // the project's direct costs, overstating actual cost and net loss.
    await this.syncProjectCostingDelta(
      expense.projectId,
      expense.isBillable,
      expense.expenseDate,
      -Number(expense.totalAmount),
      userId,
    );

    await this.prisma.expense.delete({ where: { id } });

    return { message: "Expense deleted successfully" };
  }

  /**
   * Submit expense for approval
   */
  async submit(id: string, userId: string, userRole: string) {
    const expense = await this.findOne(id, userId, userRole);

    // If expense is already PAID, return it as-is (auto-paid on creation)
    if (expense.status === ExpenseStatus.PAID) {
      this.logger.log(
        `[EXPENSE_SUBMIT] Expense ${id} is already PAID, returning as-is`,
      );
      return expense;
    }

    // If expense is already SUBMITTED or APPROVED, return it as-is
    if (
      expense.status === ExpenseStatus.SUBMITTED ||
      expense.status === ExpenseStatus.APPROVED
    ) {
      this.logger.log(
        `[EXPENSE_SUBMIT] Expense ${id} is already ${expense.status}, returning as-is`,
      );
      return expense;
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT expenses can be submitted for approval",
      );
    }

    if (!isAdminRole(userRole) && expense.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to submit this expense",
      );
    }

    // Update status
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    // Create approval history
    await this.prisma.expenseApprovalHistory.create({
      data: {
        expenseId: id,
        action: ExpenseApprovalAction.SUBMITTED,
        actionBy: userId,
        previousStatus: ExpenseStatus.DRAFT,
        newStatus: ExpenseStatus.SUBMITTED,
      },
    });

    return updated;
  }

  /**
   * Approve expense
   */
  async approve(id: string, userId: string, approveDto: ApproveExpenseDto) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found: ${id}`);
    }

    if (expense.status !== ExpenseStatus.SUBMITTED) {
      throw new BadRequestException("Only SUBMITTED expenses can be approved");
    }

    // FIX 3 (CRITICAL): Post the GL journal BEFORE writing APPROVED so that a
    // journal failure leaves the expense still SUBMITTED (no silent GL corruption).
    // If createExpenseJournalEntry or postJournalEntry throws, the error propagates
    // to the caller and the expense status is never changed.
    const journalEntry = await this.journalService.createExpenseJournalEntry(
      expense.id,
      expense.expenseNumber,
      expense.category.accountCode,
      Number(expense.totalAmount),
      "APPROVED",
      userId,
    );

    // Post journal entry immediately — throws on failure (still SUBMITTED at this point)
    await this.journalService.postJournalEntry(journalEntry.id, userId);

    // Journal posted successfully — now write APPROVED + link the journal.
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: userId,
        journalEntryId: journalEntry.id,
      },
    });

    // Create approval history
    await this.prisma.expenseApprovalHistory.create({
      data: {
        expenseId: id,
        action: ExpenseApprovalAction.APPROVED,
        actionBy: userId,
        previousStatus: ExpenseStatus.SUBMITTED,
        newStatus: ExpenseStatus.APPROVED,
        comments: approveDto.comments,
        commentsId: approveDto.commentsId,
        commentsEn: approveDto.commentsEn,
      },
    });

    return updated;
  }

  /**
   * Reject expense
   */
  async reject(id: string, userId: string, rejectDto: RejectExpenseDto) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException(`Expense not found: ${id}`);
    }

    if (expense.status !== ExpenseStatus.SUBMITTED) {
      throw new BadRequestException("Only SUBMITTED expenses can be rejected");
    }

    // Update expense
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
      },
    });

    // Create approval history
    await this.prisma.expenseApprovalHistory.create({
      data: {
        expenseId: id,
        action: ExpenseApprovalAction.REJECTED,
        actionBy: userId,
        previousStatus: ExpenseStatus.SUBMITTED,
        newStatus: ExpenseStatus.REJECTED,
        comments: rejectDto.comments,
        commentsId: rejectDto.commentsId,
      },
    });

    return updated;
  }

  /**
   * Mark expense as paid
   */
  async markPaid(id: string, userId: string, markPaidDto: MarkPaidDto) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found: ${id}`);
    }

    if (expense.status !== ExpenseStatus.APPROVED) {
      throw new BadRequestException(
        "Only APPROVED expenses can be marked as paid",
      );
    }

    // FIX 2a: Idempotency guard — if the payment journal was already created
    // (e.g. prior call that timed out before returning), skip journal creation
    // entirely so we never double-post.
    if (expense.paymentJournalId) {
      this.logger.log(
        `[MARK_PAID] Expense ${id} already has paymentJournalId=${expense.paymentJournalId}; ` +
          `skipping journal creation to avoid double-post.`,
      );
    } else {
      // FIX 2b: Atomic status claim — only proceed if still APPROVED,
      // preventing two concurrent markPaid calls from both posting a journal.
      const claimed = await this.prisma.expense.updateMany({
        where: { id, status: ExpenseStatus.APPROVED, paymentJournalId: null },
        data: { status: ExpenseStatus.PAID },
      });

      if (claimed.count === 0) {
        // Another concurrent call won the race; re-read and return current state.
        const current = await this.prisma.expense.findUnique({ where: { id } });
        if (current) return current;
        throw new NotFoundException(`Expense not found: ${id}`);
      }

      // FIX 2 (CRITICAL): Create the payment journal entry and post it.
      // If journal creation or posting fails, roll back the PAID status claim
      // (reset to APPROVED) and rethrow — preventing an expense from being
      // left PAID-without-GL-entry (silent GL corruption).
      let journalEntryId: string;
      try {
        const journalEntry =
          await this.journalService.createExpenseJournalEntry(
            expense.id,
            expense.expenseNumber,
            expense.category.accountCode,
            Number(expense.totalAmount),
            "PAID",
            userId,
          );

        // Post journal entry immediately
        await this.journalService.postJournalEntry(journalEntry.id, userId);
        journalEntryId = journalEntry.id;
      } catch (error) {
        this.logger.error(
          "Failed to create/post payment journal entry for expense — rolling back PAID claim:",
          error,
        );
        // Roll back: return the expense to APPROVED so the caller can retry.
        await this.prisma.expense.update({
          where: { id },
          data: { status: ExpenseStatus.APPROVED },
        });
        throw error; // propagate — expense is NOT left PAID without a journal
      }

      // Link the journal entry and persist the payment fields atomically.
      const updated = await this.prisma.expense.update({
        where: { id },
        data: {
          paymentJournalId: journalEntryId,
          paymentStatus: ExpensePaymentStatus.PAID,
          paidAt: markPaidDto.paymentDate,
          paymentMethod: markPaidDto.paymentMethod,
          paymentReference: markPaidDto.paymentReference,
        },
      });

      // Create approval history
      await this.prisma.expenseApprovalHistory.create({
        data: {
          expenseId: id,
          action: ExpenseApprovalAction.PAYMENT_COMPLETED,
          actionBy: userId,
          previousStatus: ExpenseStatus.APPROVED,
          newStatus: ExpenseStatus.PAID,
          comments: markPaidDto.notes,
        },
      });

      return updated;
    }

    // Idempotent path: paymentJournalId already exists — update remaining fields only.
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.PAID,
        paymentStatus: ExpensePaymentStatus.PAID,
        paidAt: markPaidDto.paymentDate,
        paymentMethod: markPaidDto.paymentMethod,
        paymentReference: markPaidDto.paymentReference,
      },
    });

    // Create approval history
    await this.prisma.expenseApprovalHistory.create({
      data: {
        expenseId: id,
        action: ExpenseApprovalAction.PAYMENT_COMPLETED,
        actionBy: userId,
        previousStatus: ExpenseStatus.APPROVED,
        newStatus: ExpenseStatus.PAID,
        comments: markPaidDto.notes,
      },
    });

    return updated;
  }

  /**
   * Record the client's reimbursement of a billable (pass-through) expense.
   *
   * Pass-through model: a billable expense was paid on the client's behalf at
   * create time as an ASSET, NOT an expense (Dr 1-2040 Piutang Lain-lain / Cr
   * Cash). This collection step clears that receivable when the client pays us
   * back — never touching the P&L (no revenue, no expense):
   *
   *   Dr Cash/Bank                          (billable amount)
   *       Cr 1-2040  Piutang Lain-lain      (clear the receivable)
   *
   * Idempotent guard via reimbursedAt.
   */
  async recoverBillableExpense(
    id: string,
    userId: string,
    opts?: { paymentSource?: "CASH" | "BANK" },
  ) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException(`Expense not found: ${id}`);
    }

    if (!expense.isBillable) {
      throw new BadRequestException(
        "Hanya biaya billable yang bisa di-reimburse (expense is not billable)",
      );
    }

    if (expense.reimbursedAt) {
      throw new BadRequestException(
        "Biaya ini sudah di-reimburse (already reimbursed)",
      );
    }

    const amount = Number(expense.billableAmount ?? expense.totalAmount);
    const cashAccount = accountForSource(opts?.paymentSource ?? "CASH");

    // DEFERRED POSTING: the advance (DR 1-2040 / CR Kas) is NOT booked at record
    // time. If this billable is being recovered directly (without going through a
    // supplementary invoice), the receivable was never put into 1-2040 — so post
    // the advance leg first, otherwise the CR 1-2040 below would drive the account
    // negative. paymentJournalId stamps it as posted (idempotent: skipped if set,
    // e.g. when an invoice already SENT it).
    if (!expense.paymentJournalId) {
      const advance = await this.journalService.createJournalEntry({
        description: `Reimburse advanced (dibayar atas nama klien) - ${expense.expenseNumber}`,
        entryDate: expense.expenseDate ?? new Date(),
        transactionId: expense.expenseNumber,
        transactionType: "EXPENSE_REIMBURSEMENT",
        createdBy: userId,
        autoPost: true,
        lineItems: [
          {
            accountCode: "1-2040", // DR Piutang Lain-lain (advance becomes receivable)
            debit: amount,
            credit: 0,
            description: `Piutang reimburse - ${expense.vendorName}`,
            projectId: expense.projectId ?? undefined,
            clientId: expense.clientId ?? undefined,
          },
          {
            accountCode: "1-1010", // CR Kas (cash advanced on client's behalf)
            debit: 0,
            credit: amount,
            description: `Pembayaran atas nama klien - ${expense.vendorName}`,
            projectId: expense.projectId ?? undefined,
            clientId: expense.clientId ?? undefined,
          },
        ],
      });
      await this.prisma.expense.update({
        where: { id },
        data: { paymentJournalId: advance.id },
      });
    }

    const journal = await this.journalService.createJournalEntry({
      description: `Penerimaan reimburse dari klien - ${expense.expenseNumber}`,
      entryDate: new Date(),
      transactionId: expense.expenseNumber,
      transactionType: "EXPENSE_REIMBURSEMENT",
      createdBy: userId,
      autoPost: true,
      lineItems: [
        {
          accountCode: cashAccount, // DR Cash/Bank (we receive the reimbursement)
          debit: amount,
          credit: 0,
          description: `Penerimaan reimburse ${expense.expenseNumber}`,
          projectId: expense.projectId ?? undefined,
          clientId: expense.clientId ?? undefined,
        },
        {
          accountCode: "1-2040", // CR Piutang Lain-lain (clear the receivable)
          debit: 0,
          credit: amount,
          description: `Pelunasan piutang reimburse ${expense.expenseNumber}`,
          projectId: expense.projectId ?? undefined,
          clientId: expense.clientId ?? undefined,
        },
      ],
    });

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        reimbursedAt: new Date(),
        reimbursementJournalId: journal.id,
        updatedBy: userId,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, number: true, description: true } },
        client: { select: { id: true, name: true } },
      },
    });

    this.logger.log(
      `✅ [REIMBURSE] Recovered billable expense ${expense.expenseNumber} ` +
        `(amount ${amount}) → journal ${journal.id}`,
    );

    return updated;
  }

  /**
   * Get expense categories
   */
  async getCategories(onlyActive = true) {
    return this.prisma.expenseCategory.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ expenseClass: "asc" }, { accountCode: "asc" }],
    });
  }

  /**
   * Get single expense category by ID
   */
  async getCategory(id: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Expense category not found: ${id}`);
    }

    return category;
  }

  /**
   * Create expense category
   *
   * @deprecated Manual expense category creation is no longer supported.
   * Categories are automatically created when EXPENSE type accounts are added
   * in Bagan Akun (Chart of Accounts).
   *
   * This method now throws an error to prevent manual creation.
   * Internal auto-creation is handled by journal.service.ts directly via Prisma.
   */
  async createCategory(data: any) {
    throw new BadRequestException(
      "Manual expense category creation is no longer supported. " +
        "To add a new expense category:\n" +
        "1. Go to Bagan Akun (Chart of Accounts)\n" +
        "2. Click 'Tambah Akun Baru' (Add New Account)\n" +
        "3. Select Account Type: 'EXPENSE' (Beban)\n" +
        "4. Fill in the account details\n" +
        "5. The expense category will be created automatically!\n\n" +
        "The category will appear in expense dropdowns immediately with sensible defaults " +
        "(PPN 12%, no withholding tax, not billable).",
    );
  }

  /**
   * Update expense category
   *
   * @deprecated Manual expense category updates are no longer supported.
   * Categories are automatically synced when you update the corresponding
   * Chart of Accounts entry.
   *
   * To modify category details:
   * - Go to Bagan Akun (Chart of Accounts)
   * - Edit the EXPENSE account
   * - Changes to name, description, and status will auto-sync to the category
   */
  async updateCategory(id: string, data: any) {
    throw new BadRequestException(
      "Manual expense category updates are no longer supported. " +
        "To modify an expense category:\n" +
        "1. Go to Bagan Akun (Chart of Accounts)\n" +
        "2. Find the EXPENSE account with this category\n" +
        "3. Click Edit\n" +
        "4. Make your changes (name, description, status)\n" +
        "5. Changes will automatically sync to the expense category!\n\n" +
        "Note: Business rule fields (PPN rate, withholding tax, billable status) " +
        "are set to sensible defaults and cannot be changed via UI currently.",
    );
  }

  /**
   * Delete expense category
   *
   * @deprecated Manual expense category deletion is no longer supported.
   * Categories are automatically deleted when you delete the corresponding
   * Chart of Accounts entry.
   *
   * To remove a category:
   * - Go to Bagan Akun (Chart of Accounts)
   * - Delete the EXPENSE account
   * - The category will be automatically deleted (if not used by expenses)
   */
  async deleteCategory(id: string) {
    throw new BadRequestException(
      "Manual expense category deletion is no longer supported. " +
        "To remove an expense category:\n" +
        "1. Go to Bagan Akun (Chart of Accounts)\n" +
        "2. Find the EXPENSE account for this category\n" +
        "3. Click Delete\n" +
        "4. The expense category will be automatically deleted!\n\n" +
        "Note: Deletion will fail if the category is used by any expenses. " +
        "In that case, deactivate the account instead by toggling its status.",
    );
  }

  /**
   * INTERNAL USE ONLY: Check if category is used by expenses
   * Helper method for cascade delete validation
   */
  private async isCategoryUsed(id: string): Promise<boolean> {
    const expenseCount = await this.prisma.expense.count({
      where: { categoryId: id },
    });

    return expenseCount > 0;
  }

  /**
   * DEPRECATED: Old delete logic - keeping for reference
   */
  private async oldDeleteCategory(id: string) {
    // Check if category exists
    await this.getCategory(id);

    // Check if category is used by any expenses
    const expenseCount = await this.prisma.expense.count({
      where: { categoryId: id },
    });

    if (expenseCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${expenseCount} expense(s) are using this category`,
      );
    }

    await this.prisma.expenseCategory.delete({
      where: { id },
    });

    return { message: "Category deleted successfully" };
  }

  /**
   * Get expense statistics
   */
  async getStatistics(
    userId: string,
    userRole: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      projectId?: string;
      clientId?: string;
    },
  ) {
    const where: any = {};

    // Role-based filtering
    if (!isAdminRole(userRole)) {
      where.userId = userId;
    }

    // Apply filters
    if (filters?.startDate || filters?.endDate) {
      where.expenseDate = {};
      if (filters.startDate) where.expenseDate.gte = filters.startDate;
      if (filters.endDate) where.expenseDate.lte = filters.endDate;
    }
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.clientId) where.clientId = filters.clientId;

    const [
      totalExpenses,
      totalAmount,
      totalPPN,
      totalWithholding,
      byStatus,
      byClass,
      byPaymentStatus,
    ] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where,
        _sum: { ppnAmount: true },
      }),
      this.prisma.expense.aggregate({
        where,
        _sum: { withholdingAmount: true },
      }),
      this.prisma.expense.groupBy({
        by: ["status"],
        where,
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.groupBy({
        by: ["expenseClass"],
        where,
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.groupBy({
        by: ["paymentStatus"],
        where,
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    const totalAmountValue = totalAmount._sum.totalAmount
      ? Number(totalAmount._sum.totalAmount)
      : 0;
    const totalPPNValue = totalPPN._sum.ppnAmount
      ? Number(totalPPN._sum.ppnAmount)
      : 0;
    const totalWithholdingValue = totalWithholding._sum.withholdingAmount
      ? Number(totalWithholding._sum.withholdingAmount)
      : 0;

    return {
      totalExpenses,
      totalAmount: totalAmountValue,
      totalPPN: totalPPNValue,
      totalWithholding: totalWithholdingValue,
      netPayable: totalAmountValue - totalWithholdingValue,
      byStatus,
      byClass,
      byPaymentStatus,
    };
  }

  /**
   * Generate unique expense number
   * Format: EXP-YYYY-NNNNN
   */
  private async generateExpenseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const lastExpense = await this.prisma.expense.findFirst({
      where: { expenseNumber: { startsWith: prefix } },
      orderBy: { expenseNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastExpense) {
      const lastNumber = parseInt(lastExpense.expenseNumber.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Generate unique Bukti Pengeluaran number
   * Format: BKK-YYYY-NNNNN
   */
  private async generateBuktiPengeluaranNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BKK-${year}-`;

    const lastExpense = await this.prisma.expense.findFirst({
      where: { buktiPengeluaranNumber: { startsWith: prefix } },
      orderBy: { buktiPengeluaranNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastExpense) {
      const lastNumber = parseInt(
        lastExpense.buktiPengeluaranNumber.split("-")[2],
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Validate Indonesian tax calculations
   */
  private validateIndonesianTaxCalculations(data: CreateExpenseDto | any) {
    // Debug logging
    this.logger.log("[EXPENSE_VALIDATION] Received data:", {
      grossAmount: data.grossAmount,
      ppnAmount: data.ppnAmount,
      withholdingAmount: data.withholdingAmount,
      totalAmount: data.totalAmount,
      netAmount: data.netAmount,
      withholdingTaxType: data.withholdingTaxType,
      isLuxuryGoods: data.isLuxuryGoods,
    });

    // Only validate PPN if ppnAmount is provided (PPN is optional)
    if (data.ppnAmount !== undefined && data.ppnAmount > 0) {
      const isPPNValid = this.ppnCalculator.validatePPNCalculation(
        data.grossAmount,
        data.ppnAmount,
        data.isLuxuryGoods,
      );

      if (!isPPNValid) {
        this.logger.error("[EXPENSE_VALIDATION] PPN validation failed");
        throw new BadRequestException("Invalid PPN calculation");
      }
    }

    // Validate withholding tax if applicable
    if (data.withholdingTaxType && data.withholdingTaxType !== "NONE") {
      const isWithholdingValid =
        this.withholdingTaxCalculator.validateWithholdingCalculation(
          data.grossAmount,
          data.withholdingAmount || 0,
          data.withholdingTaxType,
          data.withholdingTaxRate,
        );

      if (!isWithholdingValid) {
        this.logger.error(
          "[EXPENSE_VALIDATION] Withholding tax validation failed",
        );
        throw new BadRequestException("Invalid withholding tax calculation");
      }
    }

    // Validate total amount (gross + optional PPN)
    const ppnAmount = data.ppnAmount || 0;
    const expectedTotal = data.grossAmount + ppnAmount;
    const totalDiff = Math.abs(expectedTotal - data.totalAmount);

    this.logger.log("[EXPENSE_VALIDATION] Total amount check:", {
      expectedTotal,
      actualTotal: data.totalAmount,
      difference: totalDiff,
      tolerance: 0.01,
      valid: totalDiff <= 0.01,
    });

    if (totalDiff > 0.01) {
      this.logger.error("[EXPENSE_VALIDATION] Total amount validation failed", {
        expectedTotal,
        actualTotal: data.totalAmount,
        difference: totalDiff,
      });
      throw new BadRequestException(
        `Invalid total amount (gross + PPN ≠ total). Expected: ${expectedTotal}, Got: ${data.totalAmount}, Diff: ${totalDiff}`,
      );
    }

    // Validate net amount (total - withholding)
    const expectedNet = expectedTotal - (data.withholdingAmount || 0);
    const netDiff = Math.abs(expectedNet - data.netAmount);

    this.logger.log("[EXPENSE_VALIDATION] Net amount check:", {
      expectedNet,
      actualNet: data.netAmount,
      difference: netDiff,
      tolerance: 0.01,
      valid: netDiff <= 0.01,
    });

    if (netDiff > 0.01) {
      this.logger.error("[EXPENSE_VALIDATION] Net amount validation failed", {
        expectedNet,
        actualNet: data.netAmount,
        difference: netDiff,
      });
      throw new BadRequestException(
        `Invalid net amount calculation. Expected: ${expectedNet}, Got: ${data.netAmount}, Diff: ${netDiff}`,
      );
    }
  }
}
