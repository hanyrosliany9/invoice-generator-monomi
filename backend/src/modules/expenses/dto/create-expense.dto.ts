import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseClass, PPNCategory, EFakturStatus, WithholdingTaxType } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Expense description (primary)' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Indonesian description (Uraian)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionId?: string;

  @ApiPropertyOptional({ description: 'English description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  // ===== AMOUNTS =====

  @ApiProperty({ description: 'Gross amount (before PPN)', example: 1000000 })
  @IsNumber()
  @Min(0)
  grossAmount: number;

  @ApiProperty({ description: 'PPN amount', example: 110000 })
  @IsNumber()
  @Min(0)
  ppnAmount: number;

  @ApiPropertyOptional({ description: 'Withholding tax amount', example: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withholdingAmount?: number;

  @ApiProperty({ description: 'Net payment amount', example: 1090000 })
  @IsNumber()
  @Min(0)
  netAmount: number;

  @ApiProperty({ description: 'Total amount (gross + PPN)', example: 1110000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  // ===== PSAK CHART OF ACCOUNTS =====

  @ApiProperty({ description: 'Expense category ID' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'PSAK account code', example: '6-2050' })
  @IsString()
  @Matches(/^[6-8]-\d{4}$/, { message: 'Invalid PSAK account code format' })
  accountCode: string;

  @ApiProperty({ description: 'Indonesian account name', example: 'Perlengkapan Kantor' })
  @IsString()
  accountName: string;

  @ApiPropertyOptional({ description: 'English account name', example: 'Office Supplies' })
  @IsOptional()
  @IsString()
  accountNameEn?: string;

  @ApiProperty({ description: 'Expense class', enum: ExpenseClass })
  @IsEnum(ExpenseClass)
  expenseClass: ExpenseClass;

  // ===== TAX INFORMATION =====

  @ApiProperty({ description: 'PPN rate (0.11 or 0.12)', example: 0.11 })
  @IsNumber()
  @Min(0)
  ppnRate: number;

  @ApiProperty({ description: 'PPN category', enum: PPNCategory })
  @IsEnum(PPNCategory)
  ppnCategory: PPNCategory;

  @ApiProperty({ description: 'Is luxury goods (12% PPN)', default: false })
  @IsBoolean()
  isLuxuryGoods: boolean;

  @ApiPropertyOptional({ description: 'Withholding tax type', enum: WithholdingTaxType })
  @IsOptional()
  @IsEnum(WithholdingTaxType)
  withholdingTaxType?: WithholdingTaxType;

  @ApiPropertyOptional({ description: 'Withholding tax rate', example: 0.02 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withholdingTaxRate?: number;

  @ApiProperty({ description: 'Is tax deductible', default: true })
  @IsBoolean()
  isTaxDeductible: boolean;

  // ===== E-FAKTUR =====

  @ApiPropertyOptional({ description: 'e-Faktur NSFP', example: '010.123-25.12345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}-\d{2}\.\d{8}$/, { message: 'Invalid NSFP format' })
  eFakturNSFP?: string;

  @ApiPropertyOptional({ description: 'e-Faktur QR code data' })
  @IsOptional()
  @IsString()
  eFakturQRCode?: string;

  @ApiPropertyOptional({ description: 'DGT approval code' })
  @IsOptional()
  @IsString()
  eFakturApprovalCode?: string;

  @ApiProperty({ description: 'e-Faktur status', enum: EFakturStatus, default: 'NOT_REQUIRED' })
  @IsEnum(EFakturStatus)
  eFakturStatus: EFakturStatus;

  // ===== VENDOR INFORMATION =====

  @ApiProperty({ description: 'Vendor name' })
  @IsString()
  @MaxLength(200)
  vendorName: string;

  @ApiPropertyOptional({ description: 'Vendor NPWP', example: '01.234.567.8-901.000' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/, { message: 'Invalid NPWP format' })
  vendorNPWP?: string;

  @ApiPropertyOptional({ description: 'Vendor address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vendorAddress?: string;

  @ApiPropertyOptional({ description: 'Vendor phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vendorPhone?: string;

  @ApiPropertyOptional({ description: 'Vendor bank' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorBank?: string;

  @ApiPropertyOptional({ description: 'Vendor account number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vendorAccountNo?: string;

  @ApiPropertyOptional({ description: 'Vendor account holder name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorAccountName?: string;

  // ===== DATE & TRACKING =====

  @ApiProperty({ description: 'Expense date' })
  @IsDate()
  @Type(() => Date)
  expenseDate: Date;

  @ApiProperty({ description: 'Currency', default: 'IDR' })
  @IsString()
  @MaxLength(3)
  currency: string;

  // ===== RELATIONSHIPS =====

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  // ===== BILLABLE =====

  @ApiProperty({ description: 'Is billable to client', default: false })
  @IsBoolean()
  isBillable: boolean;

  @ApiPropertyOptional({ description: 'Billable amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  billableAmount?: number;

  // ===== TAGS & NOTES =====

  @ApiPropertyOptional({ description: 'Custom tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Indonesian notes' })
  @IsOptional()
  @IsString()
  notesId?: string;

  @ApiPropertyOptional({ description: 'English notes' })
  @IsOptional()
  @IsString()
  notesEn?: string;

  @ApiPropertyOptional({ description: 'Receipt number from merchant' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiptNumber?: string;

  @ApiPropertyOptional({ description: 'Merchant name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  merchantName?: string;

  @ApiPropertyOptional({ description: 'Location of expense' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  // ===== BUKTI POTONG (WITHHOLDING TAX) =====

  @ApiPropertyOptional({ description: 'Bukti Potong number', example: 'BP-2025-00001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  buktiPotongNumber?: string;

  @ApiPropertyOptional({ description: 'Bukti Potong date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  buktiPotongDate?: Date;
}
