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
  ConflictException,
  InternalServerErrorException,
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
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import * as bcrypt from "bcrypt";

@ApiTags("Users")
@Controller("users")
// User management is available to ADMIN and SUPER_ADMIN. Full CRUD incl. role
// assignment — no super-admin-only carve-out (simplified access model).
@RequireAdmin()
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
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Hash password before creating user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    try {
      return await this.usersService.create({
        ...createUserDto,
        password: hashedPassword,
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email sudah terdaftar");
      }
      throw new InternalServerErrorException("Gagal membuat pengguna");
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
  ): Promise<UserResponseDto[]> {
    const filters = { page, limit, search, role, isActive };
    return this.usersService.findAll(filters);
  }

  @Get("lookup-by-email")
  @UseGuards(JwtAuthGuard) // Only authenticated users, no SuperAdmin required
  @ApiOperation({
    summary: "Find user by email address (for collaborator invites)",
  })
  @ApiQuery({
    name: "email",
    required: true,
    type: String,
    description: "Email address to lookup",
  })
  @ApiResponse({
    status: 200,
    description: "User found successfully",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  async findByEmail(
    @Query("email") email: string,
  ): Promise<{ id: string; name: string; email: string }> {
    if (!email || !email.includes("@")) {
      throw new BadRequestException("Valid email address is required");
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`No user found with email: ${email}`);
    }

    return { id: user.id, name: user.name, email: user.email };
  }

  @Get("stats")
  @ApiOperation({ summary: "Mendapatkan statistik pengguna" })
  @ApiResponse({
    status: 200,
    description: "Statistik pengguna berhasil diambil",
  })
  async getUserStats(): Promise<any> {
    return this.usersService.getUserStats();
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
  async findOne(@Param("id") id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("Pengguna tidak ditemukan");
    }
    return user;
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
  ): Promise<UserResponseDto> {
    // Hash password if provided
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
    }

    try {
      return await this.usersService.update(id, updateUserDto);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Pengguna tidak ditemukan");
      }
      throw new InternalServerErrorException("Gagal memperbarui pengguna");
    }
  }

  @Patch(":id/activate")
  @ApiOperation({ summary: "Mengaktifkan pengguna" })
  @ApiResponse({
    status: 200,
    description: "Pengguna berhasil diaktifkan",
  })
  async activateUser(@Param("id") id: string): Promise<UserResponseDto> {
    return this.usersService.update(id, { isActive: true });
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Menonaktifkan pengguna" })
  @ApiResponse({
    status: 200,
    description: "Pengguna berhasil dinonaktifkan",
  })
  async deactivateUser(@Param("id") id: string): Promise<UserResponseDto> {
    return this.usersService.update(id, { isActive: false });
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
  async remove(@Param("id") id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
