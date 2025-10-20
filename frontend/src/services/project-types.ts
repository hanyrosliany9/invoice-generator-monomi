import { api } from '../config/api';

export interface ProjectType {
  id: string;
  code: string;
  name: string;
  description?: string;
  prefix: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTypeDto {
  code: string;
  name: string;
  description?: string;
  prefix: string;
  color?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateProjectTypeDto {
  code?: string;
  name?: string;
  description?: string;
  prefix?: string;
  color?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface ProjectTypeStats {
  id: string;
  code: string;
  name: string;
  color: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  recentProjects: Array<{
    id: string;
    status: string;
    basePrice: number;
    createdAt: string;
  }>;
}

export const projectTypesApi = {
  // Get all project types
  getAll: async (): Promise<ProjectType[]> => {
    const response = await api.get('/project-types');
    return response.data.data || response.data;
  },

  // Get project type by ID
  getById: async (id: string): Promise<ProjectType> => {
    const response = await api.get(`/project-types/${id}`);
    return response.data.data || response.data;
  },

  // Create new project type
  create: async (data: CreateProjectTypeDto): Promise<ProjectType> => {
    const response = await api.post('/project-types', data);
    return response.data.data || response.data;
  },

  // Update project type
  update: async (id: string, data: UpdateProjectTypeDto): Promise<ProjectType> => {
    const response = await api.patch(`/project-types/${id}`, data);
    return response.data.data || response.data;
  },

  // Delete project type
  delete: async (id: string): Promise<void> => {
    await api.delete(`/project-types/${id}`);
  },

  // Toggle active status
  toggleActive: async (id: string): Promise<ProjectType> => {
    const response = await api.put(`/project-types/${id}/toggle-active`);
    return response.data.data || response.data;
  },

  // Update sort order
  updateSortOrder: async (updates: { id: string; sortOrder: number }[]): Promise<ProjectType[]> => {
    const response = await api.put('/project-types/sort-order', updates);
    return response.data.data || response.data;
  },

  // Get project type statistics
  getStats: async (): Promise<ProjectTypeStats[]> => {
    const response = await api.get('/project-types/stats');
    return response.data.data || response.data;
  },
};