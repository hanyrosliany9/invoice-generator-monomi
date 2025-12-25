import { IsString, IsOptional, IsInt, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class CreateStripDto {
  @IsString()
  shootDayId: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsEnum(['SCENE', 'BANNER'])
  stripType: string;

  // === SCENE DATA (when stripType = SCENE) ===
  // Scene reference
  @IsOptional() @IsString() sceneId?: string;
  @IsOptional() @IsString() sceneNumber?: string;
  @IsOptional() @IsString() sceneName?: string;
  @IsOptional() @IsString() intExt?: string;
  @IsOptional() @IsString() dayNight?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() pageCount?: number;
  @IsOptional() @IsInt() estimatedTime?: number;

  // Scene-specific flags (for scenes only)
  @IsOptional() @IsBoolean() hasStunts?: boolean;
  @IsOptional() @IsBoolean() hasMinors?: boolean;
  @IsOptional() @IsBoolean() hasAnimals?: boolean;
  @IsOptional() @IsBoolean() hasVehicles?: boolean;
  @IsOptional() @IsBoolean() hasSfx?: boolean;
  @IsOptional() @IsBoolean() hasWaterWork?: boolean;
  @IsOptional() @IsString() specialReqNotes?: string;
  @IsOptional() @IsString() specialReqContact?: string;

  // Background/Extras for this scene
  @IsOptional() @IsString() backgroundDescription?: string;
  @IsOptional() @IsInt() backgroundQty?: number;
  @IsOptional() @IsString() backgroundCallTime?: string;
  @IsOptional() @IsString() backgroundWardrobe?: string;
  @IsOptional() @IsString() backgroundNotes?: string;

  // === BANNER DATA (when stripType = BANNER) ===
  @IsOptional() @IsEnum(['DAY_BREAK', 'MEAL_BREAK', 'COMPANY_MOVE', 'NOTE']) bannerType?: string;
  @IsOptional() @IsString() bannerText?: string;
  @IsOptional() @IsString() bannerColor?: string;

  // Meal break data (when bannerType = MEAL_BREAK)
  @IsOptional() @IsString() mealType?: string; // "BREAKFAST", "LUNCH", "SECOND_MEAL"
  @IsOptional() @IsString() mealTime?: string; // "12:00 PM"
  @IsOptional() @IsInt() mealDuration?: number; // 30 minutes
  @IsOptional() @IsString() mealLocation?: string; // "Craft Services Tent"

  // Company move data (when bannerType = COMPANY_MOVE)
  @IsOptional() @IsString() moveTime?: string; // "2:00 PM"
  @IsOptional() @IsString() moveFromLocation?: string; // "Downtown Studio"
  @IsOptional() @IsString() moveToLocation?: string; // "Warehouse Location"
  @IsOptional() @IsInt() moveTravelTime?: number; // 45 minutes
  @IsOptional() @IsString() moveNotes?: string; // "Shuttle buses provided"
}
