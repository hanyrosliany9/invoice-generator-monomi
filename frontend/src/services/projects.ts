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

export interface ProjectMilestone {
  id: string
  projectId: string
  milestoneNumber: number
  name: string
  description?: string
  status: string
  priority?: string
  plannedStartDate?: string
  plannedEndDate?: string
  completedDate?: string
  completionPercentage?: number
  plannedRevenue?: number
  estimatedCost?: number
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
  milestones?: ProjectMilestone[]
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
  // Agreed project value = total of the project's APPROVED quotations (work +
  // reimbursement + tax). Computed server-side on the list endpoint.
  contractValue?: number
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

/**
 * Normalise the project's `estimatedExpenses` JSON back into a flat array.
 *
 * IMPORTANT shape contract: the create/edit FORM submits a flat array
 * (`[{ categoryId, amount, costType, notes }]`), but the backend REWRITES it
 * on save into a bucketed object `{ direct[], indirect[], totalDirect,
 * totalIndirect, totalEstimated }` (projects.service.ts) and drops `costType`
 * from each stored line. The readers used to do `Array.isArray(...)` and bail
 * on the object — which silently dropped every estimate on the edit/detail
 * pages. This helper accepts BOTH shapes (and a JSON string) and re-derives
 * `costType` from whichever bucket a line sits in.
 */
export function parseEstimatedExpenses(raw: unknown): EstimatedExpense[] {
  if (!raw) return []
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return []
    }
  }
  const norm = (
    item: any,
    fallbackCostType: 'direct' | 'indirect',
  ): EstimatedExpense => ({
    categoryId: typeof item?.categoryId === 'string' ? item.categoryId : '',
    categoryName: item?.categoryName ?? '',
    categoryNameId: item?.categoryNameId ?? '',
    amount: Number(item?.amount) || 0,
    notes: item?.notes ?? '',
    costType: item?.costType === 'indirect' ? 'indirect' : fallbackCostType,
  })
  // Flat array — the in-form value, or a legacy stored array.
  if (Array.isArray(data)) {
    return data.map((i) => norm(i, 'direct')).filter((e) => e.categoryId)
  }
  // Bucketed object — the canonical stored shape.
  if (data && typeof data === 'object') {
    const obj = data as { direct?: unknown[]; indirect?: unknown[] }
    const direct = Array.isArray(obj.direct)
      ? obj.direct.map((i) => norm(i, 'direct'))
      : []
    const indirect = Array.isArray(obj.indirect)
      ? obj.indirect.map((i) => norm(i, 'indirect'))
      : []
    return [...direct, ...indirect].filter((e) => e.categoryId)
  }
  return []
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
    const response = await apiClient.get('/projects', { params: { limit: 200 } })
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

  // Duplicate project
  duplicateProject: async (id: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${id}/duplicate`)
    if (!response?.data?.data) {
      throw new Error('Project duplication failed')
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
