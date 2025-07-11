export class WorkflowSummaryDto {
  id: string
  type: 'quotation' | 'invoice'
  number: string
  clientName: string
  status: string
  totalAmount: string // Convert to string for consistency
  dueDate?: string
  validUntil?: string
  createdAt: string
  
  // Business indicators
  isUrgent?: boolean
  daysRemaining?: number
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export class WorkflowStatsDto {
  quotations: Array<{
    status: string
    _count: number
    _sum: {
      totalAmount: string
    }
  }>
  invoices: Array<{
    status: string
    _count: number
    _sum: {
      totalAmount: string
    }
  }>
  alerts: {
    overdueInvoices: number
    expiringQuotations: number
    materaiReminders: number
  }
  summary: {
    totalActiveWorkflows: number
    totalValue: string
    highPriorityCount: number
  }
}

export class WorkflowCheckResultDto {
  expiredQuotations: number
  overdueInvoices: number
  materaiReminders: number
  notificationsSent: number
  executionTime: number
  errors?: string[]
}