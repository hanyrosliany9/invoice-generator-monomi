import { apiClient } from '../config/api';

/* ------------------------------------------------------------------ */
/*  Types — mirror the Prisma models (ShootingSchedule / ShootDay /    */
/*  ScheduleStrip) and the schedules backend response envelopes.       */
/* ------------------------------------------------------------------ */

export type StripType = 'SCENE' | 'BANNER';
export type BannerType = 'DAY_BREAK' | 'MEAL_BREAK' | 'COMPANY_MOVE' | 'NOTE';

export interface ScheduleStrip {
  id: string;
  shootDayId: string;
  order: number;
  stripType: StripType;

  // Scene data
  sceneId?: string | null;
  sceneNumber?: string | null;
  sceneName?: string | null;
  intExt?: string | null;
  dayNight?: string | null;
  location?: string | null;
  pageCount?: number | null;
  estimatedTime?: number | null;

  // Scene flags
  hasStunts?: boolean;
  hasMinors?: boolean;
  hasAnimals?: boolean;
  hasVehicles?: boolean;
  hasSfx?: boolean;
  hasWaterWork?: boolean;
  specialReqNotes?: string | null;
  specialReqContact?: string | null;

  // Background / extras
  backgroundDescription?: string | null;
  backgroundQty?: number | null;
  backgroundCallTime?: string | null;
  backgroundWardrobe?: string | null;
  backgroundNotes?: string | null;

  // Banner data
  bannerType?: BannerType | null;
  bannerText?: string | null;
  bannerColor?: string | null;

  // Meal break
  mealType?: string | null;
  mealTime?: string | null;
  mealDuration?: number | null;
  mealLocation?: string | null;

  // Company move
  moveTime?: string | null;
  moveFromLocation?: string | null;
  moveToLocation?: string | null;
  moveTravelTime?: number | null;
  moveNotes?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface ShootDay {
  id: string;
  scheduleId: string;
  dayNumber: number;
  shootDate?: string | null;
  location?: string | null;
  notes?: string | null;
  order: number;
  strips?: ScheduleStrip[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string | null;
  projectId: string;
  project?: { id: string; number?: string; name?: string; description?: string };
  shotListId?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  startDate?: string | null;
  pagesPerDay: number;
  shootDays?: ShootDay[];
  _count?: { shootDays: number };
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  DTOs                                                                */
/* ------------------------------------------------------------------ */

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

export type CreateStripDto = Partial<Omit<ScheduleStrip, 'id' | 'createdAt' | 'updatedAt'>> & {
  shootDayId: string;
};

export interface ReorderStripPosition {
  stripId: string;
  shootDayId: string;
  order: number;
}

export interface InsertMealDto {
  mealType: string;
  mealTime: string;
  mealDuration?: number;
  mealLocation?: string;
}

export interface InsertMoveDto {
  moveTime: string;
  moveFromLocation: string;
  moveToLocation: string;
  moveTravelTime?: number;
  moveNotes?: string;
}

export type AutoScheduleGroupBy = 'location' | 'intExt' | 'dayNight';

/* ------------------------------------------------------------------ */
/*  Schedules                                                           */
/* ------------------------------------------------------------------ */

export const schedulesApi = {
  // Per-project list. Pass 'all' to get every schedule (backend supports it).
  getByProject: async (projectId: string): Promise<Schedule[]> => {
    const res = await apiClient.get('/schedules', { params: { projectId } });
    return res.data.data || [];
  },

  getAll: async (): Promise<Schedule[]> => {
    const res = await apiClient.get('/schedules', { params: { projectId: 'all' } });
    return res.data.data || [];
  },

  getById: async (id: string): Promise<Schedule> => {
    const res = await apiClient.get(`/schedules/${id}`);
    return res.data.data;
  },

  create: async (data: CreateScheduleDto): Promise<Schedule> => {
    const res = await apiClient.post('/schedules', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CreateScheduleDto>): Promise<Schedule> => {
    const res = await apiClient.put(`/schedules/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/${id}`);
  },

  // Distributes the schedule's scene strips across its shoot days, grouped by
  // the chosen field then packed up to pagesPerDay. Returns the full schedule.
  autoSchedule: async (id: string, groupBy: AutoScheduleGroupBy): Promise<Schedule> => {
    const res = await apiClient.post(`/schedules/${id}/auto-schedule`, { groupBy });
    return res.data.data;
  },

  generatePDF: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(`/schedules/${id}/export/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },

  // Appends every scene from a shot list onto a shoot day as SCENE strips.
  importFromShotList: async (
    id: string,
    shotListId: string,
    shootDayId: string,
  ): Promise<Schedule> => {
    const res = await apiClient.post(`/schedules/${id}/import-from-shot-list`, {
      shotListId,
      shootDayId,
    });
    return res.data.data;
  },
};

/* ------------------------------------------------------------------ */
/*  Shoot days  (controller prefix: /schedules/days)                   */
/* ------------------------------------------------------------------ */

export const shootDaysApi = {
  create: async (data: CreateShootDayDto): Promise<ShootDay> => {
    const res = await apiClient.post('/schedules/days', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CreateShootDayDto>): Promise<ShootDay> => {
    const res = await apiClient.put(`/schedules/days/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/days/${id}`);
  },
};

/* ------------------------------------------------------------------ */
/*  Strips  (controller prefix: /schedules/strips)                     */
/* ------------------------------------------------------------------ */

export const stripsApi = {
  create: async (data: CreateStripDto): Promise<ScheduleStrip> => {
    const res = await apiClient.post('/schedules/strips', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CreateStripDto>): Promise<ScheduleStrip> => {
    const res = await apiClient.put(`/schedules/strips/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/strips/${id}`);
  },

  reorder: async (strips: ReorderStripPosition[]): Promise<{ success: boolean }> => {
    const res = await apiClient.post('/schedules/strips/reorder', { strips });
    return res.data.data;
  },

  insertMeal: async (stripId: string, data: InsertMealDto): Promise<ScheduleStrip> => {
    const res = await apiClient.post(`/schedules/strips/${stripId}/insert-meal`, data);
    return res.data.data;
  },

  insertMove: async (stripId: string, data: InsertMoveDto): Promise<ScheduleStrip> => {
    const res = await apiClient.post(`/schedules/strips/${stripId}/insert-move`, data);
    return res.data.data;
  },
};
