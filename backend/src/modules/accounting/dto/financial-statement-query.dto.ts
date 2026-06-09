import {
  IsString,
  IsDate,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { StatementType, AccountType } from "@prisma/client";
import {
  WibStartOfDay,
  WibEndOfDay,
} from "../../../common/transformers/wib-date.transform";

export class FinancialStatementQueryDto {
  @IsDate()
  @IsOptional()
  @WibStartOfDay()
  startDate?: Date;

  @IsDate()
  @WibEndOfDay()
  endDate: Date;

  @IsEnum(StatementType)
  @IsOptional()
  statementType?: StatementType;

  @IsString()
  @IsOptional()
  fiscalPeriodId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeInactive?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  consolidate?: boolean = true;
}

export class LedgerQueryDto {
  @IsString()
  @IsOptional()
  accountCode?: string;

  @IsEnum(AccountType)
  @IsOptional()
  accountType?: AccountType;

  @IsDate()
  @IsOptional()
  @WibStartOfDay()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @WibEndOfDay()
  endDate?: Date;

  @IsString()
  @IsOptional()
  fiscalPeriodId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeInactive?: boolean = false;
}

export class TrialBalanceQueryDto {
  @IsDate()
  @IsOptional()
  @WibStartOfDay()
  startDate?: Date;

  @IsDate()
  @WibEndOfDay()
  endDate: Date;

  @IsString()
  @IsOptional()
  fiscalPeriodId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeInactive?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeZeroBalances?: boolean = false;
}
