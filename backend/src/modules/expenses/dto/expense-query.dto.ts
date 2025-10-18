import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDate, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseStatus, ExpensePaymentStatus, ExpenseClass, PPNCategory } from '@prisma/client';

export class ExpenseQueryDto {
  @ApiPropertyOptional({ description: 'Search query (description, vendor, NSFP, account code)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: ExpensePaymentStatus })
  @IsOptional()
  @IsEnum(ExpensePaymentStatus)
  paymentStatus?: ExpensePaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by expense class', enum: ExpenseClass })
  @IsOptional()
  @IsEnum(ExpenseClass)
  expenseClass?: ExpenseClass;

  @ApiPropertyOptional({ description: 'Filter by PPN category', enum: PPNCategory })
  @IsOptional()
  @IsEnum(PPNCategory)
  ppnCategory?: PPNCategory;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (submitter)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by approver ID' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Filter by billable flag' })
  @IsOptional()
  isBillable?: boolean;

  @ApiPropertyOptional({ description: 'Filter by account code (PSAK)', example: '6-2050' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Start date (expense date)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date (expense date)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Minimum amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'expenseDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'expenseDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
