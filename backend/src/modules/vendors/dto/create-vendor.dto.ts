import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsEmail,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { VendorType, PKPStatus } from '@prisma/client';

export class CreateVendorDto {
  // ===== BASIC INFORMATION =====

  @ApiProperty({ description: 'Vendor name', example: 'PT Mitra Sejahtera' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Vendor code (auto-generated if not provided)', example: 'VEN-2025-00001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vendorCode?: string;

  @ApiProperty({ description: 'Vendor type', enum: VendorType })
  @IsEnum(VendorType)
  vendorType: VendorType;

  @ApiPropertyOptional({ description: 'Industry type', example: 'Office Supplies' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industryType?: string;

  // ===== CONTACT INFORMATION =====

  @ApiPropertyOptional({ description: 'Primary contact person name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;


  // ===== ADDRESS =====

  @ApiProperty({ description: 'Street address' })
  @IsString()
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiProperty({ description: 'Country', default: 'Indonesia' })
  @IsString()
  @MaxLength(100)
  country: string;

  // ===== INDONESIAN TAX INFORMATION =====

  @ApiProperty({ description: 'PKP status (VAT registration status)', enum: PKPStatus })
  @IsEnum(PKPStatus)
  pkpStatus: PKPStatus;

  @ApiPropertyOptional({
    description: 'NPWP (15 digits, required if PKP)',
    example: '012345678901000'
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, { message: 'NPWP must be exactly 15 digits' })
  npwp?: string;

  @ApiPropertyOptional({ description: 'Tax address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  taxAddress?: string;

  // ===== PAYMENT INFORMATION =====

  @ApiProperty({ description: 'Currency', default: 'IDR' })
  @IsString()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ description: 'Payment terms', example: 'NET 30', default: 'NET 30' })
  @IsString()
  @MaxLength(50)
  paymentTerms: string;

  // ===== BANKING INFORMATION =====

  @ApiPropertyOptional({ description: 'Bank name', example: 'Bank Mandiri' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank branch' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank account holder name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankAccountName?: string;

  @ApiPropertyOptional({ description: 'Swift code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string;

  // ===== CREDIT LIMITS =====

  @ApiPropertyOptional({ description: 'Credit limit amount', example: 100000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;


  // ===== STATUS =====

  @ApiProperty({ description: 'Is vendor active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Is PKP (VAT registered)', default: false })
  @IsBoolean()
  isPKP: boolean;
}
