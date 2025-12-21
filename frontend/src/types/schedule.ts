export type StripType = 'SCENE' | 'BANNER';
export type BannerType = 'DAY_BREAK' | 'MEAL_BREAK' | 'COMPANY_MOVE' | 'NOTE';

export interface ShootingSchedule {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  shotListId?: string;
  startDate?: string;
  pagesPerDay: number;
  shootDays: ShootDay[];
  project?: { id: string; number: string; description: string };
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ShootDay {
  id: string;
  scheduleId: string;
  dayNumber: number;
  shootDate?: string;
  location?: string;
  notes?: string;
  order: number;
  strips: ScheduleStrip[];
}

export interface ScheduleStrip {
  id: string;
  shootDayId: string;
  order: number;
  stripType: StripType;
  // Scene data
  sceneId?: string;
  sceneNumber?: string;
  sceneName?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  pageCount?: number;
  estimatedTime?: number;
  // Banner data
  bannerType?: BannerType;
  bannerText?: string;
  bannerColor?: string;
}

export interface CreateScheduleDto {
  name: string;
  description?: string;
  projectId: string;
  shotListId?: string;
  startDate?: string;
  pagesPerDay?: number;
}

export interface CreateShootDayDto {
  scheduleId: string;
  dayNumber: number;
  shootDate?: string;
  location?: string;
  notes?: string;
  order?: number;
}

export interface CreateStripDto {
  shootDayId: string;
  stripType: StripType;
  sceneId?: string;
  sceneNumber?: string;
  sceneName?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  pageCount?: number;
  estimatedTime?: number;
  bannerType?: BannerType;
  bannerText?: string;
  bannerColor?: string;
  order?: number;
}

export interface ReorderStripsDto {
  strips: { stripId: string; shootDayId: string; order: number }[];
}
