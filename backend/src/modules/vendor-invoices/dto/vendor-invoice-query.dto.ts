import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VIStatus, MatchingStatus, EFakturStatus } from '@prisma/client';

export class VendorInvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'invoiceDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'invoiceDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Search by invoice number or notes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: VIStatus })
  @IsOptional()
  @IsEnum(VIStatus)
  status?: VIStatus;

  @ApiPropertyOptional({ description: 'Filter by matching status', enum: MatchingStatus })
  @IsOptional()
  @IsEnum(MatchingStatus)
  matchingStatus?: MatchingStatus;

  @ApiPropertyOptional({ description: 'Filter by e-Faktur status', enum: EFakturStatus })
  @IsOptional()
  @IsEnum(EFakturStatus)
  eFakturStatus?: EFakturStatus;

  @ApiPropertyOptional({ description: 'Filter by purchase order ID' })
  @IsOptional()
  @IsString()
  poId?: string;

  @ApiPropertyOptional({ description: 'Filter by goods receipt ID' })
  @IsOptional()
  @IsString()
  grId?: string;

  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
