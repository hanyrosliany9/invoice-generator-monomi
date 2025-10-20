import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ExpensesService } from "./expenses.service";
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  ApproveExpenseDto,
  RejectExpenseDto,
  MarkPaidDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  RequireSuperAdmin,
  RequireFinancialApprover,
} from "../auth/decorators/auth.decorators";

/**
 * Expenses Controller
 *
 * Handles all expense management operations including:
 * - CRUD operations
 * - Indonesian tax compliance (PPN, PPh, e-Faktur)
 * - Approval workflows (submit, approve, reject)
 * - Payment tracking
 * - Statistics and analytics
 *
 * All endpoints require JWT authentication.
 * Some endpoints require specific roles (ADMIN, FINANCE_MANAGER).
 */
@ApiTags("expenses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Create a new expense
   *
   * Creates a new expense in DRAFT status. The expense will be validated for:
   * - Indonesian tax calculations (PPN 12%, PPh withholding)
   * - e-Faktur format validation (if provided)
   * - PSAK account code compliance
   * - Category, project, and client existence
   *
   * @param req - Request object with authenticated user
   * @param createExpenseDto - Expense creation data
   * @returns Created expense with relations
   */
  @Post()
  @ApiOperation({
    summary: "Create a new expense",
    description:
      "Creates a new expense in DRAFT status with Indonesian tax validation",
  })
  @ApiResponse({
    status: 201,
    description: "Expense created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid expense data or tax calculations",
  })
  @ApiResponse({
    status: 404,
    description: "Category, project, or client not found",
  })
  async create(
    @Request() req: any,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    const userId = req.user.id;
    return this.expensesService.create(userId, createExpenseDto);
  }

  /**
   * Get expense categories
   *
   * Returns all available expense categories with PSAK account codes.
   *
   * @returns List of expense categories
   */
  @Get("categories")
  @ApiOperation({
    summary: "Get expense categories",
    description: "Get all expense categories with PSAK account codes",
  })
  @ApiResponse({
    status: 200,
    description: "Categories retrieved successfully",
  })
  async getCategories() {
    return this.expensesService.getCategories();
  }

  /**
   * Create expense category
   *
   * Creates a new expense category with PSAK account code.
   * Requires ADMIN role.
   *
   * @param createCategoryDto - Category creation data
   * @returns Created category
   */
  @Post("categories")
  @RequireSuperAdmin() // Only SUPER_ADMIN can create categories
  @ApiOperation({
    summary: "Create expense category",
    description:
      "Create new expense category with PSAK account code (requires SUPER_ADMIN role)",
  })
  @ApiResponse({
    status: 201,
    description: "Category created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Category code already exists",
  })
  async createCategory(@Body() createCategoryDto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(createCategoryDto);
  }

  /**
   * Get single expense category by ID
   *
   * @param id - Category ID
   * @returns Category details
   */
  @Get("categories/:id")
  @ApiOperation({
    summary: "Get expense category by ID",
    description: "Get detailed expense category information",
  })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({
    status: 200,
    description: "Category retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Category not found",
  })
  async getCategory(@Param("id") id: string) {
    return this.expensesService.getCategory(id);
  }

  /**
   * Update expense category
   *
   * Updates an existing expense category.
   * Requires ADMIN role.
   *
   * @param id - Category ID
   * @param updateCategoryDto - Partial category update data
   * @returns Updated category
   */
  @Patch("categories/:id")
  @RequireSuperAdmin() // Only SUPER_ADMIN can update categories
  @ApiOperation({
    summary: "Update expense category",
    description: "Update expense category (requires SUPER_ADMIN role)",
  })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({
    status: 200,
    description: "Category updated successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Category not found",
  })
  async updateCategory(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(id, updateCategoryDto);
  }

  /**
   * Delete expense category
   *
   * Deletes an expense category if it's not used by any expenses.
   * Requires ADMIN role.
   *
   * @param id - Category ID
   * @returns Success message
   */
  @Delete("categories/:id")
  @RequireSuperAdmin() // Only SUPER_ADMIN can delete categories
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete expense category",
    description:
      "Delete expense category (requires SUPER_ADMIN role, only if not used)",
  })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({
    status: 204,
    description: "Category deleted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot delete category that is in use",
  })
  @ApiResponse({
    status: 404,
    description: "Category not found",
  })
  async deleteCategory(@Param("id") id: string) {
    return this.expensesService.deleteCategory(id);
  }

  /**
   * Get all expenses with filtering and pagination
   *
   * Returns expenses based on user role:
   * - Regular users: Only their own expenses
   * - Admins/Finance Managers: All expenses
   *
   * Supports comprehensive filtering by:
   * - Status, payment status, expense class
   * - Category, project, client
   * - Date range, amount range
   * - Account code, PPN category
   * - Full-text search (description, vendor, NSFP, account code)
   *
   * @param req - Request object with authenticated user
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated expense list with metadata
   */
  @Get()
  @ApiOperation({
    summary: "Get all expenses",
    description:
      "Get paginated list of expenses with filtering (role-based access)",
  })
  @ApiResponse({
    status: 200,
    description: "Expenses retrieved successfully",
  })
  async findAll(@Request() req: any, @Query() query: ExpenseQueryDto) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.findAll(userId, query, userRole);
  }

  /**
   * Get expense statistics
   *
   * Returns aggregated statistics including:
   * - Total expenses and amounts
   * - Total PPN and withholding tax
   * - Net payable amount
   * - Breakdown by status (DRAFT, SUBMITTED, APPROVED, etc.)
   * - Breakdown by expense class (SELLING, GENERAL_ADMIN, OTHER)
   * - Breakdown by payment status (UNPAID, PARTIALLY_PAID, PAID)
   *
   * Supports filtering by date range, category, project, client.
   *
   * @param req - Request object with authenticated user
   * @param categoryId - Optional category filter
   * @param projectId - Optional project filter
   * @param clientId - Optional client filter
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Expense statistics
   */
  @Get("statistics")
  @ApiOperation({
    summary: "Get expense statistics",
    description: "Get aggregated expense statistics with optional filters",
  })
  @ApiQuery({
    name: "categoryId",
    required: false,
    description: "Filter by category ID",
  })
  @ApiQuery({
    name: "projectId",
    required: false,
    description: "Filter by project ID",
  })
  @ApiQuery({
    name: "clientId",
    required: false,
    description: "Filter by client ID",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "Start date (ISO 8601)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "End date (ISO 8601)",
  })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  async getStatistics(
    @Request() req: any,
    @Query("categoryId") categoryId?: string,
    @Query("projectId") projectId?: string,
    @Query("clientId") clientId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;

    const filters: any = {};
    if (categoryId) filters.categoryId = categoryId;
    if (projectId) filters.projectId = projectId;
    if (clientId) filters.clientId = clientId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.expensesService.getStatistics(userId, userRole, filters);
  }

  /**
   * Get a single expense by ID
   *
   * Returns detailed expense information with all relations:
   * - Category with account code details
   * - User (submitter)
   * - Project (if billable)
   * - Client (if billable)
   * - Approver (if approved)
   * - Approval history
   * - Comments
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @returns Expense with all relations
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get expense by ID",
    description: "Get detailed expense information with all relations",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (not your expense)",
  })
  async findOne(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.findOne(id, userId, userRole);
  }

  /**
   * Update an expense
   *
   * Only DRAFT expenses can be updated.
   * Updates will re-validate Indonesian tax calculations.
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @param updateExpenseDto - Partial expense update data
   * @returns Updated expense
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update expense",
    description:
      "Update expense (DRAFT status only, re-validates tax calculations)",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot update non-DRAFT expense or invalid tax calculations",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (not your expense)",
  })
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.update(id, userId, userRole, updateExpenseDto);
  }

  /**
   * Delete an expense
   *
   * Only DRAFT expenses can be deleted.
   * This is a soft delete (archives the expense).
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @returns Success message
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete expense",
    description: "Delete expense (DRAFT status only, soft delete)",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 204,
    description: "Expense deleted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot delete non-DRAFT expense",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (not your expense)",
  })
  async remove(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.remove(id, userId, userRole);
  }

  /**
   * Submit expense for approval
   *
   * Changes status from DRAFT to SUBMITTED.
   * Creates approval history entry.
   *
   * Only the expense owner can submit their own expenses.
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @returns Updated expense
   */
  @Post(":id/submit")
  @ApiOperation({
    summary: "Submit expense for approval",
    description:
      "Change status from DRAFT to SUBMITTED (creates approval history)",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense submitted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot submit non-DRAFT expense",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (not your expense)",
  })
  async submit(@Request() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.submit(id, userId, userRole);
  }

  /**
   * Approve expense
   *
   * Changes status from SUBMITTED to APPROVED.
   * Records approver and approval date.
   * Creates approval history entry.
   *
   * Requires ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @param approveExpenseDto - Optional approval comments
   * @returns Updated expense
   */
  @Post(":id/approve")
  @RequireFinancialApprover() // Only SUPER_ADMIN or FINANCE_MANAGER can approve expenses
  @ApiOperation({
    summary: "Approve expense",
    description:
      "Change status from SUBMITTED to APPROVED (requires SUPER_ADMIN or FINANCE_MANAGER role)",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense approved successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot approve non-SUBMITTED expense",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (requires ADMIN role)",
  })
  async approve(
    @Request() req: any,
    @Param("id") id: string,
    @Body() approveExpenseDto: ApproveExpenseDto,
  ) {
    const approverId = req.user.id;
    return this.expensesService.approve(id, approverId, approveExpenseDto);
  }

  /**
   * Reject expense
   *
   * Changes status from SUBMITTED to REJECTED.
   * Records rejection reason and approver.
   * Creates approval history entry.
   *
   * Requires ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @param rejectExpenseDto - Rejection reason (required) and comments
   * @returns Updated expense
   */
  @Post(":id/reject")
  @RequireFinancialApprover() // Only SUPER_ADMIN or FINANCE_MANAGER can reject expenses
  @ApiOperation({
    summary: "Reject expense",
    description:
      "Change status from SUBMITTED to REJECTED (requires SUPER_ADMIN or FINANCE_MANAGER role)",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense rejected successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot reject non-SUBMITTED expense",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (requires ADMIN role)",
  })
  async reject(
    @Request() req: any,
    @Param("id") id: string,
    @Body() rejectExpenseDto: RejectExpenseDto,
  ) {
    const approverId = req.user.id;
    return this.expensesService.reject(id, approverId, rejectExpenseDto);
  }

  /**
   * Mark expense as paid
   *
   * Changes payment status to PAID.
   * Records payment date, method, and reference.
   * Only APPROVED expenses can be marked as paid.
   *
   * Requires ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Expense ID
   * @param markPaidDto - Payment details (date, method, reference, notes)
   * @returns Updated expense
   */
  @Post(":id/mark-paid")
  @RequireFinancialApprover() // Only SUPER_ADMIN or FINANCE_MANAGER can mark expenses as paid
  @ApiOperation({
    summary: "Mark expense as paid",
    description:
      "Change payment status to PAID (requires SUPER_ADMIN or FINANCE_MANAGER role)",
  })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense marked as paid successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot mark non-APPROVED expense as paid",
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (requires ADMIN role)",
  })
  async markPaid(
    @Request() req: any,
    @Param("id") id: string,
    @Body() markPaidDto: MarkPaidDto,
  ) {
    const userId = req.user.id;
    return this.expensesService.markPaid(id, userId, markPaidDto);
  }
}
