import { apiClient } from '../config/api'
import {
  ClientStats,
  DashboardStats,
  InvoiceStats,
  ProjectStats,
  QuotationStats,
  RecentInvoice,
  RecentQuotation,
} from '../types/dashboard'

export const dashboardService = {
  // Get quotation statistics
  getQuotationStats: async (): Promise<QuotationStats> => {
    const response = await apiClient.get('/quotations/stats')
    return (
      response?.data?.data || {
        total: 0,
        draft: 0,
        sent: 0,
        approved: 0,
        declined: 0,
        revised: 0,
      }
    )
  },

  // Get recent quotations
  getRecentQuotations: async (
    limit: number = 5
  ): Promise<RecentQuotation[]> => {
    const response = await apiClient.get(`/quotations/recent?limit=${limit}`)
    return response?.data?.data || []
  },

  // Get invoice statistics
  getInvoiceStats: async (): Promise<InvoiceStats> => {
    const response = await apiClient.get('/invoices/stats')
    return (
      response?.data?.data || {
        total: 0,
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        totalRevenue: '0',
      }
    )
  },

  // Get recent invoices
  getRecentInvoices: async (limit: number = 5): Promise<RecentInvoice[]> => {
    const response = await apiClient.get(`/invoices/recent?limit=${limit}`)
    return response?.data?.data || []
  },

  // Get client statistics
  getClientStats: async (): Promise<ClientStats> => {
    const response = await apiClient.get('/clients/stats')
    return response?.data?.data || { total: 0, active: 0, inactive: 0 }
  },

  // Get project statistics
  getProjectStats: async (): Promise<ProjectStats> => {
    const response = await apiClient.get('/projects/stats')
    return (
      response?.data?.data || { total: 0, active: 0, completed: 0, onHold: 0 }
    )
  },

  // Get combined dashboard statistics
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [
      quotationStats,
      invoiceStats,
      clientStats,
      projectStats,
      allInvoices,
    ] = await Promise.all([
      dashboardService.getQuotationStats(),
      dashboardService.getInvoiceStats(),
      dashboardService.getClientStats(),
      dashboardService.getProjectStats(),
      apiClient.get('/invoices'),
    ])

    // Calculate pending payments from unpaid invoices
    const invoices = allInvoices?.data?.data || []
    const pendingPayments = invoices
      .filter((invoice: any) => invoice.status !== 'PAID')
      .reduce(
        (sum: number, invoice: any) =>
          sum + (parseFloat(invoice.totalAmount) || 0),
        0
      )

    return {
      totalQuotations: quotationStats.total,
      totalInvoices: invoiceStats.total,
      totalClients: clientStats.total,
      totalProjects: projectStats.total,
      totalRevenue: parseFloat(invoiceStats.totalRevenue) || 0,
      pendingPayments,
    }
  },

  // Get all dashboard data in a single call
  getDashboardData: async () => {
    const [stats, recentQuotations, recentInvoices] = await Promise.all([
      dashboardService.getDashboardStats(),
      dashboardService.getRecentQuotations(5),
      dashboardService.getRecentInvoices(5),
    ])

    return {
      stats,
      recentQuotations,
      recentInvoices,
    }
  },
}
