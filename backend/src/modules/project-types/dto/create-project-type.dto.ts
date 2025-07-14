import { IsString, IsOptional, IsBoolean, IsInt, IsHexColor } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectTypeDto {
  @ApiProperty({
    description: 'Unique code for the project type',
    example: 'PRODUCTION',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Display name for the project type',
    example: 'Production Work',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the project type',
    example: 'Website development, software development, and other production tasks',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Prefix for project numbers',
    example: 'PH',
  })
  @IsString()
  prefix: string;

  @ApiProperty({
    description: 'Color for UI display',
    example: '#52c41a',
    default: '#1890ff',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({
    description: 'Whether this is the default project type',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Sort order for display',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}