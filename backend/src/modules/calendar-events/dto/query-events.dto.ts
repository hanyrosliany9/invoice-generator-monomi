import { IsOptional, IsDateString, IsArray, IsString, Type } from 'class-validator'
import { EventCategory } from '@prisma/client'

export class QueryEventsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsArray()
  categories?: EventCategory[]

  @IsOptional()
  @IsString()
  projectId?: string

  @IsOptional()
  @IsString()
  assigneeId?: string

  @IsOptional()
  @Type(() => Number)
  limit?: number = 100

  @IsOptional()
  @Type(() => Number)
  offset?: number = 0
}
