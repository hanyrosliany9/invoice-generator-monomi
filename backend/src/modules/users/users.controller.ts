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
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto, UserResponseDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse as ApiResponseDto } from "../../common/dto/api-response.dto";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import * as bcrypt from "bcrypt";

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "Membuat pengguna baru" })
  @ApiResponse({
    status: 201,
    description: "Pengguna berhasil dibuat",
  })
  @ApiResponse({
    status: 400,
    description: "Data tidak valid",
  })
  @ApiResponse({
    status: 409,
    description: "Email sudah terdaftar",
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponseDto<UserResponseDto | null>> {
    try {
      // Hash password before creating user
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        saltRounds,
      );

      const user = await this.usersService.create({
        ...createUserDto,
        password: hashedPassword,
      });

      return ApiResponseDto.success(user, "Pengguna berhasil dibuat");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return ApiResponseDto.error("Email sudah terdaftar", null);
      }
      return ApiResponseDto.error("Gagal membuat pengguna", null);
    }
  }

  @Get()
  @ApiOperation({ summary: "Mendapatkan daftar pengguna" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "Daftar pengguna berhasil diambil",
  })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("isActive") isActive?: boolean,
  ): Promise<ApiResponseDto<UserResponseDto[]>> {
    try {
      const filters = { page, limit, search, role, isActive };
      const users = await this.usersService.findAll(filters);
      return ApiResponseDto.success(users, "Daftar pengguna berhasil diambil");
    } catch (error) {
      return ApiResponseDto.error("Gagal mengambil daftar pengguna", []);
    }
  }

  @Get("stats")
  @ApiOperation({ summary: "Mendapatkan statistik pengguna" })
  @ApiResponse({
    status: 200,
    description: "Statistik pengguna berhasil diambil",
  })
  async getUserStats(): Promise<ApiResponseDto<any>> {
    try {
      const stats = await this.usersService.getUserStats();
      return ApiResponseDto.success(
        stats,
        "Statistik pengguna berhasil diambil",
      );
    } catch (error) {
      return ApiResponseDto.error("Gagal mengambil statistik pengguna", null);
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "Mendapatkan pengguna berdasarkan ID" })
  @ApiResponse({
    status: 200,
    description: "Pengguna berhasil ditemukan",
  })
  @ApiResponse({
    status: 404,
    description: "Pengguna tidak ditemukan",
  })
  async findOne(
    @Param("id") id: string,
  ): Promise<ApiResponseDto<UserResponseDto | null>> {
    try {
      const user = await this.usersService.findById(id);
      if (!user) {
        return ApiResponseDto.error("Pengguna tidak ditemukan", null);
      }
      return ApiResponseDto.success(user, "Pengguna berhasil ditemukan");
    } catch (error) {
      return ApiResponseDto.error("Gagal mengambil pengguna", null);
    }
  }

  @Patch(":id")
  @ApiOperation({ summary: "Memperbarui pengguna" })
  @ApiResponse({
    status: 200,
    description: "Pengguna berhasil diperbarui",
  })
  @ApiResponse({
    status: 404,
    description: "Pengguna tidak ditemukan",
  })
  async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponseDto<UserResponseDto | null>> {
    try {
      // Hash password if provided
      if (updateUserDto.password) {
        const saltRounds = 10;
        updateUserDto.password = await bcrypt.hash(
          updateUserDto.password,
          saltRounds,
        );
      }

      const user = await this.usersService.update(id, updateUserDto);
      return ApiResponseDto.success(user, "Pengguna berhasil diperbarui");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return ApiResponseDto.error("Pengguna tidak ditemukan", null);
      }
      return ApiResponseDto.error("Gagal memperbarui pengguna", null);
    }
  }

  @Patch(":id/activate")
  @ApiOperation({ summary: "Mengaktifkan pengguna" })
  @ApiResponse({
    status: 200,
    description: "Pengguna berhasil diaktifkan",
  })
  async activateUser(
    @Param("id") id: string,
  ): Promise<ApiResponseDto<UserResponseDto | null>> {
    try {
      const user = await this.usersService.update(id, { isActive: true });
      return ApiResponseDto.success(user, "Pengguna berhasil diaktifkan");
    } catch (error) {
      return ApiResponseDto.error("Gagal mengaktifkan pengguna", null);
    }
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Menonaktifkan pengguna" })
  @ApiResponse({
    status: 200,
    description: "Pengguna berhasil dinonaktifkan",
  })
  async deactivateUser(
    @Param("id") id: string,
  ): Promise<ApiResponseDto<UserResponseDto | null>> {
    try {
      const user = await this.usersService.update(id, { isActive: false });
      return ApiResponseDto.success(user, "Pengguna berhasil dinonaktifkan");
    } catch (error) {
      return ApiResponseDto.error("Gagal menonaktifkan pengguna", null);
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Menghapus pengguna (soft delete)" })
  @ApiResponse({
    status: 204,
    description: "Pengguna berhasil dihapus",
  })
  @ApiResponse({
    status: 404,
    description: "Pengguna tidak ditemukan",
  })
  async remove(@Param("id") id: string): Promise<ApiResponseDto<null>> {
    try {
      await this.usersService.remove(id);
      return ApiResponseDto.success(null, "Pengguna berhasil dihapus");
    } catch (error) {
      return ApiResponseDto.error("Gagal menghapus pengguna", null);
    }
  }
}
