import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Slide ID' })
  @IsString()
  slideId: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'X position on slide (%)' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y position on slide (%)' })
  @IsOptional()
  @IsNumber()
  positionY?: number;
}
