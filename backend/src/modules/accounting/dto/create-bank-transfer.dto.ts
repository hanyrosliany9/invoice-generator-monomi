import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsEnum,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export enum TransferMethod {
  INTERNAL = "INTERNAL",
  INTERBANK = "INTERBANK",
  RTGS = "RTGS",
  CLEARING = "CLEARING",
  SKN = "SKN",
  BIFAST = "BIFAST",
  OTHER = "OTHER",
}

export enum BankTransferStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export class CreateBankTransferDto {
  @IsDate()
  @Type(() => Date)
  transferDate: Date;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  fromAccountId: string; // Chart of Accounts ID for source bank account

  @IsString()
  toAccountId: string; // Chart of Accounts ID for destination bank account

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  descriptionId?: string; // Indonesian description

  @IsString()
  @IsOptional()
  descriptionEn?: string; // English description

  @IsString()
  @IsOptional()
  reference?: string; // External reference number

  // Transfer Fee
  @IsNumber()
  @IsOptional()
  @Min(0)
  transferFee?: number;

  @IsString()
  @IsOptional()
  feeAccountId?: string; // Account to charge fee

  @IsString()
  @IsOptional()
  feePaymentMethod?: string;

  // Transfer Method
  @IsEnum(TransferMethod)
  @IsOptional()
  transferMethod?: TransferMethod = TransferMethod.INTERNAL;

  @IsString()
  @IsOptional()
  bankReference?: string; // Bank confirmation number

  @IsString()
  @IsOptional()
  confirmationCode?: string;

  // Relations
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  // Status
  @IsEnum(BankTransferStatus)
  @IsOptional()
  status?: BankTransferStatus = BankTransferStatus.PENDING;

  // Notes
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  notesId?: string; // Indonesian notes

  @IsString()
  createdBy: string;
}
