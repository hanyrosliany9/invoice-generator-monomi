export type CallSheetStatus = 'DRAFT' | 'READY' | 'SENT' | 'UPDATED';
export type CallStatus = 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'WRAPPED';
export type CastWorkStatus = 'SW' | 'W' | 'WF' | 'SWF' | 'H';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'SECOND_MEAL' | 'CRAFT_SERVICES' | 'CATERING';
export type SpecialReqType = 'STUNTS' | 'MINORS' | 'ANIMALS' | 'VEHICLES' | 'SFX_PYRO' | 'WATER_WORK' | 'AERIAL_DRONE' | 'WEAPONS' | 'NUDITY' | 'OTHER';

// === PHOTO-SPECIFIC TYPES ===
export type CallSheetType = 'FILM' | 'PHOTO';
export type ModelArrivalType = 'CAMERA_READY' | 'STYLED';
export type WardrobeStatus = 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'IN_USE' | 'WRAPPED';
export type HMURole = 'HAIR' | 'MAKEUP' | 'BOTH' | 'KEY_STYLIST';

// === GENERAL ACTIVITY TYPES (Run of Show) ===
export type ActivityType = 'GENERAL' | 'PREPARATION' | 'STANDBY' | 'BRIEFING' | 'REHEARSAL' | 'TRANSPORT' | 'TECHNICAL' | 'CUSTOM';

export interface CallSheet {
  id: string;
  callSheetType?: CallSheetType;
  scheduleId?: string;
  shootDayId?: string;
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

  // === PHOTO-SPECIFIC RELATIONS ===
  shots?: CallSheetShot[];
  models?: CallSheetModel[];
  wardrobe?: CallSheetWardrobe[];
  hmuSchedule?: CallSheetHMU[];

  // === GENERAL ACTIVITIES (Run of Show) ===
  activities?: CallSheetActivity[];

  // === PHOTO-SPECIFIC FIELDS ===
  photographer?: string;
  artDirector?: string;
  stylist?: string;
  hmuLead?: string;
  clientName?: string;
  clientContact?: string;
  clientPhone?: string;
  agencyName?: string;
  moodBoardUrl?: string;
  totalLooks?: number;
  sessionType?: string;
  deliverables?: string;
  wardrobeProvider?: string;
  stylingNotes?: string;

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

// === PHOTO-SPECIFIC: Shot/Looks ===
export interface CallSheetShot {
  id: string;
  callSheetId: string;
  shotNumber: number;
  shotName?: string;
  lookReference?: string;
  description?: string;
  setupLocation?: string;
  estStartTime?: string;
  estDuration?: number;
  wardrobeNotes?: string;
  hmuNotes?: string;
  modelIds?: string;
  order: number;
}

// === PHOTO-SPECIFIC: Models/Talent ===
export interface CallSheetModel {
  id: string;
  callSheetId: string;
  modelName: string;
  modelNumber?: string;
  agencyName?: string;
  arrivalType: ModelArrivalType;
  arrivalTime: string;
  hmuStartTime?: string;
  cameraReadyTime?: string;
  hmuArtist?: string;
  hmuDuration?: number;
  wardrobeSizes?: string;
  shotNumbers?: string;
  order: number;
}

// === PHOTO-SPECIFIC: Wardrobe ===
export interface CallSheetWardrobe {
  id: string;
  callSheetId: string;
  itemName: string;
  brand?: string;
  size?: string;
  color?: string;
  providedBy?: string;
  forModel?: string;
  forShot?: string;
  status: WardrobeStatus;
  order: number;
}

// === PHOTO-SPECIFIC: HMU Schedule ===
export interface CallSheetHMU {
  id: string;
  callSheetId: string;
  artistName: string;
  artistRole: HMURole;
  stationNumber?: number;
  callTime: string;
  availableFrom?: string;
  availableUntil?: string;
  assignedModels?: string;
  order: number;
}

// === GENERAL ACTIVITIES (Run of Show) ===
export interface CallSheetActivity {
  id: string;
  callSheetId: string;
  activityType: ActivityType;
  activityName: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  personnel?: string;
  responsibleParty?: string;
  technicalNotes?: string;
  notes?: string;
  order: number;
  color?: string;
  isHighlighted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCallSheetDto {
  callSheetType?: CallSheetType;
  scheduleId?: string;
  shootDayId?: string;
  shootDate: string;
  productionName?: string;
  crewCallTime?: string;
  firstShotTime?: string;
  estimatedWrap?: string;
  lunchTime?: string;
  dayNumber?: number;
  totalDays?: number;
  // === PHOTO-SPECIFIC FIELDS ===
  photographer?: string;
  artDirector?: string;
  stylist?: string;
  hmuLead?: string;
  clientName?: string;
  clientContact?: string;
  clientPhone?: string;
  agencyName?: string;
  moodBoardUrl?: string;
  totalLooks?: number;
  sessionType?: string;
  deliverables?: string;
  wardrobeProvider?: string;
  stylingNotes?: string;
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

// === PHOTO-SPECIFIC DTOs ===

export interface CreateShotDto {
  shotNumber: number;
  shotName?: string;
  lookReference?: string;
  description?: string;
  setupLocation?: string;
  estStartTime?: string;
  estDuration?: number;
  wardrobeNotes?: string;
  hmuNotes?: string;
  modelIds?: string;
  order?: number;
}

export interface CreateModelDto {
  modelName: string;
  modelNumber?: string;
  agencyName?: string;
  arrivalType: ModelArrivalType;
  arrivalTime: string;
  hmuStartTime?: string;
  cameraReadyTime?: string;
  hmuArtist?: string;
  hmuDuration?: number;
  wardrobeSizes?: string;
  shotNumbers?: string;
  order?: number;
}

export interface CreateWardrobeDto {
  itemName: string;
  brand?: string;
  size?: string;
  color?: string;
  providedBy?: string;
  forModel?: string;
  forShot?: string;
  status?: WardrobeStatus;
  order?: number;
}

export interface CreateHmuDto {
  artistName: string;
  artistRole: HMURole;
  stationNumber?: number;
  callTime: string;
  availableFrom?: string;
  availableUntil?: string;
  assignedModels?: string;
  order?: number;
}

// === GENERAL ACTIVITY DTOs ===
export interface CreateActivityDto {
  activityType?: ActivityType;
  activityName: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  personnel?: string;
  responsibleParty?: string;
  technicalNotes?: string;
  notes?: string;
  color?: string;
  isHighlighted?: boolean;
}

export interface UpdateActivityDto {
  activityType?: ActivityType;
  activityName?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  personnel?: string;
  responsibleParty?: string;
  technicalNotes?: string;
  notes?: string;
  color?: string;
  isHighlighted?: boolean;
  order?: number;
}
