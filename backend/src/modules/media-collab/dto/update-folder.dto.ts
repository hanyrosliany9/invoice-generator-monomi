import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFolderDto {
  @ApiPropertyOptional({
    description: 'Folder name',
    example: 'Edited Footage',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Folder description',
    example: 'All edited video footage',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent folder ID (null to move to root level)',
    example: 'cmi2bfiz30003bcnso9b0891b',
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
