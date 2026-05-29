import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { SalariesService } from "./salaries.service";
import {
  CreateStaffDto,
  UpdateStaffDto,
  CreateSalaryPaymentDto,
  UpdateSalaryPaymentDto,
} from "./dto";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { SalaryPaymentStatus } from "@prisma/client";

@ApiTags("salaries")
@ApiBearerAuth()
@RequireAdmin()
@Controller("salaries")
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  // ============================================================================
  // STATS
  // ============================================================================

  @Get("stats")
  @ApiOperation({ summary: "Get salary statistics" })
  @ApiResponse({ status: 200, description: "Stats retrieved" })
  async getStats() {
    return this.salariesService.getStats();
  }

  // ============================================================================
  // STAFF
  // ============================================================================

  @Post("staff")
  @ApiOperation({ summary: "Create a new staff member" })
  @ApiResponse({ status: 201, description: "Staff created" })
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.salariesService.createStaff(dto);
  }

  @Get("staff")
  @ApiOperation({ summary: "List all staff" })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    type: Boolean,
    description: "Include inactive staff",
  })
  @ApiResponse({ status: 200, description: "Staff list" })
  async findAllStaff(
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.salariesService.findAllStaff(includeInactive === "true");
  }

  @Get("staff/:id")
  @ApiOperation({ summary: "Get staff by ID" })
  @ApiParam({ name: "id", description: "Staff ID" })
  @ApiResponse({ status: 200, description: "Staff found" })
  @ApiResponse({ status: 404, description: "Staff not found" })
  async findOneStaff(@Param("id") id: string) {
    return this.salariesService.findOneStaff(id);
  }

  @Patch("staff/:id")
  @ApiOperation({ summary: "Update staff member" })
  @ApiParam({ name: "id", description: "Staff ID" })
  @ApiResponse({ status: 200, description: "Staff updated" })
  @ApiResponse({ status: 404, description: "Staff not found" })
  async updateStaff(
    @Param("id") id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.salariesService.updateStaff(id, dto);
  }

  @Delete("staff/:id")
  @ApiOperation({ summary: "Deactivate staff member" })
  @ApiParam({ name: "id", description: "Staff ID" })
  @ApiResponse({ status: 200, description: "Staff deactivated" })
  @ApiResponse({ status: 404, description: "Staff not found" })
  async removeStaff(@Param("id") id: string) {
    return this.salariesService.removeStaff(id);
  }

  // ============================================================================
  // SALARY PAYMENTS
  // ============================================================================

  @Post("payments")
  @ApiOperation({ summary: "Create salary payment" })
  @ApiResponse({ status: 201, description: "Payment created" })
  @ApiResponse({
    status: 409,
    description: "Duplicate payment for same staff/month/year",
  })
  async createPayment(@Body() dto: CreateSalaryPaymentDto) {
    return this.salariesService.createPayment(dto);
  }

  @Get("payments")
  @ApiOperation({ summary: "List salary payments" })
  @ApiQuery({ name: "staffId", required: false })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "month", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: SalaryPaymentStatus })
  @ApiResponse({ status: 200, description: "Payments list" })
  async findAllPayments(
    @Query("staffId") staffId?: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
    @Query("status") status?: SalaryPaymentStatus,
  ) {
    return this.salariesService.findAllPayments(
      staffId,
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
      status,
    );
  }

  @Get("payments/:id")
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Payment found" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async findOnePayment(@Param("id") id: string) {
    return this.salariesService.findOnePayment(id);
  }

  @Patch("payments/:id")
  @ApiOperation({ summary: "Update salary payment" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Payment updated" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async updatePayment(
    @Param("id") id: string,
    @Body() dto: UpdateSalaryPaymentDto,
  ) {
    return this.salariesService.updatePayment(id, dto);
  }

  @Post("payments/:id/mark-paid")
  @ApiOperation({ summary: "Mark payment as PAID" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Payment marked as PAID" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async markPaid(@Param("id") id: string) {
    return this.salariesService.markPaymentPaid(id);
  }

  @Delete("payments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete salary payment" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 204, description: "Payment deleted" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async removePayment(@Param("id") id: string) {
    return this.salariesService.removePayment(id);
  }
}
