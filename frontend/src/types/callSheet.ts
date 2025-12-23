export type CallSheetStatus = 'DRAFT' | 'READY' | 'SENT' | 'UPDATED';
export type CallStatus = 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'WRAPPED';
export type CastWorkStatus = 'SW' | 'W' | 'WF' | 'SWF' | 'H';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'SECOND_MEAL' | 'CRAFT_SERVICES' | 'CATERING';
export type SpecialReqType = 'STUNTS' | 'MINORS' | 'ANIMALS' | 'VEHICLES' | 'SFX_PYRO' | 'WATER_WORK' | 'AERIAL_DRONE' | 'WEAPONS' | 'NUDITY' | 'OTHER';

export interface CallSheet {
  id: string;
  scheduleId: string;
  shootDayId: string;
  createdById: string;
  callSheetNumber: number;
  productionName?: string;
  director?: string;
  producer?: string;
  shootDate: string;

  // === NEW: Day Context ===
  dayNumber?: number;
  totalDays?: number;

  // === NEW & RENAMED KEY TIMES ===
  crewCallTime?: string;        // "7:00 AM" - General crew call (renamed from generalCallTime)
  firstShotTime?: string;       // "9:15 AM" - First shot of day
  estimatedWrap?: string;       // "6:00 PM" - Expected wrap (renamed from wrapTime)
  lunchTime?: string;           // "12:00 PM" - Scheduled lunch

  // === LEGACY (kept for compatibility) ===
  generalCallTime?: string;
  wrapTime?: string;

  locationName?: string;
  locationAddress?: string;
  parkingNotes?: string;
  mapUrl?: string;
  weatherHigh?: number;
  weatherLow?: number;
  weatherCondition?: string;
  sunrise?: string;
  sunset?: string;
  nearestHospital?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  generalNotes?: string;
  productionNotes?: string;

  // === NEW: Production Notes ===
  advanceNotes?: string;
  safetyNotes?: string;
  announcements?: string;
  walkieChannels?: string;

  status: CallSheetStatus;
  sentAt?: string;

  // === Relations ===
  castCalls: CastCall[];
  crewCalls: CrewCall[];
  scenes: CallSheetScene[];
  mealBreaks: MealBreak[];
  companyMoves: CompanyMove[];
  specialRequirements: SpecialRequirement[];
  backgroundCalls: BackgroundCall[];

  schedule?: { id: string; project?: { name: string } };
  shootDay?: { dayNumber: number };
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CastCall {
  id: string;
  callSheetId: string;
  order: number;
  castNumber?: string;
  actorName: string;
  character?: string;

  // === ENHANCED: Multiple Time Columns ===
  pickupTime?: string;         // "6:00 AM" - Transportation pickup
  muCallTime?: string;         // "6:30 AM" - Makeup/Hair call
  onSetTime?: string;          // "9:00 AM" - Must be camera-ready
  callTime: string;            // Legacy - keep for compatibility
  wrapTime?: string;           // "4:00 PM" - Expected wrap for this actor

  // === NEW: Status & Info ===
  workStatus?: CastWorkStatus; // SW, W, WF, SWF, H
  transportMode?: string;      // "Company Car" / "Own Transport" / "Hotel Shuttle"
  muDuration?: number;         // Minutes needed for makeup
  wardrobeNotes?: string;      // Special wardrobe requirements
  isMinor?: boolean;           // Child actor
  hasStunt?: boolean;          // Performing stunts

  notes?: string;
  status: CallStatus;
}

export interface CrewCall {
  id: string;
  callSheetId: string;
  order: number;
  department: string;
  position: string;
  name: string;
  callTime: string;
  phone?: string;
  email?: string;
  callTimeOffset?: number;     // Minutes relative to general call
  reportLocation?: string;     // Where to report
  notes?: string;
}

export interface CallSheetScene {
  id: string;
  callSheetId: string;
  order: number;
  sceneNumber: string;
  sceneName?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  pageCount?: number;
  castIds?: string;
  description?: string;
}

// === NEW: Meal Break ===
export interface MealBreak {
  id: string;
  callSheetId: string;
  mealType: MealType;
  time: string;
  duration: number;
  location?: string;
  notes?: string;
  order: number;
}

// === NEW: Company Move ===
export interface CompanyMove {
  id: string;
  callSheetId: string;
  departTime: string;
  fromLocation: string;
  toLocation: string;
  travelTime?: number;
  notes?: string;
  order: number;
}

// === NEW: Special Requirement ===
export interface SpecialRequirement {
  id: string;
  callSheetId: string;
  reqType: SpecialReqType;
  description: string;
  contactName?: string;
  contactPhone?: string;
  safetyNotes?: string;
  scenes?: string;
  order: number;
}

// === NEW: Background Call ===
export interface BackgroundCall {
  id: string;
  callSheetId: string;
  description: string;
  quantity: number;
  callTime: string;
  reportLocation?: string;
  wardrobeNotes?: string;
  scenes?: string;
  notes?: string;
  order: number;
}

export interface CreateCallSheetDto {
  scheduleId: string;
  shootDayId: string;
  shootDate: string;
  productionName?: string;
  crewCallTime?: string;
  firstShotTime?: string;
  estimatedWrap?: string;
  lunchTime?: string;
  dayNumber?: number;
  totalDays?: number;
}

export interface CreateCastCallDto {
  actorName: string;
  character?: string;
  callTime: string;
  castNumber?: string;
  pickupTime?: string;
  muCallTime?: string;
  onSetTime?: string;
  wrapTime?: string;
  workStatus?: CastWorkStatus;
  transportMode?: string;
  muDuration?: number;
  wardrobeNotes?: string;
  isMinor?: boolean;
  hasStunt?: boolean;
  notes?: string;
}

export interface CreateCrewCallDto {
  department: string;
  position: string;
  name: string;
  callTime: string;
  phone?: string;
  email?: string;
  callTimeOffset?: number;
  reportLocation?: string;
  notes?: string;
}

// === NEW DTOs ===
export interface CreateMealDto {
  mealType: MealType;
  time: string;
  duration?: number;
  location?: string;
  notes?: string;
}

export interface CreateCompanyMoveDto {
  departTime: string;
  fromLocation: string;
  toLocation: string;
  travelTime?: number;
  notes?: string;
}

export interface CreateSpecialReqDto {
  reqType: SpecialReqType;
  description: string;
  contactName?: string;
  contactPhone?: string;
  safetyNotes?: string;
  scenes?: string;
}

export interface CreateBackgroundDto {
  description: string;
  quantity?: number;
  callTime: string;
  reportLocation?: string;
  wardrobeNotes?: string;
  scenes?: string;
  notes?: string;
}
