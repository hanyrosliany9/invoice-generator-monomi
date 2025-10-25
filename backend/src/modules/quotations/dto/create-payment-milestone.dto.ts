import { IsString, IsNumber, IsOptional, IsDate, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a payment milestone for a quotation
 * Supports Indonesian "termin pembayaran" (payment terms) structure
 */
export class CreatePaymentMilestoneDto {
  @IsNumber()
  milestoneNumber: number; // 1, 2, 3...

  @IsString()
  name: string; // "Down Payment", "Phase 1", "Final Payment"

  @IsOptional()
  @IsString()
  nameId?: string; // Indonesian: "DP", "Tahap 1", "Pelunasan"

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionId?: string; // Indonesian description

  @IsNumber()
  @Min(0)
  @Max(100)
  paymentPercentage: number; // % of total quotation (e.g., 30%)

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date; // When payment is expected

  @IsOptional()
  @IsNumber()
  dueDaysFromPrev?: number; // Alternative: "X days after previous milestone"

  @IsOptional()
  @IsArray()
  deliverables?: string[]; // What client receives at this milestone

  @IsOptional()
  @IsString()
  projectMilestoneId?: string; // Link to project milestone (optional)
}
