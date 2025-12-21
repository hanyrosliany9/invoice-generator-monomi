import { apiClient } from '../config/api';
import type { ShootingSchedule, ShootDay, ScheduleStrip, CreateScheduleDto, CreateShootDayDto, CreateStripDto, ReorderStripsDto } from '../types/schedule';

export const schedulesApi = {
  // Schedule CRUD
  getByProject: async (projectId: string): Promise<ShootingSchedule[]> => {
    const res = await apiClient.get(`/schedules?projectId=${projectId}`);
    return res.data.data;
  },

  getById: async (id: string): Promise<ShootingSchedule> => {
    const res = await apiClient.get(`/schedules/${id}`);
    return res.data.data;
  },

  create: async (dto: CreateScheduleDto): Promise<ShootingSchedule> => {
    const res = await apiClient.post('/schedules', dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CreateScheduleDto>): Promise<ShootingSchedule> => {
    const res = await apiClient.put(`/schedules/${id}`, dto);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/${id}`);
  },

  autoSchedule: async (id: string, groupBy: string): Promise<ShootingSchedule> => {
    const res = await apiClient.post(`/schedules/${id}/auto-schedule`, { groupBy });
    return res.data.data;
  },

  // Shoot Days
  createDay: async (dto: CreateShootDayDto): Promise<ShootDay> => {
    const res = await apiClient.post('/schedules/days', dto);
    return res.data.data;
  },

  updateDay: async (id: string, dto: Partial<CreateShootDayDto>): Promise<ShootDay> => {
    const res = await apiClient.put(`/schedules/days/${id}`, dto);
    return res.data.data;
  },

  deleteDay: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/days/${id}`);
  },

  // Strips
  createStrip: async (dto: CreateStripDto): Promise<ScheduleStrip> => {
    const res = await apiClient.post('/schedules/strips', dto);
    return res.data.data;
  },

  updateStrip: async (id: string, dto: Partial<CreateStripDto>): Promise<ScheduleStrip> => {
    const res = await apiClient.put(`/schedules/strips/${id}`, dto);
    return res.data.data;
  },

  deleteStrip: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/strips/${id}`);
  },

  reorderStrips: async (dto: ReorderStripsDto): Promise<void> => {
    await apiClient.post('/schedules/strips/reorder', dto);
  },
};
