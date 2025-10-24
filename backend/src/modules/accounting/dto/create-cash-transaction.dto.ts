import {
  IsString,
  IsDate,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CashTransactionType,
  CashCategory,
  PaymentMethod,
  CashTransactionStatus,
  Currency,
} from "@prisma/client";

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

  // Multi-Currency Support (2025)
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.IDR;

  @IsNumber()
  @Min(0)
  @IsOptional()
  originalAmount?: number; // Amount in original currency (if different from IDR)

  @IsNumber()
  @Min(0)
  @IsOptional()
  exchangeRate?: number; // Exchange rate used (auto-fetched if not provided)

  @IsNumber()
  @Min(0)
  @IsOptional()
  idrAmount?: number; // Amount in IDR (auto-calculated if not provided)

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
