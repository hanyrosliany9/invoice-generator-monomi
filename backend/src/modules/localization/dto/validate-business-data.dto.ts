import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateBusinessDataDto {
  @ApiProperty({
    description: 'Indonesian phone number to validate',
    example: '+6281234567890',
    required: false
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Indonesian business license number (NPWP) to validate',
    example: '01.234.567.8-901.000',
    required: false
  })
  @IsOptional()
  @IsString()
  npwp?: string;
}
