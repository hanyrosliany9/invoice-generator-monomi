export * from './create-goods-receipt.dto';
export * from './update-goods-receipt.dto';
export * from './goods-receipt-query.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { InspectionStatus } from '@prisma/client';

export class InspectGoodsReceiptDto {
  @ApiProperty({ description: 'Inspection status', enum: InspectionStatus })
  @IsEnum(InspectionStatus)
  inspectionStatus: InspectionStatus;

  @ApiPropertyOptional({ description: 'Inspection notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  inspectionNotes?: string;
}

export class PostGoodsReceiptDto {
  @ApiPropertyOptional({ description: 'Posting notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelGoodsReceiptDto {
  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  @MaxLength(500)
  cancellationReason: string;
}
