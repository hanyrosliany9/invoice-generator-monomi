import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { EFakturStatus, ApprovalStatus } from "@prisma/client";

export class CreateVendorInvoiceItemDto {
  @ApiPropertyOptional({ description: "PO Item ID for matching" })
  @IsOptional()
  @IsString()
  poItemId?: string;

  @ApiProperty({ description: "Line number", example: 1 })
  @IsNumber()
  @Min(1)
  lineNumber: number;

  @ApiProperty({ description: "Item description", example: "Office Supplies" })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: "Indonesian description" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionId?: string;

  @ApiProperty({ description: "Quantity invoiced", example: 100 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: "Unit of measure", example: "pcs" })
  @IsString()
  @MaxLength(20)
  unit: string;

  @ApiProperty({ description: "Unit price", example: 50000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: "Discount amount", example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: "Line total (before PPN)", example: 4950000 })
  @IsNumber()
  @Min(0)
  lineTotal: number;

  @ApiProperty({ description: "PPN amount for this line", example: 594000 })
  @IsNumber()
  @Min(0)
  ppnAmount: number;

  @ApiPropertyOptional({ description: "Variance reason if not matching" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  varianceReason?: string;
}

export class CreateVendorInvoiceDto {
  // ===== REFERENCE =====

  @ApiProperty({ description: "Vendor invoice number (from vendor)" })
  @IsString()
  @MaxLength(100)
  vendorInvoiceNumber: string;

  @ApiProperty({ description: "Invoice date" })
  @IsDate()
  @Type(() => Date)
  invoiceDate: Date;

  @ApiProperty({ description: "Vendor ID" })
  @IsString()
  vendorId: string;

  @ApiPropertyOptional({ description: "Purchase Order ID for matching" })
  @IsOptional()
  @IsString()
  poId?: string;

  @ApiPropertyOptional({ description: "Goods Receipt ID for matching" })
  @IsOptional()
  @IsString()
  grId?: string;

  // ===== LINE ITEMS =====

  @ApiProperty({
    description: "Invoice line items",
    type: [CreateVendorInvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVendorInvoiceItemDto)
  items: CreateVendorInvoiceItemDto[];

  // ===== FINANCIAL =====

  @ApiProperty({ description: "Subtotal (before tax)", example: 10000000 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: "Discount amount", example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: "PPN amount", example: 1140000 })
  @IsNumber()
  @Min(0)
  ppnAmount: number;

  @ApiPropertyOptional({ description: "PPh amount", example: 200000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pphAmount?: number;

  @ApiProperty({ description: "Total amount", example: 10640000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  // ===== INDONESIAN E-FAKTUR =====

  @ApiPropertyOptional({
    description: "E-Faktur NSFP (Nomor Seri Faktur Pajak)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  eFakturNSFP?: string;

  @ApiPropertyOptional({ description: "E-Faktur QR Code" })
  @IsOptional()
  @IsString()
  eFakturQRCode?: string;

  @ApiProperty({
    description: "E-Faktur status",
    enum: EFakturStatus,
    default: "NOT_REQUIRED",
  })
  @IsEnum(EFakturStatus)
  eFakturStatus: EFakturStatus;

  // ===== PAYMENT TERMS =====

  @ApiProperty({ description: "Payment terms", example: "NET 30" })
  @IsString()
  @MaxLength(100)
  paymentTerms: string;

  @ApiProperty({ description: "Due date" })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  // ===== APPROVAL =====

  @ApiProperty({
    description: "Approval status",
    enum: ApprovalStatus,
    default: "PENDING",
  })
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus;

  // ===== NOTES =====

  @ApiPropertyOptional({ description: "Description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Indonesian description" })
  @IsOptional()
  @IsString()
  descriptionId?: string;

  @ApiPropertyOptional({ description: "Internal notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
