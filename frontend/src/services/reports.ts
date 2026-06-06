import { apiClient } from '../config/api'
import { now } from '../utils/date'

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
    return (
      response?.data?.data || {
        totalRevenue: 0,
        averageRevenue: 0,
        revenueByPeriod: [],
        invoiceCount: 0,
      }
    )
  },

  // Get client analytics
  getClientAnalytics: async (
    limit?: number,
    dateRange?: { startDate?: string; endDate?: string },
  ): Promise<ClientAnalytics> => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', String(limit))
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate)
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate)
    const qs = params.toString()
    const url = `/reports/clients${qs ? `?${qs}` : ''}`
    const response = await apiClient.get(url)
    return response?.data?.data || { topClients: [], totalClients: 0 }
  },

  // Get project analytics
  getProjectAnalytics: async (
    limit?: number,
    dateRange?: { startDate?: string; endDate?: string },
  ): Promise<ProjectAnalytics> => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', String(limit))
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate)
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate)
    const qs = params.toString()
    const url = `/reports/projects${qs ? `?${qs}` : ''}`
    const response = await apiClient.get(url)
    return (
      response?.data?.data || {
        topProjects: [],
        projectTypes: [],
        totalProjects: 0,
      }
    )
  },

  // Get payment analytics
  getPaymentAnalytics: async (
    dateRange?: { startDate?: string; endDate?: string },
  ): Promise<PaymentAnalytics> => {
    const params = new URLSearchParams()
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate)
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate)
    const qs = params.toString()
    const url = `/reports/payments${qs ? `?${qs}` : ''}`
    const response = await apiClient.get(url)
    return (
      response?.data?.data || {
        invoicesByStatus: [],
        overdueInvoices: [],
        overdueCount: 0,
        overdueAmount: 0,
        paymentTrends: [],
      }
    )
  },

  // Get business overview
  getBusinessOverview: async (period?: string): Promise<BusinessOverview> => {
    const url = `/reports/overview${period ? `?period=${period}` : ''}`
    const response = await apiClient.get(url)
    return (
      response?.data?.data || {
        revenue: {
          totalRevenue: 0,
          averageRevenue: 0,
          revenueByPeriod: [],
          invoiceCount: 0,
        },
        clients: { topClients: [], totalClients: 0 },
        projects: { topProjects: [], projectTypes: [], totalProjects: 0 },
        payments: {
          invoicesByStatus: [],
          overdueInvoices: [],
          overdueCount: 0,
          overdueAmount: 0,
          paymentTrends: [],
        },
        generatedAt: now().toISOString(),
      }
    )
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
    return (
      response?.data?.data || {
        period: { startDate: '', endDate: '' },
        quotations: { total: 0, approved: 0, pending: 0, totalValue: 0 },
        invoices: {
          total: 0,
          paid: 0,
          pending: 0,
          overdue: 0,
          totalValue: 0,
          paidValue: 0,
          materaiRequired: 0,
        },
        newClients: 0,
        newProjects: 0,
        conversionRate: '0%',
        paymentRate: '0%',
      }
    )
  },

  // Export reports (placeholder for future implementation)
  exportToPDF: async (reportType: string, params?: any): Promise<Blob> => {
    const response = await apiClient.post(
      '/reports/export/pdf',
      {
        reportType,
        ...params,
      },
      {
        responseType: 'blob',
      }
    )
    return response.data
  },

  exportToExcel: async (reportType: string, params?: any): Promise<Blob> => {
    const response = await apiClient.post(
      '/reports/export/excel',
      {
        reportType,
        ...params,
      },
      {
        responseType: 'blob',
      }
    )
    return response.data
  },
}
