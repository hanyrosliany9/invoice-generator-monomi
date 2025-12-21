export type CallSheetStatus = 'DRAFT' | 'READY' | 'SENT' | 'UPDATED';
export type CallStatus = 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'WRAPPED';

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
  generalCallTime?: string;
  firstShotTime?: string;
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
  status: CallSheetStatus;
  sentAt?: string;
  castCalls: CastCall[];
  crewCalls: CrewCall[];
  scenes: CallSheetScene[];
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
  pickupTime?: string;
  callTime: string;
  onSetTime?: string;
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

export interface CreateCallSheetDto {
  scheduleId: string;
  shootDayId: string;
  shootDate: string;
  productionName?: string;
  generalCallTime?: string;
}

export interface CreateCastCallDto {
  actorName: string;
  character?: string;
  callTime: string;
  castNumber?: string;
  pickupTime?: string;
  onSetTime?: string;
  notes?: string;
}

export interface CreateCrewCallDto {
  department: string;
  position: string;
  name: string;
  callTime: string;
  phone?: string;
  email?: string;
  notes?: string;
}
