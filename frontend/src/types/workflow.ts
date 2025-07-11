export interface WorkflowSummary {
  id: string
  type: 'quotation' | 'invoice'
  number: string
  clientName: string
  status: string
  totalAmount: string
  dueDate?: string
  validUntil?: string
  createdAt: string
  daysRemaining?: number
  isUrgent?: boolean
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface WorkflowStats {
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

export interface WorkflowCheckResult {
  expiredQuotations: number
  overdueInvoices: number
  materaiReminders: number
  notificationsSent: number
  executionTime: number
  errors?: string[]
}

export interface WorkflowResponse {
  data: WorkflowSummary[] | WorkflowStats | WorkflowCheckResult | null
  message: string
  status: 'success' | 'error'
}