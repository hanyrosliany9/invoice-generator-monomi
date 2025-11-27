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

export interface ProductItem {
  id?: string
  name: string
  description: string
  quantity: number
  price: number
}

export interface Project {
  id: string
  number: string
  description: string
  scopeOfWork?: string // Narrative description of work scope
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
  products?: ProductItem[] // Product/service items
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
    expenses?: number
    costAllocations?: number
  }

  // Profit Margin Tracking (auto-calculated)
  totalDirectCosts?: string
  totalIndirectCosts?: string
  totalAllocatedCosts?: string
  totalInvoicedAmount?: string
  totalPaidAmount?: string
  grossProfit?: string
  netProfit?: string
  grossMarginPercent?: string
  netMarginPercent?: string
  budgetVariance?: string
  budgetVariancePercent?: string
  profitCalculatedAt?: string
  profitCalculatedBy?: string

  // Cost Breakdown (optional, fetched separately)
  costBreakdown?: {
    direct: {
      materials: string
      labor: string
      expenses: string
      total: string
    }
    indirect: {
      overhead: string
      allocated: string
      total: string
    }
    total: string
  }

  // Projected Profit Metrics (calculated during planning)
  estimatedExpenses?: any // JSON storage for estimated costs by category
  projectedGrossMargin?: string | number // Estimated gross margin %
  projectedNetMargin?: string | number // Estimated net margin %
  projectedProfit?: string | number // Estimated profit amount
}

export interface EstimatedExpense {
  categoryId: string
  categoryName?: string
  categoryNameId?: string
  amount: number
  notes?: string
  costType: 'direct' | 'indirect'
}

export interface ProjectionResult {
  // Revenue
  estimatedRevenue: number
  revenueBreakdown: Array<{
    name: string
    description: string
    price: number
    quantity: number
    subtotal: number
  }>

  // Costs
  estimatedDirectCosts: number
  estimatedIndirectCosts: number
  estimatedTotalCosts: number
  costBreakdown: {
    direct: Array<{
      categoryId: string
      categoryName: string
      categoryNameId: string
      amount: number
      notes?: string
    }>
    indirect: Array<{
      categoryId: string
      categoryName: string
      categoryNameId: string
      amount: number
      notes?: string
    }>
  }

  // Profit Projections
  projectedGrossProfit: number
  projectedNetProfit: number
  projectedGrossMargin: number // Percentage
  projectedNetMargin: number // Percentage

  // Metadata
  calculatedAt: Date
  isProfitable: boolean
  profitabilityRating: 'excellent' | 'good' | 'breakeven' | 'loss'
}

export interface CreateProjectRequest {
  description: string
  scopeOfWork?: string // Narrative description of work scope
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
  estimatedExpenses?: EstimatedExpense[] // ⭐ NEW: Estimated expenses for projection
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
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

  // ⭐ NEW: Calculate project profit projections before creation
  calculateProjection: async (data: {
    products?: Array<{
      name: string
      description: string
      price: number
      quantity?: number
    }>
    estimatedExpenses?: EstimatedExpense[]
  }): Promise<ProjectionResult> => {
    const response = await apiClient.post('/projects/calculate-projection', data)
    if (!response?.data?.data) {
      throw new Error('Projection calculation failed')
    }
    return response.data.data
  },

  // Download project PDF
  downloadProjectPDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const response = await apiClient.get(`/pdf/project/${id}`, {
      params: { continuous: continuous.toString() },
      responseType: 'blob',
    })
    if (!response?.data) {
      throw new Error('Failed to download project PDF')
    }
    return response.data
  },

  // Preview project PDF
  previewProjectPDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const response = await apiClient.get(`/pdf/project/${id}/preview`, {
      params: { continuous: continuous.toString() },
      responseType: 'blob',
    })
    if (!response?.data) {
      throw new Error('Failed to preview project PDF')
    }
    return response.data
  },
}
