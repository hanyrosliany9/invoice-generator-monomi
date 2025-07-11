import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class ApplyMateraiDto {
  @ApiProperty({
    description: 'Notes about the materai application',
    required: false,
    example: 'Materai applied as required by Indonesian law'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Force application even if validation fails',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
