import { IsOptional, IsString, IsEmail } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ description: "Company name" })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: "Company address" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "Company phone" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "Company email" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Company website" })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: "Tax number (NPWP)" })
  @IsOptional()
  @IsString()
  taxNumber?: string;

  @ApiPropertyOptional({ description: "Company currency" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: "Bank account holder name (Rekening atas nama)",
  })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiPropertyOptional({ description: "Bank 1 name (e.g., Bank BCA Digital)" })
  @IsOptional()
  @IsString()
  bank1Name?: string;

  @ApiPropertyOptional({ description: "Bank 1 account number" })
  @IsOptional()
  @IsString()
  bank1Number?: string;

  @ApiPropertyOptional({ description: "Bank 2 name" })
  @IsOptional()
  @IsString()
  bank2Name?: string;

  @ApiPropertyOptional({ description: "Bank 2 account number" })
  @IsOptional()
  @IsString()
  bank2Number?: string;

  @ApiPropertyOptional({ description: "Bank 3 name" })
  @IsOptional()
  @IsString()
  bank3Name?: string;

  @ApiPropertyOptional({ description: "Bank 3 account number" })
  @IsOptional()
  @IsString()
  bank3Number?: string;
}
