import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateSalaryPaymentDto {
  @ApiProperty({ description: "Staff member ID" })
  @IsString()
  staffId: string;

  // FIX 6: `period` is derived server-side from year+month ("Januari 2026").
  // It is no longer accepted from the client to prevent mismatch.

  @ApiProperty({ description: "Year e.g. 2026", example: 2026 })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year: number;

  @ApiProperty({ description: "Month 1–12", example: 1 })
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @ApiProperty({ description: "Base salary for this period", example: 5000000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary: number;

  @ApiPropertyOptional({ description: "Allowances (tunjangan)", example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  allowances?: number;

  @ApiPropertyOptional({ description: "Deductions (potongan)", example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deductions?: number;

  @ApiPropertyOptional({ description: "Date paid (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
