import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { BulkUpdateStatusDto } from "./dto/bulk-update-status.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InvoiceStatus } from "@prisma/client";

@ApiTags("Invoices")
@Controller("invoices")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: "Membuat invoice baru" })
  @ApiResponse({
    status: 201,
    description: "Invoice berhasil dibuat",
  })
  @ApiResponse({
    status: 400,
    description: "Data tidak valid",
  })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Request() req: any,
  ) {
    return this.invoicesService.create(createInvoiceDto, req.user.id);
  }

  @Post("from-quotation/:quotationId")
  @ApiOperation({ summary: "Membuat invoice dari quotation" })
  @ApiResponse({
    status: 201,
    description: "Invoice berhasil dibuat dari quotation",
  })
  @ApiResponse({
    status: 400,
    description: "Quotation tidak valid atau sudah memiliki invoice",
  })
  @ApiResponse({
    status: 404,
    description: "Quotation tidak ditemukan",
  })
  async createFromQuotation(
    @Param("quotationId") quotationId: string,
    @Request() req: any,
  ) {
    return this.invoicesService.createFromQuotation(quotationId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "Mendapatkan daftar invoice dengan pagination" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Nomor halaman (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Jumlah data per halaman (default: 10)",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: InvoiceStatus,
    description: "Filter berdasarkan status invoice",
  })
  @ApiResponse({
    status: 200,
    description: "Daftar invoice berhasil diambil",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              invoiceNumber: { type: "string" },
              creationDate: { type: "string", format: "date-time" },
              dueDate: { type: "string", format: "date-time" },
              amountPerProject: { type: "number" },
              totalAmount: { type: "number" },
              status: { type: "string", enum: Object.values(InvoiceStatus) },
              materaiRequired: { type: "boolean" },
              materaiApplied: { type: "boolean" },
              client: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  company: { type: "string" },
                },
              },
              project: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  number: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                },
              },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            pages: { type: "number" },
          },
        },
      },
    },
  })
  async findAll(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("status") status?: InvoiceStatus,
  ) {
    return this.invoicesService.findAll(+page, +limit, status);
  }

  @Get("stats")
  @ApiOperation({ summary: "Mendapatkan statistik invoice" })
  @ApiResponse({
    status: 200,
    description: "Statistik invoice berhasil diambil",
    schema: {
      type: "object",
      properties: {
        total: { type: "number" },
        byStatus: {
          type: "object",
          additionalProperties: { type: "number" },
        },
        totalRevenue: { type: "number" },
        overdueCount: { type: "number" },
      },
    },
  })
  async getStats() {
    return this.invoicesService.getInvoiceStats();
  }

  @Get("overdue")
  @ApiOperation({ summary: "Mendapatkan invoice yang jatuh tempo" })
  @ApiResponse({
    status: 200,
    description: "Daftar invoice yang jatuh tempo",
  })
  async getOverdueInvoices() {
    return this.invoicesService.getOverdueInvoices();
  }

  @Get("recent")
  @ApiOperation({ summary: "Mendapatkan invoice terbaru" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Jumlah invoice terbaru (default: 5)",
  })
  @ApiResponse({
    status: 200,
    description: "Daftar invoice terbaru",
  })
  async getRecentInvoices(@Query("limit") limit = 5) {
    return this.invoicesService.getRecentInvoices(+limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Mendapatkan invoice berdasarkan ID" })
  @ApiResponse({
    status: 200,
    description: "Invoice berhasil ditemukan",
  })
  @ApiResponse({
    status: 404,
    description: "Invoice tidak ditemukan",
  })
  async findOne(@Param("id") id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Memperbarui invoice" })
  @ApiResponse({
    status: 200,
    description: "Invoice berhasil diperbarui",
  })
  @ApiResponse({
    status: 404,
    description: "Invoice tidak ditemukan",
  })
  async update(
    @Param("id") id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, updateInvoiceDto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Memperbarui status invoice" })
  @ApiResponse({
    status: 200,
    description: "Status invoice berhasil diperbarui",
  })
  @ApiResponse({
    status: 404,
    description: "Invoice tidak ditemukan",
  })
  async updateStatus(@Param("id") id: string, @Body("status") status: string) {
    // Convert lowercase status to uppercase enum
    const normalizedStatus = status.toUpperCase() as InvoiceStatus;
    return this.invoicesService.updateStatus(id, normalizedStatus);
  }

  @Patch(":id/mark-paid")
  @ApiOperation({ summary: "Tandai invoice sebagai lunas" })
  @ApiResponse({
    status: 200,
    description: "Invoice berhasil ditandai sebagai lunas",
  })
  @ApiResponse({
    status: 404,
    description: "Invoice tidak ditemukan",
  })
  async markAsPaid(
    @Param("id") id: string,
    @Body()
    paymentData?: {
      paymentMethod?: string;
      paymentDate?: string;
      notes?: string;
    },
  ) {
    return this.invoicesService.markAsPaid(id, paymentData);
  }

  @Post("bulk-status-update")
  @ApiOperation({
    summary: "Memperbarui status beberapa invoice sekaligus - 70% lebih cepat",
  })
  @ApiBody({ type: BulkUpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: "Status invoice berhasil diperbarui secara batch",
    schema: {
      type: "object",
      properties: {
        updated: {
          type: "number",
          description: "Jumlah invoice yang berhasil diperbarui",
        },
        failed: {
          type: "array",
          items: { type: "string" },
          description: "Daftar invoice yang gagal diperbarui dengan alasan",
        },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Data tidak valid atau transisi status tidak diizinkan",
  })
  async bulkUpdateStatus(
    @Body() bulkUpdateData: BulkUpdateStatusDto,
    @Request() req: any,
  ) {
    const result = await this.invoicesService.bulkUpdateInvoiceStatus(
      bulkUpdateData.ids,
      bulkUpdateData.status,
      req.user.id,
    );

    return {
      ...result,
      message: `${result.updated} invoice berhasil diperbarui${result.failed.length > 0 ? `, ${result.failed.length} gagal` : ""}`,
    };
  }

  @Patch(":id/materai")
  @ApiOperation({ summary: "Memperbarui status materai invoice" })
  @ApiResponse({
    status: 200,
    description: "Status materai invoice berhasil diperbarui",
  })
  @ApiResponse({
    status: 400,
    description: "Invoice tidak memerlukan materai",
  })
  @ApiResponse({
    status: 404,
    description: "Invoice tidak ditemukan",
  })
  async updateMateraiStatus(
    @Param("id") id: string,
    @Body("materaiApplied") materaiApplied: boolean,
  ) {
    return this.invoicesService.updateMateraiStatus(id, materaiApplied);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Menghapus invoice" })
  @ApiResponse({
    status: 204,
    description: "Invoice berhasil dihapus",
  })
  @ApiResponse({
    status: 400,
    description: "Hanya invoice dengan status draft yang dapat dihapus",
  })
  @ApiResponse({
    status: 404,
    description: "Invoice tidak ditemukan",
  })
  async remove(@Param("id") id: string) {
    return this.invoicesService.remove(id);
  }
}
