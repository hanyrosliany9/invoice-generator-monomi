import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { BankRecStatus } from "./create-bank-reconciliation.dto";

export class BankReconciliationQueryDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsEnum(BankRecStatus)
  @IsOptional()
  status?: BankRecStatus;

  @IsString()
  @IsOptional()
  bankAccountId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isBalanced?: boolean;

  @IsString()
  @IsOptional()
  search?: string; // Search in reconciliation number, statement reference

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
  sortBy?: string = "statementDate";

  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
