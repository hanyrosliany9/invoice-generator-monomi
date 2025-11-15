import { IsOptional, IsString, IsISO8601, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRangeEnum {
  THIRTY_DAYS = '30days',
  NINETY_DAYS = '90days',
  ONE_YEAR = '1year',
  CUSTOM = 'custom',
}

export class MilestoneAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific project ID',
    example: 'cle1234567890abcdefgh',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Start date for analytics period (ISO 8601)',
    example: '2025-08-10T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics period (ISO 8601)',
    example: '2025-11-10T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Predefined time range',
    enum: TimeRangeEnum,
    example: TimeRangeEnum.NINETY_DAYS,
  })
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  timeRange?: TimeRangeEnum;
}
