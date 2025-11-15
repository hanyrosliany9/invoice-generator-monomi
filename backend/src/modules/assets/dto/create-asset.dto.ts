import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDecimal,
  IsDateString,
  IsArray,
  IsJSON,
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
}
