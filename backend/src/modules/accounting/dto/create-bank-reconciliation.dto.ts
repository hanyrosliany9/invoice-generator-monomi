import { IsString, IsNumber, IsDate, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum BankRecStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

export enum BankRecItemType {
  DEPOSIT_IN_TRANSIT = 'DEPOSIT_IN_TRANSIT',
  OUTSTANDING_CHECK = 'OUTSTANDING_CHECK',
  BANK_CHARGE = 'BANK_CHARGE',
  BANK_INTEREST = 'BANK_INTEREST',
  NSF_CHECK = 'NSF_CHECK',
  AUTOMATIC_PAYMENT = 'AUTOMATIC_PAYMENT',
  DIRECT_DEPOSIT = 'DIRECT_DEPOSIT',
  BANK_ERROR = 'BANK_ERROR',
  BOOK_ERROR = 'BOOK_ERROR',
  OTHER_ADJUSTMENT = 'OTHER_ADJUSTMENT',
}

export enum BankRecItemStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  ADJUSTED = 'ADJUSTED',
  CLEARED = 'CLEARED',
  UNRESOLVED = 'UNRESOLVED',
}

export class CreateBankReconciliationItemDto {
  @IsDate()
  @Type(() => Date)
  itemDate: Date;

  @IsEnum(BankRecItemType)
  itemType: BankRecItemType;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  descriptionId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsBoolean()
  @IsOptional()
  isMatched?: boolean = false;

  @IsString()
  @IsOptional()
  matchedTransactionId?: string;

  @IsEnum(BankRecItemStatus)
  @IsOptional()
  status?: BankRecItemStatus = BankRecItemStatus.PENDING;

  @IsBoolean()
  @IsOptional()
  requiresAdjustment?: boolean = false;

  @IsString()
  @IsOptional()
  checkNumber?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBankReconciliationDto {
  @IsString()
  bankAccountId: string; // Bank account being reconciled

  @IsDate()
  @Type(() => Date)
  statementDate: Date; // Bank statement date

  @IsDate()
  @Type(() => Date)
  periodStartDate: Date;

  @IsDate()
  @Type(() => Date)
  periodEndDate: Date;

  // Balances
  @IsNumber()
  bookBalanceStart: number;

  @IsNumber()
  bookBalanceEnd: number;

  @IsNumber()
  statementBalance: number;

  // Reconciliation Items
  @IsNumber()
  @IsOptional()
  @Min(0)
  depositsInTransit?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  outstandingChecks?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bankCharges?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bankInterest?: number = 0;

  @IsNumber()
  @IsOptional()
  otherAdjustments?: number = 0;

  // Calculated Values
  @IsNumber()
  adjustedBookBalance: number;

  @IsNumber()
  adjustedBankBalance: number;

  @IsNumber()
  @IsOptional()
  difference?: number = 0;

  @IsBoolean()
  @IsOptional()
  isBalanced?: boolean = false;

  // Statement Details
  @IsString()
  @IsOptional()
  statementReference?: string;

  @IsString()
  @IsOptional()
  statementFilePath?: string;

  @IsEnum(BankRecStatus)
  @IsOptional()
  status?: BankRecStatus = BankRecStatus.DRAFT;

  // Reconciliation Items
  @IsOptional()
  reconciliationItems?: CreateBankReconciliationItemDto[];

  // Notes
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  notesId?: string;

  @IsString()
  createdBy: string;
}
