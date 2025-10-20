import {
  IsString,
  IsDate,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { StatementType, AccountType } from "@prisma/client";

export class FinancialStatementQueryDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
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
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
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
  @Type(() => Date)
  asOfDate: Date;

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
