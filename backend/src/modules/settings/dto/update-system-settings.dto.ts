import { IsOptional, IsString, IsNumber, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ description: "Default payment terms" })
  @IsOptional()
  @IsString()
  defaultPaymentTerms?: string;

  @ApiPropertyOptional({ description: "Materai threshold amount" })
  @IsOptional()
  @IsNumber()
  materaiThreshold?: number;

  @ApiPropertyOptional({ description: "Invoice number prefix" })
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @ApiPropertyOptional({ description: "Quotation number prefix" })
  @IsOptional()
  @IsString()
  quotationPrefix?: string;

  @ApiPropertyOptional({ description: "Auto backup enabled" })
  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @ApiPropertyOptional({ description: "Backup frequency" })
  @IsOptional()
  @IsString()
  backupFrequency?: string;

  @ApiPropertyOptional({ description: "Backup time" })
  @IsOptional()
  @IsString()
  backupTime?: string;

  @ApiPropertyOptional({ description: "Auto materai reminder enabled" })
  @IsOptional()
  @IsBoolean()
  autoMateraiReminder?: boolean;

  @ApiPropertyOptional({ description: "Default currency" })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}
