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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { VendorsService } from "./vendors.service";
import { CreateVendorDto, UpdateVendorDto, VendorQueryDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  RequireSuperAdmin,
  RequireFinancialApprover,
} from "../auth/decorators/auth.decorators";

/**
 * Vendors Controller
 *
 * Handles vendor master data management for purchase-to-pay system:
 * - CRUD operations
 * - Indonesian tax compliance (NPWP validation, PKP status)
 * - Search and filtering
 * - Statistics and analytics
 *
 * All endpoints require JWT authentication.
 * Creation and deletion require SUPER_ADMIN role.
 */
@ApiTags("vendors")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  /**
   * Create a new vendor
   *
   * Creates a new vendor with Indonesian tax compliance validation.
   * Requires SUPER_ADMIN role.
   *
   * Validates:
   * - NPWP format (15 digits) if PKP status
   * - Unique vendor code
   * - Required fields based on vendor type
   *
   * @param req - Request object with authenticated user
   * @param createVendorDto - Vendor creation data
   * @returns Created vendor
   */
  @Post()
  @RequireSuperAdmin() // Only SUPER_ADMIN can create vendors
  @ApiOperation({
    summary: "Create a new vendor",
    description:
      "Create vendor with Indonesian tax compliance validation (requires SUPER_ADMIN role)",
  })
  @ApiResponse({
    status: 201,
    description: "Vendor created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid vendor data or NPWP format",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (requires SUPER_ADMIN role)",
  })
  async create(@Request() req: any, @Body() createVendorDto: CreateVendorDto) {
    const userId = req.user.id;
    return this.vendorsService.create(userId, createVendorDto);
  }

  /**
   * Get all vendors with filtering and pagination
   *
   * Returns vendors based on query parameters.
   * Supports comprehensive filtering by:
   * - Search (name, code, email, phone, NPWP)
   * - Vendor type
   * - PKP status
   * - Category
   * - Active status
   * - Location (city, province)
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated vendor list with metadata
   */
  @Get()
  @ApiOperation({
    summary: "Get all vendors",
    description: "Get paginated list of vendors with filtering",
  })
  @ApiResponse({
    status: 200,
    description: "Vendors retrieved successfully",
  })
  async findAll(@Query() query: VendorQueryDto) {
    return this.vendorsService.findAll(query);
  }

  /**
   * Get vendor statistics
   *
   * Returns aggregated statistics including:
   * - Total vendors (active/inactive)
   * - Vendors by type (GOODS, SERVICES, etc.)
   * - Vendors by PKP status
   * - Vendors with purchase orders
   * - Vendors with invoices
   *
   * @param type - Optional type filter
   * @param pkpStatus - Optional PKP status filter
   * @param isActive - Optional active status filter
   * @returns Vendor statistics
   */
  @Get("statistics")
  @ApiOperation({
    summary: "Get vendor statistics",
    description: "Get aggregated vendor statistics with optional filters",
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Filter by vendor type",
  })
  @ApiQuery({
    name: "pkpStatus",
    required: false,
    description: "Filter by PKP status",
  })
  @ApiQuery({
    name: "isActive",
    required: false,
    description: "Filter by active status",
  })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  async getStatistics(
    @Query("type") type?: string,
    @Query("pkpStatus") pkpStatus?: string,
    @Query("isActive") isActive?: string,
  ) {
    const filters: any = {};
    if (type) filters.type = type;
    if (pkpStatus) filters.pkpStatus = pkpStatus;
    if (isActive !== undefined) filters.isActive = isActive === "true";

    return this.vendorsService.getStatistics(filters);
  }

  /**
   * Get a single vendor by ID
   *
   * Returns detailed vendor information with relations:
   * - Created/updated by user
   * - Recent purchase orders (last 10)
   * - Recent vendor invoices (last 10)
   * - Recent expenses (last 10)
   * - Recent assets (last 10)
   *
   * @param id - Vendor ID
   * @returns Vendor with all relations
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get vendor by ID",
    description: "Get detailed vendor information with relations",
  })
  @ApiParam({ name: "id", description: "Vendor ID" })
  @ApiResponse({
    status: 200,
    description: "Vendor retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Vendor not found",
  })
  async findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  /**
   * Update a vendor
   *
   * Updates vendor information with validation.
   * Requires SUPER_ADMIN or FINANCE_MANAGER role.
   *
   * Validates:
   * - NPWP format if changing to PKP
   * - Required fields based on new vendor type
   *
   * @param req - Request object with authenticated user
   * @param id - Vendor ID
   * @param updateVendorDto - Partial vendor update data
   * @returns Updated vendor
   */
  @Patch(":id")
  @RequireFinancialApprover() // SUPER_ADMIN or FINANCE_MANAGER can update vendors
  @ApiOperation({
    summary: "Update vendor",
    description:
      "Update vendor information (requires SUPER_ADMIN or FINANCE_MANAGER role)",
  })
  @ApiParam({ name: "id", description: "Vendor ID" })
  @ApiResponse({
    status: 200,
    description: "Vendor updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid vendor data or NPWP format",
  })
  @ApiResponse({
    status: 404,
    description: "Vendor not found",
  })
  @ApiResponse({
    status: 403,
    description:
      "Access forbidden (requires SUPER_ADMIN or FINANCE_MANAGER role)",
  })
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const userId = req.user.id;
    return this.vendorsService.update(id, userId, updateVendorDto);
  }

  /**
   * Delete a vendor
   *
   * Deletes a vendor if not used in any transactions.
   * If vendor has related records, prevents deletion.
   * Requires SUPER_ADMIN role.
   *
   * Recommended: Set vendor as inactive instead of deleting.
   *
   * @param id - Vendor ID
   * @returns Success message
   */
  @Delete(":id")
  @RequireSuperAdmin() // Only SUPER_ADMIN can delete vendors
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete vendor",
    description:
      "Delete vendor (requires SUPER_ADMIN role, only if not used in transactions)",
  })
  @ApiParam({ name: "id", description: "Vendor ID" })
  @ApiResponse({
    status: 204,
    description: "Vendor deleted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot delete vendor that has related transactions",
  })
  @ApiResponse({
    status: 404,
    description: "Vendor not found",
  })
  @ApiResponse({
    status: 403,
    description: "Access forbidden (requires SUPER_ADMIN role)",
  })
  async remove(@Param("id") id: string) {
    return this.vendorsService.remove(id);
  }
}
