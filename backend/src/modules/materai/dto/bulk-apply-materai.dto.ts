import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';

export class BulkApplyMateraiDto {
  @ApiProperty({
    description: 'Array of invoice IDs to apply materai to',
    type: [String],
    example: ['inv-001', 'inv-002', 'inv-003']
  })
  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[];

  @ApiProperty({
    description: 'Notes about the bulk materai application',
    required: false,
    example: 'Bulk materai application for Q1 2024 invoices'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Force application even if some validations fail',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
