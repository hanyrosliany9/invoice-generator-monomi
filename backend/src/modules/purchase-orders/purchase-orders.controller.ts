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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  ApprovePurchaseOrderDto,
  RejectPurchaseOrderDto,
  CancelPurchaseOrderDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  RequireSuperAdmin,
  RequireFinancialApprover,
} from '../auth/decorators/auth.decorators';

/**
 * Purchase Orders Controller
 *
 * Handles purchase order management for purchase-to-pay system:
 * - CRUD operations
 * - Approval workflows (approve, reject, cancel, close)
 * - Budget validation against projects
 * - PO commitment accounting
 * - Multi-line item management
 *
 * All endpoints require JWT authentication.
 * Approval operations require SUPER_ADMIN or FINANCE_MANAGER role.
 */
@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  /**
   * Create a new purchase order
   *
   * Creates a purchase order in DRAFT status with validation:
   * - Vendor existence and active status
   * - Project budget validation (if linked to project)
   * - Line item validation
   * - Amount calculations (subtotal, PPN, PPh, total)
   *
   * @param req - Request object with authenticated user
   * @param createPODto - Purchase order creation data
   * @returns Created purchase order with items
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new purchase order',
    description: 'Create PO in DRAFT status with budget validation and line items',
  })
  @ApiResponse({
    status: 201,
    description: 'Purchase order created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid PO data, budget exceeded, or calculation errors',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor or project not found',
  })
  async create(
    @Request() req: any,
    @Body() createPODto: CreatePurchaseOrderDto,
  ) {
    const userId = req.user.id;
    return this.purchaseOrdersService.create(userId, createPODto);
  }

  /**
   * Get all purchase orders with filtering and pagination
   *
   * Returns purchase orders based on query parameters.
   * Supports filtering by:
   * - Search (PO number, description, vendor name)
   * - Status (DRAFT, APPROVED, PARTIALLY_RECEIVED, etc.)
   * - PO type (GOODS, SERVICES, FIXED_ASSET, PROJECT)
   * - Vendor ID
   * - Project ID
   * - Date range
   *
   * @param req - Request object with authenticated user
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated PO list with metadata
   */
  @Get()
  @ApiOperation({
    summary: 'Get all purchase orders',
    description: 'Get paginated list of purchase orders with filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase orders retrieved successfully',
  })
  async findAll(
    @Request() req: any,
    @Query() query: PurchaseOrderQueryDto,
  ) {
    const userRole = req.user.role;
    return this.purchaseOrdersService.findAll(query, userRole);
  }

  /**
   * Get purchase order statistics
   *
   * Returns aggregated statistics including:
   * - Total POs and amounts
   * - Average PO value
   * - POs by status (DRAFT, APPROVED, etc.)
   * - POs by type (GOODS, SERVICES, etc.)
   *
   * @param vendorId - Optional vendor filter
   * @param projectId - Optional project filter
   * @param status - Optional status filter
   * @returns Purchase order statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get purchase order statistics',
    description: 'Get aggregated PO statistics with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(
    @Query('vendorId') vendorId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    const filters: any = {};
    if (vendorId) filters.vendorId = vendorId;
    if (projectId) filters.projectId = projectId;
    if (status) filters.status = status;

    return this.purchaseOrdersService.getStatistics(filters);
  }

  /**
   * Get a single purchase order by ID
   *
   * Returns detailed PO information with relations:
   * - Vendor details
   * - Project details
   * - Line items with categories
   * - Goods receipts (GRs)
   * - Vendor invoices (VIs)
   * - Journal entry (if commitment recorded)
   * - Created/updated/approved by users
   *
   * @param id - Purchase order ID
   * @returns Purchase order with all relations
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get purchase order by ID',
    description: 'Get detailed PO information with items, GRs, VIs, and accounting',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  async findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  /**
   * Update a purchase order
   *
   * Updates PO information with validation.
   * Only DRAFT purchase orders can be updated.
   *
   * Validates:
   * - PO status is DRAFT
   * - Amount calculations
   * - Line items (if changed)
   *
   * @param req - Request object with authenticated user
   * @param id - Purchase order ID
   * @param updatePODto - Partial PO update data
   * @returns Updated purchase order
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update purchase order',
    description: 'Update PO (DRAFT status only, re-validates calculations)',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update non-DRAFT PO or invalid calculations',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updatePODto: UpdatePurchaseOrderDto,
  ) {
    const userId = req.user.id;
    return this.purchaseOrdersService.update(id, userId, updatePODto);
  }

  /**
   * Delete a purchase order
   *
   * Deletes a PO if in DRAFT status.
   * Only DRAFT purchase orders can be deleted.
   *
   * @param id - Purchase order ID
   * @returns Success message
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete purchase order',
    description: 'Delete PO (DRAFT status only)',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 204,
    description: 'Purchase order deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete non-DRAFT PO',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  async remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(id);
  }

  /**
   * Approve purchase order
   *
   * Changes status from DRAFT to APPROVED.
   * Records approver and approval date.
   * Creates PO commitment journal entry if recordCommitment is true.
   *
   * Requires SUPER_ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Purchase order ID
   * @param approveDto - Optional approval comments
   * @returns Updated purchase order
   */
  @Post(':id/approve')
  @RequireFinancialApprover() // SUPER_ADMIN or FINANCE_MANAGER
  @ApiOperation({
    summary: 'Approve purchase order',
    description: 'Change status from DRAFT to APPROVED (creates commitment journal entry if enabled)',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order approved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot approve non-DRAFT PO',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access forbidden (requires SUPER_ADMIN or FINANCE_MANAGER role)',
  })
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() approveDto: ApprovePurchaseOrderDto,
  ) {
    const userId = req.user.id;
    return this.purchaseOrdersService.approve(id, userId, approveDto);
  }

  /**
   * Reject purchase order
   *
   * Changes status from DRAFT to REJECTED.
   * Records rejection reason.
   *
   * Requires SUPER_ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Purchase order ID
   * @param rejectDto - Rejection reason and comments
   * @returns Updated purchase order
   */
  @Post(':id/reject')
  @RequireFinancialApprover() // SUPER_ADMIN or FINANCE_MANAGER
  @ApiOperation({
    summary: 'Reject purchase order',
    description: 'Change status from DRAFT to REJECTED',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order rejected successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot reject non-DRAFT PO',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access forbidden (requires SUPER_ADMIN or FINANCE_MANAGER role)',
  })
  async reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() rejectDto: RejectPurchaseOrderDto,
  ) {
    const userId = req.user.id;
    return this.purchaseOrdersService.reject(id, userId, rejectDto);
  }

  /**
   * Cancel purchase order
   *
   * Changes status to CANCELLED.
   * Reverses commitment journal entry if exists.
   * Only APPROVED or PARTIALLY_RECEIVED POs can be cancelled.
   * Cannot cancel if goods receipts are posted.
   *
   * Requires SUPER_ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Purchase order ID
   * @param cancelDto - Cancellation reason and comments
   * @returns Updated purchase order
   */
  @Post(':id/cancel')
  @RequireFinancialApprover() // SUPER_ADMIN or FINANCE_MANAGER
  @ApiOperation({
    summary: 'Cancel purchase order',
    description: 'Change status to CANCELLED (reverses commitment, cannot cancel if GRs posted)',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel PO with posted GRs or invalid status',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access forbidden (requires SUPER_ADMIN or FINANCE_MANAGER role)',
  })
  async cancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() cancelDto: CancelPurchaseOrderDto,
  ) {
    const userId = req.user.id;
    return this.purchaseOrdersService.cancel(id, userId, cancelDto);
  }

  /**
   * Close purchase order
   *
   * Force close partially received POs.
   * Changes status to CLOSED.
   * Only APPROVED or PARTIALLY_RECEIVED POs can be closed.
   *
   * Requires SUPER_ADMIN or FINANCE_MANAGER role.
   *
   * @param req - Request object with authenticated user
   * @param id - Purchase order ID
   * @returns Updated purchase order
   */
  @Post(':id/close')
  @RequireFinancialApprover() // SUPER_ADMIN or FINANCE_MANAGER
  @ApiOperation({
    summary: 'Close purchase order',
    description: 'Force close partially received PO (changes status to CLOSED)',
  })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order closed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot close PO with invalid status',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access forbidden (requires SUPER_ADMIN or FINANCE_MANAGER role)',
  })
  async close(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.purchaseOrdersService.close(id, userId);
  }
}
