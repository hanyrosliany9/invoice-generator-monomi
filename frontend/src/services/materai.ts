import { api } from '../config/api'
import { 
  ApplyMateraiRequest,
  BulkApplyMateraiRequest,
  MateraiCheckResult,
  MateraiComplianceResult,
  MateraiConfig,
  MateraiResponse,
  MateraiStats,
  UpdateMateraiConfigRequest
} from '../types/materai'

export const materaiService = {
  // Check if invoice requires materai
  async checkMateraiRequirement(invoiceId: string): Promise<MateraiCheckResult> {
    const response = await api.get<MateraiResponse>(`/materai/check/${invoiceId}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as MateraiCheckResult
  },

  // Apply materai to invoice
  async applyMaterai(invoiceId: string, data: ApplyMateraiRequest): Promise<void> {
    const response = await api.post<MateraiResponse>(`/materai/apply/${invoiceId}`, data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
  },

  // Remove materai from invoice
  async removeMaterai(invoiceId: string): Promise<void> {
    const response = await api.delete<MateraiResponse>(`/materai/remove/${invoiceId}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
  },

  // Bulk apply materai
  async bulkApplyMaterai(data: BulkApplyMateraiRequest): Promise<{
    success: string[]
    failed: string[]
  }> {
    const response = await api.post<MateraiResponse>('/materai/bulk-apply', data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as { success: string[]; failed: string[] }
  },

  // Get materai statistics
  async getMateraiStats(): Promise<MateraiStats> {
    const response = await api.get<MateraiResponse>('/materai/stats')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as MateraiStats
  },

  // Get invoices requiring materai reminders
  async getInvoicesRequiringMateraiReminders(): Promise<any[]> {
    const response = await api.get<MateraiResponse>('/materai/reminders')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as any[]) || []
  },

  // Get materai configuration
  async getMateraiConfig(): Promise<MateraiConfig> {
    const response = await api.get<MateraiResponse>('/materai/config')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as MateraiConfig
  },

  // Update materai configuration
  async updateMateraiConfig(data: UpdateMateraiConfigRequest): Promise<MateraiConfig> {
    const response = await api.patch<MateraiResponse>('/materai/config', data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as MateraiConfig
  },

  // Validate materai compliance
  async validateMateraiCompliance(invoiceId: string): Promise<MateraiComplianceResult> {
    const response = await api.get<MateraiResponse>(`/materai/validate/${invoiceId}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as MateraiComplianceResult
  },

  // Helper functions
  formatMateraiAmount: (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  },

  getMateraiStatusColor: (applied: boolean, required: boolean): string => {
    if (!required) return 'text-gray-500 bg-gray-50'
    if (applied) return 'text-green-600 bg-green-50'
    return 'text-red-600 bg-red-50'
  },

  getMateraiStatusLabel: (applied: boolean, required: boolean): string => {
    if (!required) return 'Tidak Diperlukan'
    if (applied) return 'Materai Terpasang'
    return 'Materai Diperlukan'
  },

  getMateraiUrgencyColor: (urgency: string): string => {
    switch (urgency) {
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

  getMateraiUrgencyLabel: (urgency: string): string => {
    switch (urgency) {
      case 'HIGH':
        return 'Sangat Mendesak'
      case 'MEDIUM':
        return 'Mendesak'
      case 'LOW':
        return 'Normal'
      default:
        return 'Tidak Diketahui'
    }
  },

  // Calculate materai requirement
  calculateMateraiRequirement: (amount: number, threshold: number = 5000000): {
    required: boolean
    message: string
    lawReference: string
  } => {
    const required = amount > threshold
    
    return {
      required,
      message: required 
        ? `Invoice memerlukan materai karena nilai lebih dari ${materaiService.formatMateraiAmount(threshold)}`
        : `Invoice tidak memerlukan materai karena nilai kurang dari ${materaiService.formatMateraiAmount(threshold)}`,
      lawReference: 'UU No. 13 Tahun 1985 tentang Bea Meterai'
    }
  },

  // Format Indonesian date
  formatIndonesianDate: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  },

  // Format Indonesian date and time
  formatIndonesianDateTime: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    })
  },

  // Validate materai configuration
  validateMateraiConfig: (config: UpdateMateraiConfigRequest): {
    isValid: boolean
    errors: string[]
  } => {
    const errors: string[] = []
    
    if (config.threshold !== undefined && config.threshold < 0) {
      errors.push('Threshold amount cannot be negative')
    }
    
    if (config.stampDutyAmount !== undefined && config.stampDutyAmount < 0) {
      errors.push('Stamp duty amount cannot be negative')
    }
    
    if (config.reminderDays?.some(day => day < 0)) {
      errors.push('Reminder days cannot be negative')
    }
    
    if (config.reminderDays && config.reminderDays.length > 10) {
      errors.push('Maximum 10 reminder days allowed')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Get compliance rate color
  getComplianceRateColor: (rate: number): string => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-yellow-600'
    if (rate >= 70) return 'text-orange-600'
    return 'text-red-600'
  },

  // Get compliance rate label
  getComplianceRateLabel: (rate: number): string => {
    if (rate >= 95) return 'Sangat Baik'
    if (rate >= 85) return 'Baik'
    if (rate >= 70) return 'Cukup'
    return 'Perlu Diperbaiki'
  },

  // Filter invoices by materai status
  filterInvoicesByMateraiStatus: (invoices: any[], status: 'required' | 'applied' | 'missing'): any[] => {
    switch (status) {
      case 'required':
        return invoices.filter(inv => inv.materaiRequired)
      case 'applied':
        return invoices.filter(inv => inv.materaiRequired && inv.materaiApplied)
      case 'missing':
        return invoices.filter(inv => inv.materaiRequired && !inv.materaiApplied)
      default:
        return invoices
    }
  },

  // Sort invoices by materai urgency
  sortInvoicesByMateraiUrgency: (invoices: any[]): any[] => {
    return [...invoices].sort((a, b) => {
      const urgencyOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 } as const
      return (urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder] || 0) - (urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder] || 0)
    })
  }
}
