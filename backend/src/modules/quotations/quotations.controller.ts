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
  ForbiddenException,
} from "@nestjs/common";
import { QuotationsService } from "./quotations.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  RequireAuth,
  RequireFinancialApprover,
  RequireSuperAdmin,
  RequireEditorRole,
  RequireOperationsRole,
} from "../auth/decorators/auth.decorators";
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { QuotationStatus } from "@prisma/client";
import { InvoicesService } from "../invoices/invoices.service";
import { canApproveOwnSubmission } from "../../common/constants/permissions.constants";

@ApiTags("quotations")
@ApiBearerAuth()
@Controller("quotations")
export class QuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post()
  @RequireEditorRole() // All users except VIEWER can create quotations
  @ApiOperation({ summary: "Buat quotation baru" })
  create(@Body() createQuotationDto: CreateQuotationDto, @Request() req: any) {
    return this.quotationsService.create(createQuotationDto, req.user.id);
  }

  @Get()
  @RequireAuth() // All authenticated users can view quotations
  @ApiOperation({ summary: "Dapatkan daftar quotation" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: QuotationStatus })
  @ApiQuery({
    name: "month",
    required: false,
    type: Number,
    description: "Filter by month (1-12)",
  })
  @ApiQuery({
    name: "year",
    required: false,
    type: Number,
    description: "Filter by year",
  })
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: QuotationStatus,
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const monthNum = month ? parseInt(month, 10) : undefined;
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.quotationsService.findAll(
      pageNum,
      limitNum,
      status,
      monthNum,
      yearNum,
    );
  }

  @Get("stats")
  @RequireAuth() // All authenticated users can view stats
  @ApiOperation({ summary: "Dapatkan statistik quotation" })
  getStats() {
    return this.quotationsService.getQuotationStats();
  }

  @Get("recent")
  @RequireAuth() // All authenticated users can view recent quotations
  @ApiOperation({ summary: "Dapatkan quotation terbaru" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  getRecent(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.quotationsService.getRecentQuotations(limitNum);
  }

  @Get(":id")
  @RequireAuth() // All authenticated users can view quotation details
  @ApiOperation({ summary: "Dapatkan detail quotation" })
  findOne(@Param("id") id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(":id")
  @RequireEditorRole() // Only editors can update quotations
  @ApiOperation({ summary: "Update quotation" })
  update(
    @Param("id") id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(id, updateQuotationDto);
  }

  @Patch(":id/status")
  @RequireFinancialApprover() // CRITICAL: Only financial approvers can change status (approve/decline)
  @ApiOperation({ summary: "Update status quotation (approve/decline)" })
  async updateStatus(
    @Param("id") id: string,
    @Body() body: { status: string },
    @Request() req: any,
  ) {
    // Convert lowercase status to uppercase enum
    const normalizedStatus = body.status.toUpperCase() as QuotationStatus;

    // Segregation of duties check: Prevent users from approving their own quotations
    if (
      normalizedStatus === QuotationStatus.APPROVED ||
      normalizedStatus === QuotationStatus.DECLINED
    ) {
      const quotation = await this.quotationsService.findOne(id);

      // Check if user is trying to approve/decline their own quotation
      if (quotation.createdBy === req.user.id) {
        // Only SUPER_ADMIN can approve their own quotations
        if (!canApproveOwnSubmission(req.user.role)) {
          throw new ForbiddenException(
            "You cannot approve or decline your own quotation. This violates segregation of duties. " +
              "Another financial approver must review this quotation.",
          );
        }
      }
    }

    return this.quotationsService.updateStatus(id, normalizedStatus);
  }

  @Post(":id/generate-invoice")
  @RequireOperationsRole() // Operations roles can generate invoices
  @ApiOperation({ summary: "Generate invoice dari quotation yang disetujui" })
  @ApiResponse({
    status: 201,
    description: "Invoice berhasil dibuat dari quotation",
    schema: {
      type: "object",
      properties: {
        invoiceId: { type: "string" },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Quotation belum disetujui atau sudah memiliki invoice",
  })
  @ApiResponse({
    status: 404,
    description: "Quotation tidak ditemukan",
  })
  async generateInvoice(@Param("id") id: string, @Request() req: any) {
    const invoice = await this.invoicesService.createFromQuotation(
      id,
      req.user.id,
    );

    // Check if this is an existing invoice by looking at creation timestamp
    const quotation = await this.quotationsService.findOne(id);
    const existingInvoice = quotation.invoices && quotation.invoices.length > 0;

    return {
      invoiceId: invoice.id,
      message: existingInvoice
        ? "Invoice sudah tersedia untuk quotation ini"
        : "Invoice berhasil dibuat dari quotation",
      isExisting: existingInvoice,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        createdAt: invoice.createdAt,
      },
    };
  }

  @Delete(":id")
  @RequireSuperAdmin() // Only SUPER_ADMIN can delete quotations
  @ApiOperation({ summary: "Hapus quotation (hanya draft)" })
  remove(@Param("id") id: string) {
    return this.quotationsService.remove(id);
  }
}
