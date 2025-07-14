import { apiClient } from '../config/api'

export interface ProjectType {
  id: string
  code: string
  name: string
  description: string
  prefix: string
  color: string
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

// Static mapping based on seeded data
const PROJECT_TYPE_MAPPING: Record<string, string> = {
  PRODUCTION: 'cmd2xru9100026asuaclsg3kh',
  SOCIAL_MEDIA: 'cmd2xru9500036asutntrz5mb',
  CONSULTATION: 'cmd2xru9700046asuph748tvj',
  MAINTENANCE: 'cmd2xru9800056asuco1tv1wn',
  OTHER: 'cmd2xru9a00066asuag21f739'
}

export interface Project {
  id: string
  number: string
  description: string
  output?: string // Optional - legacy field, can be derived from products
  projectTypeId: string
  clientId: string
  startDate: string | null
  endDate: string | null
  estimatedBudget?: string // Backend returns as string
  basePrice?: string // Backend returns as string
  priceBreakdown?: any // Detailed price breakdown
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  totalRevenue?: number // Total revenue from all related invoices
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
    company: string
    email: string
    phone?: string
    address?: string
    contactPerson?: string
    paymentTerms?: string
    status: string
  }
  projectType?: {
    id: string
    code: string
    name: string
    description: string
    prefix: string
    color: string
    isDefault: boolean
    isActive: boolean
    sortOrder: number
    createdAt: string
    updatedAt: string
  }
  quotations?: any[]
  invoices?: any[]
  _count?: {
    quotations: number
    invoices: number
  }
}

export interface CreateProjectRequest {
  description: string
  output?: string // Optional - can be derived from product descriptions
  projectTypeId: string // Project type ID from database
  clientId: string
  startDate?: string // Optional in backend
  endDate?: string // Optional in backend
  estimatedBudget?: number // Budget field name from backend
  products?: Array<{
    // Product/service items for automatic calculations
    name: string
    description: string
    price: number
    quantity?: number
  }>
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
}

// Helper function to map project type enum to ID
const mapProjectTypeToId = (type: string): string => {
  const projectTypeId = PROJECT_TYPE_MAPPING[type]
  if (!projectTypeId) {
    throw new Error(`Invalid project type: ${type}`)
  }
  return projectTypeId
}

export const projectService = {
  // Get all projects
  getProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get('/projects')
    return response?.data?.data || []
  },

  // Get project by ID
  getProject: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`)
    if (!response?.data?.data) {
      throw new Error('Project not found')
    }
    return response.data.data
  },

  // Create new project
  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post('/projects', data)
    if (!response?.data?.data) {
      throw new Error('Project creation failed')
    }
    return response.data.data
  },

  // Update existing project
  updateProject: async (
    id: string,
    data: UpdateProjectRequest
  ): Promise<Project> => {
    const response = await apiClient.patch(`/projects/${id}`, data)
    if (!response?.data?.data) {
      throw new Error('Project update failed')
    }
    return response.data.data
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`)
  },

  // Update project status
  updateStatus: async (id: string, status: string): Promise<Project> => {
    const response = await apiClient.patch(`/projects/${id}/status`, { status })
    if (!response?.data?.data) {
      throw new Error('Project status update failed')
    }
    return response.data.data
  },

  // Get projects by client
  getProjectsByClient: async (clientId: string): Promise<Project[]> => {
    const response = await apiClient.get(`/projects/by-client/${clientId}`)
    return response?.data?.data || []
  },

  // Get project statistics
  getProjectStats: async () => {
    const response = await apiClient.get('/projects/stats')
    return response?.data?.data || {}
  },

  // Get projects by type
  getProjectsByType: async (type: string) => {
    const response = await apiClient.get(`/projects/by-type/${type}`)
    return response?.data?.data || []
  },

  // Get project timeline
  getProjectTimeline: async (id: string) => {
    const response = await apiClient.get(`/projects/${id}/timeline`)
    return response?.data?.data || {}
  },
}
