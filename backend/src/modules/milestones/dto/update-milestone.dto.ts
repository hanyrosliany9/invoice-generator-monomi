import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsISO8601, IsDecimal, Min, Max, IsInt, IsString } from 'class-validator';
import { CreateMilestoneDto } from './create-milestone.dto';
import { MilestoneStatus } from '@prisma/client';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiPropertyOptional({ description: 'Actual start date (ISO 8601 format)' })
  @IsOptional()
  @IsISO8601()
  actualStartDate?: string;

  @ApiPropertyOptional({ description: 'Actual end date (ISO 8601 format)' })
  @IsOptional()
  @IsISO8601()
  actualEndDate?: string;

  @ApiPropertyOptional({
    description: 'Completion percentage (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Min(0)
  @Max(100)
  completionPercentage?: number;

  @ApiPropertyOptional({ description: 'Actual cost incurred' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Milestone status' })
  @IsOptional()
  status?: MilestoneStatus;

  @ApiPropertyOptional({ description: 'Days delayed from planned schedule' })
  @IsOptional()
  @IsInt()
  delayDays?: number;

  @ApiPropertyOptional({ description: 'Reason for delay' })
  @IsOptional()
  @IsString()
  delayReason?: string;

  @ApiPropertyOptional({ description: 'Client who accepted milestone' })
  @IsOptional()
  @IsString()
  acceptedBy?: string;

  @ApiPropertyOptional({ description: 'Acceptance timestamp (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  acceptedAt?: string;
}
