import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsNumber, IsArray, Min, Max } from 'class-validator';

export class UpdateMateraiConfigDto {
  @ApiProperty({
    description: 'Enable or disable materai system',
    required: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Threshold amount in IDR for materai requirement',
    required: false,
    example: 5000000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @ApiProperty({
    description: 'Stamp duty amount in IDR',
    required: false,
    example: 10000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stampDutyAmount?: number;

  @ApiProperty({
    description: 'Enforce compliance checks',
    required: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enforceCompliance?: boolean;

  @ApiProperty({
    description: 'Days before due date to send reminders',
    required: false,
    type: [Number],
    example: [30, 14, 7, 3, 1]
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  reminderDays?: number[];

  @ApiProperty({
    description: 'Automatically apply materai when invoice is created',
    required: false,
    example: false
  })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}
