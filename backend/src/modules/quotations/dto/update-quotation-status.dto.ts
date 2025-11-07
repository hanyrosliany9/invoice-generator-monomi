import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

export class UpdateQuotationStatusDto {
  @ApiProperty({
    description: 'New quotation status',
    enum: QuotationStatus,
    example: 'APPROVED',
  })
  @IsString()
  @IsEnum(QuotationStatus, {
    message: 'Status must be one of: DRAFT, SENT, APPROVED, DECLINED',
  })
  status: string;
}
