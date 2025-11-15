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
  @IsString()
  period: string; // e.g., "Januari 2025"

  @IsDate()
  @Type(() => Date)
  periodDate: Date; // First day of the period

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
  openingBalance: number; // Manual input

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
