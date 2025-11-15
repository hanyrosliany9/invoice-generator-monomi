import { apiClient } from '../config/api'

export interface ProjectMilestone {
  id: string
  projectId: string
  milestoneNumber: number
  name: string
  nameId?: string
  description?: string
  descriptionId?: string
  plannedStartDate: string
  plannedEndDate: string
  actualStartDate?: string
  actualEndDate?: string
  plannedRevenue: number
  recognizedRevenue: number
  remainingRevenue: number
  estimatedCost?: number
  actualCost: number
  completionPercentage?: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ACCEPTED' | 'BILLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  predecessorId?: string
  deliverables?: string
  notes?: string
  notesId?: string
  delayDays?: number
  delayReason?: string
  acceptedBy?: string
  acceptedAt?: string
  createdAt: string
  updatedAt: string
  predecessor?: Partial<ProjectMilestone>
  successors?: Partial<ProjectMilestone>[]
  project?: {
    id: string
    number: string
    description: string
    client?: {
      id: string
      name: string
      email: string
    }
  }
}

export interface CreateMilestoneRequest {
  projectId: string
  milestoneNumber: number
  name: string
  nameId?: string
  description?: string
  descriptionId?: string
  plannedStartDate: string
  plannedEndDate: string
  plannedRevenue?: number // Optional - backend will auto-calculate if not provided
  estimatedCost?: number
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  predecessorId?: string
  deliverables?: string
  notes?: string
  notesId?: string
}

export interface UpdateMilestoneRequest {
  name?: string
  nameId?: string
  description?: string
  descriptionId?: string
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  plannedRevenue?: number
  recognizedRevenue?: number
  estimatedCost?: number
  actualCost?: number
  completionPercentage?: number
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ACCEPTED' | 'BILLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  predecessorId?: string
  deliverables?: string
  notes?: string
  notesId?: string
  delayDays?: number
  delayReason?: string
  acceptedBy?: string
  acceptedAt?: string
}

export interface DependencyCheckResult {
  canStart: boolean
  reasons: string[]
  predecessorStatus?: {
    id: string
    milestoneNumber: number
    name: string
    status: string
    completionPercentage?: number
  }
}

export interface MilestoneAnalyticsQuery {
  projectId?: string
  startDate?: string
  endDate?: string
  timeRange?: '30days' | '90days' | '1year' | 'custom'
}

export interface ProfitabilityData {
  milestone: string
  revenue: number
  cost: number
  profit: number
  profitMargin: number
}

export interface CashFlowData {
  date: string
  expectedInflow: number
  actualInflow: number
  forecastedInflow: number
}

export interface MilestoneMetric {
  id: string
  milestoneNumber: number
  name: string
  amount: number
  dueDate: string
  invoicedDate?: string
  paidDate?: string
  daysToPayment?: number
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE'
  revenueRecognized: number
}

export interface MilestoneAnalytics {
  averagePaymentCycle: number
  onTimePaymentRate: number
  revenueRecognitionRate: number
  projectProfitabilityByPhase: ProfitabilityData[]
  cashFlowForecast: CashFlowData[]
  milestoneMetrics: MilestoneMetric[]
}

export const milestonesService = {
  // Get all milestones for a project
  getProjectMilestones: async (projectId: string): Promise<ProjectMilestone[]> => {
    const response = await apiClient.get(`/milestones/project/${projectId}`)
    return response?.data?.data || []
  },

  // Get single milestone
  getMilestone: async (id: string): Promise<ProjectMilestone> => {
    const response = await apiClient.get(`/milestones/${id}`)
    return response?.data?.data
  },

  // Create milestone
  createMilestone: async (data: CreateMilestoneRequest): Promise<ProjectMilestone> => {
    const response = await apiClient.post('/milestones', data)
    return response?.data?.data
  },

  // Update milestone
  updateMilestone: async (id: string, data: UpdateMilestoneRequest): Promise<ProjectMilestone> => {
    const response = await apiClient.patch(`/milestones/${id}`, data)
    return response?.data?.data
  },

  // Delete milestone
  deleteMilestone: async (id: string): Promise<void> => {
    await apiClient.delete(`/milestones/${id}`)
  },

  // Update milestone progress
  updateMilestoneProgress: async (id: string, percentage: number): Promise<ProjectMilestone> => {
    const response = await apiClient.patch(`/milestones/${id}/progress`, { percentage })
    return response?.data?.data
  },

  // Mark milestone as completed
  completeMilestone: async (id: string): Promise<ProjectMilestone> => {
    const response = await apiClient.post(`/milestones/${id}/complete`)
    return response?.data?.data
  },

  // Check milestone dependencies
  checkDependencies: async (id: string): Promise<DependencyCheckResult> => {
    const response = await apiClient.get(`/milestones/${id}/dependencies`)
    return response?.data?.data
  },

  // Get milestone analytics
  getAnalytics: async (query: MilestoneAnalyticsQuery = {}): Promise<MilestoneAnalytics> => {
    const params = new URLSearchParams()
    if (query.projectId) params.append('projectId', query.projectId)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.timeRange) params.append('timeRange', query.timeRange)

    const response = await apiClient.get(`/milestones/analytics/overview?${params.toString()}`)
    return response?.data?.data
  },
}
