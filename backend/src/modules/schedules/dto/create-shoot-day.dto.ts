import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateShootDayDto {
  @IsString()
  scheduleId: string;

  @IsInt()
  dayNumber: number;

  @IsOptional()
  @IsDateString()
  shootDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
