import { IsString, IsOptional, IsEnum, IsDateString, IsDecimal, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectType, ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

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
    description: 'Output yang diharapkan',
    example: 'Video promosi 30 detik, format MP4',
  })
  @IsString({ message: 'Output harus berupa string' })
  output: string;

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
    description: 'Estimasi budget',
    example: 5000000,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsPositive({ message: 'Budget harus lebih dari 0' })
  estimatedBudget?: number;

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