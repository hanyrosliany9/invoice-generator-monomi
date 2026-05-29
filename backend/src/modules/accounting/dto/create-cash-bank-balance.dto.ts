import {
  IsString,
  IsDate,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateCashBankBalanceDto {
  // period / periodDate / openingBalance are derived per-account now; only the
  // target month (year + month) is required to (re)sync that period.
  @IsString()
  @IsOptional()
  period?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  periodDate?: Date;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  openingBalance?: number; // legacy; ignored (opening is auto-chained)

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
