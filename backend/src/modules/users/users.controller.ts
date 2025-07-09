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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as bcrypt from 'bcrypt';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat pengguna baru' })
  @ApiResponse({
    status: 201,
    description: 'Pengguna berhasil dibuat',
  })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid',
  })
  @ApiResponse({
    status: 409,
    description: 'Email sudah terdaftar',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    // Hash password before creating user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Remove password from response
    const { password, ...result } = user;
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Mendapatkan daftar pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Daftar pengguna berhasil diambil',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan pengguna berdasarkan ID' })
  @ApiResponse({
    status: 200,
    description: 'Pengguna berhasil ditemukan',
  })
  @ApiResponse({
    status: 404,
    description: 'Pengguna tidak ditemukan',
  })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const { password, ...result } = user;
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Pengguna berhasil diperbarui',
  })
  @ApiResponse({
    status: 404,
    description: 'Pengguna tidak ditemukan',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // Hash password if provided
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Menghapus pengguna (soft delete)' })
  @ApiResponse({
    status: 204,
    description: 'Pengguna berhasil dihapus',
  })
  @ApiResponse({
    status: 404,
    description: 'Pengguna tidak ditemukan',
  })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}