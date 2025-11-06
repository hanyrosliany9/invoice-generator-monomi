/**
 * Payment Milestones Types
 *
 * Shared type definitions for payment milestones across the application.
 * This file prevents circular dependencies between components, hooks, and services.
 */

export interface PaymentMilestone {
  id?: string
  milestoneNumber: number
  name: string
  nameId?: string
  description?: string
  descriptionId?: string
  paymentPercentage: number
  paymentAmount: number
  dueDate?: string
  dueDaysFromPrev?: number
  deliverables?: string[]
  isInvoiced?: boolean
}

export interface PaymentMilestoneFormItem {
  milestoneNumber: number
  name: string
  nameId: string
  description?: string
  descriptionId?: string
  paymentPercentage: number
  paymentAmount: number
}

export interface MilestoneProgress {
  id: string
  milestoneNumber: number
  name: string
  nameId?: string
  paymentPercentage: number
  paymentAmount: number
  dueDate?: string
  deliverables?: string[]
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE'
  invoiceId?: string
  invoiceNumber?: string
  invoiceStatus?: 'DRAFT' | 'SENT' | 'PAID_OFF' | 'PENDING' | 'OVERDUE'
  paidDate?: string
}
