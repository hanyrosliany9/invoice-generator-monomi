import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { InspectionStatus, QualityStatus } from "@prisma/client";

export class CreateGoodsReceiptItemDto {
  @ApiProperty({ description: "PO Item ID to receive against" })
  @IsString()
  poItemId: string;

  @ApiProperty({ description: "Line number", example: 1 })
  @IsNumber()
  @Min(1)
  lineNumber: number;

  @ApiProperty({ description: "Ordered quantity (from PO)", example: 100 })
  @IsNumber()
  @Min(0)
  orderedQuantity: number;

  @ApiProperty({ description: "Quantity received", example: 100 })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @ApiProperty({ description: "Quantity accepted", example: 95 })
  @IsNumber()
  @Min(0)
  acceptedQuantity: number;

  @ApiPropertyOptional({ description: "Quantity rejected", example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @ApiProperty({
    description: "Quality status",
    enum: QualityStatus,
    default: "PENDING",
  })
  @IsEnum(QualityStatus)
  qualityStatus: QualityStatus;

  @ApiPropertyOptional({ description: "Rejection reason if any" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @ApiProperty({ description: "Unit price (from PO)", example: 50000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({
    description: "Line total (accepted qty * unit price)",
    example: 4750000,
  })
  @IsNumber()
  @Min(0)
  lineTotal: number;
}

export class CreateGoodsReceiptDto {
  // ===== REFERENCE =====

  @ApiProperty({ description: "Purchase Order ID" })
  @IsString()
  poId: string;

  @ApiProperty({ description: "GR date" })
  @IsDate()
  @Type(() => Date)
  grDate: Date;

  // ===== DELIVERY DETAILS =====

  @ApiPropertyOptional({ description: "Vendor delivery note number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryNoteNumber?: string;

  @ApiProperty({ description: "Received by (user ID)" })
  @IsString()
  receivedBy: string;

  @ApiPropertyOptional({ description: "Warehouse location" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  warehouseLocation?: string;

  // ===== QUALITY CHECK =====

  @ApiProperty({
    description: "Inspection status",
    enum: InspectionStatus,
    default: "PENDING",
  })
  @IsEnum(InspectionStatus)
  inspectionStatus: InspectionStatus;

  @ApiPropertyOptional({ description: "Inspected by (user ID)" })
  @IsOptional()
  @IsString()
  inspectedBy?: string;

  @ApiPropertyOptional({ description: "Inspection notes" })
  @IsOptional()
  @IsString()
  inspectionNotes?: string;

  // ===== LINE ITEMS =====

  @ApiProperty({
    description: "GR line items",
    type: [CreateGoodsReceiptItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items: CreateGoodsReceiptItemDto[];

  // ===== NOTES =====

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Indonesian notes" })
  @IsOptional()
  @IsString()
  notesId?: string;
}
