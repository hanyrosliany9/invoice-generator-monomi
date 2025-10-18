import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { Type } from 'class-transformer';
import { POItemType, WithholdingTaxType, ApprovalStatus } from '@prisma/client';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ description: 'Line number', example: 1 })
  @IsNumber()
  @Min(1)
  lineNumber: number;

  @ApiProperty({ description: 'Item type', enum: POItemType })
  @IsEnum(POItemType)
  itemType: POItemType;

  @ApiPropertyOptional({ description: 'Item code/SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemCode?: string;

  @ApiProperty({ description: 'Item description', example: 'Office Chair' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Indonesian description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionId?: string;

  @ApiProperty({ description: 'Quantity ordered', example: 10 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: 'Unit of measure', example: 'pcs' })
  @IsString()
  @MaxLength(20)
  unit: string;

  @ApiProperty({ description: 'Unit price', example: 500000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Discount percentage', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Discount amount', example: 25000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: 'Line total (before PPN)', example: 4750000 })
  @IsNumber()
  @Min(0)
  lineTotal: number;

  @ApiProperty({ description: 'PPN amount for this line', example: 570000 })
  @IsNumber()
  @Min(0)
  ppnAmount: number;

  @ApiProperty({ description: 'Quantity outstanding', example: 10 })
  @IsNumber()
  @Min(0)
  quantityOutstanding: number;

  @ApiPropertyOptional({ description: 'Expense category ID' })
  @IsOptional()
  @IsString()
  expenseCategoryId?: string;

  @ApiPropertyOptional({ description: 'Asset ID if linking to existing asset' })
  @IsOptional()
  @IsString()
  assetId?: string;
}

export class CreatePurchaseOrderDto {
  // ===== BASIC INFORMATION =====

  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'PO date' })
  @IsDate()
  @Type(() => Date)
  poDate: Date;

  // ===== PROJECT LINK =====

  @ApiPropertyOptional({ description: 'Project ID for tracking' })
  @IsOptional()
  @IsString()
  projectId?: string;

  // ===== LINE ITEMS =====

  @ApiProperty({ description: 'PO line items', type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];

  // ===== FINANCIAL SUMMARY =====

  @ApiProperty({ description: 'Subtotal (before tax)', example: 10000000 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Discount amount', example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: 'PPN amount', example: 1140000 })
  @IsNumber()
  @Min(0)
  ppnAmount: number;

  @ApiPropertyOptional({ description: 'PPh amount', example: 200000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pphAmount?: number;

  @ApiProperty({ description: 'Total amount', example: 10640000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  // ===== TAX =====

  @ApiProperty({ description: 'Is PPN included', default: true })
  @IsBoolean()
  isPPNIncluded: boolean;

  @ApiProperty({ description: 'PPN rate (%)', example: 12, default: 12 })
  @IsNumber()
  @Min(0)
  ppnRate: number;

  @ApiProperty({ description: 'Withholding tax type', enum: WithholdingTaxType, default: 'NONE' })
  @IsEnum(WithholdingTaxType)
  withholdingTaxType: WithholdingTaxType;

  @ApiPropertyOptional({ description: 'Withholding tax rate', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withholdingTaxRate?: number;

  // ===== DELIVERY & PAYMENT =====

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Delivery date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deliveryDate?: Date;

  @ApiProperty({ description: 'Payment terms', example: 'NET 30', default: 'NET 30' })
  @IsString()
  @MaxLength(100)
  paymentTerms: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  // ===== NOTES =====

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Indonesian description' })
  @IsOptional()
  @IsString()
  descriptionId?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  termsConditions?: string;

  // ===== WORKFLOW =====

  @ApiProperty({ description: 'Requested by user ID' })
  @IsString()
  requestedBy: string;

  @ApiProperty({ description: 'Approval status', enum: ApprovalStatus, default: 'PENDING' })
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus;
}
