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
import { JournalStatus } from "@prisma/client";
import {
  WibStartOfDay,
  WibEndOfDay,
} from "../../../common/transformers/wib-date.transform";

export class JournalQueryDto {
  @IsDate()
  @IsOptional()
  @WibStartOfDay()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @WibEndOfDay()
  endDate?: Date;

  // Accepts an exact TransactionType OR a UI group alias (INVOICE, PAYMENT, ECL)
  // which the service expands to the matching set. Strict @IsEnum rejected those
  // aliases and 400'd the journal-entries filter.
  @IsString()
  @IsOptional()
  transactionType?: string;

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
