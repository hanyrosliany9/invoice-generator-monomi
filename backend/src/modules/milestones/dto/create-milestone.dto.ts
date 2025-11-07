import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsISO8601,
  IsEnum,
  IsDecimal,
  Min,
  Max,
} from 'class-validator';
import { MilestonePriority } from '@prisma/client';

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Project ID this milestone belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Milestone number (1, 2, 3...)', minimum: 1 })
  @IsInt()
  @Min(1)
  milestoneNumber: number;

  @ApiProperty({ description: 'Milestone name (e.g., "Design Phase")' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Indonesian name (e.g., "Fase Desain")',
  })
  @IsOptional()
  @IsString()
  nameId?: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Indonesian description' })
  @IsOptional()
  @IsString()
  descriptionId?: string;

  @ApiProperty({ description: 'Planned start date (ISO 8601 format)' })
  @IsISO8601()
  plannedStartDate: string;

  @ApiProperty({ description: 'Planned end date (ISO 8601 format)' })
  @IsISO8601()
  plannedEndDate: string;

  @ApiPropertyOptional({
    description: 'Planned revenue allocated to this milestone (auto-calculated if not provided)',
    example: 5000000,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  plannedRevenue?: number;

  @ApiPropertyOptional({
    description: 'Estimated cost for this milestone',
    example: 3000000,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  estimatedCost?: number;

  @ApiPropertyOptional({
    description: 'Milestone priority',
    enum: MilestonePriority,
    default: 'MEDIUM',
  })
  @IsOptional()
  @IsEnum(MilestonePriority)
  priority?: MilestonePriority;

  @ApiPropertyOptional({
    description: 'Predecessor milestone ID (dependency)',
  })
  @IsOptional()
  @IsString()
  predecessorId?: string;

  @ApiPropertyOptional({
    description: 'Deliverables for this milestone (JSON array)',
  })
  @IsOptional()
  deliverables?: any;

  @ApiPropertyOptional({ description: 'Notes for this milestone' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Indonesian notes' })
  @IsOptional()
  @IsString()
  notesId?: string;
}
