import { IsString, IsDate, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, JournalStatus } from '@prisma/client';

export class CreateJournalLineItemDto {
  @IsString()
  accountCode: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  descriptionId?: string;

  @IsNumber()
  @Min(0)
  debit: number;

  @IsNumber()
  @Min(0)
  credit: number;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class CreateJournalEntryDto {
  @IsDate()
  @Type(() => Date)
  entryDate: Date;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  descriptionId?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsString()
  transactionId: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  documentDate?: Date;

  @IsEnum(JournalStatus)
  @IsOptional()
  status?: JournalStatus = JournalStatus.DRAFT;

  @IsBoolean()
  @IsOptional()
  isPosted?: boolean = false;

  @IsString()
  @IsOptional()
  fiscalPeriodId?: string;

  @IsBoolean()
  @IsOptional()
  isReversing?: boolean = false;

  @IsString()
  @IsOptional()
  reversedEntryId?: string;

  @IsString()
  createdBy: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineItemDto)
  lineItems: CreateJournalLineItemDto[];
}
