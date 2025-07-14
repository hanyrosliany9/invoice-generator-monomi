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
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProjectStatus } from "@prisma/client";

@ApiTags("Projects")
@Controller("projects")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: "Membuat proyek baru" })
  @ApiResponse({
    status: 201,
    description: "Proyek berhasil dibuat",
  })
  @ApiResponse({
    status: 400,
    description: "Data tidak valid",
  })
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: "Mendapatkan daftar proyek dengan pagination" })
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
    enum: ProjectStatus,
    description: "Filter berdasarkan status proyek",
  })
  @ApiQuery({
    name: "projectTypeId",
    required: false,
    type: String,
    description: "Filter berdasarkan ID tipe proyek",
  })
  @ApiResponse({
    status: 200,
    description: "Daftar proyek berhasil diambil",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              number: { type: "string" },
              description: { type: "string" },
              output: { type: "string" },
              projectType: { 
                type: "object",
                properties: {
                  id: { type: "string" },
                  code: { type: "string" },
                  name: { type: "string" },
                  prefix: { type: "string" },
                  color: { type: "string" }
                }
              },
              status: { type: "string", enum: Object.values(ProjectStatus) },
              startDate: { type: "string", format: "date-time" },
              endDate: { type: "string", format: "date-time" },
              estimatedBudget: { type: "number" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
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
    @Query("status") status?: ProjectStatus,
    @Query("projectTypeId") projectTypeId?: string,
  ) {
    return this.projectsService.findAll(+page, +limit, status, projectTypeId);
  }

  @Get("stats")
  @ApiOperation({ summary: "Mendapatkan statistik proyek" })
  @ApiResponse({
    status: 200,
    description: "Statistik proyek berhasil diambil",
    schema: {
      type: "object",
      properties: {
        total: { type: "number" },
        byStatus: {
          type: "object",
          additionalProperties: { type: "number" },
        },
        byType: {
          type: "object",
          additionalProperties: { type: "number" },
        },
      },
    },
  })
  async getStats() {
    return this.projectsService.getProjectStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "Mendapatkan proyek berdasarkan ID" })
  @ApiResponse({
    status: 200,
    description: "Proyek berhasil ditemukan",
  })
  @ApiResponse({
    status: 404,
    description: "Proyek tidak ditemukan",
  })
  async findOne(@Param("id") id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Memperbarui proyek" })
  @ApiResponse({
    status: 200,
    description: "Proyek berhasil diperbarui",
  })
  @ApiResponse({
    status: 404,
    description: "Proyek tidak ditemukan",
  })
  async update(
    @Param("id") id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Menghapus proyek" })
  @ApiResponse({
    status: 204,
    description: "Proyek berhasil dihapus",
  })
  @ApiResponse({
    status: 404,
    description: "Proyek tidak ditemukan",
  })
  @ApiResponse({
    status: 400,
    description: "Tidak dapat menghapus proyek yang memiliki relasi",
  })
  async remove(@Param("id") id: string) {
    return this.projectsService.remove(id);
  }
}
