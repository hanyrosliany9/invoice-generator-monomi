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

  // === NEW: Day Context ===
  @IsOptional() @IsInt() dayNumber?: number;
  @IsOptional() @IsInt() totalDays?: number;

  @IsDateString()
  shootDate: string;

  // === Key Times (both old and new names for backward compatibility) ===
  @IsOptional() @IsString() generalCallTime?: string; // Deprecated, use crewCallTime
  @IsOptional() @IsString() crewCallTime?: string;
  @IsOptional() @IsString() firstShotTime?: string;
  @IsOptional() @IsString() wrapTime?: string; // Deprecated, use estimatedWrap
  @IsOptional() @IsString() estimatedWrap?: string;
  @IsOptional() @IsString() lunchTime?: string;

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

  // === NEW: Production Details ===
  @IsOptional() @IsString() advanceNotes?: string;
  @IsOptional() @IsString() safetyNotes?: string;
  @IsOptional() @IsString() announcements?: string;
  @IsOptional() @IsString() walkieChannels?: string;

  @IsOptional() @IsString() generalNotes?: string;
  @IsOptional() @IsString() productionNotes?: string;
}
