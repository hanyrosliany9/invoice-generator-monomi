import { IsOptional, IsDateString, IsArray, IsString } from 'class-validator'
import { Type } from 'class-transformer'
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
  limit?: number

  @IsOptional()
  @Type(() => Number)
  offset?: number
}
