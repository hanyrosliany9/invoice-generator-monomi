import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BankTransferStatus, TransferMethod } from './create-bank-transfer.dto';

export class BankTransferQueryDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsEnum(BankTransferStatus)
  @IsOptional()
  status?: BankTransferStatus;

  @IsEnum(TransferMethod)
  @IsOptional()
  transferMethod?: TransferMethod;

  @IsString()
  @IsOptional()
  fromAccountId?: string;

  @IsString()
  @IsOptional()
  toAccountId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  search?: string; // Search in transfer number, description, reference

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
  sortBy?: string = 'transferDate';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
