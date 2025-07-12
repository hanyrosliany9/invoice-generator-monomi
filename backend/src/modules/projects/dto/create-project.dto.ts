import { IsString, IsOptional, IsEnum, IsDateString, IsDecimal, IsPositive, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectType, ProjectStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class ProjectItemDto {
  @ApiProperty({
    description: 'Nama item/produk',
    example: 'Video Promosi 30 detik',
  })
  @IsString({ message: 'Nama item harus berupa string' })
  name: string;

  @ApiProperty({
    description: 'Deskripsi item',
    example: 'Video promosi produk dengan durasi 30 detik, format MP4 1080p',
  })
  @IsString({ message: 'Deskripsi item harus berupa string' })
  description: string;

  @ApiProperty({
    description: 'Harga item',
    example: 2500000,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsPositive({ message: 'Harga item harus lebih dari 0' })
  price: number;

  @ApiProperty({
    description: 'Kuantitas',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsPositive({ message: 'Kuantitas harus lebih dari 0' })
  quantity?: number;
}

export class CreateProjectDto {
  @ApiProperty({
    description: 'Nomor proyek',
    example: 'PRJ-2024-001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nomor proyek harus berupa string' })
  number?: string;

  @ApiProperty({
    description: 'Deskripsi proyek',
    example: 'Pembuatan video promosi produk',
  })
  @IsString({ message: 'Deskripsi proyek harus berupa string' })
  description: string;

  @ApiProperty({
    description: 'Output yang diharapkan (opsional, dapat diturunkan dari deskripsi produk)',
    example: 'Video promosi 30 detik, format MP4',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Output harus berupa string' })
  output?: string;

  @ApiProperty({
    description: 'Tipe proyek',
    enum: ProjectType,
    example: ProjectType.PRODUCTION,
  })
  @IsEnum(ProjectType, { message: 'Tipe proyek tidak valid' })
  type: ProjectType;

  @ApiProperty({
    description: 'ID klien',
    example: 'clx123456789',
  })
  @IsString({ message: 'ID klien harus berupa string yang valid' })
  clientId: string;

  @ApiProperty({
    description: 'Tanggal mulai proyek',
    example: '2024-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal mulai tidak valid' })
  startDate?: string;

  @ApiProperty({
    description: 'Tanggal selesai proyek',
    example: '2024-01-30',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal selesai tidak valid' })
  endDate?: string;

  @ApiProperty({
    description: 'Estimasi budget (opsional, akan dihitung otomatis dari produk)',
    example: 5000000,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsPositive({ message: 'Budget harus lebih dari 0' })
  estimatedBudget?: number;

  @ApiProperty({
    description: 'Daftar produk/item dalam proyek',
    type: [ProjectItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Products harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => ProjectItemDto)
  products?: ProjectItemDto[];

  @ApiProperty({
    description: 'Status proyek',
    enum: ProjectStatus,
    example: ProjectStatus.PLANNING,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status proyek tidak valid' })
  status?: ProjectStatus;
}