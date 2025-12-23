import { IsString, IsOptional, IsInt, IsEnum, IsBoolean } from 'class-validator';

export class CreateCastCallDto {
  @IsString()
  callSheetId: string;

  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() castNumber?: string;
  @IsString() actorName: string;
  @IsOptional() @IsString() character?: string;

  // === ENHANCED: Multiple Time Columns ===
  @IsOptional() @IsString() pickupTime?: string;
  @IsOptional() @IsString() muCallTime?: string;  // Makeup/Hair call
  @IsString() callTime: string;  // Legacy, kept for compatibility
  @IsOptional() @IsString() onSetTime?: string;
  @IsOptional() @IsString() wrapTime?: string;

  // === NEW: Status Code ===
  @IsOptional() @IsEnum(['SW', 'W', 'WF', 'SWF', 'H']) workStatus?: string;

  // === NEW: Enhanced Info ===
  @IsOptional() @IsString() transportMode?: string;
  @IsOptional() @IsInt() muDuration?: number;
  @IsOptional() @IsString() wardrobeNotes?: string;

  // === NEW: Flags ===
  @IsOptional() @IsBoolean() isMinor?: boolean;
  @IsOptional() @IsBoolean() hasStunt?: boolean;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateCastCallDto {
  @IsOptional() @IsString() castNumber?: string;
  @IsOptional() @IsString() actorName?: string;
  @IsOptional() @IsString() character?: string;
  @IsOptional() @IsString() pickupTime?: string;
  @IsOptional() @IsString() muCallTime?: string;
  @IsOptional() @IsString() callTime?: string;
  @IsOptional() @IsString() onSetTime?: string;
  @IsOptional() @IsString() wrapTime?: string;
  @IsOptional() @IsEnum(['SW', 'W', 'WF', 'SWF', 'H']) workStatus?: string;
  @IsOptional() @IsString() transportMode?: string;
  @IsOptional() @IsInt() muDuration?: number;
  @IsOptional() @IsString() wardrobeNotes?: string;
  @IsOptional() @IsBoolean() isMinor?: boolean;
  @IsOptional() @IsBoolean() hasStunt?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsEnum(['PENDING', 'CONFIRMED', 'ON_SET', 'WRAPPED']) status?: string;
}
