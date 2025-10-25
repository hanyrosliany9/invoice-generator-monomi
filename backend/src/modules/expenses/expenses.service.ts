import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PPNCalculatorService } from "./services/ppn-calculator.service";
import { WithholdingTaxCalculatorService } from "./services/withholding-tax-calculator.service";
import { EFakturValidatorService } from "./services/efaktur-validator.service";
import { JournalService } from "../accounting/services/journal.service";
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

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private ppnCalculator: PPNCalculatorService,
    private withholdingTaxCalculator: WithholdingTaxCalculatorService,
    private eFakturValidator: EFakturValidatorService,
    private journalService: JournalService,
  ) {}

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

    // Create expense with defaults for optional PPN fields
    // Automatically set status to PAID and create payment journal entry
    const expense = await this.prisma.expense.create({
      data: {
        ...createExpenseDto,
        ppnAmount: createExpenseDto.ppnAmount ?? 0,
        ppnRate: createExpenseDto.ppnRate ?? 0,
        ppnCategory: createExpenseDto.ppnCategory || 'NON_CREDITABLE',
        expenseNumber,
        buktiPengeluaranNumber,
        userId,
        status: ExpenseStatus.PAID, // Automatically PAID
        paymentStatus: ExpensePaymentStatus.PAID, // Automatically PAID
        paidAt: new Date(), // Set payment timestamp
        paymentMethod: 'Automatic', // System-generated payment
        createdBy: userId,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, number: true, description: true } },
        client: { select: { id: true, name: true } },
      },
    });

    // Create payment journal entry to reduce cash
    try {
      const paymentJournal = await this.journalService.createJournalEntry({
        description: `Pembayaran Expense - ${expense.expenseNumber}`,
        entryDate: new Date(createExpenseDto.expenseDate),
        transactionId: expense.expenseNumber,
        transactionType: 'EXPENSE_PAID',
        createdBy: userId,
        lineItems: [
          {
            accountCode: category.accountCode, // Debit expense account
            debit: Number(createExpenseDto.totalAmount),
            credit: 0,
            description: `${expense.description} - ${expense.vendorName}`,
          },
          {
            accountCode: '1-1010', // Default cash account (adjust as needed)
            debit: 0,
            credit: Number(createExpenseDto.totalAmount), // Reduce cash
            description: `Pembayaran untuk ${expense.vendorName}`,
          },
        ],
      });

      // Link journal entry to expense
      await this.prisma.expense.update({
        where: { id: expense.id },
        data: { paymentJournalId: paymentJournal.id },
      });
    } catch (error) {
      console.error('Error creating payment journal entry:', error);
      // Continue even if journal entry creation fails - expense was still created
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
      sortBy = "expenseDate",
      sortOrder = "desc",
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Role-based filtering: regular users see only their expenses
    if (userRole !== "ADMIN") {
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
    if (filters.userId && userRole === "ADMIN") where.userId = filters.userId;
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
    if (userRole !== "ADMIN" && expense.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to view this expense",
      );
    }

    return expense;
  }

  /**
   * Update an expense (can edit any status for corrections)
   */
  async update(
    id: string,
    userId: string,
    userRole: string,
    updateExpenseDto: UpdateExpenseDto,
  ) {
    const expense = await this.findOne(id, userId, userRole);

    // Allow updates to any expense for corrections (including PAID expenses)

    // Check ownership
    if (userRole !== "ADMIN" && expense.userId !== userId) {
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

    // If amounts changed and expense is PAID with a journal entry, update the journal
    if (amountsChanged && expense.paymentJournalId) {
      try {
        const amountDifference =
          Number(updateExpenseDto.totalAmount || expense.totalAmount) -
          Number(expense.totalAmount);

        if (amountDifference !== 0) {
          // Reverse the old journal entry by creating offsetting entries
          // Then the new amounts will be reflected in the expense record
          console.log(
            `Journal entry would need adjustment for amount difference: ${amountDifference}`,
          );
          // In a full implementation, you would reverse and recreate the journal entry
        }
      } catch (error) {
        console.error("Error updating journal entry for expense:", error);
        // Continue - the expense record was updated successfully
      }
    }

    return updated;
  }

  /**
   * Delete an expense (only in DRAFT status)
   */
  async remove(id: string, userId: string, userRole: string) {
    const expense = await this.findOne(id, userId, userRole);

    // Only allow deletion for DRAFT expenses
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException(
        "Only expenses in DRAFT status can be deleted",
      );
    }

    // Check ownership
    if (userRole !== "ADMIN" && expense.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to delete this expense",
      );
    }

    await this.prisma.expense.delete({ where: { id } });

    return { message: "Expense deleted successfully" };
  }

  /**
   * Submit expense for approval
   */
  async submit(id: string, userId: string, userRole: string) {
    const expense = await this.findOne(id, userId, userRole);

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT expenses can be submitted for approval",
      );
    }

    if (userRole !== "ADMIN" && expense.userId !== userId) {
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

    // Update expense
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: userId,
      },
    });

    // Create journal entry (Debit Expense, Credit AP)
    try {
      const journalEntry = await this.journalService.createExpenseJournalEntry(
        expense.id,
        expense.expenseNumber,
        expense.category.accountCode,
        Number(expense.totalAmount),
        "APPROVED",
        userId,
      );

      // Post journal entry immediately
      await this.journalService.postJournalEntry(journalEntry.id, userId);

      // Update expense with journal entry ID
      await this.prisma.expense.update({
        where: { id },
        data: { journalEntryId: journalEntry.id },
      });
    } catch (error) {
      console.error("Failed to create journal entry for expense:", error);
      // Continue with approval even if journal entry fails
    }

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

    // Create journal entry for payment (Debit AP, Credit Cash/Bank)
    try {
      const journalEntry = await this.journalService.createExpenseJournalEntry(
        expense.id,
        expense.expenseNumber,
        expense.category.accountCode,
        Number(expense.totalAmount),
        "PAID",
        userId,
      );

      // Post journal entry immediately
      await this.journalService.postJournalEntry(journalEntry.id, userId);

      // Update expense with payment journal entry ID
      await this.prisma.expense.update({
        where: { id },
        data: { paymentJournalId: journalEntry.id },
      });
    } catch (error) {
      console.error(
        "Failed to create payment journal entry for expense:",
        error,
      );
      // Continue with status update even if journal entry fails
    }

    // Update expense
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
   * Get expense categories
   */
  async getCategories() {
    return this.prisma.expenseCategory.findMany({
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
   */
  async createCategory(data: any) {
    // Check if code already exists
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException(
        `Category with code ${data.code} already exists`,
      );
    }

    return this.prisma.expenseCategory.create({
      data: {
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Update expense category
   */
  async updateCategory(id: string, data: any) {
    // Check if category exists
    await this.getCategory(id);

    return this.prisma.expenseCategory.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete expense category
   */
  async deleteCategory(id: string) {
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
    if (userRole !== "ADMIN") {
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
    console.log('[EXPENSE_VALIDATION] Received data:', {
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
        console.error('[EXPENSE_VALIDATION] PPN validation failed');
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
        console.error('[EXPENSE_VALIDATION] Withholding tax validation failed');
        throw new BadRequestException("Invalid withholding tax calculation");
      }
    }

    // Validate total amount (gross + optional PPN)
    const ppnAmount = data.ppnAmount || 0;
    const expectedTotal = data.grossAmount + ppnAmount;
    const totalDiff = Math.abs(expectedTotal - data.totalAmount);

    console.log('[EXPENSE_VALIDATION] Total amount check:', {
      expectedTotal,
      actualTotal: data.totalAmount,
      difference: totalDiff,
      tolerance: 0.01,
      valid: totalDiff <= 0.01,
    });

    if (totalDiff > 0.01) {
      console.error('[EXPENSE_VALIDATION] Total amount validation failed', {
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

    console.log('[EXPENSE_VALIDATION] Net amount check:', {
      expectedNet,
      actualNet: data.netAmount,
      difference: netDiff,
      tolerance: 0.01,
      valid: netDiff <= 0.01,
    });

    if (netDiff > 0.01) {
      console.error('[EXPENSE_VALIDATION] Net amount validation failed', {
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
