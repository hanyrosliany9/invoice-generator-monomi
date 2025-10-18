import { IsString, IsDate, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CashTransactionType, CashCategory, PaymentMethod, CashTransactionStatus } from '@prisma/client';

export class CreateCashTransactionDto {
  @IsEnum(CashTransactionType)
  transactionType: CashTransactionType;

  @IsEnum(CashCategory)
  category: CashCategory;

  @IsDate()
  @Type(() => Date)
  transactionDate: Date;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  cashAccountId: string; // Chart of Accounts ID for cash/bank account

  @IsString()
  offsetAccountId: string; // Chart of Accounts ID for offsetting account

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  descriptionId?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.CASH;

  @IsString()
  @IsOptional()
  checkNumber?: string;

  @IsString()
  @IsOptional()
  bankReference?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsEnum(CashTransactionStatus)
  @IsOptional()
  status?: CashTransactionStatus = CashTransactionStatus.DRAFT;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  notesId?: string;

  @IsString()
  createdBy: string;
}
