import { IsString, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  shotListId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  pagesPerDay?: number;
}
