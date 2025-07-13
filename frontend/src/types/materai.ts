export interface MateraiConfig {
  enabled: boolean
  threshold: number
  stampDutyAmount: number
  enforceCompliance: boolean
  reminderDays: number[]
  autoApply: boolean
}

export interface MateraiCheckResult {
  required: boolean
  amount: number
  threshold: number
  message: string
  compliance: {
    lawReference: string
    effectiveDate: string
    penalty: string
  }
}

export interface MateraiStats {
  totalInvoicesRequiringMaterai: number
  totalInvoicesWithMaterai: number
  totalInvoicesWithoutMaterai: number
  complianceRate: number
  totalStampDutyAmount: number
  recentMateraiApplications: Array<{
    invoiceId: string
    invoiceNumber: string
    amount: string
    appliedAt: string
    clientName: string
  }>
}

export interface MateraiComplianceResult {
  compliant: boolean
  issues: string[]
  recommendations: string[]
}

export interface ApplyMateraiRequest {
  notes?: string
  force?: boolean
}

export interface BulkApplyMateraiRequest {
  invoiceIds: string[]
  notes?: string
  force?: boolean
}

export interface UpdateMateraiConfigRequest {
  enabled?: boolean
  threshold?: number
  stampDutyAmount?: number
  enforceCompliance?: boolean
  reminderDays?: number[]
  autoApply?: boolean
}

export interface MateraiResponse {
  data:
    | MateraiCheckResult
    | MateraiStats
    | MateraiConfig
    | MateraiComplianceResult
    | { success: string[]; failed: string[] }
    | any[]
    | null
  message: string
  status: 'success' | 'error'
}

export interface MateraiReminder {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  clientEmail: string
  totalAmount: number
  dueDate: string
  daysUntilDue: number
  shouldSendReminder: boolean
  urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  materaiRequired: boolean
  materaiApplied: boolean
}

export interface MateraiApplication {
  invoiceId: string
  invoiceNumber: string
  amount: string
  appliedAt: string
  appliedBy: string
  clientName: string
  notes?: string
}

export interface MateraiValidation {
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
  materaiRequired: boolean
  materaiApplied: boolean
  isCompliant: boolean
  issues: string[]
  recommendations: string[]
}
