import { PartialType } from '@nestjs/mapped-types';
import { CreateCashTransactionDto } from './create-cash-transaction.dto';
import { IsString, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCashTransactionDto extends PartialType(CreateCashTransactionDto) {
  @IsString()
  @IsOptional()
  updatedBy?: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  approvedAt?: Date;

  @IsString()
  @IsOptional()
  rejectedBy?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  rejectedAt?: Date;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
