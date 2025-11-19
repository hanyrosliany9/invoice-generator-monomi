import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMediaProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Q4 2024 Marketing Campaign',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Video and photo assets for Q4 marketing materials',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Client ID to link this media project to',
    example: 'clxxxx123',
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Business project ID to link this media project to',
    example: 'clxxxx456',
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Folder ID for organization',
    example: 'clxxxx789',
  })
  @IsString()
  @IsOptional()
  folderId?: string;
}
