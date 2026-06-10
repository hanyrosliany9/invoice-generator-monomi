import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDecimal,
  IsDateString,
  IsArray,
  IsJSON,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsOptional()
  specifications?: any;

  @IsDateString()
  @IsNotEmpty()
  purchaseDate: string;

  @IsNotEmpty()
  purchasePrice: number;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsDateString()
  @IsOptional()
  warrantyExpiration?: string;

  @IsOptional()
  usefulLifeYears?: number;

  // Indonesian fiscal depreciation group (Kelompok I-IV). When set, drives the
  // straight-line useful life (I=4, II=8, III=16, IV=20 years).
  @IsString()
  @IsOptional()
  depreciationGroup?: string;

  @IsOptional()
  residualValue?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsArray()
  @IsOptional()
  documents?: string[];

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  createdById?: string;

  /**
   * Payment source for the asset purchase journal entry.
   *
   * CASH  → credits 1-1010 (Kas)
   * BANK  → credits 1-1020 (Rekening Bank)
   * CREDIT → credits 2-1010 (Accounts Payable / Hutang Usaha)
   *
   * Defaults to CASH (consistent with the expense module default).
   */
  @IsIn(["CASH", "BANK", "CREDIT"])
  @IsOptional()
  paymentSource?: "CASH" | "BANK" | "CREDIT";
}
