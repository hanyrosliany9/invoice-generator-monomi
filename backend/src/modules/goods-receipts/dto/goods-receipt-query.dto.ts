import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GRStatus, InspectionStatus } from '@prisma/client';

export class GoodsReceiptQueryDto {
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

  @ApiPropertyOptional({ description: 'Sort by field', default: 'grDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'grDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Search by GR number or notes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: GRStatus })
  @IsOptional()
  @IsEnum(GRStatus)
  status?: GRStatus;

  @ApiPropertyOptional({ description: 'Filter by inspection status', enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  inspectionStatus?: InspectionStatus;

  @ApiPropertyOptional({ description: 'Filter by purchase order ID' })
  @IsOptional()
  @IsString()
  poId?: string;

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
