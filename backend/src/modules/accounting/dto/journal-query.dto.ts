import {
  IsString,
  IsDate,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { TransactionType, JournalStatus } from "@prisma/client";

export class JournalQueryDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsEnum(TransactionType)
  @IsOptional()
  transactionType?: TransactionType;

  @IsEnum(JournalStatus)
  @IsOptional()
  status?: JournalStatus;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPosted?: boolean;

  @IsString()
  @IsOptional()
  fiscalPeriodId?: string;

  @IsString()
  @IsOptional()
  accountCode?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

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
  sortBy?: string = "entryDate";

  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
