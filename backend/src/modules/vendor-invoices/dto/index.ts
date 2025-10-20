export * from "./create-vendor-invoice.dto";
export * from "./update-vendor-invoice.dto";
export * from "./vendor-invoice-query.dto";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
} from "class-validator";

export class MatchVendorInvoiceDto {
  @ApiPropertyOptional({ description: "Matching notes" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  matchingNotes?: string;

  @ApiPropertyOptional({
    description: "Price tolerance %",
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceTolerance?: number = 5;

  @ApiPropertyOptional({
    description: "Quantity tolerance %",
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityTolerance?: number = 2;
}

export class ApproveVendorInvoiceDto {
  @ApiPropertyOptional({ description: "Approval notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RejectVendorInvoiceDto {
  @ApiProperty({ description: "Rejection reason" })
  @IsString()
  @MaxLength(500)
  rejectionReason: string;
}

export class PostVendorInvoiceDto {
  @ApiPropertyOptional({ description: "Posting notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelVendorInvoiceDto {
  @ApiProperty({ description: "Cancellation reason" })
  @IsString()
  @MaxLength(500)
  cancellationReason: string;
}
