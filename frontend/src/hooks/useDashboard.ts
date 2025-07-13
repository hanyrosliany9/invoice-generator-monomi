import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard'

// Query keys for better cache management
export const DASHBOARD_QUERY_KEYS = {
  stats: ['dashboard', 'stats'],
  quotationStats: ['dashboard', 'quotations', 'stats'],
  invoiceStats: ['dashboard', 'invoices', 'stats'],
  clientStats: ['dashboard', 'clients', 'stats'],
  projectStats: ['dashboard', 'projects', 'stats'],
  recentQuotations: ['dashboard', 'quotations', 'recent'],
  recentInvoices: ['dashboard', 'invoices', 'recent'],
  all: ['dashboard', 'all'],
} as const

// Hook for dashboard statistics
export const useDashboardStats = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.stats,
    queryFn: dashboardService.getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
  })
}

// Hook for quotation statistics
export const useQuotationStats = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.quotationStats,
    queryFn: dashboardService.getQuotationStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// Hook for invoice statistics
export const useInvoiceStats = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.invoiceStats,
    queryFn: dashboardService.getInvoiceStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// Hook for client statistics
export const useClientStats = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.clientStats,
    queryFn: dashboardService.getClientStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// Hook for project statistics
export const useProjectStats = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.projectStats,
    queryFn: dashboardService.getProjectStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// Hook for recent quotations
export const useRecentQuotations = (limit: number = 5) => {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEYS.recentQuotations, limit],
    queryFn: () => dashboardService.getRecentQuotations(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for recent data)
    refetchInterval: 2 * 60 * 1000,
  })
}

// Hook for recent invoices
export const useRecentInvoices = (limit: number = 5) => {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEYS.recentInvoices, limit],
    queryFn: () => dashboardService.getRecentInvoices(limit),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}

// Hook for all dashboard data (combined)
export const useDashboardData = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.all,
    queryFn: dashboardService.getDashboardData,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
