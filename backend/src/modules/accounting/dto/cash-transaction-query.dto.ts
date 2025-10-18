import { IsString, IsDate, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CashTransactionType, CashCategory, CashTransactionStatus } from '@prisma/client';

export class CashTransactionQueryDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsEnum(CashTransactionType)
  @IsOptional()
  transactionType?: CashTransactionType;

  @IsEnum(CashCategory)
  @IsOptional()
  category?: CashCategory;

  @IsEnum(CashTransactionStatus)
  @IsOptional()
  status?: CashTransactionStatus;

  @IsString()
  @IsOptional()
  cashAccountId?: string;

  @IsString()
  @IsOptional()
  offsetAccountId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;

  @IsString()
  @IsOptional()
  sortBy?: string = 'transactionDate';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
