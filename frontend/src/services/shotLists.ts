import { apiClient } from '../config/api';
import type { ShotList, Shot, ShotListScene } from '../types/shotList';

export const shotListsApi = {
  // Shot Lists
  getByProject: async (projectId: string): Promise<ShotList[]> => {
    const res = await apiClient.get('/shot-lists', { params: { projectId } });
    return res.data.data || [];
  },

  getById: async (id: string): Promise<ShotList> => {
    const res = await apiClient.get(`/shot-lists/${id}`);
    return res.data.data;
  },

  create: async (data: { name: string; projectId: string; description?: string }): Promise<ShotList> => {
    const res = await apiClient.post('/shot-lists', data);
    return res.data.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<ShotList> => {
    const res = await apiClient.put(`/shot-lists/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/shot-lists/${id}`);
  },

  // Scenes
  createScene: async (data: Partial<ShotListScene>): Promise<ShotListScene> => {
    const res = await apiClient.post('/shot-list-scenes', data);
    return res.data.data;
  },

  updateScene: async (id: string, data: Partial<ShotListScene>): Promise<ShotListScene> => {
    const res = await apiClient.put(`/shot-list-scenes/${id}`, data);
    return res.data.data;
  },

  deleteScene: async (id: string): Promise<void> => {
    await apiClient.delete(`/shot-list-scenes/${id}`);
  },

  // Shots
  createShot: async (data: Partial<Shot>): Promise<Shot> => {
    const res = await apiClient.post('/shots', data);
    return res.data.data;
  },

  updateShot: async (id: string, data: Partial<Shot>): Promise<Shot> => {
    const res = await apiClient.put(`/shots/${id}`, data);
    return res.data.data;
  },

  deleteShot: async (id: string): Promise<void> => {
    await apiClient.delete(`/shots/${id}`);
  },

  reorderShots: async (sceneId: string, shotIds: string[]): Promise<Shot[]> => {
    const res = await apiClient.post(`/shots/reorder/${sceneId}`, { shotIds });
    return res.data.data;
  },

  duplicateShot: async (id: string): Promise<Shot> => {
    const res = await apiClient.post(`/shots/${id}/duplicate`);
    return res.data.data;
  },
};
