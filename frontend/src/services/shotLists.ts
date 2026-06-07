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

  // Atomic bulk save — replaces the list's shots (and optionally name/
  // description) in one transactional request. Order is computed server-side
  // per scene, so callers send shots in display order only.
  bulkSaveShots: async (
    id: string,
    payload: {
      name?: string;
      description?: string;
      shots: Array<Partial<Shot> & { shotNumber: string }>;
    },
  ): Promise<ShotList> => {
    const res = await apiClient.put(`/shot-lists/${id}/shots`, payload);
    return res.data.data;
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

  // PDF Export
  generatePDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const res = await apiClient.get(`/pdf/shot-list/${id}`, {
      params: { continuous: continuous ? 'true' : 'false' },
      responseType: 'blob',
    });
    return res.data;
  },

  previewPDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const res = await apiClient.get(`/pdf/shot-list/${id}/preview`, {
      params: { continuous: continuous ? 'true' : 'false' },
      responseType: 'blob',
    });
    return res.data;
  },
};
