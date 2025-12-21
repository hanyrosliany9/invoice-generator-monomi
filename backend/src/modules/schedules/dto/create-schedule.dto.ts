import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  shotListId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  pagesPerDay?: number;
}
