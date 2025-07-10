import { apiClient } from '../config/api'

export interface RevenueAnalytics {
  totalRevenue: number
  averageRevenue: number
  revenueByPeriod: { period: string; amount: number }[]
  invoiceCount: number
}

export interface ClientAnalytics {
  topClients: {
    client: {
      id: string
      name: string
      company: string
      email: string
    }
    revenue: number
    invoiceCount: number
  }[]
  totalClients: number
}

export interface ProjectAnalytics {
  topProjects: {
    project: {
      id: string
      number: string
      description: string
      type: string
      status: string
      client: {
        name: string
        company: string
      }
    }
    revenue: number
    invoiceCount: number
  }[]
  projectTypes: {
    type: string
    _count: { id: number }
  }[]
  totalProjects: number
}

export interface PaymentAnalytics {
  invoicesByStatus: {
    status: string
    _count: { id: number }
    _sum: { totalAmount: number | null }
  }[]
  overdueInvoices: {
    id: string
    invoiceNumber: string
    totalAmount: number
    dueDate: string
    client: {
      name: string
      company: string
    }
  }[]
  overdueCount: number
  overdueAmount: number
  paymentTrends: { period: string; amount: number }[]
}

export interface BusinessOverview {
  revenue: RevenueAnalytics
  clients: ClientAnalytics
  projects: ProjectAnalytics
  payments: PaymentAnalytics
  generatedAt: string
}

export interface FinancialSummary {
  period: {
    startDate: string
    endDate: string
  }
  quotations: {
    total: number
    approved: number
    pending: number
    totalValue: number
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    totalValue: number
    paidValue: number
    materaiRequired: number
  }
  newClients: number
  newProjects: number
  conversionRate: string
  paymentRate: string
}

export const reportsService = {
  // Get revenue analytics
  getRevenueAnalytics: async (params?: {
    period?: string
    startDate?: string
    endDate?: string
  }): Promise<RevenueAnalytics> => {
    const searchParams = new URLSearchParams()
    if (params?.period) searchParams.append('period', params.period)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    
    const url = `/reports/revenue${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await apiClient.get(url)
    return response.data.data
  },

  // Get client analytics
  getClientAnalytics: async (limit?: number): Promise<ClientAnalytics> => {
    const url = `/reports/clients${limit ? `?limit=${limit}` : ''}`
    const response = await apiClient.get(url)
    return response.data.data
  },

  // Get project analytics
  getProjectAnalytics: async (limit?: number): Promise<ProjectAnalytics> => {
    const url = `/reports/projects${limit ? `?limit=${limit}` : ''}`
    const response = await apiClient.get(url)
    return response.data.data
  },

  // Get payment analytics
  getPaymentAnalytics: async (): Promise<PaymentAnalytics> => {
    const response = await apiClient.get('/reports/payments')
    return response.data.data
  },

  // Get business overview
  getBusinessOverview: async (period?: string): Promise<BusinessOverview> => {
    const url = `/reports/overview${period ? `?period=${period}` : ''}`
    const response = await apiClient.get(url)
    return response.data.data
  },

  // Get financial summary
  getFinancialSummary: async (params?: {
    startDate?: string
    endDate?: string
  }): Promise<FinancialSummary> => {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    
    const url = `/reports/financial-summary${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await apiClient.get(url)
    return response.data.data
  },

  // Export reports (placeholder for future implementation)
  exportToPDF: async (reportType: string, params?: any): Promise<Blob> => {
    const response = await apiClient.post('/reports/export/pdf', {
      reportType,
      ...params
    }, {
      responseType: 'blob'
    })
    return response.data
  },

  exportToExcel: async (reportType: string, params?: any): Promise<Blob> => {
    const response = await apiClient.post('/reports/export/excel', {
      reportType,
      ...params
    }, {
      responseType: 'blob'
    })
    return response.data
  }
}