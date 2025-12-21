import { IsString, IsOptional, IsUUID, IsInt, IsDateString } from 'class-validator';

export class CreateShootDayDto {
  @IsUUID()
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
