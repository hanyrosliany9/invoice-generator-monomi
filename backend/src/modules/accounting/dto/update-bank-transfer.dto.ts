import { PartialType } from '@nestjs/mapped-types';
import { CreateBankTransferDto } from './create-bank-transfer.dto';
import { IsString, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBankTransferDto extends PartialType(CreateBankTransferDto) {
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
  completedBy?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  completedAt?: Date;
}
