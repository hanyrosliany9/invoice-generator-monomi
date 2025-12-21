import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateCallSheetDto {
  @IsString()
  scheduleId: string;

  @IsString()
  shootDayId: string;

  @IsOptional() @IsInt() callSheetNumber?: number;
  @IsOptional() @IsString() productionName?: string;
  @IsOptional() @IsString() director?: string;
  @IsOptional() @IsString() producer?: string;

  @IsDateString()
  shootDate: string;

  @IsOptional() @IsString() generalCallTime?: string;
  @IsOptional() @IsString() firstShotTime?: string;
  @IsOptional() @IsString() wrapTime?: string;

  @IsOptional() @IsString() locationName?: string;
  @IsOptional() @IsString() locationAddress?: string;
  @IsOptional() @IsString() parkingNotes?: string;
  @IsOptional() @IsString() mapUrl?: string;

  @IsOptional() @IsInt() weatherHigh?: number;
  @IsOptional() @IsInt() weatherLow?: number;
  @IsOptional() @IsString() weatherCondition?: string;
  @IsOptional() @IsString() sunrise?: string;
  @IsOptional() @IsString() sunset?: string;

  @IsOptional() @IsString() nearestHospital?: string;
  @IsOptional() @IsString() hospitalAddress?: string;
  @IsOptional() @IsString() hospitalPhone?: string;

  @IsOptional() @IsString() generalNotes?: string;
  @IsOptional() @IsString() productionNotes?: string;
}
