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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Clients")
@Controller("clients")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: "Membuat klien baru" })
  @ApiResponse({
    status: 201,
    description: "Klien berhasil dibuat",
  })
  @ApiResponse({
    status: 400,
    description: "Data tidak valid",
  })
  async create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: "Mendapatkan daftar klien dengan pagination" })
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
    name: "search",
    required: false,
    type: String,
    description: "Kata kunci pencarian",
  })
  @ApiResponse({
    status: 200,
    description: "Daftar klien berhasil diambil",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              address: { type: "string" },
              company: { type: "string" },
              contactPerson: { type: "string" },
              paymentTerms: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              _count: {
                type: "object",
                properties: {
                  quotations: { type: "number" },
                  invoices: { type: "number" },
                  projects: { type: "number" },
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
    @Query("search") search?: string,
  ) {
    return this.clientsService.findAll(+page, +limit, search);
  }

  @Get("stats")
  @ApiOperation({ summary: "Mendapatkan statistik klien" })
  @ApiResponse({
    status: 200,
    description: "Statistik klien berhasil diambil",
    schema: {
      type: "object",
      properties: {
        total: { type: "number" },
        recent: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              company: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              _count: {
                type: "object",
                properties: {
                  quotations: { type: "number" },
                  invoices: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
  })
  async getStats() {
    return this.clientsService.getClientStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "Mendapatkan klien berdasarkan ID" })
  @ApiResponse({
    status: 200,
    description: "Klien berhasil ditemukan",
  })
  @ApiResponse({
    status: 404,
    description: "Klien tidak ditemukan",
  })
  async findOne(@Param("id") id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Memperbarui klien" })
  @ApiResponse({
    status: 200,
    description: "Klien berhasil diperbarui",
  })
  @ApiResponse({
    status: 404,
    description: "Klien tidak ditemukan",
  })
  async update(
    @Param("id") id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Menghapus klien" })
  @ApiResponse({
    status: 204,
    description: "Klien berhasil dihapus",
  })
  @ApiResponse({
    status: 404,
    description: "Klien tidak ditemukan",
  })
  @ApiResponse({
    status: 400,
    description: "Tidak dapat menghapus klien yang memiliki relasi",
  })
  async remove(@Param("id") id: string) {
    return this.clientsService.remove(id);
  }
}
