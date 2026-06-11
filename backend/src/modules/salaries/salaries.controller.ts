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
  Request,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
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
import { PdfService } from "../pdf/pdf.service";

@ApiTags("salaries")
@ApiBearerAuth()
@RequireAdmin()
@Controller("salaries")
export class SalariesController {
  constructor(
    private readonly salariesService: SalariesService,
    private readonly pdfService: PdfService,
  ) {}

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
  async createPayment(
    @Body() dto: CreateSalaryPaymentDto,
    @Request() req: any,
  ) {
    return this.salariesService.createPayment(
      dto,
      req.user?.userId ?? "system",
    );
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
  async markPaid(
    @Param("id") id: string,
    @Request() req: any,
    @Body() body?: { paidAt?: string; paymentMethod?: string; notes?: string },
  ) {
    return this.salariesService.markPaymentPaid(
      id,
      req.user?.userId ?? "system",
      body,
    );
  }

  @Post("payments/bulk-generate")
  @ApiOperation({ summary: "Generate DRAFT payroll for all active staff for a month" })
  @ApiResponse({ status: 201, description: "Payroll drafts generated" })
  async bulkGeneratePayroll(@Body() body: { year: number; month: number }) {
    return this.salariesService.bulkGeneratePayroll(
      Number(body?.year),
      Number(body?.month),
    );
  }

  @Get("payments/:id/payslip")
  @ApiOperation({ summary: "Download a salary payslip PDF" })
  @ApiParam({ name: "id", description: "Payment ID" })
  async payslip(@Param("id") id: string, @Res() res: Response) {
    const payment = await this.salariesService.findOnePayment(id);
    const pdf = await this.pdfService.generatePayslipPDF(payment);
    const staffName = ((payment as any).staff?.name ?? "staff").replace(/[^a-zA-Z0-9]+/g, "-");
    const period = ((payment as any).period ?? "").replace(/[^a-zA-Z0-9]+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Payslip-${staffName}-${period}.pdf"`,
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  }

  @Delete("payments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete salary payment" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 204, description: "Payment deleted" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async removePayment(@Param("id") id: string, @Request() req: any) {
    return this.salariesService.removePayment(id, req.user?.userId ?? "system");
  }
}
