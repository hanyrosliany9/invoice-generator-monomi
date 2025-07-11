import { api } from '../config/api'
import { WorkflowCheckResult, WorkflowResponse, WorkflowStats, WorkflowSummary } from '../types/workflow'

export const workflowService = {
  // Get all active workflows
  async getActiveWorkflows(): Promise<WorkflowSummary[]> {
    const response = await api.get<WorkflowResponse>('/workflow/active')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as WorkflowSummary[]) || []
  },

  // Get workflow statistics
  async getWorkflowStats(): Promise<WorkflowStats> {
    const response = await api.get<WorkflowResponse>('/workflow/stats')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as WorkflowStats
  },

  // Manually trigger workflow checks
  async runWorkflowChecks(): Promise<WorkflowCheckResult> {
    const response = await api.post<WorkflowResponse>('/workflow/run-checks')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as WorkflowCheckResult
  },

  // Helper functions for workflow data
  formatWorkflowAmount: (amount: string): string => {
    const num = parseFloat(amount)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  },

  getWorkflowPriorityColor: (priority: 'LOW' | 'MEDIUM' | 'HIGH'): string => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-600 bg-red-50'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50'
      case 'LOW':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  },

  getWorkflowStatusColor: (status: string, type: 'quotation' | 'invoice'): string => {
    if (type === 'quotation') {
      switch (status) {
        case 'DRAFT':
          return 'text-gray-600 bg-gray-50'
        case 'SENT':
          return 'text-blue-600 bg-blue-50'
        case 'APPROVED':
          return 'text-green-600 bg-green-50'
        case 'DECLINED':
          return 'text-red-600 bg-red-50'
        default:
          return 'text-gray-600 bg-gray-50'
      }
    } else {
      switch (status) {
        case 'DRAFT':
          return 'text-gray-600 bg-gray-50'
        case 'SENT':
          return 'text-blue-600 bg-blue-50'
        case 'PAID':
          return 'text-green-600 bg-green-50'
        case 'OVERDUE':
          return 'text-red-600 bg-red-50'
        default:
          return 'text-gray-600 bg-gray-50'
      }
    }
  },

  // Calculate days remaining for urgency
  calculateDaysRemaining: (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },

  // Get workflow priority based on days remaining
  getWorkflowPriority: (daysRemaining: number, status: string): 'LOW' | 'MEDIUM' | 'HIGH' => {
    if (status === 'OVERDUE' || daysRemaining < 0) return 'HIGH'
    if (daysRemaining <= 1) return 'HIGH'
    if (daysRemaining <= 3) return 'MEDIUM'
    return 'LOW'
  },

  // Filter workflows by priority
  filterWorkflowsByPriority: (workflows: WorkflowSummary[], priority: 'LOW' | 'MEDIUM' | 'HIGH'): WorkflowSummary[] => {
    return workflows.filter(workflow => workflow.priority === priority)
  },

  // Filter workflows by type
  filterWorkflowsByType: (workflows: WorkflowSummary[], type: 'quotation' | 'invoice'): WorkflowSummary[] => {
    return workflows.filter(workflow => workflow.type === type)
  },

  // Sort workflows by priority (HIGH first)
  sortWorkflowsByPriority: (workflows: WorkflowSummary[]): WorkflowSummary[] => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return [...workflows].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'LOW']
      const bPriority = priorityOrder[b.priority || 'LOW']
      return aPriority - bPriority
    })
  },

  // Get urgent workflows (HIGH priority)
  getUrgentWorkflows: (workflows: WorkflowSummary[]): WorkflowSummary[] => {
    return workflows.filter(workflow => workflow.priority === 'HIGH' || workflow.isUrgent)
  },

  // Calculate total value of workflows
  calculateTotalValue: (workflows: WorkflowSummary[]): number => {
    return workflows.reduce((total, workflow) => {
      return total + parseFloat(workflow.totalAmount)
    }, 0)
  },

  // Get workflow summary statistics
  getWorkflowSummary: (workflows: WorkflowSummary[]) => {
    const quotations = workflows.filter(w => w.type === 'quotation')
    const invoices = workflows.filter(w => w.type === 'invoice')
    const urgent = workflows.filter(w => w.priority === 'HIGH' || w.isUrgent)
    
    return {
      totalWorkflows: workflows.length,
      quotationCount: quotations.length,
      invoiceCount: invoices.length,
      urgentCount: urgent.length,
      totalValue: workflowService.calculateTotalValue(workflows),
      quotationValue: workflowService.calculateTotalValue(quotations),
      invoiceValue: workflowService.calculateTotalValue(invoices)
    }
  }
}