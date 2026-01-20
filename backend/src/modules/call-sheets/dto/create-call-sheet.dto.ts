import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  IsEnum,
} from "class-validator";

export class CreateCallSheetDto {
  @IsOptional() @IsEnum(["FILM", "PHOTO"]) callSheetType?: string;

  @IsOptional()
  @IsString()
  scheduleId?: string;

  @IsOptional()
  @IsString()
  shootDayId?: string;

  @IsOptional() @IsInt() callSheetNumber?: number;
  @IsOptional() @IsString() productionName?: string;
  @IsOptional() @IsString() director?: string;
  @IsOptional() @IsString() producer?: string;

  // === NEW: Production Company/Personnel Info (PDF Export Upgrade) ===
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() companyAddress?: string;
  @IsOptional() @IsString() upm?: string; // Unit Production Manager
  @IsOptional() @IsString() firstAd?: string;
  @IsOptional() @IsString() secondAd?: string;
  @IsOptional() @IsString() secondAdPhone?: string;
  @IsOptional() @IsString() productionOfficePhone?: string;
  @IsOptional() @IsString() setMedic?: string;
  @IsOptional() @IsString() setMedicPhone?: string;

  // === NEW: Version Tracking (PDF Export Upgrade) ===
  @IsOptional() @IsString() scriptVersion?: string; // "WHITE", "BLUE", "PINK", etc.
  @IsOptional() @IsString() scheduleVersion?: string;

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
  @IsOptional() @IsNumber() locationLat?: number; // Latitude from Google Places
  @IsOptional() @IsNumber() locationLng?: number; // Longitude from Google Places
  @IsOptional() @IsString() parkingNotes?: string;
  @IsOptional() @IsString() mapUrl?: string;

  // === NEW: Logistics Row Fields (PDF Export Upgrade) ===
  @IsOptional() @IsString() crewParking?: string; // "Lot A at 1808 Miller Rd"
  @IsOptional() @IsString() basecamp?: string; // "Zeke's House"
  @IsOptional() @IsString() bathrooms?: string; // "On Site" / "Porta-potties at Location B"
  @IsOptional() @IsString() lunchLocation?: string; // "Craft Services Tent"
  @IsOptional() @IsString() workingTrucks?: string; // "Back Lot" / "Truck Parking Area"

  @IsOptional() @IsInt() weatherHigh?: number;
  @IsOptional() @IsInt() weatherLow?: number;
  @IsOptional() @IsString() weatherCondition?: string;
  @IsOptional() @IsString() sunrise?: string;
  @IsOptional() @IsString() sunset?: string;

  @IsOptional() @IsString() nearestHospital?: string;
  @IsOptional() @IsString() hospitalAddress?: string;
  @IsOptional() @IsString() hospitalPhone?: string;

  // === NEW: Department Notes (PDF Export Upgrade) ===
  @IsOptional() @IsString() artNotes?: string; // Art Dept/Props notes
  @IsOptional() @IsString() vehicleNotes?: string; // Vehicle/Picture Car notes
  @IsOptional() @IsString() cameraGripNotes?: string; // Camera/Grip notes
  @IsOptional() @IsString() stuntNotes?: string; // Stunt notes

  // === NEW: Production Details ===
  @IsOptional() @IsString() advanceNotes?: string;
  @IsOptional() @IsString() safetyNotes?: string;
  @IsOptional() @IsString() announcements?: string;
  @IsOptional() @IsString() walkieChannels?: string;

  @IsOptional() @IsString() generalNotes?: string;
  @IsOptional() @IsString() productionNotes?: string;

  // === PHOTO-SPECIFIC FIELDS ===
  @IsOptional() @IsString() photographer?: string;
  @IsOptional() @IsString() artDirector?: string;
  @IsOptional() @IsString() stylist?: string;
  @IsOptional() @IsString() hmuLead?: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientContact?: string;
  @IsOptional() @IsString() clientPhone?: string;
  @IsOptional() @IsString() agencyName?: string;
  @IsOptional() @IsString() moodBoardUrl?: string;
  @IsOptional() @IsInt() totalLooks?: number;
  @IsOptional() @IsString() sessionType?: string;
  @IsOptional() @IsString() deliverables?: string;
  @IsOptional() @IsString() wardrobeProvider?: string;
  @IsOptional() @IsString() stylingNotes?: string;
}
