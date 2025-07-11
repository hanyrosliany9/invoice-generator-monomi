import { InvoiceStatus } from '@prisma/client'

export class InvoiceResponseDto {
  id: string
  invoiceNumber: string
  creationDate: string
  dueDate: string
  amountPerProject: string // Convert Decimal to string
  totalAmount: string // Convert Decimal to string
  paymentInfo: string
  materaiRequired: boolean
  materaiApplied: boolean
  terms?: string
  signature?: string
  status: InvoiceStatus
  createdAt: string
  updatedAt: string
  
  // Client reference
  client: {
    id: string
    name: string
    email?: string
    company?: string
  }
  
  // Project reference
  project: {
    id: string
    number: string
    description: string
    type: string
  }
  
  // Quotation reference (if exists)
  quotation?: {
    id: string
    quotationNumber: string
    date: string
  }
  
  // User reference (creator)
  createdBy: {
    id: string
    name: string
    email: string
  }
  
  // Payment summary
  paymentSummary: {
    totalPaid: string
    remainingAmount: string
    paymentCount: number
    lastPaymentDate?: string
  }
  
  // Business status
  businessStatus?: {
    isOverdue: boolean
    daysOverdue: number
    daysToDue: number
    materaiStatus: 'NOT_REQUIRED' | 'REQUIRED' | 'APPLIED'
  }
}